import { PackageCommandIds } from "Feed/Common/Constants/Constants";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import * as PackageResources from "Feed/Common/Resources";
import { RestorePackagesToFeedCommand } from "Package/Scripts/Protocols/Common/PackageCommands";

export class RestorePackageCommandHelper {
    public static getCommands(
        protocolType: string,
        selectedPackage?: Package,
        selectedVersions?: PackageVersion[],
        packageName?: string
    ): IPackageCommand[] {
        const packageCommands = new Array<IPackageCommand>();

        if (selectedVersions && selectedVersions.length === 1) {
            const commandName = PackageResources.PackageCommands_RestorePackage;
            packageCommands.push(
                new RestorePackagesToFeedCommand(
                    PackageCommandIds.RestoreToFeed,
                    commandName,
                    protocolType,
                    selectedVersions,
                    selectedPackage
                )
            );
        }

        return packageCommands;
    }
}
