import { SupportedProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import {
    CreateBadgeCommand,
    FollowPackageCommand,
    UnfollowPackageCommand
} from "Package/Scripts/Protocols/Common/PackageCommands";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { IPackageFollowState } from "Package/Scripts/Types/IPackageFollowState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { PackageCommandIds } from "Feed/Common/Constants/Constants";

export interface ICommandsGetter<T> {
    getSingleSelectionItems(
        feed: Feed,
        protocolHelper: IPackageProtocol,
        packageO: Package,
        packageVersion: PackageVersion,
        viaPackageList: boolean
    ): T[];

    getMultipleSelectionItems(
        feed: Feed,
        protocolMap: IDictionaryStringTo<IPackageProtocol>,
        selectedPackages: Package[]
    ): T[];

    getFollowItem(followState: IPackageFollowState): T;
}

export class PackageCommandsGetter implements ICommandsGetter<IPackageCommand> {
    public getSingleSelectionItems(
        feed: Feed,
        protocolHelper: IPackageProtocol,
        packageO: Package,
        packageVersion: PackageVersion,
        viaPackageList: boolean
    ): IPackageCommand[] {
        const singlePackageCommands = protocolHelper.getPackageCommands(packageO, packageVersion, feed, viaPackageList);

        if (feed.badgesEnabled === true) {
            singlePackageCommands.push(new CreateBadgeCommand());
        }

        return singlePackageCommands;
    }

    public getMultipleSelectionItems(
        feed: Feed,
        protocolMap: IDictionaryStringTo<IPackageProtocol>,
        selectedPackages: Package[]
    ): IPackageCommand[] {
        if (selectedPackages.length === 0) {
            return [];
        }

        if (selectedPackages.length === 1) {
            const firstPkg: Package = selectedPackages[0];
            return this.getSingleSelectionItems(
                feed,
                protocolMap[firstPkg.protocolType],
                firstPkg,
                firstPkg.versions[0] as PackageVersion,
                false
            );
        }

        const selectedPackagesProtocolHelpers: IDictionaryStringTo<IPackageProtocol> = {};
        selectedPackages.forEach((pkg: Package) => {
            selectedPackagesProtocolHelpers[pkg.protocolType] = protocolMap[pkg.protocolType];
        });

        let supportedCommands: number = SupportedProtocolCommands;
        const packageCommands: IPackageCommand[] = [];

        Object.keys(selectedPackagesProtocolHelpers).forEach((protocol: string) => {
            const protocolHelper: IPackageProtocol = selectedPackagesProtocolHelpers[protocol];
            const commands: IPackageCommand[] = protocolHelper.getMultiSelectPackageCommands(
                feed,
                selectedPackages,
                null
            );

            packageCommands.push(...commands);

            // filter out unsupported commands
            // tslint:disable-next-line:no-bitwise
            supportedCommands = supportedCommands & protocolHelper.supportedCommandsMask;
        });

        const filteredPacakgeCommands: IPackageCommand[] = [];
        const alreadyAdded: IDictionaryNumberTo<string> = {};
        let deleteCommandExists: boolean = false;
        const unpublishIndices: number[] = [];

        packageCommands.forEach((command: IPackageCommand) => {
            // tslint:disable-next-line:no-bitwise
            const commandIsSupported = (supportedCommands & command.protocolCommand) === command.protocolCommand;
            const existingCommandId: string = alreadyAdded[command.protocolCommand];

            if (commandIsSupported && (!existingCommandId || existingCommandId !== command.id)) {
                // if ids are different it's a command with all-versions/latest-version options

                // making sure we are not getting both delete and unpublish commands on mixed protocols
                if (command.id.indexOf(PackageCommandIds.Delete) !== -1) {
                    deleteCommandExists = true;

                    if (unpublishIndices.length > 0) {
                        unpublishIndices.forEach((index: number) => {
                            filteredPacakgeCommands.splice(index, 1);
                        });
                    }
                } else if (command.id.indexOf(PackageCommandIds.Unpublish) !== -1) {
                    if (deleteCommandExists) {
                        return;
                    }

                    unpublishIndices.push(filteredPacakgeCommands.length);
                }

                alreadyAdded[command.protocolCommand] = command.id;
                filteredPacakgeCommands.push(command);
            }
        });

        return filteredPacakgeCommands;
    }

    public getFollowItem(followState: IPackageFollowState): IPackageCommand {
        const followStateLoading = followState.isFollowStateLoaded === false;
        return followState.isPackageFollowed
            ? new UnfollowPackageCommand(followStateLoading)
            : new FollowPackageCommand(followStateLoading);
    }
}
