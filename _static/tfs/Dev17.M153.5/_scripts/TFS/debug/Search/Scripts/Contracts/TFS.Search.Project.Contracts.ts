// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");

export interface IProjectQueryResponse extends Core_Contracts.ISearchResponse {
    query: Core_Contracts.ISearchQuery;
}

export interface IProjectResults {
    count: number;
    values: IProjectResult[];
}

export interface IProjectResult {
    name: string;
    id: string;
    description: string;
    account: string;
    collection: string;
    parentProjectName: string;
    type: string;
    hits: IHighlight[];
}

export interface IHighlight {
    field: string;
    highlights: string[];
}

export class ProjectResult implements IProjectResult {

    public name: string;
    public id: string;
    public description: string;
    public account: string;
    public collection: string;
    public parentProjectName: string;
    public type: string;
    public hits: IHighlight[];

    constructor(name: string, id: string, description: string, account: string, collection: string,
                parentProjectName: string, type: string, hits: IHighlight[]) {
        this.name = name;
        this.id = id;
        this.description = description;
        this.account = account;
        this.collection = collection;
        this.parentProjectName = parentProjectName;
        this.type = type;
        this.hits = hits;
    }

}