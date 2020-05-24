import Q = require("q");

import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

import WitRestClient = require("TFS/WorkItemTracking/RestClient");
import WitContracts = require("TFS/WorkItemTracking/Contracts");

import Contracts = require("TFS/TestManagement/Contracts");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

import VSS_Service = require("VSS/Service");

export class WorkItemDataProvider {
    constructor() {
        this._witClient = VSS_Service.getClient<WitRestClient.WorkItemTrackingHttpClient3>(WitRestClient.WorkItemTrackingHttpClient3);
        this._tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    }

    public static getInstance(): WorkItemDataProvider {
        if (WorkItemDataProvider._instance === null) {
            this._instance = new WorkItemDataProvider();
        }
        return this._instance;
    }

    public beginWorkItemIdsFromQueryId(queryId: string): IPromise<number[]> {
        let deferred: Q.Deferred<number[]> = Q.defer<number[]>();
        let project: string = this._tfsContext.navigation.project;

        if (!queryId) {
            deferred.resolve([]);
        }
        else {
            this._witClient.getQuery(project, queryId, WitContracts.QueryExpand.Wiql)
                .then((queryObject: WitContracts.QueryHierarchyItem) => {
                    this._witClient.queryByWiql({ query: queryObject.wiql }, project)
                        .then((witQueryResult: WitContracts.WorkItemQueryResult) => {
                            let ids = [];

                            if (witQueryResult.queryType === WitContracts.QueryType.Flat &&
                                witQueryResult.queryResultType === WitContracts.QueryResultType.WorkItem &&
                                witQueryResult.workItems) {
                                ids = $.map(witQueryResult.workItems, (workItem) => workItem.id);

                                deferred.resolve(ids);
                            }
                            else {
                                deferred.reject(Resources.OnlyFlatQuerySupported);
                            }                            
                        }, (error) => {
                            deferred.reject(error);
                        });
                }, (error) => {
                    deferred.reject(error);
                });
        }

        return deferred.promise;
    }

    public beginGetWorkItemsFromQueryId(queryId: string): IPromise<IDictionaryStringTo<Contracts.WorkItemReference>> {
        let deferred: Q.Deferred<IDictionaryStringTo<Contracts.WorkItemReference>> = Q.defer<IDictionaryStringTo<Contracts.WorkItemReference>>();
        let project: string = this._tfsContext.navigation.project;

        if (!queryId) {
            deferred.resolve(null);
        }
        else {
            this._witClient.getQuery(project, queryId, WitContracts.QueryExpand.Wiql)
                .then((queryObject: WitContracts.QueryHierarchyItem) => {
                    this._witClient.queryByWiql({ query: queryObject.wiql }, project)
                        .then((witQueryResult: WitContracts.WorkItemQueryResult) => {
                            let ids = [];                            
                            let fieldsToFetch: string[] = ["System.Id", "System.Title", "System.WorkItemType"];

                            if (witQueryResult.queryType === WitContracts.QueryType.Flat &&
                                witQueryResult.queryResultType === WitContracts.QueryResultType.WorkItem &&
                                witQueryResult.workItems) {
                                 ids = $.map(witQueryResult.workItems, (workItem) => workItem.id);
                            }

                            if (ids && ids.length > 0) {
                                this._witClient.getWorkItems(ids, fieldsToFetch)
                                    .then((workItems: WitContracts.WorkItem[]) => {
                                        let workItemMap: IDictionaryStringTo<Contracts.WorkItemReference> = {};

                                        workItems.forEach((workItem: WitContracts.WorkItem) => {
                                            let id = workItem.id.toString();
                                            workItemMap[id] = <Contracts.WorkItemReference>{
                                                id: id,
                                                name: workItem.fields["System.Title"].replace(/\W/g, " "),
                                                type: workItem.fields["System.WorkItemType"]
                                            };
                                        });

                                        deferred.resolve(workItemMap);
                                    }, (error) => {
                                        deferred.reject(error);
                                    });
                            }
                            else {
                                deferred.resolve({});
                            }
                        }, (error) => {
                            deferred.reject(error);
                        });
                }, (error) => {
                    deferred.reject(error);
                });
        }

        return deferred.promise;
    }

    public beginGetColorsProvider(): IPromise<WorkItemTypeColorAndIconsProvider> {
        const projectName = this._tfsContext.contextData.project.name;
        const colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();

        return colorsProvider.ensureColorAndIconsArePopulated([projectName]).then(
            () => colorsProvider,
            () => colorsProvider
        );
    }
    
    private _witClient: WitRestClient.WorkItemTrackingHttpClient2_2;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private static _instance: WorkItemDataProvider = null;
}
