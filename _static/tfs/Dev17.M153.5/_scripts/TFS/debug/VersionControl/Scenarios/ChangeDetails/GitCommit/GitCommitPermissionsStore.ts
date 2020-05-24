import { autobind } from "OfficeFabric/Utilities";
import * as VSSStore from "VSS/Flux/Store";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { IDiscussionPermissionsStore, DiscussionPermissions } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";
import { GitPermissions } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";

export interface GitCommitPermissionsState extends DiscussionPermissions {
    cherryPick: boolean;
    revertCommit: boolean;
    createBranch: boolean;
    createTag: boolean;
}

/**
 * Store for Git permissions to be used on Commit Details Page for current repository
 */
export class GitCommitPermissionsStore extends IDiscussionPermissionsStore<GitCommitPermissionsState, GitPermissions> {

    constructor(protected _actionsHub: ActionsHub) {
        super();
        this._actionsHub.permissionsUpdated.addListener(this.onPermissionsUpdated);
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.permissionsUpdated.removeListener(this.onPermissionsUpdated);
            this._actionsHub = null;
        }
    }

    public getState(): GitCommitPermissionsState {
        return this.getPermissions();
    }

    protected evaluatePermissions(newPermissions: GitPermissions): GitCommitPermissionsState {
        if (!newPermissions) {
            return null;
        }

        const updateCommentStatus = newPermissions.PullRequestContribute && newPermissions.GenericContribute;
        return {
            cherryPick: Boolean(newPermissions.CreateBranch),
            revertCommit: Boolean(newPermissions.CreateBranch),
            createBranch: Boolean(newPermissions.CreateBranch),
            createTag: Boolean(newPermissions.CreateTag),

            // discussion permissions
            addAttachments: Boolean(newPermissions.GenericContribute), // this is required only because interface DiscussionPermissions needs this - not used
            addEditComment: Boolean(newPermissions.GenericContribute),
            likeComment: Boolean(newPermissions.GenericContribute),
            updateCommentStatus: updateCommentStatus,
        };
    }
}