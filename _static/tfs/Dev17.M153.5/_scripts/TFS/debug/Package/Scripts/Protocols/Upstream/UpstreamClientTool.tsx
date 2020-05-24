import * as React from "react";

import { IPackageProtocolClient } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { UpstreamConnectToFeedPanel } from "Package/Scripts/Protocols/Upstream/UpstreamConnectToFeedPanel";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { BowtieIconProps } from "Feed/Common/Utils/Icons";

export class UpstreamClientTool implements IPackageProtocolClient {
    public readonly name = PackageResources.Upstream_this_feed;
    public readonly vssIconProps = new BowtieIconProps("brand-visualstudio");

    public getConnectPanel(feed: Feed, feedViews: FeedView[], hubAction: HubAction): JSX.Element {
        return <UpstreamConnectToFeedPanel feed={feed} feedViews={feedViews} hubAction={hubAction} />;
    }
}
