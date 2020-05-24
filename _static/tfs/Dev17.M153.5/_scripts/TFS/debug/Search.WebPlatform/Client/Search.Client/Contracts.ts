/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   search\client\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Search_Shared_Contracts = require("Search.Client/Shared/Search.Shared.Contracts");

/**
 * Defines the code result containing information of the searched files and its metadata.
 */
export interface CodeResult {
    /**
     * Collection of the result file.
     */
    collection: Search_Shared_Contracts.Collection;
    /**
     * ContentId of the result file.
     */
    contentId: string;
    /**
     * Name of the result file.
     */
    fileName: string;
    /**
     * Dictionary of field to hit offsets in the result file. Key identifies the area in which hits were found, for ex: file content/file name etc.
     */
    matches: { [key: string] : Search_Shared_Contracts.Hit[]; };
    /**
     * Path at which result file is present.
     */
    path: string;
    /**
     * Project of the result file.
     */
    project: Project;
    /**
     * Repository of the result file.
     */
    repository: Search_Shared_Contracts.Repository;
    /**
     * Versions of the result file.
     */
    versions: Search_Shared_Contracts.Version[];
}

/**
 * Defines a code search request.
 */
export interface CodeSearchRequest extends Search_Shared_Contracts.EntitySearchRequest {
}

/**
 * Defines a code search response item.
 */
export interface CodeSearchResponse extends Search_Shared_Contracts.EntitySearchResponse {
    /**
     * Total number of matched files.
     */
    count: number;
    /**
     * List of matched files.
     */
    results: CodeResult[];
}

/**
 * Defines the details of the project.
 */
export interface Project {
    /**
     * Id of the project.
     */
    id: string;
    /**
     * Name of the project.
     */
    name: string;
}

/**
 * Defines the matched terms in the field of the work item result.
 */
export interface WorkItemHit {
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
 * Defines the work item result that matched a work item search request.
 */
export interface WorkItemResult {
    /**
     * A standard set of work item fields and their values.
     */
    fields: { [key: string] : string; };
    /**
     * Highlighted snippets of fields that match the search request. The list is sorted by relevance of the snippets.
     */
    hits: WorkItemHit[];
    /**
     * Project details of the work item.
     */
    project: Project;
    /**
     * Reference to the work item.
     */
    url: string;
}

/**
 * Defines a work item search request.
 */
export interface WorkItemSearchRequest extends Search_Shared_Contracts.EntitySearchRequest {
}

/**
 * Defines a response item that is returned for a work item search request.
 */
export interface WorkItemSearchResponse extends Search_Shared_Contracts.EntitySearchResponse {
    /**
     * Total number of matched work items.
     */
    count: number;
    /**
     * List of top matched work items.
     */
    results: WorkItemResult[];
}

export var TypeInfo = {
    CodeResult: <any>{
    },
    CodeSearchResponse: <any>{
    },
};

TypeInfo.CodeResult.fields = {
    repository: {
        typeInfo: Search_Shared_Contracts.TypeInfo.Repository
    }
};

TypeInfo.CodeSearchResponse.fields = {
    results: {
        isArray: true,
        typeInfo: TypeInfo.CodeResult
    }
};
