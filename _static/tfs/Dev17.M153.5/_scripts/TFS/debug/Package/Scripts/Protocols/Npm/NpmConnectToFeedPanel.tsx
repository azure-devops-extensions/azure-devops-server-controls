import * as React from "react";

import { DefaultButton } from "OfficeFabric/Button";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";

import * as WebContext from "VSS/Context";
import { Component, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_File from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Url from "VSS/Utils/Url";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { LabelWithExternalLink } from "Package/Scripts/Components/LabelWithExternalLink";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import { CiConstants, FwLinks } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IConnectToFeedProps } from "Package/Scripts/Protocols/Common/IConnectToFeedProps";
import { CopyableTextField, ICopyableTextFieldTelemetry } from "Package/Scripts/Protocols/Components/CopyableTextField";
import { NpmCiConstants } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { FeedTokenHttpClient } from "Package/Scripts/WebApi/VSS.FeedToken.WebApi";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Npm/NpmConnectToFeedPanel";

import * as PackageResources from "Feed/Common/Resources";
import { DateHelper } from "Feed/Common/Utils/Date";

export interface INpmConnectToFeedPanelProps extends IConnectToFeedProps {
    endpointProvider: EndpointProvider;
    feedViews: FeedView[];
}

export interface INpmConnectToFeedPanelState extends State {
    isLoading: boolean;
    registryUrl: string;
    legacyRegistryUrl?: string;
    authTokenCommand?: string;
    isAuthTokenLoading?: boolean;
}

export class NpmConnectToFeedPanel extends Component<INpmConnectToFeedPanelProps, INpmConnectToFeedPanelState> {
    private _generatedCredentials: CopyableTextField;
    private _showLegacyAuthTokens: boolean;

    constructor(props: INpmConnectToFeedPanelProps) {
        super(props);

        this.state = {
            isLoading: true,
            registryUrl: null
        } as INpmConnectToFeedPanelState;

        const registryPromise = props.endpointProvider.getEndpointUrl(this._getFullyQualifiedFeedName(), "registry");

        this._showLegacyAuthTokens = props.endpointProvider.containsEndpoint("legacyRegistry");
        if (this._showLegacyAuthTokens) {
            const legacyRegistryPromise = props.endpointProvider.getEndpointUrl(this._getFullyQualifiedFeedName(), "legacyRegistry");
            Promise.all([registryPromise, legacyRegistryPromise]).then((values: [string, string]) => {
                this.setState({
                    registryUrl: values[0],
                    legacyRegistryUrl: values[1],
                    isLoading: false
                })
            })
        } else {
            registryPromise.then((registryUrl: string) => {
                this.setState({ registryUrl, isLoading: false });
            });
        }

        CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
            Action: CiConstants.ConnectToFeedTabChanged,
            Protocol: NpmCiConstants.ProtocolName,
            Context: HubAction[this.props.hubAction]
        });
    }

    public render(): JSX.Element {
        const textfieldIds = ["npm-textfield-label1", "npm-textfield-label2", "npm-textfield-label3"];
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

        const isHosted = WebContext.getPageContext().webAccessConfiguration.isHosted;

        return (
            <div className="npm-connect-to-feed-panel connect-to-feed-panel">
                <LoadingContainer isLoading={this.state.isLoading} cssClass="custom-padding">
                    {this.state.registryUrl ? (
                        <div className="connect-to-feed-section">
                            <div className="connect-to-feed-section-title">
                                {PackageResources.NpmConnectControl_HeadingText}
                            </div>
                            <div className="connect-to-feed-views-dropdown">
                                <LabelWithExternalLink
                                    labelText={PackageResources.FeedViewDropdown_ConnectToFeed_Label}
                                    linkText={PackageResources.FeedViewDropdown_ConnectToFeed_Label_Link}
                                    href={FwLinks.ConnectToFeedViewWhatsThis}
                                    ciContext={NpmCiConstants.NpmConnectToFeedPanel}
                                />
                                <Dropdown
                                    className="views-dropdown"
                                    ariaLabel={PackageResources.FeedViewDropdown_ConnectToFeed_Label}
                                    options={viewOptions}
                                    onChanged={option => this._onViewDropdownChanged(option)}
                                    defaultSelectedKey={
                                        this.props.feed.view
                                            ? this.props.feed.view.id
                                            : PackageResources.FeedViewDropdown_AllViews_Key
                                    }
                                />
                            </div>
                            <div className="connect-to-feed-textfield-container">
                                <div className="connect-to-feed-sub-heading" id={textfieldIds[0]}>
                                    {PackageResources.NpmConnectControl_NpmrcProjectSubHeading}
                                </div>
                                <CopyableTextField
                                    text={
                                        "registry=" + this.state.registryUrl + Utils_String.newLine + "always-auth=true"
                                    }
                                    buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Npm_ProjectNpmrc_Copy}
                                    textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Npm_ProjectNpmrc}
                                    telemetryProperties={
                                        {
                                            commandName: CiConstants.CopyCommandAddSource,
                                            feedName: this.props.feed.name,
                                            protocol: NpmCiConstants.ProtocolName
                                        } as ICopyableTextFieldTelemetry
                                    }
                                    ariaDescribedByIdForLabelText={textfieldIds[0]}
                                />
                            </div>
                            {isHosted && (
                                <div>
                                    <div className="connect-to-feed-sub-heading" id={textfieldIds[1]}>
                                        <span className="connect-to-feed-sub-heading-bold">
                                            {PackageResources.NpmConnectControl_WindowsUsers}
                                        </span>
                                        <span>{PackageResources.NpmConnectControl_AuthHelperSubHeading}</span>
                                    </div>
                                    <CopyableTextField
                                        text={PackageResources.NpmConnectControl_NpmInstallAuthHelperCommand}
                                        buttonAriaLabel={
                                            PackageResources.AriaLabel_CopyToClipBoard_Npm_InstallAuthHelper_Copy
                                        }
                                        textFieldAriaLabel={
                                            PackageResources.AriaLabel_CopyToClipBoard_Npm_InstallAuthHelper
                                        }
                                        telemetryProperties={
                                            {
                                                commandName: NpmCiConstants.CopyCommandInstallAuth,
                                                feedName: this.props.feed.name,
                                                protocol: NpmCiConstants.ProtocolName
                                            } as ICopyableTextFieldTelemetry
                                        }
                                        ariaDescribedByIdForLabelText={textfieldIds[1]}
                                    />
                                    <CopyableTextField
                                        text={PackageResources.NpmConnectControl_AuthHelperCommand}
                                        buttonAriaLabel={
                                            PackageResources.AriaLabel_CopyToClipBoard_Npm_RunAuthHelper_Copy
                                        }
                                        textFieldAriaLabel={
                                            PackageResources.AriaLabel_CopyToClipBoard_Npm_RunAuthHelper
                                        }
                                        telemetryProperties={
                                            {
                                                commandName: NpmCiConstants.CopyCommandRunAuth,
                                                feedName: this.props.feed.name,
                                                protocol: NpmCiConstants.ProtocolName
                                            } as ICopyableTextFieldTelemetry
                                        }
                                        ariaDescribedByIdForLabelText={textfieldIds[1]}
                                    />
                                </div>
                            )}
                            <div className="connect-to-feed-sub-heading">
                                {isHosted && (
                                    <span className="connect-to-feed-sub-heading-bold">
                                        {PackageResources.NpmConnectControl_MacLinuxUsers}
                                    </span>
                                )}
                                <span id={textfieldIds[2]}>
                                    {PackageResources.NpmConnectControl_AddCredentialsManually}
                                </span>
                            </div>
                            <LoadingContainer isLoading={this.state.isAuthTokenLoading}>
                                {this.state.authTokenCommand ? (
                                    <div>
                                        <CopyableTextField
                                            ref={self => (this._generatedCredentials = self)}
                                            text={this.state.authTokenCommand}
                                            buttonAriaLabel={
                                                PackageResources.AriaLabel_CopyToClipBoard_Npm_ManualCredentials_Copy
                                            }
                                            textFieldAriaLabel={
                                                PackageResources.AriaLabel_CopyToClipBoard_Npm_ManualCredentials
                                            }
                                            telemetryProperties={
                                                {
                                                    commandName: CiConstants.CopyCommandAuthToken,
                                                    feedName: this.props.feed.name,
                                                    protocol: NpmCiConstants.ProtocolName
                                                } as ICopyableTextFieldTelemetry
                                            }
                                            ariaDescribedByIdForLabelText={textfieldIds[2]}
                                        />
                                        <span className="warning-text">{PackageResources.Npm_WarningText_Head}</span>
                                        <ExternalLink
                                            className="warning-text-link"
                                            href="https://go.microsoft.com/fwlink/?LinkId=724423"
                                            ciContext={NpmCiConstants.NpmConnectToFeedPanel}
                                        >
                                            {"npmrc"}
                                        </ExternalLink>
                                        <span className="warning-text">{PackageResources.Npm_WarningText_Body}</span>
                                    </div>
                                ) : (
                                    <DefaultButton
                                        className="npm-credentials-link"
                                        onClick={() => this._onGenerateCredentialsClick()}
                                    >
                                        <span className="bowtie-icon bowtie-security-access" />
                                        <span className="connect-to-feed-link-text">
                                            {PackageResources.NpmConnectControl_GenerateCredentialsText}
                                        </span>
                                    </DefaultButton>
                                )}
                            </LoadingContainer>
                            <ExternalLink
                                className="connect-to-feed-link"
                                ciContext={NpmCiConstants.NpmConnectToFeedPanel}
                                href={PackageResources.NpmConnectControl_NpmrcDocLink}
                            >
                                {PackageResources.NpmConnectControl_NpmrcDocLinkText}
                            </ExternalLink>
                        </div>
                    ) : (
                        <PackageMessagePanel message={PackageResources.ConnectControl_EndpointNotAvailable} />
                    )}
                </LoadingContainer>
            </div>
        );
    }

    private _onViewDropdownChanged(option: IDropdownOption) {
        const registryPromise = this._getRegistryPromise(option, "registry");

        if (this._showLegacyAuthTokens) {
            const legacyRegistryPromise = this._getRegistryPromise(option, "legacyRegistry");
            Promise.all([registryPromise, legacyRegistryPromise]).then((values: [string, string]) => {
                this.setState({
                    registryUrl: values[0],
                    legacyRegistryUrl: values[1],
                    isLoading: false
                })
            })
        } else {
            registryPromise.then((registryUrl: string) => {
                this.setState({ registryUrl, authTokenCommand: null });
            });
        }
    }

    private _getRegistryPromise(option: IDropdownOption, registryKey: string): IPromise<string> {
        if (option.key === PackageResources.FeedViewDropdown_AllViews_Key) {
            return this.props.endpointProvider.getEndpointUrl(this.props.feed.name, registryKey);
        }

        const feedName = this.props.feed.name + option.text;
        return this.props.endpointProvider.getEndpointUrl(feedName, registryKey);
    }

    private _getFullyQualifiedFeedName(): string {
        if (this.props.feed.view) {
            return this.props.feed.name + "@" + this.props.feed.view.name;
        }
        return this.props.feed.name;
    }

    private _getBothRegistryEndpoints(uri: string): string[] {
        if (uri && uri.length > 0) {
            if (uri.charAt(uri.length - 1) === "/") {
                // endpoint has a slash, so remove it:
                return [uri, uri.substr(0, uri.length - 1)];
            }
        }
        // no ending slash:
        return [uri, uri + "/"];
    }

    private _setFocusToGeneratedCredentials() {
        if (this._generatedCredentials) {
            this._generatedCredentials.focus();
        }
    }

    private _onGenerateCredentialsClick() {
        const currentDate = new Date();
        this.setState({ isAuthTokenLoading: true });
        const feedTokenHttpClient = Service.getClient<FeedTokenHttpClient>(FeedTokenHttpClient) as FeedTokenHttpClient;
        feedTokenHttpClient.getPersonalAccessToken(this.props.feed.name, "SelfDescribing").then(sessionTokenData => {
            CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
                Action: CiConstants.ConnectToFeedCredentialsGenerated,
                Protocol: NpmCiConstants.ProtocolName,
                Context: HubAction[this.props.hubAction]
            });

            let registryEndPoints = this._getBothRegistryEndpoints(this.state.registryUrl);
            if (this._showLegacyAuthTokens
                && !Utils_Url.isSameOrigin(this.state.registryUrl, this.state.legacyRegistryUrl)) {
                registryEndPoints = registryEndPoints.concat(this._getBothRegistryEndpoints(this.state.legacyRegistryUrl))
            }

            const authTokenCommands = registryEndPoints.map((endpoint: string) => {
                return Utils_String.format(
                    PackageResources.NpmConnectControl_AuthTokenStub,
                    NpmConnectToFeedPanel._getNpmAuthUrl(endpoint),
                    sessionTokenData.token);
            }).join(Utils_String.newLine);

            this.setState(
                {
                    authTokenCommand: Utils_String.format(
                        PackageResources.NpmConnectControl_AuthToken,
                        Utils_Date.localeFormat(DateHelper.getTokenExpirationDate(currentDate), "d"),
                        authTokenCommands,
                        sessionTokenData.token
                    ),
                    isAuthTokenLoading: false
                },
                () => this._setFocusToGeneratedCredentials()
            );
        });
    }

    public static _getNpmAuthUrl(registryEndpointUrl: string) {
        const uri = Utils_Url.Uri.parse(registryEndpointUrl);
        delete uri.scheme;
        delete uri.queryParameters;
        delete uri.hashString;

        const lastSlashIndex = uri.path.lastIndexOf("/");
        // include everything up to the last slash, discard everything after it (including the slash):
        const path = lastSlashIndex > 0 ? "/" + uri.path.substr(0, lastSlashIndex) : "";

        // absoluteUri encodes the path, which means it won't match the registry uri property. We'll append it ourselves.
        delete uri.path;

        // this is mimicking NPM's 'toNerfDart' behavior.  The final slash is added by the string formatter above:
        return "//" + Utils_File.combinePaths(uri.absoluteUri, path);
    }
}
