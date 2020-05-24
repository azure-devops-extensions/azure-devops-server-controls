import * as React from "react";

import { Component, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { ConnectToFeedButton } from "Package/Scripts/Components/ConnectToFeedButton";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { CopyableTextField, ICopyableTextFieldTelemetry } from "Package/Scripts/Protocols/Components/CopyableTextField";
import { PackageTile } from "Package/Scripts/Protocols/Components/PackageTile";
import { INuGetProtocolMetadata } from "Package/Scripts/Protocols/NuGet/NuGetProtocolMetadata";
import * as PackageResources from "Feed/Common/Resources";
import { HubAction } from "Package/Scripts/Types/IHubState";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Common/CommonOverviewContentPanel";

export class NuGetOverviewContentPanel extends Component<IPackageDetailsProps, State> {
    public render(): JSX.Element {
        const { packageVersion, protocol, packageSummary, feed } = this.props;

        const nugetMetadata: INuGetProtocolMetadata =
            packageVersion.protocolMetadata && packageVersion.protocolMetadata.data
                ? (packageVersion.protocolMetadata.data as INuGetProtocolMetadata)
                : null;

        const protocolMap: IDictionaryStringTo<IPackageProtocol> = {};
        protocolMap[protocol.name] = protocol;
        const textfieldId = "nuget-overview-textfield-label1";

        const command = protocol.getCopyInstallCommand(feed.name, packageSummary.name, packageVersion.version);
        const installCmd = Utils_String.format(
            "{0} {1}",
            PackageResources.NuGet_InstallInstructions_InstallPackageCommand_Client,
            command
        );

        return (
            <div className="package-overview-content-panel">
                {!packageVersion.isDeleted && (
                    <PackageTile title={PackageResources.NuGet_InstallInstructions_Title} id={textfieldId}>
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
                                displayText={installCmd}
                                text={command}
                                buttonAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_Install_Copy}
                                textFieldAriaLabel={PackageResources.AriaLabel_CopyToClipBoard_Nuget_Install}
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
                    </PackageTile>
                )}
                <PackageTile title={PackageResources.NuGet_Description_Title}>
                    <div className="package-description">{packageVersion.description}</div>
                    {nugetMetadata &&
                        nugetMetadata.releaseNotes && (
                            <div>
                                <div className="package-group-spacer" />
                                <div className="package-group-header">{PackageResources.NuGetReleaseNotes_Title}</div>
                                {nugetMetadata.releaseNotes.split(/\r\n|\r|\n/g).map((line, index) => {
                                    return <div key={"ReleaseNote_Key_" + index}>{line}</div>;
                                })}
                            </div>
                        )}
                </PackageTile>
            </div>
        );
    }
}
