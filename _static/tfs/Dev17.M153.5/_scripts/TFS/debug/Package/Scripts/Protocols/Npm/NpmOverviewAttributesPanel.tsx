import * as React from "react";

import { Component, State } from "VSS/Flux/Component";

import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { PackageDependencies } from "Package/Scripts/Protocols/Components/PackageDependencies";
import { IProjectAttribute, PackageDevelopment } from "Package/Scripts/Protocols/Components/PackageDevelopment";
import { PackageProvenance } from "Package/Scripts/Protocols/Components/PackageProvenance";
import { PackageStats } from "Package/Scripts/Protocols/Components/PackageStats";
import { PackageTags } from "Package/Scripts/Protocols/Components/PackageTags";
import { NpmCiConstants, NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { NpmProtocolMetadata } from "Package/Scripts/Protocols/Npm/NpmContracts";
import { NpmDependencyHelper } from "Package/Scripts/Protocols/Npm/NpmDependencyHelper";
import { NpmPackagePeople } from "Package/Scripts/Protocols/Npm/NpmPackagePeople";
import { Provenance } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Npm/NpmOverviewAttributesPanel";

import * as PackageResources from "Feed/Common/Resources";

export interface INpmOverviewAttributesPanelState extends State {
    provenance: Provenance;
}

export class NpmOverviewAttributesPanel extends Component<IPackageDetailsProps, INpmOverviewAttributesPanelState> {
    public render(): JSX.Element {
        const npmMetadata: NpmProtocolMetadata =
            this.props.packageVersion.protocolMetadata && this.props.packageVersion.protocolMetadata.data
                ? (this.props.packageVersion.protocolMetadata.data as NpmProtocolMetadata)
                : null;
        const projectAttributes: IProjectAttribute[] = [];

        if (npmMetadata) {
            if (npmMetadata.homepage) {
                projectAttributes.push({
                    iconClass: "bowtie-icon bowtie-globe",
                    text: PackageResources.NpmHomepage_Title,
                    url: npmMetadata.homepage,
                    onClickCiFeature: NpmCiConstants.HomepageLinkClicked
                } as IProjectAttribute);
            }

            if (npmMetadata.bugs) {
                projectAttributes.push({
                    iconClass: "bowtie-icon bowtie-work-item-bug",
                    text: PackageResources.NpmBugs_Title,
                    url: npmMetadata.bugs.url ? npmMetadata.bugs.url : "mailto:" + npmMetadata.bugs.email,
                    onClickCiFeature: npmMetadata.bugs.url
                        ? NpmCiConstants.BugUrlLinkClicked
                        : NpmCiConstants.BugEmailLinkClicked
                } as IProjectAttribute);
            }

            if (npmMetadata.license) {
                projectAttributes.push({
                    iconClass: "bowtie-icon bowtie-script",
                    text: npmMetadata.license
                } as IProjectAttribute);
            }

            if (npmMetadata.main) {
                projectAttributes.push({
                    iconClass: "bowtie-icon bowtie-file-code",
                    text: npmMetadata.main
                } as IProjectAttribute);
            }
        }

        return (
            <div className="npm-overview-attributes-panel package-overview-attributes-panel">
                <PackageProvenance
                    feed={this.props.feed}
                    packageId={this.props.packageSummary.id}
                    versionId={this.props.packageVersion.id}
                    publishDate={new Date(this.props.packageVersion.publishDate)}
                    isProvenanceEnabled={this.props.isProvenanceEnabled}
                    isProvenanceSupported={true}
                />
                <NpmPackagePeople
                    author={npmMetadata ? npmMetadata.author : null}
                    contributors={npmMetadata ? npmMetadata.contributors : null}
                />
                <PackageDevelopment
                    projectAttributes={projectAttributes}
                    packageSummary={this.props.packageSummary}
                    packageVersion={this.props.packageVersion}
                    upstreamSources={this.props.feed.upstreamSources}
                />
                <PackageStats packageMetrics={this.props.packageMetrics} />
                <PackageDependencies
                    feed={this.props.feed}
                    packageSummary={this.props.packageSummary}
                    packageVersion={this.props.packageVersion}
                    dependencyHelperCallback={NpmDependencyHelper.formatGroupNames}
                    isSmartDependenciesEnabled={this.props.isSmartDependenciesEnabled}
                />
                <PackageTags tags={this.props.packageVersion.tags} protocol={NpmKey} />
            </div>
        );
    }
}
