import { Props } from "VSS/Flux/Component";

import { FeedView, Package, PackageVersion, PackageMetrics } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";

export interface IPackageDetailsProps extends Props {
    feed: Feed;
    packageSummary: Package;
    packageVersion: PackageVersion;
    protocol: IPackageProtocol;
    packageMetrics?: PackageMetrics;
    feedViews?: FeedView[];
    experiments?: IDictionaryStringTo<boolean>;
    isSmartDependenciesEnabled?: boolean;
    isProvenanceEnabled?: boolean;
}
