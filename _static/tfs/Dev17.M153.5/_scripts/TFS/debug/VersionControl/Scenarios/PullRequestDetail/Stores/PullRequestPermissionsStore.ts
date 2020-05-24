import { autobind } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IPullRequestUpdatedPayload, IContextUpdatedPayload } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { IDiscussionPermissionsStore, DiscussionPermissions } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";
import { GitPermissionSet, getRepositoryPermissions, getBranchPermissions } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { FavoritesPermissions } from "VersionControl/Scenarios/Shared/Permissions/FavoritesPermissionsSource";
import * as String_Utils from "VSS/Utils/String";

/**
 * Enumerate what the current user is allowed to do on this pull request.
 * This contract may be defined on the server instead in the future.
 */
export interface PullRequestPermissions extends DiscussionPermissions {
    abandonReactivate: boolean;
    cancelAutoComplete: boolean;
    cherryPickRevert: boolean;
    complete: boolean;
    deleteSourceBranch: boolean;
    follow: boolean;
    liveUpdate: boolean;
    publishUnpublish: boolean;
    restartMerge: boolean;
    retarget: boolean;
    share: boolean;
    updateFavorites: boolean;
    updateLabels: boolean;
    updateReviewers: boolean;
    updateTitleDescription: boolean;
    updateWorkItems: boolean;
    usePolicyActions: boolean;
    updateVisit: boolean;
    viewFavorites: boolean;
    vote: boolean;
}

export interface PullRequestPermissionsSet {
    gitPermissionSet: GitPermissionSet;
    settingsPermissions: SettingsPermissions;
    favoritesPermissions: FavoritesPermissions;
}

export class PullRequestPermissionsStore extends IDiscussionPermissionsStore<PullRequestPermissions, PullRequestPermissionsSet> {
    private _pullRequest: GitPullRequest;

    @autobind
    public onPullRequestUpdated(payload: IPullRequestUpdatedPayload)  {
        if (!payload.pullRequest) {
            return;
        }

        if (this._pullRequest) {
            if (!String_Utils.equals(this._pullRequest.targetRefName, payload.pullRequest.targetRefName)) {
                // if target branch changed, we need to grab the new pull request (and so have the new target branch)
                // but not re-evaluate permissions until we have both the updated pull request and updated server permissions.

                // There's a theoretical problem here if permissions get updated and then the target branch is updated
                // But the core problem is this store needs both the pr and permissions to be updated simultaneously
                // otherwise the store creates a bad permission state for the page. I think the more correct thing to do is
                // delete _pullRequest and onPullRequestUpdated and require that the current pr details be passed in to
                // evaluatePermissions but that is a larger refactor that doesn't seem worth it right now.
                this._pullRequest = payload.pullRequest;
            }
            return;
        }

        this._pullRequest = payload.pullRequest;
        this.updatePermissions();

        this.emitChanged();
    }

    protected arePermissionsLoading(): boolean {
        // to fully load permissions, we need the permission set, the tfs context (for the current user id)
        // and the pull request (for the repo ids and branch names)
        return super.arePermissionsLoading() || !this._pullRequest;
    }

    protected evaluatePermissions(permissionSet: PullRequestPermissionsSet): PullRequestPermissions {
        if (!permissionSet
            || !permissionSet.gitPermissionSet
            || !permissionSet.settingsPermissions
            || !permissionSet.favoritesPermissions
            || !this._pullRequest) {
            return null;
        }

        const targetRepositoryId: string = this._pullRequest.repository.id;
        const sourceRepositoryId: string = this._pullRequest.forkSource
            ? this._pullRequest.forkSource.repository.id
            : targetRepositoryId;

        const targetBranchRefName: string = this._pullRequest.targetRefName;
        const sourceBranchRefName: string = this._pullRequest.forkSource
            ? this._pullRequest.forkSource.name
            : this._pullRequest.sourceRefName;

        const targetRepositoryPermissions = getRepositoryPermissions(permissionSet.gitPermissionSet, targetRepositoryId);
        const sourceBranchPermissions = getBranchPermissions(permissionSet.gitPermissionSet, sourceRepositoryId, sourceBranchRefName);
        const targetBranchPermissions = getBranchPermissions(permissionSet.gitPermissionSet, targetRepositoryId, targetBranchRefName);

        return {
            abandonReactivate: targetRepositoryPermissions.PullRequestContribute,
            addAttachments: targetRepositoryPermissions.PullRequestContribute,
            addEditComment: targetRepositoryPermissions.PullRequestContribute,
            cancelAutoComplete: targetRepositoryPermissions.PullRequestContribute && targetBranchPermissions.GenericContribute,
            cherryPickRevert: targetRepositoryPermissions.PullRequestContribute && targetRepositoryPermissions.CreateBranch,
            complete: targetRepositoryPermissions.PullRequestContribute && targetBranchPermissions.GenericContribute,
            deleteSourceBranch: targetRepositoryPermissions.PullRequestContribute && sourceBranchPermissions.GenericContribute && sourceBranchPermissions.ForcePush,
            follow: targetRepositoryPermissions.PullRequestContribute,
            likeComment: targetRepositoryPermissions.PullRequestContribute,
            liveUpdate: permissionSet.settingsPermissions.Write,
            publishUnpublish: targetRepositoryPermissions.PullRequestContribute,
            restartMerge: targetRepositoryPermissions.PullRequestContribute,
            retarget: targetRepositoryPermissions.PullRequestContribute,
            share: targetRepositoryPermissions.PullRequestContribute,
            updateCommentStatus: targetRepositoryPermissions.PullRequestContribute,
            updateLabels: targetRepositoryPermissions.PullRequestContribute,
            updateReviewers: targetRepositoryPermissions.PullRequestContribute,
            updateTitleDescription: targetRepositoryPermissions.PullRequestContribute,
            updateWorkItems: targetRepositoryPermissions.PullRequestContribute,
            usePolicyActions: targetRepositoryPermissions.PullRequestContribute,
            updateFavorites: permissionSet.favoritesPermissions.Write,
            updateVisit: permissionSet.settingsPermissions.Write,
            viewFavorites: permissionSet.favoritesPermissions.Read,
            vote: targetRepositoryPermissions.PullRequestContribute,
        };
    }
}
