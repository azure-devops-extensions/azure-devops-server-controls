/// <reference types="react" />
/// <reference types="react-dom" />

import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as React from "react";
import { BranchMenuActions, IStateless } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { Spacer } from "VersionControl/Scenarios/Shared/RefTree/Spacer";
import { FolderName } from "VersionControl/Scenarios/Shared/RefTree/RefFolderName";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as Branch from "VersionControl/Scenarios/Branches/Actions/Branch";
import { createWithPermissions, SecureCommandCreator } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { getBowtieIconProps } from "VersionControl/Scenarios/Shared/IconUtils";
import { GitRefFavorite, RefFavoriteType } from "TFS/VersionControl/Contracts";
import * as PopupMenu from "Presentation/Scripts/TFS/Components/PopupMenu";
import * as Menus from "VSS/Controls/Menus";
import { FavoriteStatus } from "VersionControl/Scenarios/Branches/Components/FavoriteStatus";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { getMyBranchNames, BranchRowActions } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as VSS_Events from "VSS/Events/Services";
import Events_Handlers = require("VSS/Events/Handlers");
import * as Utils_String from "VSS/Utils/String";

export interface FolderNameColumnProperties {
    depth: number;
    name: string;
    expanded: boolean;
    expanding: boolean;
    highlightText: string;
    expandHandler(): void;
    fullname: string;
    favorite: GitRefFavorite;
    permissions: BranchPermissions;
}

/**
 * Renders the Folder column with a name, favorite status, and menu
 */
export class FolderNameColumn extends React.Component<FolderNameColumnProperties, IStateless> {
    public render() {
        return (
            <span className="branches-name-cell-with-contextual-menu">
                <FolderName key={"F" + this.props.fullname}
                    depth={this.props.depth}
                    name={this.props.name}
                    fullname={this.props.fullname}
                    expanded={this.props.expanded}
                    expanding={this.props.expanding}
                    highlightText={this.props.highlightText}
                    expandHandler={this.props.expandHandler} />
                <FavoriteStatus name={this.props.fullname}
                    isUserCreated={false}
                    isDefault={false}
                    type={RefFavoriteType.Folder}
                    isCompare={false}
                    favorite={this.props.favorite}
                    canFavorite={this.props.permissions.updateFavorites}
                    canDelete={this.props.permissions.deleteBranch} />
            </span>
        );
    }
}

export interface FolderEllipsisMenuProperties {
    fullName: string;
    favorite: GitRefFavorite;
    permissions: BranchPermissions;
}

export function getFolderCommandsInContextMenu(options: FolderEllipsisMenuProperties): IContextualMenuItem[] {
    return createWithPermissions(menuItemCreators, options.permissions, options);
}

export function hasPermissionToAnyFolderCommand(permissions: BranchPermissions): boolean {
    return menuItemCreators.some(item => item.hasPermission(permissions));
}

const menuItemCreators: SecureCommandCreator<BranchPermissions, FolderEllipsisMenuProperties>[] = [
    {
        hasPermission: permissions => permissions.updateFavorites,
        getCommand: options => {
            return options.favorite && {
                key: BranchMenuActions.Remove_Favorite,
                ariaLabel: BranchResources.RemoveFavoriteMenuItemText,
                name: BranchResources.RemoveFavoriteMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieFavoriteOutline),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Remove_Favorite,
                        { favorite: options.favorite }));
                }
            };
        }
    },
    {
        hasPermission: permissions => permissions.updateFavorites,
        getCommand: options => {
            return !options.favorite && {
                key: BranchMenuActions.Add_Favorite,
                name: BranchResources.AddFavoriteMenuItemText,
                ariaLabel: BranchResources.AddFavoriteMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieFavorite),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Add_Favorite,
                        { name: options.fullName, type: RefFavoriteType.Folder }));
                }
            };
        }
    },
    {
        hasPermission: permissions => permissions.viewBranchPolicies,
        getCommand: options => {
            if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessPolicyBranchPoliciesHub, false)) {
                // New branch policy page supports policies on branch folders; old page does not
                return {
                    key: BranchMenuActions.BranchPolicies,
                    name: BranchResources.BranchPoliciesMenuItemText,
                    ariaLabel: BranchResources.BranchPoliciesMenuItemText,
                    iconProps: getBowtieIconProps(Constants.bowtiePolicy),
                    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                        VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.BranchPolicies,
                            { branchName: options.fullName + "/*" }));
                    }
                };
            }
        }
    },
];
