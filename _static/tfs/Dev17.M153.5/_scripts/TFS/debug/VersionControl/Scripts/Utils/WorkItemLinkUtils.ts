import Q = require("q");
import { ArtifactTypeNames, ToolNames } from "VSS/Artifacts/Constants";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import { JsonPatchDocument, JsonPatchOperation, Operation } from "VSS/WebApi/Contracts";
import { ignoreCaseComparer } from  "VSS/Utils/String";
import { WorkItem, WorkItemExpand } from "TFS/WorkItemTracking/Contracts";
import TFS_Wit_WebApi = require("TFS/WorkItemTracking/RestClient");
import TFS_WitBatch_WebApi = require("TFS/WorkItemTracking/BatchRestClient");
import { WorkItems } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

/**
 * Add artifact link between work item identified by given id and the given artifact identified by its uri.
 * @param artifactUri Uri of artifact to link to work item
 * @param artifactLinkName Name of artifact link type to create
 * @param workItemId Id of work item
 */
export function addWorkItemAsync(artifactUri: string, artifactLinkName: string, workItemId: number): IPromise<void> {
    // We cannot depend on WorkItemTracking here, so use string constants directly
    const patchOp = getWorkItemPatchAddOperation(artifactUri, artifactLinkName);

    const witClient = TFS_Wit_WebApi.getClient();
    return witClient.updateWorkItem([patchOp], workItemId).then(
        (workItem: WorkItem) => {
            // Resolve
            return null;
        }, (error) => {
            if (error != null && error.responseText != null && error.responseText.match("Microsoft.TeamFoundation.WorkItemTracking.Web.Common.RelationAlreadyExistsException") != null) {
                //if the error was because it already exists, don't display an error because the user reached their desired state
                //We already checked above that the link doesn't exist, but now it does, so add it.
                return null;
            }

            return Q.reject(error);
        });
}

/**
 * Add artifact links to the given work items
 * @param artifactUri Uri of artifact to link to work item
 * @param artifactLinkName Name of artifact link type to create
 * @param workItemId Ids of work items to create links to
 */
export function addWorkItemsBatchAsync(artifactUri: string, artifactLinkName: string, workItemIds: number[]) {
    const batchWitClient = TFS_WitBatch_WebApi.getClient();

    const operations = workItemIds.map((workItemId: number): [number, JsonPatchDocument] => {
        return [workItemId, [getWorkItemPatchAddOperation(artifactUri, artifactLinkName)]];
    });

    return batchWitClient.updateWorkItemsBatch(operations)
        .then(responses => {
            const failedResponses = responses.value.filter(response => response.code >= 400);
            if (failedResponses.length) {
                const firstBody = JSON.parse(failedResponses[0].body);
                throw new Error(firstBody && firstBody.value && firstBody.value.Message ? firstBody.value.Message : firstBody);
            }
        });
}

function getWorkItemPatchAddOperation(artifactUri: string, artifactLinkName: string): JsonPatchOperation {
    return {
        op: Operation.Add,
        path: "/relations/-",
        value: {
            attributes: { "name": artifactLinkName },
            rel: "ArtifactLink",
            url: artifactUri
        }
    } as JsonPatchOperation;
}

function getWorkItemPatchRemoveDocument(deleteIndex: number, serverUri: string): JsonPatchDocument {
    const testOp = {
        op: Operation.Test,
        path: "/relations/" + deleteIndex + "/url",
        value: serverUri
    } as JsonPatchOperation;

    const patchOp = {
        op: Operation.Remove,
        path: "/relations/" + deleteIndex
    } as JsonPatchOperation;

    return [testOp, patchOp];
}
/**
 * Removes link between artifact identified by given Uri and work item
 * @param artifactUri Uri of linked artifact to remove from work item
 * @param workItemId Id of work item to remove link from 
 */
export function removeWorkItemAsync(artifactUri: string, workItemId: number): IPromise<void> {
    const witClient = TFS_Wit_WebApi.getClient();
    return witClient.getWorkItem(workItemId, null, null, WorkItemExpand.Relations).then<void>(workItem => {
        let serverUri: string;
        let deleteIndex: number;

        if (workItem !== null && workItem.relations !== null) {
            // Find the index of the relation to delete
            for (let i = 0; i < workItem.relations.length; ++i) {
                if (ignoreCaseComparer(workItem.relations[i].url, artifactUri) === 0) {
                    deleteIndex = i;
                    serverUri = workItem.relations[i].url;
                    break;
                }
            }
        }

        if (deleteIndex >= 0) {
            return witClient.updateWorkItem(getWorkItemPatchRemoveDocument(deleteIndex, serverUri), workItemId).then(
                (workItem: WorkItem) => {
                    // Save successfully
                    return null;
                });
        }
    });
}

/**
 * Removes link between artifact identified by given Uri and work items
 * @param artifactUri Uri of linked artifact to remove from work item
 * @param workItemIds Ids of work items to remove link from 
 */
export function removeWorkItemsAsync(artifactUri: string, workItemIds: number[]): IPromise<void> {
    if (workItemIds.length === 1) {
        return removeWorkItemAsync(artifactUri, workItemIds[0]);
    }

    const witClient = TFS_Wit_WebApi.getClient();
    const batchWitClient = TFS_WitBatch_WebApi.getClient();

    return witClient.getWorkItems(workItemIds, null, null, WorkItemExpand.Relations)
        .then<[number, JsonPatchDocument][]>(workItems => {
            return workItems.map((workItem): [number, JsonPatchDocument] => mapWorkItemToUpdateDocument(workItem, artifactUri)).filter(op => Boolean(op));
        })
        .then<TFS_WitBatch_WebApi.JsonHttpBatchResponse>(operations => {
            return batchWitClient.updateWorkItemsBatch(operations);
        })
        .then<void>(responses => {
            const failedResponses = responses.value.filter(response => response.code >= 400);
            if (failedResponses.length) {
                const firstBody = JSON.parse(failedResponses[0].body);
                throw new Error(firstBody && firstBody.value && firstBody.value.Message ? firstBody.value.Message : firstBody);
            }
        });
}

export function mapWorkItemToUpdateDocument(workItem: WorkItem, artifactUri: string): [number, JsonPatchDocument] {
    if (workItem && workItem.relations) {
        for (let i = 0; i < workItem.relations.length; ++i) {
            if (ignoreCaseComparer(workItem.relations[i].url, artifactUri) === 0) {
                return [workItem.id, getWorkItemPatchRemoveDocument(i, workItem.relations[i].url)];
            }
        }
    }
    return null;
}

export function mapWorkItemIdToLinkedArtifact(workItemId: number): ILinkedArtifact {
    const artifact: ILinkedArtifact = {
        id: workItemId.toString(10),
        tool: ToolNames.WorkItemTracking,
        type: ArtifactTypeNames.WorkItem,
        linkType: "work-item-link",
        linkTypeDisplayName: WorkItems,
    };

    artifact.uri = LinkingUtilities.encodeUri(artifact);

    return artifact;
}