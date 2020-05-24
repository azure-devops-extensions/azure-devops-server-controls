import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { IPackageFollowState } from "Package/Scripts/Types/IPackageFollowState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, Package, PackageMetrics, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/PackageVersionDetails";

import * as PackageResources from "Feed/Common/Resources";

export interface IPackageVersionDetailsProps extends Props {
    feed: Feed;
    feedViews: FeedView[];
    selectedPackage: Package;
    packageVersion: PackageVersion;
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    packageFollowState: IPackageFollowState;
    isPackageModifiedLoading: boolean;
    packageMetrics: PackageMetrics;
    isSmartDependenciesEnabled: boolean;
    isProvenanceEnabled: boolean;
}

export class PackageVersionDetails extends Component<IPackageVersionDetailsProps, State> {
    public render(): JSX.Element {
        const props = this.props;
        const protocol = props.protocolMap[props.selectedPackage.protocolType];
        const overviewContentPanel = protocol.getOverviewContentPanel(
            props.feed,
            props.feedViews,
            props.selectedPackage,
            props.packageVersion
        );
        const overviewAttributesPanel = protocol.getOverviewAttributesPanel(
            props.feed,
            props.selectedPackage,
            props.packageVersion,
            props.packageMetrics,
            props.isSmartDependenciesEnabled,
            props.isProvenanceEnabled
        );

        return (
            <div className="package-version-details">
                <LoadingContainer isLoading={props.isPackageModifiedLoading}>
                    <div className="package-details-content">
                        <section
                            className="package-overview-content"
                            aria-label={PackageResources.AriaLabel_PackageOverview}
                        >
                            {overviewContentPanel}
                        </section>
                        <section
                            className="package-overview-attributes"
                            aria-label={PackageResources.AriaLabel_PackageAttributes}
                        >
                            {overviewAttributesPanel}
                        </section>
                    </div>
                </LoadingContainer>
            </div>
        );
    }
}
