


/** Provides a breakdown of work quantities. */
export interface Work {
    IterationSK: string;

    AggregationResult: number;    
}

/**
 * Provides result of an aggregate quantity (sum or count), associated with a given iteration * State Category.
 * e.g. 15 story points in "Completed" state category, in Iteration 105.
 */
export interface Metastate extends Work {
    StateCategory: string;
}



export interface WorkItemTypeField {
    FieldName: string;
    FieldReferenceName: string,
    FieldType: string;
    WorkItemType: string;
}

/**
 * Provides particular work item ids for detail-viewing.
 */
export interface WorkItem {
    WorkItemId: string;
}

/**
 * Extends Work Item list result with state category the work item was in at query context.
 */
export interface WorkItemWithState extends WorkItem {    
    StateCategory: string;    
}