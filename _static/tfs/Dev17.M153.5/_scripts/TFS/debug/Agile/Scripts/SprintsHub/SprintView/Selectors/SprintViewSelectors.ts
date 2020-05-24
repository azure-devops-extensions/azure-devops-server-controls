import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration, IterationTimeframe } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { ITeamIterations } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { SprintsViewStore } from "Agile/Scripts/SprintsHub/SprintView/Store/SprintsViewStore";
import { DateRange } from "TFS/Work/Contracts";

export interface ISprintViewState {
    isSprintEditorPaneOpen: boolean;
    isSprintPickerCalloutOpen: boolean;
    status: LoadingStatus;

    /** Current team */
    team: Team;

    /** Selected iteration */
    selectedIteration: Iteration;

    /** The selected iteration timeframe value */
    selectedIterationTimeframe: IterationTimeframe;

    /** Next Iteration */
    nextIteration?: Iteration;

    /** Previous Iteration */
    previousIteration?: Iteration;

    /** Friendly path for URL */
    backlogIterationFriendlyPath?: string;

    /** Optional exception information */
    exceptionInfo: ExceptionInfo;

    /** Past, Current and future iterations for the team */
    teamIterations: ITeamIterations;

    /** The days of the week marked as weekends */
    teamWeekends: number[];

    /** Team days off */
    teamDaysOff: DateRange[];
}

export namespace SprintViewSelectors {
    export function getSprintViewState(store: SprintsViewStore): ISprintViewState {
        return {
            isSprintEditorPaneOpen: store.isSprintEditorPaneOpen,
            isSprintPickerCalloutOpen: store.isSprintPickerCalloutOpen,
            team: store.team,
            selectedIteration: store.selectedIteration,
            selectedIterationTimeframe: store.selectedIterationTimeframe,
            nextIteration: store.nextIteration,
            previousIteration: store.previousIteration,
            backlogIterationFriendlyPath: store.backlogIterationFriendlyPath,
            exceptionInfo: store.exceptionInfo,
            teamIterations: store.teamIterations,
            teamWeekends: store.teamWeekends,
            teamDaysOff: store.teamDaysOff,
            status: store.status
        };
    }
}