import * as React from "react";

import { Component, State } from "VSS/Flux/Component";

import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { PackageDependencies } from "Package/Scripts/Protocols/Components/PackageDependencies";
import { PackagePeople } from "Package/Scripts/Protocols/Components/PackagePeople";
import { PackageProvenance } from "Package/Scripts/Protocols/Components/PackageProvenance";
import { PackageTags } from "Package/Scripts/Protocols/Components/PackageTags";

export class SimpleOverviewAttributesPanel extends Component<IPackageDetailsProps, State> {
    public render(): JSX.Element {
        return (
            <div className="package-details-panel">
                <PackageProvenance
                    feed={this.props.feed}
                    packageId={this.props.packageSummary.id}
                    versionId={this.props.packageVersion.id}
                    publishDate={new Date(this.props.packageVersion.publishDate)}
                    isProvenanceEnabled={this.props.isProvenanceEnabled}
                    isProvenanceSupported={false}
                />
                {this.props.packageVersion.author && (
                    <PackagePeople authors={this.props.packageVersion.author.split(",")} />
                )}
                <PackageDependencies
                    feed={this.props.feed}
                    packageSummary={this.props.packageSummary}
                    packageVersion={this.props.packageVersion}
                    dependencyHelperCallback={null}
                    isSmartDependenciesEnabled={this.props.isSmartDependenciesEnabled}
                />
                <PackageTags tags={this.props.packageVersion.tags} />
            </div>
        );
    }
}
