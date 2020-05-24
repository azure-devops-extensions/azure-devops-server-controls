import * as React from "react";

import { LinkBase } from "OfficeFabric/components/Link/Link.base";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { Action } from "VSS/Flux/Action";
import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { VssDetailsListTitleCell } from "VSSUI/VssDetailsList";

import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import * as PackageResources from "Feed/Common/Resources";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/PackageNameGridCell";

export interface IPackageNameGridCellProps extends Props {
    feedName: string;
    pkg: Package;
    protocol: IPackageProtocol;
    actions: { [key: string]: Action<{}> };
    packageHref: string;
    isRecycleBin?: boolean;
}

export class PackageNameGridCell extends Component<IPackageNameGridCellProps, State> {
    public render(): JSX.Element {
        const ariaLabel: string = Utils_String.format(
            PackageResources.AriaLabel_PackageList_PackageDetailsLink,
            this.props.pkg.name,
            this.props.protocol.name
        );

        return (
            <VssDetailsListTitleCell
                ariaLabel={ariaLabel}
                onRenderPrimaryText={() => {
                    return (
                        <TooltipHost content={this.props.pkg.name} overflowMode={TooltipOverflowMode.Parent}>
                            <Link
                                className={"package-name-link"}
                                href={this.props.packageHref}
                                onClick={(event: React.MouseEvent<LinkBase>) => {
                                    // allow browser's default behavior of Ctrl+Click to open package in new tab
                                    if (event.ctrlKey) {
                                        return;
                                    }
                                    event.preventDefault();
                                    this.props.actions.PackageSelected.invoke(this.props.pkg);
                                }}
                            >
                                {this.props.pkg.name}
                            </Link>
                        </TooltipHost>
                    );
                }}
                onRenderSecondaryText={() => {
                    // We don't want to display version when on recycle bin page
                    if (this.props.isRecycleBin) {
                        return;
                    }
                    return !this.props.pkg.versions[0].isListed || this.props.pkg.versions[0].isDeleted ? (
                        <div className={"package-version version-strikethrough"}>
                            {Utils_String.format(
                                PackageResources.PackageVersionTitle,
                                this.props.pkg.versions[0].version
                            )}
                        </div>
                    ) : (
                        <div className="package-version">
                            {Utils_String.format(
                                PackageResources.PackageVersionTitle,
                                this.props.pkg.versions[0].version
                            )}
                        </div>
                    );
                }}
                iconProps={this.props.protocol.vssIconProps}
            />
        );
    }
}
