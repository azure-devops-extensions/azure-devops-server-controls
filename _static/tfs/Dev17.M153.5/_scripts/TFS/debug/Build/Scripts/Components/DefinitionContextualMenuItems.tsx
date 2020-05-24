/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import * as Build_Actions from "Build/Scripts/Actions/Actions";
import { DefinitionContextualMenuitemsActionHub } from "Build/Scripts/Actions/DefinitionContextualMenuItems";
import { getDefinition } from "Build/Scripts/Actions/DefinitionsActionCreator";
import * as FolderManageDialog_Component_NO_REQUIRE from "Build/Scripts/Components/FolderManageDialog";
import { renderLazyComponentIntoDom } from "Build/Scripts/Components/LazyRenderedDomComponent";
import * as SaveDefinitionDialog_NO_REQUIRE from "Build/Scripts/Components/SaveDefinitionDialog";
import { FavoriteStoreNames, UserActions, WellKnownClassNames, CIOptinConstants } from "Build/Scripts/Constants";
import { vssLWPPageContext } from "Build/Scripts/Context";
import * as DeleteDialog_NO_REQUIRE from "Build/Scripts/Controls.DeleteDefinitionDialog";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { FavoriteTeamInfo } from "Build/Scripts/Favorites";
import * as DefinitionDashboardMenuItemProvider_NO_REQUIRE from "Build/Scripts/MenuItemProviders/DefinitionDashboard";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { showDefinitionSecurityDialog, hasDefinitionPermission } from "Build/Scripts/Security";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { DefinitionFavoritesActionCreator } from "Build/Scripts/Stores/DefinitionFavorites";
import { getQueueStatusHandler } from "Build/Scripts/QueueStatus";
import * as Utils from "Build/Scripts/Utilities/Utils";

import { IdentityRef } from "VSS/WebApi/Contracts";

import { BuildPermissions, ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { BuildLinks } from "Build.Common/Scripts/Linking";

import { BuildDefinitionReference, Folder, BuildDefinition } from "TFS/Build/Contracts";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import * as Dialogs_NO_REQUIRE from "VSS/Controls/Dialogs";
import { logError, logInfo } from "VSS/Diag";
import { CommonActions, getService as getEventActionService } from "VSS/Events/Action";
import { getCollectionService } from "VSS/Service";
import * as UserClaimsService from "VSS/User/Services";
import { using } from "VSS/VSS";

import { getLWPModule } from "VSS/LWP";
const FPS = getLWPModule("VSS/Platform/FPS");

class SingletonVariables {
    public static DefinitionSource: DefinitionSource = null;
}

function getDefinitionSource() {
    if (!SingletonVariables.DefinitionSource) {
        SingletonVariables.DefinitionSource = getCollectionService(DefinitionSource);
    }

    return SingletonVariables.DefinitionSource;
}

export function getCloneDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition)) {
        return {
            key: UserActions.CloneDefinition,
            name: BuildResources.CloneDefinitionMenuItemText,
            iconProps: { className: "bowtie-icon bowtie-clone" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                const cloneDefinitionUrl = BuildLinks.getCloneDefinitionUrl(definition.id);
                FPS.onClickFPS(vssLWPPageContext, cloneDefinitionUrl, true, ev);
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getExportDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition)) {
        return {
            key: UserActions.ExportDefinition,
            name: BuildResources.ExportDefinitionMenuItemText,
            iconProps: { className: "bowtie-icon bowtie-transfer-upload" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                getDefinition(getDefinitionSource(), definition.id).then((definitionResult) => {
                    let definitionJson = JSON.stringify(definitionResult);
                    if (definitionResult.process && definitionResult.process.type === ProcessType.Yaml) {
                        var error: TfsError = {
                            name: "ExportYamlDefinitionNotSupported",
                            message: BuildResources.ExportYamlDefinitionIsNotSupported
                        };
                        raiseTfsError(error);
                    }
                    else {
                        let definitionName = definitionResult.name;
                        Utils.downloadAsJsonFile(definitionJson, definitionName);
                    }
                });
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getDeleteDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.DeleteBuildDefinition)) {
        return {
            key: UserActions.DeleteDefinition,
            name: BuildResources.BuildDetailViewDeleteDefinition,
            iconProps: { className: "bowtie-icon bowtie-edit-delete" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                using(["VSS/Controls/Dialogs", "Build/Scripts/Controls.DeleteDefinitionDialog"], (_Dialogs: typeof Dialogs_NO_REQUIRE, _DeleteDialog: typeof DeleteDialog_NO_REQUIRE) => {
                    _Dialogs.show(_DeleteDialog.DeleteDefinitionDialog, {
                        name: definition.name,
                        isDraft: !!definition.draftOf,
                        okCallback: () => {
                            getDefinitionSource().deleteDefinition(definition);
                        }
                    });
                });
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getEditDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    // if the user is anonymous, they won't get the url because they can't see the route. in this case we don't render the menu item
    const editUrl = BuildLinks.getEditDefinitionUrl(definition.id);

    if (!!editUrl) {
        const hasEditPermission = hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition);

        return {
            key: UserActions.EditDefinition,
            name: hasEditPermission ? BuildResources.EditDefinitionMenuItemText : BuildResources.ViewDefinitionMenuItemText,
            iconProps: { className: "bowtie-icon bowtie-edit" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                const editDefinitionUrl = BuildLinks.getEditDefinitionUrl(definition.id);
                if (editDefinitionUrl) {
                    FPS.onClickFPS(vssLWPPageContext, editDefinitionUrl, true, ev);
                }
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getEnableDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition)) {
        return {
            key: UserActions.EnableDefinition,
            name: BuildResources.ResumeText,
            iconProps: { className: "bowtie-icon bowtie-play-resume" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definitionReference = item.data as BuildDefinitionReference;
                getQueueStatusHandler().enableDefinition(definitionReference.id);
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getFavoriteMenuItems(definition: BuildDefinitionReference, userId: string, userTeams: IdentityRef[], currentFavoriteOwners: string[]): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];
    
    let isMyFavorite = false;
    for (let i = 0; i < currentFavoriteOwners.length; i++) {
        if (userId === currentFavoriteOwners[i]) {
            isMyFavorite = true;
            break;
        }
    }

    if (!isMyFavorite) {
        items.push({
            key: UserActions.AddToMyFavorites,
            name: PresentationResources.AddToMyFavoritesTitle,
            iconProps: { className: "bowtie-icon bowtie-favorite" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                DefinitionFavoritesActionCreator.addDefinitionToFavorites(definition, userId);
            }
        });
    }
    else {
        items.push({
            key: UserActions.RemoveFromMyFavorites,
            name: PresentationResources.RemoveFromMyFavoritesTitle,
            iconProps: { className: "bowtie-icon bowtie-favorite-outline" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                DefinitionFavoritesActionCreator.removeDefinitionFromFavorites(definition, userId);
            }
        });
    }

    let addTeamItems: IContextualMenuItem[] = [];
    let removeTeamItems: IContextualMenuItem[] = [];

    // for each team
        // if definition is a favorite for that team, add remove entry to removeTeamItems
        // else, add an add entry to addTeamItems
    if (userTeams) {
        userTeams.forEach((teamInfo: IdentityRef) => {
            let isTeamFavorite = false;
            for (let i = 0; i < currentFavoriteOwners.length; i++) {
                if (teamInfo.id === currentFavoriteOwners[i]) {
                    isTeamFavorite = true;
                    break;
                }
            }

            let teamShortName = teamInfo.displayName;
            let lastSeparator = teamShortName.lastIndexOf("\\");
            if (lastSeparator >= 0) {
                teamShortName = teamShortName.substring(lastSeparator + 1);
            }

            if (isTeamFavorite) {
                removeTeamItems.push({
                    key: UserActions.RemoveFromTeamFavorites + teamInfo.displayName,
                    name: teamShortName,
                    data: definition,
                    onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                        let definition = item.data as BuildDefinitionReference;
                        DefinitionFavoritesActionCreator.removeDefinitionFromFavorites(definition, teamInfo.id);
                    }
                });
            }
            else {
                addTeamItems.push({
                    key: UserActions.AddToTeamFavorites + teamInfo.displayName,
                    name: teamShortName,
                    data: definition,
                    onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                        let definition = item.data as BuildDefinitionReference;
                        DefinitionFavoritesActionCreator.addDefinitionToFavorites(definition, teamInfo.id);
                    }
                });
            }
        });
    }

    if (addTeamItems.length > 0) {
        items.push({
            key: UserActions.AddToTeamFavorites,
            name: PresentationResources.AddToTeamFavoritesTitle,
            iconProps: { className: "bowtie-icon bowtie-favorite" },
            subMenuProps: {
                items: addTeamItems
            }
        });
    }

    if (removeTeamItems.length > 0) {
        items.push({
            key: UserActions.RemoveFromTeamFavorites,
            name: PresentationResources.RemoveFromTeamFavoritesTitle,
            iconProps: { className: "bowtie-icon bowtie-favorite-outline" },
            subMenuProps: {
                items: removeTeamItems
            }
        });
    }

    return items;
}

export function getMoveDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition)) {
        return {
            key: UserActions.MoveDefinition,
            name: BuildResources.MoveBuildDefinitionText,
            iconProps: { className: "bowtie-icon bowtie-folder" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                let props: FolderManageDialog_Component_NO_REQUIRE.IFolderManageDialogProps = {
                    title: BuildResources.BuildSelectFolderLabel,
                    showDialogActions: false,
                    okManageDialogCallBack: (result) => {
                        getDefinitionSource().updateDefinitionPath(definition.id, result.path);
                    },
                    showDialog: true
                };

                // since props have a callback with data bounded to the row, we would need to re-render each time so send "false"
                renderLazyComponentIntoDom(
                    WellKnownClassNames.AllDefinitionsFolderMoveDialog,
                    ["Build/Scripts/Components/FolderManageDialog"],
                    props,
                    (m: typeof FolderManageDialog_Component_NO_REQUIRE) => m.FolderManageDialog,
                    null,
                    false);
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getPauseDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition)) {
        return {
            key: UserActions.PauseDefinition,
            name: BuildResources.PauseText,
            iconProps: { className: "bowtie-icon bowtie-status-pause-outline" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definitionReference = item.data as BuildDefinitionReference;
                getQueueStatusHandler().pauseDefinition(definitionReference.id);
            }
        } as IContextualMenuItem;
    } else {
        return null;
    }
}

export function getRenameDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition)) {
        return {
            key: UserActions.RenameDefinition,
            name: BuildResources.RenameDefinitionMenuItemText,
            iconProps: { className: "bowtie-icon bowtie-edit-rename" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;

                if (definition.draftOf) {
                    logError("Contextual Menu option for Rename should never be loaded for Draft Definitions.");
                    return;
                }

                let props: SaveDefinitionDialog_NO_REQUIRE.ISaveDefinitionDialogProps = {
                    showDialog: true,
                    definitionId: definition.id,
                    hideFolderPicker: true
                };

                renderLazyComponentIntoDom(
                    WellKnownClassNames.RenameDefinitionDialog,
                    ["Build/Scripts/Components/SaveDefinitionDialog"],
                    props,
                    (m: typeof SaveDefinitionDialog_NO_REQUIRE) => m.SaveDefinitionDialog,
                    null,
                    false);
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getSaveDefinitionAsTemplateMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition)) {
        return {
            key: UserActions.SaveDefinitionAsTemplate,
            name: BuildResources.SaveTemplateDefinitionLabel,
            iconProps: { className: "bowtie-icon bowtie-save-as" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let definition = item.data as BuildDefinitionReference;
                let props: SaveDefinitionDialog_NO_REQUIRE.ISaveDefinitionDialogProps = {
                    showDialog: true,
                    definitionId: definition.id
                };

                renderLazyComponentIntoDom(
                    WellKnownClassNames.SaveDefinitionDialog,
                    ["Build/Scripts/Components/SaveDefinitionDialog"],
                    props,
                    (m: typeof SaveDefinitionDialog_NO_REQUIRE) => m.SaveAsTemplateDefinitionDialog,
                    null,
                    false);
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getViewDefinitionMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {

    return {
        key: UserActions.ViewDefinition,
        name: BuildResources.ViewDefinitionSummary,
        iconProps: { className: "bowtie-icon bowtie-navigate-forward-circle" },
        data: definition,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            const definition = item.data as BuildDefinitionReference;
            FPS.onClickFPS(vssLWPPageContext, BuildLinks.getDefinitionLink(definition.id), true, ev);
        }
    } as IContextualMenuItem;
}

export function getViewDefinitionSecurityMenuItem(definition: BuildDefinitionReference): IContextualMenuItem {
    const userClaimsService = UserClaimsService.getService();
    const isMember: boolean = userClaimsService.hasClaim(UserClaimsService.UserClaims.Member);
    if (isMember) {
        return {
            key: UserActions.ViewDefinitionSecurity,
            name: PresentationResources.ItemSecurityTitle,
            iconProps: { className: "bowtie-icon bowtie-security" },
            data: definition,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                showDefinitionSecurityDialog(item.data as BuildDefinitionReference);
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}

export function getAsyncDashboardMenuItem(definition: BuildDefinitionReference, actionHub: DefinitionContextualMenuitemsActionHub) {
    using(["Build/Scripts/MenuItemProviders/DefinitionDashboard"], (_DefinitionDashboardMenuItemProvider: typeof DefinitionDashboardMenuItemProvider_NO_REQUIRE) => {
        _DefinitionDashboardMenuItemProvider.getSingleton().getAsyncMenuItem(definition, (item) => {
            actionHub.itemsAdded.invoke([item]);
        });
    });
}