import { MinimalPackageVersion, Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class PackageModifiedCache {
    public static packageModifiedCache: IDictionaryStringTo<MinimalPackageVersion> = {};

    public static applyCacheByPackageList(packages: Package[]): Package[] {
        for (let packageSummary of packages) {
            if (packageSummary) {
                packageSummary = this.applyCacheByPackage(packageSummary);
            }
        }

        return packages;
    }

    public static applyCacheByPackage(packageSummary: Package): Package {
        const versions = packageSummary.versions;
        for (const version in versions) {
            if (versions.hasOwnProperty(version)) {
                versions[version] = this.applyCacheByPackageVersion(versions[version]);
            }
        }

        return packageSummary;
    }

    public static applyCacheByPackageVersion(packageVersion: MinimalPackageVersion): MinimalPackageVersion {
        const version = PackageModifiedCache.packageModifiedCache[packageVersion.id];
        if (version) {
            if (!version.packageDescription && packageVersion.packageDescription) {
                version.packageDescription = packageVersion.packageDescription;
            }
            return version;
        } else {
            return packageVersion;
        }
    }
}
