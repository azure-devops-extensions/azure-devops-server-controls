import { AddBacklogItemStatus } from "Agile/Scripts/Backlog/Backlog";
import { BacklogShortcutGroup } from "Agile/Scripts/Backlog/BacklogShortcutGroup";
import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import { IBacklogPivotContext } from "Agile/Scripts/BacklogsHub/BacklogHubContracts";
import { BacklogDataProvider } from "Agile/Scripts/BacklogsHub/BacklogPivot/ActionsCreator/BacklogDataProvider";
import { BacklogPivotActions } from "Agile/Scripts/BacklogsHub/BacklogPivot/ActionsCreator/BacklogPivotActions";
import { BacklogPivotActionsCreator, IBacklogPivotActionsCreator } from "Agile/Scripts/BacklogsHub/BacklogPivot/ActionsCreator/BacklogPivotActionsCreator";
import { BacklogPaneIds } from "Agile/Scripts/BacklogsHub/BacklogPivot/BacklogPivotContracts";
import { BacklogPivotSettings } from "Agile/Scripts/BacklogsHub/BacklogPivot/BacklogPivotSettings";
import { ProductBacklogWrapper } from "Agile/Scripts/BacklogsHub/BacklogPivot/Components/ProductBacklogWrapper";
import { IBacklogPivotState, getState } from "Agile/Scripts/BacklogsHub/BacklogPivot/Selectors/BacklogPivotSelector";
import { BacklogPivotStore, IBacklogPivotStore } from "Agile/Scripts/BacklogsHub/BacklogPivot/Store/BacklogPivotStore";
import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";
import { MappingPane } from "Agile/Scripts/BacklogsHub/Mapping/Components/MappingPane";
import { PlanningView } from "Agile/Scripts/BacklogsHub/Planning/Components/PlanningView";
import { AgileFilterBar, IAgileFilterContext } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterBar";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { AddItemInsertLocation, BacklogAddItemCallout } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCallout";
import { BacklogContributionRightPanel } from "Agile/Scripts/Common/Components/BacklogPivot/BacklogContributionRightPanel";
import { BacklogPivotBarActionHelper, IActionOptions } from "Agile/Scripts/Common/Components/BacklogPivotBarActionHelper";
import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { PivotItemContent } from "Agile/Scripts/Common/Components/PivotItemContent";
import { SplitView } from "Agile/Scripts/Common/Components/SplitView/SplitView";
import { FilterStatePersistenceManager } from "Agile/Scripts/Common/FilterStatePersistenceManager";
import { BacklogsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BoardsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { HubViewActions } from "Agile/Scripts/Common/HubViewActions";
import { HubMessages } from "Agile/Scripts/Common/Messages/HubMessages";
import { HubMessagesActions } from "Agile/Scripts/Common/Messages/HubMessagesActions";
import { HubMessagesActionsCreator, IHubMessagesActionsCreator } from "Agile/Scripts/Common/Messages/HubMessagesActionsCreator";
import { HubMessagesStore, IHubMessagesStore } from "Agile/Scripts/Common/Messages/HubMessagesStore";
import { getLevelSelectorViewAction } from "Agile/Scripts/Common/ViewActions/BacklogLevelSelectorViewAction";
import { AgileRouteParameters, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import * as BacklogContentViewResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { DirectionalHint, ICalloutProps } from "OfficeFabric/Callout";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";
import { WorkZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import { publishErrorToTelemetry } from "VSS/Error";
import { getRunningDocumentsTable } from "VSS/Events/Document";
import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/BacklogPivot/Components/BacklogPivot";
import { urlHelper } from "VSS/Locations";
import { announce } from "VSS/Utils/Accessibility";
import { first } from "VSS/Utils/Array";
import { delay } from "VSS/Utils/Core";
import { equals, format } from "VSS/Utils/String";
import { IFilterBarItemProps } from "VSSUI/FilterBarItem";
import { IChoiceGroupViewActionOption, IPivotBarAction, IPivotBarViewAction, IPivotBarViewActionProps, PivotBarViewActionType } from "VSSUI/PivotBar";
import { SplitterElementPosition } from "VSSUI/Splitter";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { ObservableValue } from "VSS/Core/Observable";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { VssIconType } from "VSSUI/VssIcon";
import { ZeroData } from "VSSUI/ZeroData";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IFieldValueDictionary } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { DelayTTIComponent } from "Agile/Scripts/Common/Components/DelayTTIComponent";
import * as React from "react";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys, HubViewOptionsTargetSelector } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";

const enum MessageIds {
    NavigationBlocked = "NavigationBlocked",
    ForecastingDisabled = "ForecastingDisabled"
}

@component("backlogs-backlog-pivot")
export class BacklogPivot extends PivotItemContent<IBacklogPivotContext, IBacklogPivotState> {
    /** The backlog grid filter context */
    private _backlogFilterContext: ObservableValue<IAgileFilterContext>;
    /** The actions creator that drives this view */
    private _backlogPivotActionsCreator: IBacklogPivotActionsCreator;
    /** The store that drives this view */
    private _backlogPivotStore: IBacklogPivotStore;
    /** Indicates whether the initial saved filter has been loaded */
    private _initialFilterSet: boolean;
    /** The messages action creator */
    private _messagesActionsCreator: IHubMessagesActionsCreator;
    /** The messages store */
    private _messagesStore: IHubMessagesStore;
    /** The backlog wrapper ref */
    private _backlogWrapper: ProductBacklogWrapper;
    /** The target of the add item callout */
    private _addItemCalloutTarget: HTMLElement;
    private _backlogShortcuts: BacklogShortcutGroup;

    private _viewOptionsLearningBubble = React.createRef<LearningBubble>();

    constructor(props: IBacklogPivotContext, context?: any) {
        super(props, context, BacklogsHubConstants.HUB_NAME, props.pivotName);

        // Messages
        const messagesActions = new HubMessagesActions();
        this._messagesActionsCreator = new HubMessagesActionsCreator(messagesActions);
        this._messagesStore = new HubMessagesStore(messagesActions);

        // Backlog
        const actions = new BacklogPivotActions();
        const dataProvider = new BacklogDataProvider();
        const filterPersistenceManager = new FilterStatePersistenceManager(TfsSettingsScopeNames.WebTeam, props.team.id, BacklogsHubConstants.HUB_NAME, BacklogsHubConstants.BacklogPivot, [props.currentBacklog.name]);
        this._backlogPivotActionsCreator = new BacklogPivotActionsCreator(actions, dataProvider, filterPersistenceManager);
        this._backlogPivotStore = new BacklogPivotStore(actions);

        this.state = getState(this._backlogPivotStore);

        this._backlogFilterContext = new ObservableValue<IAgileFilterContext>({
            filterManager: null,
            initialFilterState: {},
            skipFocusOnMount: false
        });
    }

    public componentWillMount(): void {
        super.componentWillMount();

        // ViewOptions - Set all the initial states before subscribing to changes
        const paneId = this.setViewOptionsInitialState();
        this.props.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);

        this._messagesStore.addChangedListener(this._delayResizeBacklog);
        this._backlogPivotStore.addChangedListener(this._onStoreChanged);
        this._backlogPivotActionsCreator.initialize();

        this._backlogPivotActionsCreator.updateActiveRightPane(paneId);

        this._setupKeyboardShortcuts();
    }

    public componentWillReceiveProps(nextProps: IBacklogPivotContext): void {
        if (equals(this.state.paneId, BacklogPaneIds.Mapping, true /*ignore case*/) && !nextProps.nextBacklog) {
            nextProps.viewOptions.setViewOption(BacklogsHubConstants.PaneParameter, BacklogPaneIds.Off);
        }
    }

    public componentWillUpdate(nextProps: IBacklogPivotContext, nextState: IBacklogPivotState) {
        super.componentWillUpdate(nextProps, nextState);

        if (!this._initialFilterSet && nextState.initialFilterState) {
            nextProps.filter.setState(nextState.initialFilterState);
            this._initialFilterSet = true;

            if (nextProps.filter.hasChangesToReset()) {
                delay(this, 0, () => {
                    this._showFilter(true /* skipFocus */);
                    this._backlogPivotActionsCreator.toggleFiltered(true);
                });
            }
        }

        if (this.state.status === LoadingStatus.Loading && nextState.status !== LoadingStatus.Loading) {
            if (nextState.backlogEmpty) {
                // announce zero data
                announce(format(BacklogContentViewResources.Backlog_NoItems, nextProps.currentBacklog.name), true);
            }
            if (nextState.exceptionInfo) {
                // announce error
                announce(format(BacklogContentViewResources.Backlog_LoadError, nextProps.currentBacklog.name, nextState.exceptionInfo.exceptionMessage), true);
            }
        }

        this._setupKeyboardShortcuts();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._cleanupKeyboardShortcuts();
        this._messagesStore.removeChangedListener(this._delayResizeBacklog);
        this._backlogPivotStore.removeChangedListener(this._onStoreChanged);

        this.props.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
    }

    public componentDidUpdate(previousProps: IBacklogPivotContext, previousState: IBacklogPivotState): void {
        super.componentDidUpdate(previousProps, previousState);
        if (this._backlogWrapper) {
            if (previousState.paneId !== this.state.paneId ||
                previousState.isFilterBarOpen !== this.state.isFilterBarOpen) {
                // Resize the backlog if we toggled the planning view or filter bar
                this._delayResizeBacklog();
            }
        }
    }

    public isDataReady(): boolean {
        const { status } = this.state;
        return status !== LoadingStatus.Loading;
    }

    public executeAfterTTI(): void {
        this._backlogPivotActionsCreator.initializeRightPanelContributions();
    }

    public render(): JSX.Element {
        return (
            <SplitView
                className="split-view"
                onRenderNearElement={this._renderMainContent}
                onRenderFarElement={!equals(this.state.paneId, BacklogPaneIds.Off, true) ? this._renderRightPanel : undefined}
                fixedElement={SplitterElementPosition.Far}
                registrySettingsPrefix="Agile/BacklogsHub/Pivots/Backlog/Content/SplitView"
                onFixedSizeChanged={this._delayResizeBacklog}
            />
        );
    }

    private _renderMainContent = (): JSX.Element => {
        const {
            backlogContext,
            backlogEmpty,
            backlogPayload,
            exceptionInfo,
            isInitialLoad,
            eventHelper,
            status
        } = this.state;

        if (status === LoadingStatus.Loading) {
            if (isInitialLoad) {
                // Don't show the loading indicator as the hub will have one.
                return null;
            } else {
                // This can occur on level switches, changing showParents, etc
                return <LoadingComponent />;
            }
        }

        if (status === LoadingStatus.ErrorLoadingData && exceptionInfo) {
            return (
                <HubError
                    exceptionsInfo={[exceptionInfo]}
                />
            );
        }

        return (
            <div className="product-backlog-pivot" role="main" aria-label={BacklogContentViewResources.Backlog} ref={this._resolveProductBacklogContainer}>
                <LearningBubble
                    ref={this._viewOptionsLearningBubble}
                    settingsKey={LearningBubbleSettingsKeys.RightPanelViewOptions}
                    target={HubViewOptionsTargetSelector}
                    text={AgileResources.PaneClosedLearningBubbleInfoText}
                    buttonLabel={AgileResources.PaneClosedLearningBubbleButtonText} />
                {this._onRenderFilterBar()}
                <div className="backlog-container">
                    {backlogEmpty &&
                        (
                            <ZeroData
                                imagePath={urlHelper.getVersionedContentUrl(WorkZeroDataIllustrationPaths.NoWorkScheduled)}
                                imageAltText={BacklogContentViewResources.GetStartedProductBacklog}
                                primaryText={BacklogContentViewResources.GetStartedProductBacklog}
                                secondaryText={(
                                    <div>
                                        <div>
                                            {BacklogContentViewResources.CreateWorkItemSuggestion}
                                        </div>
                                        <a target="_blank" href="https://go.microsoft.com/fwlink/?linkid=867428">
                                            {BacklogContentViewResources.LearnMoreAboutBacklogs}
                                        </a>
                                    </div>
                                )}
                            />
                        )
                    }
                    <HubMessages
                        actionsCreator={this._messagesActionsCreator}
                        store={this._messagesStore}
                    />
                    <ProductBacklogWrapper
                        ref={this._resolveBacklogRef}
                        backlogContext={backlogContext}
                        backlogFilterContext={this._backlogFilterContext}
                        filter={this.props.filter}
                        backlogPayload={backlogPayload}
                        visible={!backlogEmpty}
                        addMessage={this._addMessage}
                        removeMessage={this._removeMessage}
                        forecastingOn={this.props.viewOptions.getViewOption(BacklogsHubConstants.ForecastingParameter)}
                        onColumnOptionsChanged={this._onColumnOptionsChanged}
                        eventHelper={eventHelper}
                        newBacklogLevelsSignature={this.props.newBacklogLevelsSignature}
                    />
                </div>
                {this._renderAddItemCallout()}
            </div >
        );
    }
    protected setViewOptionsInitialState(): string {
        //  Show Parents - Use the query string if it is defined
        const showParents = this.props.viewOptions.getViewOption(BacklogsHubConstants.ShowParentsQueryParameter) != null ?
            this.props.viewOptions.getViewOption(BacklogsHubConstants.ShowParentsQueryParameter) :
            BacklogPivotSettings.getSetting<boolean>(BacklogsHubConstants.ShowParentsSetting, /*defaultValue*/false);

        if (showParents) {
            this.props.viewOptions.setViewOption(BacklogsHubConstants.ShowParentsQueryParameter, showParents);
            // Make sure forecasting is off if showParents is on
            this.props.viewOptions.setViewOption(BacklogsHubConstants.ForecastingParameter, false);
        } else {
            // Forecasting
            const forecasting = BacklogPivotSettings.getSetting<boolean>(BacklogsHubConstants.ForecastingSetting, /*defaultValue*/false);
            this.props.viewOptions.setViewOption(BacklogsHubConstants.ForecastingParameter, forecasting);
        }

        //  In Progress
        const inProgress = BacklogPivotSettings.getSetting<boolean>(BacklogsHubConstants.InProgressSetting, /*defaultValue*/true);
        this.props.viewOptions.setViewOption(BacklogsHubConstants.InProgressParameter, inProgress);

        //  Right Pane - Use query string if it is defined.
        const rightPaneQueryParam = this.props.viewOptions.getViewOption(BacklogsHubConstants.RightPaneQueryParameter);
        let pane = rightPaneQueryParam ?
            this.props.viewOptions.getViewOption(BacklogsHubConstants.RightPaneQueryParameter) :
            BacklogPivotSettings.getSetting<string>(BacklogsHubConstants.PaneSetting, BacklogPaneIds.Planning);
        if (equals(pane, BacklogPaneIds.Mapping, true) && !this.props.nextBacklog) {
            pane = BacklogPaneIds.Off;
        }

        if (equals(pane, BacklogPaneIds.Planning, true) && !this.props.hasIterations) {
            pane = BacklogPaneIds.Off;
        }

        this.props.viewOptions.setViewOption(BacklogsHubConstants.PaneParameter, pane);

        if (rightPaneQueryParam) {
            //  Removing right pane URL query string, if found in URL.
            this.props.viewOptions.setViewOption(BacklogsHubConstants.RightPaneQueryParameter, null);
        }

        return pane;
    }

    protected _onRenderFilterBar(): React.ReactElement<IFilterBarItemProps> {
        if (this.state.isFilterBarOpen) {
            return (
                <div className="product-backlog-filter">
                    <AgileFilterBar
                        filter={this.props.filter}
                        filterContext={this._backlogFilterContext}
                        onFilterChanged={this._onFilterChanged}
                        onDismissClicked={this._onFilterDismissClicked}
                    />
                </div>
            );
        }
    }

    private _onFilterDismissClicked = (): void => {
        this._toggleFilterBar();
    }

    protected shouldUpdateCommandsOnUpdate(nextProps: IBacklogPivotContext, nextState: IBacklogPivotState): boolean {
        return this.state.status !== nextState.status ||
            this.state.isFiltered !== nextState.isFiltered ||
            this.props.pivotName !== nextProps.pivotName;
    }

    protected shouldUpdateViewActionsOnUpdate(nextProps: IBacklogPivotContext, nextState: IBacklogPivotState): boolean {
        return this.state.status !== nextState.status ||
            this.props.pivotName !== nextProps.pivotName ||
            this.props.currentBacklog !== nextProps.currentBacklog ||
            this.state.backlogPayload !== nextState.backlogPayload ||
            this.state.backlogContext !== nextState.backlogContext ||
            this.state.isFiltered !== nextState.isFiltered ||
            this.state.rightPanelContributions !== nextState.rightPanelContributions;
    }

    protected getCommands(props: IBacklogPivotContext, state: IBacklogPivotState): IPivotBarAction[] {
        const {
            currentBacklog,
            team
        } = props;

        const isDisabled = state.status !== LoadingStatus.LoadedWithContent;
        const commands: IPivotBarAction[] = [];

        commands.push(
            BacklogPivotBarActionHelper.getNewWorkItemPivotBarAction(this._addItemCommandOptions(state))
        );

        const matchingBoardUrl = BoardsUrls.getBoardsContentUrl(team.name, currentBacklog.name);

        commands.push({
            key: "matching-board",
            name: BacklogContentViewResources.ViewAsBoard,
            iconProps: {
                iconName: "bowtie-navigate-forward-circle",
                iconType: VssIconType.bowtie
            },
            href: matchingBoardUrl,
            important: true,
            onClick: (ev: React.MouseEvent<HTMLElement>) => {
                if (ev && (ev.ctrlKey || ev.metaKey)) {
                    return;
                }

                ev.preventDefault();
                const url = BoardsUrls.getBoardsContentUrl(team.name, currentBacklog.name);
                BoardsUrls.navigateToBoardsHubUrl(url);

                BacklogsHubTelemetryHelper.publishTelemetry(
                    BacklogsHubTelemetryConstants.SWITCH_TO_MATCHING_BOARD,
                    {
                        [AgileRouteParameters.BacklogLevel]: currentBacklog.name
                    });
            }
        });

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

        return commands;
    }

    protected getViewActions(props: IBacklogPivotContext, state: IBacklogPivotState): IPivotBarViewAction[] {
        const {
            visibleBacklogLevels,
            viewOptions
        } = props;

        const viewActions: IPivotBarAction[] = [];
        const disabled = state.status === LoadingStatus.Loading;
        // Show parents is available as long as we aren't on the root backlog level
        const isShowParentsVisible = !state.isRootBacklog;
        // Forecasting is available as long as we're on the requirement backlog
        const isForecastingVisible = state.isRequirementsBacklog;

        let isForecastingDisabled = disabled;
        let forecastingTooltip: string = null;

        if (props.viewOptions.getViewOption(BacklogsHubConstants.ShowParentsQueryParameter)) {
            // Forecasting is disabled if show parents is on
            isForecastingDisabled = true;
            forecastingTooltip = BacklogContentViewResources.Forecasting_DisabledWhileShowParents;
        } else if (state.isFiltered) {
            // Forecasting is disable if filtering is on
            isForecastingDisabled = true;
            forecastingTooltip = BacklogContentViewResources.Forecasting_DisabledWhileFiltering;
        }

        viewActions.push(getLevelSelectorViewAction(
            visibleBacklogLevels,
            viewOptions,
            () => (!this._backlogWrapper || !this._backlogWrapper.getProductBacklog().hasUncommitedChanges()) && !getRunningDocumentsTable().isModified(),
            "Backlog",
            { iconName: "BacklogList", iconType: VssIconType.fabric },
            () => {
                this._messagesActionsCreator.addMessage({
                    id: MessageIds.NavigationBlocked,
                    message: BacklogContentViewResources.Navigation_PendingChanges,
                    messageType: MessageBarType.warning,
                    closeable: true
                });
            }));
        viewActions.push(HubViewActions.getCommonSettings(this._onOpenSettings));
        viewActions.push(HubViewActions.getFilterAction(this._toggleFilterBar, state.isFiltered));

        // Add the "showParents" option if this isn't the root level
        if (isShowParentsVisible) {
            const showParentsAction: IPivotBarViewAction = {
                ariaLabel: BacklogContentViewResources.Parents_ViewAction,
                key: BacklogsHubConstants.ShowParentsQueryParameter,
                disabled,
                actionType: PivotBarViewActionType.OnOff,
                name: BacklogContentViewResources.Parents_ViewAction
            };

            viewActions.push(showParentsAction);
        }

        if (isForecastingVisible) {
            const forecastingAction: IPivotBarViewAction = {
                ariaLabel: BacklogContentViewResources.Forecasting,
                key: BacklogsHubConstants.ForecastingParameter,
                disabled: isForecastingDisabled,
                actionType: PivotBarViewActionType.OnOff,
                name: BacklogContentViewResources.Forecasting,
                title: forecastingTooltip
            };
            viewActions.push(forecastingAction);
        }

        const inProgressAction: IPivotBarViewAction = {
            ariaLabel: BacklogContentViewResources.InProgress_ViewAction,
            key: BacklogsHubConstants.InProgressParameter,
            actionType: PivotBarViewActionType.OnOff,
            name: BacklogContentViewResources.InProgress_ViewAction
        };

        viewActions.push(inProgressAction);
        viewActions.push(this._getRightPaneViewAction(props, state));

        return viewActions;
    }

    protected _onViewOptionsChanged = (value: IViewOptionsValues, action?: string) => {
        if (value.hasOwnProperty(HubViewOptionKeys.fullScreen) && this._backlogWrapper) {
            this._backlogWrapper.resize();
        }

        if (value.hasOwnProperty(BacklogsHubConstants.ShowParentsQueryParameter)) {
            if (value[BacklogsHubConstants.ShowParentsQueryParameter] && this.props.viewOptions.getViewOption(BacklogsHubConstants.ForecastingParameter)) {
                // Explicitly turn off forecasting (if it was on) when the user turns on showParents
                BacklogPivotSettings.setMRU(BacklogsHubConstants.ForecastingSetting, this.props.team.id, false);
                const options: IViewOptionsValues = this.props.viewOptions.getViewOptions();
                options[BacklogsHubConstants.ForecastingParameter] = false;
                this.props.viewOptions.setViewOptions(options);

                if (this.state.isRequirementsBacklog) {
                    this._messagesActionsCreator.addMessage({
                        id: MessageIds.ForecastingDisabled,
                        message: BacklogContentViewResources.Forecasting_DisabledWhileShowParents,
                        messageType: MessageBarType.info,
                        closeable: true
                    });
                }
            } else if (!value[BacklogsHubConstants.ShowParentsQueryParameter]) {
                // Dismiss the message if it is still there
                this._messagesActionsCreator.clearPageMessage(MessageIds.ForecastingDisabled);
            }

            if (!value[BacklogsHubConstants.ShowParentsQueryParameter]) {
                this._messagesActionsCreator.clearPageMessage(MessageIds.ForecastingDisabled);
            }

            BacklogPivotSettings.setMRU(BacklogsHubConstants.ShowParentsSetting, this.props.team.id, value[BacklogsHubConstants.ShowParentsQueryParameter]);

            // Reload the backlog data with the new query parameter
            this._reloadBacklogWithParameters();
        }

        if (value.hasOwnProperty(BacklogsHubConstants.ForecastingParameter) && this._backlogWrapper) {
            BacklogPivotSettings.setMRU(BacklogsHubConstants.ForecastingSetting, this.props.team.id, value[BacklogsHubConstants.ForecastingParameter]);
            this._backlogWrapper.toggleForecasting(value[BacklogsHubConstants.ForecastingParameter]);
        }

        if (value.hasOwnProperty(BacklogsHubConstants.InProgressParameter)) {
            const canSwitchLevels: boolean = (!this._backlogWrapper || !this._backlogWrapper.getProductBacklog().hasUncommitedChanges()) && !getRunningDocumentsTable().isModified();
            if (canSwitchLevels) {
                BacklogPivotSettings.setMRU(BacklogsHubConstants.InProgressSetting, this.props.team.id, value[BacklogsHubConstants.InProgressParameter]);

                // Reload the backlog data with the new query parameter
                this._reloadBacklogWithParameters();
            } else {
                // we can't toggle 'In Progress' - revert the state of the toggle
                const options: IViewOptionsValues = this.props.viewOptions.getViewOptions();
                options[BacklogsHubConstants.InProgressParameter] = !value[BacklogsHubConstants.InProgressParameter];
                this.props.viewOptions.setViewOptions(options);

                // display warning banner - can't toggle 'in progress' when have pending changes
                this._messagesActionsCreator.addMessage({
                    id: MessageIds.NavigationBlocked,
                    message: BacklogContentViewResources.Navigation_PendingChanges,
                    messageType: MessageBarType.warning,
                    closeable: true
                });
            }
        }

        if (value.hasOwnProperty(BacklogsHubConstants.PaneParameter)) {
            BacklogPivotSettings.setMRU(BacklogsHubConstants.PaneSetting, this.props.team.id, value[BacklogsHubConstants.PaneParameter]);
            this._backlogPivotActionsCreator.updateActiveRightPane(value[BacklogsHubConstants.PaneParameter]);
        }

        if (value.hasOwnProperty(AgileRouteParameters.BacklogLevel)) {
            this._messagesActionsCreator.clearPageMessage(MessageIds.NavigationBlocked);

            this._initialFilterSet = false;
            this._backlogPivotActionsCreator.toggleFiltered(false);
            this._backlogPivotActionsCreator.updateFilterStatePersistenceManager(
                new FilterStatePersistenceManager(
                    TfsSettingsScopeNames.WebTeam,
                    this.props.team.id,
                    BacklogsHubConstants.HUB_NAME,
                    BacklogsHubConstants.BacklogPivot,
                    [value[AgileRouteParameters.BacklogLevel]]
                )
            );

            this._reloadBacklogWithParameters();
        }
    }

    private _renderRightPanel = (): JSX.Element => {
        if (!this._shouldShowRightPanel()) {
            return null;
        }

        return (
            <DelayTTIComponent showLoading={true}>
                {
                    this._renderRightPanelContent
                }
            </DelayTTIComponent>
        );
    }

    private _renderRightPanelContent = (): JSX.Element => {
        const {
            currentBacklog,
            nextBacklog,
            team
        } = this.props;

        const {
            eventHelper,
            paneId
        } = this.state;

        if (equals(BacklogPaneIds.Mapping, paneId, true)) {
            return (
                <MappingPane
                    onDismiss={this._dismissRightPanel}
                    currentTeam={team}
                    hostBacklogLevel={currentBacklog}
                    targetBacklogLevel={nextBacklog}
                    getWorkItemDragInfo={this._getWorkItemDragInfo}
                    onSameTeamBacklogChanged={this._onSameTeamBacklogLevelChanged}
                    onWorkItemsDropped={this._reparentWorkItemsFromMappingPane}
                />
            );
        }
        if (equals(BacklogPaneIds.Planning, paneId, true)) {
            return (
                <PlanningView
                    onDismiss={this._dismissRightPanel}
                    getWorkItemDragInfo={this._getWorkItemDragInfo}
                    moveWorkItemsToIteration={this._moveWorkItemsToIteration}
                    team={team}
                />
            );
        }

        const contribution = this._getRightPanelContribution();
        if (contribution) {
            return (
                <BacklogContributionRightPanel
                    onDismiss={this._dismissRightPanel}
                    contributionData={contribution}
                    eventHelper={eventHelper}
                    getSelectedWorkItems={this._getSelectedWorkItems}
                    team={team}
                />
            );
        }

        return null;
    }

    private _shouldShowRightPanel = () => {
        const {
            paneId,
        } = this.state;

        if (equals(BacklogPaneIds.Off, paneId, true)) {
            return false;
        }

        return (equals(BacklogPaneIds.Mapping, paneId, true) ||
            equals(BacklogPaneIds.Planning, paneId, true) ||
            !!this._getRightPanelContribution());
    }

    private _dismissRightPanel = () => {
        this.props.viewOptions.setViewOption(BacklogsHubConstants.PaneParameter, BacklogPaneIds.Off);
        if (this._viewOptionsLearningBubble.current) {
            this._viewOptionsLearningBubble.current.showIfNeeded();
        }
    }

    private _getRightPanelContribution = (): Contribution => {
        const {
            paneId,
            rightPanelContributions
        } = this.state;

        if (rightPanelContributions) {
            // The pane id is a contribution id
            return first(rightPanelContributions, (contribution) => equals(contribution.id, paneId, true));
        }

        return null;
    }

    private _getRightPaneViewAction(props: IBacklogPivotContext, state: IBacklogPivotState): IPivotBarViewAction {
        let paneChoiceOptions: IChoiceGroupViewActionOption[] = [];
        if (props.nextBacklog) {
            paneChoiceOptions.push({
                key: BacklogPaneIds.Mapping,
                text: BacklogContentViewResources.MappingPaneTitle
            });
        }
        paneChoiceOptions.push(
            {
                key: BacklogPaneIds.Planning,
                text: BacklogContentViewResources.PlanningPaneTitle
            }
        );

        const {
            rightPanelContributions,
            paneId
        } = state;

        if (rightPanelContributions) {
            const contributionOptions: IChoiceGroupViewActionOption[] = rightPanelContributions.map((contribution) => {
                return {
                    key: contribution.id,
                    text: contribution.properties.name,
                    checked: equals(contribution.id, paneId, true)
                };
            });
            paneChoiceOptions = paneChoiceOptions.concat(contributionOptions);
        }

        paneChoiceOptions.push(
            {
                key: BacklogPaneIds.Off,
                text: BacklogContentViewResources.OffPaneTitle
            }
        );

        const actionProps = {
            defaultSelectedKey: BacklogPaneIds.Off as string,
            options: paneChoiceOptions
        } as IPivotBarViewActionProps;

        return {
            actionType: PivotBarViewActionType.ChoiceGroup,
            name: BacklogContentViewResources.RightPane_ViewActionGroup,
            separator: true,
            key: BacklogsHubConstants.PaneParameter,
            actionProps
        };
    }

    private _renderAddItemCallout(): JSX.Element {
        const {
            currentBacklog,
            filter
        } = this.props;

        const {
            showAddItemCallout,
            activeWorkItemTypes
        } = this.state;

        if (!showAddItemCallout) {
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

        // Return new add callout
        return (
            <BacklogAddItemCallout
                filterApplied={filter.hasChangesToReset()}
                onInsertLocationChanged={this._onCalloutInsertionLocationUpdate}
                calloutProps={calloutProps}
                workItemTypes={activeWorkItemTypes}
                additionalFieldReferenceNames={currentBacklog.addPanelFields}
                defaultWorkItemType={currentBacklog.defaultWorkItemType}
                onSubmit={this._addNewItem}
                calloutId={`BacklogsHub${currentBacklog.id}`}
            />
        );
    }

    private _reloadBacklogWithParameters(): void {
        this._backlogPivotActionsCreator.reloadBacklog(
            this.props.viewOptions.getViewOption(BacklogsHubConstants.ForecastingParameter),
            this.props.viewOptions.getViewOption(BacklogsHubConstants.InProgressParameter));
    }

    private _onFilterChanged = (filterState: IFilterState): void => {
        const filterStateEmpty = isFilterStateEmpty(mapToFilterState(filterState));

        if (!filterStateEmpty && this.props.viewOptions.getViewOption(BacklogsHubConstants.ForecastingParameter)) {
            // If we start filtering and forecasting is on, turn off forecasting
            this.props.viewOptions.setViewOption(BacklogsHubConstants.ForecastingParameter, false);
        }

        this._backlogPivotActionsCreator.saveFilterState(filterState);
    }

    private _onSameTeamBacklogLevelChanged = (backlog: IBacklogLevelConfiguration): void => {
        const {
            viewOptions
        } = this.props;

        const currentBacklogLevel = viewOptions.getViewOption(AgileRouteParameters.BacklogLevel);
        if (currentBacklogLevel !== backlog.name) {
            viewOptions.setViewOption(AgileRouteParameters.BacklogLevel, backlog.name);
        }
    }

    private _getSelectedWorkItems = (): IBacklogGridItem[] => {
        if (this._backlogWrapper) {
            return this._backlogWrapper.getSelectedWorkItems();
        }
        return [];
    }

    private _delayResizeBacklog = (): void => {
        // Resizing the Grid takes a very long time if there are a lot of items
        // We do not want to block the splitter from updating, so lets resize later
        delay(this, 0, () => {
            if (this._backlogWrapper) {
                this._backlogWrapper.resize();
            }
        });
    }

    private _onStoreChanged = (): void => {
        this.setState(getState(this._backlogPivotStore));
    }

    private _toggleFilterBar = (): void => {
        if (this.state.isFilterBarOpen) {
            // The filter bar is being toggled OFF. Update initialFilterState.
            const filterContext = this._backlogFilterContext.value;
            if (filterContext) {
                filterContext.initialFilterState = mapToFilterState(this.props.filter.getState());
            }
        }
        this._backlogPivotActionsCreator.toggleFilterBar(!this.state.isFilterBarOpen);
    }

    private _onAddNewItemDismiss = (): void => {
        this._backlogPivotActionsCreator.toggleAddItemCallout(false);
        this._addItemCalloutTarget = null;
        // Hide the insertion line
        if (this._backlogWrapper) {
            this._backlogWrapper.toggleInsertionLine(false /*show*/);
        }
    }

    private _onCalloutInsertionLocationUpdate = (insertLocation: AddItemInsertLocation): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.toggleInsertionLine(true /*show*/, insertLocation);
        }
    }

    private _onOpenColumnOptions = (): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.openColumnOptions();
        }
    }

    private _onColumnOptionsChanged = (): void => {
        this._reloadBacklogWithParameters();
    }

    private _onCreateQuery = (): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.createQuery();
        }
    }

    private _onSendEmail = (): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.sendEmail();
        }
    }

    private _onOpenSettings = (): void => {
        this._backlogPivotActionsCreator.openSettings();
    }

    private _addMessage = (message: IMessage) => {
        this._messagesActionsCreator.addMessage(message);
    }

    private _removeMessage = (id: string) => {
        this._messagesActionsCreator.clearPageMessage(id);
    }

    private _showFilter = (skipFocus?: boolean): void => {
        if (skipFocus && this._backlogFilterContext) {
            this._backlogFilterContext.value.skipFocusOnMount = true;
            this._backlogFilterContext.value.initialFilterState = mapToFilterState(this.state.initialFilterState);
        }

        this._backlogPivotActionsCreator.toggleFilterBar(true);
    }

    private _addNewItemViewAction = (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IPivotBarAction) => {
        if (this.state.showAddItemCallout) {
            // The callout is visible, close it
            this._backlogPivotActionsCreator.toggleAddItemCallout(false);
        } else {
            // Otherwise save target and show callout
            this._addItemCalloutTarget = e.currentTarget;
            this._backlogPivotActionsCreator.toggleAddItemCallout(true);
        }
    }

    private _addNewItem = (workItemTypeName: string, fields: IFieldValueDictionary, location: AddItemInsertLocation): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.addWorkItem(workItemTypeName, fields, location).then(({ status, continuationPromise }) => {
                if (status === AddBacklogItemStatus.Added) {
                    this._backlogPivotActionsCreator.backlogItemAdded();
                    this._backlogWrapper.resize();
                } else if (status === AddBacklogItemStatus.WorkItemFormOpened) {
                    this._backlogPivotActionsCreator.toggleAddItemCallout(false);
                    if (continuationPromise) {
                        continuationPromise.then((success: boolean) => {
                            if (success) {
                                this._backlogPivotActionsCreator.backlogItemAdded();
                                this._backlogWrapper.resize();
                            }
                        });
                    }
                }
            }, (error) => {
                // Handle errors
                publishErrorToTelemetry(error);
            });
        }
    }

    private _moveWorkItemsToIteration = (workItemIds: number[], newIterationPath: string): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.moveWorkItemsToIteration(workItemIds, newIterationPath);
        } else {
            throw new Error("The Product Backlog is not yet available");
        }
    }

    private _reparentWorkItemsFromMappingPane = (workItemIds: number[], parentId: number): void => {
        if (this._backlogWrapper) {
            this._backlogWrapper.reparentFromMappingPane(workItemIds, parentId);
            BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.MAPPING_ITEM_DROPPED, {
                [BacklogsHubTelemetryConstants.ItemCount]: workItemIds.length
            });
        } else {
            throw new Error("The Product Backlog is not yet available");
        }
    }

    private _getWorkItemDragInfo = (): IWorkItemDragInfo => {
        if (this._backlogWrapper) {
            return this._backlogWrapper.getDraggingWorkItemInformation();
        } else {
            throw new Error("The Product Backlog is not yet available");
        }
    }

    private _setupKeyboardShortcuts(): void {
        if (!this._backlogShortcuts && this._backlogWrapper && this._backlogWrapper.componentDidUpdate) {
            this._backlogShortcuts = new BacklogShortcutGroup({
                getTeamId: () => this.props.team.id,
                getBacklog: () => this._backlogWrapper.getProductBacklog(),
                backlogElement: this._backlogWrapper.getProductBacklogContainer(),
                activateFilter: () => this._showFilter()
            });
        }
    }

    private _cleanupKeyboardShortcuts(): void {
        if (this._backlogShortcuts) {
            this._backlogShortcuts.removeShortcutGroup();
            this._backlogShortcuts = null;
        }
    }

    private _resolveBacklogRef = (backlog: ProductBacklogWrapper): void => {
        this._backlogWrapper = backlog;
    }

    private _resolveProductBacklogContainer = (element: HTMLElement): void => {
        // Remount the keyboard shortcuts
        this._cleanupKeyboardShortcuts();
        this._setupKeyboardShortcuts();
    }

    private _addItemCommandOptions(state: IBacklogPivotState): IActionOptions {
        let disabled: boolean = false;
        let tooltip: string = null;

        if (state.activeWorkItemTypes && state.activeWorkItemTypes.length < 1) {
            disabled = true;
            tooltip = BacklogContentViewResources.BacklogAddItemButton_Disabled_NoWorkItemTypes;
        } else if (state.isFiltered) {
            disabled = true;
            tooltip = BacklogContentViewResources.BacklogAddItemButton_Disabled_Filter;
        }

        return {
            disabled: disabled,
            tooltip: tooltip,
            onClick: this._addNewItemViewAction
        };
    }
}
