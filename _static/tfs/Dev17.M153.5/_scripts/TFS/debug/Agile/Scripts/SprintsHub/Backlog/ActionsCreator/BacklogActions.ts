import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ISprintBacklogInitialPayload } from "Agile/Scripts/SprintsHub/Backlog/BacklogContracts";
import { IBacklogRightPanelContext } from "Agile/Scripts/SprintsHub/Backlog/Components/BacklogWrapper";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";

@registerDiagActions
export class BacklogActions extends ActionsHub {
    public readonly beginLoadBacklog: Action<LoadingStatus> = this.createAction<LoadingStatus>();
    public readonly isFiltered: Action<boolean> = this.createAction<boolean>();
    public readonly loadBacklogFailed: Action<ExceptionInfo[]> = this.createAction<ExceptionInfo[]>();
    public readonly loadBacklogDataSucceeded: Action<ISprintBacklogActionPayload> = this.createAction<ISprintBacklogActionPayload>();
    public readonly backlogItemAdded: Action<void> = this.createAction<void>();
    public readonly updateAddItemCalloutVisibility: Action<boolean> = this.createAction<boolean>();
    public readonly toggleFilterBarVisible: Action<boolean> = this.createAction<boolean>();
    public readonly rightPanelContributionsLoaded: Action<Contribution[]> = this.createAction<Contribution[]>();
    public readonly setRightPanelVisibility: Action<string> = this.createAction<string>();
    public readonly rightPanelContextChanged: Action<IBacklogRightPanelContext> = this.createAction<IBacklogRightPanelContext>();
}

export interface ISprintBacklogActionPayload extends ISprintBacklogInitialPayload {
    teamCapacityModel: TeamCapacityModel;
}