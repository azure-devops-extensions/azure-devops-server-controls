/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { TfvcMappingDetails } from "CIWorkflow/Scripts/Scenarios/Definition/Components/TfvcMappingDetail";
import { Component as VCAdvancedSettings } from "CIWorkflow/Scripts/Scenarios/Definition/Components/VersionControlAdvancedSettings";
import { ISourceTabItemProps } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { VersionControlProperties, MappingTypes } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { ITfvcMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcMappingHelper";
import { ITfvcState, TfvcStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { Label } from "OfficeFabric/Label";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!PivotView";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/InfoButton";

export class Component extends Base.Component<ISourceTabItemProps, ITfvcState> {
    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private _actionCreator: BuildDefinitionActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _tfvcStore: TfvcStore;

    constructor(props: ISourceTabItemProps) {
        super(props);

        this._tfvcStore = StoreManager.GetStore<TfvcStore>(TfvcStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);

        // in typescript we cannot use getInitialiState
        // so setting the default source options in the constructor directly
        this.state = this._tfvcStore.getState();
    }

    public render(): JSX.Element {
        return (
            <div className="ci-tf-sources-tab-item">
                <div className="ci-tfvc-tab-item">
                    <TfvcMappingDetails
                        mappingItems = { this.state.mappings }
                        onChange = { this._onMappingChange }
                        onAddNewMapping = { this._onAddNewMapping }
                        onDeleteMapping = { this._onDeleteMapping }
                        showPathSelectorDialog = { this._showPathSelectorDialog }
                        validateServerPath = { this._validateServerPath }
                        validateLocalPath={this._validateLocalPath}
                        baseMappingIndex={this.state.baseMappingIndex}
                        focusIndex={this.state.focusIndex}
                        isReadOnly={!!this.props.isReadOnly} />

                    <VCAdvancedSettings
                        repoType={RepositoryTypes.TfsVersionControl}
                        showAdvancedSettings={this.props.showAdvancedSettings} 
                        sourceLabel={this.state.sourceLabel}
                        cleanRepository={this.state.cleanRepository}
                        isCleanRepositoryEnabled={this.state.isCleanRepositoryEnabled}
                        cleanOptions={this.state.cleanOptions}
                        showLabelSourcesOption={true}
                        sourceLabelOptions={this._tfvcStore.getSourceLabelOptions()}
                        onSelectedSourceLabelOptionChanged={this._onSelectedSourceLabelOptionChanged}
                        onSelectedSourceLabelFormatChanged={this._onSelectedSourceLabelFormatChanged}
                        validateLabelSourcesFormat={this._tfvcStore.validateLabelSourcesFormat.bind(this._tfvcStore)}
                        onCleanRepositoryOptionChanged={this._onCleanRepositoryOptionChanged}
                        onCleanOptionChanged={this._handleCleanOptionsChange}
                        isReadOnly={!!this.props.isReadOnly}
                    />
                </div>
            </div>
        );
    }

    public componentDidMount(): void {

        // When we swicth tabs, the component is mounted again. In that case, 
        // we should be using the state saved in the store. Otherwise, we
        // should just let the UI initialize based on the current project. 
        let state: ITfvcState = this._tfvcStore.getState();
        if (state.name) {
            this.setState(state);
        }

        this._tfvcStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._tfvcStore.removeChangedListener(this._onChange);
    }

    private _validateServerPath = (newMapping: ITfvcMappingItem): string => {
        return this._tfvcStore.validateServerMapping(newMapping);
    }

    private _validateLocalPath = (newMapping: ITfvcMappingItem): string => {
        return this._tfvcStore.validateLocalMapping(newMapping);
    }

    private _showPathSelectorDialog = (callback: (selectedValue: ISelectedPathNode) => void): void => {
        this._tfvcStore.showPathDialog(this.state.rootFolder, callback);
    }

    private _onSelectedSourceLabelOptionChanged = (selectedSourceOption?: IChoiceGroupOption): void => {
        this._sourcesActionCreator.changeTfvcSource({
            sourceLabelOption: (selectedSourceOption.key as string)
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.sourceLabelOption, selectedSourceOption.key as string);
    }

    private _onSelectedSourceLabelFormatChanged = (selectedSourceLabelFormat: string): void => {
        this._sourcesActionCreator.changeTfvcSource({
            sourceLabelFormat: selectedSourceLabelFormat
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.sourceLabelFormat, selectedSourceLabelFormat);
    }

    private _onCleanRepositoryOptionChanged = (newValue: string): void => {
        this._sourcesActionCreator.changeTfvcSource({
            cleanRepository: newValue
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanRepository, newValue);
    }

    private _onMappingChange = (mappingItem: ITfvcMappingItem): void => {
        this._sourcesActionCreator.changeTfvcSource({
            mapping: mappingItem
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateMapping(MappingTypes.tfvc, mappingItem);
    }

    private _onDeleteMapping = (): void => {
        const state: ITfvcState = this._tfvcStore.getState();
        // Note: we use length - 2 because the state has not been updated yet to delete a row
        this.setState({
            focusIndex: state.mappings ? state.mappings.length - 2 : -1
        });
    }

    private _onAddNewMapping = (): void => {
        this._sourcesActionCreator.addNewTfvcMapping();

        this._sourcesActionCreator.sourceSelectionChanged();
        const mappingItem: ITfvcMappingItem = {
            mapping: {
                localPath: "",
                mappingType: "",
                serverPath: ""
            },
            index: this.state.mappings.length,
            isDeleted: false,
            displayedLocalPath: ""
        };
        this._versionControlActionsCreator.updateMapping(MappingTypes.tfvc, mappingItem);

        const state: ITfvcState = this._tfvcStore.getState();
        this.setState({
            focusIndex: state.mappings ? state.mappings.length - 1  : -1
        });
    }

    private _handleCleanOptionsChange = (options: IDropdownOption, index: number): void => {
        let selectedCleanOption: number = parseInt(options.key.toString()) - 1;

        this._sourcesActionCreator.changeTfvcSource({
            cleanOption: selectedCleanOption.toString()
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanOption, selectedCleanOption.toString());
    }

    private _onChange = (): void => {
        this.setState(this._tfvcStore.getState());
    }
}
