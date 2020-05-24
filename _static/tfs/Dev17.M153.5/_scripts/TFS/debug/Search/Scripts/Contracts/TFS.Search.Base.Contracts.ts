// Copyright (c) Microsoft Corporation. All rights reserved.

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");

"use strict";
/**
 * Defines base contracts that specific entity types (code/project etc) derive from
 */

export class SearchQuery implements Core_Contracts.ISearchQuery {

    public searchText: string;
    public scope: string;
    public skipResults: number;
    public takeResults: number;

    public constructor(searchText: string, scope: string, skipResults: number, takeResults: number) {
        this.searchText = searchText;
        this.scope = scope;
        this.skipResults = skipResults;
        this.takeResults = takeResults;
    }

}

export interface IPathScopeFilterCategory extends Core_Contracts.IFilterCategoryName { 
    projectName: string;
    repoName: string;
    repositoryType: VersionControlType;
    defaultPathForExpansion: string;
    repoId?: string;
}

export enum VersionControlType {
    Git = 0,
    Tfvc = 1,
    Custom = 2
}

export class DefaultFilterCategoryBase implements Core_Contracts.IDefaultFilterCategory {
    public filters: Core_Contracts.IFilter[];
    public name: string;

    public get hasValue(): boolean {
        if (this.filters && this.filters.length > 0) {
            return this.filters.some((filter: Filter) => {
                return filter.selected;
            });
        }

        return false;
    }

    public toIFilterCategory(): Core_Contracts.IFilterCategory {
        var filterNameList: Core_Contracts.FilterNameList = new Core_Contracts.FilterNameList(this.name, []);
        
        if (this.filters && this.filters.length > 0) {
            let selectedFilters = this.filters.filter((filter: Filter) => {
                return filter.selected;
            });

            filterNameList.values = selectedFilters.map((value: Core_Contracts.IFilter) => {
                return value.name;
            });

            filterNameList.values.sort();
        }

        return filterNameList;
    }
}

export class DefaultFilterCategory extends DefaultFilterCategoryBase {

    public name: string;
    public filters: Filter[];
    public constructor(filters: Filter[], name: string) {
        super();
        this.filters = filters;
        this.name = name;
    }

    /***
    * Returns true is the category has enough data to render itself. Otherwise false.
    * Being used in disabled filter scenarios.
    **/
    public get enabled(): boolean {
        return !!this.name &&
            this.filters &&
            this.filters.length > 0;
    }
}

export class LinkFilterCategory extends DefaultFilterCategoryBase {

    public name: string;
    public filters: LinkFilter[];
    public constructor(filters: LinkFilter[], name: string) {
        super();
        this.filters = filters;
        this.name = name;
    }
}

export class AccountFilterCategory extends DefaultFilterCategoryBase {

    public name: string;
    public filters: LinkFilter[];
    public constructor(filters: LinkFilter[], name: string) {
        super();
        this.filters = filters;
        this.name = name;
    }
}

export class BranchFilterCategory extends DefaultFilterCategoryBase {
    public name: string;
    public branches: string[];
    public selectedBranch: string;
    public defaultBranch: string;
    public filters: Filter[];
    public constructor(name: string, branches: string[], selectedBranch: string, defaultBranch: string) {
        super();
        this.name = name;
        this.branches = branches;
        this.selectedBranch = selectedBranch;
        this.defaultBranch = defaultBranch;
    }
    
    /***
    * Returns true is the category has enough data to render itself. Otherwise false.
    * Being used in disabled filter scenarios.
    **/
    public get enabled(): boolean {
        return !!this.name &&
            this.branches &&
            this.branches.length > 0 &&
            !!this.selectedBranch;
    }
}

export class PathScopeFilterCategory implements IPathScopeFilterCategory {

    public name: string;
    public projectName: string;
    public repoName: string
    public defaultPathForExpansion: string;
    public repositoryType: VersionControlType;
    public repoId: string;
    public branchName: string;
    public constructor(name: string, projectName: string, repoName: string, path: string, vcType: VersionControlType, repoId?: string, branchName?: string) {
        this.name = name;
        this.projectName = projectName;
        this.repoName = repoName;
        this.repositoryType = vcType;
        this.defaultPathForExpansion = path;
        this.repoId = repoId;
        this.branchName = branchName;
    }

    /***
    * Returns true is the category has enough data to render itself. Otherwise false.
    * Being used in disabled filter scenarios.
    **/
    public get enabled(): boolean {
        return !!this.name &&
            !!this.projectName &&
            !!this.repoName &&
            typeof this.repositoryType !== "undefined";
    }

    public get hasValue(): boolean {
        return this.enabled && !!this.defaultPathForExpansion;
    }

    public toIFilterCategory(): Core_Contracts.IFilterCategory {
        var filterNameValue: Core_Contracts.FilterNameValue = new Core_Contracts.FilterNameValue(this.name, "");

        if (this.enabled) {
            filterNameValue.values = this.defaultPathForExpansion;
        }

        return filterNameValue;
    }
}

export class AreaPathFilterCategory implements Core_Contracts.IFilterCategoryName {
    public projectName: string
    public areaPath;
    public name;

    public constructor(name: string, projectName: string, areaPath: string) {
        this.name = name;
        this.projectName = projectName;
        this.areaPath = areaPath;
    }
    
    /***
    * Returns true is the category has enough data to render itself. Otherwise false.
    * Being used in disabled filter scenarios.
    **/
    public get enabled(): boolean {
        return !!this.name && !!this.projectName;
    }

    public get hasValue(): boolean {
        return this.enabled && (!!this.areaPath || !!this.projectName);
    }

    public toIFilterCategory(): Core_Contracts.IFilterCategory {
        var filterNameValue: Core_Contracts.FilterNameValue = new Core_Contracts.FilterNameValue(this.name, "");

        if (this.enabled) {
            filterNameValue.values = this.areaPath || this.projectName;
        }

        return filterNameValue;
    }
}

export class LinkFilter implements Core_Contracts.IFilter {

    public name: string;
    public id: string;
    public selected: boolean;
    public resultCount: number;
    public constructor(name: string, id: string, selected: boolean, resultCount: number) {
        this.name = name;
        this.id = id;
        this.resultCount = resultCount;
        this.selected = selected;
    }
}

export class Filter implements Core_Contracts.IFilter {

    public name: string;
    public id: string;
    public selected: boolean;
    public resultCount: number;
    public constructor(name: string, id: string, selected: boolean, resultCount: number) {
        this.name = name;
        this.id = id;
        this.resultCount = resultCount;
        this.selected = selected;
    }

}

export interface IHit {
    charOffset: number;
    length: number;
}

export class Hit implements IHit {
    public charOffset: number;
    public length: number;
    public constructor(charOffset: number, length: number) {
        this.charOffset = charOffset;
        this.length = length;
    }
}

export interface IMatches {
    field : string;
    hits: IHit[];
}

export class Matches implements IMatches {
    public field: string;
    public hits: IHit[];
    public constructor(field: string, hits: IHit[]) {
        this.field = field;
        this.hits = hits;
    }
}