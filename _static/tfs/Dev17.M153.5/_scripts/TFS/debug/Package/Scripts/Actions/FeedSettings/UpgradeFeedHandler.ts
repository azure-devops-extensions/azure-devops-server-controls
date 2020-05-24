import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import {
    IFeedSettingsState,
    IRetentionPolicySettingsState
} from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { Exceptions } from "Feed/Common/Constants/Constants";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import * as PackageResources from "Feed/Common/Resources";
import { Feed as Feed_ } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Feed, FeedRetentionPolicy } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { FeedCapabilities } from "../../WebApi/VSS.Feed.Contracts";

/**
 * The user clicked save in feed details pivot
 */
export class UpgradeFeedHandler {
    public static async handleAsync(state: IFeedSettingsState): Promise<Feed> {
        const feedDataService = Service.getService(FeedsDataService);
        await feedDataService.updateCapability(state.feed().id, state.feed().capabilities | FeedCapabilities.UpstreamV2);
        state.upgradeInProgress = true;
        return await this.getFeedAsync(state);
    }

    private static async getFeedAsync(state: IFeedSettingsState): Promise<Feed> {
        const feedDataService = Service.getService(FeedsDataService);
        return await feedDataService.getFeed(state.feed().id);
    }
}
