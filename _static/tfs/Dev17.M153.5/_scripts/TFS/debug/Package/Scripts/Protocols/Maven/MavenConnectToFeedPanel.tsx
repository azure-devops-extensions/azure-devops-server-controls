import * as React from "react";

import { DefaultButton } from "OfficeFabric/Button";

import * as WebContext from "VSS/Context";
import { Component, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import * as Url from "VSS/Utils/Url";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { resolveUri } from "Package/Scripts/Helpers/UrlHelper";
import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IConnectToFeedProps } from "Package/Scripts/Protocols/Common/IConnectToFeedProps";
import { CopyableTextField, ICopyableTextFieldTelemetry } from "Package/Scripts/Protocols/Components/CopyableTextField";
import { MavenCiConstants, MavenExternalLinks } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { FeedTokenHttpClient } from "Package/Scripts/WebApi/VSS.FeedToken.WebApi";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Maven/MavenConnectToFeedPanel";

import * as PackageResources from "Feed/Common/Resources";
import { DateHelper } from "Feed/Common/Utils/Date";

export interface IMavenConnectToFeedPanelProps extends IConnectToFeedProps {
    endpointProvider: EndpointProvider;
}

export interface IMavenConnectToFeedPanelState extends State {
    authTokenCommand?: string;
    endpointUrl: string;
    isLoading: boolean;
    isAuthTokenLoading?: boolean;
    repositoryId: string;
}

export class MavenConnectToFeedPanel extends Component<IMavenConnectToFeedPanelProps, IMavenConnectToFeedPanelState> {
    private _generatedCredentials: CopyableTextField;

    constructor(props: IMavenConnectToFeedPanelProps) {
        super(props);

        this.state = {
            isLoading: true
        } as IMavenConnectToFeedPanelState;

        this.props.endpointProvider
            .getEndpointUrl(this.props.feed.name, MavenCiConstants.ProtocolName.toLowerCase())
            .then((endpointUrl: string) => {
                this.setState({
                    repositoryId: this._createRepositoryId(),
                    // Decode endpoint URL so that it shows unencoded in Maven XML configuration snippets. Otherwise, copy-pasting the encoded URLs will cause
                    // Maven client to re-encode the encoded URLs once more, effectively altering the feed URL.
                    endpointUrl: decodeURI(endpointUrl),
                    isLoading: false
                });
            });

        CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
            Action: CiConstants.ConnectToFeedTabChanged,
            Protocol: MavenCiConstants.ProtocolName,
            Context: HubAction[this.props.hubAction]
        });
    }

    public render(): JSX.Element {
        const textfieldIds = ["maven-textfield-label1", "maven-textfield-label2", "maven-textfield-label3"];
        return (
            <div className="maven-connect-to-feed-panel connect-to-feed-panel">
                <LoadingContainer isLoading={this.state.isLoading} cssClass="custom-padding">
                    {this.state.endpointUrl ? (
                        <div className="connect-to-feed-section">
                            <div className="connect-to-feed-section-title">
                                {PackageResources.MavenConnectControl_ConsumeHeadingText}
                            </div>
                            <div className="maven-subheading" id={textfieldIds[0]}>
                                <FormatComponent format={PackageResources.MavenConnectControl_CredentialsTitle}>
                                    <span className="xml-tag-text">{"<servers>"}</span>
                                </FormatComponent>
                            </div>
                            <LoadingContainer isLoading={this.state.isAuthTokenLoading}>
                                {this.state.authTokenCommand ? (
                                    <div>
                                        <CopyableTextField
                                            ref={self => (this._generatedCredentials = self)}
                                            ariaDescribedByIdForLabelText={textfieldIds[0]}
                                            text={this._createServerXmlTag(this.state.authTokenCommand)}
                                            buttonAriaLabel={
                                                PackageResources.AriaLabel_CopyToClipBoard_Maven_Token_Copy
                                            }
                                            textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Maven_Token}
                                            telemetryProperties={
                                                {
                                                    commandName: CiConstants.CopyCommandAuthToken,
                                                    feedName: this.props.feed.name,
                                                    protocol: MavenCiConstants.ProtocolName
                                                } as ICopyableTextFieldTelemetry
                                            }
                                        />
                                        <span className="warning-text">
                                            {PackageResources.MavenConnectControl_WarningText}
                                        </span>
                                    </div>
                                ) : (
                                    <div>
                                        <DefaultButton
                                            className="maven-credentials-link"
                                            onClick={() => this._onGenerateCredentialsClick()}
                                        >
                                            <span className="bowtie-icon bowtie-security-access" />
                                            <span className="connect-to-feed-link-text">
                                                {PackageResources.MavenConnectControl_GenerateCredentialsText}
                                            </span>
                                        </DefaultButton>
                                    </div>
                                )}
                            </LoadingContainer>
                            <ExternalLink
                                className="connect-to-feed-link"
                                href={MavenExternalLinks.SettingsServerReference}
                                ciContext={MavenCiConstants.MavenConnectToFeedPanel}
                            >
                                {PackageResources.MavenConnectControl_ExternalLinkForSettings}
                            </ExternalLink>

                            <div className="maven-subheading" id={textfieldIds[1]}>
                                <FormatComponent format={PackageResources.MavenConnectControl_PomXmlTitle}>
                                    <span className="xml-tag-text">{"<repositories>"}</span>
                                    <span className="xml-tag-text">{"<distributionManagement>"}</span>
                                </FormatComponent>
                            </div>
                            <CopyableTextField
                                ariaDescribedByIdForLabelText={textfieldIds[1]}
                                text={this._createRepositoryXmlTag()}
                                buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Maven_Consume_Copy}
                                textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Maven_Consume}
                                telemetryProperties={
                                    {
                                        commandName: CiConstants.CopyCommandAddSource,
                                        feedName: this.props.feed.name,
                                        protocol: MavenCiConstants.ProtocolName
                                    } as ICopyableTextFieldTelemetry
                                }
                            />
                            <ExternalLink
                                className="connect-to-feed-link"
                                href={MavenExternalLinks.PomRepositoriesReference}
                                ciContext={MavenCiConstants.MavenConnectToFeedPanel}
                            >
                                {PackageResources.MavenConnectControl_ExternalLinkForPOM}
                            </ExternalLink>

                            <div className="connect-to-feed-section-title maven-title">
                                {PackageResources.MavenConnectControl_PublishHeadingText}
                            </div>
                            <div className="connect-to-feed-sub-heading" id={textfieldIds[2]}>
                                {PackageResources.MavenConnectControl_DeployPluginTitle}
                            </div>
                            <CopyableTextField
                                ariaDescribedByIdForLabelText={textfieldIds[2]}
                                text={"mvn deploy"}
                                buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Maven_MavenPlugin_Copy}
                                textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Maven_MavenPlugin}
                                telemetryProperties={
                                    {
                                        commandName: CiConstants.CopyCommandAddSource,
                                        feedName: this.props.feed.name,
                                        protocol: MavenCiConstants.ProtocolName
                                    } as ICopyableTextFieldTelemetry
                                }
                            />
                            <ExternalLink
                                className="connect-to-feed-link"
                                href={MavenExternalLinks.DeployPluginReference}
                                ciContext={MavenCiConstants.MavenConnectToFeedPanel}
                            >
                                {PackageResources.MavenConnectControl_ExternalLinkForDeployPlugin}
                            </ExternalLink>
                        </div>
                    ) : (
                        <PackageMessagePanel message={PackageResources.ConnectControl_EndpointNotAvailable} />
                    )}
                </LoadingContainer>
            </div>
        );
    }

    private _createRepositoryXmlTag(): string {
        // using » to indicate where the indentations will be
        const snippet = `<repository>
            »<id>${this.state.repositoryId}</id>
            »<url>${this.state.endpointUrl}</url>
            »<releases>
            »»<enabled>true</enabled>
            »</releases>
            »<snapshots>
            »»<enabled>true</enabled>
            »</snapshots>
            </repository>`;

        return snippet.replace(/  +/g, "").replace(/»/g, "  ");
    }

    private _createServerXmlTag(token: string): string {
        const expiryDate = Utils_Date.localeFormat(DateHelper.getTokenExpirationDate(new Date()), "d");
        const tokenExpiryMessage = Utils_String.format(PackageResources.AuthTokenExpiryTime, expiryDate);
        // using » to indicate where the indentations will be
        const snippet = `<server>
            »<id>${this.state.repositoryId}</id>
            »<configuration>
            »»<httpHeaders>
            »»»<property>
            »»»»<name>Authorization</name>
            »»»»<!-- ${PackageResources.AuthTokenSecurityWarning} -->
            »»»»<!-- ${tokenExpiryMessage} -->
            »»»»<value>${token}</value>
            »»»</property>
            »»</httpHeaders>
            »</configuration>
            </server>`;

        return snippet.replace(/  +/g, "").replace(/»/g, "  ");
    }

    private _setFocusToGeneratedCredentials() {
        if (this._generatedCredentials) {
            this._generatedCredentials.focus();
        }
    }

    private _onGenerateCredentialsClick() {
        this.setState({ isAuthTokenLoading: true });
        const feedTokenHttpClient = Service.getClient<FeedTokenHttpClient>(FeedTokenHttpClient) as FeedTokenHttpClient;
        feedTokenHttpClient.getPersonalAccessToken(this.props.feed.name, "SelfDescribing").then(sessionTokenData => {
            CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
                Action: CiConstants.ConnectToFeedCredentialsGenerated,
                Protocol: MavenCiConstants.ProtocolName,
                Context: HubAction[this.props.hubAction]
            });
            const userEmail = WebContext.getDefaultWebContext().user.email;
            const userName = userEmail.substring(0, userEmail.indexOf("@"));
            const authKey = Utils_String.format("{0}:{1}", userName, sessionTokenData.token);
            this.setState(
                {
                    authTokenCommand: Utils_String.format("Basic {0}", Utils_String.base64Encode(authKey)),
                    isAuthTokenLoading: false
                },
                () => this._setFocusToGeneratedCredentials()
            );
        });
    }

    private _createRepositoryId(): string {
        const host = Url.Uri.parse(resolveUri("")).host.trim();
        const feed = this.props.feed.name.trim();
        return Utils_String.format("{0}-{1}", host, feed)
            .toLowerCase()
            .replace(" ", "-")
            .replace(".", "-");
    }
}
