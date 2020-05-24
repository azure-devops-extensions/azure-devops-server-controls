import * as React from "react";

import { BoardFilter as Filter } from "Agile/Scripts/Board/BoardFiltering";
import { TeamBoardPivotActionsCreator } from "Agile/Scripts/BoardsHub/TeamBoardPivot/ActionsCreator/TeamBoardPivotActionsCreator";
import { IBoardsHubFilterContext } from "Agile/Scripts/BoardsHub/TeamBoardPivot/TeamBoardPivotContracts";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { Notifications } from "Agile/Scripts/TFS.Agile.Boards";
import { getDefaultWebContext } from "VSS/Context";
import { equals } from "VSS/Utils/String";
import { IObservableValue } from "VSS/Core/Observable";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export interface ITeamBoardFilterProps {
    /** BoardsHub filter context */
    filterContext: IObservableValue<IBoardsHubFilterContext>;

    /** Actions Creator */
    actionsCreator: TeamBoardPivotActionsCreator;

    /** Optional callback to handle clicking on the filter bar dismiss button */
    onDismissClicked: () => void;
}

export class TeamBoardFilter extends React.Component<ITeamBoardFilterProps> {
    private _eventsHelper: ScopedEventHelper;
    private _filterControlRef: Filter;

    public componentDidMount() {
        // Subscribe to filterContext changed event
        this.props.filterContext.subscribe(this._onFilterContextChanged);

        const filterContext = this.props.filterContext.value;
        if (!filterContext) {
            // Return if filterContext is empty
            return;
        }

        // Initialize eventsHelper and attach to TeamboardFilterCriteria event
        this._eventsHelper = new ScopedEventHelper(filterContext.eventScopeId);
        this._eventsHelper.attachEvent(Notifications.BoardCriteriaFilterChanged, this._handleBoardCriteriaFilterChanged);

        // Focus filter control if skipFocus is not specified
        if (!filterContext.skipFocusOnMount && this._filterControlRef) {
            this.focus();
        }
    }

    public componentWillUnmount() {
        this.props.filterContext.unsubscribe(this._onFilterContextChanged);

        if (this._eventsHelper && this._eventsHelper.getScope()) {
            this._eventsHelper.detachEvent(Notifications.BoardCriteriaFilterChanged, this._handleBoardCriteriaFilterChanged);
            this._eventsHelper = null;
        }
    }

    public componentWillReceiveProps(newProps: ITeamBoardFilterProps) {
        const newOptions = newProps.filterContext.value;
        if (newOptions) {
            const currentFilterContext = this.props.filterContext.value;
            if (newOptions.eventScopeId) {
                const previousScopeId = currentFilterContext ? currentFilterContext.eventScopeId : null;
                if (this._eventsHelper && !equals(newOptions.eventScopeId, previousScopeId, true)) {
                    this._eventsHelper.detachEvent(Notifications.BoardCriteriaFilterChanged, this._handleBoardCriteriaFilterChanged);
                    this._eventsHelper = null;
                }
                if (!this._eventsHelper) {
                    this._eventsHelper = new ScopedEventHelper(newOptions.eventScopeId);
                    this._eventsHelper.attachEvent(Notifications.BoardCriteriaFilterChanged, this._handleBoardCriteriaFilterChanged);
                }
            }
        }
    }

    public shouldComponentUpdate(nextProps: ITeamBoardFilterProps): boolean {
        const currentBoardId = this.props.filterContext.value ? this.props.filterContext.value.boardId : null;
        const nextBoardId = nextProps.filterContext.value ? nextProps.filterContext.value.boardId : null;
        return nextBoardId !== null && !equals(currentBoardId, nextBoardId, true);
    }

    public render(): JSX.Element {
        // Filter is not available if board is not initialized
        const filterContext = this.props.filterContext.value;
        if (!filterContext) {
            return null;
        }

        const initialFilterState = filterContext.initialFilterState || {};
        return <div className="boards-view-filter-container">
            <Filter
                ref={this._resolveFilterControlRef}
                key={filterContext.eventScopeId}
                projectName={getDefaultWebContext().project.name}
                initialFilterState={initialFilterState}
                eventScopeId={filterContext.eventScopeId}
                filter={filterContext.filter}
                boardFilterDataSource={filterContext.dataSource}
                fields={filterContext.filterFields}
                onDismissClicked={this.props.onDismissClicked}
            />
        </div>;
    }

    public focus = (): void => {
        this._filterControlRef.focus();
    }

    private _resolveFilterControlRef = (filter: Filter): void => {
        this._filterControlRef = filter;
    }

    private _onFilterContextChanged = (filterContext: IBoardsHubFilterContext, action: string): void => {
        this.forceUpdate();
    }

    private _handleBoardCriteriaFilterChanged = (args: { filter: FilterState }): void => {
        const { filter } = args;

        // Store current filter
        this.props.actionsCreator.invokeBoardCriteriaFilterChanged(filter);
    }
}