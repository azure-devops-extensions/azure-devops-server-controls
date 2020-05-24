// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

/**
 * Defines a set of minimal contracts needed for showing search page (other types are downloaded as and when needed)
 * Note: Becaution with adding more content to this file, as it can influence search bundle size on the page load
 */
export interface IFilterCategoryName {
    name: string;

    hasValue: boolean;
}

export interface IFilterCategory {
    // Category name
    name: string;
    
    // Filters
    values: any;

    valuesToString(separator?: string): string;
}

export interface IFilter {
    name: string;
    id: string;
    resultCount: number;
    selected: boolean;
}

export class FilterNameList implements IFilterCategory {

    public name: string;
    public values: string[];
    public constructor(name: string, values: string[]) {
        this.name = name;
        this.values = values;
    }

    public valuesToString(separator?: string): string {
        if (separator) {
            return this.values.filter((value, index) => {
                return value && value !== '';
            }).join(separator);
        }

        return this.values.join();
    }
}

export class FilterNameValue implements IFilterCategory {

    public name: string;
    public values: any;
    public constructor(name: string, values: any) {
        this.name = name;
        this.values = values;
    }

    public valuesToString(separator?: string): string {
        if (this.values) {
            return this.values;
        }

        return "";
    }
}

export class PathScopeFilterNameValue extends FilterNameValue {

    public valuesToString(separator?: string): string {
        if (this.values) {
            return this.values.path;
        }

        return "";
    }
}

export interface IDefaultFilterCategory extends IFilterCategoryName {
    filters: IFilter[];
}

export interface IErrorData {
    errorCode: string;
    errorType: IErrorType;
}

export enum IErrorType {
    Warning = 0,
    Error   = 1
}

export interface ISearchQuery {
    searchText: string;
    scope: string;
    skipResults: number;
    takeResults: number;
}

export interface ISearchResponse {
    filterCategories: IFilterCategoryName[];
    results: any;
    errors: IErrorData[];
}