import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Backlog/Components/SprintViewBacklogPivot";
import { AddBacklogItemStatus } from "Agile/Scripts/Backlog/Backlog";
import { BacklogShortcutGroup } from "Agile/Scripts/Backlog/BacklogShortcutGroup";
import { TeamMemberCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { AgileFilterBar, IAgileFilterContext } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterBar";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { AddItemInsertLocation, BacklogAddItemCallout } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCallout";
import { BacklogPivotBarActionHelper, IActionOptions } from "Agile/Scripts/Common/Components/BacklogPivotBarActionHelper";
import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { FilterStatePersistenceManager } from "Agile/Scripts/Common/FilterStatePersistenceManager";
import { HubViewActions } from "Agile/Scripts/Common/HubViewActions";
import { SprintsHubConstants, SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { BacklogActions } from "Agile/Scripts/SprintsHub/Backlog/ActionsCreator/BacklogActions";
import { BacklogActionsCreator } from "Agile/Scripts/SprintsHub/Backlog/ActionsCreator/BacklogActionsCreator";
import { BacklogDataProvider } from "Agile/Scripts/SprintsHub/Backlog/ActionsCreator/BacklogDataProvider";
import { IBacklogRightPanelContext, IterationBacklogWrapper } from "Agile/Scripts/SprintsHub/Backlog/Components/BacklogWrapper";
import { BacklogSelector, ISprintViewBacklogPivotState } from "Agile/Scripts/SprintsHub/Backlog/Selectors/BacklogSelector";
import { BacklogStore } from "Agile/Scripts/SprintsHub/Backlog/Store/BacklogStore";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { SprintViewRightPanel } from "Agile/Scripts/SprintsHub/Common/SprintViewRightPanel";
import { SprintViewCommonViewActions } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintViewCommonViewActions";
import { SprintViewPivotBase } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintViewPivotBase";
import { ISprintViewPivotContext, ViewActionKey, RightPanelKey } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { DirectionalHint, ICalloutProps } from "OfficeFabric/Callout";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";
import { WorkZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import { urlHelper } from "VSS/Locations";
import { delay } from "VSS/Utils/Core";
import { IFilterBarItemProps } from "VSSUI/FilterBarItem";
import { IPivotBarAction, IPivotBarViewAction } from "VSSUI/PivotBar";
import { SplitterElementPosition } from "VSSUI/Splitter";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { ObservableValue } from "VSS/Core/Observable";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { ZeroData, ZeroDataActionType } from "VSSUI/ZeroData";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IFieldValueDictionary } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys, HubViewOptionsTargetSelector } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";
import { SplitView } from "Agile/Scripts/Common/Components/SplitView/SplitView";

@component("sprint-backlog-pivot")
export class SprintViewBacklogPivot extends SprintViewPivotBase<ISprintViewBacklogPivotState> {
    /** The actions creator for this pivot */
    private _actionsCreator: BacklogActionsCreator;
    /** The target element for the add item callout */
    private _addItemCalloutTarget: HTMLElement;
    /** The iteration backlog filter context */
    private _backlogFilterContext: ObservableValue<IAgileFilterContext>;
    /** The backlog wrapper component */
    private _backlogWrapper: IterationBacklogWrapper;
    /** Indicates whether the initial saved filter has been loaded */
    private _initialFilterSet: boolean;
    /** The store for this pivot */
    private _store: BacklogStore;
    /** The shortcuts for the pivot */
    private _backlogShortcuts: BacklogShortcutGroup;
    /** Parent element to catch backlog keyboard events */
    private _backlogShortcutElement: HTMLDivElement;
    /** Ref to the "learning bubble" which points to the view options menu */
    private _viewOptionsLearningBubble = React.createRef<LearningBubble>();


    constructor(props: ISprintViewPivotContext, context: any) {
        super(props, context);

        const actions = new BacklogActions();
        const dataProvider = new BacklogDataProvider();
        const filterManager = new FilterStatePersistenceManager(TfsSettingsScopeNames.WebTeam, props.team.id, SprintsHubConstants.HUB_NAME, SprintsHubRoutingConstants.SprintBacklogPivot);

        this._actionsCreator = new BacklogActionsCreator(actions, dataProvider, filterManager, this.props);
        this._store = new BacklogStore(actions);

        this.state = BacklogSelector.GetBacklogViewState(this._store);

        this._backlogFilterContext = new ObservableValue<IAgileFilterContext>({
            filterManager: null,
            initialFilterState: {},
            skipFocusOnMount: false
        });

        props.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);

        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillReceiveProps(nextProps: ISprintViewPivotContext): void {
        if (this.props.selectedIteration !== nextProps.selectedIteration) {
            delay(this, 0, () => {
                // When the iteration is changed in the header, this component is being re-rendered as part of an action higher up in the stack
                this._actionsCreator.reloadBacklogData(nextProps);
            });
        }
    }

    public componentWillUpdate(nextProps: ISprintViewPivotContext, nextState: ISprintViewBacklogPivotState) {
        super.componentWillUpdate(nextProps, nextState);

        if (!this._initialFilterSet && nextState.initialFilterState) {
            nextProps.filter.setState(nextState.initialFilterState);
            this._initialFilterSet = true;

            if (nextProps.filter.hasChangesToReset()) {
                delay(this, 0, () => {
                    this._showFilter(true /* skipFocus */);
                    this._actionsCreator.setFiltered(true);
                });
            }
        }
    }

    public componentDidMount() {
        super.componentDidMount();

        const {
            contributionId
        } = this.getSplitterState();

        this.props.viewOptions.setViewOption(ViewActionKey.RIGHT_PANEL, contributionId || RightPanelKey.PLANNING);

        this._actionsCreator.initializeRightPanelContributions();
        this._actionsCreator.initialize();

        this._setupKeyboardShortcuts();
    }

    public componentDidUpdate(previousProps: ISprintViewPivotContext, previousState: ISprintViewBacklogPivotState) {
        super.componentDidUpdate(previousProps, previousState);
        this._setupKeyboardShortcuts();

        if (previousState.isFilterBarOpen !== this.state.isFilterBarOpen ||
            previousState.rightPanelContributionId !== this.state.rightPanelContributionId) {
            // Delay, because when this function is called, the filter bar has not been rendered yet
            this._delayResizeBacklog();
        }
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.props.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._store.removeChangedListener(this._onStoreChanged);
        this._cleanupKeyboardShortcuts();
    }

    public isDataReady(): boolean {
        const {
            status
        } = this.state;
        return (status !== LoadingStatus.Loading && status !== LoadingStatus.None);
    }

    public render(): JSX.Element {
        const {
            backlogExceptions,
            status,
            rightPanelContributionId
        } = this.state;

        if (backlogExceptions && backlogExceptions.length > 0) {
            return (
                <HubError exceptionsInfo={backlogExceptions} />
            );
        }

        if (status === LoadingStatus.None) {
            return null;
        }

        return (
            <SplitView
                className="sprint-view-splitter"
                onRenderNearElement={this._renderMainContent}
                onRenderFarElement={rightPanelContributionId && rightPanelContributionId !== RightPanelKey.OFF && this._renderRightPanel}
                fixedElement={SplitterElementPosition.Far}
                registrySettingsPrefix="Agile/SprintsHub/Pivots/BacklogSplitView"
                onFixedSizeChanged={this._delayResizeBacklog}
            />
        );
    }

    private _renderRightPanel = (): JSX.Element => {
        return (
            <SprintViewRightPanel
                selectedIteration={this.props.selectedIteration}
                onDismiss={this._dismissRightPanel}
                panelData={BacklogSelector.getRightPanelState(this._store)}
                getWorkItemDragInfo={this._getWorkItemDragInfo}
                moveWorkItemsToIteration={this._moveWorkItemsToIteration}
                team={this.props.team}
            />
        );
    }

    private _renderMainContent = (): JSX.Element => {
        const {
            backlogContext,
            backlogGridData,
            status,
            aggregatedCapacityData,
            sprintCapacityOptions
        } = this.state;

        if (status === LoadingStatus.Loading) {
            return <LoadingComponent />;
        }

        return (
            <div
                ref={this._setKeyboardShortcutElementRef}
                className="backlog-pivot"
                role="main"
                aria-label={SprintsHubResources.SprintBacklogPivot}
            >
                <LearningBubble
                    ref={this._viewOptionsLearningBubble}
                    settingsKey={LearningBubbleSettingsKeys.RightPanelViewOptions}
                    target={HubViewOptionsTargetSelector}
                    text={AgileResources.PaneClosedLearningBubbleInfoText}
                    buttonLabel={AgileResources.PaneClosedLearningBubbleButtonText} />
                {this._renderAgileFilter()}
                {status === LoadingStatus.LoadedNoContent &&
                    <ZeroData
                        imagePath={urlHelper.getVersionedContentUrl(WorkZeroDataIllustrationPaths.NoWorkScheduled)}
                        imageAltText={SprintsHubResources.NoWorkScheduled}
                        primaryText={SprintsHubResources.NoWorkScheduled}
                        secondaryText={SprintsHubResources.ScheduleWork}
                        actionText={SprintsHubResources.PlanSprint}
                        actionType={ZeroDataActionType.ctaButton}
                        onActionClick={this.props.onPlanSprint as any}
                    />
                }
                <IterationBacklogWrapper
                    ref={this._setBacklogWrapperRef}
                    backlogContext={backlogContext}
                    backlogFilterContext={this._backlogFilterContext}
                    backlogGridData={backlogGridData}
                    filter={this.props.filter}
                    visible={status === LoadingStatus.LoadedWithContent}
                    aggregatedCapacity={aggregatedCapacityData}
                    sprintCapacityOptions={sprintCapacityOptions}
                    onRightPanelContextChanged={this._handleRightPanelContextChanged}
                    getTeamMemberCapacity={this._getTeamMemberCapacityModel}
                    onColumnOptionsChanged={this._onColumnOptionsChanged}
                />
                {this._renderAddItemCallout()}
            </div>
        );
    }

    private _renderAgileFilter = (): React.ReactElement<IFilterBarItemProps> => {
        if (this.state.isFilterBarOpen) {
            return (
                <AgileFilterBar
                    filter={this.props.filter}
                    filterContext={this._backlogFilterContext}
                    onFilterChanged={this._onFilterChanged}
                    onDismissClicked={this._onFilterDismissClicked}
                />
            );
        }
    }

    private _onFilterDismissClicked = (): void => {
        this._toggleFilterBar();
    }

    protected shouldUpdateCommandsOnUpdate(nextProps: ISprintViewPivotContext, nextState: ISprintViewBacklogPivotState): boolean {
        return nextProps.nextIteration !== this.props.nextIteration ||
            nextProps.previousIteration !== this.props.previousIteration ||
            nextState.status !== this.state.status ||
            nextState.activeWorkItemTypes !== this.state.activeWorkItemTypes ||

            nextState.isFiltered !== this.state.isFiltered;
    }

    protected shouldUpdateViewActionsOnUpdate(nextProps: ISprintViewPivotContext, nextState: ISprintViewBacklogPivotState): boolean {
        return this.state.rightPanelContributions !== nextState.rightPanelContributions ||
            this.props.selectedIteration !== nextProps.selectedIteration ||
            this.props.onOpenSettings !== nextProps.onOpenSettings ||
            this.state.isFilterBarOpen !== nextState.isFilterBarOpen ||
            nextState.isFiltered !== this.state.isFiltered ||
            nextState.rightPanelContributionId !== this.state.rightPanelContributionId;
    }

    protected getCommands(props: ISprintViewPivotContext, state: ISprintViewBacklogPivotState): IPivotBarAction[] {
        const isDisabled = !!this.state.backlogExceptions;
        const commands = [];

        commands.push(
            BacklogPivotBarActionHelper.getNewWorkItemPivotBarAction(this._getAddItemCommandOptions(state))
        );

        if (state.status !== LoadingStatus.LoadedNoContent) {
            commands.push(
                BacklogPivotBarActionHelper.getOpenColumnOptionsAction({
                    onClick: this._onOpenColumnOptions,
                    disabled: isDisabled
                }),
                BacklogPivotBarActionHelper.getCreateQueryAction({
                    onClick: this._onCreateQuery,
                    disabled: isDisabled
                }),
                BacklogPivotBarActionHelper.getSendEmailAction({
                    onClick: this._onSendEmail,
                    disabled: isDisabled
                })
            );
        }

        return commands;
    }

    protected getViewActions(props: ISprintViewPivotContext, state: ISprintViewBacklogPivotState): IPivotBarViewAction[] {
        const viewActions = SprintViewCommonViewActions.getViewActions(props, false /* disabled */, true /* includePlanning */, state.rightPanelContributionId, state.rightPanelContributions);
        viewActions.push(HubViewActions.getFilterAction(this._toggleFilterBar, state.isFiltered));
        return viewActions;
    }

    protected _getTeamMemberCapacityModel = (assignedTo: string): TeamMemberCapacityModel => {
        const { teamCapacityModel } = this.state;
        if (assignedTo && teamCapacityModel) {
            return teamCapacityModel.getTeamMemberCapacity(assignedTo);
        }
        return null;
    }

    protected _onViewOptionsChanged = (value: IViewOptionsValues, action?: string): void => {
        if (value.hasOwnProperty(HubViewOptionKeys.fullScreen)) {
            this._backlogWrapper.resize();
        }

        if (value.hasOwnProperty(ViewActionKey.RIGHT_PANEL)) { // If a contribution was toggled
            const newValue = value[ViewActionKey.RIGHT_PANEL];
            this.updateSplitterState(newValue);
            this._actionsCreator.setRightPanelState(newValue);
        }
    }

    private _delayResizeBacklog = (): void => {
        delay(this, 0, () => {
            if (this._backlogWrapper) {
                this._backlogWrapper.resize();
            }
        });
    }

    private _setKeyboardShortcutElementRef = (ref: HTMLDivElement) => {
        this._backlogShortcutElement = ref;
        // Ref changed, we need to reset keyboard shortcuts
        this._cleanupKeyboardShortcuts();
    }

    private _setBacklogWrapperRef = (ref: IterationBacklogWrapper) => {
        this._backlogWrapper = ref;
    }

    private _onFilterChanged = (filterState: IFilterState): void => {
        this._actionsCreator.saveFilterState(filterState);

        if (isFilterStateEmpty(mapToFilterState(filterState))) {
            this._actionsCreator.setFiltered(false);
        } else {
            this._actionsCreator.setFiltered(true);
        }
    }

    private _onStoreChanged = (): void => {
        const newState = BacklogSelector.GetBacklogViewState(this._store);
        this.setState(newState);
    }

    private _onOpenColumnOptions = (): void => {
        this._backlogWrapper.openColumnOptions();
    }

    private _onColumnOptionsChanged = (): void => {
        this._actionsCreator.reloadBacklogData(this.props);
    }

    private _onCreateQuery = (): void => {
        this._backlogWrapper.createQuery();
    }

    private _onSendEmail = (): void => {
        this._backlogWrapper.sendEmail();
    }

    private _toggleFilterBar = (): void => {
        if (this.state.isFilterBarOpen) {
            // The filter bar is being toggled OFF. Update initialFilterState.
            const filterContext = this._backlogFilterContext.value;
            if (filterContext) {
                filterContext.initialFilterState = mapToFilterState(this.props.filter.getState());
            }
        }
        this._actionsCreator.toggleFilterBar(!this.state.isFilterBarOpen);
    }

    private _showFilter = (skipFocus?: boolean): void => {
        if (skipFocus && this._backlogFilterContext) {
            this._backlogFilterContext.value.skipFocusOnMount = true;
            this._backlogFilterContext.value.initialFilterState = mapToFilterState(this.state.initialFilterState);
        }

        this._actionsCreator.toggleFilterBar(true);
    }

    private _addNewItemViewAction = (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IPivotBarAction) => {
        if (this.state.showAddItemCallout) {
            // The callout is being showed, close it
            this._onAddNewItemDismiss();
        } else {
            // Otherwise save target and show callout
            this._addItemCalloutTarget = e.currentTarget;
            this._actionsCreator.openNewItemCallout();
        }
    }

    private _onAddNewItemDismiss = () => {
        this._actionsCreator.closeNewItemCallout();
        this._addItemCalloutTarget = null;
        // Hide the insertion line
        if (this._backlogWrapper) {
            this._backlogWrapper.toggleInsertionLine(false /*show*/);
        }
    }

    private _handleRightPanelContextChanged = (context: IBacklogRightPanelContext): void => {
        delay(this, 0, () => {
            this._actionsCreator.initializeRightPanelContext(context);
        });
    }

    private _dismissRightPanel = () => {
        this.props.viewOptions.setViewOption(ViewActionKey.RIGHT_PANEL, RightPanelKey.OFF);
        if (this._viewOptionsLearningBubble.current) {
            this._viewOptionsLearningBubble.current.showIfNeeded();
        }
    }

    private _renderAddItemCallout(): JSX.Element {
        if (!this.state.showAddItemCallout) {
            // Callout should not be shown
            return null;
        }
        const calloutProps: ICalloutProps = {
            target: this._addItemCalloutTarget,
            onDismiss: this._onAddNewItemDismiss,
            isBeakVisible: true,
            directionalHint: DirectionalHint.rightCenter,
            preventDismissOnScroll: true
        };

        // Get backlog configuration
        const backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration().requirementBacklog;

        // Return new add callout
        return (
            <BacklogAddItemCallout
                filterApplied={this.props.filter.hasChangesToReset()}
                onInsertLocationChanged={this._onCalloutInsertionLocationUpdate}
                calloutProps={calloutProps}
                workItemTypes={backlogConfiguration.workItemTypes}
                additionalFieldReferenceNames={backlogConfiguration.addPanelFields}
                defaultWorkItemType={backlogConfiguration.defaultWorkItemType}
                onSubmit={this._addNewItem}
                calloutId="SprintsHub"
            />
        );
    }

    private _addNewItem = (workItemTypeName: string, fields: IFieldValueDictionary, location: AddItemInsertLocation) => {
        if (this._backlogWrapper) {
            this._backlogWrapper.addWorkItem(workItemTypeName, fields, location).then(({ status, continuationPromise }) => {
                if (status === AddBacklogItemStatus.Added) {
                    this._actionsCreator.backlogItemAdded();
                } else if (status === AddBacklogItemStatus.WorkItemFormOpened) {
                    this._actionsCreator.closeNewItemCallout();
                    if (continuationPromise) {
                        continuationPromise.then((success: boolean) => {
                            if (success) {
                                this._actionsCreator.backlogItemAdded();
                            }
                        });
                    }
                }
            }, (error) => {
                // Handle errors
            });
        }
    }

    private _onCalloutInsertionLocationUpdate = (insertLocation: AddItemInsertLocation): void => {
        // Update backlog insertion line
        if (this._backlogWrapper) {
            this._backlogWrapper.toggleInsertionLine(true /*show*/, insertLocation);
        }
    }

    private _setupKeyboardShortcuts() {
        if (!this._backlogShortcuts && this._backlogWrapper && this._backlogWrapper.getIterationBacklog()) {
            this._backlogShortcuts = new BacklogShortcutGroup({
                getTeamId: () => this.state.backlogContext.team.id,
                getBacklog: () => this._backlogWrapper.getIterationBacklog(),
                backlogElement: this._backlogShortcutElement,
                activateFilter: () => this._showFilter()
            });
        }
    }

    private _cleanupKeyboardShortcuts() {
        if (this._backlogShortcuts) {
            this._backlogShortcuts.removeShortcutGroup();
            this._backlogShortcuts = null;
        }
    }

    private _getAddItemCommandOptions(state: ISprintViewBacklogPivotState): IActionOptions {
        let disabled: boolean = false;
        let tooltip: string = null;

        if (state.activeWorkItemTypes && state.activeWorkItemTypes.length < 1) {
            disabled = true;
            tooltip = SprintsHubResources.BacklogAddItemButton_Disabled_NoWorkItemTypes;
        } else if (state.isFiltered) {
            disabled = true;
            tooltip = SprintsHubResources.BacklogAddItemButton_Disabled_Filter;
        }

        return {
            disabled: disabled,
            tooltip: tooltip,
            onClick: this._addNewItemViewAction
        };
    }

    private _getWorkItemDragInfo = (): IWorkItemDragInfo => {
        if (this._backlogWrapper) {
            return this._backlogWrapper.getDraggingWorkItemInformation();
        } else {
            throw new Error("The Product Backlog is not yet available");
        }
    }

    private _moveWorkItemsToIteration = (workItemIds: number[], newIterationPath: string): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.moveWorkItemsToIteration(workItemIds, newIterationPath);
        } else {
            throw new Error("The Product Backlog is not yet available");
        }
    }
}
