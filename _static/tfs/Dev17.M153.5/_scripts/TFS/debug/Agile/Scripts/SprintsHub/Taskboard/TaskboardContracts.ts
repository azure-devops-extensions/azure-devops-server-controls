import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import * as Cards from "Agile/Scripts/Card/Cards";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ISprintCapacityData } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { ITaskboardModelOptions } from "Agile/Scripts/Taskboard/TaskBoardModel";

/** Taskboard data from the data provider */
export interface ISprintTaskboardData {
    /** Model used to render the taskboard view */
    taskboardModel: ITaskboardModelOptions;

    /** Board card settings for this taskboard */
    boardCardSettings: Cards.IBoardCardSettings;

    /** Exception info */
    exceptionInfo: ExceptionInfo;

    /** Iteration for this taskboard */
    iterationId: string;

    /** Work item types available to add for this taskboard.  Used in the Hub Header add new item command. */
    newWorkItemTypes: string[];

    /** Initial settings to use for the taskboard filter */
    initialFilterState: string;
}

export interface ISprintTaskboardInitialPayload {
    taskboardContentData: ISprintTaskboardData;
    capacityData: ISprintCapacityData;
    teamCapacityModel: TeamCapacityModel;
}