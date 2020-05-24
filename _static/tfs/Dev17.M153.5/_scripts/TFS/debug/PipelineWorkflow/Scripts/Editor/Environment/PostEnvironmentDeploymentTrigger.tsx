// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Common from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { PickListV2InputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListV2InputComponent";

import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { EnvironmentTriggerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionCreator";
import { ITabItemProps } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerControllerView";
import { IPostEnvironmentDeploymentTriggerViewState, PostEnvironmentDeploymentViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostEnvironmentDeploymentViewStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { SelectionMode } from "OfficeFabric/Selection";

import { clone } from "VSS/Utils/Array";
import { empty } from "VSS/Utils/String";
import { IPickListItem } from "VSSUI/Components/PickList";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/PostEnvironmentDeploymentTrigger";

export interface IPostEnvironmentDeploymentTriggerTabItemProps extends ITabItemProps {
    environments: PipelineDefinitionEnvironment[];
}

export class Component extends Base.Component<IPostEnvironmentDeploymentTriggerTabItemProps, IPostEnvironmentDeploymentTriggerViewState> {

    constructor(props: IPostEnvironmentDeploymentTriggerTabItemProps) {
        super(props);
        this._store = StoreManager.GetStore<PostEnvironmentDeploymentViewStore>(PostEnvironmentDeploymentViewStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<EnvironmentTriggerActionCreator>(EnvironmentTriggerActionCreator, this.props.instanceId);

        this._environmentsSortedByRank = clone(this.props.environments || []).sort((env1, env2) => env1.rank - env2.rank);
        this._environmentIdToNameMap = this._getEnvironmentIdToNameOptionsMap(this._environmentsSortedByRank);
        this._environmentNameToIdMap = this._getEnvironmentNameToIdOptionsMap(this._environmentsSortedByRank);
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let errorComponentId: string = !this.state.isValid ? "triggers-environment-dropdown-error-component-id" : empty;

        return (
            <div className="cd-environment-post-environment-trigger">
                <div className={"pre-environment-picklist-dropdown " + (this.state.isValid ? "validDropDown" : "invalidDropDown")}>
                    {this._getPickList(errorComponentId)}
                </div>
                {(!this.state.isValid) ?
                    <ErrorComponent cssClass={"pre-environment-error"} errorMessage={this.state.errorMessage} id={errorComponentId}/>
                    : null
                }
                <div className="pre-environment-partiallySucceeded-checkbox">
                    {this._getCheckBox()}
                </div>
            </div>
        );
    }

    private _getPickList(errorComponentId: string): JSX.Element {
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.PreEnvironmentTriggerConditionHelpText
            }
        };

        return (
            <PickListV2InputComponent
                label={Resources.PreEnvironmentNameLabel}
                key="pick-list-component"
                selectionMode={SelectionMode.multiple}
                value={this._getSelectedItems()}
                onValueChanged={this._onChanged}
                infoProps={infoProps}
                pickListInputClassName="environment-trigger-pick-list-input"
                options={this._getPickListItems()}
                ariaLabel={Resources.EnvironmentsText} 
                ariaDescribedBy={errorComponentId} />
        );
    }

    private _getSelectedItems(): IPickListItem[] {
        return (this.state.selectedEnvironments || []).map((environmentName) => {
            return {
                key: this._environmentNameToIdMap[environmentName],
                name: environmentName
            };

        });
    }

    private _getCheckBox(): JSX.Element {
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.TriggerForPartiallySucceededHelpText
            }
        };
        return <BooleanInputComponent
            label={Resources.TriggerForPartiallySucceeded}
            value={this.state.partiallySucceededDeployment}
            infoProps={infoProps}
            onValueChanged={(newValue: boolean) => { this._handlePartiallySucceededUpdate(newValue); }} />;
    }

    private _getEnvironmentIdToNameOptionsMap(environments: PipelineDefinitionEnvironment[]): IDictionaryStringTo<string> {
        let environmentIdToNameOptionsMap: IDictionaryStringTo<string> = {};
        if (environments) {
            environments.forEach((environment) => {
                environmentIdToNameOptionsMap[environment.id] = environment.name;
            });
        }

        return environmentIdToNameOptionsMap;
    }

    private _getEnvironmentNameToIdOptionsMap(environments: PipelineDefinitionEnvironment[]): IDictionaryStringTo<string> {
        let environmentNameToIdOptionsMap: IDictionaryStringTo<string> = {};
        if (environments) {
            environments.forEach((environment) => {
                environmentNameToIdOptionsMap[environment.name] = environment.id.toString();
            });
        }

        return environmentNameToIdOptionsMap;
    }

    private _onChanged = (selectedItems: IPickListItem[]): void => {
        this._actionCreator.updateEnvironmentTriggerCondition({
            environmentIdToNameMap: this._environmentIdToNameMap,
            selectedEnvironments: selectedItems.map(item => item.key),
            partiallySucceededDeployment: this.state.partiallySucceededDeployment
        });
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _handlePartiallySucceededUpdate = (newValue: boolean) => {
        this._actionCreator.updatePartiallySucceededCondition(newValue);
    }

    private _getPickListItems(): IPickListItem[] {
        // Since options are constructed from environments array, they have to be in sync. 
        return this._environmentsSortedByRank.map((environment) => {
            const id: string = environment.id.toString();

            return {
                key: id, 
                name: this._environmentIdToNameMap[id]
            } as IPickListItem;
        });
    }

    private _selectedValue: string;
    private _environmentsSortedByRank: PipelineDefinitionEnvironment[];
    private _environmentIdToNameMap: IDictionaryStringTo<string>;
    private _environmentNameToIdMap: IDictionaryStringTo<string>;
    private _store: PostEnvironmentDeploymentViewStore;
    private _actionCreator: EnvironmentTriggerActionCreator;
}
