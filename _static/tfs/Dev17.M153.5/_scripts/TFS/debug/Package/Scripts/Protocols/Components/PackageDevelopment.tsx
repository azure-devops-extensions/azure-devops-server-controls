import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Url from "VSS/Utils/Url";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { PackageUpstreamSource } from "Package/Scripts/Components/PackageUpstreamSource";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { MinimalPackageVersion, Package, UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackageDevelopment";

import { CiConstants } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

export interface IPackageDevelopmentProps extends Props {
    /**
     * Project attributes specified by each protocol
     */
    projectAttributes: IProjectAttribute[];
    /**
     * Selected package
     */
    packageSummary: Package;
    /**
     * Selected package version
     */
    packageVersion: MinimalPackageVersion;
    /**
     * List of all upstream sources
     */
    upstreamSources?: UpstreamSource[];
}

export interface IProjectAttribute {
    iconClass: string;
    url?: string;
    onClickCiFeature?: string;
    text: string;
}

export class PackageDevelopment extends Component<IPackageDevelopmentProps, State> {
    public render(): JSX.Element {
        if (!this.showDevelopment()) {
            return null;
        }

        return (
            <div className="package-development">
                <PackageAttribute title={PackageResources.PackageAttributeTitle_Development}>
                    {this.props.upstreamSources && (
                        <div>
                            <div className="package-group-header">{PackageResources.PackageSource}</div>
                            <div className="package-attribute-item">
                                <span className="bowtie-icon bowtie-packages package-attribute-item-icon" />
                                <PackageUpstreamSource
                                    packageSummary={this.props.packageSummary}
                                    packageVersion={this.props.packageVersion}
                                    upstreamSources={this.props.upstreamSources}
                                />
                            </div>
                        </div>
                    )}
                    {this.props.projectAttributes &&
                        this.props.projectAttributes.length > 0 && (
                            <div>
                                <div className="package-group-spacer" />
                                <div className="package-group-header">
                                    {PackageResources.PackageDevelopment_ProjectTitle}
                                </div>
                                {this.props.projectAttributes.map(
                                    (projectAttribute: IProjectAttribute, index: number) => {
                                        return (
                                            <div className="package-attribute-item" key={index}>
                                                <span
                                                    className={
                                                        "package-attribute-item-icon " + projectAttribute.iconClass
                                                    }
                                                />
                                                {Url.isSafeProtocol(projectAttribute.url || "") ? (
                                                    <ExternalLink
                                                        href={projectAttribute.url}
                                                        ciContext={CiConstants.PackageDevelopment}
                                                        onClick={() =>
                                                            CustomerIntelligenceHelper.publishEvent(
                                                                projectAttribute.onClickCiFeature
                                                            )
                                                        }
                                                    >
                                                        {projectAttribute.text}
                                                        <span className="bowtie-icon bowtie-navigate-external" />
                                                    </ExternalLink>
                                                ) : (
                                                    <div className="project-attibute-text">{projectAttribute.text}</div>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                </PackageAttribute>
            </div>
        );
    }

    private showDevelopment(): boolean {
        return (
            this.props.upstreamSources != null ||
            (this.props.projectAttributes && this.props.projectAttributes.length > 0)
        );
    }
}
