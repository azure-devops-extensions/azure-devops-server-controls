import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";

/**
 * Enumerate what the current user is allowed to do on discussions for this page.
 */
export interface DiscussionPermissions {
    addEditComment: boolean;
    addAttachments: boolean;
    likeComment: boolean;
    updateCommentStatus: boolean;
}

/**
 * A shared store that includes strong typing for discussion permissions.
 */
export class IDiscussionPermissionsStore<TPermissions extends DiscussionPermissions, TRawPermissions> extends PermissionsStore<TPermissions, TRawPermissions> { 
    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IDiscussionPermissionsStore"; }
}
