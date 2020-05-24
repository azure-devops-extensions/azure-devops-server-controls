/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://vsowiki.com/index.php?title=Rest_Client_Generation
 *
 * Configuration file:
 *   search\client.shared\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

/**
 * Defines the details of the collection.
 */
export interface Collection {
    /**
     * Name of the collection.
     */
    name: string;
}

/**
 * Base contract for search request types.
 */
export interface EntitySearchRequest {
    /**
     * Options for sorting search results. If set to null, the results will be returned sorted by relevance. If more than one sort option is provided, the results are sorted in the order specified in the OrderBy.
     */
    $orderBy: SortOption[];
    /**
     * Number of results to be skipped.
     */
    $skip: number;
    /**
     * Number of results to be returned.
     */
    $top: number;
    /**
     * Filters to be applied. Set it to null if there are no filters to be applied.
     */
    filters: { [key: string] : string[]; };
    /**
     * Flag to opt for faceting in the result. Default behavior is false.
     */
    includeFacets: boolean;
    /**
     * The search text.
     */
    searchText: string;
}

/**
 * Defines the base contract for search response.
 */
export interface EntitySearchResponse {
    /**
     * A dictionary storing an array of <code>Filter</code> object against each facet.
     */
    facets: { [key: string] : Filter[]; };
    /**
     * Numeric code indicating any additional information: 0 - Ok, 1 - Account is being reindexed, 2 - Account indexing has not started, 3 - Invalid Request, 4 - Prefix wildcard query not supported, 5 - MultiWords with code facet not supported, 6 - Account is being onboarded, 7 - Account is being onboarded or reindexed, 8 - Top value trimmed to maxresult allowed 9 - Branches are being indexed, 10 - Faceting not enabled, 11 - Work items not accessible, Any other info code is used for internal purpose.
     */
    infoCode: number;
}

/**
 * Describes a filter bucket item representing the total matches of search result, name and id.
 */
export interface Filter {
    /**
     * Id of the filter bucket.
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
}

/**
 * Describes the position of a piece of text in a document.
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
 * Standard info codes that we return from Query Pipeline to UX/Client as part of REST contracts
 */
export enum InfoCodes {
    /**
     * Everything ok with the result.
     */
    Ok = 0,
    /**
     * Account is being re-indexed. Do not use this for fault-in scenarios; use AccountIsBeingOnboarded instead.
     */
    AccountIsBeingReindexed = 1,
    /**
     * Indexing is not started yet for the collection
     */
    IndexingNotStarted = 2,
    /**
     * Invalid request
     */
    InvalidRequest = 3,
    /**
     * Search text containing prefix wildcard code term is not supported.
     */
    PrefixWildcardQueryNotSupported = 4,
    /**
     * Multi Word Search text with code facet is not supported.
     */
    MultiWordWithCodeFacetNotSupported = 5,
    /**
     * Account is being onboarded. This is similar to AccountIsBeingReindexed except that this is used only when the collection is faulted-in for the first time in search service.
     */
    AccountIsBeingOnboarded = 6,
    /**
     * $top Value is more than the value allowed in one fetch. $top is truncated as specified value exceeds the limit.
     */
    TakeResultValueTrimmedToMaxResultAllowed = 8,
    /**
     * One or more branches in the collection are being indexed.
     */
    BranchesAreBeingIndexed = 9,
    /**
     * IncludeFacets is true but facets support is disabled for this deployment.
     */
    FacetingNotEnabledAtScaleUnit = 10,
    /**
     * User has no permissions.
     */
    WorkItemsNotAccessible = 11,
    /**
     * When Search query contains only operators (i.e. [, ], (, ), :, ", ?, *) it is converted to empty expression and no results are fetched for them. [Todo:ManasaP] [Task 1163307] Once we have suggestions supported as part of the response, remove this info code.
     */
    EmptyQueryNotSupported = 12,
    /**
     * When Search query contains only wildcard chars (ex: ***, *?, ??)
     */
    OnlyWildcardQueryNotSupported = 13,
    /**
     * When Search query fetches zero results with wildcard in it
     */
    ZeroResultsWithWildcard = 14,
    /**
     * When Search query fetches zero results and has filters
     */
    ZeroResultsWithFilter = 15,
    /**
     * When Search query fetches zero results and has wildcard and filter
     */
    ZeroResultsWithWildcardAndFilter = 16,
    /**
     * When Search query fetches zero results and has no wildcard or filter
     */
    ZeroResultsWithNoWildcardNoFilter = 17
}

/**
 * Defines the details of the project.
 */
export interface ProjectReference {
    /**
     * ID of the project.
     */
    id: string;
    /**
     * Name of the project.
     */
    name: string;
    /**
     * Visibility of the project.
     */
    visibility: string;
}

/**
 * Defines the details of the repository.
 */
export interface Repository {
    /**
     * Id of the repository.
     */
    id: string;
    /**
     * Name of the repository.
     */
    name: string;
    /**
     * Version control type of the result file.
     */
    type: VersionControlType;
}

/**
 * Defines how to sort the result.
 */
export interface SortOption {
    /**
     * Field name on which sorting should be done.
     */
    field: string;
    /**
     * Order (ASC/DESC) in which the results should be sorted.
     */
    sortOrder: string;
}

export enum SortOrder {
    Undefined = 0,
    Ascending = 1,
    Descending = 2
}

/**
 * Describes the details pertaining to a version of the result file.
 */
export interface Version {
    /**
     * Name of the branch.
     */
    branchName: string;
    /**
     * ChangeId in the given branch associated with this match.
     */
    changeId: string;
}

/**
 * Version control of the repository.
 */
export enum VersionControlType {
    Git = 0,
    Tfvc = 1,
    /**
     * For internal use.
     */
    Custom = 2
}

/**
 * Defines the details of wiki.
 */
export interface Wiki {
    /**
     * Id of the wiki.
     */
    id: string;
    /**
     * Mapped path for the wiki.
     */
    mappedPath: string;
    /**
     * Name of the wiki.
     */
    name: string;
    /**
     * Version for wiki.
     */
    version: string;
}

/**
 * Defines the matched terms in the field of the wiki result.
 */
export interface WikiHit {
    /**
     * Reference name of the highlighted field.
     */
    fieldReferenceName: string;
    /**
     * Matched/highlighted snippets of the field.
     */
    highlights: string[];
}

/**
 * Defines the wiki result that matched a wiki search request.
 */
export interface WikiResult {
    /**
     * Collection of the result file.
     */
    collection: Collection;
    /**
     * ContentId of the result file.
     */
    contentId: string;
    /**
     * Name of the result file.
     */
    fileName: string;
    /**
     * Highlighted snippets of fields that match the search request. The list is sorted by relevance of the snippets.
     */
    hits: WikiHit[];
    /**
     * Path at which result file is present.
     */
    path: string;
    /**
     * Project details of the wiki document.
     */
    project: ProjectReference;
    /**
     * Wiki information for the result.
     */
    wiki: Wiki;
}

/**
 * Defines a wiki search request.
 */
export interface WikiSearchRequest extends EntitySearchRequest {
}

/**
 * Defines a wiki search response item.
 */
export interface WikiSearchResponse extends EntitySearchResponse {
    /**
     * Total number of matched wiki documents.
     */
    count: number;
    /**
     * List of top matched wiki documents.
     */
    results: WikiResult[];
}

export var TypeInfo = {
    InfoCodes: {
        enumValues: {
            "ok": 0,
            "accountIsBeingReindexed": 1,
            "indexingNotStarted": 2,
            "invalidRequest": 3,
            "prefixWildcardQueryNotSupported": 4,
            "multiWordWithCodeFacetNotSupported": 5,
            "accountIsBeingOnboarded": 6,
            "takeResultValueTrimmedToMaxResultAllowed": 8,
            "branchesAreBeingIndexed": 9,
            "facetingNotEnabledAtScaleUnit": 10,
            "workItemsNotAccessible": 11,
            "emptyQueryNotSupported": 12,
            "onlyWildcardQueryNotSupported": 13,
            "zeroResultsWithWildcard": 14,
            "zeroResultsWithFilter": 15,
            "zeroResultsWithWildcardAndFilter": 16,
            "zeroResultsWithNoWildcardNoFilter": 17
        }
    },
    Repository: <any>{
    },
    SortOrder: {
        enumValues: {
            "undefined": 0,
            "ascending": 1,
            "descending": 2
        }
    },
    VersionControlType: {
        enumValues: {
            "git": 0,
            "tfvc": 1,
            "custom": 2
        }
    },
};

TypeInfo.Repository.fields = {
    type: {
        enumType: TypeInfo.VersionControlType
    }
};
