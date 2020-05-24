import * as React from "react";
import * as ReactDOM from "react-dom";

import { using } from "VSS/VSS";
import { getPageContext } from "VSS/Context";
import { localeFormat as localeStringFormat, format as stringFormat, empty as emptyString } from "VSS/Utils/String";
import { getRunningDocumentsTable, RunningDocumentsTableEntry, RunningDocument } from "VSS/Events/Document";
import * as KeyboardShortcuts_Type from "VSS/Controls/KeyboardShortcuts";
import * as Platform_Resources from "VSS/Resources/VSS.Resources.Platform";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { Hub, IHub } from "VSSUI/Hub";
import { PivotBarItem, IPivotBarAction, IPivotBarViewAction, PivotBarViewActionType, IChoiceGroupViewActionProps } from "VSSUI/PivotBar";
import { HubHeader, IHubBreadcrumbItem } from "VSSUI/HubHeader";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT, } from "VSSUI/Utilities/ViewOptions";
import { VssIconType } from "VSSUI/VssIcon";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ImportExportFileUtils } from "DistributedTaskControls/Common/ImportExportFileUtils";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { TaskGroupEditorHubItemKeys, TaskGroupEditorInstanceIds } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TaskGroupEditorStore, ITaskGroupEditorState } from "TaskGroup/Scripts/TaskGroupEditor/TaskGroupEditorStore";
import { TaskGroupEditorActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/TaskGroupEditorActionCreator";
import { TasksTabContent } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabContent";
import { TaskGroupHistory } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistory";
import { TaskGroupReferences } from "TaskGroup/Scripts/TaskGroupEditor/References/TaskGroupReferences";
import { ContributionIds, TaskGroupEditorPivotKeys } from "TaskGroup/Scripts/Common/Constants";
import { renderSaveTaskGroupDialog, renderPublishTaskGroupPreviewDialog } from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialog";
import { renderPublishDraftTaskGroupDialog } from "TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialog";
import { getHubUrl, navigateToHubWithoutPageReload } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { PerfTelemetryManager, TaskGroupTelemetry, TelemetryScenarios } from "TaskGroup/Scripts/Utils/TelemetryUtils";
import { showSecurityDialogForTaskGroup } from "TaskGroup/Scripts/Utils/SecurityHelper";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

class TaskGroupEditorDocumentTable implements RunningDocument {
    public constructor(private _taskGroupEditorStore: TaskGroupEditorStore) {
    }

    public isDirty(): boolean {
        const state = this._taskGroupEditorStore.getState();
        return state.dirty || state.isImport;
    }
}

export interface ITaskGroupEditorHubProps extends IProps {
    taskGroupId: string;
}

export class TaskGroupEditorHub extends Component<ITaskGroupEditorHubProps, ITaskGroupEditorState>{
    constructor(props: ITaskGroupEditorHubProps) {
        super(props);
        this._hubViewState = new VssHubViewState();

        this._taskGroupEditorStore = StoreManager.GetStore<TaskGroupEditorStore>(
            TaskGroupEditorStore,
            props.instanceId);
        this._taskGroupEditorActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupEditorActionCreator>(TaskGroupEditorActionCreator, props.instanceId);

        const taskGroupEntryKey: string = "TaskGroupEditor";
        this._taskGroupEditorEntry = getRunningDocumentsTable().add(taskGroupEntryKey, new TaskGroupEditorDocumentTable(this._taskGroupEditorStore));
    }

    public render() {
        return (
            <Hub
                className={"task-group-editor-hub"}
                hubViewState={this._hubViewState}
                commands={this._getHubCommands()}>

                <HubHeader
                    title={this.state.name}
                    breadcrumbItems={this._getHubBreadcrumbItems()} />

                <PivotBarItem
                    className={"task-group-editor-pivot history-tab-pivot"}
                    itemKey={TaskGroupEditorPivotKeys.TasksPivotItemKey}
                    name={Resources.TasksTabName}>

                    {this._getTasksPivotItemContent()}

                </PivotBarItem>

                <PivotBarItem
                    className={"task-group-editor-pivot tasks-tab-pivot"}
                    itemKey={TaskGroupEditorPivotKeys.HistoryPivotItemKey}
                    name={Resources.HistoryTabName}
                    hidden={this.state.isImport}
                >

                    {this._getHistoryPivotItemContent(this.props.taskGroupId)}

                </PivotBarItem>

                <PivotBarItem
                    className={"task-group-editor-pivot references-tab-pivot"}
                    itemKey={TaskGroupEditorPivotKeys.ReferencesPivotItemKey}
                    name={Resources.ReferencesTabName}
                    hidden={this.state.isImport}
                >

                    {this._getReferencesPivotItemContent()}

                </PivotBarItem>
            </Hub>
        );
    }

    public componentWillMount(): void {
        this._registerShortcuts();
        const state = this._taskGroupEditorStore.getState();
        this._setWindowTitle(state.name);
        this.setState(state);
        this._taskGroupEditorStore.addChangedListener(this._onStoreChange);
    }

    public componentDidMount(): void {
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.TaskGroupEditorLanding);
    }

    public componentWillUnmount(): void {
        this._taskGroupEditorStore.removeChangedListener(this._onStoreChange);
        getRunningDocumentsTable().remove(this._taskGroupEditorEntry);
        this._unregisterShortcuts();
    }

    private _getHubBreadcrumbItems(): IHubBreadcrumbItem[] {
        return [
            {
                href: getHubUrl(ContributionIds.TaskGroupHub),
                key: TaskGroupEditorHubItemKeys.TaskGroupsBreadcrumbItemKey,
                leftIconProps: {
                    iconName: "bowtie-task-group",
                    iconType: VssIconType.bowtie
                },
                text: Resources.TaskGroupsHubHeader,
                onClick: this._onTaskGroupsBreadCrumbClick
            }
        ];
    }

    private _getHubCommands(): IPivotBarAction[] {
        const menuItems: IPivotBarAction[] = [
            this._getRefreshOrDiscardMenuItem(),
            this._getSaveMenuItem(),
            {
                key: TaskGroupEditorHubItemKeys.ExportMenuItem,
                name: Resources.ExportMenuItemName,
                iconProps: {
                    className: "bowtie-icon bowtie-transfer-upload"
                },
                disabled: this.state.dirty || this.state.isImport,
                important: true,
                onClick: this._onExportTaskGroupClick
            },
            {
                key: TaskGroupEditorHubItemKeys.SecurityMenuItem,
                name: Resources.TaskGroupSecurityMenuItemName,
                iconProps: {
                    className: "bowtie-icon bowtie-shield"
                },
                disabled: this.state.isImport,
                important: false,
                onClick: this._onSecurityClick
            }
        ];

        if (this.state.isDraft) {
            menuItems.splice(1, 0, this._getPublishDraftMenuItem());
        }

        if (this.state.isPreview) {
            menuItems.splice(1, 0, this._getPublishPreviewMenuItem());
        }

        return menuItems;
    }

    private _getRefreshOrDiscardMenuItem(): IPivotBarAction {
        if (this.state.dirty || this.state.isImport) {
            return {
                key: TaskGroupEditorHubItemKeys.DiscardMenuItem,
                name: Resources.DiscardMenuItemName,
                iconProps: {
                    iconName: "Undo",
                    iconType: VssIconType.fabric
                },
                disabled: !this.state.dirty,
                important: true,
                onClick: this._onDiscardTaskGroupClick
            };
        }
        else {
            return {
                key: TaskGroupEditorHubItemKeys.RefreshMenuItem,
                name: Resources.RefreshMenuItemName,
                iconProps: {
                    iconName: "Refresh",
                    iconType: VssIconType.fabric
                },
                important: true,
                onClick: this._onRefreshTaskGroupClick
            };
        }
    }

    private _getSaveMenuItem(): IPivotBarAction {
        const saveTaskGroupItemName = this.state.isDraft ? Resources.SaveDraftMenuItemName : Resources.SaveMenuItemName;
        const saveTaskGroupItem = {
            key: TaskGroupEditorHubItemKeys.SaveSubMenuItem,
            name: saveTaskGroupItemName,
            disabled: !this._isSaveEnabled(),
            iconProps: {
                iconName: "Save",
                iconType: VssIconType.fabric
            },
            important: true,
            onClick: this._onSaveTaskGroupClick
        };

        if (this.state.isDraft) {
            return saveTaskGroupItem;
        }
        else if (this.state.isImport) {
            return saveTaskGroupItem;
        }
        else {
            return {
                key: TaskGroupEditorHubItemKeys.SaveMenuItem,
                name: Resources.SaveMenuItemName,
                iconProps: {
                    iconName: "Save",
                    iconType: VssIconType.fabric
                },
                disabled: !this._isSaveEnabled(),
                important: true,
                children: [
                    saveTaskGroupItem,
                    {
                        key: TaskGroupEditorHubItemKeys.SaveAsDraftSubMenuItem,
                        name: Resources.SaveAsDraftMenuItemName,
                        iconProps: {
                            iconName: "Save",
                            iconType: VssIconType.fabric
                        },
                        important: true,
                        onClick: this._onSaveTaskGroupAsDraftClick
                    }
                ]
            };
        }
    }

    private _isSaveEnabled(): boolean {
        return ((this.state.dirty || this.state.isImport) && !this.state.invalid && !this.state.fromExtension);
    }

    private _getPublishDraftMenuItem(): IPivotBarAction {
        if (this.state.isDraft) {
            return {
                key: TaskGroupEditorHubItemKeys.PublishDraftMenuItem,
                name: Resources.PublishDraftMenuItemName,
                iconProps: {
                    iconName: "Accept",
                    iconType: VssIconType.fabric
                },
                disabled: this.state.dirty,
                important: true,
                onClick: this._onPublishDraftClick
            };
        }

        return null;
    }

    private _getPublishPreviewMenuItem(): IPivotBarAction {
        if (this.state.isPreview) {
            return {
                key: TaskGroupEditorHubItemKeys.PublishPreviewMenuItem,
                name: Resources.PublishPreviewMenuItemName,
                iconProps: {
                    iconName: "Accept",
                    iconType: VssIconType.fabric
                },
                disabled: this.state.dirty,
                important: true,
                onClick: this._onPublishPreviewClick
            };
        }

        return null;
    }

    // Copied from ReleaseManagement/Scripts/WebAccess/PipelineWorkflow/Scripts/Editor/Toolbar/ToolbarControllerView
    private _registerShortcuts() {
        using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcuts: typeof KeyboardShortcuts_Type) => {
            let keyboardShortcutManager = KeyboardShortcuts.ShortcutManager.getInstance();

            keyboardShortcutManager.registerShortcut(
                DTCResources.EditorShortKeyGroup,
                KeyboardShortcuts.ShortcutKeys.CONTROL + "+s",
                {
                    description: Resources.TaskGroupSaveKeyboardShortcutDescription,
                    action: () => {
                        if (this._isSaveEnabled()) {
                            this._handleSaveTaskGroupCommand();
                        }
                    },
                    element: document.body
                });

            DtcUtils.registertShortcuts();
        });
    }

    // Copied from ReleaseManagement/Scripts/WebAccess/PipelineWorkflow/Scripts/Editor/Toolbar/ToolbarControllerView
    private _unregisterShortcuts() {
        using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcuts: typeof KeyboardShortcuts_Type) => {

            let keyboardShortcutManager = KeyboardShortcuts.ShortcutManager.getInstance();
            keyboardShortcutManager.unRegisterShortcut(DTCResources.EditorShortKeyGroup, KeyboardShortcuts.ShortcutKeys.CONTROL + "+s");
            DtcUtils.unregisterShortcuts();
        });
    }

    private _onRefreshTaskGroupClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        this._taskGroupEditorActionCreator.initializeTaskGroup(this.props.taskGroupId, true);
    }

    private _onDiscardTaskGroupClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        const originalTaskGroup = this._taskGroupEditorStore.getSelectedTaskGroup();
        const confirmDialogContainer = document.createElement("div");
        ReactDOM.render(
            <ConfirmationDialog
                title={Resources.DiscardDialogTitle}
                subText={Resources.DiscardDialogSubText}
                showDialog={true}
                focusCancelButton={false}
                onConfirm={() => this._taskGroupEditorActionCreator.resetTaskGroup(originalTaskGroup)}
                onCancel={() => ReactDOM.unmountComponentAtNode(confirmDialogContainer)}
            />, confirmDialogContainer);
    }

    private _onExportTaskGroupClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        TaskGroupTelemetry.exportTaskGroupClickedFromEditor();
        const taskGroup = this._taskGroupEditorStore.getSelectedTaskGroup();
        const taskGroupStringContent = JSON.stringify(taskGroup);
        const fileName = taskGroup.name + ".json";

        ImportExportFileUtils.downloadExportedJSONFileContent(taskGroupStringContent, fileName);
        TaskGroupTelemetry.exportTaskGroupSucceeded();
    }

    private _onSecurityClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        showSecurityDialogForTaskGroup(this.props.taskGroupId, this.state.parentDefinitionId, this.state.name);
    }

    private _onSaveTaskGroupClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        this._handleSaveTaskGroupCommand();
    }

    private _handleSaveTaskGroupCommand(): void {
        const updatedTaskGroup = this._taskGroupEditorStore.getCurrentTaskGroup();
        if (this.state.isImport) {
            this._taskGroupEditorActionCreator.saveTaskGroup(updatedTaskGroup, null, this._taskGroupEditorEntry);
        }
        else {
            renderSaveTaskGroupDialog(updatedTaskGroup.name, (comment: string) => {
                this._taskGroupEditorActionCreator.saveTaskGroup(updatedTaskGroup, comment);
            });
        }
    }

    private _onSaveTaskGroupAsDraftClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        TaskGroupTelemetry.saveTaskGroupAsDraftClicked();
        const updatedTaskGroupAsDraft = this._taskGroupEditorStore.getCurrentTaskGroupAsDraft();
        this._taskGroupEditorActionCreator.saveTaskGroupAsDraft(updatedTaskGroupAsDraft, this._taskGroupEditorEntry);
    }

    private _onPublishDraftClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        if (this.state.isDraft) {
            const draftTaskGroup = this._taskGroupEditorStore.getCurrentTaskGroup();
            renderPublishDraftTaskGroupDialog(draftTaskGroup.name, (comment: string, isPreview: boolean) => {
                this._taskGroupEditorActionCreator.publishDraftTaskGroup(draftTaskGroup, comment, isPreview);
            });
        }
    }

    private _onPublishPreviewClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        if (this.state.isPreview) {
            const previewTaskGroup = this._taskGroupEditorStore.getCurrentTaskGroup();
            renderPublishTaskGroupPreviewDialog(previewTaskGroup.name, (comment: string) => {
                this._taskGroupEditorActionCreator.publishPreviewTaskGroup(previewTaskGroup, comment, false);
            });
        }
    }

    private _onTaskGroupsBreadCrumbClick = (event: any) => navigateToHubWithoutPageReload(event, ContributionIds.TaskGroupHub, getHubUrl(ContributionIds.TaskGroupHub));

    private _getTasksPivotItemContent(): JSX.Element {
        let cssClassForTasksTabContent: string = this.state && this.state.isImport ? "task-group-tasks-import" : "task-group-tasks";
        return (
            <TasksTabContent
                instanceId={this.props.instanceId}
                cssClass={cssClassForTasksTabContent}
                fromExtension={this.state.fromExtension}
            />);
    }

    private _getHistoryPivotItemContent(taskGroupId: string): JSX.Element {
        return (
            <TaskGroupHistory
                instanceId={this.props.instanceId}
                taskGroupId={taskGroupId}
                fromExtension={this.state.fromExtension}
            />);
    }

    private _getReferencesPivotItemContent(): JSX.Element {
        return (
            <TaskGroupReferences
                fromExtension={this.state.fromExtension}
            />);
    }

    private _setWindowTitle(title: string): void {
        let titleFormat = getPageContext().webAccessConfiguration.isHosted ? Platform_Resources.PageTitleWithContent_Hosted : Platform_Resources.PageTitleWithContent;
        document.title = stringFormat(titleFormat, title || emptyString);
    }

    private _onStoreChange = () => {
        const state = this._taskGroupEditorStore.getState();
        this._setWindowTitle(state.name);
        this.setState(state);
    }

    private _hubViewState: IHubViewState;
    private _taskGroupEditorActionCreator: TaskGroupEditorActionCreator;
    private _taskGroupEditorStore: TaskGroupEditorStore;
    private _taskGroupEditorEntry: RunningDocumentsTableEntry;
}