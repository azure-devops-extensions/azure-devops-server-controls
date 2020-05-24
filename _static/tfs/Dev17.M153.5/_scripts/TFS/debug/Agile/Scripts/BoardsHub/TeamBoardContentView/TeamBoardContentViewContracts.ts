import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { ITeam } from "Agile/Scripts/Models/Team";

export interface IBoardsHubHeaderData {
    hubName: string;
    team: ITeam;
    backlogId: string;
    allBacklogLevels: IBacklogLevelConfiguration[];
    visibleBacklogLevels: IBacklogLevelConfiguration[];
    hasIterations: boolean;
    requirementLevelName: string;

    newBacklogLevelsSignature: string;
    backlogLevelName: string;

    exceptionInfo?: ExceptionInfo;
}