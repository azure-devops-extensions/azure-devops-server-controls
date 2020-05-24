import { DashboardItem, TeamScope} from "Dashboards/Components/Shared/Contracts";
import { Favorite } from "Favorites/Contracts";

export enum DashboardLoadingState {
    Loading,
    Loaded
}

export enum MessageLevel {
    Info,
    Warning,
    Error,
    Critical
}

export interface IGroupRow {
    /**Is the group collapsed */
    isCollapsed: boolean;

    /** Is the group representing a favorite group */
    isFavorite: boolean;

    /** team represented */
    teamId: string;

    /** title for the row. This would be the name of the team in case of a non favorite group */
    title: string;

    /** number of dashboards under the group. Note that in case a filter is applied, it has the the no of matched rows */
    rowCount: number;

    /** identifies if the row is a match for the current set of filters or search criteria */
    isMatch: boolean;
}

export interface IExtendedFavorite {
    /** favorite data coming down the wire */
    favorite: Favorite;

    /** dashboard and team scope mapping to the favorite. Note that the favorite may not be
    populated with extended properties, which is why we map this information */
    dashboardItem: DashboardItem;
}

export interface IDashboardRow extends DashboardItem {
    /** is this dashboard favorited by the user */
    isFavorite: boolean;

    /** identifies if the row is a match for the current set of filters or search criteria */
    isMatch: boolean;
}

export interface IDirectoryRow {
    /**Row can either be group header or regular dashboard row */
    directoryRow: IGroupRow | IDashboardRow;

    /**Signal if row is group row */
    isGroupRow: boolean;

    /** is under favorite group */
    isParentGroupFavorite: boolean;
}

export interface ISortOptions {
    /** can the view be sorted */
    isSortable: boolean;

     /** Name of the column being sorted */
    sortColumn: string;

    /** Flag indicating sort order (default is false) */
    isSortedDescending: boolean;
}

export interface ISearchOptions {
    /** is the pivot currently being searched */
    isSearching: boolean;
}

export interface IMessageOptions {
    /** string message to be displayed */
    message: string;

    /** severity level for the message */
    messageLevel: MessageLevel;
}

/**
 *  State object interface for pivot UI component
 */
export interface DashboardsDirectoryPivotState {
    /** Row items */
    items: IDirectoryRow[];

     /** Flag indicating if the pivot is loading */
    loadingState: DashboardLoadingState;

    // options on the view for searching
    searchOptions: ISearchOptions;

    // options on the view for sorting.
    sortOptions: ISortOptions;

    // options on the view for any message to be displayed on the pivot.
    messageOptions: IMessageOptions;

    // provide the list of teams to be shown in the picker.
    teamsForPicker: TeamScope[];

    // if the delete button is disabled
    isDeleteDisabled: boolean;

    // the number of dashboards before filtering is applied
    unfilteredDashboardCount: number
    
}

export interface PivotActionPayload {
    /** pivot identifier for the action */
    pivot: string;
}

/**
* payload passed via the data received action.
*/
export interface PivotDataReceivedPayload extends PivotActionPayload {
     /** list of favorites being passed in */
    favorites: IExtendedFavorite[];

    /** list of dashboard Items */
    dashboards: DashboardItem[];

    // teams that are expanded to begin with in a grouped view.
    initialExpansionStateForGroups: IDictionaryStringTo<boolean>;

    /** initial filter state for the pivot */
    initialFilter: FilteredPayload;

    // options on the pivot for sorting.
    sortOptions: ISortOptions;

    // options on the view for any message to be displayed on the pivot.
    messageOptions: IMessageOptions;

    /** identifies if the pivot needs to be a grouped view or a flat list of items */
    isGroupedView: boolean;

    /** identifies if the pivot needs to show the favorite group as the first group */
    showFavoriteGroup: boolean;
}

/**
* payload passed via the group expand/collapse actions
*/
export interface PivotGroupTogglePayload extends PivotActionPayload {
    /** id of the team corresponding to the group to be toggled */
    teamId: string;
}

/**
* payload passed via the group expand/collapse actions
*/
export interface ColumnSortChangePayload extends PivotActionPayload {
    /** column name that identifies the current sort order */
    columnName: string;
}

/**
* payload passed via the dashboard deletion action.
*/
export interface DashboardDeletedPayload extends PivotActionPayload {
    dashboardId: string;
    isSuccessful: boolean;
    errorMessage: string;
}

/**
* payload passed via the dashboard update action. 
*/
export interface DashboardUpdatedPayload extends PivotActionPayload {
    dashboardItem: DashboardItem;
    isSuccessful: boolean;
    errorMessage: string;
}

/**
* payload passed via the filtering action.
*/
export interface FilteredPayload {
    /** current filter state for the keyword filter */
    textFilter: string;

    /** current filter state for the teams pivotdropdown filter */
    teamsFilter: string[];

    /**initial teamId, being provided via the url **/
    initialTeamId: string;
}