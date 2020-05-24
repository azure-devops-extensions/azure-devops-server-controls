import * as React from "react";

import { Component, State } from "VSS/Flux/Component";

import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { PackageDependencies } from "Package/Scripts/Protocols/Components/PackageDependencies";
import { IProjectAttribute, PackageDevelopment } from "Package/Scripts/Protocols/Components/PackageDevelopment";
import { PackagePeople } from "Package/Scripts/Protocols/Components/PackagePeople";
import { PackageProvenance } from "Package/Scripts/Protocols/Components/PackageProvenance";
import { PackageStats } from "Package/Scripts/Protocols/Components/PackageStats";
import { PackageTags } from "Package/Scripts/Protocols/Components/PackageTags";
import { NuGetCiConstants } from "Package/Scripts/Protocols/NuGet/Constants/NuGetConstants";
import { NuGetDependencyHelper } from "Package/Scripts/Protocols/NuGet/NuGetDependencyHelper";
import { INuGetProtocolMetadata } from "Package/Scripts/Protocols/NuGet/NuGetProtocolMetadata";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/NuGet/NuGetOverviewAttributesPanel";

import * as PackageResources from "Feed/Common/Resources";

export class NuGetOverviewAttributesPanel extends Component<IPackageDetailsProps, State> {
    public render(): JSX.Element {
        const nugetMetadata: INuGetProtocolMetadata =
            this.props.packageVersion.protocolMetadata && this.props.packageVersion.protocolMetadata.data
                ? (this.props.packageVersion.protocolMetadata.data as INuGetProtocolMetadata)
                : null;

        const projectAttributes: IProjectAttribute[] = [];

        if (nugetMetadata) {
            if (nugetMetadata.projectUrl) {
                projectAttributes.push({
                    iconClass: "bowtie-icon bowtie-globe",
                    text: PackageResources.NuGetLinks_Project,
                    url: nugetMetadata.projectUrl,
                    onClickCiFeature: NuGetCiConstants.ProjectLinkClicked
                } as IProjectAttribute);
            }

            if (nugetMetadata.licenseUrl) {
                projectAttributes.push({
                    iconClass: "bowtie-icon bowtie-script",
                    text: PackageResources.NuGetLinks_License,
                    url: nugetMetadata.licenseUrl,
                    onClickCiFeature: NuGetCiConstants.LicenseLinkClicked
                } as IProjectAttribute);
            }
        }

        return (
            <div className="nuget-overview-attributes-panel">
                <PackageProvenance
                    feed={this.props.feed}
                    packageId={this.props.packageSummary.id}
                    versionId={this.props.packageVersion.id}
                    publishDate={new Date(this.props.packageVersion.publishDate)}
                    isProvenanceEnabled={this.props.isProvenanceEnabled}
                    isProvenanceSupported={true}
                />
                {this.props.packageVersion.author != null && (
                    <PackagePeople authors={this.props.packageVersion.author.split(",")} />
                )}
                <PackageDevelopment
                    projectAttributes={projectAttributes}
                    packageSummary={this.props.packageSummary}
                    packageVersion={this.props.packageVersion}
                    upstreamSources={this.props.feed.upstreamSources}
                />
                <PackageStats packageMetrics={this.props.packageMetrics} />
                <PackageTags tags={this.props.packageVersion.tags} />
                <PackageDependencies
                    feed={this.props.feed}
                    packageSummary={this.props.packageSummary}
                    packageVersion={this.props.packageVersion}
                    dependencyHelperCallback={NuGetDependencyHelper.formatVersionRanges}
                    isSmartDependenciesEnabled={this.props.isSmartDependenciesEnabled}
                />
                {nugetMetadata != null && (
                    <div>
                        <PackageAttribute title={PackageResources.NuGetMinimumClientVersion_Title}>
                            {nugetMetadata.minClientVersion}
                        </PackageAttribute>
                        <PackageAttribute title={PackageResources.NuGetCopyright_Title}>
                            {nugetMetadata.copyright}
                        </PackageAttribute>
                        <PackageAttribute title={PackageResources.NuGetLanguage_Title}>
                            {nugetMetadata.language}
                        </PackageAttribute>
                    </div>
                )}
            </div>
        );
    }
}
