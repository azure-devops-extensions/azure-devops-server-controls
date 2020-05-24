/// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";
import * as Q from "q";
import VSS_WebApi = require("VSS/WebApi/RestClient");
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { TfvcHttpClient } from "TFS/VersionControl/TfvcRestClient";
import { VersionControlType } from "Search/Scripts/Contracts/TFS.Search.Base.Contracts";
import { VersionControlRecursionType, TfvcItem, GitVersionDescriptor, GitVersionType } from "TFS/VersionControl/Contracts";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { delegate } from "VSS/Utils/Core";
import { IPathControlElement, ICodePathElement } from "Search/Scripts/React/Models";
import * as VSS from "VSS/VSS";
import { SearchContext } from "Search/Scripts/Common/TFS.Search.Context";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { NodeHelpers } from "WorkItemTracking/Scripts/Utils/NodeHelpers";
import WITOM_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ignoreCaseComparer } from "VSS/Utils/String";

export const TFVC_PATH_LOAD_FAILED = "TfvcPathLoadFailedException";

export interface ISource {
    getData: (metadata: any) => Q.Promise<IPathControlElement[]>
}

/**
 * Provides the branch list from the item provided.
 */
export class BranchPathDataSource implements ISource {
    public getData(item: any): Q.Promise<IPathControlElement[]> {
        let deferred: Q.Deferred<IPathControlElement[]> = Q.defer<IPathControlElement[]>();
        if (item.branches) {
            deferred.resolve(item.branches.map((branchName) => {
                return { displayName: branchName } as IPathControlElement;
            }));
        }
        else {
            deferred.reject([]);
        }
        return deferred.promise;
    }
}

export class VersionControlPathDataSource implements ISource {
    private static instance: VersionControlPathDataSource
    private cache: IDictionaryStringTo<IPathControlElement[]> = {};

    public static getInstance(): VersionControlPathDataSource {
        if (!VersionControlPathDataSource.instance) {
            VersionControlPathDataSource.instance = new VersionControlPathDataSource();
        }

        return VersionControlPathDataSource.instance;
    }

    public getData(metadata: any): Q.Promise<IPathControlElement[]> {
        // Implement caching for the path data.
        let vsHttpClient: VSS_WebApi.VssHttpClient,
            deferred: Q.Deferred<any[]> = Q.defer<any[]>(),
            project: string = metadata.projectName,
            repo: string = metadata.repoId,
            repoName: string = metadata.repoName,
            // remove "GB" as used in legacy code, NOTE: this should go away once we remove deprecated code.
            branchName: string = metadata.branchName && metadata.branchName.substr(2),
            tfsContext: TfsContext = Context.SearchContext.getTfsContext();

        if (metadata.repositoryType === VersionControlType.Git) {
            vsHttpClient = TFS_OM_Common.ProjectCollection
                .getDefaultConnection()
                .getHttpClient<GitHttpClient>(GitHttpClient) as GitHttpClient;

            let gitVersionDescriptor: GitVersionDescriptor = branchName && {
                versionType: GitVersionType.Branch,
                version: branchName,
                versionOptions: null
            };

            if (repo) {
                let key = this.getKey(metadata.repositoryType, project, repo, branchName);
                if (this.cache[key]) {
                    deferred.resolve(this.cache[key]);
                }
                else {
                    (vsHttpClient as GitHttpClient)
                        .getFilePaths(project, repo, null, gitVersionDescriptor)
                        .then((filePathCollection) => {
                            let itemList: ICodePathElement[] = filePathCollection.paths.map((path) => {
                                return {
                                    displayName: path,
                                    isFolder: true
                                } as ICodePathElement;
                            })

                            let pathItems = createVersionControlPathItems(itemList, VersionControlType.Git);

                            this.cache[key] = pathItems;
                            deferred.resolve(this.cache[key]);
                        }, (error) => {
                            deferred.reject(error);
                        });
                }
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
                        let key = this.getKey(metadata.repositoryType, project, repoId, branchName);

                        if (this.cache[key]) {
                            deferred.resolve(this.cache[key]);
                        }
                        else {
                            (vsHttpClient as GitHttpClient)
                                .getFilePaths(project, repoId, null, gitVersionDescriptor)
                                .then((filePathCollection) => {
                                    let itemList: ICodePathElement[] = filePathCollection.paths.map((path) => {
                                        return {
                                            displayName: path,
                                            isFolder: true
                                        } as ICodePathElement;
                                    })

                                    let pathItems = createVersionControlPathItems(itemList, VersionControlType.Git);

                                    this.cache[key] = pathItems;

                                    deferred.resolve(this.cache[key]);
                                }, (error) => {
                                    deferred.reject(error);
                                });
                        }                        
                    }, (error) => {
                        // handle error scenarios.
                        deferred.reject(error);
                    });
            }
        }
        else if (metadata.repositoryType === VersionControlType.Tfvc) {
            const error = {
                message: TFVC_PATH_LOAD_FAILED
            };
            deferred.reject(error);
        }

        return deferred.promise;
    }

    private getKey(projType: VersionControlType, name: string, repoId?: string, branchName?: string): string {
        if (projType === VersionControlType.Git) {
            return branchName ? `git-${name}${repoId}${branchName}` : `git-${name}${repoId}`;
        }
        else {
            return `tfvc-${name}`;
        }
    }
}

export class WorkItemAreaPathDataSource implements ISource {
    private static instance: WorkItemAreaPathDataSource;
    private cache: IDictionaryStringTo<IPathControlElement[]> = {};

    public static getInstance(): WorkItemAreaPathDataSource {
        if (!WorkItemAreaPathDataSource.instance) {
            WorkItemAreaPathDataSource.instance = new WorkItemAreaPathDataSource();
        }

        return WorkItemAreaPathDataSource.instance;
    }

    public getData(metadata: any): Q.Promise<IPathControlElement[]> {
        let projectName: string = metadata.projectName,
            deferred: Q.Deferred<any[]> = Q.defer<any[]>(),
            key = this.getkey(projectName);

        if (this.cache[key]) {
            deferred.resolve(this.cache[key]);
        }
        else {
            VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking"], delegate(
                this,
                (WITOM: typeof WITOM_NO_REQUIRE) => {
                    let store = TFS_OM_Common.ProjectCollection
                        .getConnection(SearchContext.getTfsContext())
                        .getService<WITOM_NO_REQUIRE.WorkItemStore>(WITOM.WorkItemStore);
                    store.beginGetProject(
                        projectName, delegate(this, (selectedProject: WITOM_NO_REQUIRE.Project) => {
                            if (ignoreCaseComparer(selectedProject.name, projectName) === 0) {
                                selectedProject.nodesCacheManager.beginGetNodes().then(() => {
                                    let areaNodes = selectedProject.nodesCacheManager.getAreaNode(true),
                                        listOfItems: IPathControlElement[] = [];
                                    for (var i = 0; areaNodes.children[i]; i++) {
                                        areaNodes.children[i].parent.name = areaNodes.name;
                                    };

                                    listOfItems = this.getListOfAreaPaths(areaNodes, listOfItems);

                                    this.cache[key] = listOfItems;

                                    deferred.resolve(this.cache[key]);
                                }, (error: TfsError) => {
                                    //ToDo: piyusing, handle error scenario here.
                                    deferred.reject(error);
                                });
                            }
                        }), delegate(this, (error) => {
                            // ToDo: piyusing, handle error scenario here.
                            deferred.reject(error);
                        }));
                }));
        }

        return deferred.promise;
    }

    private getListOfAreaPaths(node: any, list: IPathControlElement[]): IPathControlElement[] {
        list.push({
            displayName: NodeHelpers.getPath(node, 1)
        } as IPathControlElement);
        for (var i = 0; node.children[i]; i++) {
            this.getListOfAreaPaths(node.children[i], list);
        }

        return list;
    }

    private getkey(project: string): string {
        return `${project}`;
    }
}

function createVersionControlPathItems(sourceItems: ICodePathElement[], vcType: VersionControlType): IPathControlElement[] {
    let folderPathsLookup: IDictionaryStringTo<boolean> = {},
        items: ICodePathElement[] = [];

    if (vcType === VersionControlType.Git) {
        items.push({
            displayName: "/",
            isFolder: true
        } as ICodePathElement);
    }


    for (let sourceItem of sourceItems) {
        let start = sourceItem.displayName.length - 1;
        let pos;

        if (vcType === VersionControlType.Git) {
            // extract folder paths
            while ((pos = sourceItem.displayName.lastIndexOf("/", start)) > 0) {
                let folderPath = sourceItem.displayName.substring(0, pos);

                // we already have this folder and its parents
                if (folderPathsLookup[folderPath]) {
                    break;
                }

                folderPathsLookup[folderPath] = true;
                items.push({
                    displayName: "/" + folderPath,
                    isFolder: true,
                } as ICodePathElement);

                start = pos - 1;
            }
        }
        else if (vcType === VersionControlType.Tfvc) {
            if (sourceItem === sourceItems[0]) {
                items.push({
                    displayName: sourceItem.displayName,
                    isRoot: true
                } as ICodePathElement)
            }
            else if (sourceItem.isBranch || sourceItem.isFolder || sourceItem.isSymLink) {
                items.push(sourceItem);
            }
        }

    }

    // Sort the list of items
    items.sort((a: ICodePathElement, b: ICodePathElement) => { return ignoreCaseComparer(a.displayName, b.displayName); });

    return items;
}