/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { IInputControllerActions, IInputControllerStore } from "DistributedTaskControls/Common/Types";
import { IFooterRenderer, IInputActionDelegateProps, TaskInput } from "DistributedTaskControls/Components/Task/TaskInput";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";

import { GroupedList, IGroup, IGroupDividerProps, IGroupRenderProps } from "OfficeFabric/GroupedList";
import { List } from "OfficeFabric/List";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";

import { TaskGroupDefinition } from "TFS/DistributedTask/Contracts";
import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface ITaskInputGroupProps extends ComponentBase.IProps {
    controllerInstanceId: string;
    groupDefinition: TaskGroupDefinition;
    inputs: TaskInputDefinition[];
    isSectionAutoCollapsed: boolean;
    inputActionDelegates?: IInputActionDelegateProps;
    controllerStore: IInputControllerStore;
    controllerActions: IInputControllerActions;
    iconClassName?: string;
    footerRenderer?: IFooterRenderer;
    requiredEditCapability?: ProcessManagementCapabilities;
}

export interface ITaskInputGroupState {
    isCollapsed: boolean; // TODO: store it in store so that its persisted on re-render/tab switch
}

export class TaskInputGroup extends ComponentBase.Component<ITaskInputGroupProps, ITaskInputGroupState> {

    public render(): JSX.Element {
        let returnValue: JSX.Element;

        if (!!this.props.groupDefinition) {
            let group: IGroup = {
                key: this.props.groupDefinition.name,
                name: this.props.groupDefinition.displayName,
                startIndex: 0,
                count: this.props.inputs.length,
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
                <div className="fabric-style-overrides">
                    <AccordionCustomRenderer
                        label={this.props.groupDefinition.displayName}
                        initiallyExpanded={!this.props.isSectionAutoCollapsed}
                        headingLevel={2}
                        addSeparator={false}
                        addSectionHeaderLine={true}
                        showErrorDelegate={this._doesInputGroupHaveError}
                        bowtieIconName={this.props.iconClassName}>
                        <GroupedList
                            className="task-input-group"
                            groups={[group]}
                            groupProps={groupProps}
                            items={this.props.inputs}
                            onRenderCell={this._getParentedInputComponent}
                            selectionMode={SelectionMode.single} />
                    </AccordionCustomRenderer>
                </div>
            );
        } else {
            returnValue = (
                <div className="fabric-style-overrides">
                    <List
                        className="task-input-unparented-group"
                        items={this.props.inputs}
                        onRenderCell={this._getUnparentedInputComponent} />
                </div>
            );
        }

        return returnValue;
    }

    private _onToggleCollapse = (group: IGroup) => {
        this.setState({
            isCollapsed: !group.isCollapsed
        } as ITaskInputGroupState);
    }

    private _getUnparentedInputComponent = (input: TaskInputDefinition, index: number) => {
        return this._getInput(input);
    }

    private _getParentedInputComponent = (nestingDepth: number, input: TaskInputDefinition) => {
        return this._getInput(input);
    }

    private _getInput(inputDefinition: TaskInputDefinition): JSX.Element {
        return this._getInputControl(inputDefinition);
    }

    private _getInputControl(inputDefinition: TaskInputDefinition): JSX.Element {
        return (<TaskInput key={inputDefinition.name}
            taskInstanceId={this.props.controllerInstanceId}
            inputDefinition={inputDefinition}
            inputActionDelegates={this.props.inputActionDelegates}
            controllerStore={this.props.controllerStore}
            controllerActions={this.props.controllerActions}
            footerRenderer={this.props.footerRenderer}
            requiredEditCapability={this.props.requiredEditCapability}
        />);
    }

    private _doesInputGroupHaveError = (): boolean => {
        let isInvalid: boolean = false;

        if (this.props.inputs) {
            isInvalid = this.props.inputs.some((input: TaskInputDefinition) => {
                return !this.props.controllerStore.isInputValid(input);
            });
        }
        return isInvalid;
    }

}
