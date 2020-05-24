import * as React from "react";

import { DefaultButton } from "OfficeFabric/Button";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";

import * as WebContext from "VSS/Context";
import { Component, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { LabelWithExternalLink } from "Package/Scripts/Components/LabelWithExternalLink";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import { CiConstants, FwLinks } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IConnectToFeedProps } from "Package/Scripts/Protocols/Common/IConnectToFeedProps";
import { CopyableTextField, ICopyableTextFieldTelemetry } from "Package/Scripts/Protocols/Components/CopyableTextField";
import { NuGetCiConstants } from "Package/Scripts/Protocols/NuGet/Constants/NuGetConstants";
import { NuGetDataService } from "Package/Scripts/Protocols/NuGet/NuGetDataService";
import * as PackageResources from "Feed/Common/Resources";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/NuGet/NuGetConnectToFeedPanel";

export interface INuGetConnectToFeedPanelProps extends IConnectToFeedProps {
    endpointProvider: EndpointProvider;
    feedViews: FeedView[];
}

export interface INuGetConnectToFeedPanelState extends State {
    isLoading: boolean;
    endpointUrl: string;
    selectedView: FeedView;
}

export class NuGetConnectToFeedPanel extends Component<INuGetConnectToFeedPanelProps, INuGetConnectToFeedPanelState> {
    constructor(props: INuGetConnectToFeedPanelProps) {
        super(props);

        this.state = {
            isLoading: true,
            endpointUrl: null,
            selectedView: props.feed && props.feed.view ? props.feed.view : null
        } as INuGetConnectToFeedPanelState;

        props.endpointProvider.getEndpointUrl(this._getFullyQualifiedFeedName(), "V3").then(endpointUrl => {
            this.setState({
                isLoading: false,
                endpointUrl,
                selectedView: props.feed && props.feed.view ? props.feed.view : null
            } as INuGetConnectToFeedPanelState);
        });

        CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
            Action: CiConstants.ConnectToFeedTabChanged,
            Protocol: NuGetCiConstants.ProtocolName,
            Context: HubAction[this.props.hubAction]
        });
    }

    public render(): JSX.Element {
        const textfieldIds = ["nuget-textfield-label1", "nuget-textfield-label2", "nuget-textfield-label3"];
        const viewOptions: IDropdownOption[] = [];
        viewOptions.push({
            key: PackageResources.FeedViewDropdown_AllViews_Key,
            text: PackageResources.FeedViewDropdown_ConnectToFeed_AllViews_Name
        } as IDropdownOption);

        if (this.props.feedViews) {
            this.props.feedViews.forEach(view => {
                viewOptions.push({
                    key: view.id,
                    text: "@" + view.name
                } as IDropdownOption);
            });
        }

        return (
            <div className="nuget-connect-to-feed-panel connect-to-feed-panel">
                <LoadingContainer isLoading={this.state.isLoading}>
                    {this.state.endpointUrl ? (
                        <div>
                            <div className="connect-to-feed-section">
                                <div className="connect-to-feed-section-title">
                                    {PackageResources.NuGetConnectControl_VSHeadingText}
                                </div>
                                <div className="connect-to-feed-views-dropdown">
                                    <LabelWithExternalLink
                                        labelText={PackageResources.FeedViewDropdown_ConnectToFeed_Label}
                                        linkText={PackageResources.FeedViewDropdown_ConnectToFeed_Label_Link}
                                        href={FwLinks.ConnectToFeedViewWhatsThis}
                                        ciContext={NuGetCiConstants.NuGetConnectToFeedPanel}
                                    />
                                    <Dropdown
                                        className="views-dropdown"
                                        ariaLabel={PackageResources.FeedViewDropdown_ConnectToFeed_Label}
                                        options={viewOptions}
                                        onChanged={option => this._onViewDropdownChanged(option)}
                                        defaultSelectedKey={
                                            this.state.selectedView
                                                ? this.state.selectedView.id
                                                : PackageResources.FeedViewDropdown_AllViews_Key
                                        }
                                    />
                                </div>
                                <div className="connect-to-feed-textfield-container">
                                    <div className="connect-to-feed-sub-heading" id={textfieldIds[0]}>
                                        {PackageResources.NuGetConnectControl_PackageSourceText}
                                    </div>
                                    <CopyableTextField
                                        text={this.state.endpointUrl}
                                        buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_Source_Copy}
                                        textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_Source}
                                        telemetryProperties={
                                            {
                                                commandName: CiConstants.CopyCommandFeedURL,
                                                feedName: this.props.feed.name,
                                                protocol: NuGetCiConstants.ProtocolName
                                            } as ICopyableTextFieldTelemetry
                                        }
                                        ariaDescribedByIdForLabelText={textfieldIds[0]}
                                    />
                                </div>
                                <ExternalLink
                                    className="connect-to-feed-link"
                                    href={PackageResources.NuGetConnectControl_SetupVisualStudioLink}
                                    ciContext={NuGetCiConstants.NuGetConnectToFeedPanel}
                                >
                                    {PackageResources.NuGetConnectControl_SetupVisualStudioLinkText}
                                </ExternalLink>
                            </div>
                            <div className="connect-to-feed-section">
                                <div className="connect-to-feed-section-title">
                                    {PackageResources.NuGetConnectControl_NuGetExeHeadingText}
                                </div>
                                <div className="connect-to-feed-sub-heading">
                                    {PackageResources.NuGetConnectControl_GetToolsText}
                                </div>
                                <DefaultButton
                                    className="nuget-tools-link"
                                    onClick={() => this._onDownloadBundleClick()}
                                >
                                    <span className="bowtie-icon bowtie-transfer-download" />
                                    <span className="connect-to-feed-link-text">
                                        {WebContext.getPageContext().webAccessConfiguration.isHosted
                                            ? PackageResources.NuGetConnectControl_CredentialProviderDownloadLinkText
                                            : PackageResources.NuGetConnectControl_NuGetDownloadLinkText}
                                    </span>
                                </DefaultButton>
                                <div className="connect-to-feed-sub-heading" id={textfieldIds[1]}>
                                    {PackageResources.NuGetConnectControl_AddFeedText}
                                </div>
                                <CopyableTextField
                                    text={Utils_String.format(
                                        PackageResources.NuGetConnectControl_NuGetSourceCommand,
                                        this._getFullyQualifiedFeedName(),
                                        this.state.endpointUrl
                                    )}
                                    buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_AddSource_Copy}
                                    textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_AddSource}
                                    telemetryProperties={
                                        {
                                            commandName: CiConstants.CopyCommandAddSource,
                                            feedName: this.props.feed.name,
                                            protocol: NuGetCiConstants.ProtocolName
                                        } as ICopyableTextFieldTelemetry
                                    }
                                    ariaDescribedByIdForLabelText={textfieldIds[1]}
                                />
                                {!this.state.selectedView && (
                                    <div>
                                        <div className="connect-to-feed-sub-heading" id={textfieldIds[2]}>
                                            {PackageResources.NuGetConnectControl_PushPackageText}
                                        </div>
                                        <CopyableTextField
                                            text={Utils_String.format(
                                                PackageResources.NuGetConnectControl_NuGetPushCommand,
                                                this.props.feed.name
                                            )}
                                            buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_Push_Copy}
                                            textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_Push}
                                            telemetryProperties={
                                                {
                                                    commandName: CiConstants.CopyCommandPush,
                                                    feedName: this.props.feed.name,
                                                    protocol: NuGetCiConstants.ProtocolName
                                                } as ICopyableTextFieldTelemetry
                                            }
                                            ariaDescribedByIdForLabelText={textfieldIds[2]}
                                        />
                                    </div>
                                )}
                                <ExternalLink
                                    className="connect-to-feed-link"
                                    href={PackageResources.NuGetConnectControl_NuGet2xDocLink}
                                    ciContext={NuGetCiConstants.NuGetConnectToFeedPanel}
                                >
                                    {PackageResources.NuGetConnectControl_NuGet2xDocLinkText}
                                </ExternalLink>
                                <ExternalLink
                                    className="connect-to-feed-link"
                                    href={PackageResources.NuGetConnectControl_AuthTroubleDocLink}
                                    ciContext={NuGetCiConstants.NuGetConnectToFeedPanel}
                                >
                                    {PackageResources.NuGetConnectControl_AuthTroubleDocLinkText}
                                </ExternalLink>
                            </div>
                        </div>
                    ) : (
                        <PackageMessagePanel message={PackageResources.ConnectControl_EndpointNotAvailable} />
                    )}
                </LoadingContainer>
            </div>
        );
    }

    private _onViewDropdownChanged(option: IDropdownOption) {
        if (option.key === PackageResources.FeedViewDropdown_AllViews_Key) {
            this.props.endpointProvider.getEndpointUrl(this.props.feed.name, "V3").then(endpointUrl => {
                this.setState({
                    isLoading: false,
                    endpointUrl,
                    selectedView: null
                } as INuGetConnectToFeedPanelState);
            });
        } else {
            const feedName = this.props.feed.name + option.text;
            this.props.endpointProvider.getEndpointUrl(feedName, "V3").then(endpointUrl => {
                this.setState({
                    isLoading: false,
                    endpointUrl,
                    selectedView: {
                        id: option.key,
                        name: option.text,
                        _links: null,
                        url: null,
                        type: null
                    } as FeedView
                } as INuGetConnectToFeedPanelState);
            });
        }
    }

    private _getFullyQualifiedFeedName(): string {
        if (this.state.selectedView) {
            return (
                this.props.feed.name +
                (this.state.selectedView.name.indexOf("@") === -1 ? "@" : "") +
                this.state.selectedView.name
            );
        }
        return this.props.feed.name;
    }

    private async _onDownloadBundleClick(): Promise<void> {
        // Check whether the environment is hosted or on-premises
        if (WebContext.getPageContext().webAccessConfiguration.isHosted) {
            CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
                Action: NuGetCiConstants.DownloadCredentialBundleClicked,
                Protocol: NuGetCiConstants.ProtocolName,
                Context: HubAction[this.props.hubAction]
            });
            const nuGetDataService = Service.getLocalService(NuGetDataService);
            try {
                const downloadLink = await nuGetDataService.getDownloadUrl(
                    PackageResources.NuGetConnectControl_CredentialProviderFileName
                );
                window.location.href = downloadLink;
            } catch {
                // swallow the exception
            }
        } else {
            window.location.href = PackageResources.NuGetConnectControl_OnPremDownloadLink;
        }
    }
}
