import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import * as Url from "VSS/Utils/Url";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { IProjectAttribute } from "Package/Scripts/Protocols/Components/PackageDevelopment";
import { MavenCiConstants } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Maven/MavenDevelopment";

import * as PackageResources from "Feed/Common/Resources";

export interface IMavenDevelopmentProps extends Props {
    buildAttribute?: IProjectAttribute;
    codeAttribute?: IProjectAttribute;
    projectAttributes?: IProjectAttribute[];
}

export class MavenDevelopment extends Component<IMavenDevelopmentProps, State> {
    public render(): JSX.Element {
        if (!this.showDevelopment()) {
            return null;
        }

        const { buildAttribute, codeAttribute, projectAttributes } = this.props;

        return (
            <div className="maven-development">
                <PackageAttribute title={PackageResources.MavenAttributes_DevelopmentTitle}>
                    {buildAttribute &&
                        buildAttribute.text && (
                            <div>
                                <div className="package-group-header">
                                    {PackageResources.MavenDevelopment_BuildHeading}
                                </div>
                                <div className="package-attribute-item" key={"build"}>
                                    <span className={"package-attribute-item-icon " + buildAttribute.iconClass} />
                                    {Url.isSafeProtocol(buildAttribute.url || "") ? (
                                        <ExternalLink
                                            href={Utils_String.htmlEncode(buildAttribute.url)}
                                            ciContext={MavenCiConstants.MavenDevelopment}
                                            onClick={() =>
                                                CustomerIntelligenceHelper.publishEvent(buildAttribute.onClickCiFeature)
                                            }
                                        >
                                            {buildAttribute.text}
                                            <span className="bowtie-icon bowtie-navigate-external" />
                                        </ExternalLink>
                                    ) : (
                                        <span className="project-attibute-text">{buildAttribute.text}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    {codeAttribute &&
                        codeAttribute.text && (
                            <div>
                                <div className="package-group-spacer" />
                                <div className="package-group-header">
                                    {PackageResources.MavenDevelopment_CodeHeading}
                                </div>
                                <div className="package-attribute-item" key={"code"}>
                                    <span className={"package-attribute-item-icon " + codeAttribute.iconClass} />
                                    {Url.isSafeProtocol(codeAttribute.url || "") ? (
                                        <ExternalLink
                                            href={Utils_String.htmlEncode(codeAttribute.url)}
                                            ciContext={MavenCiConstants.MavenDevelopment}
                                            onClick={() =>
                                                CustomerIntelligenceHelper.publishEvent(codeAttribute.onClickCiFeature)
                                            }
                                        >
                                            {codeAttribute.text}
                                            <span className="bowtie-icon bowtie-navigate-external" />
                                        </ExternalLink>
                                    ) : (
                                        <span className="project-attibute-text">{codeAttribute.text}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    {projectAttributes &&
                        projectAttributes.length > 0 && (
                            <div>
                                <div className="package-group-spacer" />
                                <div className="package-group-header">
                                    {PackageResources.MavenDevelopment_ProjectHeading}
                                </div>
                                {projectAttributes.map((projectAttribute: IProjectAttribute, index: number) => {
                                    return (
                                        <div className="package-attribute-item" key={index}>
                                            <span
                                                className={"package-attribute-item-icon " + projectAttribute.iconClass}
                                            />
                                            {Url.isSafeProtocol(projectAttribute.url || "") ? (
                                                <ExternalLink
                                                    href={Utils_String.htmlEncode(projectAttribute.url)}
                                                    ciContext={MavenCiConstants.MavenDevelopment}
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
                                                <span className="project-attibute-text">{projectAttribute.text}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                </PackageAttribute>
            </div>
        );
    }
    private showDevelopment(): boolean {
        return (
            (this.props.buildAttribute != null && this.props.buildAttribute.text != null) ||
            (this.props.codeAttribute != null && this.props.codeAttribute.text != null) ||
            (this.props.projectAttributes != null && this.props.projectAttributes.length > 0)
        );
    }
}
