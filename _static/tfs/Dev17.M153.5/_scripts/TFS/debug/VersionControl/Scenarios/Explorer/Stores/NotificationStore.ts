import { GitPullRequest } from "TFS/VersionControl/Contracts";
import {
    CurrentRepositoryChangedPayload,
    FilesUploadedPayload,
    CommitSavedPayload,
} from "VersionControl/Scenarios/Explorer/ActionsHub";
import * as VCNotificationStore from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface NotificationState extends VCNotificationStore.NotificationState {
    /**
     * The message to notify the user that his default branch has been deleted.
     * Typically, this happens after a user completes a PR deleting its source branch.
     * Intended to be displayed after we fetch items, so we don't display an unnecessary warning.
     */
    deletedUserDefaultBranchMessage: string;

    /**
     * The branch that is replacing the user default branch, when it was deleted.
     * Intended to only display the "deleted" warning if we're navigating to it.
     */
    branchNameReplacingDeleted: string;
}

export namespace NotificationSpecialType {
    export const createPullRequestSuggestion = "createPullRequestSuggestion";
    export const commit = "commit";
}

export interface SaveInfo {
    path: string;
    newRealVersionSpec: VersionSpec;
    comment: string;
    newBranchVersionSpec?: GitBranchVersionSpec;
    existingPullRequest: GitPullRequest;
}

export interface ItemChangedPayload {
    versionSpec: VersionSpec;
}

/**
 * A refinement of the NotificationStore for the Explorer scenario.
 */
export class NotificationStore extends VCNotificationStore.NotificationStore {
    public state: NotificationState;

    public initializeRepository = ({ deletedUserDefaultBranchMessage, branchNameReplacingDeleted }: CurrentRepositoryChangedPayload): void => {
        this.state.deletedUserDefaultBranchMessage = deletedUserDefaultBranchMessage;
        this.state.branchNameReplacingDeleted = branchNameReplacingDeleted;
    }

    public changeItem = ({ versionSpec }: ItemChangedPayload): void => {
        this.clearErrors();

        const { deletedUserDefaultBranchMessage, branchNameReplacingDeleted } = this.state;
        if (deletedUserDefaultBranchMessage) {
            this.state.deletedUserDefaultBranchMessage = undefined;

            const { branchName } = versionSpec as GitBranchVersionSpec;
            if (branchName === branchNameReplacingDeleted) {
                // Display message only if we're using the replacing branch.
                // If user has navigated to another branch, for example using a URL with another explicit version, then omit.
                this.addWarning(new Error(deletedUserDefaultBranchMessage));
            }
        }
    }

    public startEditing = (): void => {
        this.clearErrorsAndCommits();

        this.emitChanged();
    }

    public notifyCommit = (payload: CommitSavedPayload): void => {
        this.clearPullRequestNotifications();

        const specialContent: SaveInfo = {
            path: payload.newPath || payload.path,
            comment: payload.comment,
            newRealVersionSpec: payload.newRealVersionSpec,
            newBranchVersionSpec: payload.newBranchVersionSpec,
            existingPullRequest: payload.existingPullRequest,
        };

        this.add(
            {
                type: VCNotificationStore.NotificationType.info,
                specialType: NotificationSpecialType.commit,
                specialContent,
                isDismissable: true,
            },
            VCNotificationStore.AddMode.replacingItsSpecialType);

        if (payload.postCommitError) {
            this.addError(payload.postCommitError);
        }
    }

    public uploadFiles = (payload: FilesUploadedPayload) => {
        this.clearPullRequestNotifications();

        const specialContent: SaveInfo = {
            path: payload.newPaths[0],
            comment: payload.comment,
            newRealVersionSpec: payload.newRealVersionSpec,
            existingPullRequest: payload.existingPullRequest,
        };

        this.add(
            {
                type: VCNotificationStore.NotificationType.info,
                specialType: NotificationSpecialType.commit,
                specialContent,
                isDismissable: true,
            },
            VCNotificationStore.AddMode.replacingItsSpecialType);
    }

    private clearPullRequestNotifications(): void {
        this.state.notifications = this.state.notifications.filter(notification =>
            notification.specialType !== NotificationSpecialType.createPullRequestSuggestion);
    }

    private clearErrorsAndCommits(): void {
        this.state.notifications = this.state.notifications.filter(notification =>
            notification.type !== VCNotificationStore.NotificationType.error &&
            notification.specialType !== NotificationSpecialType.commit);
    }
}
