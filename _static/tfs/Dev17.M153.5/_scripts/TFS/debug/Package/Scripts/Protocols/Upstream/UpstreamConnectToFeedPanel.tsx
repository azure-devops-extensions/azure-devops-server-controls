import * as React from "react";
import * as Utils_String from "VSS/Utils/String";

import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { Component, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { LabelWithExternalLink } from "Package/Scripts/Components/LabelWithExternalLink";
import { CiConstants, FwLinks } from "Feed/Common/Constants/Constants";
import * as OrganizationHelper from "Package/Scripts/Helpers/OrganizationHelper";
import { IConnectToFeedProps } from "Package/Scripts/Protocols/Common/IConnectToFeedProps";
import { CopyableTextField } from "Package/Scripts/Protocols/Components/CopyableTextField";
import { UpstreamCiConstants } from "Package/Scripts/Protocols/Upstream/Constants/UpstreamConstants";
import * as PackageResources from "Feed/Common/Resources";
import { FeedView, FeedVisibility, FeedPermission, FeedRole } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Upstream/UpstreamConnectToFeedPanel";

export interface IUpstreamConnectToFeedProps extends IConnectToFeedProps {
    /**
     * the currently selected feed's views
     */
    feedViews: FeedView[];
}

export interface IUpstreamConnectToFeedPanelState extends State {
    /**
     * the selected view in the dropdown
     */
    selectedView: FeedView;
}

export class UpstreamConnectToFeedPanel extends Component<IUpstreamConnectToFeedProps, IUpstreamConnectToFeedPanelState> {
    private _collectionContext: HostContext;

    constructor(props: IUpstreamConnectToFeedProps) {
        super(props);

        this.state = {
            selectedView:
                this.props.feed.view || // Feed has a view selected
                (this.props.feedViews && this.props.feedViews.length > 0 ? this.props.feedViews[0] : undefined)
        };

        this._collectionContext = Service.VssConnection.getConnection().getWebContext().collection;
    }

    public render(): JSX.Element {
        let viewOptions: IDropdownOption[] = [];

        if (this.props.feedViews) {
            viewOptions = this.props.feedViews.map(view => ({
                key: view.id,
                text: "@" + view.name,
                data: view
            }));
        }

        return (
            <div className="connect-to-feed-panel upstream-connect-to-feed-panel">
                <div className="connect-to-feed-section">
                    <div className="connect-to-feed-section-title">
                        {PackageResources.UpstreamConnectControl_AddFeedAsUpstreamSource}
                    </div>
                    {this._getContent(viewOptions)}
                </div>
            </div>
        );
    }

    private _getContent(viewOptions: IDropdownOption[]): JSX.Element {
        if (!viewOptions || viewOptions.length === 0) {
            return <Label>{PackageResources.FeedSettings_Views_NoViews}</Label>;
        }

        return (
            <div>
                <div className="connect-to-feed-views-dropdown">
                    <LabelWithExternalLink
                        labelText={PackageResources.FeedViewDropdown_ConnectToFeed_Label}
                        linkText={PackageResources.FeedViewDropdown_ConnectToFeed_Label_Link}
                        href={FwLinks.ConnectToFeedViewWhatsThis}
                        ciContext={UpstreamCiConstants.UpstreamConnectToFeedPanel}
                    />
                    <Dropdown
                        className="views-dropdown"
                        ariaLabel={PackageResources.FeedViewDropdown_ConnectToFeed_Label}
                        options={viewOptions}
                        onChanged={option => this.setState({ selectedView: option.data })}
                        selectedKey={this.state.selectedView.id}
                    />
                </div>
                <div className="connect-to-feed-locator-textfield">
                    <Label className={"label"}>{PackageResources.UpstreamConnectControl_AddUpstreamUsingLocator}</Label>
                    <CopyableTextField
                        text={OrganizationHelper.getUpstreamLocator(
                            this._collectionContext.name,
                            this.props.feed.name,
                            this.state.selectedView.name
                        )}
                        telemetryProperties={{
                            commandName: CiConstants.CopyCommandInternalUpstreamLocator,
                            feedName: this.props.feed.name,
                            protocol: UpstreamCiConstants.ProtocolName
                        }}
                        buttonAriaLabel={PackageResources.UpstreamConnectControl_CopyInternalUpstreamLocatorAriaLabel}
                        textFieldAriaLabel={
                            PackageResources.UpstreamConnectControl_CopyInternalUpstreamLocatorTextFieldAriaLabel
                        }
                    />
                    <ExternalLink
                        className="connect-to-feed-link"
                        href={FwLinks.ConnectToFeedUpstreamSourcesWhatsThis}
                        ciContext={UpstreamCiConstants.UpstreamConnectToFeedPanel}
                    >
                        {PackageResources.UpstreamConnectControl_WhatAreUpstreamSources}
                    </ExternalLink>
                </div>
                { this.state.selectedView.visibility === FeedVisibility.Private && (
                        <MessageBar
                            messageBarType={MessageBarType.severeWarning}
                            actions={<div />} /* Workaround for office fabric bug */
                        isMultiline={false}>
                        <span>{Utils_String.format(PackageResources.UpstreamConnectControl_ViewNotSharedWithEnterprise,
                            this.props.feed.name,
                            this.state.selectedView.name,
                            PackageResources.UpstreamConnectControl_FeedOwner)}</span>
                        </MessageBar>
                    )}
            </div>
        );
    }
}
