/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { ISvnPayload, SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { StoreChangedEvents } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SubversionAdvancedSettings } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SubversionAdvancedSettings";
import { SubversionMapping } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SubversionMapping";
import { ISourceTabItemProps } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { Component as ServiceEndpointSelectionControl } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/ServiceEndpointSelectionControl";
import { VersionControlProperties, MappingTypes } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { ISubversionMappingItem, ISvnState, SubversionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SubversionStore";

import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ServiceEndpointType } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { SvnMappingDetails } from "TFS/Build/Contracts";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/SubversionTabItem";

export class Component extends Base.Component<ISourceTabItemProps, ISvnState> {
    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private _connectedServiceEndpointActionsCreator: ConnectedServiceActionsCreator;
    private _buildDefinitionActionsCreator: BuildDefinitionActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _subversionStore: SubversionStore;
    private _branchName: string;
    private _throttledBranchDelay: Utils_Core.DelayedFunction;

    constructor(props: ISourceTabItemProps) {
        super(props);

        this._connectedServiceEndpointActionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
        this._buildDefinitionActionsCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._subversionStore = StoreManager.GetStore<SubversionStore>(SubversionStore);
        this._connectedServiceEndpointActionsCreator.getServiceEndpoints(ServiceEndpointType.Subversion);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);
        
        this.state = this._subversionStore.getState();
    }

    public render(): JSX.Element {
        let defaultBranchCalloutContentProps = {
            calloutDescription: Resources.SvnBranchHelpText
        };
        let defaultBranchInfoProps: IInfoProps = {
            calloutContentProps: defaultBranchCalloutContentProps
        };

        return (
            <div className="ci-svn-tab-item">
                {
                    this.state.errorMessage &&
                    <MessageBar
                        messageBarType={MessageBarType.error}>
                        {this.state.errorMessage}
                    </MessageBar>
                }
                <ServiceEndpointSelectionControl { ...this.props } />
                {
                    // we'll show the details if we're read-only. the connections check is not valid in this case.
                    (!!this.props.isReadOnly || (this.state.connections && this.state.connections.length > 0)) ?
                        <div>
                            <StringInputComponent
                                label={Resources.DefaultBranch}
                                infoProps={defaultBranchInfoProps}
                                value={this.state.defaultBranch || Utils_String.empty}
                                onValueChanged={(newValue: string) => { this._onSelectedBranchChanged(newValue); }}
                                onBlur={this._onSelectedBranchBlur}
                                getErrorMessage={(value: string) => { return this._getErrorMessage(value); }}
                                disabled={!!this.props.isReadOnly}
                            />

                            <SubversionAdvancedSettings
                                id={ServiceEndpointType.Subversion}
                                showAdvancedSettings={this.props.showAdvancedSettings}
                                cleanRepository={this.state.cleanRepository}
                                isCleanRepositoryEnabled={this.state.isCleanRepositoryEnabled}
                                cleanOption={this._getCleanOption()}
                                onCleanRepositoryChanged={this._onCleanRepositoryChanged}
                                onCleanOptionsChanged={this._onCleanOptionsChanged}
                                onChange={this._onMappingChange}
                                isReadOnly={!!this.props.isReadOnly}>
                                <SubversionMapping
                                    mappingItems={this.state.mappings}
                                    onChange={this._onMappingChange}
                                    onAddNewMapping={this._onAddNewMapping}
                                    validateServerPath={this._validateServerPath}
                                    validateLocalPath={this._validateLocalPath}
                                    validateRevision={this._validateRevision}
                                    showNoMappingsInfo={this.state.mappingIsDeleted}
                                    isReadOnly={!!this.props.isReadOnly} />
                            </SubversionAdvancedSettings>
                        </div>
                        : null
                }
            </div>
        );
    }

    public componentWillMount(): void {
        let state: ISvnState = this._subversionStore.getState();

        if (state.selectedConnectionId) {
            this.setState(state);
        }

        this._subversionStore.addChangedListener(this._onChange);
        this._subversionStore.addListener(StoreChangedEvents.RemoteVersionControlDataUpdatedEvent, this._onRemoteDataUpdated);
    }

    public componentWillUnmount(): void {
        this._subversionStore.removeChangedListener(this._onChange);
        this._subversionStore.removeListener(StoreChangedEvents.RemoteVersionControlDataUpdatedEvent, this._onRemoteDataUpdated);
    }

    private _onSelectedBranchBlur = (): void => {
        // Done to handle Bug 867786: Typing repository name losing focus from the textbox
        // we should not increase dependency on this check
        if (Utils_UI.BrowserCheckUtils.isIEVersion(11)) {
            this._notifyBranchChange();
        }
    }

    private _validateLocalPath = (mapping: SvnMappingDetails): string => {
        return this._subversionStore.validateLocalPath(mapping);
    }

    private _validateServerPath = (mapping: SvnMappingDetails): string => {
        return this._subversionStore.validateServerPath(mapping);
    }

    private _validateRevision = (mapping: SvnMappingDetails): string => {
        return this._subversionStore.validateRevision(mapping);
    }

    private _onSelectedBranchChanged = (branchName: string): void => {
        this._branchName = branchName;

        // Done to handle Bug 867786: Typing repository name losing focus from the textbox
        // we should not increase dependency on this check
        if (!Utils_UI.BrowserCheckUtils.isIEVersion(11) && !this._throttledBranchDelay) {
            this._throttledBranchDelay = Utils_Core.delay(this, 100, () => {
                this._throttledBranchDelay = null;
                this._notifyBranchChange();
            });
        }
    }

    private _notifyBranchChange(): void {
        this._sourcesActionCreator.changeSvnSource({
            type: this.props.id,
            branchName: this._branchName
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateSelectedBranch(this._branchName);
    }

    private _getCleanOption(): number {
        let selectedCleanOption: number = parseInt(this.state.cleanOptions) + 1;
        return selectedCleanOption;
    }

    private _onMappingChange = (mappingItem: ISubversionMappingItem): void => {
        this._sourcesActionCreator.changeSvnSource({
            type: this.props.id,
            mapping: mappingItem
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateMapping(MappingTypes.svn, mappingItem);
    }

    private _onAddNewMapping = (): void => {
        this._sourcesActionCreator.addNewSubversionMapping();
        
        this._sourcesActionCreator.sourceSelectionChanged();
        const mappingItem: ISubversionMappingItem = {
            mapping: {
                depth: 0,
                ignoreExternals: true,
                localPath: Utils_String.empty,
                revision: Utils_String.empty,
                serverPath: Utils_String.empty
            },
            index: this.state.mappings.length,
            isDeleted: false
        };
        this._versionControlActionsCreator.updateMapping(MappingTypes.svn, mappingItem);
    }

    private _onCleanRepositoryChanged = (newValue: string): void => {
        this._sourcesActionCreator.changeSvnSource({
            type: this.props.id,
            cleanRepository: newValue
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanRepository, newValue);         
    }

    private _onCleanOptionsChanged = (payload: ISvnPayload): void => {
        this._sourcesActionCreator.changeSvnSource({
            type: this.props.id,
            cleanOption: payload.cleanOption
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanOption, payload.cleanOption);         
    }

    private _onRemoteDataUpdated = (): void => {
        this._onChange();

        Utils_Core.delay(this, 10, () => {
            this._sourcesActionCreator.sourceSelectionChanged();
        });
    }

    private _getErrorMessage = (value: string): string => {
        let errorMessage: string = Utils_String.empty;
        if (!value) {
            errorMessage = Resources.SettingsRequired;
        }
        return errorMessage;
    }

    private _onChange = (): void => {
        this.setState(this._subversionStore.getState());
    }
}
