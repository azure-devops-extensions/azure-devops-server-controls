import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export function getAllNonDeletedPackageVersions(packages: Package[]): Package[] {
    // removing package versions from the list which are restored or permanently deleted
    for (let i = 0; i < packages.length; i++) {
        for (let j = 0; j < packages[i].versions.length; j++) {
            if (!packages[i].versions[j].isDeleted) {
                packages[i].versions.splice(j, 1);
                j--;
            }
        }
        if (packages[i].versions.length === 0) {
            packages.splice(i, 1);
            i--;
        }
    }
    return packages;
}
