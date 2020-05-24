/// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Q = require("q");
import { LoadingState } from "Search/Scripts/React/Models";

export interface IResultSet {
    status: LoadingState;
    result: IDictionaryStringTo<string[]>;
}

export interface IDataSource {
    initialize: (options: any) => void,
    getItems: (paths: any[]) => Q.Promise<IResultSet>
}

export class PathTreeCache {
    private _itemCache: IDictionaryStringTo<string[]>;
    private _loadingState: LoadingState;
    protected _dataSource: IDataSource;

    constructor(dataSource: IDataSource) {
        this._dataSource = dataSource;
        this._loadingState = 0;
        this._itemCache = {};
    }

    public getItems(paths: string[]): Q.Promise<IResultSet> {
        let deferred = Q.defer<IResultSet>();

        let queryPaths: string[] = [];

        for (let i = 0, l = paths.length; i < l; i++) {
            if (!this._itemCache.hasOwnProperty(paths[i])) {
                queryPaths.push(paths[i]);
            }
        }

        if (queryPaths.length > 0) {
            this._dataSource.getItems(queryPaths).done((queryResult: IResultSet) => {
                // Merge the results in the cache.
                for (let key in queryResult.result) {
                    if (queryResult.result.hasOwnProperty(key)) {
                        this._itemCache[key] = queryResult.result[key];
                    }
                }

                this._loadingState = queryResult.status;
                
                deferred.resolve({ status: queryResult.status, result: this._itemCache });
            }, (error) => deferred.reject(error));
        } else {
            let results: IDictionaryStringTo<string[]> = {};
            let status: LoadingState = LoadingState.LoadSuccess;

            for (let i = 0, l = paths.length; i < l; i++) {
                if (this._itemCache.hasOwnProperty(paths[i])) {
                    results[paths[i]] = this._itemCache[paths[i]];
                }
            }

            status |= this._loadingState;

            deferred.resolve({ status: status, result: results });
        }

        return deferred.promise;
    }

    public clear(): void {
        this._itemCache = {};
        this._loadingState = 0;
    }

    public getAllCachedPaths(): string[] {
        let result: string[] = [];

        for (let key in this._itemCache) {
            if (this._itemCache.hasOwnProperty(key)) {
                result.push(key);
                result.push(...this._itemCache[key]);
            }
        }

        return result;
    }
}