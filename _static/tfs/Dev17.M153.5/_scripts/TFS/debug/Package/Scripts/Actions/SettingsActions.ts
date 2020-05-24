import { Action } from "VSS/Flux/Action";

import { IFeedRetentionPolicyUpdatedPayload } from "Package/Scripts/Common/ActionPayloads";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";

export class SettingsActions {
    /**
     * Singleton action that gets triggered when the user requests to modify the feed settings.
     * TODO: when we remove the old settings dialog, move this to FeedSettingsActionCreator
     */
    public static FeedSettingsNavigateClicked = new Action();

    /**
     * The feed settings were updated by the user.
     */
    public static FeedUpdated = new Action<Feed>();

    /**
     * Singleton action that gets triggered when the user updates the feed.
     */
    public static FeedRetentionPolicyUpdated = new Action<IFeedRetentionPolicyUpdatedPayload>();
}
