import { IIterationEffort, IPlanningWorkItem } from "Agile/Scripts/BacklogsHub/Planning/PlanningContracts";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { DateRange } from "TFS/Work/Contracts";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";

@registerDiagActions
export class PlanningActions extends ActionsHub {
    constructor() {
        super("PLANNING");
    }

    public readonly iterationsLoaded: Action<IIterationsLoadedPayload> = this.createAction<IIterationsLoadedPayload>();
    public readonly beginLoadIteration: Action<string[]> = this.createAction<string[]>();
    public readonly iterationEffortLoadSucceeded: Action<IIterationEffort> = this.createAction<IIterationEffort>();
    public readonly iterationEffortLoadFailed: Action<IIterationEffortLoadFailedPayload> = this.createAction<IIterationEffortLoadFailedPayload>();
    public readonly iterationTeamDaysOffLoadSucceeded: Action<IIterationTeamDaysOff> = this.createAction<IIterationTeamDaysOff>();
    public readonly iterationLoadComplete: Action<string> = this.createAction<string>();
    public readonly toggleNewSprintCallout: Action<boolean> = this.createAction<boolean>();
    public readonly weekendsLoaded: Action<number[]> = this.createAction<number[]>();
    public readonly workItemChanged: Action<IPlanningWorkItem> = this.createAction<IPlanningWorkItem>();

    public readonly resetData: Action<void> = this.createAction<void>();

    /**
     * Tracks when work item is removed from planning e.g. work item is deleted or is not member of backlog anymore
     */
    public readonly workItemRemoved: Action<number> = this.createAction<number>();
}

export interface IIterationsLoadedPayload {
    iterations: Iteration[];
    backlogIteration: Iteration;
    currentIterationId: string;
}

export interface IIterationEffortLoadFailedPayload {
    iterationId: string;
    error: TfsError;
}

export interface IIterationTeamDaysOff {
    iterationId: string;
    teamDaysOffUTC: DateRange[];
}
