import * as React from "react";
import * as ReactDOM from "react-dom";

import { using } from "VSS/VSS";

import { css } from "OfficeFabric/Utilities";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import { PerfTelemetryManager, TelemetryScenarios, TaskGroupTelemetry } from "TaskGroup/Scripts/Utils/TelemetryUtils";
import { navigateToHubWithoutPageReload, navigateToTaskGroupEditor } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { TaskGroupsActionCreator } from "TaskGroup/Scripts/TaskGroups/TaskGroupsActionCreator";
import { TaskGroupsStore, SortedColumnType } from "TaskGroup/Scripts/TaskGroups/TaskGroupsStore";
import { TaskGroupsListColumnKeys, TaskGroupsListMenuItemKeys, TaskGroupsListMessageBarKeys } from "TaskGroup/Scripts/TaskGroups/Constants";
import { ContributionIds } from "TaskGroup/Scripts/Common/Constants";
import { ITaskGroupsState, ITaskGroupItem } from "TaskGroup/Scripts/TaskGroups/TaskGroupsStore";
import * as DeleteTaskGroupDialog_Type from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialog";
import * as DeleteTaskGroupDialogActionCreator_Type from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogActionCreator";
import { showSecurityDialogForTaskGroup } from "TaskGroup/Scripts/Utils/SecurityHelper";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class TaskGroupsList extends Component<IProps, ITaskGroupsState>{
    constructor(props: IProps) {
        super(props);
        this._taskGroupsStore = StoreManager.GetStore<TaskGroupsStore>(TaskGroupsStore);
        this._taskGroupsActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupsActionCreator>(TaskGroupsActionCreator);
        this.state = this._taskGroupsStore.getState();
    }

    public render(): JSX.Element {
        return (
            <div className={"task-groups-details-list"}>
                <InformationBar
                    parentKey={TaskGroupsListMessageBarKeys.ErrorBarParentKey} />
                <VssDetailsList
                    className={css("task-groups-list", this.props.cssClass)}
                    actionsColumnKey={TaskGroupsListColumnKeys.Name}
                    getMenuItems={this._menuItems}
                    columns={this._columns}
                    items={this.state.items}
                    onItemInvoked={this._onItemInvoked} />
            </div>
        );
    }

    public componentDidMount(): void {
        this._taskGroupsStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._taskGroupsStore.removeChangedListener(this._onStoreChange);
    }

    private _menuItems = (item: ITaskGroupItem): IContextualMenuItem[] => {
        return [
            {
                key: TaskGroupsListMenuItemKeys.Delete,
                name: Resources.DeleteMenuItemName,
                iconProps:
                    {
                        iconName: "Cancel"
                    },
                onClick: () => this._onDeleteTaskGroup(item)
            },
            {
                key: TaskGroupsListMenuItemKeys.Export,
                name: Resources.ExportMenuItemName,
                iconProps: {
                    className: "bowtie-icon bowtie-transfer-upload"
                },
                onClick: () => this._onExportTaskGroup(item)
            },
            {
                key: TaskGroupsListMenuItemKeys.Security,
                name: Resources.TaskGroupSecurityMenuItemName,
                iconProps: {
                    className: "bowtie-icon bowtie-shield",
                },
                onClick: () => this._onTaskGroupSecurity(item)
            }
        ];
    }

    private _onStoreChange = () => {
        const state = this._taskGroupsStore.getState();
        this.setState(state);
    }

    private get _columns(): IColumn[] {
        return [
            {
                name: Resources.NameColumnHeader,
                key: TaskGroupsListColumnKeys.Name,
                minWidth: 300,
                maxWidth: 600,
                fieldName: "name",
                isResizable: true,
                isSorted: this.state.sortedColumn === SortedColumnType.Name,
                isSortedDescending: this.state.sortedColumn === SortedColumnType.Name && this.state.sortedDescending,
                onColumnClick: this._onNameColumnHeaderClick,
                onRender: (item: ITaskGroupItem) => (
                    <SafeLink
                        href={item.url}
                        onClick={(event) => { this._onTaskGroupNameClick(event, item.url); }}>
                        {item.name}
                    </SafeLink>)
            },
            {
                name: Resources.ModifiedByColumnHeader,
                key: TaskGroupsListColumnKeys.ModifiedBy,
                minWidth: 100,
                maxWidth: 300,
                fieldName: "modifiedBy",
                isResizable: true,
                isSorted: this.state.sortedColumn === SortedColumnType.ModifiedBy,
                isSortedDescending: this.state.sortedColumn === SortedColumnType.ModifiedBy && this.state.sortedDescending,
                onColumnClick: this._onModifiedByColumnHeaderClick,
                onRender: (item: ITaskGroupItem) => (
                    item.modifiedBy || item.owner
                )
            },
            {
                name: Resources.DescriptionColumnHeader,
                key: TaskGroupsListColumnKeys.Description,
                minWidth: 100,
                maxWidth: 450,
                fieldName: "description",
                columnActionsMode: ColumnActionsMode.disabled,
                isResizable: true
            },
            {
                name: Resources.ModifiedOnColumnHeader,
                key: TaskGroupsListColumnKeys.ModifiedDate,
                minWidth: 100,
                maxWidth: 300,
                fieldName: "modifiedOn",
                isResizable: true,
                isSorted: this.state.sortedColumn === SortedColumnType.ModifiedOn,
                isSortedDescending: this.state.sortedColumn === SortedColumnType.ModifiedOn && this.state.sortedDescending,
                onColumnClick: this._onModifiedOnColumnHeaderClick,
            }
        ];
    }

    private _onItemInvoked = (item: ITaskGroupItem, index: number, event: Event): void => {
        navigateToTaskGroupEditor(item.id);
    }

    private _onDeleteTaskGroup(item: ITaskGroupItem): void {
        if (item.fromExtension) {
            this._taskGroupsActionCreator.handleError(Resources.CannotDeleteTaskGroupFromExtention);
            return;
        }

        TaskGroupTelemetry.deleteTaskGroupClicked();

        using(
            ["TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialog", "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogActionCreator"],
            (DeleteTaskGroupDialog: typeof DeleteTaskGroupDialog_Type, DeleteTaskGroupDialogActionCreator: typeof DeleteTaskGroupDialogActionCreator_Type) => {
                const deleteTaskGroupDialogActionCreator =
                    ActionCreatorManager.GetActionCreator<DeleteTaskGroupDialogActionCreator_Type.DeleteTaskGroupDialogActionCreator>(DeleteTaskGroupDialogActionCreator.DeleteTaskGroupDialogActionCreator);
                deleteTaskGroupDialogActionCreator.getAllTaskGroupReferences(item.id);
                DeleteTaskGroupDialog.renderDeleteTaskGroupDialog(item.id, item.name);
            },
            (error) => {
                this._taskGroupsActionCreator.handleError(error);
            });
    }

    private _onExportTaskGroup(item: ITaskGroupItem): void {
        TaskGroupTelemetry.exportTaskGroupClickedFromList();
        this._taskGroupsActionCreator.exportTaskGroup(item.id);
    }

    private _onTaskGroupSecurity(item: ITaskGroupItem): void {
        showSecurityDialogForTaskGroup(item.id, item.parentDefinitionId, item.name);
    }

    private _onTaskGroupNameClick(event: React.MouseEvent<any>, url: string): void {
        navigateToHubWithoutPageReload(event, ContributionIds.TaskGroupHub, url);
    }

    private _onNameColumnHeaderClick = (): void => {
        this._taskGroupsActionCreator.taskGroupNameHeaderClick();
    }

    private _onModifiedByColumnHeaderClick = (): void => {
        this._taskGroupsActionCreator.taskGroupModifiedByHeaderClick();
    }

    private _onModifiedOnColumnHeaderClick = (): void => {
        this._taskGroupsActionCreator.taskGroupModifiedOnHeaderClick();
    }
    private _taskGroupsActionCreator: TaskGroupsActionCreator;
    private _taskGroupsStore: TaskGroupsStore;
}