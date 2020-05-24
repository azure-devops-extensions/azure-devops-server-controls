import * as React from "react";

import { DefaultButton } from "OfficeFabric/Button";

import { Component, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IConnectToFeedProps } from "Package/Scripts/Protocols/Common/IConnectToFeedProps";
import { CopyableTextField, ICopyableTextFieldTelemetry } from "Package/Scripts/Protocols/Components/CopyableTextField";
import {
    GradleCiConstants,
    GradleExternalLinks,
    MavenCiConstants
} from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { FeedTokenHttpClient } from "Package/Scripts/WebApi/VSS.FeedToken.WebApi";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Maven/GradleConnectToFeedPanel";

import * as PackageResources from "Feed/Common/Resources";
import { DateHelper } from "Feed/Common/Utils/Date";

export interface IGradleConnectToFeedPanelProps extends IConnectToFeedProps {
    endpointProvider: EndpointProvider;
}

export interface IGradleConnectToFeedPanelState extends State {
    authTokenCommand?: string;
    endpointUrl: string;
    isLoading: boolean;
    isAuthTokenLoading?: boolean;
}

export class GradleConnectToFeedPanel extends Component<
    IGradleConnectToFeedPanelProps,
    IGradleConnectToFeedPanelState
> {
    private _generatedCredentials: CopyableTextField;

    constructor(props: IGradleConnectToFeedPanelProps) {
        super(props);

        this.state = {
            isLoading: true
        } as IGradleConnectToFeedPanelState;

        this.props.endpointProvider
            .getEndpointUrl(this.props.feed.name, MavenCiConstants.ProtocolName.toLowerCase())
            .then((endpointUrl: string) => {
                this.setState({
                    // Decode endpoint URL so that it shows unencoded in Maven XML configuration snippets. Otherwise, copy-pasting the encoded URLs will cause
                    // Maven client to re-encode the encoded URLs once more, effectively altering the feed URL.
                    endpointUrl: decodeURI(endpointUrl),
                    isLoading: false
                });
            });

        CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
            Action: CiConstants.ConnectToFeedTabChanged,
            Protocol: MavenCiConstants.ProtocolName,
            ClientTool: GradleCiConstants.ClientTool,
            Context: HubAction[this.props.hubAction]
        });
    }

    public render(): JSX.Element {
        const textfieldIds = [
            "gradle-textfield-label1",
            "gradle-textfield-label2",
            "gradle-textfield-label3",
            "gradle-textfield-label4"
        ];
        const buildGradleSnippet = this._createSnippetForBuildGradleFile();
        const ciContext = {
            feedName: this.props.feed.name,
            protocol: MavenCiConstants.ProtocolName,
            clientTool: GradleCiConstants.ClientTool
        };
        const externalLinkAttr = {
            className: "connect-to-feed-link",
            ciContext: GradleCiConstants.GradleConnectToFeedPanel
        };
        return (
            <div className="gradle-connect-to-feed-panel connect-to-feed-panel">
                <LoadingContainer isLoading={this.state.isLoading} cssClass="custom-padding">
                    {this.state.endpointUrl ? (
                        <div className="connect-to-feed-section">
                            <div className="connect-to-feed-section-title">
                                {PackageResources.GradleConnectControl_AuthenticateHeadingText}
                            </div>

                            <div className="gradle-subheading" id={textfieldIds[0]}>
                                {PackageResources.GradleConnectControl_CredentialsTitle}
                            </div>
                            <LoadingContainer isLoading={this.state.isAuthTokenLoading}>
                                {this.state.authTokenCommand ? (
                                    <div>
                                        <CopyableTextField
                                            ref={self => (this._generatedCredentials = self)}
                                            ariaDescribedByIdForLabelText={textfieldIds[0]}
                                            text={this.state.authTokenCommand}
                                            buttonAriaLabel={
                                                PackageResources.AriaLabel_CopyToClipBoard_Gradle_Token_Copy
                                            }
                                            textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Gradle_Token}
                                            telemetryProperties={
                                                {
                                                    commandName: CiConstants.CopyCommandAuthToken,
                                                    ...ciContext
                                                } as ICopyableTextFieldTelemetry
                                            }
                                        />
                                        <span className="warning-text">
                                            {PackageResources.GradleConnectControl_WarningText}
                                        </span>
                                    </div>
                                ) : (
                                    <div>
                                        <DefaultButton
                                            className="gradle-credentials-link"
                                            onClick={() => this._onGenerateCredentialsClick()}
                                        >
                                            <span className="bowtie-icon bowtie-security-access" />
                                            <span className="connect-to-feed-link-text">
                                                {PackageResources.GradleConnectControl_GenerateCredentialsText}
                                            </span>
                                        </DefaultButton>
                                    </div>
                                )}
                            </LoadingContainer>
                            <ExternalLink href={GradleExternalLinks.GradlePropertiesReference} {...externalLinkAttr}>
                                {PackageResources.GradleConnectControl_ExternalLinkForGradleProperties}
                            </ExternalLink>

                            <div className="connect-to-feed-section-title">
                                {PackageResources.GradleConnectControl_ConsumeHeadingText}
                            </div>

                            <div className="gradle-subheading" id={textfieldIds[1]}>
                                <FormatComponent format={PackageResources.GradleConnectControl_BuildGradleFileSettings}>
                                    <span className="container-name">repositories</span>
                                </FormatComponent>
                            </div>
                            <CopyableTextField
                                ariaDescribedByIdForLabelText={textfieldIds[1]}
                                text={buildGradleSnippet}
                                buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Gradle_Consume_Copy}
                                textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Gradle_Consume}
                                telemetryProperties={
                                    {
                                        commandName: CiConstants.CopyCommandAddSource,
                                        ...ciContext
                                    } as ICopyableTextFieldTelemetry
                                }
                            />
                            <ExternalLink href={GradleExternalLinks.BuildGradleReference} {...externalLinkAttr}>
                                {PackageResources.GradleConnectControl_ExternalLinkForBuildGradle}
                            </ExternalLink>
                            <ExternalLink href={GradleExternalLinks.GradleDepdendenciesReference} {...externalLinkAttr}>
                                {PackageResources.GradleConnectControl_ExternalLinkForGradleDependencies}
                            </ExternalLink>

                            <div className="connect-to-feed-section-title">
                                {PackageResources.GradleConnectControl_PublishHeadingText}
                            </div>

                            <div className="connect-to-feed-sub-heading" id={textfieldIds[2]}>
                                <FormatComponent format={PackageResources.GradleConnectControl_PublishToGradleGuidance}>
                                    <span className="container-name">publishing.repositories</span>
                                </FormatComponent>
                            </div>
                            <CopyableTextField
                                ariaDescribedByIdForLabelText={textfieldIds[2]}
                                text={buildGradleSnippet}
                                buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Gradle_Publish_Copy}
                                textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Gradle_Publish}
                                telemetryProperties={
                                    {
                                        commandName: CiConstants.CopyCommandAddSource,
                                        ...ciContext
                                    } as ICopyableTextFieldTelemetry
                                }
                            />
                            <ExternalLink href={GradleExternalLinks.BuildGradleReference} {...externalLinkAttr}>
                                {PackageResources.GradleConnectControl_ExternalLinkForBuildGradle}
                            </ExternalLink>
                            <ExternalLink href={GradleExternalLinks.GradlePublishReference} {...externalLinkAttr}>
                                {PackageResources.GradleConnectControl_ExternalLinkForPublish}
                            </ExternalLink>

                            <div className="connect-to-feed-sub-heading" id={textfieldIds[3]}>
                                {PackageResources.GradleConnectControl_RunCommand}
                            </div>
                            <CopyableTextField
                                ariaDescribedByIdForLabelText={textfieldIds[3]}
                                text={"gradle publish"}
                                buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Gradle_RunCommand_Copy}
                                textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Gradle_RunCommand}
                                telemetryProperties={
                                    {
                                        commandName: CiConstants.CopyCommand,
                                        ...ciContext
                                    } as ICopyableTextFieldTelemetry
                                }
                            />
                        </div>
                    ) : (
                        <PackageMessagePanel message={PackageResources.ConnectControl_EndpointNotAvailable} />
                    )}
                </LoadingContainer>
            </div>
        );
    }

    private _createSnippetForBuildGradleFile(): string {
        // using » to indicate where the indentations will be
        const snippet = `maven {
            »url '${this.state.endpointUrl}'
            »credentials {
            »»username "AZURE_ARTIFACTS"
            »»password System.getenv("AZURE_ARTIFACTS_ENV_ACCESS_TOKEN") ?: "\${azureArtifactsGradleAccessToken}"
            »}
            }`;

        return snippet.replace(/  +/g, "").replace(/»/g, "    ");
    }

    private _setFocusToGeneratedCredentials() {
        if (this._generatedCredentials) {
            this._generatedCredentials.focus();
        }
    }

    private _onGenerateCredentialsClick() {
        this.setState({ isAuthTokenLoading: true });
        const feedTokenHttpClient = Service.getClient<FeedTokenHttpClient>(FeedTokenHttpClient) as FeedTokenHttpClient;
        feedTokenHttpClient.getPersonalAccessToken(this.props.feed.name, "Compact").then(sessionTokenData => {
            CustomerIntelligenceHelper.publishEvent(CiConstants.ConnectToFeed, {
                Action: CiConstants.ConnectToFeedCredentialsGenerated,
                Protocol: MavenCiConstants.ProtocolName,
                ClientTool: GradleCiConstants.ClientTool,
                Context: HubAction[this.props.hubAction]
            });

            const expiryDate = Utils_Date.localeFormat(DateHelper.getTokenExpirationDate(new Date()), "d");
            const tokenExpiryMessage = Utils_String.format(PackageResources.AuthTokenExpiryTime, expiryDate);
            const authExpiryMessage = `# ${PackageResources.AuthTokenSecurityWarning}
                # ${tokenExpiryMessage}
                azureArtifactsGradleAccessToken=${sessionTokenData.token}`.replace(/  +/g, "");
            this.setState(
                {
                    authTokenCommand: authExpiryMessage,
                    isAuthTokenLoading: false
                },
                () => this._setFocusToGeneratedCredentials()
            );
        });
    }
}
