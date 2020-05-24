import * as React from "react";

import { List } from "OfficeFabric/List";
import { autobind } from "OfficeFabric/Utilities";

import * as EventsAction from "VSS/Events/Action";
import { Component, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { IPivotedTextBoxPair, PivotedTextBoxWithCopy } from "VSSPreview/Flux/Components/PivotedTextBoxWithCopy";

import { ConnectToFeedButton } from "Package/Scripts/Components/ConnectToFeedButton";
import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { PackageTile } from "Package/Scripts/Protocols/Components/PackageTile";
import { MavenCiConstants } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import * as MavenFileHelper from "Package/Scripts/Protocols/Maven/MavenFileHelper";
import * as MavenInstallTextHelper from "Package/Scripts/Protocols/Maven/MavenInstallTextHelper";
import { MavenPomMetadata } from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.Contracts";
import * as PackageResources from "Feed/Common/Resources";
import { HubAction } from "Package/Scripts/Types/IHubState";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Maven/MavenOverviewContentPanel";

export interface IMavenPackageDetailsProps extends IPackageDetailsProps {
    endpointProvider: EndpointProvider;
    minimumSnapshotInstanceCount: number;
}

export interface IMavenPackageDetailsState extends State {
    selectedKey: string;
}

const mavenClientName: string = "Maven";
const gradleClientName: string = "Gradle";

export class MavenOverviewContentPanel extends Component<IMavenPackageDetailsProps, IMavenPackageDetailsState> {
    constructor(props: IMavenPackageDetailsProps) {
        super(props);
        this.state = { selectedKey: mavenClientName };
    }

    public render(): JSX.Element {
        const protocolMap: IDictionaryStringTo<IPackageProtocol> = {};
        protocolMap[this.props.protocol.name] = this.props.protocol;

        const mavenMetadata: MavenPomMetadata =
            this.props.packageVersion.protocolMetadata && this.props.packageVersion.protocolMetadata.data
                ? (this.props.packageVersion.protocolMetadata.data as MavenPomMetadata)
                : null;
        const dependencyClientPairs: IPivotedTextBoxPair[] = [
            {
                key: mavenClientName,
                value: [
                    MavenInstallTextHelper.getMavenPackageInstallText(
                        this.props.packageVersion.version,
                        this.props.packageSummary.name
                    )
                ]
            },
            { key: gradleClientName, value: [this._getGradlePackageInstallText()] }
        ];
        let parentDependencyClientPairs: IPivotedTextBoxPair[];

        if (mavenMetadata && mavenMetadata.parent) {
            parentDependencyClientPairs = [
                {
                    key: mavenClientName,
                    value: [
                        MavenInstallTextHelper.renderMavenPackageInstallText(
                            mavenMetadata.parent.groupId,
                            mavenMetadata.parent.artifactId,
                            mavenMetadata.parent.version
                        )
                    ]
                },
                {
                    key: gradleClientName,
                    value: [
                        this._renderGradlePackageInstallText(
                            mavenMetadata.parent.groupId,
                            mavenMetadata.parent.artifactId,
                            mavenMetadata.parent.version
                        )
                    ]
                }
            ];
        }

        const isSnapShotVersion: boolean = MavenFileHelper.isSnapshotVersion(this.props.packageVersion);
        return (
            <div className="maven-overview-content-panel package-overview-content-panel">
                {!this.props.packageVersion.isDeleted && (
                    <PackageTile
                        title={PackageResources.Maven_InstallInstructions_Title}
                        cssClass="connect-to-feed-tile"
                    >
                        <ConnectToFeedButton
                            feed={this.props.feed}
                            feedViews={this.props.feedViews}
                            protocolMap={protocolMap}
                            hubAction={HubAction.Package}
                            defaultTabId={this.state.selectedKey}
                        />
                        <span className="install-instructions-then">{PackageResources.InstallInstructions_then}</span>

                        <div className="connect-to-feed-copy-text">
                            <PivotedTextBoxWithCopy
                                pairs={dependencyClientPairs}
                                tooltipBeforeCopied={PackageResources.Maven_CopyToClipBoard_BeforeCopy}
                                tooltipAfterCopied={PackageResources.Maven_CopyToClipBoard_AfterCopy}
                                selectedKey={this.state.selectedKey}
                                multiLine={true}
                                onToggle={this.toggleButtonClicked}
                                copyAsText={true}
                            />
                        </div>
                    </PackageTile>
                )}
                {mavenMetadata &&
                    mavenMetadata.parent && (
                        <PackageTile title={PackageResources.Maven_Metadata_Parent} cssClass="parent-artifact-tile">
                            <PivotedTextBoxWithCopy
                                pairs={parentDependencyClientPairs}
                                tooltipBeforeCopied={PackageResources.Maven_CopyToClipBoard_BeforeCopy}
                                tooltipAfterCopied={PackageResources.Maven_CopyToClipBoard_AfterCopy}
                                selectedKey={this.state.selectedKey}
                                multiLine={true}
                                onToggle={this.toggleButtonClicked}
                                copyAsText={true}
                            />
                        </PackageTile>
                    )}
                {this.props.packageVersion.description && this.props.packageVersion.description.length > 0 ? (
                    <PackageTile title={PackageResources.Maven_Description_Title}>
                        <div className="package-description">{this.props.packageVersion.description}</div>
                    </PackageTile>
                ) : null}
                {!this.props.packageVersion.isDeleted && (
                    <PackageTile title={PackageResources.Maven_Files_Title}>
                        <List
                            items={MavenFileHelper.getFiles(this.props.packageVersion)}
                            onRenderCell={this._renderFiles}
                        />

                        <div>
                            {isSnapShotVersion
                                ? Utils_String.format(
                                      PackageResources.Maven_SnapshotRetentionPolicy_Label,
                                      this.props.minimumSnapshotInstanceCount
                                  )
                                : ""}
                        </div>
                    </PackageTile>
                )}
            </div>
        );
    }

    @autobind
    public toggleButtonClicked(newSelectedText: string): void {
        this.setState({ selectedKey: newSelectedText });
    }

    private _getGradlePackageInstallText(): string {
        if (this.props.packageSummary.name) {
            const packageNameParts = this.props.packageSummary.name ? this.props.packageSummary.name.split(":") : "";

            if (packageNameParts.length === 2) {
                return this._renderGradlePackageInstallText(
                    packageNameParts[0],
                    packageNameParts[1],
                    this.props.packageVersion.version
                );
            }

            return PackageResources.MavenOverview_InvalidPackageError;
        }
    }

    private _renderGradlePackageInstallText(groupId: string, artifactId: string, version: string): string {
        return Utils_String.format("compile(group: '{0}', name: '{1}', version: '{2}')", groupId, artifactId, version);
    }

    @autobind
    private _renderFiles(file: MavenFileHelper.IMavenFile) {
        return (
            <a
                href="#"
                className="package-link-text"
                rel="noopener noreferrer"
                onClick={e => {
                    this.props.endpointProvider
                        .getEndpointUrl(this.props.feed.id, MavenCiConstants.ProtocolName.toLowerCase())
                        .then(endpointUrl => {
                            e.preventDefault();
                            MavenFileHelper.getHrefLink(
                                file.key,
                                endpointUrl,
                                this.props.packageSummary.normalizedName,
                                this.props.packageVersion.normalizedVersion,
                                (href: string) => {
                                    EventsAction.getService().performAction(
                                        EventsAction.CommonActions.ACTION_WINDOW_OPEN,
                                        {
                                            url: href,
                                            target: "_blank"
                                        }
                                    );
                                }
                            );
                        });
                }}
            >
                {file.name}
            </a>
        );
    }
}
