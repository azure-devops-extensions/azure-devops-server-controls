import { IIterationEffort } from "Agile/Scripts/BacklogsHub/Planning/PlanningContracts";
import { IPlanningStore } from "Agile/Scripts/BacklogsHub/Planning/Store/PlanningStore";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { DateRange } from "TFS/Work/Contracts";

export interface IPlanningViewState {
    backlogIteration: Iteration;
    currentIterationId: string;
    isNewSprintCalloutVisible: boolean;
    iterations: Iteration[];
    iterationEfforts: IDictionaryStringTo<IIterationEffort>;
    iterationSummaryErrors: IDictionaryStringTo<TfsError>;
    iterationLoading: IDictionaryStringTo<boolean>;
    iterationTeamDaysOffUTC: IDictionaryStringTo<DateRange[]>;
    weekends: number[];
}

export function getState(store: IPlanningStore): IPlanningViewState {
    return {
        backlogIteration: store.backlogIteration,
        currentIterationId: store.currentIterationId,
        isNewSprintCalloutVisible: store.isNewSprintCalloutVisible,
        iterations: store.iterations,
        iterationEfforts: store.iterationEfforts,
        iterationSummaryErrors: store.iterationSummaryErrors,
        iterationLoading: store.iterationLoading,
        iterationTeamDaysOffUTC: store.iterationTeamDaysOffUTC,
        weekends: store.weekends
    };
}