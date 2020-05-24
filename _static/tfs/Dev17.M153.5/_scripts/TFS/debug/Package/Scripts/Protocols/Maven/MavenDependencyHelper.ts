import * as PackageResources from "Feed/Common/Resources";
import { IDependencyGroup } from "Feed/Common/Types/IDependency";

export class MavenDependencyHelper {
    public static formatGroupNames(dependencyGroups: IDependencyGroup[]): void {
        for (const dependencyGroup of dependencyGroups) {
            dependencyGroup.group = MavenDependencyHelper._getMavenGroupName(dependencyGroup.group);
        }
    }

    private static _getMavenGroupName(group: string): string {
        if (group === "compile") {
            return PackageResources.MavenDependencies_CompileFriendly;
        } else if (group === "test") {
            return PackageResources.MavenDependencies_TestFriendly;
        } else if (group === "runtime") {
            return PackageResources.MavenDependencies_RuntimeFriendly;
        } else if (group === "system") {
            return PackageResources.MavenDependencies_SystemFriendly;
        } else if (group === "provided") {
            return PackageResources.MavenDependencies_ProvidedFriendly;
        } else if (group === "import") {
            return PackageResources.MavenDependencies_ImportFriendly;
        }

        return group;
    }
}
