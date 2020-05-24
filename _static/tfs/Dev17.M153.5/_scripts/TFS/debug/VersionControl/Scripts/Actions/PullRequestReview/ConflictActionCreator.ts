// hubs
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";
import { ActionsHub, IConflictsUpdatedPayload } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

// contracts
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitConflict, GitResolutionStatus } from "TFS/VersionControl/Contracts";
import * as VCContracts from "TFS/VersionControl/Contracts";

export class ConflictActionCreator {
    private _repositoryContext: RepositoryContext;
    private _storesHub: StoresHub;
    private _actionsHub: ActionsHub;
    private _sourcesHub: SourcesHub;

    public static readonly TOP = 50;

    constructor(repositoryContext: RepositoryContext, storesHub: StoresHub, actionsHub: ActionsHub, sourcesHub: SourcesHub) {
        this._repositoryContext = repositoryContext;

        this._storesHub = storesHub;
        this._actionsHub = actionsHub;
        this._sourcesHub = sourcesHub;
    }

    public updatePullRequestConflicts(pullRequest: VCContracts.GitPullRequest = null): void {
        if (!pullRequest && !this._storesHub.pullRequestDetailStore.isLoading()) {
            pullRequest = this._storesHub.pullRequestDetailStore.getPullRequestDetail().pullRequestContract();
        }

        if (!pullRequest) {
            return;
        }

        const payload: IConflictsUpdatedPayload = {
            pullRequestId: pullRequest.pullRequestId,
            lastMergeSourceCommit: pullRequest.lastMergeSourceCommit,
            lastMergeTargetCommit: pullRequest.lastMergeTargetCommit,
            conflicts: [],
            skip: 0,
            top: ConflictActionCreator.TOP,
            includeObsolete: false,
            excludeResolved: true,
            onlyResolved: false,
            overflow: false,
        };

        if (this._storesHub.conflictStore.shouldReloadConflicts(pullRequest)) {
            this._actionsHub.conflictsUpdating.invoke(null);

            this._sourcesHub.conflictSource.getPullRequestConflictsAsync(
                payload.pullRequestId,
                payload.skip,
                payload.top + 1,
                payload.includeObsolete,
                payload.excludeResolved,
                payload.onlyResolved
            )
                .then(conflicts => {
                    if (conflicts.length > payload.top) {
                        payload.overflow = true;
                        payload.conflicts = [];
                    }
                    else {
                        payload.conflicts = conflicts;
                    }

                    this._actionsHub.conflictsUpdated.invoke(payload);
                })
                .then(undefined, this._actionsHub.raiseError.invoke);
        }
    }
}
