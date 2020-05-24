import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";

import * as Dialogs from "VSS/Controls/Dialogs";
import { Component, Props, State } from "VSS/Flux/Component";

import { CiConstants } from "Feed/Common/Constants/Constants";
import { ConnectToFeedDialog, IConnectToFeedDialogOptions } from "Package/Scripts/Dialogs/ConnectToFeedDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import * as PackageResources from "Feed/Common/Resources";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/ConnectToFeedButton";

export interface IConnectToFeedButtonProps extends Props {
    feed: Feed;
    feedViews: FeedView[];
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    isCallToAction?: boolean;
    hubAction: HubAction;
    defaultTabId?: string;
}

export class ConnectToFeedButton extends Component<IConnectToFeedButtonProps, State> {
    public render(): JSX.Element {
        return this._getButton();
    }

    private _getButton(): JSX.Element {
        if (this.props.isCallToAction) {
            return (
                <PrimaryButton
                    className="connect-to-feed-button"
                    onClick={() =>
                        OpenConnectToFeedDialog(
                            this.props.feed,
                            this.props.feedViews,
                            this.props.protocolMap,
                            this.props.hubAction,
                            this.props.defaultTabId
                        )
                    }
                >
                    <span className="bowtie-icon bowtie-plug-outline connect-to-feed-button-icon" />
                    {PackageResources.ConnectToFeedButtonText}
                </PrimaryButton>
            );
        } else {
            return (
                <DefaultButton
                    className="connect-to-feed-button"
                    onClick={() =>
                        OpenConnectToFeedDialog(
                            this.props.feed,
                            this.props.feedViews,
                            this.props.protocolMap,
                            this.props.hubAction,
                            this.props.defaultTabId
                        )
                    }
                >
                    <span className="bowtie-icon bowtie-plug-outline connect-to-feed-button-icon" />
                    {PackageResources.ConnectToFeedButtonText}
                </DefaultButton>
            );
        }
    }
}

export function OpenConnectToFeedDialog(
    feed: Feed,
    feedViews: FeedView[],
    protocolMap: IDictionaryStringTo<IPackageProtocol>,
    hubAction: HubAction,
    defaultTabId?: string
): void {
    const defaultProtocolKey = Object.keys(protocolMap)[0];
    CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
        action: CiConstants.ConnectToFeedOpened,
        protocol: defaultProtocolKey,
        context: HubAction[hubAction]
    });
    Dialogs.ModalDialogO.show(ConnectToFeedDialog, {
        feed,
        feedViews,
        protocolDictionary: protocolMap,
        hubAction,
        defaultTabId
    } as IConnectToFeedDialogOptions);

    const element = document.getElementsByClassName("tab-title current")[0] as HTMLElement;
    element.focus();
}
