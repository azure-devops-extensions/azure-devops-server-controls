/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   search\client.shared\webapilegacy\clientgeneratorconfigs\genclient.json
 */

"use strict";

/**
 * Class defining request format for entity count requests
 */
export interface CountRequest {
    /**
     * Filter categories for scoping down the results
     */
    searchFilters: { [key: string] : string[]; };
    /**
     * Search text for which the search is performed.
     */
    searchText: string;
}

export interface CountResponse {
    count: number;
    errors: ErrorData[];
    relationFromExactCount: RelationFromExactCount;
}

/**
 * Base class for SearchQuery types.
 */
export interface EntitySearchQuery {
    /**
     * Filters to be passed with query. Set it to <code>null</code> if there are no filters to be applied.
     */
    filters: SearchFilter[];
    /**
     * Bool to configure if we want to get spell checker suggestions in case of zero results. Default value is false.
     */
    includeSuggestions: boolean;
    /**
     * Filter categories for scoping down the results. Optional.
     */
    searchFilters: { [key: string] : string[]; };
    /**
     * Search text for which the search is performed.
     */
    searchText: string;
    /**
     * Number of results to be skipped, used for pagination.
     */
    skipResults: number;
    /**
     * Options for sorting in the search results. If set to null, the results will be sorted by relevance.
     */
    sortOptions: EntitySortOption[];
    /**
     * Flag for opting aggregation in search results. If set to true, summary of search hit counts for each filter category and filter will be sent. Default value will be false.
     */
    summarizedHitCountsNeeded: boolean;
    /**
     * Number of results to be returned, used for pagination.
     */
    takeResults: number;
}

/**
 * Base class for SearchResponse types.
 */
export interface EntitySearchResponse {
    /**
     * Errors in the response.
     */
    errors: ErrorData[];
    /**
     * Array of filterCategories available for the current search query.
     */
    filterCategories: FilterCategory[];
    /**
     * Spell checker suggestion list.
     */
    suggestions: string[];
}

export interface EntitySearchResponseWithActivityId {
    activityId: string[];
    response: EntitySearchResponse;
}

/**
 * Defines a sort options item, that can be passed in the search query.
 */
export interface EntitySortOption {
    /**
     * Field name on which sorting should be done.
     */
    field: string;
    /**
     * Order in which the results should be sorted. When set it automatically sets sortOrder enum value. This is required since the controller does not allow enum members to be passed by their names.
     */
    sortOrder: string;
}

/**
 * Standard error codes that we return from Query Pipeline to UX/Client as part of REST contracts
 */
export enum ErrorCode {
    /**
     * Account is being re-indexed. Do not use this for fault-in scenarios; use AccountIsBeingOnboarded instead.
     */
    AccountIsBeingReindexed = 0,
    /**
     * Indexing is not started yet for the collection
     */
    IndexingNotStarted = 1,
    /**
     * Invalid request
     */
    InvalidRequest = 2,
    /**
     * Search text containing prefix wildcard code term is not supported.
     */
    PrefixWildcardQueryNotSupported = 3,
    /**
     * Multi Word Search text with code facet is not supported.
     */
    MultiWordWithCodeFacetNotSupported = 4,
    /**
     * Account is being onboarded. This is similar to AccountIsBeingReindexed except that this is used only when the collection is faulted-in for the first time in Search Service.
     */
    AccountIsBeingOnboarded = 5,
    /**
     * TakeResult Value is more than the value allowed in one fetch Therefore suppressed the take value to Search ResultLimit
     */
    TakeResultValueTrimmedToMaxResultAllowed = 7,
    /**
     * One or more branches in the collection are being indexed.
     */
    BranchesAreBeingIndexed = 8,
    /**
     * When Faceting is not enabled on ScaleUnit and User is asking for faceting
     */
    FacetingNotEnabledAtScaleUnit = 9,
    /**
     * When Workitems are not accessible to the user and user is asking for those Workitems
     */
    WorkItemsNotAccessible = 10,
    /**
     * When Search query contains only operators (i.e. [, ], (, ), :, ", ?, *) it is converted to empty expression and no results are fetched for them.
     */
    EmptyQueryNotSupported = 11,
    /**
     * When Search query contains only wildcard chars (ex: ***, *?, ??)
     */
    OnlyWildcardQueryNotSupported = 12,
    /**
     * When Search query fetches zero results with wildcard in it
     */
    ZeroResultsWithWildcard = 13,
    /**
     * When Search query fetches zero results and has filters
     */
    ZeroResultsWithFilter = 14,
    /**
     * When Search query fetches zero results and has wildcard and filter
     */
    ZeroResultsWithWildcardAndFilter = 15,
    /**
     * When Search query fetches zero results and has no wildcard or filter
     */
    ZeroResultsWithNoWildcardNoFilter = 16,
    /**
     * When Search request times out and hence potentially gives partial results
     */
    PartialResultsDueToSearchRequestTimeout = 17,
    /**
     * Phrase queries with code facet is not supported.
     */
    PhraseQueriesWithCEFacetsNotSupported = 18,
    /**
     * Wildcard queries with code facet is not supported.
     */
    WildcardQueriesWithCEFacetsNotSupported = 19,
    /**
     * When Scroll Search Request returns count of zero we will clear the scroll
     */
    ClearedScrollSearchRequestParam = 20
}

/**
 * Defines the error data contract.
 */
export interface ErrorData {
    /**
     * Error code.
     */
    errorCode: string;
    /**
     * Error message.
     */
    errorMessage: string;
    /**
     * Error type.
     */
    errorType: ErrorType;
}

/**
 * Error type contract.
 */
export enum ErrorType {
    /**
     * Warning.
     */
    Warning = 0,
    /**
     * Error.
     */
    Error = 1
}

/**
 * Describes a filter bucket item.
 */
export interface Filter {
    /**
     * ID of the filter bucket.
     */
    id: string;
    /**
     * Name of the filter bucket.
     */
    name: string;
    /**
     * Count of matches in the filter bucket.
     */
    resultCount: number;
    /**
     * It represents whether this filter bucket is selected in the current search query. If not, matches for this filter bucket will not be included in the results.
     */
    selected: boolean;
}

/**
 * Describes a filter category item.
 */
export interface FilterCategory {
    /**
     * Array of filter buckets, corresponding to filter category name.
     */
    filters: Filter[];
    /**
     * Name of the filter category.
     */
    name: string;
}

export interface GitRepositoryData {
    id: string;
    name: string;
    projectId: string;
    projectName: string;
}

/**
 * Defines the highlight item corresponding to a search match.
 */
export interface Highlight {
    /**
     * Name of the field that is higlighted.
     */
    field: string;
    /**
     * Fragments of the field value that are highlighted.
     */
    highlights: string[];
}

/**
 * This class encapsulates position of a piece of text in a document.
 */
export interface Hit {
    /**
     * Gets or sets the start character offset of a piece of text.
     */
    charOffset: number;
    /**
     * Gets or sets the length of a piece of text.
     */
    length: number;
}

/**
 * This class encapsulates the input of an optin request.
 */
export interface OptInRequest {
    /**
     * Gets or sets the Account name of a request
     */
    accountName: string;
    /**
     * Gets or sets the Account url of a request
     */
    accountUrl: string;
    /**
     * Gets or sets the hostId of a request
     */
    hostId: string;
    /**
     * Gets or sets the requestor id of a request
     */
    requestorId: string;
}

/**
 * This class encapsulates the status of the optin request made by an account.
 */
export interface OptInRequestStatus {
    /**
     * Gets or sets the name of the account for which the status is got.
     */
    accountName: string;
    /**
     * Gets or sets the url of the account for which the status is got.
     */
    accountUrl: string;
    /**
     * Gets or sets the hostId of the account for which the status is got.
     */
    hostId: string;
    /**
     * Gets or sets the requestor id of the account for which the status is got.
     */
    requestorId: string;
    /**
     * Gets or sets the status of the optin request of the account.
     */
    requestStatus: number;
}

/**
 * Enum contains names for relation of returned count from actual count.
 */
export enum RelationFromExactCount {
    Equals = 0,
    GreaterThanEqualTo = 1,
    LessThanEqualTo = 2,
    Approximate = 3
}

export interface SearchFilter {
    name: string;
    values: string[];
}

export enum SortOrder {
    Undefined = 0,
    Ascending = 1,
    Descending = 2
}

/**
 * This class encapsulates details pertaining to a version
 */
export interface Version {
    /**
     * Name of the branch.
     */
    branchName: string;
    /**
     * ChangeId in the given branch associated with this hit.
     */
    changeId: string;
}

export interface WikiHitSnippet {
    /**
     * Reference name of the field highlighted.
     */
    fieldReferenceName: string;
    /**
     * Highlighted snippets of the field.
     */
    highlights: string[];
}

export interface WikiQueryResponse extends EntitySearchResponse {
    query: WikiSearchQuery;
    results: WikiResults;
}

export interface WikiResult {
    collection: string;
    collectionUrl: string;
    /**
     * Hash for content in the Wiki file
     */
    contentId: string;
    /**
     * Wiki file name
     */
    fileName: string;
    /**
     * Highlighted snippets of fields that match the search request
     */
    hits: WikiHitSnippet[];
    lastUpdated: Date;
    /**
     * Mapped folder path in the git repo for wiki
     */
    mappedPath: string;
    /**
     * Wiki file path
     */
    path: string;
    project: string;
    repository: string;
    repositoryId: string;
    visibility: string;
    wiki: string;
    wikiId: string;
    wikiVersion: string;
}

export interface WikiResults {
    count: number;
    values: WikiResult[];
}

export interface WikiSearchQuery extends EntitySearchQuery {
}

export var TypeInfo = {
    CountResponse: <any>{
    },
    EntitySearchResponse: <any>{
    },
    EntitySearchResponseWithActivityId: <any>{
    },
    ErrorCode: {
        enumValues: {
            "accountIsBeingReindexed": 0,
            "indexingNotStarted": 1,
            "invalidRequest": 2,
            "prefixWildcardQueryNotSupported": 3,
            "multiWordWithCodeFacetNotSupported": 4,
            "accountIsBeingOnboarded": 5,
            "takeResultValueTrimmedToMaxResultAllowed": 7,
            "branchesAreBeingIndexed": 8,
            "facetingNotEnabledAtScaleUnit": 9,
            "workItemsNotAccessible": 10,
            "emptyQueryNotSupported": 11,
            "onlyWildcardQueryNotSupported": 12,
            "zeroResultsWithWildcard": 13,
            "zeroResultsWithFilter": 14,
            "zeroResultsWithWildcardAndFilter": 15,
            "zeroResultsWithNoWildcardNoFilter": 16,
            "partialResultsDueToSearchRequestTimeout": 17,
            "phraseQueriesWithCEFacetsNotSupported": 18,
            "wildcardQueriesWithCEFacetsNotSupported": 19,
            "clearedScrollSearchRequestParam": 20
        }
    },
    ErrorData: <any>{
    },
    ErrorType: {
        enumValues: {
            "warning": 0,
            "error": 1
        }
    },
    RelationFromExactCount: {
        enumValues: {
            "equals": 0,
            "greaterThanEqualTo": 1,
            "lessThanEqualTo": 2,
            "approximate": 3
        }
    },
    SortOrder: {
        enumValues: {
            "undefined": 0,
            "ascending": 1,
            "descending": 2
        }
    },
    WikiQueryResponse: <any>{
    },
    WikiResult: <any>{
    },
    WikiResults: <any>{
    },
};

TypeInfo.CountResponse.fields = {
    errors: {
        isArray: true,
        typeInfo: TypeInfo.ErrorData
    },
    relationFromExactCount: {
        enumType: TypeInfo.RelationFromExactCount
    }
};

TypeInfo.EntitySearchResponse.fields = {
    errors: {
        isArray: true,
        typeInfo: TypeInfo.ErrorData
    }
};

TypeInfo.EntitySearchResponseWithActivityId.fields = {
    response: {
        typeInfo: TypeInfo.EntitySearchResponse
    }
};

TypeInfo.ErrorData.fields = {
    errorType: {
        enumType: TypeInfo.ErrorType
    }
};

TypeInfo.WikiQueryResponse.fields = {
    errors: {
        isArray: true,
        typeInfo: TypeInfo.ErrorData
    },
    results: {
        typeInfo: TypeInfo.WikiResults
    }
};

TypeInfo.WikiResult.fields = {
    lastUpdated: {
        isDate: true,
    }
};

TypeInfo.WikiResults.fields = {
    values: {
        isArray: true,
        typeInfo: TypeInfo.WikiResult
    }
};
