// Actions
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as GitPullRequestStatusUtils from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusUtils";
import { IPullRequestStatusSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestStatusSource";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import * as VCContracts from "TFS/VersionControl/Contracts";

export class PullRequestStatusActionCreator {

    private _pullRequestStatusSource: IPullRequestStatusSource;

    private _actionsHub: ActionsHub;
    private _storesHub: StoresHub;
    private _repositoryContext: GitRepositoryContext;

    constructor(repositoryContext: GitRepositoryContext, actionsHub: ActionsHub, sourcesHub: SourcesHub, storesHub: StoresHub) {
        this._pullRequestStatusSource = sourcesHub.pullRequestStatusSource;
        this._actionsHub = actionsHub;
        this._storesHub = storesHub;
        this._repositoryContext = repositoryContext;
    }

    public queryPolicyStatusesAsync(pullRequestId: number): void {
        this._actionsHub.pullRequestStatusUpdating.invoke(null);

        this._pullRequestStatusSource.queryPolicyStatusesAsync(pullRequestId)
            .then(statuses => {
                const latestStatuses = GitPullRequestStatusUtils.buildLatestStatusesListAndResolve(statuses, this._repositoryContext);
                this._statusUpdated(latestStatuses);
            })
            .then(undefined, this._raiseError);
    }

    public queryStatusesContributions(): void {
        this._pullRequestStatusSource.queryStatusesContributions()
            .then(contributions => this._actionsHub.pullRequestStatusesContributionsUpdated.invoke({ contributions }))
            .then(undefined, this._raiseError);
    }

    private _statusUpdated = (statuses: GitPullRequestStatusUtils.PullRequestStatus[]) => {
        this._actionsHub.pullRequestStatusUpdated.invoke({
            pullRequestStatuses: statuses
        });
    }

    private _raiseError = (error: any): void => {
        this._actionsHub.raiseError.invoke(error);
    }
}
