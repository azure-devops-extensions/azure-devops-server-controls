import * as Utils_String from "VSS/Utils/String";

import * as PackageResources from "Feed/Common/Resources";
import { MinimalPackageVersion, Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export function buildAnnouncementPackageFilterResults(
    packages: Package[] | MinimalPackageVersion[],
    pageSize?: number
): string {
    if (!packages || packages.length === 0) {
        return PackageResources.PackageFilterResults_Announcement_NoResults;
    } else if (pageSize && packages.length === pageSize) {
        return Utils_String.format(PackageResources.PackageFilterResults_Announcement_PageSize, packages.length);
    } else if (packages.length === 1) {
        return PackageResources.PackageFilterResults_Announcement_One;
    } else {
        return Utils_String.format(PackageResources.PackageFilterResults_Announcement, packages.length);
    }
}

export function buildAnnouncementListedStatusChangedForPackage(packages: Package[], isListed: boolean): string {
    let announcement: string;
    if (packages.length === 1) {
        announcement = Utils_String.format(
            isListed === true
                ? PackageResources.PackageRelisted_Announcement_One
                : PackageResources.PackageUnlisted_Announcement_One,
            packages[0].name
        );
        return announcement;
    } else {
        announcement = Utils_String.format(
            isListed === true
                ? PackageResources.PackageRelisted_Announcement
                : PackageResources.PackageUnlisted_Announcement,
            packages.length
        );
        return announcement;
    }
}

export function buildAnnouncementListedStatusChangedForPackageVersion(
    versions: PackageVersion[],
    isListed: boolean
): string {
    let announcement: string;
    if (versions.length === 1) {
        announcement = Utils_String.format(
            isListed === true
                ? PackageResources.PackageRelisted_Announcement_Version_One
                : PackageResources.PackageUnlisted_Announcement_Version_One,
            versions[0].version
        );
        return announcement;
    } else {
        announcement = Utils_String.format(
            isListed === true
                ? PackageResources.PackageRelisted_Announcement_Version
                : PackageResources.PackageUnlisted_Announcement_Version,
            versions.length
        );
        return announcement;
    }
}
