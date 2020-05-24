import { ITeam } from "Agile/Scripts/Models/Team";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ITeamBoardContentViewStore } from "Agile/Scripts/BoardsHub/TeamBoardContentView/Store/TeamBoardContentViewStore";

export interface ITeamBoardContentViewState {
    team: ITeam;
    currentBacklog: IBacklogLevelConfiguration;
    nextBacklog: IBacklogLevelConfiguration;
    visibleBacklogLevels: IBacklogLevelConfiguration[];
    exceptionInfo: ExceptionInfo;
    headerDataReady: boolean;
    hasIterations: boolean;
    isRequirementBacklog: boolean;

    hubName: string;
    backlogId: string;
    allBacklogLevels: IBacklogLevelConfiguration[];
    requirementLevelName: string;

    newBacklogLevelsSignature: string;
}

export function getState(store: ITeamBoardContentViewStore): ITeamBoardContentViewState {
    return {
        team: store.headerData.team,
        currentBacklog: store.currentBacklog,
        nextBacklog: store.nextBacklog,
        visibleBacklogLevels: store.headerData.visibleBacklogLevels,
        exceptionInfo: store.exceptionInfo,
        headerDataReady: store.headerDataReady,
        hasIterations: store.headerData.hasIterations,
        isRequirementBacklog: store.isRequirementBacklog,
        requirementLevelName: store.headerData.requirementLevelName,

        hubName: store.headerData.hubName,
        backlogId: store.currentBacklog && store.currentBacklog.id,
        allBacklogLevels: store.headerData.allBacklogLevels,

        newBacklogLevelsSignature: store.headerData.newBacklogLevelsSignature
    };
}