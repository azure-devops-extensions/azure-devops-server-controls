import { Team } from "Agile/Scripts/Models/Team";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";

export interface IDirectoryFilterState {
    /** Is the bar loading */
    isLoading: boolean;
    /** The teams to display in the filter */
    teams: Team[];
}

/**
 * Get the data needed to render the Directory filter bar
 * @param directoryStore The store to use
 * @param currentPivot The current active pivot
 */
export function getFilterState(directoryStore: IDirectoryStore, currentPivot: DirectoryPivotType): IDirectoryFilterState {
    if (currentPivot === DirectoryPivotType.all) {
        if (!directoryStore.isAllDataInitialized) {
            return {
                isLoading: true,
                teams: []
            };
        }

        return {
            teams: directoryStore.allTeams,
            isLoading: false
        };
    }

    if (currentPivot === DirectoryPivotType.mine) {
        if (!directoryStore.isMyDataInitialized) {
            return {
                isLoading: true,
                teams: []
            };
        }

        return {
            teams: directoryStore.myAndFavoriteTeams,
            isLoading: false
        };
    }
}
