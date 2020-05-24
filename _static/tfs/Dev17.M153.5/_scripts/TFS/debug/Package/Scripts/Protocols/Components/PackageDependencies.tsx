import * as React from "react";

import { LinkBase } from "OfficeFabric/components/Link/Link.base";
import { Link } from "OfficeFabric/Link";

import { Component, Props } from "VSS/Flux/Component";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IPackageDependencySelectedPayload } from "Package/Scripts/Common/ActionPayloads";
import { DependencyHelper } from "Package/Scripts/Helpers/DependencyHelper";
import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { Feed, Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackageDependencies";

import * as PackageResources from "Feed/Common/Resources";
import { IDependencyGroup } from "Feed/Common/Types/IDependency";

export interface IPackageDependenciesProps extends Props {
    feed: Feed;
    packageSummary: Package;
    packageVersion: PackageVersion;
    dependencyHelperCallback: Function;
    isSmartDependenciesEnabled?: boolean;
}

export interface IPackageDependenciesState extends Props {
    dependencyGroups: IDependencyGroup[];
}

export class PackageDependencies extends Component<IPackageDependenciesProps, IPackageDependenciesState> {
    private _mounted: boolean;

    constructor(props: IPackageDependenciesProps) {
        super(props);
        let depGroups = null;

        depGroups = this.props.packageVersion
            ? DependencyHelper.groupDependencies(this.props.packageVersion.dependencies)
            : null;
        this.props.dependencyHelperCallback ? this.props.dependencyHelperCallback(depGroups) : null;

        // Load state with standard list of dependencies first
        this.state = {
            dependencyGroups: depGroups
        } as IPackageDependenciesState;

        this._mounted = false;
    }

    public componentDidMount(): void {
        this._mounted = true;
        let depGroups = null;
        if (this.props.packageVersion.dependencies && this.props.isSmartDependenciesEnabled === true) {
            (async () => {
                var packageDependencies = await DependencyHelper.getDependenciesForPackageVersionAsync(
                    this.props.feed.id,
                    this.props.packageSummary.id,
                    this.props.packageVersion.id,
                    this.props.packageSummary.protocolType
                );
                if (this._mounted === true && packageDependencies) {
                    depGroups = DependencyHelper.groupDependencyDetails(
                        packageDependencies,
                        this.props.feed.name,
                        this.props.packageSummary.protocolType
                    );
                    this.props.dependencyHelperCallback ? this.props.dependencyHelperCallback(depGroups) : null;
                    this.setState({
                        dependencyGroups: depGroups
                    });
                }
            })();
        }
    }

    public componentWillUnmount(): void {
        this._mounted = false;
    }

    public render(): JSX.Element {
        return (
            <div className="package-dependencies">
                <PackageAttribute title={PackageResources.PackageDependencies_Title}>
                    {this.state.dependencyGroups &&
                        this.state.dependencyGroups.map((dependencyGroup: IDependencyGroup) => {
                            return (
                                <div key={"DependencyGroupSection_" + dependencyGroup.group}>
                                    {this.state.dependencyGroups.length > 0 ? (
                                        <div className="package-group-header" key={dependencyGroup.group}>
                                            {dependencyGroup.group}
                                        </div>
                                    ) : null}
                                    {dependencyGroup.dependencies.map(dependency => {
                                        return dependency.packageId != null ? (
                                            <div
                                                className="package-dependency"
                                                key={dependency.name + dependency.versionRange}
                                            >
                                                <Link
                                                    onClick={(event: React.MouseEvent<LinkBase>) => {
                                                        // allow browser's default behavior of Ctrl+Click to open dependency in new tab
                                                        if (event.ctrlKey) {
                                                            return;
                                                        }
                                                        event.preventDefault();
                                                        Actions.PackageDependencySelected.invoke({
                                                            dependency: dependency,
                                                            originPackage: this.props.packageSummary
                                                        } as IPackageDependencySelectedPayload);
                                                    }}
                                                    href={dependency.link}
                                                >
                                                    {dependency.name}
                                                </Link>
                                                {" " + dependency.versionRange}
                                            </div>
                                        ) : (
                                                <div
                                                    className="package-dependency"
                                                    key={dependency.name + dependency.versionRange}
                                                >
                                                    {dependency.name + " " + dependency.versionRange}
                                                </div>
                                            );
                                    })}
                                    <div className="package-group-spacer" />
                                </div>
                            );
                        })}
                </PackageAttribute>
            </div>
        );
    }
}
