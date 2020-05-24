import * as React from "react";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/PackageUpstreamLocatorCommand";
import { Component, Props, State } from "VSS/Flux/Component";
import { Collection } from "VSS/Organization/Contracts";
import { OrganizationHttpClient } from "VSS/Organization/RestClient";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { CiConstants, FwLinks } from "Feed/Common/Constants/Constants";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import * as OrganizationHelper from "Package/Scripts/Helpers/OrganizationHelper";
import { getClientForCollection } from "Package/Scripts/Helpers/OrganizationHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { CopyableTextField } from "Package/Scripts/Protocols/Components/CopyableTextField";
import * as PackageResources from "Feed/Common/Resources";
import { MinimalPackageVersion } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Feed, FeedView, UpstreamSource, UpstreamSourceType } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { FeedHttpClient } from "Package/Scripts/WebApi/VSS.Feed.CustomWebApi";

export interface IPackageUpstreamLocatorCommandProps extends Props {
    /**
     * the currently selected feed
     */
    feed: Feed;

    /**
     * the currently selected packageVersion
     */
    packageVersion: MinimalPackageVersion;

    /**
     * the currently selected protocol
     */
    protocol: IPackageProtocol;
}

export interface IPackageUpstreamLocatorCommandState extends State {
    /**
     * the locator string that will be displayed on the text field
     */
    locator: string;
}

export class PackageUpstreamLocatorCommand extends Component<
    IPackageUpstreamLocatorCommandProps,
    IPackageUpstreamLocatorCommandState
> {
    private _collectionContext: HostContext;
    private _organizationClient: OrganizationHttpClient;
    private _organizationCollections: Collection[];
    private _feedsDataService: FeedsDataService;
    private _webPageDataService: HubWebPageDataService;

    constructor(props: IPackageUpstreamLocatorCommandProps) {
        super(props);

        this.state = {
            locator: Utils_String.empty
        };

        this._collectionContext = Service.VssConnection.getConnection().getWebContext().collection;
        this._organizationClient = Service.getClient<OrganizationHttpClient>(OrganizationHttpClient);
        this._feedsDataService = Service.getLocalService(FeedsDataService);
        this._webPageDataService = Service.getLocalService(HubWebPageDataService);
    }

    public componentDidMount(): void {
        this._getLocatorAsync().then(
            locator => {
                this.setState({
                    locator
                });
            },
            error => {
                // Most likely the org token was null or incorrect
                // Since locator is not set, the component won't render
            }
        );
    }

    public render(): JSX.Element {
        if (this._webPageDataService.isOrganizationUpstreamsEnabled() === false) {
            return null;
        }

        return (
            this.state.locator !== Utils_String.empty && (
                <div className="package-upstream-locator-command">
                    <FormatComponent
                        // fmt: "Already connected to another feed? Copy this feed locator and add an {0} to your feed, then run the install command above. {1}"
                        // {0}: "upstream source"
                        // {1}: "Here's how"
                        format={PackageResources.UpstreamLocatorCommand_Description}
                    >
                        <span className="italic-text">{PackageResources.upstream_source}</span>
                        <ExternalLink href={FwLinks.UpstreamLocatorCommandHeresHow}>
                            {PackageResources.Heres_how}
                        </ExternalLink>
                    </FormatComponent>

                    <div className="locator-text-field">
                        <CopyableTextField
                            text={this.state.locator}
                            buttonAriaLabel={PackageResources.Copy_upstream_source_locator}
                            textFieldAriaLabel={PackageResources.Upstream_source_locator}
                            telemetryProperties={{
                                commandName: CiConstants.PackageUpstreamLocatorCommand,
                                feedName: this.props.feed.name,
                                packageName: this.props.packageVersion.id,
                                packageVersion: this.props.packageVersion.version,
                                protocol: this.props.protocol.name
                            }}
                        />
                    </div>
                </div>
            )
        );
    }

    private async _getLocatorAsync(): Promise<string> {
        // Local package
        if (!this.props.packageVersion.directUpstreamSourceId) {
            return OrganizationHelper.getUpstreamLocator(
                this._collectionContext.name,
                this.props.feed.name,
                this.props.feed.view ? this.props.feed.view.name : "Local"
            );
        }

        const upstreamSourceIndex = this.props.feed.upstreamSources.findIndex(
            s => s.id === this.props.packageVersion.directUpstreamSourceId
        );
        if (upstreamSourceIndex >= 0) {
            const upstreamSource = this.props.feed.upstreamSources[upstreamSourceIndex];
            switch (upstreamSource.upstreamSourceType) {
                case UpstreamSourceType.Public:
                    return upstreamSource.location;
                case UpstreamSourceType.Internal:
                    const collectionName = await this._getUpstreamCollectionNameAsync(upstreamSource);
                    const feedName = (await this._getUpstreamCollectionFeedAsync(upstreamSource)).name;
                    const viewName = (await this._getUpstreamCollectionViewAsync(upstreamSource)).name;
                    return OrganizationHelper.getUpstreamLocator(collectionName, feedName, viewName);
            }
        }

        // We couldn't find a locator
        return Utils_String.empty;
    }

    private async _getUpstreamCollectionNameAsync(source: UpstreamSource): Promise<string> {
        const collectionId = source.internalUpstreamCollectionId;

        if (collectionId === this._collectionContext.id) {
            return this._collectionContext.name;
        }

        if (!this._organizationCollections) {
            this._organizationCollections = (await this._organizationClient.getOrganization("me")).collections;
        }

        for (const collection of this._organizationCollections) {
            if (collection.id === collectionId) {
                return collection.name;
            }
        }

        return source.internalUpstreamCollectionId;
    }

    private async _getUpstreamCollectionFeedAsync(source: UpstreamSource): Promise<Feed> {
        const collectionId = source.internalUpstreamCollectionId;
        const feedId = source.internalUpstreamFeedId;

        if (collectionId === this._collectionContext.id) {
            return this._feedsDataService.getFeed(feedId);
        }

        const externalCollectionClient = await getClientForCollection(collectionId, FeedHttpClient);
        return externalCollectionClient.getFeed(feedId);
    }

    private async _getUpstreamCollectionViewAsync(source: UpstreamSource): Promise<FeedView> {
        const collectionId = source.internalUpstreamCollectionId;
        const feedId = source.internalUpstreamFeedId;
        const viewId = source.internalUpstreamViewId;

        if (collectionId === this._collectionContext.id) {
            return this._feedsDataService.getFeedViewAsync(feedId, viewId);
        }

        const externalCollectionClient = await getClientForCollection(collectionId, FeedHttpClient);
        return externalCollectionClient.getFeedView(feedId, viewId);
    }
}
