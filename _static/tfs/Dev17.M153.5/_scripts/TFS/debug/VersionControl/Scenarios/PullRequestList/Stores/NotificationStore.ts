import { format } from "VSS/Utils/String";

import { PullRequestSearchErrorPayload } from "VersionControl/Scenarios/PullRequestList/Actions/ActionsHub";
import * as VCNotificationStore from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export namespace NotificationSpecialType {
    export const createPullRequestSuggestion = "createPullRequestSuggestion";
    export const searchResult = "searchResult";
}

/**
 * A refinement of the NotificationStore for the PR List scenario.
 */
export class NotificationStore extends VCNotificationStore.NotificationStore {
    public failSearch = ({ error, pullRequestId }: PullRequestSearchErrorPayload): void => {
        // 404 is not-found expected response, so display as warning
        if (error && (error as any).status === 404) {
            this.add(
                {
                    type: VCNotificationStore.NotificationType.warning,
                    message: format(VCResources.PullRequest_NotFound, pullRequestId),
                    specialType: NotificationSpecialType.searchResult,
                    isDismissable: true,
                },
                VCNotificationStore.AddMode.replacingItsSpecialType);
        } else {
            this.addError(error);
        }
    }
}
