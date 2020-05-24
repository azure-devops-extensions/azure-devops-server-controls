///<amd-dependency path="jQueryUI/sortable"/>
import ko = require("knockout");
import Q = require("q");

import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import Menus = require("VSS/Controls/Menus");
import Context = require("VSS/Context");
import Contracts = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Events_Action = require("VSS/Events/Action");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

import Types = require("DistributedTasksCommon/TFS.Tasks.Types");
import InternalTypes = require("DistributedTasksCommon/TFS.Tasks.Types.Internal");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TaskCommonDialogs = require("DistributedTasksCommon/TFS.Tasks.Common.Dialogs");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import Adapters_Knockout = require("VSS/Adapters/Knockout");
import TaskEditor = require("DistributedTasksCommon/TFS.Tasks.TasksEditor");
import TaskEditorCommon = require("DistributedTasksCommon/TFS.Tasks.TasksEditor.Common");
var delegate = Utils_Core.delegate;


import { MarkdownRenderer } from "ContentRendering/Markdown";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export class TaskGroupGrid extends Grids.GridO<any> {
    private _dummyGridColumnFormat: string = "<div class='taskgroup-grid-dummy-focused-element-{0}' />";
    private _gridColumns: Grids.IGridColumn[];

    public _attachEvents() {
        super._attachEvents();

        this._bind(this._element, "keydown", (e?: JQueryKeyEventObject, keyCode?: number, ctrlKey?: boolean, shiftKey?: boolean, altKey?: boolean) => {
            if (!!e
                && keyCode != null
                && ctrlKey != null
                && shiftKey != null
                && altKey != null) {

                this._handleGridKeyDownEventHandler(keyCode, ctrlKey, shiftKey, altKey);
            }
        });
    }

    private getSelectedRowElementToFocus(): JQuery {
        var selectedRowIndex = this.getSelectedRowIndex();
        var elementToFocus = this.getElement().find(".taskgroup-grid-dummy-focused-element-" + selectedRowIndex);

        return elementToFocus;
    }

    // Grid brings the container into focus whenever mousedown happens either on row/gutter/header
    // This works perfectly when there is only one grid and grid owns the scroll bar
    //
    // However, when there are multiple grids hosted in one div element, div owns the scroll bar and grid scroll bar is disabled
    // upon mousedown event grid container will try to steal the focus and thus user will see jumping behavior (because the scroll bar in parent div moves)

    // Override grid focus function and redirect focus to a dummy element so that the grid won't steal the focus
    public focus(timeout?: number) {
        Utils_UI.tryFocus(this.getSelectedRowElementToFocus(), timeout);
    }

    public _onFocus(e?: JQueryEventObject): any {
        super._onFocus(e);
        if (this.getSelectedRowIndex() < 0) {
            this.setSelectedRowIndex(0);
        }
    }

    private _handleGridKeyDownEventHandler(keyCode: number, ctrlKey: boolean, shiftKey: boolean, altKey: boolean) {
        // We need to bring the whole row into view not just the dummy element
        // Hence pass row element to Utils_UI.Positioning.scrollIntoViewVertical
        var rowElement = this.getSelectedRowElementToFocus().parent();

        switch (keyCode) {
            case Utils_UI.KeyCode.PAGE_DOWN:
            case Utils_UI.KeyCode.DOWN:
            case Utils_UI.KeyCode.END:
                Utils_UI.Positioning.scrollIntoViewVertical(rowElement, Utils_UI.Positioning.VerticalScrollBehavior.Bottom);
                break;

            case Utils_UI.KeyCode.PAGE_UP:
            case Utils_UI.KeyCode.UP:
            case Utils_UI.KeyCode.HOME:
                Utils_UI.Positioning.scrollIntoViewVertical(rowElement, Utils_UI.Positioning.VerticalScrollBehavior.Top);
                break;

            default:
                break;
        }
    }

    public setTasksDataSource(taskGroupEditorViewModel: TaskGroupEditorViewModel, tasks: TaskEditor.TaskViewModel[]) {
        var disableTaskAddRemove = taskGroupEditorViewModel.disableTaskGroup();
        if (!this._gridColumns) {
            this._gridColumns = <Grids.IGridColumn[]>[
                {
                    index: 0,
                    width: 50,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class='grid-cell task-icon-cell'>" +
                            "<!-- ko if: taskDefinition -->" +
                            "<img data-bind=\"attr: { src: taskDefinition.iconUrl }, css: { disabled: disabledInGrid }\" class='task-icon' />" +
                            "<!-- /ko -->" +
                            "</div>";

                        return $(template).width(column.width);
                    }
                },
                {
                    index: 1,
                    width: 50,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class='grid-cell task-name-cell' data-bind=\"css: { disabled: disabledInGrid }\">" +
                            "<div data-bind=\"text: displayNameComputed, css: { 'required-input-message': _isInvalid() }\" class='task-name'></div>" +
                            "<!-- ko if: taskDefinition -->" +
                            "<div data-bind=\"text: getSectionName(taskDefinition.friendlyName), css: { 'required-input-message': _isInvalid() }\" class='task-instance-name'></div>" +
                            "<!-- /ko -->" +
                            "<!-- ko if: !taskDefinition -->" +
                            "<div class='task-instance-name'>" + TaskResources.TaskDeletedMessage + "</div>" +
                            "<!-- /ko -->" +
                            "<span data-bind=\"visible: newVersionToolTip, attr: {title: newVersionTitle}\" class='bowtie-icon bowtie-alert new-version-upsell'></span>" +
                            "</div>";

                        return $(template).width(column.width);
                    }
                },
                {
                    index: 2,
                    width: 0,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = $(Utils_String.format(this._dummyGridColumnFormat, dataIndex));

                        return template.width(column.width);
                    }
                },
                {
                    index: 3, // Inivisible cell for knockout binding
                    width: 0, // This should be the last cell because templates for visible cells need to be set before this
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var row = rowInfo.row[0],
                            grid = <TaskGroupGrid>this,
                            task = <TaskEditor.TaskViewModel>grid.getRowData(dataIndex);

                        if (!disableTaskAddRemove) {
                            // Add delete icon
                            $("<span role='button' tabindex='0'/>").addClass("bowtie-icon bowtie-edit-delete delete-icon task-activate")
                                .attr("aria-label", TaskResources.DeleteTaskIconLabel)
                                .appendTo(row);

                            // Add drag handler
                            $("<span />").addClass("draggable-indicator task-activate").appendTo(row);
                        }

                        // This is an invisible cell to apply knockout binding
                        ko.applyBindings(task, row);

                        // Do not return any content
                        return null;
                    }
                }
            ];
        }

        this.setDataSource(tasks, null, this._gridColumns);
    }
}

export class TaskGroupViewModel extends DistributedTaskModels.ChangeTrackerModel implements InternalTypes.ITaskGroup {

    public taskList: Types.ITaskList;

    public taskGroupPropertiesModel: DistributedTaskModels.ChangeTrackerModel;
    private _taskListViewModel: TaskEditor.TaskListViewModel;

    private _displayName: string = "";
    private _order: number = -1;

    /**
    * Display name for task group container
    */
    public displayName: KnockoutObservable<string>;

    /**
    * Order of the taskGroup in the parent list
    */
    public order: KnockoutObservable<number>;

    constructor(taskListViewModel: TaskEditor.TaskListViewModel, displayName: string, order: number, taskGroupPropertiesModel: DistributedTaskModels.ChangeTrackerModel) {
        super();

        this.displayName = ko.observable(displayName);
        this.order = ko.observable(order);
        this._taskListViewModel = taskListViewModel;
        this.taskGroupPropertiesModel = taskGroupPropertiesModel;
        this.taskList = taskListViewModel;

        this._displayName = displayName;
        this._order = order;
        
        if (!!this.taskGroupPropertiesModel) {
            var phaseProperties: any = this.taskGroupPropertiesModel;
            if (!!phaseProperties.displayName) {
                this._addDisposable(phaseProperties.displayName.subscribe((phaseName: string) => {
                    this.displayName(phaseName);
                }));
            }
        }
    }

    public getValue(): InternalTypes.ITaskGroupModel {
        return <InternalTypes.ITaskGroupModel>{
            order: this.order.peek(),
            displayName: this.displayName.peek(),
            type: this.taskList.type,
            tasks: this.taskList.getValue(),
            taskGroupPropertiesModel: this.taskGroupPropertiesModel
        };
    }

    public dispose(): void {
        if (!!this._taskListViewModel) {
            this._taskListViewModel.dispose();
        }

        if (!!this.taskGroupPropertiesModel) {
            this.taskGroupPropertiesModel.dispose();
        }

        super.dispose();
    }

    _isDirty(): boolean {
        if (!!this._taskListViewModel && this._taskListViewModel._isDirty()) {
            return true;
        }

        if (this._displayName !== this.displayName()) {
            return true;
        }

        if (this._order !== this.order()) {
            return true;
        }

        if (!!this.taskGroupPropertiesModel && this.taskGroupPropertiesModel._isDirty()) {
            return true;
        }

        return false;
    }

    _isInvalid(): boolean {

        if (!!this._taskListViewModel && this._taskListViewModel._isInvalid()) {
            return true;
        }

        if (!!this.taskGroupPropertiesModel && this.taskGroupPropertiesModel._isInvalid()) {
            return true;
        }

        return false;
    }

    _isWarning(): boolean {
        if (!!this.taskGroupPropertiesModel && this.taskGroupPropertiesModel._isWarning()) {
            return true;
        }

        return false;
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.displayName = ko.observable<string>("");
        this.order = ko.observable<number>(-1);
    }

}

export class TaskGroupsViewModel extends DistributedTaskModels.ChangeTrackerModel implements InternalTypes.ITaskGroupList {

    private _taskCollection: DistributedTaskModels.TaskDefinitionCollection;
    private _taskGroupModels: InternalTypes.ITaskGroupModel[] = [];

    public taskGroups: KnockoutObservableArray<TaskGroupViewModel>;
    //public selectedTaskGroupIndex: KnockoutObservable<number> = ko.observable(-1);

    public canBeDeletedDelegate: (allTaskGroups: InternalTypes.ITaskGroup[], taskGroupToBeDeleted: InternalTypes.ITaskGroup) => boolean;

    /**
    * Indicates whether this view model is visible or not.
    */
    public visible: KnockoutObservable<boolean>;

    /**
    * Indicates whether this view model is editable or not.
    */
    public editable: KnockoutObservable<boolean>;

    /**
     * Stores taskdelegates contributed by the owner
     */
    public taskDelegates: KnockoutObservable<Types.ITaskDelegates>;

    constructor(taskCollection: DistributedTaskModels.TaskDefinitionCollection,
        taskDelegates: KnockoutObservable<Types.ITaskDelegates>,
        editable: boolean = true,
        canBeDeletedDelegate?: (allTaskGroups: InternalTypes.ITaskGroup[], taskGroupToBeDeleted: InternalTypes.ITaskGroup) => boolean) {

        super();

        // This will provide us all available taskdefinitions
        this._taskCollection = taskCollection;
        this.editable = ko.observable(editable);
        this.visible = ko.observable(false);
        this.taskDelegates = taskDelegates;
        this.canBeDeletedDelegate = canBeDeletedDelegate;

        this._addDisposable(this.editable.subscribe((editable: boolean) => {
            this.taskGroups.peek().forEach((taskGroup) => {
                taskGroup.taskList.editable(editable);
            });
        }));
    }

    public updateTaskList(tasks: Types.ITask[]): void {
        this.update(this._createSingleTaskGroupForTasks(tasks));
    }

    public getTaskGroupViewModels(): KnockoutObservableArray<TaskGroupViewModel> {
        return this.taskGroups;
    }

    public addTaskGroup(taskGroup: InternalTypes.ITaskGroupModel): InternalTypes.ITaskGroup {
        // append the new task group at the end
        var order = this.taskGroups.peek().length;

        var tasklistViewModel = new TaskEditor.TaskListViewModel(this._taskCollection,
            this.taskDelegates,
            this.editable.peek(), /* editable */
            taskGroup.type /* Task group type*/
        );

        var taskGroupViewModel = new TaskGroupViewModel(tasklistViewModel, taskGroup.displayName, order, taskGroup.taskGroupPropertiesModel);

        this.taskGroups.push(taskGroupViewModel);

        return taskGroupViewModel;
    }

    public removeTaskGroup(taskGroup: TaskGroupViewModel): boolean {
        var canBeDeleted: boolean = !this.canBeDeletedDelegate || this.canBeDeletedDelegate(this.taskGroups.peek(), taskGroup);

        if (!canBeDeleted) {
            return canBeDeleted;
        }

        // Dispose task first
        taskGroup.dispose();

        // Remove it from the list
        this.taskGroups.remove(taskGroup);
        this._fixOrderOfTaskGroups();

        return canBeDeleted;
    }

    public moveTaskGroup(oldIndex: number, newIndex: number): void {
        var taskGroups = this.taskGroups.peek();

        // Remove task group from the list
        var taskGroup = taskGroups.splice(oldIndex, 1)[0];

        // Add to new location
        taskGroups.splice(newIndex, 0, taskGroup);

        // Assign same list
        this.taskGroups(taskGroups);
        this._fixOrderOfTaskGroups();
    }

    private _fixOrderOfTaskGroups(): void {
        this.taskGroups.peek().forEach((taskGroupViewModel: TaskGroupViewModel, indexInArray: number) => {
            taskGroupViewModel.order(indexInArray);
        });
    }

    public getValue(): InternalTypes.ITaskGroupModel[] {
        return $.map(this.taskGroups.peek(), (taskgroup: InternalTypes.ITaskGroup) => {
            return taskgroup.getValue();
        });
    }

    public getTaskList(): Types.ITask[] {
        var tasks: Types.ITask[] = [];

        this.taskGroups.peek().forEach((taskGroup: TaskGroupViewModel) => {
            if (!!taskGroup) {
                tasks.push(...taskGroup.taskList.getValue());
            }
        });

        return tasks;
    }

    public getTaskGroupByOrder(order: number) {
        return this.taskGroups.peek()[order];
    }

    public update(taskGroupModels: InternalTypes.ITaskGroupModel[]): void {
        taskGroupModels = taskGroupModels || [];

        // Dispose previous task groups first
        this._disposeTaskGroups();

        // Convert data contract to viewmodels
        var taskGroupViewModels: TaskGroupViewModel[] = ($.map(taskGroupModels, (taskGroupModel: InternalTypes.ITaskGroupModel, indexInArray: number) => {
            if (taskGroupModel.order < 0) {
                taskGroupModel.order = indexInArray;
            }

            var tasklistModel = new TaskEditor.TaskListViewModel(this._taskCollection,
                this.taskDelegates,
                this.editable.peek(), /* editable */
                taskGroupModel.type /* Task group type*/
            );

            tasklistModel.update(taskGroupModel.tasks);

            var taskGroupViewModel = new TaskGroupViewModel(tasklistModel, taskGroupModel.displayName, taskGroupModel.order, taskGroupModel.taskGroupPropertiesModel);

            return taskGroupViewModel;
        }));

        this._taskGroupModels = taskGroupModels;
        this.taskGroups(taskGroupViewModels);
    }

    public revert(): void {
        this.update(this._taskGroupModels);
    }

    _isDirty(): boolean {

        var taskGroups = this.taskGroups(),
            originalTaskGroups = this._taskGroupModels || [];

        if (taskGroups.length !== originalTaskGroups.length) {
            return true;
        }

        var index = 0;
        var dirtyTaskgroup = Utils_Array.first(this.taskGroups(), (taskGroup: TaskGroupViewModel) => {
            if (!!taskGroup) {
                var originalTaskGroup = originalTaskGroups[index];
                if (taskGroup.getValue().order !== originalTaskGroup.order) {
                    return true;
                } else {
                    if (taskGroup._isDirty()) {
                        return true;
                    }

                    index++;
                    return false;
                }
            }

            index++;
            return false;
        });

        return !!dirtyTaskgroup;
    }

    _isInvalid(): boolean {
        var invalidTaskGroup = Utils_Array.first(this.taskGroups(), (taskGroup: TaskGroupViewModel) => {
            return taskGroup._isInvalid();
        });

        return !!invalidTaskGroup;
    }

    public dispose(): void {
        this._disposeTaskGroups();
        super.dispose();
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.taskGroups = ko.observableArray<TaskGroupViewModel>([]);
    }

    private _disposeTaskGroups(): void {
        this._taskGroupModels = [];
        $.each(this.taskGroups.peek(), (index: number, taskGroup: TaskEditor.TaskListViewModel) => {
            taskGroup.dispose();
        });

        this.taskGroups([]);
    }

    private _createSingleTaskGroupForTasks(tasks: Types.ITask[]): InternalTypes.ITaskGroupModel[] {

        var taskGroupModel = <InternalTypes.ITaskGroupModel>{
            displayName: TaskResources.RunOnAgentPhaseName,
            order: 0,
            type: Types.TaskGroupType.RunOnAny,
            tasks: tasks,
            taskGroupPropertiesModel: null
        };

        return [taskGroupModel];
    }
}

export class TaskGroupEditorViewModel extends TaskEditorCommon.TaskEditorCommonViewModel {

    public taskGroup: TaskGroupViewModel;
    public showTasks: KnockoutObservable<boolean> = ko.observable(true);
    public selectedTask: KnockoutObservable<TaskEditor.TaskViewModel> = ko.observable(null);
    public showTaskGroupProperties: KnockoutObservable<boolean> = ko.observable(false);
    public disableTaskGroup: KnockoutObservable<boolean> = ko.observable(false);
    public showHeader: KnockoutObservable<boolean> = ko.observable(false);
    public headerPanelCss: KnockoutObservable<string> = ko.observable("task-group-header");
    public borderCss: KnockoutObservable<string> = ko.observable("task-group-border-hidden");
    public headerTextCss: KnockoutObservable<string> = ko.observable("task-group-header-label");
    public iconCss: KnockoutObservable<string> = ko.observable("task-group-icon-selected");
    public headerIconCss: string;
    public headerTooltip: string;
    public deletePhaseIconLabel: string = TaskResources.DeletePhaseIconLabel;
    public deletePhaseIconTooltip: KnockoutComputed<string>;
    public phaseAddTaskButtonTooltip: KnockoutComputed<string>;
    public showAddTaskLabel: KnockoutComputed<boolean>;
    public deploymentGroupDemandsWarningTooltip: string = TaskResources.DeploymentGroupDemandsWarningTooltip;
    public addTaskDialogCloseCallback: () => void = null;
    public deselectTaskGroupDelegate: () => void;
    public selectGridIndexDelegate: (gridIndex: number) => void;

    private static _runOnServerTaskGroupIconClass: string = "icon-run-on-server-phase bowtie-icon bowtie-server";
    private static _runOnAgentTaskGroupIconClass: string = "icon-run-on-agent-phase bowtie-icon bowtie-server-remote";
    private static _runOnMachineGroupTaskGroupIconClass: string = "icon-run-on-machinegroup-phase bowtie-icon bowtie-environment";

    constructor(taskGroup: TaskGroupViewModel, shouldShowHeader: boolean, options: Types.ITasksEditorOptions) {
        super(options);

        this.taskGroup = taskGroup;

        if (options) {

            if (options.disableAddTasks) {
                this.disableTaskGroup(true);
            }
        }

        if (shouldShowHeader) {
            this.showHeader(true);
        }

        if (taskGroup.taskList.type === Types.TaskGroupType.RunOnAgent) {
            this.headerIconCss = TaskGroupEditorViewModel._runOnAgentTaskGroupIconClass;
            this.headerTooltip = TaskResources.RunOnAgentPhaseHeaderTooltip;
        } else if (taskGroup.taskList.type === Types.TaskGroupType.RunOnServer) {
            this.headerIconCss = TaskGroupEditorViewModel._runOnServerTaskGroupIconClass;
            this.headerTooltip = TaskResources.RunOnServerPhaseHeaderTooltip;
        } else if (taskGroup.taskList.type === Types.TaskGroupType.RunOnMachineGroup) {
            this.headerIconCss = TaskGroupEditorViewModel._runOnMachineGroupTaskGroupIconClass;
            this.headerTooltip = TaskResources.RunOnMachineGroupPhaseHeaderTooltip;
        }
        else {
            this.headerIconCss = TaskGroupEditorViewModel._runOnAgentTaskGroupIconClass;
            this.headerTooltip = TaskResources.RunOnAgentPhaseHeaderTooltip;
        }

        this.deletePhaseIconTooltip = ko.computed(() => { return Utils_String.localeFormat(TaskResources.DeletePhaseIconTooltip, this.taskGroup.displayName()); });
        this.phaseAddTaskButtonTooltip = ko.computed(() => { return Utils_String.localeFormat(TaskResources.PhaseAddTaskButtonTooltip, this.taskGroup.displayName()); });
        this.showAddTaskLabel = ko.computed(() => { return (taskGroup.taskList.tasks().length === 0) });
    }

    public setHeaderHighlightAndBorder(): void {
        this.headerPanelCss("task-group-header-selected");
        this.headerTextCss("task-group-header-label-selected");
        this.iconCss("task-group-icon-selected");
        this.borderCss("task-group-border-selected");
    }

    public removeHeaderHighlightAndBorder(): void {
        this.headerPanelCss("task-group-header");
        this.headerTextCss("task-group-header-label");
        this.iconCss("task-group-icon-unselected");
        this.borderCss("task-group-border-hidden");
    }

    public getDefaultTaskCategoryName(): string {
        return super.getDefaultTaskCategoryName();
    }

    public onAddTasksKeyDown(viewModel: TaskGroupEditorViewModel, event: JQueryEventObject): boolean {
        return TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(event);
    }

    public dispose(): void {
        super.dispose();
    }
}

var TASKS_GRID_DRAGDROP_SCOPE = "TasksList.Tasks";

export class TaskGroupEditorControl extends Adapters_Knockout.TemplateControl<TaskGroupEditorViewModel> {
    private _grid: TaskGroupGrid;
    private _gridSelectedIndex: number;
    private _gridRowMover: TaskUtils.GridRowMover;

    private _deleteOnClickHandler: JQueryEventHandler;
    private _deleteOnKeyDownHandler: JQueryEventHandler;
    private _selectionChangeHandler: JQueryEventHandler;
    private _inputRequiredHandler: JQueryEventHandler;
    private _subscriptions: IDisposable[] = [];

    private static _addTaskButtonSelector = ".task-button.add-tasks-button";

    private _webContext: Contracts.WebContext;
    private taskGroupDragDropScope = Utils_String.generateUID();

    constructor(viewModel: TaskGroupEditorViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        // Active empty tasks grid. It will be populated later
        this._grid = <TaskGroupGrid>Controls.Enhancement.enhance(TaskGroupGrid, this.getElement().find(".taskgroup-grid"), this._getTasksGridOptions());

        if (!this.getViewModel().disableTaskGroup()) {

            // Grid row mover will handle drag & drop as well as keyboard support for move
            this._gridRowMover = new TaskUtils.GridRowMover(
                this._grid,
                this.taskGroupDragDropScope,
                (rowData) => {
                    return <string>rowData.taskDefinition.friendlyName;
                },
                (oldIndex: number, newIndex: number) => {
                    // Keep selected index
                    this._gridSelectedIndex = newIndex;

                    // Perform move
                    this.getViewModel().taskGroup.taskList.moveTask(oldIndex, newIndex);
                });
        }

        // Attach necessary UI and viewmodels events
        this._attachEvents();

        this._webContext = Context.getDefaultWebContext();
    }

    public selectGridIndex(gridIndex: number): void {
        this._grid.setSelectedRowIndex(gridIndex);
    }

    public setHeaderHighlightAndBorder(): void {
        this.getViewModel().setHeaderHighlightAndBorder();
    }

    public removeHeaderHighlightAndBorder(): void {
        this.getViewModel().removeHeaderHighlightAndBorder();
    }

    public onTaskGroupSelection(): void {
        this.focusTaskList();
    }

    public onTaskGroupDeselection(): void {
        this.getViewModel().removeHeaderHighlightAndBorder();
        this.blurTaskList();
        this._grid.setSelectedRowIndex(-1);
    }

    public focusTaskList(): void {
        this._grid._onFocus();
    }

    public blurTaskList(): void {
        this._grid._onBlur();
    }

    public layout(): void {
        if (!!this._grid) {
            this._grid.layout();
        }
    }

    public addTaskDialogCloseHandler(): void {
        let viewModel = this.getViewModel();
        let $elemToFocus = null;
        if (viewModel.taskGroup.taskList
            && viewModel.taskGroup.taskList.tasks
            && viewModel.taskGroup.taskList.tasks.peek().length > 0) {
            $elemToFocus = this.getElement().find(".grid-canvas.ui-draggable");
        }
        else if (viewModel.showAddTaskLabel.peek()) {
            $elemToFocus = this.getElement().find(TaskGroupEditorControl._addTaskButtonSelector);
        }

        if (!!$elemToFocus) {
            // When the add task dialog is closed, bring focus to the grid canvas
            // Timeout for allowing dialog to close
            setTimeout(() => {
                $elemToFocus.focus()
            }, 100);
        }
    }

    private _attachEvents(): void {
        var viewModel = this.getViewModel();

        if (!viewModel.disableTaskGroup()) {

            // Add delete task handler
            this._grid.getElement().on("click", ".delete-icon", this._deleteOnClickHandler = (evt: JQueryEventObject) => {
                if (viewModel.disableTaskGroup.peek()) {
                    return false;
                }

                // Find the row and task to delete
                var row = $(evt.target).closest("div.grid-row")[0],
                    task = <TaskEditor.TaskViewModel>ko.dataFor(row);

                // Remove the task
                viewModel.taskGroup.taskList.removeTask(task);

                if (this.getViewModel().showHeader() && this.getViewModel().showAddTaskLabel && this.getViewModel().showAddTaskLabel()) {
                    this.getElement().find(TaskGroupEditorControl._addTaskButtonSelector).focus();
                }

                // Cancel selecting row
                return false;
            });

            this._grid.getElement().on("keydown", ".delete-icon", this._deleteOnKeyDownHandler = (event: JQueryEventObject) => {
                switch (event.keyCode) {
                    case Utils_UI.KeyCode.ENTER:
                        return TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(event);

                    case Utils_UI.KeyCode.RIGHT:
                        this._focusTaskEditor();
                        return false;

                    default:
                        return true;
                }
            });

            this._grid._onRightKey = this._focusTaskEditor;

            this._grid._onEnterKey = (event?: JQueryEventObject, bounds?: any) => {
                return TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(event);
            };
        }

        // Add selection change handler
        this.getElement().on(TaskGroupGrid.EVENT_SELECTED_INDEX_CHANGED, this._selectionChangeHandler = (evt: JQueryEventObject, rowIndex?: number, dataIndex?: number) => {
            this._gridSelectedIndex = dataIndex;
            var task = viewModel.taskGroup.taskList.tasks()[dataIndex];
            if (task !== this.getViewModel().selectedTask()) {
                if (task) {
                    this.getViewModel().selectedTask(task);
                    if (task.helpMarkDown().length == 0) {
                        // Set help text
                        var taskDefinition = task.taskDefinition;
                        if (taskDefinition && taskDefinition.helpMarkDown) {
                            if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
                                let renderer = new MarkdownRenderer({ html: true });
                                task.helpMarkDown(renderer.renderHtml(taskDefinition.helpMarkDown));
                            }
                            else {
                                TaskUtils.PresentationUtils.marked(taskDefinition.helpMarkDown).then((markedString) => {
                                    task.helpMarkDown(markedString);
                                });
                            }
                        }
                    }
                }
                else {
                    // Possibly empty template is selected
                    this.getViewModel().selectedTask(null);
                }
            }
        });

        this._initTaskGroup(viewModel.taskGroup);

        this.subscribe(viewModel.onTabSelected, () => {
            this._grid.layout();
        });
    }

    private _focusTaskEditor(event?: JQueryEventObject): void {
        var taskEditor = $("div.input-container .taskeditor-header");
        var focusable = taskEditor.find(":focusable");

        focusable.first().focus();
    }

    private _initTaskGroup(taskGroup: TaskGroupViewModel) {
        var viewModel = this.getViewModel();

        // Dispose existing subscription first
        this._disposeSubscriptions();

        // This is a flag to select first item initially
        this._gridSelectedIndex = -1;

        if (taskGroup) {
            this._subscriptions.push(this.subscribe(taskGroup.taskList.tasks, (newTasks: TaskEditor.TaskViewModel[]) => {
                // Update the grid with the tasks
                this._updateGridSource(newTasks);
            }));

            this._subscriptions.push(this.subscribe(taskGroup.taskList.visible, (visible: boolean) => {
                this._updateGridSource(taskGroup.taskList.tasks.peek());
            }));

            this._updateGridSource(taskGroup.taskList.tasks.peek());

            this._subscriptions.push(this.subscribe(taskGroup.taskList.editable, (editable: boolean) => {
                viewModel.disableTaskGroup(editable && viewModel.disableTaskGroup.peek());
            }));
        }

        viewModel.disableTaskGroup(!taskGroup || viewModel.disableTaskGroup.peek());
    }

    private _detachEvents(): void {
        // Dispose task subscription if applicable
        this._disposeSubscriptions();

        // Unbind delete task click
        this._grid.getElement().off("click", ".delete-icon", this._deleteOnClickHandler);
        this._deleteOnClickHandler = null;

        // Unbind delete keydown
        this._grid.getElement().off("keydown", ".delete-icon", this._deleteOnKeyDownHandler);
        this._deleteOnKeyDownHandler = null;

        // Unbind selection change handler
        this.getElement().off(TaskGroupGrid.EVENT_SELECTED_INDEX_CHANGED, this._selectionChangeHandler);
        this._selectionChangeHandler = null;

        //unbind click event on container header
        this.getElement().off("click");
    }

    dispose(): void {
        this._detachEvents();

        // Dispose grid and gridRowMover
        var gridToDispose = this._grid;
        var gridRowMoverToDispose = this._gridRowMover;

        this._grid = null;
        this._gridRowMover = null;

        // grid supports asyncInit functionality which attaches/processes events 10 ms later when asyncInit is set to true.
        // this prevents the controls being displayed late when there are multiple rows to render.
        // If we call grid initialize and dispose very quickly, we may see some null ref exceptions 
        // since the grid might have been disposed even before asyncInit starts processing events.

        // Hence delay grid dispose by few milli seconds.
        Utils_Core.delay(this, 15, function () {
            gridToDispose.dispose();

            // Dispose grid row mover
            if (!!gridRowMoverToDispose) {
                gridRowMoverToDispose.dispose();
            }
        });

        super.dispose();
    }

    private _disposeSubscriptions(): void {
        this._subscriptions.forEach((value: IDisposable) => {
            value.dispose();
        });
    }

    private _getTasksGridOptions(): Grids.IGridOptions {
        // Initial options for the grid. It will be populated as definition changes.
        var options = <Grids.IGridOptions>{
            source: [],
            columns: [],
            header: false,
            sharedMeasurements: false,
            lastCellFillsRemainingContent: true,
            cssClass: "taskeditor-tasks-grid"
        };

        // Add context menu. Keeping this as a separate section for readability.
        options = $.extend({
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: (contextInfo) => { return this._getContextMenuItems(contextInfo); },
                updateCommandStates: (contextInfo) => { this._updateCommandStates(contextInfo); }
            },
        }, options);

        return options;
    }

    protected _getContextMenuItems(contextInfo: any): any {
        // TODO(rahudha): refactor commands as first class objects when number of commands changes here.
        var menuItems = [
            {
                id: TaskEditor.TasksMenuCommands.EnableAll,
                text: TaskResources.Tasks_MenuEnableText,
                icon: "icon-tick",
                action: (contextInfo) => {
                    this._enableSelectedTasks(true);
                },
                "arguments": contextInfo
            },
            {
                id: TaskEditor.TasksMenuCommands.DisableAll,
                text: TaskResources.Tasks_MenuDisableText,
                icon: "icon-close",
                action: (contextInfo) => {
                    this._enableSelectedTasks(false);
                },
                "arguments": contextInfo
            }];

        if (!!contextInfo.item.taskDefinition && this.getViewModel().isMetaTaskSupported() && !Utils_String.equals(contextInfo.item.taskDefinition.id, InternalTypes.manualInterventionTaskId, true)) {
            menuItems.push({
                id: TaskEditor.TasksMenuCommands.CreateMetaTask,
                text: TaskResources.Tasks_MenuCreateMetaTask,
                icon: null,
                action: (contextInfo) => {
                    this._createMetaTask(contextInfo);
                },
                "arguments": contextInfo
            });

            menuItems.push({
                id: TaskEditor.TasksMenuCommands.ManageMetaTask,
                text: TaskResources.Tasks_MenuManageMetaTask,
                icon: null,
                action: (contextInfo) => {
                    this._manageMetaTask(contextInfo);
                },
                "arguments": contextInfo
            });
        }

        return menuItems;
    }

    private _enableSelectedTasks(status: boolean): void {
        this._grid.getSelectedDataIndices().forEach((index: number) => {
            var vm: TaskEditor.TaskViewModel = <TaskEditor.TaskViewModel>this._grid.getRowData(index);
            if (vm.editable.peek()) {
                vm.enabled(status);
            }
        });
    }

    private _manageMetaTask(contextInfo: any): void {

        if (contextInfo && contextInfo.item) {
            var metTaskHubContributionId: string = "ms.vss-releaseManagement-web.hub-metatask";
            var metaTaskHubRoute: string = "_taskgroups";

            var vm: TaskEditor.TaskViewModel = contextInfo.item;

            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: TaskUtils.PresentationUtils.getUrlForExtension(metTaskHubContributionId, "properties", { taskGroupId: vm.taskDefinition.id }, metaTaskHubRoute)
            });
        }
    }

    private _createMetaTask(contextInfo: any): void {
        var tasks: DistributedTaskContracts.TaskGroupStep[] = [];
        var addedVariables: string[] = [];
        var metaTaskInputs: DistributedTaskContracts.TaskInputDefinition[] = [];
        var dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[] = [];
        var groups: DistributedTaskContracts.TaskGroupDefinition[] = [];
        var runsOn: string[];
        var invalidTaskDefinition: DistributedTaskContracts.TaskDefinition;
        var invalidDataIndex = Utils_Array.first(this._grid.getSelectedDataIndices(), ((index: number) => {
            var vm: TaskEditor.TaskViewModel = <TaskEditor.TaskViewModel>this._grid.getRowData(index);
            var task: Types.ITask = vm.getValue();
            var currentDataSourceBindings: ServiceEndpointContracts.DataSourceBinding[] = [];
            var taskDefinition: DistributedTaskContracts.TaskDefinition = vm.taskDefinition;

            // runsOn for taskGroup: intersect child tasks runsOn
            if (!!runsOn) {
                runsOn = Utils_Array.intersect(runsOn, taskDefinition.runsOn, Utils_String.localeIgnoreCaseComparer);
            } else {
                runsOn = taskDefinition.runsOn;
            }
            if (runsOn.length < 1) {
                invalidTaskDefinition = taskDefinition;
                return true;
            }

            //If definition contains source bindings
            if (taskDefinition.dataSourceBindings) {
                currentDataSourceBindings = TaskUtils.DataSourceBindingUtils.clone(taskDefinition.dataSourceBindings);
            }

            var taskGroupDefinition: DistributedTaskContracts.TaskGroupDefinition = {
                displayName: task.displayName,
                isExpanded: true,
                name: task.displayName,
                tags: [],
                visibleRule: ""
            };

            if (task.inputs) {
                for (var inputName in task.inputs) {
                    if (task.inputs.hasOwnProperty(inputName)) {
                        var value: string = task.inputs[inputName];

                        var sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition = Utils_Array.first(taskDefinition.inputs, (inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
                            return inputDefinition.name === inputName;
                        });

                        var extractedVariables: DistributedTaskContracts.TaskInputDefinition[] = [];
                        let inputViewModel = vm.getInputViewModel(inputName);
                        if (!inputViewModel || inputViewModel.isVisible()) {
                            extractedVariables = this._extractNonSystemVariables(inputName, value, sourceInputDefinition);
                        }

                        extractedVariables.forEach((variable: DistributedTaskContracts.TaskInputDefinition) => {
                            if (!Utils_Array.contains(addedVariables, variable.name)) {
                                var newDefaultValue: string = TaskGroupListEditorViewModel.getVariableDefaultValue(variable.name, this.getViewModel().getVariableProvider());
                                if (newDefaultValue != null && newDefaultValue !== "") {
                                    variable.defaultValue = newDefaultValue;
                                }

                                metaTaskInputs.push(variable);
                                addedVariables.push(variable.name);
                            }

                            //Normalize data type
                            TaskUtils.VariableExtractor.normalizeVariableTypeInfo(metaTaskInputs, variable);
                        });

                        //Update current bindings with new name
                        if (extractedVariables.length === 1) {

                            var newlyAddedInput: DistributedTaskContracts.TaskInputDefinition = Utils_Array.first(metaTaskInputs, (serachVariable: DistributedTaskContracts.TaskInputDefinition) => {
                                return serachVariable.name === extractedVariables[0].name;
                            });

                            TaskUtils.DataSourceBindingUtils.updateVariables(currentDataSourceBindings, sourceInputDefinition, newlyAddedInput);
                        }

                        dataSourceBindings = TaskUtils.DataSourceBindingUtils.merge(dataSourceBindings, currentDataSourceBindings);
                    }
                }
            }

            tasks.push(<DistributedTaskContracts.TaskGroupStep>vm.getValue());
            groups.push(taskGroupDefinition);
            return false;
        }));

        // alert user if unable to get runsOn value for taskGroup
        if (runsOn.length < 1 && !!invalidTaskDefinition) {
            alert(Utils_String.format(TaskResources.Task_UnableToCreateTaskGroupMessage, invalidTaskDefinition.name, invalidTaskDefinition.runsOn.join()));

            return;
        }

        this._showCreateMetaTaskDialog(metaTaskInputs, tasks, dataSourceBindings, groups, runsOn);
    }

    private _updateDataSourceBindingVariables(): void {

    }

    private _showCreateMetaTaskDialog(
        metaTaskInputDefinitions: DistributedTaskContracts.TaskInputDefinition[],
        tasks: DistributedTaskContracts.TaskGroupStep[],
        dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[],
        groups: DistributedTaskContracts.TaskGroupDefinition[],
        runsOn: string[]) {

        var viewModel: TaskCommonDialogs.CreateMetaTaskDialogViewModel = new TaskCommonDialogs.CreateMetaTaskDialogViewModel(metaTaskInputDefinitions,
            delegate(this, this._onCreateMetaTaskOkCallBack), tasks, dataSourceBindings, groups, runsOn);

        viewModel.selectedCategory(this.getViewModel().getDefaultTaskCategoryName());

        Dialogs.show(TaskCommonDialogs.CreateMetaTaskDialog, viewModel);
    }

    private _onCreateMetaTaskOkCallBack(metaTaskDefinition: DistributedTaskContracts.TaskGroup): IPromise<void> {
        return this.getViewModel().createMetaTask(metaTaskDefinition).then((savedMetaTaskDefinition: DistributedTaskContracts.TaskGroup) => {
            var taskGroup: TaskGroupViewModel = this.getViewModel().taskGroup;
            var firstIndex: number = null; this._grid.getSelectedDataIndex();

            var tasksToRemove: TaskEditor.TaskViewModel[] = [];

            this._grid.getSelectedDataIndices().forEach((index: number) => {
                if (firstIndex == null) {
                    firstIndex = index;
                }
                var vm: TaskEditor.TaskViewModel = <TaskEditor.TaskViewModel>this._grid.getRowData(index);
                tasksToRemove.push(vm);
            });

            tasksToRemove.forEach((vm: TaskEditor.TaskViewModel) => {
                taskGroup.taskList.removeTask(vm);
            });

            TaskCommonDialogs.TaskDefinitionCache.getTaskDefinitionCache().getCurrentTaskDefinitions().push(savedMetaTaskDefinition);

            taskGroup.taskList.addTask(savedMetaTaskDefinition);
            var lastIndex: number = taskGroup.taskList.getValue().length - 1;
            if (firstIndex !== lastIndex) {
                taskGroup.taskList.moveTask(lastIndex, firstIndex);
                this._grid.setSelectedRowIndex(firstIndex);
            }
        });
    }

    private _extractNonSystemVariables(key: string, value: string, sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition): DistributedTaskContracts.TaskInputDefinition[] {
        return TaskUtils.VariableExtractor.extractVariables(key, value, sourceInputDefinition, (variableName: string) => {
            return !this._isSystemVariable(variableName);
        });
    }

    private _isSystemVariable(variable: string): boolean {
        return this.getViewModel().isSystemVariable(variable);
    }

    private _updateCommandStates(menu: any): void {
        var countEnabled: number = 0;
        var countUnEditable: number = 0;
        var isInvalidTaskSelected: boolean = false;
        var selectedDataIndices: number[] = this._grid.getSelectedDataIndices();
        var metaTaskSelected: boolean = false;

        selectedDataIndices.forEach((index: number) => {
            var vm: TaskEditor.TaskViewModel = <TaskEditor.TaskViewModel>this._grid.getRowData(index);
            if (!vm.editable.peek()) {
                countUnEditable++;
            }
            else if (vm.enabled()) {
                countEnabled++;
            }

            if (vm._isInvalid()) {
                isInvalidTaskSelected = true;
            }

            if (vm.taskDefinition && (vm.taskDefinition.definitionType === Types.DefinitionType.metaTask)) {
                metaTaskSelected = true;
            }
        });

        var selectedDataIndicesCount: number = selectedDataIndices.length;

        var commandStates = [
            {
                id: TaskEditor.TasksMenuCommands.EnableAll,
                disabled: countEnabled === (selectedDataIndicesCount - countUnEditable)
            },
            {
                id: TaskEditor.TasksMenuCommands.DisableAll,
                disabled: countEnabled === 0
            }
        ];

        if (this.getViewModel().isMetaTaskSupported()) {
            commandStates.push({
                id: TaskEditor.TasksMenuCommands.CreateMetaTask,
                disabled: selectedDataIndicesCount <= 0 || isInvalidTaskSelected
            });

            commandStates.push({
                id: TaskEditor.TasksMenuCommands.ManageMetaTask,
                disabled: selectedDataIndicesCount !== 1 || !metaTaskSelected
            });
        }

        menu.updateCommandStates(commandStates);
    }

    private _updateGridSource(tasks: TaskEditor.TaskViewModel[]): void {
        if (!this.getViewModel().taskGroup.taskList.visible()) {
            // No need to render grid if container tab is invisible
            return;
        }

        let newTasksCount = tasks.length - this._grid._count;

        // This will hide/show according to the task count
        this.getViewModel().showTasks(tasks.length > 0);

        // Update the grid with new source
        this._grid.setTasksDataSource(this.getViewModel(), tasks);

        // Grid selection
        if (newTasksCount === 1 && tasks.length > 1) {
            // Let us assume that if the number of tasks is more than one, and the update in the list is 
            // the addition of a task, then a new task has been added from the dialog.
            //
            // In this case, we will set the latest one as our selected item, as a keyboard user would
            // otherwise get confused
            //
            // In case the first task is being added, the below scenarios will take care of it. Not keeping this
            // check is causing issues with selection
            this._grid.setSelectedRowIndex(tasks.length - 1);
            this.getViewModel().selectedTask(tasks[tasks.length - 1]);
        }
        else if (tasks.length > 0) {
            if (this._gridSelectedIndex < 0) {
                // Initially select first task
                this._grid.setSelectedDataIndex(0);
                this.getViewModel().selectedTask(tasks[0]);
            } else if (this._gridSelectedIndex < tasks.length) {
                // For successive operations like add/remove, try keeping previous index
                this._grid.setSelectedDataIndex(this._gridSelectedIndex);
                this.getViewModel().selectedTask(tasks[this._gridSelectedIndex]);
            } else {
                // Index not available, select last element
                this._grid.setSelectedDataIndex(tasks.length - 1);
                this.getViewModel().selectedTask(tasks[tasks.length - 1]);
            }
        }

        // calculate height of task rows
        var height = tasks.length > 0 ? (this._grid._rowHeight * tasks.length) + 10 : 0;
        this.getElement().find(".taskgroup-grid").height(height);
    }
}

export class TaskGroupListEditorViewModel extends TaskEditorCommon.TaskEditorCommonViewModel {

    public taskGroupListOwner: KnockoutObservable<InternalTypes.ITaskGroupListOwner>;
    public showTasks: KnockoutObservable<boolean>;
    public taskGroups: TaskGroupEditorViewModel[] = [];
    public selectedTaskGroup: KnockoutObservable<TaskGroupEditorViewModel>;
    public disableAddTasks: KnockoutObservable<boolean>;
    public showTaskContainers: boolean;
    public addTasksLabel: KnockoutObservable<string>;
    public selectedTask: KnockoutComputed<TaskEditor.TaskViewModel>;
    public isTaskGroupHeaderSelected: KnockoutComputed<boolean>;
    public addTasksRegionLabel: string = TaskResources.AddTasksRegionLabel;
    public taskEditorInputContainerLabel: string = TaskResources.TaskEditorInputContainerLabel;
    public addPhaseLabel: string = TaskResources.AddPhaseLabel;

    private _taskVisibilityFilter: string[];
    private _getDefaultTaskGroupPropertiesModelDelegate: (taskGroupType: Types.TaskGroupType) => DistributedTaskModels.ChangeTrackerModel;
    private _isTaskGroupHeaderSelectedSubscription: KnockoutSubscription<boolean>;

    constructor(taskGroupListOwner: KnockoutObservable<InternalTypes.ITaskGroupListOwner>,
        getDefaultTaskGroupPropertiesModelDelegate: (taskGroupType: Types.TaskGroupType) => DistributedTaskModels.ChangeTrackerModel,
        showTaskContainers: boolean,
        options: Types.ITasksEditorOptions) {

        super(options);

        TaskEditorCommon.TaskEditorCommonViewModel.renderTaskInputTemplate();
        TaskUtils.HtmlHelper.renderTemplateIfNeeded("taskeditor_view", TaskGroupListEditorViewModel._taskEditorViewHtmlTemplate);
        TaskUtils.HtmlHelper.renderTemplateIfNeeded("taskGroup_view", TaskGroupListEditorViewModel._taskGroupEditorViewHtmlTemplate);

        this.showTasks = ko.observable(false);
        this.selectedTaskGroup = ko.observable(null);
        this.disableAddTasks = ko.observable(false);
        this.showTaskContainers = showTaskContainers;
        this.addTasksLabel = ko.observable("");
        this.selectedTask = ko.computed((): TaskEditor.TaskViewModel => {
            if (!!this.selectedTaskGroup() && !!this.selectedTaskGroup().selectedTask()) {
                return this.selectedTaskGroup().selectedTask();
            }

            return null;
        });

        this.isTaskGroupHeaderSelected = ko.computed((): boolean => {
            if (!!this.selectedTaskGroup() && this.selectedTaskGroup().showTaskGroupProperties()) {
                return true;
            }

            return false;
        });

        this._isTaskGroupHeaderSelectedSubscription = this.isTaskGroupHeaderSelected.subscribe((isSelected: boolean)=> {
            if (!!this.selectedTaskGroup()) {
                if(!!isSelected) {
                    this.selectedTaskGroup().setHeaderHighlightAndBorder();
                }
                else {
                    this.selectedTaskGroup().removeHeaderHighlightAndBorder();
                }
            }
        });

        this.taskGroupListOwner = taskGroupListOwner;
        this._getDefaultTaskGroupPropertiesModelDelegate = getDefaultTaskGroupPropertiesModelDelegate;

        this._taskVisibilityFilter = options.tasksVisibilityFilter || [];

        if (options) {
            if (options.addTasksLabel) {
                this.addTasksLabel(options.addTasksLabel);
            }

            if (options.disableAddTasks) {
                this.disableAddTasks(true);
            }
        }
    }

    public onAddTasksKeyDown(viewModel: TaskGroupListEditorViewModel, event: JQueryEventObject): boolean {
        return TaskUtils.AccessibilityHelper.triggerClickOnEnterOrSpaceKeyPress(event);
    }

    public addTaskGroup(taskGroupType: Types.TaskGroupType): InternalTypes.ITaskGroup {
        var taskGroupsViewModel: InternalTypes.ITaskGroupList = this.taskGroupListOwner.peek().taskGroupList;

        var newTaskGroupModel: InternalTypes.ITaskGroupModel = <InternalTypes.ITaskGroupModel>{
            order: -1,
            displayName: this._getTaskGroupDisplayName(taskGroupType),
            type: taskGroupType,
            tasks: [],
            taskGroupPropertiesModel: $.isFunction(this._getDefaultTaskGroupPropertiesModelDelegate) ? this._getDefaultTaskGroupPropertiesModelDelegate(taskGroupType) : null
        };

        var addedTaskGroup: InternalTypes.ITaskGroup = taskGroupsViewModel.addTaskGroup(newTaskGroupModel);

        // mark this new to-be-added task group as selected so that any more tasks get added to this group only when user add multiple tasks from same add-task dialog
        this.setAutoSelectedTaskGroupIndex(addedTaskGroup.getValue().order);

        return addedTaskGroup;
    }

    public removeTaskGroup(taskGroup: InternalTypes.ITaskGroup) {
        var taskGroupsViewModel: InternalTypes.ITaskGroupList = this.taskGroupListOwner.peek().taskGroupList;

        // find order of next task group to be selected
        var removedTaskOrder = taskGroup.getValue().order;
        var newOrder = (removedTaskOrder === taskGroupsViewModel.taskGroups.peek().length - 1) ? 0 : removedTaskOrder;

        var isDeleted: boolean = taskGroupsViewModel.removeTaskGroup(taskGroup);

        if (isDeleted) {
            // set next task group to be auto-selected once task groups are re-painted
            this.setAutoSelectedTaskGroupIndex(newOrder);
        }
    }

    public setSelectedTaskGroup(taskGroupEditorViewModel: TaskGroupEditorViewModel) {
        if (!taskGroupEditorViewModel) {
            this.selectedTaskGroup(null);
        } else {
            this.selectedTaskGroup(taskGroupEditorViewModel);
        }
    }

    public getAutoSelectedTaskGroupIndex(): number {
        if (!!this.selectedTaskGroup && !!this.selectedTaskGroup.peek()) {
            return this.selectedTaskGroup.peek().taskGroup.getValue().order;
        }

        return 0;
    }

    public setAutoSelectedTaskGroupIndex(order: number) {
        var selectedTaskGroup = Utils_Array.first(this.taskGroups, (taskGroup: TaskGroupEditorViewModel) => {
            return taskGroup.taskGroup.getValue().order === order;
        });

        this.setSelectedTaskGroup(selectedTaskGroup);
        this._autoSelectTask();
    }

    public dispose(): void {
        if (this.taskGroupListOwner()) {
            this.taskGroupListOwner().taskGroupList.dispose();
        }

        this.selectedTask.dispose();
        this.isTaskGroupHeaderSelected.dispose();
        super.dispose();
    }

    public launchDefaultAddTasksDialog() {
        if (!!this.selectedTaskGroup && !!this.selectedTaskGroup.peek()) {
            this._launchAddTasksDialog(this.selectedTaskGroup.peek().taskGroup, this.selectedTaskGroup.peek().addTaskDialogCloseCallback);
        }
        else {
            this.launchAddTasksDialog(Types.TaskGroupType.RunOnAgent);
        }
    }

    public launchAddTasksDialog(taskGroupType: Types.TaskGroupType) {
        var taskGroup: InternalTypes.ITaskGroup = this.addTaskGroup(taskGroupType);

        this._launchAddTasksDialog(taskGroup, this.selectedTaskGroup.peek().addTaskDialogCloseCallback);
    }

    private _autoSelectTask() {
        if (!!this.selectedTaskGroup()) {
            this.selectedTaskGroup().selectGridIndexDelegate(0);
        }
    }

    private _launchAddTasksDialog(taskGroup: InternalTypes.ITaskGroup, okCallback: () => void) {

        var dialogModel = new TaskCommonDialogs.AddTasksDialogModel(taskGroup,
            this.getDefaultTaskCategoryName(),
            this._taskVisibilityFilter,
            okCallback,
            this._metaTaskManager
        );

        Dialogs.show(TaskCommonDialogs.AddTasksDialog, dialogModel);
    }

    private _getTaskGroupDisplayName(taskGroupType: Types.TaskGroupType): string {
        if (taskGroupType === Types.TaskGroupType.RunOnAgent) {
            return TaskResources.RunOnAgentPhaseName;
        }
        else if (taskGroupType === Types.TaskGroupType.RunOnServer) {
            return TaskResources.RunOnServerPhaseName;
        }
        else if (taskGroupType === Types.TaskGroupType.RunOnMachineGroup) {
            return TaskResources.RunOnMachineGroupPhaseName;
        }
        else {
            // handle here when more phase types are added
            return TaskResources.RunOnAgentPhaseName;
        }
    }

    private static _taskGroupEditorViewHtmlTemplate = `
                        <div data-bind='css: borderCss'>
                            <!-- ko if: showHeader -->
                            <div data-bind='css: headerPanelCss'>
                                <div data-bind="showRichContentTooltip: { text: headerTooltip, showTooltipIfOverflowOnly: false }">
                                    <div data-bind="css: iconCss">
                                        <span class="icon task-group-header-icon" data-bind="css: headerIconCss"></span>
                                    </div>
                                    <div data-bind='css: headerTextCss'>
                                            <span class="task-group-header-link-text">
                                                <a tabindex='0' role='button' class= 'task-group-header-link' data-bind="text: $data.taskGroup.displayName, showRichContentTooltip: { text:  $data.taskGroup.displayName, showTooltipIfOverflowOnly: true }, css: { 'required-input-message': $data.taskGroup._isInvalid(), event: { keypress: onAddTasksKeyDown } }" target="_blank"></a>
                                            </span>
                                            <span data-bind="title: deploymentGroupDemandsWarningTooltip, visible: $data.taskGroup._isWarning()" class="warning-icon-display bowtie-icon bowtie-status-warning"></span>
                                    </div>
                                    
                                </div>
                                <span role = "button" class="bowtie-icon bowtie-edit-delete delete-task-group-icon" tabindex="0" data-bind="attr:{'aria-label': deletePhaseIconLabel}, showRichContentTooltip: { text: deletePhaseIconTooltip, setAriaDescribedBy: true}"></span>               
                            </div>
                            <!-- /ko -->                           
                            <div class='taskgroup-grid initial'data-bind="visible: !showAddTaskLabel()"/>
                            <div data-bind="visible: (showHeader() && showAddTaskLabel())">
                                    <table class="add-task-to-group-table">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <span tabindex="0" role="button" class='task-button add-tasks-button' data-bind=\"hover: { hoverClass: 'hover' }, css: { 'disabled': $data.disableTaskGroup }, event: { keydown: onAddTasksKeyDown }, showRichContentTooltip: { text: phaseAddTaskButtonTooltip, setAriaDescribedBy: true}\" >
                                                        <span class='bowtie-icon bowtie-math-plus'></span>
                                                        <span class='text textcolor'>${TaskResources.TaskDefinitionListTitle}</span>
                                                    </span>                                                 
                                                </td>
                                            </tr>
                                        </tbody>                                            
                                    </table>
                            </div>                       
                        </div>`;

    private static _taskEditorViewHtmlTemplate = `
    <div class='taskeditor-tasks custom-input taskgroupeditor-tasks'>
        <div class='splitter horizontal' data-bind='tfsSplitter: $data'>
            <div class='leftPane' role='region' data-bind='attr: {"aria-label": addTasksRegionLabel}'>
                <div class="add-tasks-menu">
                    <span tabindex="0" class='task-button add-tasks-button' role='button' data-bind=\"hover: { hoverClass: 'hover' }, css: { 'disabled': disableAddTasks, 'add-tasks-button-with-dropdown': showTaskContainers }, event: { keydown: onAddTasksKeyDown }, attr: { 'aria-disabled': disableAddTasks }\" >
                        <span class='bowtie-icon bowtie-math-plus'></span>
                        <span class='text' data-bind='text: addTasksLabel'></span>
                    </span>
                    <div class='add-tasks-separator' data-bind='visible: showTaskContainers'/>
                    <span tabindex="0" class='task-button add-tasks-button-with-options' role='button' data-bind=\"visible: showTaskContainers, hover: { hoverClass: 'hover' }, css: { 'disabled': disableAddTasks, 'add-tasks-button-with-dropdown': showTaskContainers }, event: { keydown: onAddTasksKeyDown }, attr: { 'aria-disabled': disableAddTasks, 'aria-label': addPhaseLabel }\" >
                        <span class='dropdown-icon bowtie-icon bowtie-triangle-down keep-align add-tasks-with-options-dropdown' id='add-tasks-with-options-dropdown-id' ></span>
                    </span>
                </div>
                <div class='tasks-groups-list initial' role='list' data-bind='visible: showTasks'>
                </div>
            </div>
            <div class='handleBar'></div>
            <div class='rightPane' role ='region' data-bind='attr: {"aria-label": taskEditorInputContainerLabel}'>
                <div class='input-container'>
                    <!-- ko if: isTaskGroupHeaderSelected() -->
                        <div class='taskGroupPropertiesControl'/>
                    <!-- /ko -->
                    <!-- ko if: !isTaskGroupHeaderSelected() -->
                    <!-- ko if: selectedTask -->
                    <!-- ko if: selectedTask().taskDefinition -->
                    <!-- ko if: selectedTask().taskDisabled -->
                    <div data-bind=\"text: selectedTask().taskDisabledMessage\"/>
                    <!-- /ko -->
                    <!-- ko with: selectedTask -->
                    <div class='taskeditor-header'>
                        <div class='taskeditor-name'>
                            <h3 data-bind=\"text: displayNameComputed, css: { 'required-input-message': _isInvalid() }\"></h3>
                            <span id='task-definition-rename' data-bind=\"title: taskRenameTooltip, click: renameTask, visible: editable(), event: { keydown: onRenameTaskKeyDown } \" class='task-icon-near-heading help bowtie-icon icon-edit' tabindex=0 role='button'></span>
                        </div>
                        <div class='taskeditor-version'>
                            <label data-bind="attr:{'id':versionSelectId}">${TaskResources.Task_VersionSelectorLabel}</label>
                            <select role='combobox' class='tooltip-target' data-bind=\"options: allVersionSpecs, optionsText: 'displayText', optionsValue: 'versionSpec', value: versionSpec, attr:{'aria-labelledby':versionSelectId}\"></select>
                            <span data-bind=\"visible: releaseNotes, showTooltip: { text: releaseNotes, minWidth: 300, pivotSiblingCssClass: 'tooltip-target', pinToPivot: true, pinPosition: 2 }\"></span>
                            <span data-bind=\"visible: newVersionToolTip, attr: {title: newVersionTitle}, showTooltip: { text: newVersionToolTip, className: 'bowtie-icon bowtie-alert new-version-upsell', minWidth: 300, pivotSiblingCssClass: 'tooltip-target', pinToPivot: true, pinPosition: 2 }\"></span>
                        </div>
                    </div>
                    <table class='taskeditor-inputs-grid-table custom-input' data-bind='foreach: inputs'>
                        <tbody data-bind=\"applyTemplate: { templateName: templateName, viewModel: $data, parentIndex: '0', cssClass: 'taskeditor-inputs' }\"></tbody>
                    </table>
                    <div class='taskeditor-groups' data-bind='foreach: groups'>
                        <div class='taskeditor-group' data-bind=\"taskEditorGroup: { viewModel: $data }, expandGroupOnKeyBoardEvent: {}, attr:{'aria-label':displayName}, css: { 'taskeditor-group-expanded': isExpanded(), 'taskeditor-group-collapsed': !isExpanded(), 'hidden': !isVisible()}\" tabindex='0'>
                            <fieldset class='fieldset'>
                                <legend><span class='tree-icon'></span>
                                    <label data-bind=\"text: displayName, css: { 'required-input-message': isInvalid() }\"></label>
                                    <sup class='taskeditor-group-inpreview' data-bind=\"title: inPreviewTooltip, 'visible': isInPreview()\" >${TaskResources.TaskGroup_Preview}</sup>
                                </legend>
                                <table class='taskeditor-inputs-grid-table custom-input' data-bind=\"foreach: $parent.groupInputsMap()[name]\">
                                    <tbody data-bind=\"applyTemplate: { templateName: templateName, viewModel: $data, parentIndex: '1', cssClass: 'taskeditor-inputs' }\"></tbody>
                                </table>
                            </fieldset>
                        </div>
                    </div>
                    <!-- ko if: helpMarkDown -->
                    <span></span>
                    <div class='taskeditor-help'>
                        <span class='icon icon-info'></span>
                        <div class='help' data-bind=\"html: helpMarkDown, title: helpMarkDown\"></div>
                    </div>
                    <!-- /ko -->
                    <!-- ko if: (!helpMarkDown() && taskDefinition.definitionType === '${Types.DefinitionType.metaTask}') -->
                    <div class='mt-control-options-area'></div>
                    <!-- /ko -->
                    <!-- /ko -->
                    <!-- /ko -->
                    <!-- /ko -->
                    <!-- /ko -->
                </div>
            </div>
        </div>
    </div>`;
}

export class TaskGroupListEditorControl extends Adapters_Knockout.TemplateControl<TaskGroupListEditorViewModel> {

    // list of task group controls created. useful when disposing the controls
    private _taskGroupControls: TaskGroupEditorControl[] = [];

    private _addTasksClickHandler: JQueryEventHandler;
    private _addTasksWithOptionsClickHandler: JQueryEventHandler;
    private _deleteTaskGroupOnClickHandler: JQueryEventHandler;
    private _deleteTaskGroupOnKeyDownHandler: JQueryEventHandler;
    private _taskGroupNameOnKeyDownHandler: JQueryEventHandler;
    private _subscriptions: IDisposable[] = [];
    private _selectedTaskGroupSubscription: IDisposable;
    private _selectedTaskSubscription: IDisposable;
    private _isTaskGroupHeaderSelectedSubscription: IDisposable;

    private _taskGroupListOwnerSubscription: IDisposable = null;
    private _taskGroupPropertiesEditorControlDelegate: (taskGroupPropertiesControlParent: JQuery, taskGroupViewModel: TaskGroupViewModel) => any = null;
    private _webContext: Contracts.WebContext;

    constructor(viewModel: TaskGroupListEditorViewModel, options?: any) {
        super(viewModel, options);

        if (!!options && !!options.taskGroupPropertiesEditorControlDelegate) {
            this._taskGroupPropertiesEditorControlDelegate = options.taskGroupPropertiesEditorControlDelegate;
        }

        // subscribe to change in selected task group and handle selection change
        this._selectedTaskGroupSubscription = this.subscribe(this.getViewModel().selectedTaskGroup, (selectedTaskGroup: TaskGroupEditorViewModel) => {
            if(!!this.getViewModel().taskGroups && this.getViewModel().taskGroups.length > 0) {
                this.getViewModel().taskGroups.forEach((taskGroupEditorViewModel: TaskGroupEditorViewModel)=>{
                    if(!selectedTaskGroup || (selectedTaskGroup.taskGroup.getValue().order !== taskGroupEditorViewModel.taskGroup.getValue().order)){
                        taskGroupEditorViewModel.deselectTaskGroupDelegate();
                    }
                });
            }
        });

        // subscribe to selected task change in this task group so that task input panel can be refreshed
        this._selectedTaskSubscription = this.subscribe(this.getViewModel().selectedTask, (newSelectedTask: TaskEditor.TaskViewModel) => {
            if (!!newSelectedTask) {
                this.getViewModel().selectedTaskGroup().showTaskGroupProperties(false);
            }
        });

        this._isTaskGroupHeaderSelectedSubscription = this.subscribe(this.getViewModel().isTaskGroupHeaderSelected, (isSelected: true) => {
            if (this.getViewModel() && this.getViewModel().selectedTaskGroup()) {
                this._addTaskGroupPropertiesControl(this.getViewModel().selectedTaskGroup().taskGroup);
            }
        });
    }

    initialize(): void {
        super.initialize();
        this._attachEvents();
        this._webContext = Context.getDefaultWebContext();
    }

    private _launchAddTasksDialog(evt: JQueryEventObject): void {
        if (!this.getViewModel().disableAddTasks()) {
            this.getViewModel().launchDefaultAddTasksDialog();
        }
    }

    private _createAddTasksPopupMenuControl(evt: JQueryEventObject): void {
        if (!this.getViewModel().disableAddTasks()) {
            var popUpMenuOptions = {
                items: [{ childItems: this._getAddTasksMenuOptions(), visible: true }],
                cssCoreClass: "add-tasks-pop-menu-options",
                align: "left-bottom"
            };

            var baseElement = this.getElement().find(".add-tasks-menu");
            baseElement.find("." + popUpMenuOptions.cssCoreClass).remove();

            var popupMenu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, baseElement, popUpMenuOptions);
            popupMenu.popup(baseElement, baseElement);
        }
    }

    private _getAddTasksMenuOptions(): any {
        var addTasksMenuOptions: Menus.IMenuItemSpec[] = [
            {
                id: "add-tasks-in-taskgroup",
                text: TaskResources.AddRunOnAgentTasksText,
                showText: false,
                noIcon: true,
                html: `<div class="add-tasks-pop-menu-option">
                            <table>
                                <td><span class="icon-run-on-agent-phase bowtie-icon bowtie-server-remote task-group-icon-unselected"></span></td>
                                <td><div class="add-tasks-pop-menu-option-labels">
                                    <span class="text add-tasks-pop-menu-option-text">${TaskResources.AddRunOnAgentTasksText}</span>
                                    <br><span class="text">${TaskResources.RunOnAgentTasksDescription}</span>
                                    </div>
                                </td>
                            </table>
                    </div>`,
                disabled: false,
                action: () => {
                    this._addTasks(Types.TaskGroupType.RunOnAgent);
                }
            },
            {
                id: "add-serverside-tasks",
                text: TaskResources.AddRunOnServerTasksText,
                showText: false,
                noIcon: true,
                html: `<div class="add-tasks-pop-menu-option">
                            <table>
                                <td><span class="icon-run-on-server-phase bowtie-icon bowtie-server task-group-icon-unselected"></span></td>
                                <td><div class="add-tasks-pop-menu-option-labels">
                                    <span class="text add-tasks-pop-menu-option-text">${TaskResources.AddRunOnServerTasksText}</span>
                                    <br><span class="text">${TaskResources.RunOnServerTasksDescription}</span>
                                    </div>
                                </td>
                            </table>
                    </div>`,
                disabled: false,
                action: () => {
                    this._addTasks(Types.TaskGroupType.RunOnServer);
                }
            },
            {
                id: "add-machinegroup-tasks",
                text: TaskResources.AddRunOnMachineGroupTasksText,
                showText: false,
                noIcon: true,
                html: `<div class="add-tasks-pop-menu-option">
                        <table>
                            <td><span class="icon-run-on-machinegroup-phase bowtie-icon bowtie-environment task-group-icon-unselected"></span></td>
                            <td><div class="add-tasks-pop-menu-option-labels">
							    <span class="text add-tasks-pop-menu-option-text">${TaskResources.AddRunOnMachineGroupTasksText}</span>
							    <br><span class="text">${TaskResources.RunOnMachineGroupTasksDescription}</span>
                                </div>
                            </td>
                        </table>
                </div>`,
                disabled: false,
                action: () => {
                    this._addTasks(Types.TaskGroupType.RunOnMachineGroup);
                }
            }
        ];

        return addTasksMenuOptions;
    }

    private _addTasks(taskGroupType: Types.TaskGroupType): void {
        // Give the focus to parent of drop down menu...
        var baseElement = this.getElement().find(".add-tasks-button-with-dropdown");
        baseElement.focus();

        this.getViewModel().launchAddTasksDialog(taskGroupType);
    }

    private _attachEvents(): void {
        this._detachEvents();

        var viewModel = this.getViewModel();

        this.getElement().find(".add-tasks-button").click(this._addTasksClickHandler = (evt: JQueryEventObject) => { this._launchAddTasksDialog(evt); });
        this.getElement().find(".add-tasks-button-with-options").click(this._addTasksWithOptionsClickHandler = (evt: JQueryEventObject) => { this._createAddTasksPopupMenuControl(evt); });

        // make the list of task group divs sortable
        if (!this.getViewModel().disableAddTasks.peek()) {
            this.getElement().find(".tasks-groups-list").sortable({
                cursorAt: { left: 16, top: 18 },
                axis: "y",
                appendTo: document.body,
                scroll: true,
                scrollSpeed: 10,
                distance: 10,
                zIndex: 9999,
                opacity: 0.5,
                start: (event: JQueryEventObject, uiElement: any) => {
                    //store the inital position
                    uiElement.item.data("initial-index", uiElement.item.index());
                },
                stop: (event: JQueryEventObject, uiElement: any) => {

                    var oldIndex = uiElement.item.data("initial-index");
                    var newIndex = uiElement.item.index();
                    if (oldIndex !== newIndex) {
                        this._handleTaskGroupsReorder(oldIndex, newIndex);
                    }
                }
            }).disableSelection();
        }

        // Add delete task handler
        this.getElement().on("click", ".delete-task-group-icon", this._deleteTaskGroupOnClickHandler = (evt: JQueryEventObject) => {
            if (this.getViewModel().disableAddTasks.peek()) {
                return false;
            }

            // Find the appropriate taskGroupEditorViewModel
            var row = $(evt.target)[0];
            var taskGroupContainer = <TaskGroupEditorViewModel>ko.dataFor(row);

            var confirmationMessage = Utils_String.localeFormat(TaskResources.DeletePhaseConfirmation, taskGroupContainer.taskGroup.displayName.peek());
            Dialogs.show(ConfirmDialogBox, {
                title: TaskResources.DeletePhaseConfirmationTitle,
                callback: () => {
                    this.getViewModel().removeTaskGroup(taskGroupContainer.taskGroup);
                },
                message: confirmationMessage
            });

            return false;
        });

        this.getElement().on("keydown", ".delete-task-group-icon", this._deleteTaskGroupOnKeyDownHandler = (event: JQueryEventObject) => {
            switch (event.keyCode) {
                case Utils_UI.KeyCode.ENTER:
                    return TaskUtils.AccessibilityHelper.triggerClickOnEnterOrSpaceKeyPress(event);

                case Utils_UI.KeyCode.RIGHT:
                    this._focusTaskGroupProperties();
                    return false;

                default:
                    return true;
            }
        });

        this.getElement().on("keydown", ".task-group-header-link", this._taskGroupNameOnKeyDownHandler = (event: JQueryEventObject) => {
            switch (event.keyCode) {
                case Utils_UI.KeyCode.ENTER:
                    return TaskUtils.AccessibilityHelper.triggerClickOnEnterOrSpaceKeyPress(event);

                case Utils_UI.KeyCode.RIGHT:
                    this._focusTaskGroupProperties();
                    return false;

                default:
                    return true;
            }
        });

        var taskGroupListOwner = viewModel.taskGroupListOwner.peek();
        if (!!taskGroupListOwner) {
            this._initTaskGroups(taskGroupListOwner.taskGroupList);
        }

        if (!!this._taskGroupListOwnerSubscription) {
            this._taskGroupListOwnerSubscription.dispose();
        }

        this._taskGroupListOwnerSubscription = this.subscribe(viewModel.taskGroupListOwner, (newTaskGroupListOwner: InternalTypes.ITaskGroupListOwner) => {
            if (!!newTaskGroupListOwner) {
                this._initTaskGroups(newTaskGroupListOwner.taskGroupList);
            }
        });
    }

    private _focusTaskGroupProperties(): void {
        var taskGroupInputs = $("div.input-container .taskGroupPropertiesControl");
        var focusable = taskGroupInputs.find(":focusable");

        focusable.first().focus();
    }

    private _initTaskGroups(taskGroupsViewModel: InternalTypes.ITaskGroupList) {
        var viewModel = this.getViewModel();

        // dispose controls and subscriptions before painting controls again for new owner
        this._disposeSubscriptions();
        this._cleanupTaskGroupControls();

        if (taskGroupsViewModel) {
            this._subscriptions.push(this.subscribe(taskGroupsViewModel.taskGroups, (newTaskGroups: TaskGroupViewModel[]) => {
                this._reinitTaskGroups(newTaskGroups);
            }));

            this._subscriptions.push(this.subscribe(taskGroupsViewModel.visible, (visible: boolean) => {
                viewModel.showTasks(visible);
                this._reinitTaskGroups(taskGroupsViewModel.getTaskGroupViewModels().peek());
            }));

            viewModel.showTasks(taskGroupsViewModel.visible.peek());

            this._updateTaskGroupContainers(taskGroupsViewModel.getTaskGroupViewModels().peek());

            this._subscriptions.push(this.subscribe(taskGroupsViewModel.editable, (editable: boolean) => {
                viewModel.disableAddTasks(editable && viewModel.disableAddTasks.peek());
            }));
        }

        viewModel.disableAddTasks(!taskGroupsViewModel.taskGroups.peek() || viewModel.disableAddTasks.peek());
    }

    private _reinitTaskGroups(taskGroups: TaskGroupViewModel[]): void {
        // dispose controls and subscriptions first
        this._cleanupTaskGroupControls();

        this._updateTaskGroupContainers(taskGroups);
    }

    private _updateTaskGroupContainers(taskGroups: TaskGroupViewModel[]): void {

        if (taskGroups.length > 0) {
            // create group control for each group
            taskGroups.forEach((taskGroup: TaskGroupViewModel) => {
                this._createTaskGroupContainer(taskGroup);
            });
        }
    }

    private _createTaskGroupContainer(taskGroupViewModel: TaskGroupViewModel): void {

        if (!!taskGroupViewModel && taskGroupViewModel.taskList.type == Types.TaskGroupType.RunOnMachineGroup) {
            this._addTaskGroupPropertiesControl(taskGroupViewModel);
        }
        var options = this.getViewModel().getTaskEditorOptions();
        var taskGroupEditorViewModel = new TaskGroupEditorViewModel(taskGroupViewModel, this.getViewModel().showTaskContainers, options);
        this.getViewModel().taskGroups.push(taskGroupEditorViewModel);

        var taskGroupElement = $('<div class="task-group"></div>').attr({
            "id": taskGroupViewModel.getValue().order,
            "role": "listitem",
        });
        this.getElement().find(".tasks-groups-list").append(taskGroupElement);

        var $control = TaskUtils.loadHtmlTemplate("taskGroup_view").appendTo(taskGroupElement);
        ko.applyBindings(taskGroupEditorViewModel, $control[0]);

        // create control for each task group
        var groupControl = <TaskGroupEditorControl>Controls.BaseControl.enhance(TaskGroupEditorControl, taskGroupElement, taskGroupEditorViewModel);

        // assign the dialog close callback
        taskGroupEditorViewModel.addTaskDialogCloseCallback = delegate(groupControl, groupControl.addTaskDialogCloseHandler);
        taskGroupEditorViewModel.deselectTaskGroupDelegate = delegate(groupControl, groupControl.onTaskGroupDeselection);
        taskGroupEditorViewModel.selectGridIndexDelegate = delegate(groupControl, groupControl.selectGridIndex);

        if (this.getViewModel().disableAddTasks.peek()) {
            groupControl.getElement().find(".task-group-header").children(".delete-task-group-icon").remove();
        }

        // initialize control
        groupControl.initialize();

        // store the created control for disposing later
        this._taskGroupControls.push(groupControl);

        // subscribe to click event on a container
        groupControl.getElement().on("click", (evt: JQueryEventObject) => {
            if (evt.target.classList.contains("delete-task-group-icon")) {
                // Hide right side taskgroup properties UI
                taskGroupEditorViewModel.showTaskGroupProperties(false);
                return;
            }

            var showTaskGroupProperties = false;

            // click on unselected task group header
            if (evt.target.className === "task-group-header-label-selected"
                || evt.target.className === "task-group-header-label"
                || evt.target.className === "task-group"
                || evt.target.classList.contains("task-group-header-icon")
                || taskGroupViewModel.taskList.tasks.peek().length === 0
                || evt.target.classList.contains("task-group-header-link")
                || evt.target.classList.contains("task-group-header-link-text")) {

                showTaskGroupProperties = true;
            }

            if (this.getViewModel().selectedTaskGroup.peek() !== taskGroupEditorViewModel) {
                this.getViewModel().setSelectedTaskGroup(taskGroupEditorViewModel);
            }

            if (taskGroupEditorViewModel.showTaskGroupProperties.peek() !== showTaskGroupProperties) {
                taskGroupEditorViewModel.showTaskGroupProperties(showTaskGroupProperties);
            }

            if (evt.target.parentElement.classList.contains("add-tasks-button")
                || evt.target.classList.contains("add-tasks-button")) {
                this._launchAddTasksDialog(evt);
            }
        });

        this._subscriptions.push(this.subscribe(this.getViewModel().onTabSelected, () => {
            this._taskGroupControls.forEach((groupControl: TaskGroupEditorControl) => groupControl.layout());
        }));

        // if this task group has been marked to be auto-selected, do so else make sure it is not selected
        if (this.getViewModel().getAutoSelectedTaskGroupIndex() === taskGroupViewModel.getValue().order) {
            this.getViewModel().setAutoSelectedTaskGroupIndex(taskGroupViewModel.getValue().order);
        } else {
            groupControl.onTaskGroupDeselection();
        }
    }

    private _addTaskGroupPropertiesControl(taskGroupViewModel: TaskGroupViewModel): void {
        // The selector '.taskGroupPropertiesControl' we are trying to find is being rendered under a knockout if binding
        // <!-- ko if: isTaskGroupHeaderSelected() -->
        // The delay is needed in order to ensure that we lookup for the class only after the div gets rendered
        setTimeout(() => {
            var taskGroupPropertiesControlParent = this.getElement().find(".taskGroupPropertiesControl");
            taskGroupPropertiesControlParent.empty();

            if (!!taskGroupViewModel && !!taskGroupViewModel.taskGroupPropertiesModel) {
                if (!!this._taskGroupPropertiesEditorControlDelegate) {
                    this._taskGroupPropertiesEditorControlDelegate(taskGroupPropertiesControlParent, taskGroupViewModel);
                }
            }
        }, 10);
    }

    private _handleTaskGroupsReorder(oldIndex, newIndex): void {
        this.getViewModel().taskGroupListOwner.peek().taskGroupList.moveTaskGroup(oldIndex, newIndex);
        this.getViewModel().setAutoSelectedTaskGroupIndex(newIndex);
    }

    private _cleanupTaskGroupControls(): void {
        this.getElement().find(".tasks-groups-list").empty();
        this.getViewModel().selectedTaskGroup(null);
        this.getViewModel().taskGroups = [];
        this._taskGroupControls.forEach((taskGroupControl: TaskGroupEditorControl) => taskGroupControl.dispose());
        this._taskGroupControls = [];
    }

    private _detachEvents(): void {
        // Dispose task subscription if applicable
        this._disposeSubscriptions();

        // Unbind add tasks click
        this.getElement().off("click", ".add-tasks-button", this._addTasksClickHandler);
        this._addTasksClickHandler = null;

        this.getElement().off("click", ".add-tasks-button-with-options", this._addTasksWithOptionsClickHandler);
        this._addTasksWithOptionsClickHandler = null;

        this.getElement().off("click", ".delete-task-group-icon", this._deleteTaskGroupOnClickHandler);
        this._deleteTaskGroupOnClickHandler = null;

        this.getElement().off("keydown", ".delete-task-group-icon", this._deleteTaskGroupOnKeyDownHandler);
        this._deleteTaskGroupOnKeyDownHandler = null;

        this.getElement().off("keydown", ".task-group-header-link", this._taskGroupNameOnKeyDownHandler);
        this._taskGroupNameOnKeyDownHandler = null;
    }

    dispose(): void {
        this._detachEvents();

        // Do not move this to _disposeSubscriptions since _disposeSubscriptions is called _initTaskGroups which is invoked by this subscription
        if (!!this._taskGroupListOwnerSubscription) {
            this._taskGroupListOwnerSubscription.dispose();
        }

        // dispose task groups
        this._taskGroupControls.forEach((taskGroupControl: TaskGroupEditorControl) => taskGroupControl.dispose());
        this._taskGroupControls = [];

        if (!!this._selectedTaskSubscription) {
            this._selectedTaskSubscription.dispose();
        }

        if (!!this._selectedTaskGroupSubscription) {
            this._selectedTaskGroupSubscription.dispose();
        }

        if (!!this._isTaskGroupHeaderSelectedSubscription) {
            this._isTaskGroupHeaderSelectedSubscription.dispose();
        }

        super.dispose();
    }

    private _disposeSubscriptions(): void {
        if (!!this._subscriptions && this._subscriptions.length > 0){
            this._subscriptions.forEach((value: IDisposable) => {
                value.dispose();
            });
        }

        this._subscriptions = [];
    }
}

export class ConfirmDialogBox extends Dialogs.ModalDialog {
    public initialize() {
        super.initialize();
        $("<span />")
            .text(this._message)
            .attr("style", "font-size: 12px")
            .appendTo(this.getElement());
    }

    public initializeOptions(options?: any) {
        this._callback = options.callback;
        this._message = options.message;

        var _buttons: { [key: string]: { id: string, text: string, click: IArgsFunctionR<any>, enabled?: boolean }; } = {};

        _buttons["ok"] = {
            id: "ok",
            text: VSS_Resources_Platform.ModalDialogOkButton,
            enabled: true,
            click: delegate(this, this._onOkClick)
        };

        _buttons["cancel"] = {
            id: "cancel",
            text: VSS_Resources_Platform.ModalDialogCancelButton,
            click: delegate(this, this._onCancelClick)
        }

        super.initializeOptions($.extend({
            title: options.title,
            resizable: false,
            dialogClass: "bowtie",
            buttons: _buttons,
            hideCloseButton: true
        }, options));
    }

    private _onOkClick(): void {
        this._callback();
        this.close();
        this.dispose();
    }

    private _onCancelClick(): void {
        super.onCancelClick();
        this.dispose();
    }

    private _callback: () => void;
    private _message: string;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.TasksEditor.Internal", exports);
