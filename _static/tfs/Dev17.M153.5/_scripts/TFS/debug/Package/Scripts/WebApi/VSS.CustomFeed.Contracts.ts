import { WebPageConstants } from "Package/Scripts/Types/WebPage.Contracts";
import * as VSS_Feed_Contracts from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";

export interface Feed extends VSS_Feed_Contracts.Feed {
    upstreamSource: VSS_Feed_Contracts.UpstreamSource;
    retentionPolicy?: VSS_Feed_Contracts.FeedRetentionPolicy;
}

export interface MinimalPackageVersion extends VSS_Feed_Contracts.MinimalPackageVersion {
    index?: number;
}

export let UpstreamSource_All : VSS_Feed_Contracts.UpstreamSource = {
    id: null,
    location: "",
    name: PackageResources.UpstreamSourceKey_All,
    protocol: "any",
    deletedDate: null,
    upstreamSourceType: null,
    internalUpstreamCollectionId: null,
    internalUpstreamFeedId: null,
    internalUpstreamViewId: null,
    isCustom: null
};

export let UpstreamSource_Local : VSS_Feed_Contracts.UpstreamSource = {
    id: WebPageConstants.DirectUpstreamSourceIdForThisFeedFilter,
    location: "",
    name: PackageResources.UpstreamSourceKey_Local,
    protocol: "any",
    deletedDate: null,
    upstreamSourceType: null,
    internalUpstreamCollectionId: null,
    internalUpstreamFeedId: null,
    internalUpstreamViewId: null
};

export interface ExtendedUpstreamSource extends VSS_Feed_Contracts.UpstreamSource {
    isCustom?: boolean;
}
