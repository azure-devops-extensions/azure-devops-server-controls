import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { ITaskboardDetailsPanelOptions } from "Agile/Scripts/SprintsHub/Taskboard/Components/TaskboardWrapper";
import { ISprintTaskboardInitialPayload } from "Agile/Scripts/SprintsHub/Taskboard/TaskboardContracts";
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";

@registerDiagActions
export class TaskboardActions extends ActionsHub {
    public readonly taskboardContentAvailable: Action<ISprintTaskboardInitialPayload> = this.createAction<ISprintTaskboardInitialPayload>();
    public readonly loadTaskboardFailed: Action<ExceptionInfo[]> = this.createAction<ExceptionInfo[]>();
    public readonly updateLoadingStatus: Action<LoadingStatus> = this.createAction<LoadingStatus>();
    public readonly groupByChanged: Action<TaskboardGroupBy> = this.createAction<TaskboardGroupBy>();
    public readonly setNewWorkItemButtonState: Action<boolean> = this.createAction<boolean>();
    public readonly toggleFilterBarVisible: Action<boolean> = this.createAction<boolean>();
    public readonly isFiltered: Action<boolean> = this.createAction<boolean>();
    public readonly setRightPanelId: Action<string> = this.createAction<string>();
    public readonly initializeRightPanelContext: Action<ITaskboardDetailsPanelOptions> = this.createAction<ITaskboardDetailsPanelOptions>();
}
