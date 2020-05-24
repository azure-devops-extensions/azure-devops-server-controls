import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";

export interface IBacklogsHubHeaderData {
    /** Current team's ID */
    teamId: string;
    /** Current team's name */
    teamName: string;
    /** Current backlog id */
    backlogId: string;
    /** All backlog levels for the current team */
    allBacklogLevels: IBacklogLevelConfiguration[];
    /** Visible backlog levels for the current team */
    visibleBacklogLevels: IBacklogLevelConfiguration[];
    /** Does the current team have iterations */
    hasIterations: boolean;
    /** The name of the requirement backlog level */
    requirementLevelName: string;
    /** Optional exception information */
    exceptionInfo?: ExceptionInfo;
    /** This is a signature (hash) of backlog levels that are detected as being newly added.
     * We use this to show the "A new backlog level has been configured for this project..." banner
     */
    newBacklogLevelsSignature: string;
}