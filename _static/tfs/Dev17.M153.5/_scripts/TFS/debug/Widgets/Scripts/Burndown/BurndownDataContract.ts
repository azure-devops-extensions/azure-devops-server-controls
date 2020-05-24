import { FieldFilter } from './BurndownSettings';


/** Provides a breakdown of work effort, optionally per date*/
export interface WorkItemEffort {
    WorkItemType: string;
    Date: string;
    StateCategory: string;
    AggregatedEffort: number;
}

/**
 * Wire and Client type representing aggregate work effort as of right now.
 */
export interface CurrentWorkItemAggregateEffort {
    StateCategory: string;
    AggregatedEffort: number;
}


/** Client-side type representating work item formatting for use by query generators
 * Note: Possible field types are at https://www.visualstudio.com/en-us/docs/work/reference/field-definition-element-reference#attributes-and-elements
 * The fields match analytics naming
 */
export interface WorkItemFieldDescriptor {
    /** Name of the field */
    FieldName: string;

    /** Type of the field */
    FieldType: string;

    /** Reference name of the field in VSTS  */
    FieldReferenceName: string;

    /** Should we use quotes to pass the value to Analytics, or pass value as-is */
    /** This value is calculated client-side. */
    UseQuotes: boolean;

    /** When making an analytics query, this is the path to use. */
    /** This value is calculated client-side. */
    AnalyticsFilterName: string;

    /** Function to figure out the value to query by from a FieldFilter */
    /** This function is calculated client-side. */
    GetAnalyticsQueryValueFunc(filter: FieldFilter): string;
}

