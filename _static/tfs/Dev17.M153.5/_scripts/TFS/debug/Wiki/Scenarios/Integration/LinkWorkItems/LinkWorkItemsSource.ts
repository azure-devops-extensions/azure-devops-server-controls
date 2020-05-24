import * as Q from "q";
import * as Service from "VSS/Service";

import { ArtifactUriQueryResult, WorkItemReference } from "TFS/WorkItemTracking/Contracts";
import { WorkItemTrackingHttpClient } from "TFS/WorkItemTracking/RestClient";
import { addWorkItemsBatchAsync, removeWorkItemsAsync } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";

export class LinkWorkItemsSource {
    public queryWorkItemsForArtifactUris(artifactUris: string[], projectId: string): IPromise<ArtifactUriQueryResult> {
        const artifactUrisQuery = {
            artifactUris: artifactUris,
        };
        const witRestClient = Service.getClient<WorkItemTrackingHttpClient>(WorkItemTrackingHttpClient);

        return witRestClient.queryWorkItemsForArtifactUris(artifactUrisQuery, projectId);
    }

    public getWorkItemIdsForArtifactUri(artifactUri: string, projectId: string): IPromise<number[]> {
        return this.queryWorkItemsForArtifactUris([artifactUri], projectId).then(
            (result: ArtifactUriQueryResult) => {
                let workItemIds: number[] = [];
                const workItems: WorkItemReference[] = result.artifactUrisQueryResult[artifactUri];
                if (workItems && workItems.length > 0) {
                    workItemIds = workItems.map((workItem: WorkItemReference) => {
                        return workItem.id;
                    });
                }

                return workItemIds;
            });
    }

    public addWorkItemsAsync(workItemIds: number[], artifactUri: string, artifactLinkName: string): IPromise<void> {
        return addWorkItemsBatchAsync(artifactUri, artifactLinkName, workItemIds);
    }

    public removeWorkItemsAsync(workItemIds: number[], artifactUri: string): IPromise<void> {
        return removeWorkItemsAsync(artifactUri, workItemIds);
    }
}