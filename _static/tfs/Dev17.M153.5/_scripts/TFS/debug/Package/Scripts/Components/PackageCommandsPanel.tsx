import * as React from "react";

import { CommandButton } from "OfficeFabric/Button";
import { CommandBar } from "OfficeFabric/components/CommandBar/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { Component, Props, State } from "VSS/Flux/Component";

import * as CommandGetters from "Package/Scripts/Helpers/CommandGetters";
import { ContextualMenuItemsGetter } from "Package/Scripts/Helpers/PackageCommandToContextMenuItem";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/PackageCommandsPanel";

import * as PackageResources from "Feed/Common/Resources";
import { IPackageFollowState } from "Feed/Common/Types/IPackageFollowState";

export interface IPackageCommandsPanelProps extends Props {
    feed: Feed;
    selectedPackage: Package;
    selectedVersion: PackageVersion;
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    packageFollowState: IPackageFollowState;
}

export class PackageCommandsPanel extends Component<IPackageCommandsPanelProps, State> {
    public render(): JSX.Element {
        let packageCommandContextMenuItems: IContextualMenuItem[] = [];

        if (this.props.selectedPackage && this.props.selectedVersion && !this.props.selectedVersion.isDeleted) {
            const protocol: IPackageProtocol = this.props.protocolMap[this.props.selectedPackage.protocolType];
            const packageCommandsGetter: CommandGetters.PackageCommandsGetter = new CommandGetters.PackageCommandsGetter();
            const contextItemsGetter: ContextualMenuItemsGetter = new ContextualMenuItemsGetter();
            const commands: IPackageCommand[] = packageCommandsGetter.getSingleSelectionItems(
                this.props.feed,
                protocol,
                this.props.selectedPackage,
                this.props.selectedVersion,
                false
            );
            packageCommandContextMenuItems = contextItemsGetter.GetContextMenuItems(commands);

            const followContextMenuItem: IContextualMenuItem = contextItemsGetter.GetFollowContextualMenuItem(
                this.props.packageFollowState.isPackageFollowed,
                this.props.packageFollowState.isFollowStateLoaded
            );
            packageCommandContextMenuItems.push(followContextMenuItem);
        }

        return (
            <div className="package-commands-panel" aria-label={PackageResources.AriaLabel_PackageCommands}>
                {packageCommandContextMenuItems.length > 0 &&
                    (packageCommandContextMenuItems.length === 1 ? (
                        <CommandButton
                            className={packageCommandContextMenuItems[0].className}
                            onClick={() =>
                                packageCommandContextMenuItems[0].onClick(null, packageCommandContextMenuItems[0])
                            }
                            iconProps={packageCommandContextMenuItems[0].iconProps}
                            ariaLabel={packageCommandContextMenuItems[0].ariaLabel}
                            text={packageCommandContextMenuItems[0].name}
                        />
                    ) : (
                        <CommandBar
                            isSearchBoxVisible={false}
                            elipisisAriaLabel={PackageResources.PackageCommands_AriaLabel}
                            items={packageCommandContextMenuItems}
                            className="package-commands-area"
                        />
                    ))}
            </div>
        );
    }
}
