import * as React from "react";

import { Component, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { PackageDependencies } from "Package/Scripts/Protocols/Components/PackageDependencies";
import { IProjectAttribute } from "Package/Scripts/Protocols/Components/PackageDevelopment";
import { PackageProvenance } from "Package/Scripts/Protocols/Components/PackageProvenance";
import { PackageStats } from "Package/Scripts/Protocols/Components/PackageStats";
import { MavenCiConstants } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import { MavenDependencyHelper } from "Package/Scripts/Protocols/Maven/MavenDependencyHelper";
import { MavenDevelopment } from "Package/Scripts/Protocols/Maven/MavenDevelopment";
import { MavenPackagePeople } from "Package/Scripts/Protocols/Maven/MavenPackagePeople";
import * as MavenContracts from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Maven/MavenOverviewAttributesPanel";

import * as PackageResources from "Feed/Common/Resources";

function _cloneLicense(license: MavenContracts.MavenPomLicense) {
    return {
        name: license.name,
        url: license.url,
        distribution: license.distribution
    } as MavenContracts.MavenPomLicense;
}

export class MavenOverviewAttributesPanel extends Component<IPackageDetailsProps, State> {
    public render(): JSX.Element {
        const packageVersion = this.props.packageVersion;
        const protocolMetadata = packageVersion.protocolMetadata;
        const mavenMetadata = (protocolMetadata && protocolMetadata.data
            ? protocolMetadata.data
            : null) as MavenContracts.MavenPomMetadata;

        return (
            <div className="maven-overview-attributes-panel package-overview-attributes-panel">
                <PackageProvenance
                    feed={this.props.feed}
                    packageId={this.props.packageSummary.id}
                    versionId={this.props.packageVersion.id}
                    publishDate={new Date(this.props.packageVersion.publishDate)}
                    isProvenanceEnabled={this.props.isProvenanceEnabled}
                    isProvenanceSupported={false}
                />
                {(mavenMetadata && mavenMetadata.developers && mavenMetadata.developers.length > 0) ||
                (mavenMetadata && mavenMetadata.contributors && mavenMetadata.contributors.length > 0) ? (
                    <MavenPackagePeople
                        developers={mavenMetadata.developers}
                        contributors={mavenMetadata.contributors}
                    />
                ) : null}
                {mavenMetadata != null && (
                    <MavenDevelopment
                        buildAttribute={this._getBuildAttribute(mavenMetadata.ciManagement)}
                        codeAttribute={this._getCodeAttribute(mavenMetadata.scm)}
                        projectAttributes={this._getProjectAttributes(
                            mavenMetadata.organization,
                            MavenOverviewAttributesPanel.PreparePomLicenses(mavenMetadata.licenses),
                            mavenMetadata.issueManagement
                        )}
                    />
                )}
                <PackageStats packageMetrics={this.props.packageMetrics} />
                <PackageDependencies
                    feed={this.props.feed}
                    packageSummary={this.props.packageSummary}
                    packageVersion={this.props.packageVersion}
                    dependencyHelperCallback={MavenDependencyHelper.formatGroupNames}
                    isSmartDependenciesEnabled={this.props.isSmartDependenciesEnabled}
                />
            </div>
        );
    }

    public static PreparePomLicenses(licenses: MavenContracts.MavenPomLicense[]): MavenContracts.MavenPomLicense[] {
        if (licenses && licenses.length) {
            // Licenses can be named or unnamed.
            // 1. Order licenses by name
            // 2. Emit named licenses first
            // 3. Emit unnamed licenses next as "License {n}"
            // 4. IF there is only one ununnamed license - call it "License"
            // Test cases:
            // * Single unnamed license -> "License"
            // * Two named licenses (A, B) and two unnamed licenses -> "A", "B", "License 3", "License 4"

            // Check special case for a single unnamed license
            if (licenses.length === 1) {
                let license = licenses[0];
                if (!license.name) {
                    license = _cloneLicense(license);
                    license.name = PackageResources.MavenDevelopment_Licence;
                }
                return [license];
            } else {
                const namedLicenses = licenses.filter(license => license.name).map(_cloneLicense);
                namedLicenses.sort((l1, l2) => Utils_String.localeComparer(l1.name, l2.name));

                let licenseCount = namedLicenses.length + 1;

                const unnamedLicenses = licenses.filter(license => !license.name).map(license => {
                    const clone = _cloneLicense(license);
                    clone.name = Utils_String.format(PackageResources.MavenDevelopment_LicencePrefix, licenseCount++);
                    return clone;
                });

                return namedLicenses.concat(unnamedLicenses);
            }
        }

        return licenses;
    }

    private _getBuildAttribute(ciManagement: MavenContracts.MavenPomCi): IProjectAttribute {
        return ciManagement
            ? {
                  iconClass: "bowtie-icon bowtie-build",
                  text: ciManagement.system || PackageResources.MavenDevelopment_ContinuousIntegration,
                  url: ciManagement.url,
                  onClickCiFeature: MavenCiConstants.BuildLinkClicked
              }
            : null;
    }

    private _getCodeAttribute(scm: MavenContracts.MavenPomScm): IProjectAttribute {
        return scm
            ? {
                  iconClass: "bowtie-icon bowtie-git",
                  text: scm.tag || PackageResources.MavenDevelopment_SourceControl,
                  url: scm.url,
                  onClickCiFeature: MavenCiConstants.CodeLinkClicked
              }
            : null;
    }

    private _getProjectAttributes(
        organization: MavenContracts.MavenPomOrganization,
        licenses: MavenContracts.MavenPomLicense[],
        issueManagement: MavenContracts.MavenPomIssueManagement
    ): IProjectAttribute[] {
        const projectAttributes: IProjectAttribute[] = [];

        if (organization) {
            projectAttributes.push({
                iconClass: "bowtie-icon bowtie-globe",
                text: organization.name || PackageResources.MavenDevelopment_OrganizationName,
                url: organization.url,
                onClickCiFeature: MavenCiConstants.OrganizationLinkClicked
            } as IProjectAttribute);
        }

        if (licenses.length > 0) {
            licenses.forEach(license => {
                projectAttributes.push({
                    iconClass: "bowtie-icon bowtie-script",
                    text: license.name,
                    url: license.url,
                    onClickCiFeature: MavenCiConstants.LicenseLinkClicked
                } as IProjectAttribute);
            });
        }

        if (issueManagement) {
            projectAttributes.push({
                iconClass: "bowtie-icon bowtie-file-bug",
                text: issueManagement.system || PackageResources.MavenDevelopment_IssueManagement,
                url: issueManagement.url,
                onClickCiFeature: MavenCiConstants.IssueLinkClicked
            } as IProjectAttribute);
        }

        return projectAttributes;
    }
}
