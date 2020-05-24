import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { IPivotItemContentProps } from "Agile/Scripts/Common/Components/PivotItemContent";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Team } from "Agile/Scripts/Models/Team";
import { IBacklogPayload } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { IViewOptions } from "VSSUI/Utilities/ViewOptions";

export interface IContributedPivotContext {
    level: string;

    workItemTypes: string[];

    team: {
        id: string,
        name: string
    };

    foregroundInstance: boolean;
}

/** Data passed from the backlog view to the individual pivots */
export interface IBacklogPivotContext extends IPivotItemContentProps {
    /** Indicates to the pivot that it should force refresh its data providers */
    shouldReloadDataProviders: boolean;
    /** The backlog levels for the team */
    visibleBacklogLevels: IBacklogLevelConfiguration[];

    /** The currently selected backlog configuration */
    currentBacklog: IBacklogLevelConfiguration;

    /** The next highest backlog configuration */
    nextBacklog: IBacklogLevelConfiguration;

    /** The current team */
    team: Team;

    /**  Name of the pivot */
    pivotName: string;

    /** View options as set by the viewActions */
    viewOptions: IViewOptions;

    /** This is a signature (hash) of backlog levels that are detected as being newly added.
     * We use this to show the "A new backlog level has been configured for this project..." banner
     */
    newBacklogLevelsSignature: string;

    /** Indicates if the team has iterations set up */
    hasIterations: boolean;
}

/** Response from the BacklogsHub Backlog data provider */
export interface IBacklogData {
    /** The backlog payload to render the grid */
    backlogPayload: IBacklogPayload;
    /** The backlog context describing the current backlog */
    backlogContext: IBacklogContextData;
    /** The initial filter for the backlog grid */
    initialBacklogFilterJson: string;
    /** Active work item types to be used by the add panel */
    activeWorkItemTypes: string[];

    /** Exception info */
    exceptionInfo?: ExceptionInfo;
}