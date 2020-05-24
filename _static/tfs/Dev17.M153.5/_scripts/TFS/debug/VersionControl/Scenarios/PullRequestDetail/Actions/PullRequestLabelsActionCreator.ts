import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { IPullRequestLabelsSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestLabelsSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import { WebApiTagDefinition } from "TFS/Core/Contracts";

export class PullRequestLabelsActionCreator {
    private _pullRequestLabelsSource: IPullRequestLabelsSource;
    private _actionsHub: ActionsHub;
    private _storesHub: StoresHub;
    private _repositoryContext: RepositoryContext;

    public constructor(repositoryContext: RepositoryContext, actionsHub: ActionsHub, sourcesHub: SourcesHub, storesHub: StoresHub) {
        this._pullRequestLabelsSource = sourcesHub.pullRequestLabelsSource;
        this._actionsHub = actionsHub;
        this._storesHub = storesHub;
        this._repositoryContext = repositoryContext;
    }

    public queryLabelsAsync(pullRequestId: number): void {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsLabels)) {
            this._actionsHub.pullRequestLabelsLoading.invoke(null);

            this._pullRequestLabelsSource.queryLabelsAsync(pullRequestId)
                .then(labels => {
                    this._labelsUpdated(labels);
                })
                .then(undefined, this._raiseError);
        }
    }

    public beginGetSuggestedLabels(projectGuid: string, callback: (tagNames: string[]) => void): void {
        this._pullRequestLabelsSource.getSuggestedLabels(projectGuid, callback);
    }

    public addLabelToPullRequest(labelToAdd: string, pullRequestId: number): void {
        this._pullRequestLabelsSource.addLabelAsync({ name : labelToAdd }, this._repositoryContext.getRepositoryId(), this._repositoryContext.getProjectId(), pullRequestId)
            .then(
                labelAdded => this._actionsHub.pullRequestLabelAdded.invoke({ pullRequestLabel: labelAdded }),
                error => this._reloadLabelsAndRaiseError(pullRequestId, error));
    }

    public removeLabelFromPullRequest(label: WebApiTagDefinition, pullRequestId: number): void {
        this._pullRequestLabelsSource.removeLabelAsync(label.id, this._repositoryContext.getRepositoryId(), pullRequestId)
            .then(
                () => this._actionsHub.pullRequestLabelRemoved.invoke({ pullRequestLabel: label }),
                error => this._reloadLabelsAndRaiseError(pullRequestId, error));
    }

    private _labelsUpdated = (labels: WebApiTagDefinition[]) => {
        this._actionsHub.pullRequestLabelsLoaded.invoke({
            pullRequestLabels: labels
        });
    }

    private _reloadLabelsAndRaiseError = (pullRequestId: number, error: Error): void => {
        this.queryLabelsAsync(pullRequestId);
        this._raiseError(error);
    }

    private _raiseError = (error: Error): void => {
        this._actionsHub.raiseError.invoke(error);
    }
}
