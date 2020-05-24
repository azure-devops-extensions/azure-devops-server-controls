/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Common from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { Component as Markdown } from "DistributedTaskControls/Components/MarkdownRenderer";
import { TaskActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Accordion } from "DistributedTaskControls/SharedControls/Accordion/Accordion";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { GroupedList, IGroup, IGroupDividerProps, IGroupRenderProps } from "OfficeFabric/GroupedList";
import { Label } from "OfficeFabric/Label";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskDetailsOutputGroup";

export interface ITaskDetailsOutputGroupProps extends ComponentBase.IProps {
    controllerInstanceId: string;
    refName: string;
    taskDefinition: TaskDefinition;
    isSectionAutoCollapsed: boolean;
}

export interface ITaskDetailsOutputGroupState extends ComponentBase.IState {
    refName: string;
    isCollapsed: boolean;
}

interface ITaskOutputVariablesOutputItem {
    task: TaskDefinition;
}

interface IOutputItem<T> {
    type: string;
    data?: T;
}

class OutputTypes {
    public static RefName = "REF_NAME";
    public static OutputVariables = "OUTPUT_VARIABLES";
}

export class TaskDetailsOutputGroup extends ComponentBase.Component<ITaskDetailsOutputGroupProps, ITaskDetailsOutputGroupState>{

    public componentWillMount(): void {
        this._domId = Utils_String.generateUID();

        this._store = StoreManager.GetStore<TaskStore>(TaskStore, this.props.controllerInstanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, this.props.controllerInstanceId);
        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, this._store.getTaskContext().processInstanceId);

        this._setState();
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._setState);
        this._processManagementStore.addChangedListener(this._setState);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._setState);
        this._processManagementStore.removeChangedListener(this._setState);
    }

    public componentWillReceiveProps(outputGroupProps: ITaskDetailsOutputGroupProps): void {
        this.setState({
            refName: outputGroupProps.refName,
            isCollapsed: false
        });
    }

    public render(): JSX.Element {
        let returnValue: JSX.Element;

        let group: IGroup = {
            key: "outputGroup",
            name: Resources.OutputGroup,
            startIndex: 0,
            count: 2,
            isCollapsed: !!this.state.isCollapsed,
            level: 0
        } as IGroup;

        let groupProps: IGroupRenderProps = {
            headerProps: {
                onToggleCollapse: this._onToggleCollapse,
                isCollapsedGroupSelectVisible: false
            },
            onRenderHeader: (groupDividerProps: IGroupDividerProps) => {
                return null;
            }
        } as IGroupRenderProps;

        returnValue = (
            <div className="fabric-style-overrides task-details-output-group">
                <Accordion
                    label={Resources.OutputGroup}
                    initiallyExpanded={!this.props.isSectionAutoCollapsed}
                    headingLevel={2}
                    addSeparator={false}
                    addSectionHeaderLine={true}>
                    <GroupedList
                        className="task-input-group"
                        groups={[group]}
                        groupProps={groupProps}
                        items={this._getOutputItems(this.props.taskDefinition)}
                        onRenderCell={this._getOutputComponent}
                        selectionMode={SelectionMode.single} />
                </Accordion>
            </div>
        );

        return returnValue;
    }

    private _onToggleCollapse = (group: IGroup) => {
        this.setState({
            isCollapsed: !group.isCollapsed
        } as ITaskDetailsOutputGroupState);
    }

    private _getOutputItems = (taskDefinition: TaskDefinition): IOutputItem<any>[] => {
        let outputVariableItem = { task: taskDefinition } as ITaskOutputVariablesOutputItem;
        let items = [
            {
                type: OutputTypes.RefName,
            } as IOutputItem<void>,
            {
                type: OutputTypes.OutputVariables,
                data: outputVariableItem,
            } as IOutputItem<ITaskOutputVariablesOutputItem>
        ];
        return items;
    }

    private _getOutputComponent = (nestingDepth: number, output: IOutputItem<any>) => {
        let outputControl: JSX.Element;

        if (output.type === OutputTypes.RefName) {
            let calloutEnableRefNameEditingContent: ICalloutContentProps = {
                calloutDescription: Resources.ChangeRefName,
            };

            let infoProps: IInfoProps = { calloutContentProps: calloutEnableRefNameEditingContent };
            outputControl = (
                <div className="task-ref-name task-input-flex">
                    <div className="input-grow">
                        <StringInputComponent
                            label={Resources.ReferenceNameText}
                            value={this.state.refName || Utils_String.empty}
                            onValueChanged={this._onRefNameChanged}
                            required={false}
                            disabled={!this._processManagementStore.canEditTaskInputs()}
                            infoProps={infoProps}
                            getErrorMessage={this._getRefNameErrorMessage}
                        />
                    </div>
                </div>
            );
        }
        else {
            let taskDefinitionData = output.data as ITaskOutputVariablesOutputItem;
            if (taskDefinitionData && taskDefinitionData.task) {
                const variableElementId = this._getTaskOutputVariableElementId();

                let variablesList: JSX.Element;
                if (taskDefinitionData.task.outputVariables && taskDefinitionData.task.outputVariables.length > 0) {
                    variablesList = (
                        <table className="task-output-variable-table" id={variableElementId}>
                            <tbody>
                                {
                                    taskDefinitionData.task.outputVariables.map((item) => {
                                        let calloutOutputVariableContent: ICalloutContentProps = {
                                            calloutMarkdown: item.description,
                                        };

                                        return (
                                            <tr className="output-variable">
                                                <td>
                                                    {this.state.refName + "." + item.name}
                                                </td>
                                                <td>
                                                    <InfoButton cssClass="task-type-info"
                                                        calloutContent={calloutOutputVariableContent}
                                                        iconStyle="task-type-info-icon"
                                                        isIconFocusable={true} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                }
                            </tbody>
                        </table>);
                }
                else {
                    variablesList = (
                        <Label className="task-output-variables-empty-label" htmlFor={variableElementId}>
                            <Markdown markdown={Resources.EmptyOutputVariablesList} />
                        </Label>
                    );
                }

                outputControl = (
                    <div>
                        <Label className="task-output-variables-label" htmlFor={variableElementId}>
                            {Resources.VariablesList}
                        </Label>
                        {variablesList}
                    </div>);
            }
        }

        return outputControl;
    }

    private _getTaskRefNameElementId(): string {
        return "task-ref-name-" + this._domId;
    }

    private _getTaskOutputVariableElementId(): string {
        return "task-output-variable-" + this._domId;
    }

    private _onRefNameChanged = (newRefName: string) => {
        this._actionCreator.updateTaskRefName(newRefName);
    }

    private _getRefNameErrorMessage = (value: string): string => {
        let errorMessage: string = Utils_String.empty;

        if (FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_TaskValidateOutputVariables) && value && !DtcUtils.isValidRefName(value)) {
            errorMessage = Resources.InvalidRefNameInput;
        }

        return errorMessage;
    }

    private _setState = () => {
        this.setState({
            refName: this._store.getTaskRefName(),
            isCollapsed: this.state.isCollapsed
        });
    }

    private _domId: string;
    private _store: TaskStore;
    private _actionCreator: TaskActionCreator;
    private _processManagementStore: ProcessManagementStore;
}
