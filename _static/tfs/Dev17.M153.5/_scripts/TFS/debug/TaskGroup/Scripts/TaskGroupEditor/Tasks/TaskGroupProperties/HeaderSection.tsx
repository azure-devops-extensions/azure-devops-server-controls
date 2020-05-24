import * as React from "react";

import { IDropdownOption } from "OfficeFabric/DropDown";

import { localeFormat as localeStringFormat } from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { getMajorVersionSpec } from "DistributedTasksCommon/TFS.Tasks.Utils";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";

import { TaskGroupVersionsActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/Versions/TaskGroupVersionsActionCreator";
import { TaskGroupVersionsStore, ITaskGroupVersionsStoreState } from "TaskGroup/Scripts/TaskGroupEditor/Versions/TaskGroupVersionsStore";
import { TaskGroupPropertiesItemStore, ITaskGroupPropertiesItemState } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemStore";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface IHeaderSectionState extends ITaskGroupVersionsStoreState {
    name: string;
}

export class HeaderSection extends Component<IProps, IHeaderSectionState>{

    public render(): JSX.Element {
        return (<div className={"header-section"}>

            <div className={"tg-name-title"}>
                {localeStringFormat(Resources.TaskGroupPropertiesDetailsHeaderNameFormat, this.state.name)}
            </div>

            {
                !!this.state.selectedVersion
                &&
                <div className={"tg-version-selector"}>
                    <DropDownInputControl
                        cssClass={"tg-version-selector-dropdown"}
                        label={Resources.TaskVersionText}
                        options={this._getVersionDropDownOptions()}
                        selectedKey={this.state.selectedVersion.version.major}
                        onValueChanged={this._onVersionChanged}
                    />
                </div>
            }

        </div>
        );
    }

    public componentWillMount(): void {
        this._taskGroupVersionsActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupVersionsActionCreator>(TaskGroupVersionsActionCreator, this.props.instanceId);
        this._taskGroupVersionsStore = StoreManager.GetStore<TaskGroupVersionsStore>(TaskGroupVersionsStore, this.props.instanceId);
        this._taskGroupPropertiesItemStore = StoreManager.GetStore<TaskGroupPropertiesItemStore>(TaskGroupPropertiesItemStore, this.props.instanceId);
        this._onStoreChange();
        this._taskGroupVersionsStore.addChangedListener(this._onStoreChange);
        this._taskGroupPropertiesItemStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._taskGroupVersionsStore.removeChangedListener(this._onStoreChange);
        this._taskGroupPropertiesItemStore.removeChangedListener(this._onStoreChange);
    }

    private _onStoreChange = () => {
        const state = this._taskGroupVersionsStore.getState();
        const name = this._taskGroupPropertiesItemStore.getState().name;
        this.setState({
            ...state,
            name: name
        });
    }

    private _onVersionChanged = (item: IDropDownItem): void => {
        const selectedTaskGroup = this._taskGroupVersionsStore.getTaskGroupWithMajorVersion(item.option.key as number);

        if (!!selectedTaskGroup) {
            this._taskGroupVersionsActionCreator.updateSelectedVersion(selectedTaskGroup);
        }
    }

    private _getVersionDropDownOptions(): IDropdownOption[] {
        return this.state.allVersions.map((taskGroup: DTContracts.TaskGroup) => {
            return {
                key: taskGroup.version.major,
                text: getMajorVersionSpec(taskGroup.version)
            } as IDropdownOption;
        });
    }

    private _taskGroupVersionsActionCreator: TaskGroupVersionsActionCreator;
    private _taskGroupVersionsStore: TaskGroupVersionsStore;
    private _taskGroupPropertiesItemStore: TaskGroupPropertiesItemStore;
}