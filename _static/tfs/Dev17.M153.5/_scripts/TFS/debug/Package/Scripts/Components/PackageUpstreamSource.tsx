import * as React from "react";

import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { findIndex } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { getPackageDetailsPageUrl } from "Package/Scripts/Helpers/UrlHelper";
import { NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { NuGetKey } from "Package/Scripts/Protocols/NuGet/Constants/NuGetConstants";
import * as PackageResources from "Feed/Common/Resources";
import { MinimalPackageVersion, Package, UpstreamSource, UpstreamSourceType } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IPackageUpstreamSourceProps extends Props {
    packageSummary: Package;
    packageVersion: MinimalPackageVersion;
    upstreamSources: UpstreamSource[];
}

export class PackageUpstreamSource extends Component<IPackageUpstreamSourceProps, State> {
    public render(): JSX.Element {
        return this._getUpstreamSourceElement();
    }

    private _getUpstreamSourceElement(): JSX.Element {
        const localSourceName = this._packageToLocalUpstreamSourceName();
        if (localSourceName != null) {
            return (
                <span
                    className="upstream-source-grid-cell"
                    aria-label={PackageResources.AriaLabel_PackageListItem_Upstream}
                >
                    {localSourceName}
                </span>
            );
        }

        const upstreamSource = this._packageToUpstreamSource();
        if (upstreamSource == null) {
            return (
                <span
                    className="upstream-source-grid-cell"
                    aria-label={PackageResources.AriaLabel_PackageListItem_Upstream}
                >
                    {PackageResources.FeedSources_Unknown}
                </span>
            );
        }

        if (upstreamSource.upstreamSourceType === UpstreamSourceType.Public) {
            return (
                <span
                    className="upstream-source-grid-cell"
                    aria-label={PackageResources.AriaLabel_PackageListItem_Upstream}
                >
                    {upstreamSource.name}
                </span>
            );
        }

        // Temporary while strategy to communicate with other accounts is figured out
        const collectionContext: HostContext = Service.VssConnection.getConnection().getWebContext().collection;
        if (Utils_String.equals(collectionContext.id, upstreamSource.internalUpstreamCollectionId, true) === false) {
            return (
                <span
                    className="upstream-source-grid-cell"
                    aria-label={PackageResources.AriaLabel_PackageListItem_Upstream}
                >
                    {upstreamSource.name}
                </span>
            );
        }

        const relativePkgUrl = getPackageDetailsPageUrl(
            upstreamSource.internalUpstreamFeedId,
            this.props.packageSummary,
            this.props.packageVersion.version
        );
        return (
            <TooltipHost content={upstreamSource.name} overflowMode={TooltipOverflowMode.Parent}>
                <Link href={relativePkgUrl} target={"_blank"}>
                    {upstreamSource.name}
                </Link>
            </TooltipHost>
        );
    }

    private _packageToLocalUpstreamSourceName(): string {
        if (
            this._isNpmOrNuGet(this.props.packageSummary.protocolType) === false ||
            this.props.packageVersion.directUpstreamSourceId == null
        ) {
            return PackageResources.FeedSources_Local;
        }

        return null;
    }

    private _packageToUpstreamSource(): UpstreamSource {
        if (this._isNpmOrNuGet(this.props.packageSummary.protocolType) === false) {
            return null;
        }

        let index: number = -1;
        if (this.props.packageVersion.directUpstreamSourceId == null) {
            return null;
        }

        if (this.props.upstreamSources == null || this.props.upstreamSources.length === 0) {
            return null;
        }

        index = findIndex(this.props.upstreamSources, (upstreamSource: UpstreamSource) => {
            return Utils_String.equals(upstreamSource.id, this.props.packageVersion.directUpstreamSourceId, true);
        });

        if (index > -1) {
            return this.props.upstreamSources[index];
        }

        return null;
    }

    private _isNpmOrNuGet(protocolType: string): boolean {
        return (
            Utils_String.equals(protocolType, NuGetKey, true) === true ||
            Utils_String.equals(protocolType, NpmKey, true) === true
        );
    }
}
