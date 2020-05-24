import * as React from "react";

import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IPackageProtocolClient } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import {
    IMavenConnectToFeedPanelProps,
    MavenConnectToFeedPanel
} from "Package/Scripts/Protocols/Maven/MavenConnectToFeedPanel";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class MavenClientTool implements IPackageProtocolClient {
    public readonly name = "Maven";

    private _endpointProvider: EndpointProvider;

    constructor(endpointProvider: EndpointProvider) {
        this._endpointProvider = endpointProvider;
    }

    public getConnectPanel(feed: Feed, feedViews: FeedView[], hubAction: HubAction): JSX.Element {
        return React.createElement(MavenConnectToFeedPanel, {
            feed,
            endpointProvider: this._endpointProvider,
            hubAction
        } as IMavenConnectToFeedPanelProps);
    }
}
