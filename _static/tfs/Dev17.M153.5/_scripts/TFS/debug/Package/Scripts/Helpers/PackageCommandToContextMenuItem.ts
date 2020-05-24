import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { IconType, IIconProps } from "OfficeFabric/Icon";

import * as Utils_String from "VSS/Utils/String";

import { AllIdPrefix, SingleIdSuffix } from "Feed/Common/Constants/Constants";
import { FollowPackageCommand, UnfollowPackageCommand } from "Package/Scripts/Protocols/Common/PackageCommands";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";

export class ContextualMenuItemsGetter {
    public GetContextMenuItems(
        packageCommands: IPackageCommand[],
        versionString: string = null
    ): IContextualMenuItem[] {
        return this.mapToContextMenuItem(packageCommands, versionString);
    }

    public GetFollowContextualMenuItem(isPackageFollowed: boolean, isFollowStateLoaded: boolean): IContextualMenuItem {
        const followCommand = isPackageFollowed
            ? new UnfollowPackageCommand(!isFollowStateLoaded)
            : new FollowPackageCommand(!isFollowStateLoaded);
        return this.convertToContextMenuItem(followCommand);
    }

    public convertToContextMenuItem(packageCommand: IPackageCommand, version: string = null): IContextualMenuItem {
        let name = packageCommand.displayText;
        // If id has "-all" in it, it indicates delete all/unlist all/deprecate all - no reason to show version number
        if (
            version &&
            Utils_String.endsWith(packageCommand.id, AllIdPrefix) === false &&
            Utils_String.endsWith(packageCommand.id, SingleIdSuffix) === false
        ) {
            name += " " + version;
        }

        const menuItem: IContextualMenuItem = {
            key: packageCommand.id,
            name,
            iconProps: {
                iconType: IconType.default,
                iconName:
                    packageCommand.icon != null && Utils_String.startsWith(packageCommand.icon, "bowtie")
                        ? null
                        : packageCommand.icon,
                className: packageCommand.icon
            } as IIconProps,
            disabled: packageCommand.disabled,
            title: packageCommand.titleText,
            onClick: packageCommand.actionMethod
        };
        return menuItem;
    }

    public mapToContextMenuItem(packageCommands: IPackageCommand[], version: string = null): IContextualMenuItem[] {
        if (packageCommands == null) {
            return null;
        }

        const contextMenuItems: IContextualMenuItem[] = [];
        packageCommands.map((command: IPackageCommand) => {
            const menuItem = this.convertToContextMenuItem(command, version);
            contextMenuItems.push(menuItem);
        });
        return contextMenuItems;
    }
}
