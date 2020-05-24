/// <reference types="react" />

import * as React from "react";

import { TaskGroupType, DefinitionType } from "DistributedTasksCommon/TFS.Tasks.Types";
import { TaskExtensionItemListActionsCreator } from "DistributedTaskControls/Actions/TaskExtensionItemListActionsCreator";
import { TaskItemListActionsCreator } from "DistributedTaskControls/Actions/TaskItemListActionsCreator";
import { TaskListActionsCreator } from "DistributedTaskControls/Actions/TaskListActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { HelpLinks } from "DistributedTaskControls/Common/Common";
import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { MarketplaceLinkHelper } from "DistributedTaskControls/Common/MarketplaceLinkHelper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties, Source } from "DistributedTaskControls/Common/Telemetry";
import { ITaskDefinitionItem, IExtensionDefinitionItem } from "DistributedTaskControls/Common/Types";
import { ExtensionItemList } from "DistributedTaskControls/Components/ExtensionItemList";
import { ExternalLink } from "DistributedTaskControls/Components/ExternalLink";
import { NoSearchResults } from "DistributedTaskControls/Components/NoSearchResults";
import { TaskItemList } from "DistributedTaskControls/Components/TaskItemList";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { TaskExtensionItemListStore } from "DistributedTaskControls/Stores/TaskExtensionItemListStore";
import {
    TaskItemListStore,
    PreDefinedTaskListCategories,
    Key_PreDefinedTaskListCategories_AllTasks,
    Key_PreDefinedTaskListCategories_MarketplaceTasks,
    ITaskListResult
} from "DistributedTaskControls/Stores/TaskItemListStore";

import { ActionButton } from "OfficeFabric/Button";
import { Fabric } from "OfficeFabric/Fabric";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { SearchBox, ISearchBox } from "OfficeFabric/SearchBox";
import { getRTLSafeKeyCode, KeyCodes, Async } from "OfficeFabric/Utilities";

import * as Diag from "VSS/Diag";
import { PivotBar, PivotBarItem } from "VSSUI/PivotBar";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/ControllerViews/TaskItemListControllerView";


export interface IViewState extends ComponentBase.IState {
    taskListPerCategory?: IDictionaryStringTo<ITaskListResult>;
    selectedPivotkey?: string;
    currentTasks?: ITaskDefinitionItem[];
    currentDeprecatedTasks?: ITaskDefinitionItem[];
    extensions?: IExtensionDefinitionItem[];
    isExtensionFetched?: boolean;
    isTaskFetched?: boolean;
    marketplaceLink?: string;
}

export interface IProps extends ComponentBase.IProps {
    visibilityFilter: string[];
    taskListStoreInstanceId: string;
    taskGroupType?: TaskGroupType;
}

const TaskListDescription = ({ marketplaceLink }) => (
    <div className="dtc-task-list-description">
        <span>{Resources.TaskItemListDescription} </span>
        <ExternalLink
            className={"dtc-task-list-description-link"}
            text={Resources.CheckoutMarketPlaceText}
            href={marketplaceLink}
            newTab={true} />
    </div>
);

export class TaskItemListControllerView extends ComponentBase.Component<IProps, IViewState> {

    public componentWillMount(): void {

        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskItemListActionsCreator>(TaskItemListActionsCreator, this.props.taskListStoreInstanceId);
        this._extensionActionCreator = ActionCreatorManager.GetActionCreator<TaskExtensionItemListActionsCreator>(TaskExtensionItemListActionsCreator, this.props.taskListStoreInstanceId);
        this._store = StoreManager.GetStore<TaskItemListStore>(TaskItemListStore);
        this._extensionListStore = StoreManager.GetStore<TaskExtensionItemListStore>(TaskExtensionItemListStore);
        this._taskListActionCreator = ActionCreatorManager.GetActionCreator<TaskListActionsCreator>(TaskListActionsCreator, this.props.taskListStoreInstanceId);
        this._actionCreator.updateTaskItemList(this.props.visibilityFilter, (this.props.taskGroupType ? this.props.taskGroupType : TaskGroupType.RunOnAny));
        this._isMarketplaceCapabilitySupported = AppContext.instance().isCapabilitySupported(AppCapability.MarketplaceExtensions);

        if (this._isMarketplaceCapabilitySupported) {
            this._extensionActionCreator.getExtensions();
        }
        
        this.setState({
            currentTasks: this._store.getTaskItemList(),
            currentDeprecatedTasks: this._store.getDeprecatedTaskItemList(),
            extensions: this._extensionListStore.getExtensionItemList(),
            isExtensionFetched: this._extensionListStore.isExtensionFetched(),
            taskListPerCategory: this._store.getTaskListPerCategory(),
            selectedPivotkey: Key_PreDefinedTaskListCategories_AllTasks,
            isTaskFetched: this._store.isTaskFetched()
        });
    }

    public componentDidMount(): void {
        Diag.logVerbose("[TasksControllerView.componentDidMount]: method called");
        this._store.addChangedListener(this._updateTaskList);
        this._extensionListStore.addChangedListener(this._updateExtensionList);

        let async = new Async();
        this._delayedOnChange = async.debounce(this._onFilterTextChanged, 500);

        if (this._searchButton) {
            this._searchButton.focus();
        }

        if (!this._isMarketplaceCapabilitySupported) {
            MarketplaceLinkHelper.getMarketplaceLink().then((marketplaceLink: string) => {
                this.setState({
                    marketplaceLink: marketplaceLink
                });
            });
        }
    }

    public componentWillUnmount(): void {
        Diag.logVerbose("[TasksControllerView.componentWillUnmount]: method called");

        this._store.removeChangedListener(this._updateTaskList);
        this._extensionListStore.removeChangedListener(this._updateExtensionList);
    }

    public render(): JSX.Element {
        Diag.logVerbose("[TasksControllerView.render]: method called");

        let tasksElement: JSX.Element;

        if (this._filterText) {
            if (this.state.currentTasks.length > 0 || this.state.currentDeprecatedTasks.length > 0 || !this._isExtensionListEmpty()) {
                tasksElement = (
                    <TaskItemList
                        key={Key_PreDefinedTaskListCategories_AllTasks}
                        tasks={this.state.currentTasks}
                        deprecatedTasks={this.state.currentDeprecatedTasks}
                        extensions={this.state.extensions}
                        isExtensionFetched={this.state.isExtensionFetched}
                        isTaskFetched={this.state.isTaskFetched}
                        showExtension={!this._isExtensionListEmpty()}
                        taskListStoreInstanceId={this.props.taskListStoreInstanceId}
                        onAddTask={this._onAddTask}
                        onDragTask={this._onDragTask}
                        onAddTaskByDragDrop={this._onAddTaskByDragDrop}
                        cssClass={"dtc-filtered-task-list"} />
                );
            } else {
                tasksElement = (
                    <div className="dtc-tasks-no-search-results">
                        <NoSearchResults searchText={this._filterText} />
                    </div>);
            }
        }
        else {
            const taskListPerCategory = this.state.taskListPerCategory;
            let pivotBarItems: JSX.Element[] = [];

            for (let category in PreDefinedTaskListCategories) {
                if (PreDefinedTaskListCategories.hasOwnProperty(category) &&
                    !!taskListPerCategory &&
                    taskListPerCategory.hasOwnProperty(category)) {

                    let categoryTitle: string = this._getCategoryTitle(category);
                    let tabItem: JSX.Element = this._getTaskItemList(category, taskListPerCategory[category]);

                    pivotBarItems.push(
                        <PivotBarItem key={category} itemKey={category} name={categoryTitle} className="pivot-item-class" ariaLabel={categoryTitle} >
                            {tabItem}
                        </PivotBarItem >
                    );
                }
            }

            if (this._isMarketplaceCapabilitySupported) {
                let categoryTitle: string = this._getCategoryTitle(Key_PreDefinedTaskListCategories_MarketplaceTasks);
                let tabItem = this._getMarketplaceTabItem();

                pivotBarItems.push(
                    <PivotBarItem key={Key_PreDefinedTaskListCategories_MarketplaceTasks} itemKey={Key_PreDefinedTaskListCategories_MarketplaceTasks} name={categoryTitle} className="pivot-item-class" ariaLabel={categoryTitle} >
                        {tabItem}
                    </PivotBarItem >
                );
            }

            if (pivotBarItems.length > 0) {
                tasksElement =
                    <Fabric className={"dtc-task-pivot-bar-container"}>
                        <PivotBar className={"add-task-pivot-bar"} selectedPivot={this.state.selectedPivotkey} onPivotClicked={this._onPivotClicked} >
                            {pivotBarItems}
                        </PivotBar>
                    </Fabric>;
            }
        }

        return (
            <div className={"dtc-add-task-container"}>
                <div className="dtc-task-item-list-top-strip">
                    <div className="dtc-task-list-header">
                        <div className="dtc-task-list-header-content">
                            <div className="dtc-task-list-title">{Resources.TaskItemListTitle}</div>
                            {
                                this._isMarketplaceCapabilitySupported &&
                                <div className="add-task-refresh-separator" >
                                    <div className="separator"></div>
                                    <ActionButton
                                        className={"refresh-button"}
                                        iconProps={{ className: "bowtie-icon bowtie-navigate-refresh" }}
                                        text={Resources.Refresh}
                                        onClick={this._onRefresh} />
                                </div>
                            }
                        </div>
                        {!this._isMarketplaceCapabilitySupported && <TaskListDescription marketplaceLink={this.state.marketplaceLink || HelpLinks.DefaultMarketplaceLink} />}
                    </div>
                    <div className="dtc-task-list-search fabric-style-overrides" role="search" aria-label={Resources.SearchTaskAriaLabel} >
                        <SearchBox
                            componentRef={this._resolveRef("_searchButton")}
                            placeholder={Resources.SearchLabel}
                            onChange={this._onValueChanged} />
                    </div>
                </div>
                <div className="dtc-task-item-list-content">
                    {tasksElement}
                </div>
            </div>);
    }

    private _onPivotClicked = (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, pivotKey: string): void => {
        this.setState({
            selectedPivotkey: pivotKey
        });

        // Telemetry when tasks tab is clicked. 
        this._publishTaskTabClickedTelemetry(pivotKey);
    }

    private _isExtensionListEmpty(): boolean {
        if (!this._isMarketplaceCapabilitySupported) {
            return true;
        }

        return this.state.isExtensionFetched && this.state.extensions.length === 0;
    }

    private _updateExtensionList = () => {
        this.setState({
            extensions: this._extensionListStore.getExtensionItemList(),
            isExtensionFetched: this._extensionListStore.isExtensionFetched()
        });
    }

    private _updateTaskList = () => {
        Diag.logVerbose("[TasksControllerView._updateTasksList]: method called");
        this.setState({
            currentTasks: this._store.getTaskItemList(),
            currentDeprecatedTasks: this._store.getDeprecatedTaskItemList(),
            taskListPerCategory: this._store.getTaskListPerCategory(),
            isTaskFetched: this._store.isTaskFetched()
        });
    }

    private _onAddTask = (task: ITaskDefinitionItem) => {
        Diag.logVerbose("[TasksControllerView._onAddTask]: method called");
        this._taskListActionCreator.addTask(task);
        announce(Resources.TaskAdded, true);
        this._publishAddTaskTelemetry(task, false, true);
    }

    private _onDragTask = () => {
        Diag.logVerbose("[TasksControllerView._onDragTask]: method called");
        this._taskListActionCreator.clearAddTaskLocation();
    }

    private _onAddTaskByDragDrop = (task: ITaskDefinitionItem, taskAccepted: boolean) => {
        Diag.logVerbose("[TasksControllerView._onAddTaskByDragDrop]: method called");
        this._publishAddTaskTelemetry(task, true, taskAccepted);
    }

    private _onValueChanged = (value: string) => {
        this._delayedOnChange(value);
    }

    private _onFilterTextChanged = (filterText: string) => {
        Diag.logVerbose("[TasksControllerView._onFilterTextChanged]: method called");
        this._filterText = filterText;
        this._extensionActionCreator.filterExtensionItemList(filterText);
        this._actionCreator.filterTaskItemList(filterText);
    }

    private _getMarketplaceTabItem(): JSX.Element {
        return (
            <FocusZone
                direction={FocusZoneDirection.vertical}
                isInnerZoneKeystroke={(keyEvent: React.KeyboardEvent<HTMLElement>) => (
                    (keyEvent.which === getRTLSafeKeyCode(KeyCodes.right)))}>
                <ExtensionItemList
                    extensions={this.state.extensions}
                    isExtensionFetched={this.state.isExtensionFetched}
                    instanceId={this.props.taskListStoreInstanceId}
                    className={"dtc-task-item-list"} />
            </FocusZone>
        );
    }

    private _onRefresh = () => {
        this._actionCreator.updateTaskItemList(this.props.visibilityFilter, (this.props.taskGroupType ? this.props.taskGroupType : TaskGroupType.RunOnAny), true);
        this._extensionActionCreator.getExtensions(true);

        // Telemetry when refresh task is clicked
        this._publishRefreshTaskTelemetry();
    }

    private _getTaskItemList(category: string, taskListResult: ITaskListResult): JSX.Element {
        let isCategoryAll: boolean = false;

        if (this._isMarketplaceCapabilitySupported) {
            isCategoryAll = Utils_String.equals(category, Key_PreDefinedTaskListCategories_AllTasks, true);
        }

        return (
            <TaskItemList
                key={category}
                cssClass={"dtc-task-item-list"}
                tasks={taskListResult.tasks}
                deprecatedTasks={taskListResult.deprecatedTasks}
                extensions={this.state.extensions}
                isExtensionFetched={this.state.isExtensionFetched}
                isTaskFetched={this.state.isTaskFetched}
                showExtension={isCategoryAll}
                taskListStoreInstanceId={this.props.taskListStoreInstanceId}
                onAddTask={this._onAddTask}
                onDragTask={this._onDragTask}
                onAddTaskByDragDrop={this._onAddTaskByDragDrop}
            />);
    }

    private _getCategoryTitle(category: string): string {
        let categoryText: string = PreDefinedTaskListCategories[category];
        return Utils_String.toSentenceCase(categoryText); // This is done to make sure that the first alphabet is capital case.
    }

    private _publishAddTaskTelemetry(task: ITaskDefinitionItem, isDragDropContext: boolean, taskAccepted: boolean) {
        let eventProperties: IDictionaryStringTo<any> = {};
        let source: string = Source.CommandButton;
        if (isDragDropContext) {
            source = Source.DragAndDrop;
        }

        eventProperties[Properties.TaskCategory] = task.category;
        eventProperties[Properties.SelectedCategoryTab] = this.state.selectedPivotkey;

        // Task group name can contain PII information. Do not add the task name
        // There is already a way to determine if task group was added (definition type)
        if (task.definitionType !== DefinitionType.metaTask) {
            eventProperties[Properties.TaskId] = task.id;
        }

        eventProperties[Properties.TaskDefinitionType] = task.definitionType;
        eventProperties[Properties.TaskAccepted] = taskAccepted;

        Telemetry.instance().publishEvent(Feature.AddTask, eventProperties, source);
    }

    private _publishRefreshTaskTelemetry(): void {
        Telemetry.instance().publishEvent(Feature.RefreshTask);
    }

    private _publishTaskTabClickedTelemetry(taskCategory: string): void {
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.selectedTab] = taskCategory;

        Telemetry.instance().publishEvent(Feature.TaskTab, eventProperties);
    }

    private _filterText: string = Utils_String.empty;
    private _store: TaskItemListStore;
    private _extensionListStore: TaskExtensionItemListStore;
    private _actionCreator: TaskItemListActionsCreator;
    private _extensionActionCreator: TaskExtensionItemListActionsCreator;
    private _taskListActionCreator: TaskListActionsCreator;
    private _searchButton: ISearchBox;
    private _isMarketplaceCapabilitySupported: boolean;
    private _delayedOnChange: (string) => void;
}
