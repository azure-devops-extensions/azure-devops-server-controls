import { autobind } from "OfficeFabric/Utilities";
import * as VSSStore from "VSS/Flux/Store";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { GitPermissions } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";
import { IDiscussionPermissionsStore, DiscussionPermissions } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";

export interface ChangeListPermissionsState extends DiscussionPermissions {
}

/**
 * Store for Git permissions to be used on Commit Details Page for current repository
 */
export class ChangeListPermissionsStore extends IDiscussionPermissionsStore<ChangeListPermissionsState, any> {

    constructor() {
        super();
        this.initializePermission();
    }

    public getState(): ChangeListPermissionsState {
        return this.getPermissions();
    }

    protected initializePermission() {
        this.updatePermissions();
    }

    protected evaluatePermissions(newPermissions: any): ChangeListPermissionsState {
        return {
            addAttachments: true,
            addEditComment: true,
            likeComment: true,
            updateCommentStatus: true,
        };
    }
}