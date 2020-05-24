/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { TaskGroupPropertiesStore, ITaskGroupPropertiesState } from "DistributedTaskControls/Stores/TaskGroupPropertiesStore";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { TaskGroupPropertiesActionCreator } from "DistributedTaskControls/Actions/TaskGroupPropertiesActionCreator";

import { IDropdownOption } from "OfficeFabric/Dropdown";

import * as Utils_String from "VSS/Utils/String";

export class TaskGroupPropertiesView extends ComponentBase.Component<ComponentBase.IProps, ITaskGroupPropertiesState>{

    public componentWillMount() {
        this._taskGroupPropertiesStore = StoreManager.GetStore<TaskGroupPropertiesStore>(TaskGroupPropertiesStore, this.props.instanceId);
        this._taskGroupPropertiesActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupPropertiesActionCreator>(TaskGroupPropertiesActionCreator, this.props.instanceId);
        this.setState(this._taskGroupPropertiesStore.getState());

        this._taskGroupPropertiesStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._taskGroupPropertiesStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this._taskGroupPropertiesStore.getState());
    }

    public render(): JSX.Element {

        let taskGroupDialogCategoryInfoProps: IInfoProps = {
            calloutContentProps: this._getCalloutContent()
        };

        return (
            <div className={this.props.cssClass}>
                {  /* Task group name label and text field */}

                <div className="input-field-component">
                    <StringInputComponent
                        label={Resources.NameLabel}
                        required={true}
                        value={this.state.name}
                        onValueChanged={this._onTaskGroupNameChanged}
                        getErrorMessage={(value: string) => { return this._getGroupErrorMessage(value); }}
                        inputClassName={TaskGroupPropertiesView.taskGroupNameFieldClass} />
                </div>


                {  /* Description for Task Group */}

                <div className="input-field-component">
                    <MultiLineInputComponent
                        label={Resources.Description}
                        isNotResizable={true}
                        value={this.state.description ? this.state.description : Utils_String.empty}
                        onValueChanged={this._onTaskGroupDescriptionChanged} />
                </div>

                { /* Category of task group */}

                <div className="dtc-task-group-dialog-category input-field-component">
                    <DropDownInputControl
                        label={Resources.CategoryText}
                        infoProps={taskGroupDialogCategoryInfoProps}
                        options={this._getDropdownOptions()}
                        selectedKey={this.state.category}
                        onValueChanged={(val: IDropDownItem) => { this._onTaskGroupCategoryChanged(val.option); }} />
                </div>
            </div>
        );
    }

    private _getDropdownOptions(): IDropdownOption[] {
        let dropdownOptions: IDropdownOption[] = [];

        dropdownOptions.push({ key: "Build", text: Resources.Build });
        dropdownOptions.push({ key: "Deploy", text: Resources.Deploy });
        dropdownOptions.push({ key: "Package", text: Resources.Package });
        dropdownOptions.push({ key: "Utility", text: Resources.Utility });
        dropdownOptions.push({ key: "Test", text: Resources.Test });

        return dropdownOptions;
    }

    private _onTaskGroupNameChanged = (newValue: string): void => {
        this._taskGroupPropertiesActionCreator.changeTaskGroupName(newValue);
    }

    private _onTaskGroupDescriptionChanged = (newValue: string): void => {
        this._taskGroupPropertiesActionCreator.changeTaskGroupDescription(newValue);
    }

    private _onTaskGroupCategoryChanged = (newValue: IDropdownOption): void => {
        this._taskGroupPropertiesActionCreator.changeTaskGroupCategory(newValue.key.toString());
    }

    private _getCalloutContent(): ICalloutContentProps {
        return {
            calloutDescription: Resources.GroupDialogboxCalloutDescription
        } as ICalloutContentProps;
    }

    private _getGroupErrorMessage = (value: string): string => {
        if (value.length === 0) {
            return Resources.RequiredInputErrorMessage;
        }
        return Utils_String.empty;
    }

    public static readonly taskGroupNameFieldClass: string = "dtc-task-group-properties-name-textfield";

    private _taskGroupPropertiesStore: TaskGroupPropertiesStore;
    private _taskGroupPropertiesActionCreator: TaskGroupPropertiesActionCreator;
}