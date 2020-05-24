import { IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { DirectoryConstants } from "Agile/Scripts/Generated/HubConstants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import { SprintsDirectoryActions } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryActions";
import { ISprintsDirectoryDataProvider } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryDataProvider";
import { publishErrorToTelemetry } from "VSS/Error";
import { subtract } from "VSS/Utils/Array";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { IFilterState } from "VSSUI/Utilities/Filter";

export interface ISprintsDirectoryActionsCreator {
    /** 
     * Page additional teams based on a filter state 
     * @param filterState The current filter state
     * @param pagedTeamIds The already paged team ids
     * @param allTeams All teams that have been fetched in the system
     */
    pageTeams(filterState: IFilterState, pagedTeamIds: string[], allTeams: Team[]): Promise<void>;

    editSprint(iterationId: string, sourcePivot: DirectoryPivotType): Promise<void>;
}

/** 
 * Actions creator which contains Sprint specific operations for directory pages
 */
export class SprintsDirectoryActionsCreator implements ISprintsDirectoryActionsCreator {
    private _actionsHub: SprintsDirectoryActions;
    private _directoryActionsCreator: IDirectoryActionsCreator;
    private _sprintDirectoryDataProvider: ISprintsDirectoryDataProvider;

    constructor(actionsHub: SprintsDirectoryActions, directoryActionsCreator: IDirectoryActionsCreator, sprintDirectoryDataProvider: ISprintsDirectoryDataProvider) {
        this._actionsHub = actionsHub;
        this._directoryActionsCreator = directoryActionsCreator;
        this._sprintDirectoryDataProvider = sprintDirectoryDataProvider;
    }

    public pageTeams(filterStateChange: IFilterState, pagedTeamIds: string[], allTeams: Team[]): Promise<void> {
        // If a team filter was changed on 'all' pivot, check to see if we need to load any unpaged teams
        if (filterStateChange.hasOwnProperty(DirectoryConstants.TeamFilterItemKey)) {
            const teamFilterState = filterStateChange[DirectoryConstants.TeamFilterItemKey];
            const filterTeamIDs = teamFilterState ? teamFilterState.value.map(f => f.key) : [];

            if (filterTeamIDs.length === 0) {
                if (pagedTeamIds.length < (allTeams || []).length) {
                    // Since teamFilter is cleared and not everything is available in pageData, reload to get fresh data
                    return this._directoryActionsCreator.reloadAllData();
                }
            } else {
                // Check if there are any unpaged teams and fetch them asynchronously
                const teamsToLoad = subtract(filterTeamIDs, pagedTeamIds, ignoreCaseComparer);
                if (teamsToLoad && teamsToLoad.length > 0) {
                    return this._loadUnpagedTeams(teamsToLoad);
                }
            }
        }

        // No operations needed
        return Promise.resolve();
    }

    public editSprint(iterationId: string, sourcePivot: DirectoryPivotType): Promise<void> {
        return this._sprintDirectoryDataProvider.editNode(iterationId).then(() => {
            this._directoryActionsCreator.invalidateData();
            if (sourcePivot === DirectoryPivotType.all) {
                return this._directoryActionsCreator.reloadAllData();
            } else {
                return this._directoryActionsCreator.reloadMyData();
            }
        }, () => {
            // User closed the dialog, do nothing
        });
    }

    private _loadUnpagedTeams(teamsToLoad: string[]): Promise<void> {
        this._actionsHub.beginPagingTeams.invoke(null);
        return this._sprintDirectoryDataProvider.loadMoreIterations(teamsToLoad).then((allResults: Iteration[]) => {
            const iterationMapping = teamsToLoad.reduce((results, teamId, index) => {
                results[teamId] = allResults[index];
                return results;
            }, {});

            this._actionsHub.teamsPaged.invoke(iterationMapping);
        }, (error: TfsError) => {
            if (error) {
                publishErrorToTelemetry(error);
            }
            this._actionsHub.teamsPagedFailed.invoke(error);
        });
    }
}