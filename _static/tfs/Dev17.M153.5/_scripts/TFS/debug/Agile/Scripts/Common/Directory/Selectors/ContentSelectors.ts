import { IFavoriteData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { IDirectoryFilterStore } from "Agile/Scripts/Common/Directory/Store/DirectoryFilterStore";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Team } from "Agile/Scripts/Models/Team";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { arrayContains } from "VSS/Utils/Array";
import { caseInsensitiveContains, equals, format } from "VSS/Utils/String";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { IDirectoryRowGroup, IDirectoryRow } from "Agile/Scripts/Common/Directory/Components/DirectoryGrid";
import { DirectoryConstants } from "Agile/Scripts/Generated/HubConstants";

export const DEFAULT_GROUP = "default";
export const FAVORITE_GROUP = "favorites";

/**
 * The state for the All Directory pivot
 */
export interface IAllDirectoryState {
    /** The exception info */
    exceptionInfo: ExceptionInfo;
    /** Indicates if the data for this pivot is initialized */
    isInitialized: boolean;
    /** The constructed row groups to display */
    rowGroups: IDirectoryRowGroup<Team, IDirectoryRow<Team>>[];
    /** Indicates if a filter caused the rows to be empty */
    zeroFilterData: boolean;
}

/**
 * The state for the My Directory pivot
 */
export interface IMyDirectoryState {
    /** The exception info */
    exceptionInfo: ExceptionInfo;
    /** Indicates if the data for this pivot is initialized */
    isInitialized: boolean;
    /** Indicates if the filter is active */
    isFilterActive: boolean;
    /** The constructed row groups to display */
    rowGroups: IDirectoryRowGroup<Team, IDirectoryRow<Team>>[];
    /** Indicates if a filter caused the rows to be empty */
    zeroFilterData: boolean;
}

/** 
 * Get the state for the All Directory Pivot
 * @param artifactNamePlural The name of the artifact (Boards, Backlogs)
 * @param directoryStore The directory store
 * @param directoryFilterStore The directory filter store
 * @param getArtifactUrl Function to get the URL for an artifact
 */
export function getAllDirectoryData(
    artifactNamePlural: string,
    directoryStore: IDirectoryStore,
    directoryFilterStore: IDirectoryFilterStore,
    getArtifactUrl: (team: Team) => string
): IAllDirectoryState {
    // Return loading state if the data is being fetched
    if (!directoryStore.isAllDataInitialized || (!directoryStore.allExceptionInfo && !directoryFilterStore.isAllFilterInitialized)) {
        return {
            exceptionInfo: null,
            isInitialized: false,
            rowGroups: [],
            zeroFilterData: false
        };
    }

    // Return error information if present
    if (directoryStore.allExceptionInfo) {
        return {
            exceptionInfo: directoryStore.allExceptionInfo,
            isInitialized: true,
            rowGroups: [],
            zeroFilterData: false
        };
    }

    // Build, filter the rows
    const currentFilter: IFilterState = directoryFilterStore.allFilter;
    const isFilterActive: boolean = directoryFilterStore.isFilterActive(currentFilter);

    let teams: Team[] = directoryStore.allTeams || [];
    if (isFilterActive) {
        teams = teams.filter(t => teamMatchesFilter(currentFilter, t));
    }

    const allRowGroup: IDirectoryRowGroup<Team, IDirectoryRow<Team>> = {
        items: teams.map(t => _directoryRowBuilder(artifactNamePlural, directoryStore, getArtifactUrl)(t))
    };

    return {
        exceptionInfo: null,
        isInitialized: true,
        rowGroups: [allRowGroup],
        zeroFilterData: isFilterActive && teams.length === 0
    };
}

/**
 * Get the state for the My Directory Pivot
 * @param artifactNamePlural The name of the artifact (Boards, Backlogs)
 * @param directoryStore The directory store
 * @param directoryFilterStore The directory filter store
 * @param getArtifactUrl Function to get the URL for an artifact
 */
export function getMyDirectoryData(
    artifactNamePlural: string,
    directoryStore: IDirectoryStore,
    directoryFilterStore: IDirectoryFilterStore,
    getUrl: (team: Team) => string
): IMyDirectoryState {
    if (!directoryStore.isMyDataInitialized || (!directoryStore.myExceptionInfo && !directoryFilterStore.isMyFilterInitialized)) {
        return {
            exceptionInfo: null,
            isInitialized: false,
            isFilterActive: false,
            rowGroups: [],
            zeroFilterData: false
        };
    }

    if (directoryStore.myExceptionInfo) {
        return {
            exceptionInfo: directoryStore.myExceptionInfo,
            isInitialized: true,
            isFilterActive: false,
            rowGroups: [],
            zeroFilterData: false
        };
    }

    const {
        rowGroups,
        isFilterActive,
        zeroFilterData
    } = getMyRows(
        artifactNamePlural,
        directoryStore,
        directoryFilterStore,
        _directoryRowBuilder(artifactNamePlural, directoryStore, getUrl)
    );

    return {
        exceptionInfo: null,
        isInitialized: true,
        isFilterActive,
        rowGroups,
        zeroFilterData
    };
}

/**
 * Common function which builds groups for "My" Directory pivots
 * @param artifactNamePlural The name of the artifact (Boards, Backlogs)
 * @param directoryStore The directory store
 * @param directoryFilterStore The directory filter store
 * @param buildDirectoryRow Function which, given a team, will build a directory row of type R
 * @param T The artifact type
 * @param R The row type
 * @returns Row groups to display on a "My" pivot
 */
export function getMyRows<T, R extends IDirectoryRow<T>>(
    artifactNamePlural: string,
    directoryStore: IDirectoryStore,
    directoryFilterStore: IDirectoryFilterStore,
    buildDirectoryRow: (data: Team, groupKey?: string) => R
): {
        rowGroups: IDirectoryRowGroup<T, R>[];
        isFilterActive: boolean;
        zeroFilterData: boolean;
    } {

    const currentFilter: IFilterState = directoryFilterStore.myFilter;
    const isFilterActive: boolean = directoryFilterStore.isFilterActive(currentFilter);
    const rowGroups: IDirectoryRowGroup<T, R>[] = [];
    let zeroFilterData: boolean = false;

    if (isFilterActive) {
        // Filter the teams and favorites together
        const teams = directoryStore.myAndFavoriteTeams.filter(t => teamMatchesFilter(currentFilter, t));

        rowGroups.push({
            items: teams.map(t => buildDirectoryRow(t))
        });

        if (teams.length === 0) {
            zeroFilterData = true;
        }

    } else {
        // Create the favorites group
        rowGroups.push({
            groupKey: FAVORITE_GROUP,
            groupHeader: AgileResources.DirectoryFavoriteGroupTitle,
            expanded: !directoryStore.isGroupCollapsed(FAVORITE_GROUP),
            items: directoryStore.favoriteTeams.map(t => buildDirectoryRow(t, FAVORITE_GROUP))
        });

        // Create the regular group
        rowGroups.push({
            groupKey: DEFAULT_GROUP,
            groupHeader: format(AgileResources.DirectoryMyGroupTitle, artifactNamePlural),
            expanded: !directoryStore.isGroupCollapsed(DEFAULT_GROUP),
            items: directoryStore.myTeams.map<R>(t => buildDirectoryRow(t, DEFAULT_GROUP))
        });
    }

    return {
        rowGroups,
        isFilterActive,
        zeroFilterData
    };
}

/**
 * Checks if a team matches a filter, by text or team id
 * @param activeFilter The active filter
 * @param team The team
 */
export function teamMatchesFilter(
    activeFilter: IFilterState,
    team: Team
): boolean {
    const selectedTeamIds: string[] = activeFilter[DirectoryConstants.TeamFilterItemKey] ?
        activeFilter[DirectoryConstants.TeamFilterItemKey].value.map((t) => t.key)
        : undefined;

    const keywordFilterValue: string = activeFilter[DirectoryConstants.KeywordFilterItemKey] ? activeFilter[DirectoryConstants.KeywordFilterItemKey].value : undefined;

    let matchesFilter = true;
    if (selectedTeamIds && selectedTeamIds.length > 0) {
        matchesFilter = arrayContains(
            team.id,
            selectedTeamIds,
            (a, b) => equals(a, b, /* ignoreCase */ true)
        );
    }

    if (matchesFilter && keywordFilterValue) {
        matchesFilter = caseInsensitiveContains(team.name, keywordFilterValue);
    }

    return matchesFilter;
}

/**
 * Given a team, build a standard directory row
 */
function _directoryRowBuilder(
    artifactNamePlural: string,
    directoryStore: IDirectoryStore,
    getUrl: (team: Team) => string
): (team: Team, groupKey?: string) => IDirectoryRow<Team> {
    return (team: Team, groupKey?: string) => {
        const key = groupKey ? `${groupKey} - ${team.id}` : team.id;
        const favoriteArtifact: IFavoriteData = directoryStore.getFavorite(team.id, true /* only active */);

        return {
            key,
            title: `${team.name} ${artifactNamePlural}`,
            isDeleted: favoriteArtifact ? favoriteArtifact.isDeleted : false,
            isFavorited: !!favoriteArtifact,
            data: team,
            team: team,
            url: getUrl(team),
            errorMessage: directoryStore.getTeamError(team.id)
        };
    }
}