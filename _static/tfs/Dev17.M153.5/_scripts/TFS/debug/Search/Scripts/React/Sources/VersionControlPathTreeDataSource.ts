/// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import Utils_Core = require("VSS/Utils/Core");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import Q = require("q");
import VCContracts = require("TFS/VersionControl/Contracts");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { IDataSource, PathTreeCache, IResultSet } from "Search/Scripts/React/Sources/PathTreeCache";
import delegate = Utils_Core.delegate;
import VSS_WebApi = require("VSS/WebApi/RestClient");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { LoadingState } from "Search/Scripts/React/Models";
import { ignoreCaseComparer } from "VSS/Utils/String";

export const TFVC_PATH_LOAD_FAILED = "TfvcPathLoadFailedException";

export interface GitFetchParameters {
    path: string,
    version: string
}

export interface GitCacheOptions {
    projectName: string,
    repoName: string,
    repoId: string,
    branchName: string
}

export class GitPathTreeCache extends PathTreeCache {
    private static instance: GitPathTreeCache;
    private _options: GitCacheOptions;

    public static getInstance(): GitPathTreeCache {
        if (!GitPathTreeCache.instance) {
            GitPathTreeCache.instance = new GitPathTreeCache(new GitPathTreeDataSource());
        }

        return GitPathTreeCache.instance;
    }

    public initialize(options: GitCacheOptions) {
        this._dataSource.initialize(options);

        if (JSON.stringify(this._options) !== JSON.stringify(options)) {
            this.clear();
        }

        this._options = options;
    }
}

export class GitPathTreeDataSource implements IDataSource {
    private _repositoryContext: Q.Promise<RepositoryContext>;
    private _options: GitCacheOptions;
    private _fetchAll: boolean;

    public initialize(options: GitCacheOptions) {
        if (!this._repositoryContext ||
            JSON.stringify(this._options) !== JSON.stringify(options)) {

            if (!!options.projectName &&
                !!options.repoId &&
                !!options.repoName) {

                this._repositoryContext = this._getRepositoryContext(options.projectName, options.repoName, options.repoId);
            }

            this._fetchAll = true;
        }

        this._options = options;
    }

    public getItems(paths: string[]): Q.Promise<IResultSet> {
        let defer = Q.defer<IResultSet>();
        let fetchNextLevel = () => {
            if (!!this._repositoryContext) {
                this._repositoryContext.done((repositoryContext: RepositoryContext) => {
                    let fetchParams = paths.map((path) => {
                        return {
                            path: path,
                            version: this._options.branchName
                        };
                    });

                    this._fetchFoldersLevelByLevel(repositoryContext, fetchParams).done((result) => {
                        defer.resolve({
                            status: LoadingState.LoadSuccess |
                                    LoadingState.LoadFailedOnSizeExceeded |
                                    LoadingState.LoadSuccessWithNoSearch,
                            result: result
                        });
                    });
                });
            } else {
                defer.resolve({ status: LoadingState.Loading, result: {} });
            }
        }

        if (this._fetchAll) {
            this._fetchAllFolders().done((result) => {
                defer.resolve({ status: LoadingState.LoadSuccess, result: result });
            }, (reason) => {
                this._fetchAll = false;
                fetchNextLevel();
            });
        } else {
            fetchNextLevel();
        }

        return defer.promise;
    }

    /**
     * Given a list of "path"(e.g. $/a/b/c) the method calls the rest api to fetch the items represented by their respective path.
     * Returns a Q promise. Promise is resolved successfully if the data is loaded without any error, rejected otherwise.
     */
    private _fetchFoldersLevelByLevel(repositoryContext: RepositoryContext, fetchParameters: GitFetchParameters[]): Q.Promise<IDictionaryStringTo<string[]>> {
        var deferred = Q.defer<IDictionaryStringTo<string[]>>();

        var successCallback: any = delegate(this, (response: VCLegacyContracts.ItemModel[]) => {
            let result: IDictionaryStringTo<string[]> = {};

            for (let i = 0, l = response.length; i < l; i++) {
                let folders = response[i].childItems.filter((value: VCLegacyContracts.ItemModel) => {
                    return value.isFolder;
                });

                let folderList = folders.map((value: VCLegacyContracts.ItemModel) => value.serverItem);

                result[response[i].serverItem] = folderList;
            }

            deferred.resolve(result);
        });

        var errorCallback: any = delegate(this, (error: any) => {
            deferred.reject(error);
        });

        repositoryContext.getClient().beginGetItems(
            repositoryContext,
            fetchParameters,
            <VCLegacyContracts.ItemDetailsOptions>{
                includeContentMetadata: false,
                includeVersionDescription: false,
                recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel
            },
            successCallback,
            errorCallback);

        return deferred.promise;
    }

    /**
     * Method to return repository context given the project/repo name and the type of version control.
     * Repository context is used to fetch items from server using version control api client.
     */
    private _getRepositoryContext(projectName: string, repoName: string, repoId: string): Q.Promise<RepositoryContext> {
        var tfsContext = Context.SearchContext.getTfsContext();
        var deferred = Q.defer<RepositoryContext>();

        var rootRequestPath = Context.SearchContext.getRootRequestPath();
        var httpClient: VCWebApi.GitHttpClient = new VCWebApi.GitHttpClient(rootRequestPath);
        httpClient.beginGetRepository(projectName, repoName).then(
            (repository) => {
                deferred.resolve(GitRepositoryContext.create(repository, tfsContext));
            },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    private _fetchAllFolders(): Q.Promise<IDictionaryStringTo<string[]>> {
        // Implement caching for the path data.
        let vsHttpClient: VSS_WebApi.VssHttpClient,
            deferred: Q.Deferred<IDictionaryStringTo<string[]>> = Q.defer<IDictionaryStringTo<string[]>>(),
            project: string = this._options.projectName,
            repo: string = this._options.repoId,
            repoName: string = this._options.repoName,
            // remove "GB" as used in legacy code, NOTE: this should go away once we remove deprecated code.
            branchName: string = this._options.branchName && this._options.branchName.substr(2),
            tfsContext: TfsContext = Context.SearchContext.getTfsContext(),
            results: IDictionaryStringTo<string[]> = {},
            repositoryType: Base_Contracts.VersionControlType = Base_Contracts.VersionControlType.Git;

        if (repositoryType === Base_Contracts.VersionControlType.Git) {
            vsHttpClient = TFS_OM_Common.ProjectCollection
                .getDefaultConnection()
                .getHttpClient<GitHttpClient>(GitHttpClient) as GitHttpClient;

            let gitVersionDescriptor: VCContracts.GitVersionDescriptor = branchName && {
                versionType: VCContracts.GitVersionType.Branch,
                version: branchName,
                versionOptions: null
            };

            if (repo) {
                (vsHttpClient as GitHttpClient)
                    .getFilePaths(project, repo, null, gitVersionDescriptor)
                    .then((filePathCollection) => {
                        results = this._buildParentChildMap(filePathCollection.paths);

                        deferred.resolve(results);
                    }, (error) => {
                        deferred.reject(error);
                    });
            }
            else {
                var httpClient = new VCWebApi.GitHttpClient(Context.SearchContext.getRootRequestPath());
                httpClient
                    .beginGetRepository(project, repoName)
                    .then((repository) => {
                        let repoId = GitRepositoryContext.create(repository, tfsContext).getRepositoryId();
                        return repoId;
                    }, (error) => {
                        return error;
                    }).then((repoId: string) => {
                        (vsHttpClient as GitHttpClient)
                            .getFilePaths(project, repoId, null, gitVersionDescriptor)
                            .then((filePathCollection) => {
                                results = this._buildParentChildMap(filePathCollection.paths);

                                deferred.resolve(results);
                            }, (error) => {
                                deferred.reject(error);
                            });
                    }, (error) => {
                        // handle error scenarios.
                        deferred.reject(error);
                    });
            }
        }
        else if (repositoryType === Base_Contracts.VersionControlType.Tfvc) {
            const error = {
                message: TFVC_PATH_LOAD_FAILED
            };
            deferred.reject(error);
        }

        return deferred.promise;
    }

    private _buildParentChildMap(sourceItems: string[]): IDictionaryStringTo<string[]> {
        let allFolders: IDictionaryStringTo<boolean> = {};
        let folders: string[] = [];

        for (let sourceItem of sourceItems) {
            let start = sourceItem.length - 1;
            let pos;

            // extract folder paths
            while ((pos = sourceItem.lastIndexOf("/", start)) > 0) {
                let folderPath = sourceItem.substring(0, pos);

                // we already have this folder and its parents
                if (allFolders[folderPath]) {
                    break;
                }

                allFolders[folderPath] = true;
                folders.push("/" + folderPath);

                start = pos - 1;
            }
        }

        folders.sort((a, b) => { return ignoreCaseComparer(a, b); });

        let result: IDictionaryStringTo<string[]> = {};

        result["/"] = [];

        for (let i = 0; i < folders.length; i++) {
            let start = folders[i].length - 1;
            let pos = folders[i].lastIndexOf("/", start);

            result[folders[i]] = [];

            if (pos !== -1) {
                let parentPath = folders[i].substring(0, pos);
                if (pos === 0) parentPath = "/";

                if (!result.hasOwnProperty(parentPath)) {
                    result[parentPath] = [];
                }

                result[parentPath].push(folders[i]);
            }
        }

        return result;
    }
}

export class TFVCPathTreeCache extends PathTreeCache {
    private static instance: TFVCPathTreeCache;

    public static getInstance(): TFVCPathTreeCache {
        if (!TFVCPathTreeCache.instance) {
            TFVCPathTreeCache.instance = new TFVCPathTreeCache(new TFVCPathTreeDataSource());
        }

        return TFVCPathTreeCache.instance;
    }

    public initialize(projectName: string) {
        this._dataSource.initialize(projectName);
    }
}

export class TFVCPathTreeDataSource implements IDataSource {
    private _tfvcRepositoryContext: TfvcRepositoryContext;

    public initialize(projectName: string) {
        this._tfvcRepositoryContext = new TfvcRepositoryContext(Context.SearchContext.getTfsContext(), projectName);
    }

    public getItems(paths: string[]): Q.Promise<IResultSet> {
        let defer = Q.defer<IResultSet>();
        
        this._fetchFoldersLevelByLevel(paths).done((result) => {
            defer.resolve({ status: LoadingState.LoadSuccessWithNoSearch, result: result });
        }, (reason) => {
            defer.reject(reason);
        });

        return defer.promise;
    }

    /**
     * Given a list of "path"(e.g. $/a/b/c) the method calls the rest api to fetch the items represented by their respective path.
     * Returns a Q promise. Promise is resolved successfully if the data is loaded without any error, rejected otherwise.
     */
    private _fetchFoldersLevelByLevel(paths: string[]): Q.Promise<IDictionaryStringTo<string[]>> {
        var deferred = Q.defer<IDictionaryStringTo<string[]>>();

        var successCallback: any = delegate(this, (response: VCLegacyContracts.ItemModel[]) => {
            let result: IDictionaryStringTo<string[]> = {};

            for (let i = 0, l = response.length; i < l; i++) {
                let folders = response[i].childItems.filter((value: VCLegacyContracts.ItemModel) => {
                    return value.isFolder;
                });

                let folderList = folders.map((value: VCLegacyContracts.ItemModel) => value.serverItem);

                result[response[i].serverItem] = folderList;
            }

            deferred.resolve(result);
        });

        var errorCallback: any = delegate(this, (error: any) => {
            deferred.reject(error);
        });

        // Implement caching for the path data.
        let results: IDictionaryStringTo<string[]> = {};
        let itemDescriptors: VCContracts.TfvcItemDescriptor[] = paths.map((item: string) => {
            return <VCContracts.TfvcItemDescriptor>{
                path: item,
                versionOption: VCContracts.TfvcVersionOption.None,
                versionType: VCContracts.TfvcVersionType.Latest,
                recursionLevel: VCContracts.VersionControlRecursionType.OneLevel
            };
        });


        this._tfvcRepositoryContext.getClient().beginGetItems(
            this._tfvcRepositoryContext,
            itemDescriptors,
            <VCLegacyContracts.ItemDetailsOptions>{
                includeContentMetadata: false,
                includeVersionDescription: false,
                recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel
            },
            successCallback,
            errorCallback);

        return deferred.promise;
    }
}