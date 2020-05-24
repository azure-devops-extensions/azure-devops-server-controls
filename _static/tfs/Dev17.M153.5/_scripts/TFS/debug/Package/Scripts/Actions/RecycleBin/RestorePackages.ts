import { findIndex } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import { IMultiCommandPayload } from "Package/Scripts/Common/ActionPayloads";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

// This class updates the feed store state based on recycle bin operations.
export class RestorePackages {
    // This method updates the value of 'isDeleted' and 'isListed' in feed store for restore operation.
    public static handlePackagesRestoredToFeedAction(payload: IMultiCommandPayload, packagesInFeed: Package[]): void {
        if (payload.selectedVersions == null || payload.selectedPackages[0] == null) {
            return;
        }
        const index = findIndex(packagesInFeed, (pkg: Package) =>
            Utils_String.equals(pkg.id, payload.selectedPackages[0].id, true)
        );

        if (index === -1) {
            return;
        }

        const packageMap: { [id: string]: PackageVersion } = {};
        packagesInFeed[index].versions.forEach((version: PackageVersion) => {
            packageMap[version.id] = version;
        });
        payload.selectedVersions.forEach((payloadVersion: PackageVersion) => {
            if (payloadVersion.id in packageMap) {
                packageMap[payloadVersion.id].isDeleted = false;
                packageMap[payloadVersion.id].isListed = true;
            }
        });
    }
}
