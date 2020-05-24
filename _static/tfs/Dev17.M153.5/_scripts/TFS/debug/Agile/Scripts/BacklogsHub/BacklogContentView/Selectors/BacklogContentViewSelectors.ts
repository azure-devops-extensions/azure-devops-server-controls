import { IBacklogContentViewStore } from "Agile/Scripts/BacklogsHub/BacklogContentView/Store/BacklogContentViewStore";
import { Team } from "Agile/Scripts/Models/Team";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";

export interface IBacklogContentViewState {
    /** Current team */
    team: Team;
    /** Current backlog id */
    currentBacklog: IBacklogLevelConfiguration;
    /** The parent backlog id */
    nextBacklog: IBacklogLevelConfiguration;
    /** Visible backlog levels for the current team */
    visibleBacklogLevels: IBacklogLevelConfiguration[];
    /** Exception information */
    exceptionInfo: ExceptionInfo;
    /** Is the header data ready? */
    headerDataReady: boolean;
    /** Does the current team have iterations */
    hasIterations: boolean;
    /** Is the current backlog the requirement backlog */
    isRequirementBacklog: boolean;
    /** This is a signature (hash) of backlog levels that are detected as being newly added.
     * We use this to show the "A new backlog level has been configured for this project..." banner
     */
    newBacklogLevelsSignature: string;
}

export function getState(store: IBacklogContentViewStore): IBacklogContentViewState {
    return {
        visibleBacklogLevels: store.visibleBacklogLevels,
        currentBacklog: store.currentBacklog,
        nextBacklog: store.nextBacklog,
        team: store.team,
        exceptionInfo: store.exceptionInfo,
        headerDataReady: store.headerDataReady,
        hasIterations: store.hasIterations,
        isRequirementBacklog: store.isRequirementBacklog,
        newBacklogLevelsSignature: store.newBacklogLevelsSignature
    };
}