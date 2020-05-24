import * as React from "react";

import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IPackageProtocolClient } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import {
    INpmConnectToFeedPanelProps,
    NpmConnectToFeedPanel
} from "Package/Scripts/Protocols/Npm/NpmConnectToFeedPanel";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class NpmClientTool implements IPackageProtocolClient {
    public readonly name = NpmKey;

    private _endpointProvider: EndpointProvider;

    constructor(endpointProvider: EndpointProvider) {
        this._endpointProvider = endpointProvider;
    }

    public getConnectPanel(feed: Feed, feedViews: FeedView[], hubAction: HubAction): JSX.Element {
        return React.createElement(NpmConnectToFeedPanel, {
            feed,
            feedViews,
            endpointProvider: this._endpointProvider,
            hubAction
        } as INpmConnectToFeedPanelProps);
    }
}
