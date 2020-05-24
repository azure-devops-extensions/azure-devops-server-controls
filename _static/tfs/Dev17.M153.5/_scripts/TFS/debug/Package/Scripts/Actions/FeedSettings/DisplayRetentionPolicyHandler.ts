import * as Service from "VSS/Service";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsComponents } from "Feed/Common/Constants/Constants";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import * as PackageResources from "Feed/Common/Resources";
import { FeedRetentionPolicy } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * When user navigates to feed settings
 * 1. set loading spinner
 * 2. get feed's views from server
 * 3. set data is fetched from server
 */
export class DisplayRetentionPolicyHandler {
    public static async handleAsync(state: IFeedSettingsState, emit: () => void): Promise<void> {
        if (!state.retentionPolicySettings.retentionPolicyEnabled || state.retentionPolicySettings.retentionPolicy || !state.feed()) {
            return Promise.resolve();
        }

        state.retentionPolicySettings.retentionPolicyLoading = true;
        emit();

        try {
            state.validationErrorBag[FeedSettingsComponents.feedRetentionPolicyMaxVersions] = null;
            const feedDataService = Service.getService(FeedsDataService);
            const retentionPolicy = await feedDataService.getFeedRetentionPolicy(state.feed().id);
            state.retentionPolicySettings.retentionPolicy =
                retentionPolicy || ({ countLimit: null } as FeedRetentionPolicy);
        } catch (error) {
            state.validationErrorBag[FeedSettingsComponents.feedRetentionPolicyMaxVersions] =
                PackageResources.Error_RetentionPolicyFailedToLoad;
            throw error;
        } finally {
            state.retentionPolicySettings.retentionPolicyLoading = false;
            emit();
        }
    }
}
