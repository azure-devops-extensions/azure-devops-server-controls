import * as React from "react";

import { getActivityFieldValue } from "Agile/Scripts/Capacity/FieldAggregator";
import { AgileFilterBar, IAgileFilterContext } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterBar";
import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { FilterStatePersistenceManager } from "Agile/Scripts/Common/FilterStatePersistenceManager";
import { HubViewActions } from "Agile/Scripts/Common/HubViewActions";
import { SprintsHubConstants, SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { SprintViewRightPanel } from "Agile/Scripts/SprintsHub/Common/SprintViewRightPanel";
import { SprintViewCommonViewActions } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintViewCommonViewActions";
import { SprintViewPivotBase } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintViewPivotBase";
import { ISprintViewPivotContext, ISprintViewRightPanelData, ViewActionKey, RightPanelKey } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { TaskboardActions } from "Agile/Scripts/SprintsHub/Taskboard/ActionsCreator/TaskboardActions";
import { TaskboardActionsCreator } from "Agile/Scripts/SprintsHub/Taskboard/ActionsCreator/TaskboardActionsCreator";
import { ITaskboardDetailsPanelOptions, TaskboardWrapper } from "Agile/Scripts/SprintsHub/Taskboard/Components/TaskboardWrapper";
import { ITaskboardViewState, TaskboardSelector } from "Agile/Scripts/SprintsHub/Taskboard/Selectors/TaskboardSelector";
import { SprintsHubTaskboardShortcutActions, TaskboardShortcut } from "Agile/Scripts/SprintsHub/Taskboard/SprintsHubTaskboardShortcuts";
import { TaskboardStore } from "Agile/Scripts/SprintsHub/Taskboard/Store/TaskboardStore";
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { PivotBarActionHelper } from "Presentation/Scripts/TFS/FeatureRef/NewWorkItem";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { delay } from "VSS/Utils/Core";
import { equals } from "VSS/Utils/String";
import { IFilterBarProps } from "VSSUI/FilterBar";
import { IPivotBarAction, IPivotBarViewAction } from "VSSUI/PivotBar";
import { SplitterElementPosition } from "VSSUI/Splitter";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { ObservableValue } from "VSS/Core/Observable";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";
import { DataKeys } from "Agile/Scripts/Common/Agile";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys, HubViewOptionsTargetSelector } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";
import { SplitView } from "Agile/Scripts/Common/Components/SplitView/SplitView";

@component("sprint-taskboard-pivot")
export class SprintViewTaskboardPivot extends SprintViewPivotBase<ITaskboardViewState> {
    private _actionsCreator: TaskboardActionsCreator;
    private _store: TaskboardStore;
    private _taskboardRef: TaskboardWrapper;
    private _shortcuts: TaskboardShortcut;
    private _taskboardFilterContext: ObservableValue<IAgileFilterContext>;
    private _initialFilterSet: boolean;
    private _viewOptionsLearningBubble = React.createRef<LearningBubble>();

    constructor(props: ISprintViewPivotContext) {
        super(props);

        const filterManager = new FilterStatePersistenceManager(TfsSettingsScopeNames.WebTeam, props.team.id, SprintsHubConstants.HUB_NAME, SprintsHubRoutingConstants.TaskboardPivot);

        const actions = new TaskboardActions();
        this._actionsCreator = new TaskboardActionsCreator(actions, this.props, filterManager);
        this._store = new TaskboardStore(actions);

        this.state = TaskboardSelector.getTaskboardViewState(this._store);

        this._store.addChangedListener(this._onStoreChanged);

        this._taskboardFilterContext = new ObservableValue<IAgileFilterContext>({
            filterManager: null,
            initialFilterState: {},
            skipFocusOnMount: false
        });

        props.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
    }

    public componentWillReceiveProps(nextProps: ISprintViewPivotContext) {
        const { selectedIteration } = this.props;

        if (selectedIteration !== nextProps.selectedIteration) {
            delay(this, 0, () => {
                // When the iteration is changed in the header, this component is being re-rendered as part of an action higher up in the stack
                if (this._actionsCreator) {
                    //  We received new props from switching sprints or due to iteration date or name changes.
                    //  Reload the taskboard and display a loading dialog while we get data from the server.
                    this._actionsCreator.reloadTaskboardData(nextProps);
                }
            });
        }
    }

    public componentWillUpdate(nextProps: ISprintViewPivotContext, nextState: ITaskboardViewState) {
        super.componentWillUpdate(nextProps, nextState);

        if (!this._initialFilterSet && nextState.initialFilterState) {
            nextProps.filter.setState(nextState.initialFilterState);
            this._initialFilterSet = true;

            if (nextProps.filter.hasChangesToReset()) {
                delay(this, 0, () => {
                    this._showFilter(true /* skipFocus */);
                });
            }
        }
    }

    public componentWillMount() {
        super.componentWillMount();
        this._shortcuts = this._setupTaskboardHubShortcuts();

        this._actionsCreator.fetchTaskboardData();
    }

    public componentDidUpdate(prevProps: ISprintViewPivotContext, prevState: ITaskboardViewState) {
        super.componentDidUpdate(prevProps, prevState);
        this._shortcuts = this._setupTaskboardHubShortcuts();

        if (this.state.rightPanelId !== prevState.rightPanelId) {
            this._taskboardRef.resize();
        }
    }

    public componentDidMount() {
        super.componentDidMount();

        const {
            contributionId
        } = this.getSplitterState();

        this.props.viewOptions.setViewOption(ViewActionKey.RIGHT_PANEL, contributionId || RightPanelKey.OFF);

        if (!this._initialFilterSet && this.state.initialFilterState) {
            this.props.filter.setState(this.state.initialFilterState);
            this._initialFilterSet = true;

            if (this.props.filter.hasChangesToReset()) {
                delay(this, 0, () => {
                    this._showFilter(true /* skipFocus */);
                });
            }
        }
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this.props.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._store.removeChangedListener(this._onStoreChanged);
        this._shortcuts.unregisterAllShortcuts();
    }

    public getCommands(props: ISprintViewPivotContext, state: ITaskboardViewState): IPivotBarAction[] {
        const addNewItemCommand = PivotBarActionHelper.getNewWorkItemPivotBarAction({
            addNewItem: this._addNewItem,
            workItemTypesNames: state.newWorkItemTypes,
            disabled: state.isNewWorkItemButtonDisabled
        });

        return [
            addNewItemCommand
        ];
    }

    public getViewActions(props: ISprintViewPivotContext, state: ITaskboardViewState): IPivotBarViewAction[] {
        const areViewActionsDisabled = state.loadingStatus === LoadingStatus.Loading;
        const commonViewActions = SprintViewCommonViewActions.getViewActions(props, areViewActionsDisabled, true /* include planning */, state.rightPanelId);

        commonViewActions.push(HubViewActions.getFilterAction(this._toggleFilterBar, state.isFiltered));

        if (state.loadingStatus !== LoadingStatus.LoadedWithContent) {
            // Don't set the groupBy view action as it cannot be disabled. If there is no taskboard data
            // this view action does not make sense to render.
            return commonViewActions;
        } else {
            if (!this.props.viewOptions.getViewOption(ViewActionKey.GROUP_BY_KEY)) {
                // Set the group by action and set the current state if not set yet
                this.props.viewOptions.setViewOption(ViewActionKey.GROUP_BY_KEY, state.groupBy);
            }
            return [
                SprintViewCommonViewActions.getGroupBy(state.parentPluralName),
                ...commonViewActions
            ];
        }
    }

    public isDataReady(): boolean {
        return this.state.loadingStatus === LoadingStatus.LoadedWithContent ||
            this.state.loadingStatus === LoadingStatus.LoadedNoContent ||
            this.state.loadingStatus === LoadingStatus.ErrorLoadingData;
    }

    public render(): JSX.Element {
        const {
            rightPanelId
        } = this.state;
        return (
            <SplitView
                className="sprint-view-splitter"
                onRenderNearElement={this._renderMainContent}
                onRenderFarElement={rightPanelId && rightPanelId !== RightPanelKey.OFF && this._renderRightPanel}
                registrySettingsPrefix="Agile/SprintsHub/Pivots/TaskboardSplitView"
                fixedElement={SplitterElementPosition.Far}
            />
        );
    }

    private _renderMainContent = (): JSX.Element => {
        const {
            filter,
            onPlanSprint,
            selectedIteration,
            setFocusOnHub,
            team
        } = this.props;

        const {
            aggregatedCapacityData,
            groupBy,
            loadingStatus,
            taskboardData,
            exceptionsInfo
        } = this.state;

        return (
            <div className="taskboard-wrapper" role="main" aria-label={SprintsHubResources.TaskboardPivot}>
                <LearningBubble
                    ref={this._viewOptionsLearningBubble}
                    settingsKey={LearningBubbleSettingsKeys.RightPanelViewOptions}
                    target={HubViewOptionsTargetSelector}
                    text={AgileResources.PaneClosedLearningBubbleInfoText}
                    buttonLabel={AgileResources.PaneClosedLearningBubbleButtonText} />
                {this._renderAgileFilter()}
                <TaskboardWrapper
                    ref={this._resolveTaskboardWrapperRef}
                    groupBy={groupBy}
                    iterationPath={selectedIteration.iterationPath}
                    onPlanSprintClicked={onPlanSprint}
                    status={loadingStatus}
                    setNewWorkItemDisabledState={this._setNewWorkItemButtonState}
                    taskboard={taskboardData}
                    exceptionsInfo={exceptionsInfo}
                    refreshTaskboard={this._refreshTaskboard}
                    onNewParentDiscarded={setFocusOnHub}
                    aggregatedCapacityData={aggregatedCapacityData}
                    onDetailsPanelOptionsUpdated={this._handleDetailsPanelOptionsUpdated}
                    lookupFieldValue={this._lookupFieldValue}
                    teamId={team.id}
                    taskboardFilterContext={this._taskboardFilterContext}
                    filter={filter}
                />
            </div>
        );
    }

    private _renderRightPanel = (): JSX.Element => {
        const {
            sprintCapacityOptions,
            loadingStatus,
            teamCapacityModel,
            fieldAggregator,
            exceptionsInfo,
            droppableOptions,
            rightPanelId
        } = this.state;

        const panelData: ISprintViewRightPanelData = {
            loading: loadingStatus === LoadingStatus.Loading || loadingStatus === LoadingStatus.None,
            exceptionsInfo: exceptionsInfo,
            selectedContributionId: rightPanelId,
            eventHelper: null,
            getSelectedWorkItems: null,
            workDetailsData: {
                capacityOptions: sprintCapacityOptions,
                teamCapacityModel,
                fieldAggregator,
                capacityActions: null, // Taskboard doesn't trigger actions that update team members capacity.
                droppableWorkItemChangeOptions: droppableOptions
            }
        };

        return (
            <SprintViewRightPanel
                selectedIteration={this.props.selectedIteration}
                onDismiss={this._dismissRightPane}
                panelData={panelData}
                team={this.props.team}
                getWorkItemDragInfo={this._getWorkItemDraggingInformation}
                moveWorkItemsToIteration={this._moveWorkItemsToIteration}
            />
        );
    }

    private _renderAgileFilter = (): React.ReactElement<IFilterBarProps> => {
        if (this.state.isFilterBarOpen) {
            return (
                <AgileFilterBar
                    filter={this.props.filter}
                    filterContext={this._taskboardFilterContext}
                    onFilterChanged={this._onFilterChanged}
                    onDismissClicked={this._onFilterDismissClicked}
                />
            );
        }
    }

    private _onFilterDismissClicked = (): void => {
        this._toggleFilterBar();
    }

    protected shouldUpdateCommandsOnUpdate(nextProps: ISprintViewPivotContext, nextState: ITaskboardViewState): boolean {
        return nextProps.nextIteration !== this.props.nextIteration ||
            nextState.newWorkItemTypes !== this.state.newWorkItemTypes ||
            nextState.groupBy !== this.state.groupBy ||
            nextState.isNewWorkItemButtonDisabled !== this.state.isNewWorkItemButtonDisabled;
    }

    protected shouldUpdateViewActionsOnUpdate(nextProps: ISprintViewPivotContext, nextState: ITaskboardViewState): boolean {
        return nextState.groupBy !== this.state.groupBy ||
            nextState.parentPluralName !== this.state.parentPluralName ||
            nextState.loadingStatus !== this.state.loadingStatus ||
            this.props.selectedIteration !== nextProps.selectedIteration ||
            this.state.isFiltered !== nextState.isFiltered ||
            this.state.isFilterBarOpen !== nextState.isFilterBarOpen ||
            this.state.rightPanelId !== nextState.rightPanelId;
    }

    protected _onViewOptionsChanged = (value: IViewOptionsValues, action?: string): void => {
        if (this.state.groupBy && value[ViewActionKey.GROUP_BY_KEY]) {

            const groupByString = value[ViewActionKey.GROUP_BY_KEY] as TaskboardGroupBy;
            this._actionsCreator.groupByChanged(this.props.team.id, groupByString);
        }

        if (value.hasOwnProperty(ViewActionKey.RIGHT_PANEL)) { // If a contribution was toggled
            const newValue: string = value[ViewActionKey.RIGHT_PANEL];
            this.updateSplitterState(newValue);
            this._actionsCreator.setRightPanelId(newValue);
        }
    }

    private _toggleFilterBar = (): void => {
        if (this.state.isFilterBarOpen) {
            // The filter bar is being toggled OFF. Update initialFilterState.
            const filterContext = this._taskboardFilterContext.value;
            if (filterContext) {
                filterContext.initialFilterState = mapToFilterState(this.props.filter.getState());
            }
        }
        this._actionsCreator.toggleFilterBar(!this.state.isFilterBarOpen);
    }

    private _onFilterChanged = (filterState: IFilterState): void => {
        this._actionsCreator.saveFilterState(filterState);

        if (isFilterStateEmpty(mapToFilterState(filterState))) {
            this._actionsCreator.toggleFiltered(false);
        } else {
            this._actionsCreator.toggleFiltered(true);
        }
    }

    private _addNewItem = (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IPivotBarAction, workItemTypeName: string) => {
        if (this._taskboardRef) {
            this._taskboardRef.newItemRequested(workItemTypeName);
        }
    }

    private _setNewWorkItemButtonState = (disabled: boolean) => {
        this._actionsCreator.setNewWorkItemButtonState(disabled);
    }

    private _resolveTaskboardWrapperRef = (element: TaskboardWrapper) => {
        this._taskboardRef = element;
    }

    private _refreshTaskboard = () => {
        this._actionsCreator.reloadTaskboardData();
    }

    private _onStoreChanged = () => {
        this.setState(TaskboardSelector.getTaskboardViewState(this._store));
    }

    private _handleDetailsPanelOptionsUpdated = (options: ITaskboardDetailsPanelOptions): void => {
        if (!options) {
            return;
        }

        delay(this, 0, () => {
            this._actionsCreator.initializeRightPanelContext(options);
        });
    }

    private _lookupActivityFieldValue = (workItem: WorkItem): string => {
        const { sprintCapacityOptions, teamCapacityModel } = this.state;
        if (sprintCapacityOptions && teamCapacityModel) {
            return getActivityFieldValue(
                sprintCapacityOptions.activityFieldDisplayName,
                sprintCapacityOptions.allowedActivities,
                workItem,
                (assignedTo: string) => teamCapacityModel.getTeamMemberCapacity(assignedTo)
            );
        }

        return null;
    }

    private _lookupFieldValue = (workItem: WorkItem, fieldName: string): any => {
        let value = null;
        if (workItem && fieldName) {
            const { sprintCapacityOptions } = this.state;
            if (sprintCapacityOptions && equals(fieldName, sprintCapacityOptions.activityFieldReferenceName, true)) {
                value = this._lookupActivityFieldValue(workItem);
            } else { // try fetching it from the workItem
                value = workItem.getFieldValue(fieldName);
            }
        }

        return value;
    }

    /**
     * Sets up the hub shortcuts for the taskboard.  This is 'n' for add new item because
     * we must interact with the hub commands. Other shortcuts are setup in TaskBoardView.
     */
    private _setupTaskboardHubShortcuts() {
        const actions: SprintsHubTaskboardShortcutActions = {
            newItem: this._triggerAddNewItem,
            activateFilter: () => this._showFilter()
        };

        return new TaskboardShortcut(actions);
    }

    private _triggerAddNewItem = () => {
        // This will default to first when there are multiple work items on the backlog.
        // Waiting on US 1148097 to put focus on add button.
        this._addNewItem(null, null, this.state.newWorkItemTypes[0]);
    }

    private _showFilter = (skipFocus?: boolean): void => {
        if (skipFocus && this._taskboardFilterContext) {
            this._taskboardFilterContext.value.skipFocusOnMount = true;
            this._taskboardFilterContext.value.initialFilterState = mapToFilterState(this.state.initialFilterState);
        }

        this._actionsCreator.toggleFilterBar(true);
    }

    private _dismissRightPane = () => {
        this.props.viewOptions.setViewOption(ViewActionKey.RIGHT_PANEL, RightPanelKey.OFF);
        if (this._viewOptionsLearningBubble.current) {
            this._viewOptionsLearningBubble.current.showIfNeeded();
        }
    }

    private _getWorkItemDraggingInformation = ($tile: JQuery): IWorkItemDragInfo => {
        const workItemId: number = $tile.data(DataKeys.DataKeyId);
        const workItemType: string = $tile.data(DataKeys.DataKeyType);

        return {
            areAllItemsOwned: true,
            selectedWorkItemTypes: [workItemType],
            selectedWorkItemIds: [workItemId],
            topLevelWorkItemIds: [],
            topLevelWorkItemTypes: []
        }
    }

    private _moveWorkItemsToIteration = (workItemIds: number[], newIterationPath: string, $tile: JQuery): void => {
        this._taskboardRef.moveWorkItemToIteration(workItemIds[0], newIterationPath, $tile);
    }
}
