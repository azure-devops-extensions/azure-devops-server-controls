import { TagService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TagService";
import * as TFSOMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WebApiCreateTagRequestData, WebApiTagDefinition, TypeInfo } from "TFS/Core/Contracts";
import * as GitRestClient from "TFS/VersionControl/GitRestClient";
import * as VCConstants from "VersionControl/Scenarios/Shared/Constants";
import { CachedSource } from "VersionControl/Scripts/Sources/Source";
import { ExtensionService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";

export interface IPullRequestLabelsSource {
    getSuggestedLabels(projectId: string, callback: (tagNames: string[]) => void): void;
    queryLabelsAsync(pullRequestId: number): IPromise<WebApiTagDefinition[]>;
    addLabelAsync(labelsToAdd: WebApiCreateTagRequestData, repositoryId: string, projectId: string, pullRequestId: number): IPromise<WebApiTagDefinition>;
    removeLabelAsync(labelsToRemove: string, repositoryId: string, pullRequestId: number): IPromise<void>;
}
const DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
const DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

/**
 * PullRequest Labels are an extension to pull requests which allow for quick categorization and details on the PR
 */
export class PullRequestLabelsSource  extends CachedSource implements IPullRequestLabelsSource {
    private _gitRestClient: GitRestClient.GitHttpClient;
    private _tagService: TagService;
    private _projectId: string;
    private _repositoryId: string;
    
    constructor(projectId: string, repositoryId: string) {
        super(DATA_ISLAND_PROVIDER_ID, DATA_ISLAND_CACHE_PREFIX);
        const connection = TFSOMCommon.ProjectCollection.getDefaultConnection();
        this._gitRestClient = connection.getHttpClient<GitRestClient.GitHttpClient>(GitRestClient.GitHttpClient);
        this._tagService = connection.getService<TagService>(TagService);
        this._projectId = projectId;
        this._repositoryId = repositoryId;
    }

    public getSuggestedLabels(projectId: string, callback: (tagNames: string[]) => void) {
        this._tagService.beginQueryTagNames(
            [VCConstants.pullRequestLabelsKindId],
            projectId,
            callback);
    }

    public queryLabelsAsync(pullRequestId: number): IPromise<WebApiTagDefinition[]> {
        const cached = this.fromCacheAsync<WebApiTagDefinition[]>("Labels." + pullRequestId, {});
        if (cached) {
            return cached;
        }

        return this._gitRestClient.getPullRequestLabels(this._repositoryId, pullRequestId, this._projectId);
    }

    public addLabelAsync(labelToAdd: WebApiCreateTagRequestData, repositoryId: string, projectId: string, pullRequestId: number): IPromise<WebApiTagDefinition> {
        return this._gitRestClient.createPullRequestLabel(labelToAdd, repositoryId, pullRequestId)
            .then(value => {
                this._tagService.addTagsToCacheForArtifactKinds([labelToAdd.name], [VCConstants.pullRequestLabelsKindId], projectId);

                return value;
            });
    }

    public removeLabelAsync(labelToRemove: string, repositoryId: string, pullRequestId: number): IPromise<void> {
        return this._gitRestClient.deletePullRequestLabels(repositoryId, pullRequestId, labelToRemove);
    }
}
