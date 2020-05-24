import { AggregationMode, TeamScope } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { ITrackName } from 'Widgets/Scripts/Shared/WidgetLiveTitle';
import { DayOfWeek } from "VSS/Common/Contracts/System";

/** Describes a filter for a field  */
export interface FieldFilter {
    /** Reference name of the field */
    fieldName: string;
    /** string representation of OData query operator. Consumer should validate against a whitelist.*/
    queryOperation: string;
    /** User-supplied query value. */
    queryValue: string;
}

/** Describes schemes for  sampling data points over time*/
export enum DateSampleMode {
    /** Indicates the widget is sampling by dates */
    ByDateInterval,
    /** Indicates the widget is sampling on a set of iteration end dates */
    ByIterations
}

/** Describes allowed sample intervals for date sampling. */
export enum DateSampleInterval {
    Days,
    Weeks,
    Months
}

export interface DateSamplingConfiguration {
    /** Uses date format string (See CFD) */
    endDate: string;
    sampleInterval: DateSampleInterval;
    /** Describes the day of week to sample on - if weekly sampling is active. undefined, otherwise. */
    lastDayOfWeek: DayOfWeek;
}

export interface TimePeriodConfiguration {
    /*     * StartDate (Type: string)
     *     A date string (yyyy-MM-dd) defining the range of dates to show on the CFD
     *     from the start date to today.*/
    startDate: string;
    /** Describes sampling mode and contains storage.
     * -Dates uses DateSamplingConfiguration
     * -Iteration mode stores a array of iteration Guids as string */
    samplingConfiguration: ModefulValueSetting<DateSampleMode, string[] | DateSamplingConfiguration>;
}

export interface BurndownSettings extends ITrackName {
    /**A list of project-team tuples  */
    teams: TeamScope[];

    /**
     * Describes the set of work item types to select. Uses WorkItemTypeFilterMode enum strings for identifiers.
     */
    workItemTypeFilter: ModefulValueSetting<string, string>;

    /**
     * When set to true, bugs will be included when retrieving work item effort
     * if workItemTypeFilter is configured to the RequirementsCategory backlog.
     */
    includeBugsForRequirementCategory?: boolean;

    fieldFilters: FieldFilter[];

    /**
     * Describes the mode of aggregation.
     *  If mode is a sum based aggregation, the field identifies the field to aggregate on.
     */
    aggregation: ModefulValueSetting<AggregationMode, string>;

    /** Describes if stack by Work item type option is enabled for rendering, to partition the total by work item type, vs a homogeneous total.*/
    stackByWorkItemTypeEnabled: boolean;

    /** Contains configuration for time period options */
    timePeriodConfiguration: TimePeriodConfiguration;

    /** Describes if the burndown trendline option is enabled for rendering. */
    burndownTrendlineEnabled: boolean;

    /** Describes if the total scope trendline option is enabled for rendering. */
    totalScopeTrendlineEnabled: boolean;

    /** Describes if the completed Work option is enabled for rendering. */
    completedWorkEnabled: boolean;
}
