/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { StoreChangedEvents } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { ISourceTabItemProps } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { GitAdvancedSettings } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GitAdvancedSettings";
import { Component as ServiceEndpointSelectionControl } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/ServiceEndpointSelectionControl";
import { VersionControlProperties } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { IVersionControlState, VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";

import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ServiceEndpointType } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

// Import common styles
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GitServiceTabItem";

export class Component extends Base.Component<ISourceTabItemProps, IVersionControlState> {
    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private _connectedServiceEndpointActionsCreator: ConnectedServiceActionsCreator;
    private _buildDefinitionActionsCreator: BuildDefinitionActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _vcStore: VersionControlStore;
    private _repoName: string;
    private _branchName: string;
    private _throttledRepoDelay: Utils_Core.DelayedFunction;
    private _throttledBranchDelay: Utils_Core.DelayedFunction;

    constructor(props: ISourceTabItemProps) {
        super(props);

        this._connectedServiceEndpointActionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
        this._buildDefinitionActionsCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._vcStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
        this._connectedServiceEndpointActionsCreator.getServiceEndpoints(ServiceEndpointType.ExternalGit);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);

        this.state = this._vcStore.getState();
    }

    public render(): JSX.Element {
        const branchName: string = this.state.selectedBranchName || Utils_String.empty;

        return (
            <div className="ci-github-tab-item">
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
                                label={Resources.DefaultBranchLabelForDefinitions}
                                value={branchName}
                                onValueChanged={(newValue: string) => { this._onSelectedBranchChanged(newValue); }}
                                onBlur={this._onSelectedBranchBlur}
                                errorMessage={branchName ? null : Resources.SettingsRequired}
                                disabled={!!this.props.isReadOnly} />

                            <GitAdvancedSettings
                                id={this.props.id}
                                showAdvancedSettings={this.props.showAdvancedSettings}
                                cleanRepository={this.state.cleanRepository.toString()}
                                isCleanRepositoryEnabled={this.state.cleanRepository}
                                cleanOptions={this.state.cleanOption}
                                reportBuildStatus={this.state.reportBuildStatus}
                                checkoutSubmodules={this.state.checkoutSubmodules}
                                checkoutNestedSubmodules={this.state.checkoutNestedSubmodules}
                                gitLfsSupportStatus={this.state.largeFileSupport}
                                skipSyncSourcesStatus={this.state.skipSyncSources}
                                shallowFetch={this.state.shallowFetchStatus}
                                shallowFetchDepth={this.state.fetchDepth.toString()}
                                getErrorMessage={this._getErrorMessage}
                                isReadOnly={!!this.props.isReadOnly}>
                            </GitAdvancedSettings>
                        </div>
                        : null
                }
            </div>
        );
    }

    public componentWillMount(): void {
        // When we swicth tabs, the component is mounted again. In that case,
        // we should be using the state saved in the store. Otherwise, we
        // should just let the UI initialize based on the current project.
        const state: IVersionControlState = this._vcStore.getState();

        if (state.selectedConnectionId) {
            this.setState(state);
        }

        this._vcStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._vcStore.removeChangedListener(this._onChange);
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

    private _onSelectedBranchBlur = (): void => {
        // Done to handle Bug 867786: Typing repository name losing focus from the textbox
        // we should not increase dependency on this check
        if (Utils_UI.BrowserCheckUtils.isIEVersion(11)) {
            this._notifyBranchChange();
        }
    }

    private _notifyBranchChange(): void {
        this._versionControlActionsCreator.updateSelectedBranch(this._branchName);
    }

    private _onRemoteDataUpdated = (): void => {
        this._onChange();
    }

    private _onChange = (): void => {
        this.setState(this._vcStore.getState());
    }

    private _getErrorMessage = (value: string): string => {
        const state = this._vcStore.getState();
        if (state.shallowFetchStatus && (!value || !Utils_Number.isPositiveNumber(value))) {
            return Resources.PositiveNumberTextFieldValidationErrorMessage;
        }
        return Utils_String.empty;
    }
}
