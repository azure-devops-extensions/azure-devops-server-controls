/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Common from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { EnvironmentCheckListActionCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListActionCreator";
import { EnvironmentCheckListStore, IEnvironmentCheckListState, IEnvironmentReference } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListStore";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { PickListDropdown, IPickListItem, IPickListSelection, IPickList } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/Selection";

import { autobind } from "OfficeFabric/Utilities";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/IntegrationsOptionsDetailsView";

/**
 * @brief Properties for Environment check list view
 */
export interface IEnvironmentCheckListViewProps extends ComponentBase.IProps {
    label: string;
    helpText: string;
    placeholder: string;
}

/**
 * @brief Controller view for Environment check list 
 */
export class EnvironmentCheckListView extends ComponentBase.Component<IEnvironmentCheckListViewProps, IEnvironmentCheckListState> {

    public componentWillMount(): void {
        this._checkListActions = ActionCreatorManager.GetActionCreator<EnvironmentCheckListActionCreator>(EnvironmentCheckListActionCreator, this.props.instanceId);
        this._checkListStore = StoreManager.GetStore<EnvironmentCheckListStore>(EnvironmentCheckListStore, this.props.instanceId);
        this._checkListStore.addChangedListener(this._onchange);

        this.setState(this._checkListStore.getState());
    }

    public componentWillUnmount(): void {
        this._checkListStore.removeChangedListener(this._onchange);
    }

    public render(): JSX.Element {
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: this.props.helpText
            }
        };

        return (
            <div className={"cd-options-envpicklistdropdown-section"}>
                <BooleanInputComponent
                    cssClass="cd-options-envpicklistdropdown"
                    label={this.props.label}
                    value={this.state.enabled}
                    onValueChanged={this._onMasterStatusChange}
                    infoProps={infoProps}
                />
                {
                    this.state.enabled &&
                        <div className={"envpicklistdropdown-container"}>
                            <div className="environment-dropdown-title">
                                {Resources.EnvironmentsLabelText}
                            </div>
                            <PickListDropdown
                                className="environment-picker-dropdown"
                                placeholder={this.props.placeholder}
                                isSearchable={true}
                                selectionMode={SelectionMode.multiple}
                                getPickListItems={() => this.state.environmentList}
                                getListItem={(scope: IEnvironmentReference) => { return { key: String(scope.environmentId), name: scope.environmentName } as IPickListItem; }}
                                onSelectionChanged={this._onSelectionChange}
                                selectedItems={this._getSelectedScopes()} />
                        </div>
                }
                {
                    this.state.enabled && !!this.state.error &&
                    <div className={"envpicklistdropdown-container"}>
                        <ErrorComponent cssClass={"cd-options-status-error-msg"} errorMessage={this.state.error} />
                    </div>
                }
            </div>
        );
    }

    private _onchange = () => {
        this.setState(this._checkListStore.getState());
    }

    private _onMasterStatusChange = (newValue: boolean) => {
        this._checkListActions.updateMasterCheckBoxStatus(newValue);
    }

    private _onEnvironmentStatusChange = (environmentId: number, newValue: boolean) => {
        this._checkListActions.updateEnvironmentStatus(environmentId, newValue);
    }

    @autobind
    private _onSelectionChange(selection: IPickListSelection): void {
        let environmentUnselected: boolean;
        this.state.environmentList.map((env: IEnvironmentReference) => {
            selection.selectedItems.map((selectedItem: IEnvironmentReference) => {
                if ((env.environmentId === selectedItem.environmentId) && (env.status === false)) {
                    this._onEnvironmentStatusChange(env.environmentId, true);
                }
            });
        });
        this._checkListStore.getSelectedEnvironments().map((env: IEnvironmentReference) => {
            environmentUnselected = true;
            selection.selectedItems.map((selectedItem: IEnvironmentReference) => {
                if (env.environmentId === selectedItem.environmentId) {
                    environmentUnselected = false;
                }
            });
            if (environmentUnselected) {
                this._onEnvironmentStatusChange(env.environmentId, false);
            }
        });
    }

    @autobind
    private _getSelectedScopes(): IEnvironmentReference[] {
        return this._checkListStore.getSelectedEnvironments();
    }

    private _checkListActions: EnvironmentCheckListActionCreator;
    private _checkListStore: EnvironmentCheckListStore;
}