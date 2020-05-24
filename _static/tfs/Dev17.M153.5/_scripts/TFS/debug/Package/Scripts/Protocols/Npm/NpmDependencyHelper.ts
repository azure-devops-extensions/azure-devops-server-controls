import * as PackageResources from "Feed/Common/Resources";
import { IDependencyGroup } from "Feed/Common/Types/IDependency";

export class NpmDependencyHelper {
    public static formatGroupNames(dependencyGroups: IDependencyGroup[]): void {
        for (const dependencyGroup of dependencyGroups) {
            dependencyGroup.group = NpmDependencyHelper._getNpmGroupName(dependencyGroup.group);
        }
    }

    private static _getNpmGroupName(group: string): string {
        if (group === "peerDependencies") {
            return PackageResources.NpmDependencies_PeerDependenciesFriendly;
        } else if (group === "devDependencies") {
            return PackageResources.NpmDependencies_DevDependenciesFriendly;
        } else if (group === "optionalDependencies") {
            return PackageResources.NpmDependencies_OptionalDependenciesFriendly;
        } else if (group === "bundleDependencies") {
            return PackageResources.NpmDependencies_BundledDependenciesFriendly;
        } else if (group === "bundledDependencies") {
            return PackageResources.NpmDependencies_BundledDependenciesFriendly;
        }

        return group;
    }
}
