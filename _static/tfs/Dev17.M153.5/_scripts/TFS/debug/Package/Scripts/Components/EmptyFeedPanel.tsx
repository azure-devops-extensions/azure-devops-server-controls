import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { ConnectToFeedButton } from "Package/Scripts/Components/ConnectToFeedButton";
import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as UrlHelper from "Package/Scripts/Helpers/UrlHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/EmptyFeedPanel";

import { CiConstants } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

export interface IEmptyFeedPanelProps extends Props {
    feed: Feed;
    feedViews: FeedView[];
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
}

export class EmptyFeedPanel extends Component<IEmptyFeedPanelProps, State> {
    public render(): JSX.Element {
        const imagePath = UrlHelper.getVersionedContentUrl("zerodata-connect-to-feed.svg");

        return (
            <div className="empty-feed-panel">
                <img className="empty-feed-panel-image" src={imagePath} alt={""} />
                <div className="empty-feed-panel-text">{PackageResources.EmptyFeedPanel_Message}</div>
                <ConnectToFeedButton
                    feed={this.props.feed}
                    feedViews={this.props.feedViews}
                    protocolMap={this.props.protocolMap}
                    isCallToAction={true}
                    hubAction={HubAction.Feed}
                />
                <ExternalLink
                    href={PackageResources.EmptyFeedPanel_PackageManagementLearnMoreLink}
                    className="empty-feed-panel-link-text"
                    ciContext={CiConstants.EmptyFeedPanel}
                    onClick={() => CustomerIntelligenceHelper.publishEvent(CiConstants.EmptyFeedLearnMoreLinkClicked)}
                >
                    {Utils_String.format(
                        PackageResources.EmptyFeedPanel_PackageManagementLearnMoreLinkText,
                        PackageResources.AzureArtifacts
                    )}
                </ExternalLink>
            </div>
        );
    }
}
