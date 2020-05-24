import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { IProductBacklogQueryResult } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ISprintCapacityData } from "Agile/Scripts/SprintsHub/Common/CommonContracts";

/**
 * Data contract for the SprintsHubBacklogDataProvider
 */
export interface ISprintBacklogPivotData {
    /** The backlog context data */
    backlogContext: IBacklogContextData;

    /**
     * The backlog grid data
     * Contains rows, columns, and product backlog grid options
     */
    backlogQueryResults: IProductBacklogQueryResult;

    /** The initial filter */
    initialBacklogFilterJson: string;

    /**
     * Server exception information.
     */
    exceptionInfo: ExceptionInfo;
}

export interface ISprintBacklogInitialPayload {
    activeWorkItemTypes: string[];
    backlogContentData: ISprintBacklogPivotData;
    capacityData: ISprintCapacityData;
}