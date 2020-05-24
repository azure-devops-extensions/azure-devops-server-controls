import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { IFeedSettingsState, IRetentionPolicySettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { Exceptions } from "Feed/Common/Constants/Constants";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import * as PackageResources from "Feed/Common/Resources";
import { Feed as Feed_ } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Feed, FeedRetentionPolicy } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * The user clicked save in feed details pivot
 */
export class SaveFeedDetailsHandler {
    public static async handleAsync(state: IFeedSettingsState): Promise<Feed> {
        let updatedFeed: Feed_;

        try {
            updatedFeed = (await this.setFeedDetailsAsync(state)) as Feed_;
            announce(PackageResources.SavedAnnouncement);
            // if the description is empty the server will return null, set it to empty to update the UI
            if (state.feedDescription === Utils_String.empty) {
                updatedFeed.description = Utils_String.empty;
            }

            state.feedName = null;
            state.feedDescription = null;
            state.hideDeletedPackageVersions = null;
            state.badgesEnabled = null;
        } catch (error) {
            const reason: TfsError = error;
            const errMessage: string = this.getErrorMessage(reason, state);

            reason.message = errMessage;

            announce(PackageResources.SavedAnnouncement_Failed);

            throw reason;
        }

        const retentionPolicySettings = state.retentionPolicySettings;
        if (retentionPolicySettings.retentionPolicyEnabled) {
            retentionPolicySettings.retentionPolicy = await this.setFeedRetentionPolicyAsync(
                retentionPolicySettings,
                state.feed().id
            );
            retentionPolicySettings.retentionPolicyLoading = false;
            retentionPolicySettings.retentionPolicyToApply = null;
        }

        return updatedFeed;
    }

    private static getErrorMessage(reason: TfsError, state: IFeedSettingsState): string {
        if (reason.serverError != null && reason.serverError.typeKey === Exceptions.FeedNameAlreadyExistsException) {
            return Utils_String.format(PackageResources.FeedSettings_FeedRenameError_AlreadyExists, state.feedName);
        }

        if (reason.serverError != null && reason.serverError.typeKey === Exceptions.FeedNotReleasedException) {
            return Utils_String.format(PackageResources.FeedSettings_FeedRenameError_NotYetReleased, state.feedName);
        }

        return Utils_String.format(PackageResources.FeedSettings_FeedRenameError, reason.message);
    }

    private static async setFeedDetailsAsync(state: IFeedSettingsState): Promise<Feed> {
        const feedToUpdate: Feed = {
            id: state.feed().id,
            name: state.feedName,
            description: state.feedDescription,
            hideDeletedPackageVersions: state.hideDeletedPackageVersions,
            badgesEnabled: state.badgesEnabled
        } as Feed;

        const feedDataService = Service.getService(FeedsDataService);
        return feedDataService.updateFeedAsync(feedToUpdate);
    }

    private static async setFeedRetentionPolicyAsync(
        state: IRetentionPolicySettingsState,
        feedId: string
    ): Promise<FeedRetentionPolicy> {
        const newPolicy = state.retentionPolicyToApply;
        if (newPolicy) {
            const feedDataService = Service.getService(FeedsDataService);

            if ((newPolicy.ageLimitInDays == null || newPolicy.ageLimitInDays === 0) && newPolicy.countLimit == null) {
                return feedDataService.deleteFeedRetentionPolicy(feedId);
            } else {
                return feedDataService.setFeedRetentionPolicyAsync(feedId, newPolicy);
            }
        } else {
            return Promise.resolve(state.retentionPolicy);
        }
    }
}
