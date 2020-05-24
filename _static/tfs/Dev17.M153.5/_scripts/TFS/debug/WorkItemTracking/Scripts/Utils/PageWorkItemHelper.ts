import * as Service from "VSS/Service";

import { WorkItem, WorkItemErrorPolicy } from "TFS/WorkItemTracking/Contracts";
import { WorkItemTrackingHttpClient } from "TFS/WorkItemTracking/RestClient";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export class PageWorkItemHelper {

    /**
     * Pages work items with given ids considering the max page size
     */
    public static pageWorkItems(ids: number[], projectName?: string, fields?: string[]): Promise<WorkItem[]> {
        const pwh = PageWorkItemHelper;

        const maxPageSize = 200;
        const promises: IPromise<WorkItem[]>[] = [];

        let pageIds: number[] = [];
        for (const id of ids) {
            // If we have exceeded url length or page size, page the work items
            if (pageIds.length >= maxPageSize) {
                promises.push(pwh._pageWorkItems(pageIds, projectName, fields));
                pageIds = [id];
            } else {
                pageIds.push(id);
            }
        }

        // Page remaining work items
        if (pageIds.length > 0) {
            promises.push(pwh._pageWorkItems(pageIds, projectName, fields));
        }

        return Promise.all(promises)
            .then(results => {
                const workItems: WorkItem[] = [];
                for (const result of results) {
                    workItems.push(...result);
                }
                return workItems;
            });

    }

    private static async _pageWorkItems(ids: number[], projectName?: string, fieldRefNames?: string[]): Promise<WorkItem[]> {
        const witHttpClient = PageWorkItemHelper._getHttpClient();
        return await witHttpClient.getWorkItemsBatch(
            {
                $expand: undefined,
                asOf: undefined,
                errorPolicy: WorkItemErrorPolicy.Omit,
                fields: fieldRefNames,
                ids
            },
            projectName
        );
    }

    private static _getHttpClient(): WorkItemTrackingHttpClient {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const tfsConnection = new Service.VssConnection(tfsContext.contextData);
        return tfsConnection.getHttpClient<WorkItemTrackingHttpClient>(WorkItemTrackingHttpClient);
    }

}
