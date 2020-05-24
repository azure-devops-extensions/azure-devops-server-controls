import { KanbanTimeType } from "Widgets/Scripts/KanbanTime/KanbanTimeContracts";
import { RadioSettingsFieldPickerSettings } from "Widgets/Scripts/Shared/RadioSettingsFieldPicker";
import { ITrackName } from "Widgets/Scripts/Shared/WidgetLiveTitle";
import { WidgetOptions } from "Dashboards/Scripts/Contracts";
import {AnalyticsChartingClient} from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";

export interface KanbanTimeWidgetOptions extends WidgetOptions {
    timeType: KanbanTimeType;
    analyticsClient?: AnalyticsChartingClient;
}

/** 
 * The options used for retrieving chart data for Lead time or Cycle time
 */
export interface KanbanTimeDataSettings {
    /** The name or ID of a project */
    project: string;

    /** The IDs of a team within the given project */
    teamIds: string[];

    /**
     * Identifies the work item types to display on the widget.
     * Either the types associated with a particular backlog category, or an individual work item type.
     * 
     * V2.0.0
     * Identifier is one of the values from WorkItemTypeFilterMode, and the value is either backlog name or WIT item type
     *
     * V1.0.0
     * Identifier is either "Backlog" or "WitType"
     */
    witSelector: RadioSettingsFieldPickerSettings<string>;

    /**
     * Contains settings related to defining a time period.
     * The settings are associated with a particular identifier to identify the kind of settings stored.
     * 
     * Identifiers: RollingPeriod, StartDate
     *
     * RollingPeriod (Type: number)
     *     Defines a rolling time period prior to today
     *
     * StartDate (Type: string)
     *     A date string (yyyy-MM-dd) defining the range of dates to show
     *     from the start date to today.
     */
    timePeriod: RadioSettingsFieldPickerSettings<number | string>;
}

/**
 * Used in conjunction with the RadioFieldSelector to identify the kind of settings returned by the selector.
 * The settings can then be cast to a definite type and used as normal.
 */
export class TimePeriodFieldIdentifiers {
    public static readonly StartDate: string = "StartDate";
    public static readonly RollingPeriod: string = "RollingPeriod";
}

/**
 * The identifiers used for the WIT selector in settings version 1.0.0.
 */
export class WitSelectorIdentifierValues_V1_0_0 {
    public static readonly Backlog: string = "Backlog";
    public static readonly WitType: string = "WitType";
}

export interface KanbanTimeSettings extends ITrackName {
    dataSettings: KanbanTimeDataSettings;
}
