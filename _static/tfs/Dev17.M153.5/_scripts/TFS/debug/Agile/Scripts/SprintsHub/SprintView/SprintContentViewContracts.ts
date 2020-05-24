import * as React from "react";

import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import { IPivotItemContentProps } from "Agile/Scripts/Common/Components/PivotItemContent";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration, IterationTimeframe } from "Agile/Scripts/Models/Iteration";
import { ITeam, Team } from "Agile/Scripts/Models/Team";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { IWorkDetailsPanelData } from "Agile/Scripts/SprintsHub/WorkDetailsPanel/WorkDetailsContracts";
import { DateRange } from "TFS/Work/Contracts";
import { Contribution } from "VSS/Contributions/Contracts";
import { IViewOptions } from "VSSUI/Utilities/ViewOptions";

/** Hub content header data coming from the data provider */
export interface ISprintHubHeaderData {

    /** Current team's ID */
    teamId: string;

    /** Current team's name */
    teamName: string;

    /** Weekends for this team */
    teamWeekends: number[];

    /** Days off for the whole team */
    teamDaysOff: DateRange[];

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
}

export interface ITeamIterations {
    currentIteration: Iteration;
    futureIterations: Iteration[];
    pastIterations: Iteration[];
}

export const enum ViewActionKey {
    SHOW_PARENTS_KEY = "show-parents",
    GROUP_BY_KEY = "group-by",
    RIGHT_PANEL = "right-panel",
}

export const enum RightPanelKey {
    OFF = "Off",
    PLANNING = "Planning",
    WORK_DETAILS = "Work Details",
    // M136 Introduced bug where work-details was renamed to Work Details
    // Use this key to check for both
    __WORK_DETAILS_LEGACY = "work-details"
}

export interface IRightPanelContributionState {
    contributionId: string;
    size: number;
}

/**
 * Data used by the right panel displayed in the Sprints hub.
 */
export interface ISprintViewRightPanelData {
    loading: boolean;

    /**
     * The id of the contribution currently being displayed.
     */
    selectedContributionId: string;

    /**
     * Optional. Data required to display work details in the panel.
     */
    workDetailsData?: IWorkDetailsPanelData;

    /**
     * Optional. Data required to display third-party contributions in the panel.
     */
    contributionData?: Contribution;

    /**
     * Helper for subscribing to events of interest to the right panel.
     */
    eventHelper: ScopedEventHelper;

    /**
     * Function to call in the right panel for getting selected work items.
     */
    getSelectedWorkItems: () => IBacklogGridItem[];

    exceptionsInfo: ExceptionInfo[];
}

/**
 * Data being passed from the sprints view to the individual pivots
 */
export interface ISprintViewPivotContext extends IPivotItemContentProps {
    /** Indicates to the pivot that it should force refresh its data providers */
    shouldReloadDataProviders: boolean;
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

    /** Name of the pivot the Pivot context is for e.g. Backlog, Taskboard, Capacity */
    pivotName: string;

    /** View options as set by the viewActions */
    viewOptions: IViewOptions;

    onOpenSettings(event: React.MouseEvent<HTMLElement>);

    onPlanSprint(event: React.MouseEvent<HTMLElement>);

    onSprintPickerClicked(event: React.MouseEvent<HTMLElement>);

    setFocusOnHub(): void;

    onTeamDaysOffUpdated(newTeamDaysOff: DateRange[]): void;
}

export interface ISprintViewActionContext {
    iteration: {
        name: string;
        path: string;
        id: string;
        start?: Date;
        finish?: Date;
    };
    team: {
        id: string;
        name: string;
    };
}

export interface ISprintsPickListData {
    teams: ITeam[];
}