import * as React from "react";

import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IPackageProtocolClient } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import {
    INuGetConnectToFeedPanelProps,
    NuGetConnectToFeedPanel
} from "Package/Scripts/Protocols/NuGet/NuGetConnectToFeedPanel";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class NuGetClientTool implements IPackageProtocolClient {
    public readonly name = "NuGet";

    private _endpointProvider: EndpointProvider;

    constructor(endpointProvider: EndpointProvider) {
        this._endpointProvider = endpointProvider;
    }

    public getConnectPanel(feed: Feed, feedViews: FeedView[], hubAction: HubAction): JSX.Element {
        return React.createElement(NuGetConnectToFeedPanel, {
            feed,
            endpointProvider: this._endpointProvider,
            feedViews,
            hubAction
        } as INuGetConnectToFeedPanelProps);
    }
}
