import * as VSSStore from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";

import { IFilterState } from "VSSUI/Utilities/Filter";

import { autobind } from "OfficeFabric/Utilities";

import { FavoriteItemData } from "Favorites/Controls/FavoritesModels";
import { FavoritesActions } from "Favorites/Controls/FavoritesActions";
import { Favorite } from "Favorites/Contracts";

import { DashboardsDirectoryActions } from "Dashboards/Components/Directory/DashboardsDirectoryActionCreator";
import {
    DashboardLoadingState,
    MessageLevel,
    IExtendedFavorite,
    DashboardsDirectoryPivotState,
    IDirectoryRow,
    IGroupRow,
    IDashboardRow,
    ISortOptions,
    IMessageOptions,
    PivotGroupTogglePayload,
    FilteredPayload,
    ColumnSortChangePayload,
    DashboardUpdatedPayload,
    DashboardDeletedPayload,
    PivotDataReceivedPayload
} from "Dashboards/Components/Directory/Contracts";
import { DashboardItem, TeamScope } from "Dashboards/Components/Shared/Contracts";
import { DirectoryViewColumnKey, DataConstants } from "Dashboards/Components/Constants";
import * as TFS_Dashboards_Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import { DashboardsPermissionsHelper } from "Dashboards/Components/Directory/DashboardsPermissionsHelper";
import * as Performance from "VSS/Performance";
import { DashboardsTelemetryConstants } from "Dashboards/Scripts/Telemetry";

/**
 * The store is responsible for managing DashboardsDirectory state and notifies react on state changes.
 */
export class DashboardsDirectoryStore extends VSSStore.Store {
    private actions: DashboardsDirectoryActions;

    // map of expansion state for a specific group. This is stored specific to each pivot.
    private pivotExpansionStatesMap: IDictionaryStringTo<IDictionaryStringTo<boolean>>;

    // map of sort options for a specific group. This is stored specific to each pivot.
    private pivotSortOptionsMap: IDictionaryStringTo<ISortOptions>;

    // map of sort options for a specific group. This is stored specific to each pivot.
    private pivotMessageMap: IDictionaryStringTo<IMessageOptions>;

    // map of teams. This is stored specific to each pivot.
    private pivotTeamsMap: IDictionaryStringTo<TeamScope[]>;

    // map of pivots being loaded. This is stored specific to each pivot.
    private pivotLoadedMap: Set<string>;

    // map of each team and its list of dashboards. Can be shared across views.
    private teamToDashboardsMap: IDictionaryStringTo<DashboardItem[]>;

    // original list of dashboards for a pivot
    private pivotToDashboardsMap: IDictionaryStringTo<DashboardItem[]>;

    // map if the pivot needs to show grouping of artifacts under the groupId (teamId)
    private pivotGroupingVisibilityMap: IDictionaryStringTo<boolean>;

    // map if the pivot needs to show the favorite group if grouping is enabled for it.
    private pivotFavoriteGroupVisibilityMap: IDictionaryStringTo<boolean>;

    // set of all favorite dashboards (their identifiers)
    private favoritesSet: Set<string>;

    // map of favorite identifiers to favorites.
    private favoriteIdToFavoriteMap: IDictionaryStringTo<IExtendedFavorite>;

    // map of all updated dashboards (their identifiers)
    private updatedDashboardsMap: Map<string, DashboardItem>;

     // set of all deleted dashboards (their identifiers)
    private deletedDashboardSet: Set<string>;

    // current filter for directory. The filters always persist between pivots.
    private filter: FilteredPayload;

    // performance scenario for the directory page load (TTI)
    private hasRecordedTTI: boolean;

    constructor(actions: DashboardsDirectoryActions, favoriteActions: FavoritesActions) {
        super();

        this.pivotExpansionStatesMap = {};
        this.pivotSortOptionsMap = {};
        this.pivotMessageMap = {};
        this.pivotTeamsMap = {};
        this.teamToDashboardsMap = {};
        this.pivotGroupingVisibilityMap = {};
        this.pivotFavoriteGroupVisibilityMap = {};
        this.favoriteIdToFavoriteMap = {};
        this.pivotToDashboardsMap = {};
        this.filter = {} as FilteredPayload;
        this.favoritesSet = new Set<string>();
        this.updatedDashboardsMap = new Map<string, DashboardItem>();
        this.deletedDashboardSet = new Set<string>();
        this.pivotLoadedMap = new Set<string>();
        this.actions = actions;

        // Attach data available actions.
        this.actions.ReceiveStateForPivot.addListener(this.receiveStateForPivot);

        // attach sort action.
        this.actions.ChangeColumnSortForPivot.addListener(this.changeColumnSortForPivot);

        //  attach filtering action.
        this.actions.FilterView.addListener(this.filterViewForPivot);

         // Attach expand/collapse actions
        this.actions.ExpandGroupRowForPivot.addListener(this.handleExpandGroupRowForPivot);
        this.actions.CollapseGroupRowForPivot.addListener(this.handleCollapseGroupRowForPivot);

        // Attach dashboard actions.
        this.actions.UpdateDashboard.addListener(this.UpdatedDashboardDirectoryState);
        this.actions.DeleteDashboard.addListener(this.DeletedDashboardDirectoryState);
        this.actions.ClearMessageForPivot.addListener(this.clearMessageForPivot);

        // favorite actions
        favoriteActions.ToggleFavorite.addListener(this.updateFavorite);
    }

    public getState(pivot: string): DashboardsDirectoryPivotState {
        if (!this.pivotLoadedMap.has(pivot)) {
            return {
                loadingState: DashboardLoadingState.Loading
            } as DashboardsDirectoryPivotState;
        }

        if (this.pivotMessageMap[pivot] && this.pivotMessageMap[pivot].messageLevel === MessageLevel.Critical) {
            return {
                loadingState: DashboardLoadingState.Loaded,
                messageOptions: this.pivotMessageMap[pivot]
            } as DashboardsDirectoryPivotState;
        }

        const showGroups = this.pivotGroupingVisibilityMap[pivot];
        let rows: IDirectoryRow[];
        if (!showGroups) {
            rows = this.getFlattenedViewRows(pivot);
        }
        else {
            rows = this.getGroupedViewRows(pivot);
        }

        return {
            loadingState: DashboardLoadingState.Loaded,
            messageOptions: this.pivotMessageMap[pivot],
            searchOptions: {
                isSearching: this.isSearching()
            },
            sortOptions: this.pivotSortOptionsMap[pivot],
            items: rows.filter((row) => row.directoryRow.isMatch),
            teamsForPicker: this.pivotTeamsMap[pivot],

            // We are always enabling this rather than disabling if the user doesn't have delete permissions.
            // This was a perf-saving and work-saving decision
            isDeleteDisabled: false,
            unfilteredDashboardCount: rows.length
        }
    }

    private getFlattenedViewRows(pivot: string): IDirectoryRow[] {
        // translate store data into directory rows.
        let rows: IDirectoryRow[] = this.translateToRows(pivot, false);

        // sort rows based on sort criteria for the pivot.
        this.sortRows(rows, this.pivotSortOptionsMap[pivot]);

        // filter rows based on filter criteria on the page.
        this.filterDirectoryRows(rows);
        return rows;
    }

    private getGroupedViewRows(pivot: string): IDirectoryRow[]  {
        // translate store data into directory rows.
        let rows: IDirectoryRow[] = [];

        // include favorite rows if the pivot supports favorite group visibility.
        if (this.pivotFavoriteGroupVisibilityMap[pivot])
        {
            this.getFavoriteRows(pivot).forEach((row) => rows.push(row));
        }

        this.translateToRows(pivot, true).forEach((row) => rows.push(row));

        // filter directory rows based on filter criteria on the page.
        this.filterDirectoryRows(rows);

        // update filtering state of groups and their children based on group state the count mapping is updated based on the matched state.
        this.filterGroupRowsAndUpdateDirectoryRows(rows);

        return rows;
    }

    private getFavoriteRows(pivot: string): IDirectoryRow[] {
        let rows: IDirectoryRow[] = [];

        // add favorite group row.
        const favoriteExpansionState = this.pivotExpansionStatesMap[pivot] ? this.pivotExpansionStatesMap[pivot][DataConstants.SentinelTeam] : true;
        const favoriteGroupRow = {
            isGroupRow: true,
            isParentGroupFavorite: false,
            directoryRow: {
                isFavorite: true,
                teamId: DataConstants.SentinelTeam,
                title: TFS_Dashboards_Resources.MyFavoritesText,
                isCollapsed: !favoriteExpansionState,
                rowCount: this.favoritesSet.size
            } as IGroupRow
        };
        rows.push(favoriteGroupRow);

        if (this.favoritesSet.size > 0) {
            this.favoritesSet.forEach((favoriteId: string) => {
                const favoriteItem = this.favoriteIdToFavoriteMap[favoriteId];
                // only add favorites for whom dashboard items have been mapped.
                // if a dashboard is not mapped that means the extended metadata calls havent
                // run yet to marked the favorite as being deleted.
                if (favoriteItem.dashboardItem) {
                    let dashboardId = favoriteItem.dashboardItem.dashboard.id;
                    if (this.updatedDashboardsMap.has(dashboardId)) {
                        favoriteItem.dashboardItem = this.updatedDashboardsMap.get(dashboardId);
                    }

                    let row: IDirectoryRow = {} as IDirectoryRow;
                    row.isGroupRow = false;
                    row.isParentGroupFavorite = true;
                    row.directoryRow = {
                        isFavorite: true,
                        teamScope: favoriteItem.dashboardItem.teamScope,
                        dashboard: favoriteItem.dashboardItem.dashboard
                    } as IDashboardRow;
                    rows.push(row);
                }
            });
        }
        else {
            let row: IDirectoryRow = {} as IDirectoryRow;
            row.isGroupRow = false;
            row.isParentGroupFavorite = true;
            row.directoryRow = {
                isFavorite: true,
                teamScope: {
                    teamId: DataConstants.SentinelTeam,
                    teamName: DataConstants.SentinelTeam,
                },
                dashboard: {
                    // empty object to prevent adding too many null checks in helpers below.
                }
            } as IDashboardRow;
            rows.push(row);
        }

        return rows;
    }

    private translateToRows(pivot: string, includeGroupRows: boolean): IDirectoryRow[] {
        let rows: IDirectoryRow[] = [];

        // the list of teams for the pivot.
        const teams = this.pivotTeamsMap[pivot];
        teams.forEach((teamScope: TeamScope) => {
            const dashboards = this.teamToDashboardsMap[teamScope.teamId];

            let groupRow: IDirectoryRow = {} as IDirectoryRow;
            if (includeGroupRows) {
                // check if the pivot and team allows for expansion, otherwise default to collapsed
                const isExpanded = this.pivotExpansionStatesMap[pivot] ?
                    this.pivotExpansionStatesMap[pivot][teamScope.teamId] : false;
                groupRow.isGroupRow = true;
                groupRow.isParentGroupFavorite = false;
                groupRow.directoryRow = {
                    isFavorite: false,
                    teamId: teamScope.teamId,
                    title: teamScope.teamName,
                    isCollapsed: !isExpanded,
                    rowCount: dashboards.length
                } as IGroupRow;

                rows.push(groupRow);
            }

            if (dashboards.length > 0) {
                // for each dashboard, translate to the directory row (if not deleted or already updated)
                dashboards.forEach((dashboardItem: DashboardItem) => {
                    let dashboardId = dashboardItem.dashboard.id;

                    if (!this.deletedDashboardSet.has(dashboardId)) {
                        if (this.updatedDashboardsMap.has(dashboardId)) {
                            dashboardItem = this.updatedDashboardsMap.get(dashboardItem.dashboard.id);
                        }

                        let row: IDirectoryRow = {} as IDirectoryRow;
                        row.isGroupRow = false;
                        row.isParentGroupFavorite = false;
                        row.directoryRow = {
                            isFavorite: this.favoritesSet.has(dashboardId),
                            teamScope: dashboardItem.teamScope,
                            dashboard: dashboardItem.dashboard
                        } as IDashboardRow;

                        rows.push(row);
                    }
                });
            }
        });
        
        return rows;
    }

    private sortRows(rows: IDirectoryRow[], sortOptions: ISortOptions): void {
        if (!sortOptions) {
            return;
        }

        // This returns the keys in order depending on currently selected sorted column
        const getSortKeys = (row: IDirectoryRow) => {
            const searchableRow = row.directoryRow as IDashboardRow;
            switch (sortOptions.sortColumn) {
                case DirectoryViewColumnKey.Name:
                    return [
                        searchableRow.dashboard.name,
                        searchableRow.teamScope.teamName,
                        searchableRow.dashboard.description
                    ];
                case DirectoryViewColumnKey.Team:
                    return [
                        searchableRow.teamScope.teamName,
                        searchableRow.dashboard.name,
                        searchableRow.dashboard.description];
                case DirectoryViewColumnKey.Description:
                    return [
                        searchableRow.dashboard.description,
                        searchableRow.dashboard.name,
                        searchableRow.teamScope.teamName
                    ];
            }
            return [Utils_String.empty, Utils_String.empty, Utils_String.empty];
        };

        // compares keys and keeps checking the next one in the block if the previous ones match.
        const sortKeysCompare: (a: string[], b: string[]) => number = (a: string[], b: string[]) => {
            const length = a.length; // both are expected to be of the same length
            for (let i = 0; i < length; ++i) {
                const compare = Utils_String.localeIgnoreCaseComparer(a[i], b[i]);
                if (compare !== 0) {
                    return compare;
                }
            }
        };

        // Assign comparer depending on selected sort direction
        const comparer: (i1: IDirectoryRow, i2: IDirectoryRow) => number = sortOptions.isSortedDescending ?
            (i1: IDirectoryRow, i2: IDirectoryRow) =>  sortKeysCompare(getSortKeys(i2), getSortKeys(i1)) :
            (i1: IDirectoryRow, i2: IDirectoryRow) =>  sortKeysCompare(getSortKeys(i1), getSortKeys(i2));

        // Sort items
        rows = rows.sort(comparer);
    }

    private filterDirectoryRows(rows: IDirectoryRow[]): void {
        rows.forEach((row: IDirectoryRow) => {
            if (!row.isGroupRow) {
                const searchableRow = row.directoryRow as IDashboardRow;
                if (searchableRow) {
                    searchableRow.isMatch = true;

                    if (this.filter.textFilter != "") {
                        searchableRow.isMatch = this.textFilterMatch(searchableRow, this.filter.textFilter);
                    }

                    if (this.filter.teamsFilter.length > 0 && searchableRow.isMatch) {
                        searchableRow.isMatch = this.teamFilterMatch(searchableRow, this.filter.teamsFilter);
                    }

                    if (this.filter.initialTeamId && searchableRow.isMatch) {
                        searchableRow.isMatch = this.initialTeamFilterMatch(searchableRow, this.filter.initialTeamId);
                    }
                }
            }
        });
    }

    private filterGroupRowsAndUpdateDirectoryRows(rows: IDirectoryRow[]): void {
        var groups = rows.filter((row) => { return row.isGroupRow });
        groups.forEach((group) => {
            const groupRow = (group.directoryRow as IGroupRow);
            groupRow.isMatch = true;

            let groupChildRows: IDirectoryRow[] = rows.filter((row) => {
                return !row.isGroupRow
            });
            if (!groupRow.isFavorite) {
                groupChildRows = groupChildRows.filter((row) => { return !row.isParentGroupFavorite && (row.directoryRow as IDashboardRow).teamScope.teamId === groupRow.teamId });
            }
            else {
                groupChildRows = groupChildRows.filter((row) => { return row.isParentGroupFavorite });
            }

            groupRow.rowCount = groupChildRows.filter((row) => (row.directoryRow as IDashboardRow).isMatch).length;
            if (groupRow.rowCount === 0) {
                groupRow.isMatch = false;
            }
            if (groupRow.isCollapsed) {
                groupChildRows.forEach((row) => {
                    (row.directoryRow as IDashboardRow).isMatch = false
                });
            }

            const oldGroupTitle = groupRow.title;

            if (groupRow.rowCount > 0 && groupRow.isMatch) {
                groupRow.title = oldGroupTitle + ` (${groupRow.rowCount})`;
            }

            // the special case for the zero favorites where we would need to inject a dummy row.
            const identifyIfOnlySentinelFavoriteRow = Utils_Array.first(rows, (row) => {
                return !row.isGroupRow && (row.directoryRow as IDashboardRow).teamScope.teamId ===
                    DataConstants.SentinelTeam
            });
            if (groupRow.rowCount == 1 && groupRow.isFavorite && identifyIfOnlySentinelFavoriteRow) {
                groupRow.title = oldGroupTitle;
            }
        })
    }

    private textFilterMatch(row: IDashboardRow, filterText: string): boolean {
        if (!row.dashboard) {
            return false;
        }
        return (
            (this.isSentinelTeamRow(row) && !this.isSearching()) ||
            // need to switch these to be locale formatted once that is available.
            Utils_String.caseInsensitiveContains(row.dashboard.name || Utils_String.empty, filterText) ||
            Utils_String.caseInsensitiveContains(row.teamScope.teamName || Utils_String.empty, filterText) ||
            Utils_String.caseInsensitiveContains(row.dashboard.description || Utils_String.empty, filterText)
        );
    }

    private teamFilterMatch(row: IDashboardRow, teams: string[]): boolean {
        if (!row.dashboard) {
            return false;
        }
        return (
            (this.isSentinelTeamRow(row) && !this.isSearching()) ||
            Utils_Array.arrayContains(row.teamScope.teamId, teams, (a, b) => Utils_String.ignoreCaseComparer(a, b) === 0) ||
            Utils_Array.arrayContains(row.teamScope.teamName, teams, (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0)
        );
    }

    private initialTeamFilterMatch(row: IDashboardRow, teamId: string): boolean {
        if (!row.dashboard) {
            return false;
        }
        return (
            (this.isSentinelTeamRow(row) && !this.isSearching()) ||
            Utils_String.localeIgnoreCaseComparer(row.teamScope.teamName, teamId) === 0 ||
            Utils_String.ignoreCaseComparer(row.teamScope.teamId, teamId) === 0
        );
    }

    private isSentinelTeamRow(row: IDashboardRow): boolean {
        return row.teamScope.teamName === DataConstants.SentinelTeam;
    }

    private isSearching(): boolean {
        return this.filter.teamsFilter.length > 0 ||
            this.filter.textFilter !== "" ||
            !!this.filter.initialTeamId;
    }

    private handleToggleGroupRowForPivot(payload: PivotGroupTogglePayload, toggle: boolean): void {
        const pivotExpansion = this.pivotExpansionStatesMap[payload.pivot];
        if (pivotExpansion) {
            pivotExpansion[payload.teamId] = toggle;
            this.emitChanged();
        }
    }

    @autobind
    private handleExpandGroupRowForPivot(payload: PivotGroupTogglePayload): void {
        this.handleToggleGroupRowForPivot(payload, true);
    }

    @autobind
    private handleCollapseGroupRowForPivot(payload: PivotGroupTogglePayload): void {
        this.handleToggleGroupRowForPivot(payload, false);
    }

    @autobind
    private filterViewForPivot(filterPayload: FilteredPayload): void {
        this.filter = filterPayload;
        this.emitChanged();
    }

    @autobind
    private updateFavorite(data: FavoriteItemData): void {
        const dashboard = data.favorite.artifactId;
        if (!data.favorited)
        {
            if (this.favoritesSet.has(dashboard)) {
                this.favoritesSet.delete(dashboard);
                delete this.favoriteIdToFavoriteMap[dashboard];
            }
        }
        else {
            Object.keys(this.teamToDashboardsMap).forEach((teamId: string) => {
                const teamDashboards = this.teamToDashboardsMap[teamId];
                if (teamDashboards) {
                    teamDashboards.forEach((item: DashboardItem) => {
                        if (item.dashboard.id === data.favorite.artifactId) {
                            this.favoriteIdToFavoriteMap[dashboard] = {
                                dashboardItem: item,
                                favorite: data.favorite
                            }
                            this.favoritesSet.add(dashboard);
                        }
                    });
                }
            });
        }

        this.emitChanged();
    }

    @autobind
    private changeColumnSortForPivot(columnSortChangePayload: ColumnSortChangePayload): void {
        let pivotSortOptions = this.pivotSortOptionsMap[columnSortChangePayload.pivot];
        if (pivotSortOptions && pivotSortOptions.isSortable) {
            const isColumnAlreadySorted: boolean = pivotSortOptions.sortColumn.localeCompare(columnSortChangePayload.columnName) === 0;
            pivotSortOptions.sortColumn = columnSortChangePayload.columnName;
            pivotSortOptions.isSortedDescending = isColumnAlreadySorted && !pivotSortOptions.isSortedDescending;
        }

        this.emitChanged();
    }

    @autobind
    private UpdatedDashboardDirectoryState(dashboardUpdatedPayload: DashboardUpdatedPayload): void {
        if (dashboardUpdatedPayload.isSuccessful) {
            let dashboardItem = dashboardUpdatedPayload.dashboardItem;
            this.updatedDashboardsMap.set(dashboardItem.dashboard.id, dashboardItem);
            this.pivotMessageMap[dashboardUpdatedPayload.pivot] = null;
        } else {
            this.pivotMessageMap[dashboardUpdatedPayload.pivot] = {
                message: dashboardUpdatedPayload.errorMessage,
                messageLevel: MessageLevel.Error
            };
        }

        this.emitChanged();
    }

    @autobind
    private DeletedDashboardDirectoryState(dashboardDeletedPayload: DashboardDeletedPayload): void {
        if (dashboardDeletedPayload.isSuccessful) {
            this.deletedDashboardSet.add(dashboardDeletedPayload.dashboardId);
            this.favoritesSet.delete(dashboardDeletedPayload.dashboardId);
            this.pivotMessageMap[dashboardDeletedPayload.pivot] = null;
        } else {
            this.pivotMessageMap[dashboardDeletedPayload.pivot] = {
                message: dashboardDeletedPayload.errorMessage,
                messageLevel: MessageLevel.Error
            };
        }

        this.emitChanged();
    }

    @autobind
    private clearMessageForPivot(pivot: string): void {
        delete this.pivotMessageMap[pivot];

        this.emitChanged();
    }

    @autobind
    private receiveStateForPivot(pivotDataReceivedPayload: PivotDataReceivedPayload): void {
        this.filter = pivotDataReceivedPayload.initialFilter;

        // setup options
        const currentPivot = pivotDataReceivedPayload.pivot;
        this.pivotLoadedMap.add(currentPivot);

        // Reset messages for a pivot on load.
        this.pivotMessageMap[currentPivot] = null;

        this.pivotSortOptionsMap[currentPivot] = pivotDataReceivedPayload.sortOptions;
        this.pivotGroupingVisibilityMap[currentPivot] = pivotDataReceivedPayload.isGroupedView;
        this.pivotFavoriteGroupVisibilityMap[currentPivot] = pivotDataReceivedPayload.isGroupedView ?
            pivotDataReceivedPayload.showFavoriteGroup : false;
        this.pivotExpansionStatesMap[currentPivot] = pivotDataReceivedPayload.initialExpansionStateForGroups;

        // setup favorites
        this.favoritesSet = new Set();
        this.favoriteIdToFavoriteMap = {};
        pivotDataReceivedPayload.favorites.forEach((favoriteItem: IExtendedFavorite) => {
            this.favoritesSet.add(favoriteItem.favorite.artifactId);
            this.favoriteIdToFavoriteMap[favoriteItem.favorite.artifactId] = favoriteItem;
        });

        // setup teams and dashboards
        let teamScopes = pivotDataReceivedPayload.dashboards.map((item) => item.teamScope);
        teamScopes = Utils_Array.uniqueSort(teamScopes, (a, b) => {
            return Utils_String.ignoreCaseComparer(a.teamName, b.teamName);
        });

        const teamIds = teamScopes.map((x) => x.teamId);
        this.pivotTeamsMap[currentPivot] = teamScopes;
        this.teamToDashboardsMap = {};
        teamIds.forEach((id) => {
            this.teamToDashboardsMap[id] = [];
        });
        pivotDataReceivedPayload.dashboards.forEach((dashboardItem: DashboardItem) => {
            if (this.teamToDashboardsMap[dashboardItem.teamScope.teamId]) {
                this.teamToDashboardsMap[dashboardItem.teamScope.teamId].push(dashboardItem);
            }
        });
        this.pivotToDashboardsMap[currentPivot] = pivotDataReceivedPayload.dashboards;

        this.emitChanged();

        // This code gets run every time a pivot switch happens, to mark the first time it happens so we only record TTI once
        if (!this.hasRecordedTTI) {
            this.hasRecordedTTI = true;
            Performance.getScenarioManager().recordPageLoadScenario(
                DashboardsTelemetryConstants.Area,
                DashboardsTelemetryConstants.DirectoryScenario
            );
        }
    }
}
