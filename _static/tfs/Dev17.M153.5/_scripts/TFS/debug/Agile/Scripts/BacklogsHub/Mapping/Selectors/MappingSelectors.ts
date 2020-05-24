import { IMappingStore } from "Agile/Scripts/BacklogsHub/Mapping/Store/MappingStore";
import { Team } from "Agile/Scripts/Models/Team";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

export interface IMappingPaneState {
    isBacklogLevelVisible: boolean;
    selectedTeam: Team;
    selectedTeamSettings: ITeamSettings;
    teams: Team[];
    teamsLoading: boolean;
    workItemIds: number[];
    workItemIdsLoading: boolean;
    workItemIdsLoadingError: TfsError;
    workItemPageError: TfsError;
}

export function getState(store: IMappingStore): IMappingPaneState {
    return {
        isBacklogLevelVisible: store.isBacklogLevelVisible,
        selectedTeam: store.selectedTeam,
        selectedTeamSettings: store.selectedTeamSettings,
        teams: store.teams,
        teamsLoading: store.teamsLoading,
        workItemIds: store.workItemIds,
        workItemIdsLoading: store.workItemIdsLoading,
        workItemIdsLoadingError: store.workItemIdsLoadingError,
        workItemPageError: store.workItemPageError
    };
}