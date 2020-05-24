import * as Q from "q";
import * as Service from "VSS/Service";
import { AssociatedWorkItem } from "TFS/VersionControl/Contracts";
import { ArtifactUriQueryResult, WorkItemReference } from "TFS/WorkItemTracking/Contracts";
import { WorkItemTrackingHttpClient } from "TFS/WorkItemTracking/RestClient";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * A source of data for associated workitems related to a commit.
 */
export class WorkItemsSource {

    constructor(private _repositoryContext: RepositoryContext) {
    }
    /**
     * Fetches git work items data with respect to an artifact and returns ids of associated work items.
     */
    public getAssociatedWorkItemsForGit(artifactUri: string, projectId: string): IPromise<number[]> {
        const artifactUrisQuery = {
            artifactUris: [artifactUri],
        };
        const witRestClient = Service.getClient<WorkItemTrackingHttpClient>(WorkItemTrackingHttpClient);

        return witRestClient.queryWorkItemsForArtifactUris(artifactUrisQuery, projectId).then(
            (result: ArtifactUriQueryResult) => {
                let workItemIds: number[] = [];
                const workItems: WorkItemReference[] = result.artifactUrisQueryResult[artifactUri];
                if (workItems && workItems.length > 0) {
                    workItemIds = workItems.map((workItem: WorkItemReference) => {
                        return workItem.id;
                    });
                }

                return workItemIds;
            },
        );
    }

    /**
     * Fetches TFVC work items data with respect to a versionSpecString and returns ids of associated work items.
     */
    public getAssociatedWorkItemsForTfvc(versionSpecInString: string): IPromise<number[]> {
        const deferred = Q.defer<number[]>();
        this._repositoryContext.getClient().beginGetAssociatedWorkItemsPromise(this._repositoryContext, [versionSpecInString]).then(
            (workItems: AssociatedWorkItem[]) => {
                let workItemIds: number[] = [];
                if (workItems && workItems.length > 0) {
                    workItemIds = workItems.map((workItem: AssociatedWorkItem) => {
                        return workItem.id;
                    });
                }

                deferred.resolve(workItemIds);
            },
        );

        return deferred.promise;
    }
}
