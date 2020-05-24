import Search_Shared_Contracts = require("Search/Scripts/Generated/Search.SharedLegacy.Contracts");

// Temporarily adding these interfaces. 
// It will be replaced by the one which is auto-generated when our controllers become genclient compliant

/**
 * This class encapsulates the definition of a work item field.
 */
export interface WorkItemField {
    name: string;
    referenceName: string;
    value: string;
}

export interface WorkItemFieldMetadata {
    alternateNames: string[];
    name: string;
    referenceName: string;
    type: WorkItemFieldType;
}

/**
 * WorkItemFieldType enum in search service resembling that in TFS
 */
export enum WorkItemFieldType {
    String = 0,
    Integer = 1,
    DateTime = 2,
    PlainText = 3,
    Html = 4,
    TreePath = 5,
    History = 6,
    Double = 7,
    Guid = 8,
    Boolean = 9,
    Identity = 10
}

export interface WorkItemHit {
    /**
     * Display name of the field higlighted.
     */
    fieldName: string;
    /**
     * Reference name of the field highlighted.
     */
    fieldReferenceName: string;
    /**
     * Highlighted snippets of the field.
     */
    highlights: string[];
}

export interface WorkItemResult {
    fields: WorkItemField[];
    /**
     * Highlighted snippets of fields that match the search request.
     */
    hits: WorkItemHit[];
    project: string;
    projectId: string;
}

export interface WorkItemResults {
    count: number;
    values: WorkItemResult[];
}

export interface WorkItemSearchRequest extends Search_Shared_Contracts.EntitySearchQuery {
}

export interface WorkItemSearchResponse extends Search_Shared_Contracts.EntitySearchResponse {
    query: WorkItemSearchRequest;
    results: WorkItemResults;
}

export var TypeInfo = {
    WorkItemFieldMetadata: <any>{
    },
    WorkItemFieldType: {
        enumValues: {
            "string": 0,
            "integer": 1,
            "dateTime": 2,
            "plainText": 3,
            "html": 4,
            "treePath": 5,
            "history": 6,
            "double": 7,
            "guid": 8,
            "boolean": 9,
            "identity": 10
        }
    },
    WorkItemSearchResponse: <any>{
    },
};

TypeInfo.WorkItemFieldMetadata.fields = {
    type: {
        enumType: TypeInfo.WorkItemFieldType
    }
};

TypeInfo.WorkItemSearchResponse.fields = {
    errors: {
        isArray: true,
        typeInfo: Search_Shared_Contracts.TypeInfo.ErrorData
    }
};
