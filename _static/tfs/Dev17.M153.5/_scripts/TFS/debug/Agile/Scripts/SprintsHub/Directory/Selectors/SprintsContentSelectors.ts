import { IDirectoryRow, IDirectoryRowGroup } from "Agile/Scripts/Common/Directory/Components/DirectoryGrid";
import { IFavoriteData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { getMyRows, teamMatchesFilter } from "Agile/Scripts/Common/Directory/Selectors/ContentSelectors";
import { IDirectoryFilterStore } from "Agile/Scripts/Common/Directory/Store/DirectoryFilterStore";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { SprintsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { DirectoryConstants } from "Agile/Scripts/Generated/HubConstants";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import * as SprintDirectoryResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.Directory";
import { ISprintsDirectoryStore } from "Agile/Scripts/SprintsHub/Directory/Store/SprintsDirectoryStore";
import { format } from "VSS/Utils/String";
import { IFilterState } from "VSSUI/Utilities/Filter";

/** 
 * The row type that will be used in the DirectoryGrid for Sprints experiences 
 */
export interface ISprintDirectoryRow extends IDirectoryRow<ITeamIteration> {
    /** The iteration title */
    iterationTitle: string;
    /** The iteration start date */
    iterationStartDate: Date;
    /** The iteration finish date */
    iterationFinishDate: Date;
}

export interface ITeamIteration {
    team: Team;
    iteration: Iteration;
}

/**
 * The state for the All Sprints Directory pivot
 */
export interface IAllSprintsState {
    /** The exception info */
    exceptionInfo: ExceptionInfo;
    /** Indicates if the data for this pivot is initialized */
    isInitialized: boolean;
    /** The configured page size */
    pageSize: number;
    /** Any help text that should be displayed */
    helpText: string;
    /** Constructed row groups to display */
    rowGroups: IDirectoryRowGroup<ITeamIteration, ISprintDirectoryRow>[];
    /** Indicates if no rows were returned from the server */
    zeroData: boolean;
    /** Indicates if the filter caused the rows to be empty */
    zeroFilterData: boolean;
}

/**
 * The state for the My Sprints Directory pivot
 */
export interface IMySprintsState {
    /** The exception info */
    exceptionInfo: ExceptionInfo;
    /** Indicates if the data for this pivot is initialized */
    isInitialized: boolean;
    /** Indicates if the filter is active */
    isFilterActive: boolean;
    /** Constructed row groups to display */
    rowGroups: IDirectoryRowGroup<ITeamIteration, ISprintDirectoryRow>[];
    /** Indicates if the filter caused the rows to be empty */
    zeroFilterData: boolean;
}

/**
 * Get the state for the all sprints directory pivot
 * @param directoryStore The directory store
 * @param directoryFilterStore The directory filter store
 * @param sprintDirectoryStore The sprint directory store
 */
export function getAllSprintsData(directoryStore: IDirectoryStore, directoryFilterStore: IDirectoryFilterStore, sprintDirectoryStore: ISprintsDirectoryStore): IAllSprintsState {
    if (!directoryStore.isAllDataInitialized || (!directoryStore.allExceptionInfo && (!directoryFilterStore.isAllFilterInitialized || !sprintDirectoryStore.isAllDataInitialized))) {
        return {
            exceptionInfo: null,
            isInitialized: false,
            pageSize: null,
            helpText: "",
            rowGroups: [],
            zeroData: false,
            zeroFilterData: false
        };
    }

    // Return error information if present
    if (directoryStore.allExceptionInfo || sprintDirectoryStore.pageTeamsFailedError) {
        return {
            exceptionInfo: directoryStore.allExceptionInfo || sprintDirectoryStore.pageTeamsFailedError,
            isInitialized: true,
            pageSize: null,
            helpText: "",
            rowGroups: [],
            zeroData: false,
            zeroFilterData: false
        };
    }

    // Build, filter the rows
    const currentFilter: IFilterState = directoryFilterStore.allFilter;
    const isFilterActive: boolean = directoryFilterStore.isFilterActive(currentFilter);

    const pagedTeamIds: string[] = sprintDirectoryStore.pagedTeamIds;
    let teams: Team[] = pagedTeamIds.map(tId => directoryStore.getTeam(tId));

    if (isFilterActive) {
        teams = teams.filter(t => teamMatchesFilter(currentFilter, t));
    }

    // There is only one row group for the all pivot
    const rowGroup: IDirectoryRowGroup<ITeamIteration, ISprintDirectoryRow> = {
        items: teams.map(t => _directoryRowBuilder(directoryStore, sprintDirectoryStore)(t))
    };

    return {
        exceptionInfo: null,
        isInitialized: true,
        pageSize: sprintDirectoryStore.pageSize,
        helpText: sprintDirectoryStore.pageSize < directoryStore.allTeams.length ? _getHelpText(currentFilter, isFilterActive, sprintDirectoryStore.pageSize) : "",
        rowGroups: [rowGroup],
        zeroData: !isFilterActive && !sprintDirectoryStore.isPagingTeams && teams.length === 0,
        zeroFilterData: isFilterActive && !sprintDirectoryStore.isPagingTeams && teams.length === 0
    };
}

/**
 * Gets the state for the My sprints directory pivot
 * @param directoryStore The directory store
 * @param directoryFilterStore The directory filter store
 * @param sprintDirectoryStore The sprint directory store
 */
export function getMySprintsData(directoryStore: IDirectoryStore, directoryFilterStore: IDirectoryFilterStore, sprintDirectoryStore: ISprintsDirectoryStore): IMySprintsState {
    // Return loading state if the data is being fetched
    if (!directoryStore.isMyDataInitialized || (!directoryStore.myExceptionInfo && (!directoryFilterStore.isMyFilterInitialized || !sprintDirectoryStore.isMyDataInitialized))) {
        return {
            exceptionInfo: null,
            isInitialized: false,
            isFilterActive: false,
            rowGroups: [],
            zeroFilterData: false
        };
    }

    // Return error information if present
    if (directoryStore.myExceptionInfo) {
        return {
            exceptionInfo: directoryStore.myExceptionInfo,
            isInitialized: true,
            isFilterActive: false,
            rowGroups: [],
            zeroFilterData: false
        };
    }

    // Use the common my row data function to retrieve all the data
    const {
        rowGroups,
        isFilterActive,
        zeroFilterData
    } = getMyRows(
        SprintDirectoryResources.Sprints,
        directoryStore,
        directoryFilterStore,
        _directoryRowBuilder(directoryStore, sprintDirectoryStore)
    );

    return {
        exceptionInfo: null,
        isInitialized: true,
        isFilterActive,
        rowGroups,
        zeroFilterData: zeroFilterData
    };
}

/**
 * Function which returns a builder that builds directory rows
 * The builder takes a Team object, joins the current iteration, and constructs the row
 * @param directoryStore The directory store to bind to the builder
 * @param sprintDirectoryStore The sprint directory store to bind to the builder
 */
function _directoryRowBuilder(
    directoryStore: IDirectoryStore,
    sprintDirectoryStore: ISprintsDirectoryStore
): (team: Team, groupKey?: string) => ISprintDirectoryRow {
    return (team: Team, groupKey?: string) => {
        const iteration: Iteration = sprintDirectoryStore.getCurrentIteration(team.id);

        const key = groupKey ? `${groupKey} - ${team.id}` : team.id;
        const favoriteArtifact: IFavoriteData = directoryStore.getFavorite(team.id, true /* only active */);

        return {
            key,
            title: `${team.name} ${SprintDirectoryResources.Sprints}`,
            url: team && iteration ? SprintsUrls.getExternalSprintContentUrl(team.name, iteration.iterationPath) : undefined,
            isDeleted: favoriteArtifact ? favoriteArtifact.isDeleted : false,
            isFavorited: !!favoriteArtifact,
            data: {
                iteration,
                team
            },
            team: team,
            iterationTitle: iteration && iteration.name,
            iterationStartDate: iteration && iteration.startDateUTC,
            iterationFinishDate: iteration && iteration.finishDateUTC,
            errorMessage: directoryStore.getTeamError(team.id)
        };
    };
}

/**
 * Get the help text to display on the all pivot
 * @param currentFilter The current filter
 * @param isFilterActive Is the filter active
 * @param pageSize The configured page size
 */
function _getHelpText(currentFilter: IFilterState, isFilterActive: boolean, pageSize: number): string {
    if (!isFilterActive) {
        return format(SprintDirectoryResources.AllSprints_TeamsLimitExceedeMessage, pageSize);
    } else if (currentFilter[DirectoryConstants.TeamFilterItemKey]) {
        return format(SprintDirectoryResources.AllSprints_TeamFilterLimitExceededMessage, pageSize);
    } else {
        return format(SprintDirectoryResources.AllSprints_FilteredView_TeamsLimitExceedeMessage, pageSize);
    }
}