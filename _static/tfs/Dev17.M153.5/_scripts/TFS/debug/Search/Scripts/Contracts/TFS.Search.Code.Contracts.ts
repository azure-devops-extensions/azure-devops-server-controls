// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");

export interface ICodeSearchQuery extends Core_Contracts.ISearchQuery {
    filters: Core_Contracts.IFilterCategory[];
    // we require the searchFilters since we get this as response from the Search Service
    // Later we have to move to support only searchFilters 
    searchFilters: IDictionaryStringTo<string[]>;
}

export interface ICodeQueryResponse extends Core_Contracts.ISearchResponse {
    query: ICodeSearchQuery;
}

export interface ICodeResults {
    count: number;
    values: ICodeResult[];
}

export interface ICodeResult {
    fileName: string;
    path: string;
    matches: Base_Contracts.IMatches[];
    account: string;
    collection: string;
    project: string;
    repository: string;
    repositoryId: string;
    contentId: string;
    vcType: Base_Contracts.VersionControlType;
    branch: string;
    changeId: string;
    relevance: number;
}

export class CodeSearchQuery implements ICodeSearchQuery {
    public searchText: string;
    public scope: string;
    public filters: Core_Contracts.IFilterCategory[];
    // we require the searchFilters since we get this as response from the Search Service
    public searchFilters: IDictionaryStringTo<string[]>;
    public skipResults: number;
    public takeResults: number;
    public sortOptions: string;
    public summarizedHitCountsNeeded: boolean;

    public constructor(searchText: string, scope: string, filters: Core_Contracts.IFilterCategory[], skipResults: number, takeResults: number, sortOptions: string, summarizedHitCountsNeeded: boolean = false) {
        this.searchText = searchText;
        this.scope = scope;
        this.filters = filters;
        this.skipResults = skipResults;
        this.takeResults = takeResults;
        this.sortOptions = sortOptions;
        this.summarizedHitCountsNeeded = summarizedHitCountsNeeded;
    }
}

export class CodeResult implements ICodeResult {
    public fileName: string;
    public path: string;
    public matches: Base_Contracts.Matches[];
    public account: string;
    public collection: string;
    public project: string;
    public repository: string;
    public repositoryId: string;
    public contentId: string;
    public vcType: Base_Contracts.VersionControlType;
    public branch: string;
    public changeId: string;
    public relevance: number;

    constructor(
        account: string,
        collection: string,
        filename: string,
        path: string,
        project: string,
        repo: string,
        repoId: string,
        matches: Base_Contracts.Matches[],
        contentId: string,
        branch: string,
        changeId: string,
        versionControl?: Base_Contracts.VersionControlType) {
        this.account = account;
        this.collection = collection;
        this.fileName = filename;
        this.path = path;
        this.project = project;
        this.repository = repo;
        this.repositoryId = repoId;
        this.matches = matches;
        this.contentId = contentId;
        this.branch = branch;
        this.changeId = changeId;

        // default version control is git.
        this.vcType = versionControl || Base_Contracts.VersionControlType.Git;
        if (this.vcType === Base_Contracts.VersionControlType.Git) {
            this.branch = "GB" + branch;
        }
        else this.branch = branch;
    }
}