import { WidgetSettings, Size } from "TFS/Dashboards/WidgetContracts";

import { RadioSettingsFieldPickerSettings } from "Widgets/Scripts/Shared/RadioSettingsFieldPicker";
import { ITrackName } from "Widgets/Scripts/Shared/WidgetLiveTitle";
import { Board, Column } from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";

/*
 * ======================================== Analytics Data Models ==========================================
 * The following interfaces do not match 1-to-1 with the names of the entities in the analytics service,
 * nor do they expose all of the properties of those entities. These interfaces only expose what
 * we query for from the analytics service.
 */

/**
 * A sample point in the CFD history.
 *
 * Exported for unit testing purposes.
 */
export interface CFDSamplePoint {
    /** The number of work items */
    Count: number;

    /**
     * The date at which the data point was sampled (account time zone).
     */
    SampleDate: string;

    /**
     * The ID of the column represented by this sample point.
     */
    ColumnId: string;
}

/**
 * The format of the data returned by the OData query representing a sample point in the CFD history.
 *
 * Exported for unit testing purposes.
 */
export interface WorkItemBoardSnapshot {
    /** The number of work items */
    Count: number;

    /**
     * A surrogate key for the date at which the data point was sampled.
     * Analytics implements this as a number constructed from the sample date formatted as "yyyyMMdd".
     * So a sample on 2016-01-02 would have a DateSK of 20160102.
     * We ask for DateSK instead of Date/Date to improve performance. Asking for Date/Date requires
     * lookups in the SQL backend of Analytics whereas we can just query using DateSK instead to get the same
     * information without Analytics having to do the lookups.
     */
    DateSK: number;

    /**
     * The ID of the column represented by this sample point.
     */
    ColumnId: string;
}

// ========================================================================================================

/** The options used for retrieving CFD chart data */
export interface CumulativeFlowHistoryOptions {
    /** The name or ID of a project */
    project: string;

    /** The name or ID of a team within the given project */
    team: string;

    /** The ID of a board within the given team within the given project */
    board: string;

    /**
     * (Optional)
     * The name of a swimlane/row for a board.
     * A value of null/undefined/empty string means don't filter on lane.
     */
    boardLane?: string;

    /**
     * Contains settings related to defining a time period.
     * The settings are associated with a particular identifier to identify the kind of settings stored.
     *
     * Identifiers: RollingPeriod, StartDate
     *
     * RollingPeriod (Type: number)
     *     Defines a rolling time period prior to today for the CFD
     *
     * StartDate (Type: string)
     *     A date string (yyyy-MM-dd) defining the range of dates to show on the CFD
     *     from the start date to today.
     */
    timePeriod: RadioSettingsFieldPickerSettings<number | string>;

    /** Whether or not to include the first Kanban column in the CFD chart */
    includeFirstBoardColumn: boolean;
}

/**
 * Used in conjunction with the RadioFieldSelector to identify the kind of settings returned by the selector.
 * The settings can then be cast to a definite type and used as normal.
 */
export class TimePeriodFieldIdentifiers {
    public static get StartDate(): string { return "StartDate"; };
    public static get RollingPeriod(): string { return "RollingPeriod"; };
}

export interface CumulativeFlowDiagramSettings extends ITrackName {
    chartDataSettings: CumulativeFlowHistoryOptions;
    themeName: string;
}