import * as React from "react";

import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IPackageProtocolClient } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import {
    GradleConnectToFeedPanel,
    IGradleConnectToFeedPanelProps
} from "Package/Scripts/Protocols/Maven/GradleConnectToFeedPanel";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { BowtieIconProps } from "Feed/Common/Utils/Icons";

export class GradleClientTool implements IPackageProtocolClient {
    public readonly name = "Gradle";
    public readonly vssIconProps = new BowtieIconProps("brand-gradle");

    private _endpointProvider: EndpointProvider;

    constructor(endpointProvider: EndpointProvider) {
        this._endpointProvider = endpointProvider;
    }

    public getConnectPanel(feed: Feed, feedViews: FeedView[], hubAction: HubAction): JSX.Element {
        return React.createElement(GradleConnectToFeedPanel, {
            feed,
            endpointProvider: this._endpointProvider,
            hubAction
        } as IGradleConnectToFeedPanelProps);
    }
}
