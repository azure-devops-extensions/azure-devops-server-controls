import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { MessageState } from "Feed/Common/Types/IFeedMessage";

export class PackageGridMessages {
    public static getMessageForFeed(feed: Feed, packages: Package[], filterText: string): MessageState {
        if (packages != null && packages.length > 0) {
            return MessageState.None;
        }

        if (filterText != null) {
            return MessageState.EmptyFilter;
        }

        // View selected
        if (feed.view != null) {
            return MessageState.EmptyView;
        }

        // Upstream source set to cache
        if (feed.upstreamEnabled === true && feed.upstreamSource != null && feed.upstreamSource.id != null) {
            return MessageState.EmptyCache;
        }

        return MessageState.EmptyFeed;
    }

    public static getMessageForRecyclebin(feed: Feed, packages: Package[], filterText: string): MessageState {
        if (packages != null && packages.length > 0) {
            return MessageState.None;
        }

        if (filterText != null) {
            return MessageState.EmptyFilter;
        }

        return MessageState.None;
    }
}
