import { autobind } from "OfficeFabric/Utilities";

import { PullRequestAsyncStatus } from "TFS/VersionControl/Contracts";
import * as VCNotificationStore from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export namespace NotificationSpecialTypes {
    export const signalRConnectionWarning = "signalRConnectionWarning";
    export const restartMergeResult = "restartMergeResult";
    export const existingPullRequest = "existingPullRequest";
}

export interface NotificationState extends VCNotificationStore.NotificationState {
    isRestartMergeRequested: boolean;
    isRestartMergeQueued: boolean;
}

/**
 * A store with the notifications of Pull Request Details.
 */
export class NotificationStore extends VCNotificationStore.NotificationStore {
    public state: NotificationState;

    @autobind
    public onNotificationFlush(payload: Actions.INotificationFlushPayload): void {
        if (payload.specialType) {
            this.clearSpecialType(payload.specialType);
        } else {
            this.clearType(payload.type);
        }
    }

    @autobind
    public onNotificationDismissed({ notification }: Actions.INotificationDismissPayload): void {
        this.dismiss(notification);
    }

    /**
     * If there is an error, add it to the notification queue.
     */
    @autobind
    public onNotificationError(error: any): void {
        this.addError(error);
    }

    /**
     * If there is a notification, add it to the notification queue.
     */
    @autobind
    public onNotification(payload: Actions.INotificationPayload): void {
        this.add({
            type: payload.type,
            message: payload.message,
            specialType: payload.specialType,
            isDismissable: true,
            specialContent: payload.specialContent
        });
    }

    @autobind
    public rememberRestartMerge(): void {
        this.state.isRestartMergeRequested = true;
        this.state.isRestartMergeQueued = false;

        this.clearSpecialType(NotificationSpecialTypes.restartMergeResult);
        this.emitChanged();
    }

    /**
     * Notifies a status change on the Pull Request.
     * If user requested a merge and it's queued, we take note that merge was indeed necessary.
     * If user requested a merge and it's successful, we show a custom notification, either unnecessary or successful.
     */
    @autobind
    public onPullRequestUpdated(payload: Actions.IPullRequestUpdatedPayload): void {
        if (this.state.isRestartMergeRequested) {
            if (payload.pullRequest.mergeStatus === PullRequestAsyncStatus.Queued) {
                this.state.isRestartMergeQueued = true;
            } else if (payload.pullRequest.mergeStatus === PullRequestAsyncStatus.Succeeded) {
                if (!this.state.isRestartMergeQueued) {
                    this.add({
                        type: VCNotificationStore.NotificationType.warning,
                        specialType: NotificationSpecialTypes.restartMergeResult,
                        specialContent: {
                            isNecessary: false,
                            lastMergeCommit: payload.pullRequest.lastMergeCommit,
                        },
                        isDismissable: true,
                    });
                } else {
                    this.add({
                        type: VCNotificationStore.NotificationType.success,
                        specialType: NotificationSpecialTypes.restartMergeResult,
                        specialContent: {
                            isNecessary: true,
                            lastMergeCommit: payload.pullRequest.lastMergeCommit,
                        },
                        isDismissable: true,
                    });
                }

                this.state.isRestartMergeRequested = false;
            } else {
                this.state.isRestartMergeRequested = false;
            }
        }
    }

    public getNotifications(typeFilter?: VCNotificationStore.NotificationType): VCNotificationStore.Notification[] {
        if (typeFilter === undefined) {
            return this.state.notifications;
        }

        return this.state.notifications.filter(n => typeFilter === n.type);
    }
}