import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BoardsHub/TeamBoardPivot/Components/BoardPivot";
import { TeamBoardPivotActions } from "Agile/Scripts/BoardsHub/TeamBoardPivot/ActionsCreator/TeamBoardPivotActions";
import { TeamBoardPivotActionsCreator } from "Agile/Scripts/BoardsHub/TeamBoardPivot/ActionsCreator/TeamBoardPivotActionsCreator";
import { ITeamBoardPivotState, IBoardsHubFilterContext, IBoardsWrapperFilterOptions } from "Agile/Scripts/BoardsHub/TeamBoardPivot/TeamBoardPivotContracts";
import { TeamBoardFilter } from "Agile/Scripts/BoardsHub/TeamBoardPivot/Components/TeamBoardFilter";
import { BoardWrapper } from "Agile/Scripts/BoardsHub/TeamBoardPivot/Components/BoardWrapper";
import { TeamBoardPivotStore } from "Agile/Scripts/BoardsHub/TeamBoardPivot/Store/TeamBoardPivotStore";
import { ITeamBoardPivotContext } from "Agile/Scripts/BoardsHub/BoardsHubContracts";
import { BoardsHubUsageTelemetryConstants } from "Agile/Scripts/BoardsHub/Constants";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { NewBacklogLevelsMessage } from "Agile/Scripts/Common/Components/NewBacklogLevelsMessage";
import { PivotItemContent } from "Agile/Scripts/Common/Components/PivotItemContent";
import { AgileHubShortcutGroup } from "Agile/Scripts/Common/Controls";
import { BoardsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BacklogsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { HubViewActions } from "Agile/Scripts/Common/HubViewActions";
import { HubMessages } from "Agile/Scripts/Common/Messages/HubMessages";
import { HubMessagesActions } from "Agile/Scripts/Common/Messages/HubMessagesActions";
import { HubMessagesActionsCreator, IHubMessagesActionsCreator } from "Agile/Scripts/Common/Messages/HubMessagesActionsCreator";
import { HubMessagesStore, IHubMessagesStore } from "Agile/Scripts/Common/Messages/HubMessagesStore";
import { getLevelSelectorViewAction } from "Agile/Scripts/Common/ViewActions/BacklogLevelSelectorViewAction";
import { AgileRouteParameters, BoardsHubConstants, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import * as AgileControlsResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import * as BoardViewResources from "Agile/Scripts/Resources/TFS.Resources.BoardsHub.BoardView";
import {
    BoardPivotDisplayName,
    LiveUpdates_Off,
    LiveUpdates_On,
    Navigation_PendingChanges
} from "Agile/Scripts/Resources/TFS.Resources.BoardsHub.BoardView";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { Notifications } from "Agile/Scripts/TFS.Agile.Boards";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { ICloseCommonConfigurationActionArgs } from "Presentation/Scripts/TFS/TFS.Configurations";
import { Actions } from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import { MessageAreaType } from "VSS/Controls/Notifications";
import { getService as getActionService } from "VSS/Events/Action";
import { getRunningDocumentsTable } from "VSS/Events/Document";
import { getService as getEventService } from "VSS/Events/Services";
import * as Utils_Core from "VSS/Utils/Core";
import { equals } from "VSS/Utils/String";
import { IPivotBarAction, IPivotBarViewAction, IPivotBarViewActionProps, PivotBarViewActionType } from "VSSUI/PivotBar";
import { ObservableValue } from "VSS/Core/Observable";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { VssIconType } from "VSSUI/VssIcon";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";

@component("boards-board-pivot")
export class TeamBoardPivot extends PivotItemContent<ITeamBoardPivotContext, ITeamBoardPivotState> {

    private _filterContext = new ObservableValue<IBoardsHubFilterContext>(null);
    // View actions (actions that are always added)
    private _defaultViewActions: IPivotBarViewAction[];

    private _shortcuts: AgileHubShortcutGroup;

    private _store: TeamBoardPivotStore;
    private _actionsCreator: TeamBoardPivotActionsCreator;
    private _actions: TeamBoardPivotActions;

    private _messagesActions: HubMessagesActions;
    private _messagesActionsCreator: IHubMessagesActionsCreator;
    private _messagesStore: IHubMessagesStore;

    private _filterBarRef: TeamBoardFilter;

    private static VIEWOPTION_LIVEUPDATES_KEY: string = "board-live-updates";

    constructor(props: ITeamBoardPivotContext, context?: any) {
        super(props, context, BoardsHubConstants.HUB_NAME, props.pivotName);

        this._actions = new TeamBoardPivotActions();
        this._actionsCreator = new TeamBoardPivotActionsCreator(this._actions);
        this._store = new TeamBoardPivotStore(this._actions);

        // Messages
        this._messagesActions = new HubMessagesActions();
        this._messagesActionsCreator = new HubMessagesActionsCreator(this._messagesActions);
        this._messagesStore = new HubMessagesStore(this._messagesActions);

        this.state = {} as ITeamBoardPivotState;
    }

    public componentWillMount(): void {
        super.componentWillMount();

        // Attach store changed listener
        this._store.addChangedListener(this._onStoreChanged);

        this.props.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._shortcuts = new AgileHubShortcutGroup(this.props.viewOptions);

        this._messagesActions.clearPageMessage.addListener(this._handleClearPageMessage);
        this._actionsCreator.initializeBoardPivot(this.props.team.id, this.props.currentBacklog.name);
    }

    public componentWillUnmount(): void {
        // Remove listener
        this._store.removeChangedListener(this._onStoreChanged);

        this.props.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._messagesActions.clearPageMessage.removeListener(this._handleClearPageMessage);

        if (this._shortcuts) {
            this._shortcuts.removeShortcutGroup();
            this._shortcuts = null;
        }

        super.componentWillUnmount();
    }

    public componentWillReceiveProps(nextProps: ITeamBoardPivotContext) {
        if (!this.props) {
            return;
        }

        if (!this.props.newBacklogLevelsSignature && nextProps.newBacklogLevelsSignature) {
            this._messagesActionsCreator.addMessage({
                message: null,
                children: (<NewBacklogLevelsMessage />),
                messageType: MessageBarType.info,
                id: nextProps.newBacklogLevelsSignature,
                closeable: true,
                persistDismissal: true
            });
        } else if (this.props.newBacklogLevelsSignature && !nextProps.newBacklogLevelsSignature) {
            this._messagesActionsCreator.clearPageMessage(this.props.newBacklogLevelsSignature);
        }

        if (nextProps.currentBacklog !== this.props.currentBacklog || nextProps.currentBacklog.id !== this.props.currentBacklog.id) {
            this._actionsCreator.changeBoard(nextProps.currentBacklog.id, nextProps.currentBacklog.name, this.props.pivotName, nextProps.team.id);
        }

    }

    public componentWillUpdate(nextProps: ITeamBoardPivotContext, nextState: ITeamBoardPivotState) {
        super.componentWillUpdate(nextProps, nextState);
        this._updateViewState(nextState);
    }

    public componentDidUpdate(props: ITeamBoardPivotContext, state: ITeamBoardPivotState) {
        super.componentDidUpdate(props, state);
        // We ned to resize the board when ever the pivot updates e.g. Toggle FullScreen/Filter
        // This might get called few times when the resize is not required, e.g. toggle live updates
        // But it is ok as the event handler handles that scenario
        this._resizeBoard();
    }

    public render(): JSX.Element {
        return (
            <div className="board-view-content" role="main" aria-label={BoardPivotDisplayName}>
                {this._renderPivotContent()}
            </div>
        );
    }

    public isDataReady(): boolean {
        // Check if we have a boardmodel or an exception
        return this._isDataReady(this.state);
    }

    public _isDataReady(state: ITeamBoardPivotState): boolean {
        // Check if we have a boardmodel or an exception
        return state && (!!state.boardModel || !!state.contentExceptionInfo);
    }

    public getState(): ITeamBoardPivotState {
        return this.state;
    }

    protected shouldUpdateCommandsOnUpdate(nextProps: ITeamBoardPivotContext, nextState: ITeamBoardPivotState): boolean {
        return this.state.eventScopeId !== nextState.eventScopeId ||
            this.props.currentBacklog.id !== nextProps.currentBacklog.id ||
            this.props.team.id !== nextProps.team.id ||
            this._isDataReady(this.state) !== this._isDataReady(nextState);
    }

    protected getCommands(props: ITeamBoardPivotContext, state: ITeamBoardPivotState): IPivotBarAction[] {
        if (this.props.embedded) {
            // Pivot commands are not available on embedded pivot
            return [];
        }

        const isDisabled = state.disableActions || !this._isDataReady(state);

        const vssIconProps = {
            iconName: "bowtie-navigate-forward-circle",
            iconType: VssIconType.bowtie
        };

        const backlogLevelName = props.currentBacklog.name;
        const teamName = props.team.name;

        const matchingBacklogUrl = BacklogsUrls.getExternalBacklogContentUrl(
            teamName,
            backlogLevelName);

        const featuresBacklogCommand: IPivotBarAction = {
            key: "featuresBacklogCommandKey",
            href: matchingBacklogUrl,
            disabled: isDisabled,
            name: BoardViewResources.ViewAsBacklog,
            iconProps: vssIconProps,
            important: true,
            onClick: (ev: React.MouseEvent<HTMLElement>) => {
                if (ev && (ev.ctrlKey || ev.metaKey)) {
                    return;
                }

                ev.preventDefault();
                const url = BacklogsUrls.getBacklogContentUrl({
                    backlogLevel: backlogLevelName,
                    teamIdOrName: teamName,
                    pivot: BacklogsHubConstants.BacklogPivot,
                    preserveQueryParameters: true
                });

                BacklogsUrls.navigateToBacklogsHubUrl(url);

                BoardsHubTelemetryHelper.publishTelemetry(
                    BoardsHubUsageTelemetryConstants.SWITCH_TO_MATCHING_BACKLOG,
                    {
                        [AgileRouteParameters.BacklogLevel]: backlogLevelName
                    });
            }
        };
        return [featuresBacklogCommand];

    }

    protected shouldUpdateViewActionsOnUpdate(nextProps: ITeamBoardPivotContext, nextState: ITeamBoardPivotState): boolean {
        return this.props.currentBacklog !== nextProps.currentBacklog ||
            this.state.boardModel !== nextState.boardModel ||
            this.state.backlogContextData !== nextState.backlogContextData ||
            this.state.signalrHubUrl !== nextState.signalrHubUrl ||
            this._isDataReady(this.state) !== this._isDataReady(nextState) ||
            this.state.isFiltered !== nextState.isFiltered;
    }

    protected getViewActions(props: ITeamBoardPivotContext, state: ITeamBoardPivotState): IPivotBarViewAction[] {
        const viewActions: IPivotBarViewAction[] = [];

        // Create the default view actions
        if (!this._defaultViewActions) {

            this._defaultViewActions = [];

            const actionProps = {
                onAriaLabel: LiveUpdates_On,
                offAriaLabel: LiveUpdates_Off
            } as IPivotBarViewActionProps;

            this._defaultViewActions.push(...[
                {
                    key: TeamBoardPivot.VIEWOPTION_LIVEUPDATES_KEY,
                    name: AgileControlsResources.Kanban_AutoRefreshStateIcon_HotSpot_Title,
                    actionType: PivotBarViewActionType.OnOff,
                    important: false,
                    actionProps
                },
                HubViewActions.getCommonSettings(this._openSettings)
            ]);
        }

        viewActions.push(HubViewActions.getFilterAction(this._toggleFilterBar, state.isFiltered));

        if (!this.props.embedded) {
            // Backlog level selector is not available on embedded pivot. 
            // We are blocking view actions that would navigate the page
            viewActions.push(
                getLevelSelectorViewAction(
                    props.visibleBacklogLevels,
                    props.viewOptions,
                    () => !getRunningDocumentsTable().isModified(),
                    "Boards",
                    {
                        iconName: "BacklogBoard",
                        iconType: VssIconType.fabric
                    },
                    () => {
                        const eventsHelper = new ScopedEventHelper(this.state.eventScopeId);
                        eventsHelper.fire(Notifications.BoardMessageDisplay, this,
                            {
                                message: Navigation_PendingChanges,
                                messageType: MessageAreaType.Warning
                            });
                    }
                )
            );
        }

        // Add default view actions
        viewActions.push(...this._defaultViewActions);

        // Set the disabled state of all view actions
        for (const action of viewActions) {
            action.disabled = state.disableActions || !this._isDataReady(state);
        }

        return viewActions;
    }

    protected _renderPivotContent(): JSX.Element {
        if (this.state.contentExceptionInfo) {
            return <HubError exceptionsInfo={[this.state.contentExceptionInfo]} />;
        } else if (this.isDataReady()) {
            return this._renderBoard();
        } else {
            return <LoadingComponent />;
        }
    }

    private _renderBoard(): JSX.Element {
        const filterOptions: IBoardsWrapperFilterOptions = {
            showHubFilter: this._setShowHubFilter,
            filter: this.props.filter,
            initialFilterState: this.state.initialFilterState,
            hubFilterContext: this._filterContext
        };

        return (
            <div>
                <div className="boards-content-top-section">
                    <HubMessages
                        actionsCreator={this._messagesActionsCreator}
                        store={this._messagesStore}

                    />
                    {this._renderFilterBar()}
                </div>
                <BoardWrapper
                    backlogContextData={this.state.backlogContextData}
                    boardModel={this.state.boardModel}
                    signalrHubUrl={this.state.signalrHubUrl}
                    eventScopeId={this.state.eventScopeId}
                    filterOptions={filterOptions}
                />
            </div>
        );
    }

    private _renderFilterBar(): JSX.Element {
        if (this.state.isFilterBarOpen) {
            return (
                <TeamBoardFilter
                    ref={this._setFilterBarRef}
                    filterContext={this._filterContext}
                    actionsCreator={this._actionsCreator}
                    onDismissClicked={this._toggleFilterBar}
                />
            );
        }
    }

    private _setFilterBarRef = (ref: TeamBoardFilter) => {
        this._filterBarRef = ref;
    }

    private _toggleFilterBar = (): void => {
        if (this.state.isFilterBarOpen) {
            // The filter bar is being toggled OFF. Reset skipFocus flag and update initialFilterState
            const filterContext = this._filterContext.value;
            if (filterContext) {
                filterContext.initialFilterState = mapToFilterState(this.props.filter.getState());
                filterContext.skipFocusOnMount = false;
            }
        }
        this._actionsCreator.setFilterBarVisible(!this.state.isFilterBarOpen);
    }

    private _openSettings = () => {
        this._actionsCreator.openSettings("");
    }

    /**
     * Update state when store is updated
     */
    private _onStoreChanged = () => {
        const nextState = this._store.getBoardViewState();
        this._updateViewState(nextState);
        this.setState(nextState);
    }

    /**
     * Set hub filter visibility state
     * @param showFilter the new visibility state to set for the filter
     */
    private _setShowHubFilter = (showFilter: boolean): void => {
        if (!showFilter) {
            this._actionsCreator.setFilterBarVisible(false);
        }

        const { isFilterBarOpen } = this.state;
        if (isFilterBarOpen && this._filterBarRef) {
            this._filterBarRef.focus();
        }
        else {
            this._actionsCreator.setFilterBarVisible(true);

        }
    }

    private _onViewOptionsChanged = (value: IViewOptionsValues, action?: string) => {
        if (value.hasOwnProperty(TeamBoardPivot.VIEWOPTION_LIVEUPDATES_KEY)) {
            this._onLiveUpdatesChange(value[TeamBoardPivot.VIEWOPTION_LIVEUPDATES_KEY]);
        } else if (value.hasOwnProperty(AgileRouteParameters.BacklogLevel)) {
            this._onNavigationViewOptionsChanged(value);
        }
    }

    private _updateViewState(nextState: ITeamBoardPivotState) {
        const newBoardModel = nextState.boardModel;

        if (newBoardModel && !newBoardModel.notReady) {

            const currentBoardModel = this.state.boardModel;
            const currentBoardId = currentBoardModel ? currentBoardModel.boardSettings.id : null;
            const newBoardId = newBoardModel.boardSettings.id;

            if (equals(currentBoardId, newBoardId, /* IgnoreCase */ true)) {
                // Board was not updated, No-op
                return;
            }

            // Update viewstate to sync with store state only when a new board is being rendered or when user switches backlog level
            const newRefreshState = newBoardModel && newBoardModel.boardSettings.autoRefreshState;
            const oldRefreshState = this.props.viewOptions.getViewOption(TeamBoardPivot.VIEWOPTION_LIVEUPDATES_KEY);
            if (oldRefreshState !== newRefreshState) {
                this.props.viewOptions.setViewOption(TeamBoardPivot.VIEWOPTION_LIVEUPDATES_KEY, newRefreshState);
            }

            // Update context for contributable view actions
            const {
                id, name
            } = this.props.team;

            this.props.contributableViewActionContext.value = {
                id: newBoardModel.board && newBoardModel.board.id,
                team: { id, name }
            };
        }
    }

    private _resizeBoard = (): void => {
        getEventService().fire(
            Notifications.BoardContainerResized,
            null, /* sender */
            null, /* event args */
            this.state.eventScopeId
        );
    }

    private _onLiveUpdatesChange(toggleOn: boolean) {
        const { eventScopeId, boardModel } = this.state;
        const teamId = this.props.team.id;
        if (boardModel && boardModel.boardSettings) {
            this._actionsCreator.toggleLiveUpdates(eventScopeId, toggleOn, teamId, boardModel.boardSettings.id);
        }
    }

    private _handleClearPageMessage = (id: string): void => {
        Utils_Core.delay(this, 0, () => {
            // Need to resize board after banner is removed (which is done after _handleClearPageMessage callback is executed)
            this._resizeBoard();
        });
    }

    private _onNavigationViewOptionsChanged(value: IViewOptionsValues) {
        //  Common configuration dialog might be opened when navigation is requested.
        //  We won't ask for user confirmation to close the dialog, even if there are
        //  pending configuration changes.
        const skipCloseConfigDialogConfirmation: boolean = true;
        const backlogLevelName = value[AgileRouteParameters.BacklogLevel];
        const { currentBacklog } = this.props;
        const newBacklogLevel = this.props.visibleBacklogLevels.filter((bl) => equals(bl.name, backlogLevelName, /* ignore case */ true))[0];
        if (backlogLevelName) {
            // Change to another board

            if (!equals(currentBacklog.name, newBacklogLevel.name, /* ignore case */ true)) {
                this._closeCommonConfigurationDialog(skipCloseConfigDialogConfirmation);
                //this._actionsCreator.changeBoard(newBacklogLevel.id, newBacklogLevel.name, value[AgileRouteParameters.Pivot], this.props.team.id);
            }
            return;
        }
    }

    /**
     *  Requests closing of common configuration dialog.
     */
    private _closeCommonConfigurationDialog(skipConfirmationDialog: boolean) {

        const actionArgs: ICloseCommonConfigurationActionArgs = {
            skipConfirmationDialog: skipConfirmationDialog
        };

        getActionService().performAction(
            Actions.CLOSE_COMMON_CONFIGURATION,
            actionArgs);
    }
}
