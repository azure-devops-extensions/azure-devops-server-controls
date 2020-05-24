/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ITaskGroupParametersState, TaskGroupParametersStore } from "DistributedTaskControls/Stores/TaskGroupParametersStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { SectionHeader } from "DistributedTaskControls/Components/SectionHeader";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskGroupParametersRow } from "DistributedTaskControls/Components/Task/TaskGroupParametersRow";
import { TaskGroupParametersActionCreator } from "DistributedTaskControls/Actions/TaskGroupParametersActionCreator";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskGroupParameters";

interface IConfigurationVariableParametersViewProps {
    metaTaskInputs: DistributedTaskContracts.TaskInputDefinition[];
    parameterRowKey: string;
    doNotShowHeader: boolean;
    showEndpointsAsDropdowns: boolean;
    onTaskGroupMetaInputValueChanged: (value: string, index: number) => void;
    onTaskGroupMetaInputHelpMarkDownChanged: (value: string, index: number) => void;

    // Props required for endpoint type inputs
    inputControlInstanceIdPrefix: string;
    onTaskGroupEndpointInputOptionsChanged: (options: IDictionaryStringTo<string>, index: number) => void;
}

const ConfigurationVariableParametersView = (props: IConfigurationVariableParametersViewProps) => (
    !!props.metaTaskInputs.length ? <div className="dtc-task-group-parameters">

        {
            !props.doNotShowHeader &&
            (<div className="dtc-task-group-parameters-heading-area">
                <SectionHeader
                    sectionLabel={Resources.Parameters}
                    cssClass={"dtc-task-group-parameters-heading"} />

                <div className="dtc-group-parameter-heading-description">
                    {Resources.GroupTaskDialogParameterText}
                </div>

            </div>)
        }

        <div className="dtc-task-group-parameter-header-row">
            <div className="dtc-task-group-parameter-name"> {Resources.Name} </div>
            <div className="dtc-task-group-parameter-value"> {Resources.DefaultValueText} </div>
            <div className="dtc-task-group-parameter-description"> {Resources.Description} </div>
        </div>

        {
            props.metaTaskInputs.map(function (taskInput, index) {
                return (
                    <TaskGroupParametersRow
                        key={props.parameterRowKey + index}
                        taskInput={taskInput}
                        showEndpointsAsDropdowns={props.showEndpointsAsDropdowns}
                        index={index}
                        onTaskGroupMetaInputValueChanged={props.onTaskGroupMetaInputValueChanged}
                        onTaskGroupMetaInputHelpMarkDownChanged={props.onTaskGroupMetaInputHelpMarkDownChanged}
                        inputControlInstanceId={props.inputControlInstanceIdPrefix + "-input-" + index}
                        onTaskGroupEndpointInputOptionsChanged={props.onTaskGroupEndpointInputOptionsChanged} />
                );
            })
        }</div> : null
);

export interface ITaskGroupParametersViewProps extends IProps {
    doNotShowHeader?: boolean;
    showEndpointsAsDropdowns?: boolean;
}

export class TaskGroupParametersView extends Component<ITaskGroupParametersViewProps, ITaskGroupParametersState>{

    public componentWillMount() {
        this._taskGroupParametersStore = StoreManager.GetStore<TaskGroupParametersStore>(TaskGroupParametersStore, this.props.instanceId);
        this._taskGroupParametersActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupParametersActionCreator>(TaskGroupParametersActionCreator, this.props.instanceId);
        this.setState(this._taskGroupParametersStore.getState());

        this._taskGroupParametersStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._taskGroupParametersStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {

        return (
            <ConfigurationVariableParametersView
                metaTaskInputs={this.state.metaTaskData.metaTaskInputs}
                parameterRowKey={TaskGroupParametersView._parameterRowKey}
                onTaskGroupMetaInputValueChanged={this._onTaskGroupMetaInputValueChanged}
                onTaskGroupMetaInputHelpMarkDownChanged={this._onTaskGroupMetaInputHelpMarkDownChanged}
                doNotShowHeader={this.props.doNotShowHeader}
                showEndpointsAsDropdowns={this.props.showEndpointsAsDropdowns}
                inputControlInstanceIdPrefix={this.props.instanceId || "task-group-parameters-list"} 
                onTaskGroupEndpointInputOptionsChanged={this._onTaskGroupEndpointInputOptionsChanged}/>
        );
    }

    private _onChange = (): void => {
        this.setState(this._taskGroupParametersStore.getState());
    }

    private _onTaskGroupMetaInputValueChanged = (newValue: string, index: number): void => {
        this._taskGroupParametersActionCreator.changeTaskGroupMetaInputValue(newValue, index);
    }

    private _onTaskGroupMetaInputHelpMarkDownChanged = (newValue: string, index: number): void => {
        this._taskGroupParametersActionCreator.changeTaskGroupMetaInputHelpMarkDown(newValue, index);
    }

    private _onTaskGroupEndpointInputOptionsChanged = (newValue: IDictionaryStringTo<string>, index: number): void => {
        this._taskGroupParametersActionCreator.changeTaskGroupEndpointInputOptions(newValue, index);
    }

    private static readonly _parameterRowKey: string = "parameterRowKey";
    private _taskGroupParametersStore: TaskGroupParametersStore;
    private _taskGroupParametersActionCreator: TaskGroupParametersActionCreator;
}