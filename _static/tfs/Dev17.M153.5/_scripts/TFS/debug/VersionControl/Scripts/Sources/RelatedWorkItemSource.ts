import * as Q from "q";

import * as Git_Client from "TFS/VersionControl/GitRestClient";
import * as Wit_Client from "TFS/WorkItemTracking/RestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { ResourceRef } from "VSS/WebApi/Contracts";
import { WorkItemNextStateOnTransition } from "TFS/WorkItemTracking/Contracts";
import { PullRequests_RelatedArtifacts_FailToDelete_IndexChanged } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import {
    addWorkItemAsync as addWorkItemAsyncUtil,
    removeWorkItemsAsync as removeWorkItemsAsyncUtil
} from "VersionControl/Scripts/Utils/WorkItemLinkUtils";

export interface IRelatedWorkItemSource {
    queryWorkItemsAsync(pullRequestId: number): IPromise<ResourceRef[]>;
    queryWorkItemTransitionsAsync(workItemIds: number[]): IPromise<WorkItemNextStateOnTransition[]>;
    addWorkItemAsync(artifactUri: string, workItemId: number): IPromise<void>;
    removeWorkItemsAsync(artifactUri: string, workItemIds: number[]): IPromise<void>;
}

export class RelatedWorkItemSource implements IRelatedWorkItemSource {
    private _gitRestClient: Git_Client.GitHttpClient;
    private _witRestClient: Wit_Client.WorkItemTrackingHttpClient;
    private _repositoryId: string;
    private _projectId: string;

    constructor(projectId: string, repositoryId: string) {
        this._repositoryId = repositoryId;
        this._projectId = projectId;

        this._gitRestClient = ProjectCollection.getDefaultConnection().getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
        this._witRestClient = ProjectCollection.getDefaultConnection().getHttpClient<Wit_Client.WorkItemTrackingHttpClient>(Wit_Client.WorkItemTrackingHttpClient);
    }

    public queryWorkItemsAsync(pullRequestId: number): IPromise<ResourceRef[]> {
        return this._gitRestClient.getPullRequestWorkItemRefs(this._repositoryId, pullRequestId, this._projectId);
    }

    public queryWorkItemTransitionsAsync(workItemIds: number[]): IPromise<WorkItemNextStateOnTransition[]> {
        return this._witRestClient.getWorkItemNextStatesOnCheckinAction(workItemIds);
    }

    public addWorkItemAsync(artifactUri: string, workItemId: number): IPromise<void> {
        // We cannot depend on WorkItemTracking here, so use string constants directly
        return addWorkItemAsyncUtil(artifactUri, "Pull Request", workItemId);
    }

    public removeWorkItemsAsync(artifactUri: string, workItemIds: number[]): IPromise<void> {
        return removeWorkItemsAsyncUtil(artifactUri, workItemIds)
            .then<void>(null, error => {
                // We delete links by array index. If indicies were changed inbetween the getWorkItem call 
                // and the patch call in this function, then the patch call will fail.
                throw PullRequests_RelatedArtifacts_FailToDelete_IndexChanged;
            });
    }
}