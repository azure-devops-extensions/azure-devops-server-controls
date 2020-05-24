/** The types of Kanban time */
export enum KanbanTimeType {
    Lead,
    Cycle
}

/** 
 * Information about a work item type rendered on the chart.
 * Includes additional metadata about the work item type such as its color.
 */
export interface WorkItemTypeStats {
    workItemType: string;
    color: string;
    icon: string;
    count: number;
}

/** The options used for retrieving Kanban time data */
export interface KanbanTimeDataQueryOptions {
    /** A list of team IDs */
    teamIds: string[];

    /**
     * The types of work items to query.
     * If backlogCategory is also defined, this property is ignored.
     */
    workItemTypes?: string[];

    /**
     * The backlog category from which to get the types of work items to query.
     * 
     * If the given category is associated with the requirements backlog then the
     * team settings of each team provided in teamIds are used to determine whether
     * or not to include the bugs category work item types as well. For example,
     * if two team IDs are given and the first team includes bugs on the requirements
     * backlog while the second team does not, the work items included in the chart
     * will be of the type linked with the given backlog category and the bug work
     * items for the first team only.
     */
    backlogCategory?: string;

    /** The starting date of the range ending at today with the following format: yyyy-MM-dd */
    startDate: string;

    /** The type of Kanban time desired */
    timeType: KanbanTimeType;
    
    /**
     * The timeout for data requests.
     * Defaults as defined by VSS is used when omitted.
     */
    timeoutMs?: number;
}

/** 
 * Options for construct a lead time chart
 */
export interface KanbanTimeChartOptions extends KanbanTimeDataQueryOptions {
    height: number;
    width: number;

    /**
     * Animate the chart during drawing, true by default
     */
    animate?: boolean;

    onClick?: (workItem: ScatterPlotCustomDataWorkItem[]) => void;

    /** Set the ranges of the Y-Axis */
    yAxisMinMax?: AxisMinMaxValue;

    /**
     * The types of work items to query and show on the chart.
     *
     * If backlogCategory is also defined, the retrieved work item data is queried using
     * that category and subsequently filtered by the values of this property.
     */
    workItemTypes?: string[];

    /**
     * The backlog category from which to get the types of work items to query and show on the chart.
     * 
     * If the given category is associated with the requirements backlog then the
     * team settings of each team provided in teamIds are used to determine whether
     * or not to include the bugs category work item types as well. For example,
     * if two team IDs are given and the first team includes bugs on the requirements
     * backlog while the second team does not, the work items included in the chart
     * will be of the type linked with the given backlog category and the bug work
     * items for the first team only.
     *
     * If workItemTypes is also defined, then the work item data queried using this backlog category
     * is subsequently filtered down by the types defined in that property.
     */
    backlogCategory?: string;
}

/** A minimal description of a work item */
export interface WorkItem {
    id: string;
    title: string;
    workItemType: string;
}

/** A work item with additional information used for the custom data of the scatter plot series */
export interface ScatterPlotCustomDataWorkItem extends WorkItem {
    workItemTypeColor: string;
    workItemTypeIcon: string;
}

/** A completed work item. */
export interface CompletedWorkItem extends WorkItem {
    completedDate: string;

    /**
     * Using this as a way to capture either the Lead time or the Cycle time.
     */
    kanbanTime: number;
}

/** Information about a completed work item as returned by OData. */
export interface ODataCompletedWorkItem {
    /** The ID of the work item */
    WorkItemId: string;

    /** The title of the work item */
    Title: string;

    /** The type of the work item */
    WorkItemType: string;

    /**
     * A surrogate key for the date at which the work item was completed.
     * Analytics implements this as a number constructed from the completed date formatted as "yyyyMMdd".
     * So a completed date of 2016-01-02 would have a CompletedDateSK of 20160102.
     */
    CompletedDateSK: number;

    /** The lead time of the completed work item. May be null/undefined if query was for a different Kanban time type. */
    LeadTimeDays: number;

    /** The cycle time of the completed work item. May be null/undefined if query was for a different Kanban time type. */
    CycleTimeDays: number;
}

/** Information for calculating standard deviations and averages of kanban times. */
export interface KanbanTimeStdDevCalculationData {
    completedDate: string;
    workItemType: string;
    count: number;
    sum: number;
    sumOfSquares: number;
}

/** Information for calculating standard deviations and averages of kanban times as returned by OData. */
export interface ODataKanbanTimeStdDevCalculationData {
    CompletedDateSK: number;
    WorkItemType: string;
    CompletedCount: number;
    Sum: number;
    SumOfSquares: number;
}

export interface IKanbanTimeDataService {
    getStdDevCalculationData(dataOptions: KanbanTimeDataQueryOptions): IPromise<KanbanTimeStdDevCalculationData[]>;
    getCompletedWorkItems(dataOptions: KanbanTimeDataQueryOptions): IPromise<CompletedWorkItem[]>;
}

/**
 * Additional information about the data rendered on the chart.
 */
export interface ChartData {
    /** The overall average of all the datapoint */
    averageKanbanTime: number;

    /** A list of information about the work Item types rendered on the chart such as their counts and colors */
    workItemTypeStats: WorkItemTypeStats[];

    /** The total count of work items rendered on the chart */
    totalWorkItemCount: number;

    /**
     * The minimum and maximum y-axis values rendered on the chart.
     * The values may come from either the standard deviation arearange or the completed work items scatter plot.
     */
    yAxisMinMax?: AxisMinMaxValue;
}

export interface AxisMinMaxValue {
    /** The max value on the chart's Y-axis, it would be a data point, or the standard deviation value */
    maxValue: number;

    /** The lowest value on the chart's Y-axis, it would be a data point, or the standard deviation value */
    minValue: number;
}