import * as React from "react";

import { Component, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";

import { ConnectToFeedButton } from "Package/Scripts/Components/ConnectToFeedButton";
import { InvisibleLoadingContainer } from "Package/Scripts/Components/InvisibleLoadingContainer";
import { PackageUpstreamLocatorCommand } from "Package/Scripts/Components/PackageUpstreamLocatorCommand";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { getFullyQualifiedFeedId } from "Package/Scripts/Helpers/FeedNameResolver";
import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { CopyableTextField, ICopyableTextFieldTelemetry } from "Package/Scripts/Protocols/Components/CopyableTextField";
import { PackageTile } from "Package/Scripts/Protocols/Components/PackageTile";
import { MarkdownRendererWrapper } from "Package/Scripts/Protocols/Npm/MarkdownRendererWrapper";
import { INpmReadmeContent, NpmDataService } from "Package/Scripts/Protocols/Npm/NpmDataService";
import * as PackageResources from "Feed/Common/Resources";
import { HubAction } from "Package/Scripts/Types/IHubState";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Common/CommonOverviewContentPanel";

export interface INpmOverviewContentPanelState extends State {
    rawReadmeContent?: string;
}

export class NpmOverviewContentPanel extends Component<IPackageDetailsProps, INpmOverviewContentPanelState> {
    private _mounted: boolean;

    constructor(props: IPackageDetailsProps) {
        super(props);

        this.state = {
            rawReadmeContent: null
        } as INpmOverviewContentPanelState;

        this._mounted = false;
    }

    public componentDidMount(): void {
        const npmDataService = Service.getLocalService(NpmDataService);
        const feedId = getFullyQualifiedFeedId(this.props.feed);
        this._mounted = true;
        npmDataService
            .getReadmeUnscopedPackage(
                feedId,
                this.props.packageSummary.normalizedName,
                this.props.packageVersion.normalizedVersion
            )
            .then((readmeContent: INpmReadmeContent) => {
                // only set state if you're still in the overview tab after readme fetching is done
                if (this._mounted === true) {
                    this.setState({
                        rawReadmeContent: readmeContent.rawReadmeContent
                    });
                }
            });
    }

    public componentWillUnmount(): void {
        this._mounted = false;
    }

    public render(): JSX.Element {
        const { feed, packageVersion, packageSummary, protocol } = this.props;

        const protocolMap: IDictionaryStringTo<IPackageProtocol> = {};
        protocolMap[protocol.name] = protocol;
        const textfieldId = "npm-overview-textfield-label1";

        return (
            <div className="package-overview-content-panel">
                {!packageVersion.isDeleted && (
                    <PackageTile title={PackageResources.Npm_InstallInstructions_Title} id={textfieldId}>
                        <div>
                            <div className="get-package-tile">
                                <ConnectToFeedButton
                                    feed={feed}
                                    feedViews={this.props.feedViews}
                                    protocolMap={protocolMap}
                                    hubAction={HubAction.Package}
                                />
                                <span className="install-instructions-then">
                                    {PackageResources.InstallInstructions_then}
                                </span>
                                <CopyableTextField
                                    text={protocol.getCopyInstallCommand(
                                        feed.name,
                                        packageSummary.name,
                                        packageVersion.version
                                    )}
                                    buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Npm_Install_Copy}
                                    textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Npm_Install}
                                    telemetryProperties={
                                        {
                                            commandName: CiConstants.CopyCommandInstall,
                                            feedName: feed.name,
                                            packageName: packageSummary.name,
                                            packageVersion: packageVersion.version,
                                            protocol: protocol.name
                                        } as ICopyableTextFieldTelemetry
                                    }
                                    ariaDescribedByIdForLabelText={textfieldId}
                                />
                            </div>
                        </div>
                        <PackageUpstreamLocatorCommand
                            feed={feed}
                            packageVersion={packageVersion}
                            protocol={protocol}
                        />
                    </PackageTile>
                )}
                <PackageTile title={PackageResources.Npm_Description_Title}>
                    <div className="package-description">{packageVersion.description}</div>
                </PackageTile>
                {!packageVersion.isDeleted ? (
                    <InvisibleLoadingContainer isLoading={this.state.rawReadmeContent === null ? true : false}>
                        <PackageTile title={null}>
                            <MarkdownRendererWrapper rawMarkdownContent={this.state.rawReadmeContent} />
                        </PackageTile>
                    </InvisibleLoadingContainer>
                ) : (
                    <div />
                )}
            </div>
        );
    }
}
