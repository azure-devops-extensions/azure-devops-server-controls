// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");

export interface WorkItemResult {
    project: string;
    projectId: string;
    relevance: number;
    fields: WorkItemField[];
    lastModified: string;
    hits: IHighlight[];
    flattenFields: {
        [id: string]: WorkItemField
    }
}

export interface WorkItemField {
    name: string;
    referenceName: string;
    value: any;
}

export interface WorkItemResults {
    count: number;
    values: WorkItemResult[];
}

export interface WorkItemSearchRequest extends Core_Contracts.ISearchQuery {
    filters: Core_Contracts.IFilterCategory[];
    // we require the searchFilters since we get this as response from the Search Service
    // Later we have to move to support only searchFilters 
    searchFilters: IDictionaryStringTo<string[]>;
}

export interface WorkItemSearchResponse extends Core_Contracts.ISearchResponse {
    query: WorkItemSearchRequest;
    results: WorkItemResults;
}

export interface IHighlight {
    fieldName: string;
    fieldReferenceName: string;
    highlights: string[];
}

export enum FieldType {
    String,
    Integer,
    DateTime,
    PlainText,
    Html,
    TreePath,
    History,
    Double,
    Guid,
    Boolean,
    Identity
}

export interface WorkItemFieldMetadata {
    name: string;
    referenceName: string;
    type: FieldType;
    alternateNames: string[];
}