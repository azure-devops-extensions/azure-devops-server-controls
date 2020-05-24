
export interface IFilterGroup {
    start: number;
    end: number;
    level: number;
}

export interface IFilter {
    clauses: IClause[];
    groups: IFilterGroup[];
}

export interface IClause {
    fieldName: string;
    operator: string;
    value: string;
    index: number;
    originalIndex: number;
    logicalOperator: string;
}

export interface IEditInfo {
    mode: number;
    treeLinkTypes: string;
    linkTypes: string;
    sourceFilter: IFilter;
    treeTargetFilter: IFilter;
    linkTargetFilter: IFilter;
    teamProject: string;
}

export interface IQueryParams {
    wiql?: string;
    fields?: string[];
    sortFields?: string[];

    /** DateTime */
    asOf?: string;
    runQuery?: boolean;
    includePayload?: boolean;
    includeEditInfo?: boolean;
    persistenceId?: string;
    top?: number;
    workItemIdFilter?: number[];
    isDirty?: boolean;
}

export interface IQueryParamsExtras extends IQueryParams {
    keepSelection?: boolean;
    statusText?: string;
    skipRefresh?: boolean;
}

export interface IQueryDisplayColumn {
    name?: string;
    text?: string;
    fieldId?: number;

    canSortBy?: boolean;
    width: number;
    isIdentity?: boolean;
}

export interface IQuerySortColumn {
    name?: string;
    descending?: boolean;
}

export interface IQueryResultPayload {
    columns?: string[];

    rows?: any[];
}

export interface IQueryResultsTreeData {
    sourceIds: number[];
    targetIds: number[];
    linkIds: number[];
}

export interface IQueryResult extends IQueryResultsTreeData {
    queryRan: boolean;
    error?: TfsError
    wiql: string;

    isLinkQuery?: boolean;
    isTreeQuery?: boolean;

    columns: IQueryDisplayColumn[];
    sortColumns: IQuerySortColumn[];

    pageColumns: string[];

    payload: IQueryResultPayload;

    editInfo?: IEditInfo;

    hasMoreResult?: boolean;
    isCachedData?: boolean;
}

export interface IPageData {
    /**@columns array containing the names of the fields we fetched*/
    columns: string[];
    /**@rows array of each work item's data*/
    rows: any[];
}

export interface IQueryContext {
    /// Id of query, if saved
    queryId?: string;

    // WIQL text
    queryText?: string;

    /// Name of query
    queryName?: string;

    // Value indicating whether the query definition is dirty
    isDirty?: boolean;

    // Value indicating whether the query definition is a Custom Wiql Query
    isCustomWiqlQuery?: boolean;

    // Date and time the query was run
    asOf?: string;
}

/**
 * Represents a column in a column options dialog/panel result
 */
export interface IDisplayColumnResult {
    id: number;
    name?: string;
    text: string;
    width?: number;
    asc?: boolean;
}

/**
 * Represents the result passed to the caller when user clicks OK in a column options dialog/panel.
 */
export interface IColumnOptionsResult {
    display: IDisplayColumnResult[];
    sort: IDisplayColumnResult[];
    async?: boolean;
    added?: string[];
    removed?: string[];
}

export interface IColumnOptionsPanelDisplayColumn {
    fieldRefName: string;
    isRequired?: boolean;
    width?: number;
}

export interface IColumnOptionsPanelSortColumn {
    fieldRefName: string;
    descending?: boolean;
}
