import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedCapabilities } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export function isV2Feed(feed: Feed): boolean {
    if (!feed || !feed.capabilities) {
        return false;
    }

    // tslint:disable-next-line:no-bitwise
    const capability: number = feed.capabilities & FeedCapabilities.UpstreamV2;
    return capability === FeedCapabilities.UpstreamV2;
}

export function isFeedUnderMaintenance(feed: Feed): boolean {
    if (!feed || !feed.capabilities) {
        return false;
    }

    // tslint:disable-next-line:no-bitwise
    const capability: number = feed.capabilities & FeedCapabilities.UnderMaintenance;
    return capability === FeedCapabilities.UnderMaintenance;
}
