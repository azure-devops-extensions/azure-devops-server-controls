/// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import * as Q from "q";
import { IDataSource, PathTreeCache, IResultSet } from "Search/Scripts/React/Sources/PathTreeCache";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import * as VSS from "VSS/VSS";
import { SearchContext } from "Search/Scripts/Common/TFS.Search.Context";
import { NodeHelpers } from "WorkItemTracking/Scripts/Utils/NodeHelpers";
import WITOM_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { delegate } from "VSS/Utils/Core";
import * as TreeUtils from "VSS/Utils/Tree";
import { LoadingState } from "Search/Scripts/React/Models";

export interface WIAreaPathCacheOptions {
    projectName: string
}

export class WIAreaPathCache extends PathTreeCache {
    private static instance: WIAreaPathCache;
    private _options: WIAreaPathCacheOptions;

    public static getInstance(): WIAreaPathCache {
        if (!WIAreaPathCache.instance) {
            WIAreaPathCache.instance = new WIAreaPathCache(new WIAreaPathTreeDataSource());
        }

        return WIAreaPathCache.instance;
    }

    public initialize(options: WIAreaPathCacheOptions) {
        this._dataSource.initialize(options);

        if (JSON.stringify(this._options) !== JSON.stringify(options)) {
            this.clear();
        }

        this._options = options;
    }
}

export class WIAreaPathTreeDataSource implements IDataSource {
    private _options: WIAreaPathCacheOptions;
    
    public initialize(options: WIAreaPathCacheOptions): void {
        this._options = options;
    }

    public getItems(paths: string[]): Q.Promise<IResultSet> {
        let deferred = Q.defer<IResultSet>();

        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking"], delegate(
                this,
                (WITOM: typeof WITOM_NO_REQUIRE) => {
                    let store = TFS_OM_Common.ProjectCollection
                        .getConnection(SearchContext.getTfsContext())
                        .getService<WITOM_NO_REQUIRE.WorkItemStore>(WITOM.WorkItemStore);
                    store.beginGetProject(
                        this._options.projectName, delegate(this, (selectedProject: WITOM_NO_REQUIRE.Project) => {
                            if (ignoreCaseComparer(selectedProject.name, this._options.projectName) === 0) {
                                selectedProject.nodesCacheManager.beginGetNodes().then(() => {
                                    let areaNodes = selectedProject.nodesCacheManager.getAreaNode(true);

                                    let result: IDictionaryStringTo<string[]> = {};

                                    for (var i = 0; areaNodes.children[i]; i++) {
                                        areaNodes.children[i].parent.name = areaNodes.name;
                                    }

                                    TreeUtils.traversePreOrder<INode>(areaNodes, node => node.children, (node: INode) => {
                                        let nodePath = NodeHelpers.getPath(node, 1);

                                        result[nodePath] = node.children.map((child: INode) => [nodePath, child.name].join('\\'));
                                    });

                                    deferred.resolve({ status: LoadingState.LoadSuccess, result: result });
                                }, (error: TfsError) => {
                                    deferred.reject(error);
                                });
                            }
                        }), delegate(this, (error) => {
                            deferred.reject(error);
                        }));
                }));

        return deferred.promise;
    }
}