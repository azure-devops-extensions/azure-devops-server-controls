import * as DefinitionContextualMenuItems from "Build/Scripts/Components/DefinitionContextualMenuItems";
import * as CreateFolderDialog_Component_NO_REQUIRE from "Build/Scripts/Components/CreateFolderDialog";
import * as DeleteFolderDialog_Component_NO_REQUIRE from "Build/Scripts/Components/DeleteFolderDialog";
import * as RenameFolderDialog_Component_NO_REQUIRE from "Build/Scripts/Components/RenameFolderDialog";
import { renderLazyComponentIntoDom } from "Build/Scripts/Components/LazyRenderedDomComponent";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { getDivider, getQueueNewBuildMenuItem } from "Build/Scripts/ContextualMenuItems";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { UserActions } from "Build/Scripts/Constants";
import { FavoriteDefinitionInfo } from "Build/Scripts/Favorites";
import { Sources } from "Build/Scripts/Telemetry";

import { canUseFavorites } from "Favorites/FavoritesService";

import {
    BuildDefinitionReference,
    DefinitionQuality,
    DefinitionQueueStatus
} from "TFS/Build/Contracts";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { IColumn } from "OfficeFabric/DetailsList";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { getService as getEventService } from "VSS/Events/Services";

namespace ListColumnKeys {
    export const LastBuilt = "lastBuilt";
    export const ModifiedBy = "modifiedBy";
    export const CurrentActivity= "currentActivity"
}


export function getDefinitionContextualMenuItems(definition: BuildDefinitionReference, favoriteInfo: FavoriteDefinitionInfo): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];

    if (!definition) {
        return items;
    }

    items.push(getQueueNewBuildMenuItem(definition, Sources.AllDefinitions));

    items.push(DefinitionContextualMenuItems.getMoveDefinitionMenuItem(definition));
    items.push(DefinitionContextualMenuItems.getViewDefinitionMenuItem(definition));
    items.push(DefinitionContextualMenuItems.getEditDefinitionMenuItem(definition));

    if (definition.queueStatus === DefinitionQueueStatus.Enabled) {
        items.push(DefinitionContextualMenuItems.getPauseDefinitionMenuItem(definition));
    }
    else { // This could apply to definitions that are disabled as well.
        items.push(DefinitionContextualMenuItems.getEnableDefinitionMenuItem(definition));
    }

    items.push(getDivider(1));

    if (canUseFavorites()) {
        items = items.concat(DefinitionContextualMenuItems.getFavoriteMenuItems(definition, favoriteInfo.userId, favoriteInfo.userTeams, favoriteInfo.favoriteOwnerIds));
        items.push(getDivider(2));
    }

    items.push(DefinitionContextualMenuItems.getCloneDefinitionMenuItem(definition));
    items.push(DefinitionContextualMenuItems.getExportDefinitionMenuItem(definition));

    if (definition.quality !== DefinitionQuality.Draft) {
        items.push(DefinitionContextualMenuItems.getRenameDefinitionMenuItem(definition));
    }

    items.push(DefinitionContextualMenuItems.getSaveDefinitionAsTemplateMenuItem(definition));

    items.push(getDivider(3));

    items.push(DefinitionContextualMenuItems.getDeleteDefinitionMenuItem(definition));

    items.push(getDivider(4));

    items.push(DefinitionContextualMenuItems.getViewDefinitionSecurityMenuItem(definition));

    items.push(getDivider(5));

    return items;
}

export function getFolderContextualMenuItems(path: string, description?: string): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];
    // Todo: introduce message bar to handle errors instead of read ugly box, and also success callbacks...

    items.push({
        key: "CreateFolder",
        name: BuildResources.CreateSubFolderText,
        iconProps: { className: "bowtie-icon bowtie-math-plus-light" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            let props: CreateFolderDialog_Component_NO_REQUIRE.ICreateFolderDialogProps = {
                path: item.data,
                showDialog: true,
                errorCallBack: raiseTfsError
            };

            renderLazyComponentIntoDom(
                "alldefinitions_folderow_createFolder",
                ["Build/Scripts/Components/CreateFolderDialog"],
                props,
                (m: typeof CreateFolderDialog_Component_NO_REQUIRE) => m.CreateFolderDialog,
                null,
                false);
        }
    } as IContextualMenuItem);

    items.push({
        key: "RenameFolder",
        name: BuildResources.RenameFolderText,
        iconProps: { className: "bowtie-icon bowtie-edit-rename" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            let props: RenameFolderDialog_Component_NO_REQUIRE.IRenameFolderDialogProps = {
                path: item.data,
                description: description,
                showDialog: true,
                errorCallBack: raiseTfsError
            };

            renderLazyComponentIntoDom(
                "alldefinitions_folderow_renameFolder",
                ["Build/Scripts/Components/RenameFolderDialog"],
                props,
                (m: typeof RenameFolderDialog_Component_NO_REQUIRE) => m.RenameFolderDialog,
                null,
                false);
        }
    } as IContextualMenuItem);

    items.push({
        key: "DeleteFolder",
        name: BuildResources.DeleteFolderText,
        iconProps: { className: "bowtie-icon bowtie-edit-delete" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            let props: DeleteFolderDialog_Component_NO_REQUIRE.IDeleteFolderDialogProps = {
                path: item.data,
                showDialog: true,
                errorCallBack: raiseTfsError
            };

            renderLazyComponentIntoDom(
                "alldefinitions_folderow_deleteFolder",
                ["Build/Scripts/Components/DeleteFolderDialog"],
                props,
                (m: typeof DeleteFolderDialog_Component_NO_REQUIRE) => m.DeleteFolderDialog,
                null,
                false);
        }
    } as IContextualMenuItem);

    items.push({
        key: "FolderSecurity",
        name: PresentationResources.ItemSecurityTitle,
        iconProps: { className: "bowtie-icon bowtie-security" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            getEventService().fire(UserActions.ViewFolderSecurity, this, path);
        }
    } as IContextualMenuItem);

    return items;
}


export function getSearchColumns(): IColumn[] {
    let columns: IColumn[] = [
            {
                key: BuildResources.BuildPathLabel,
                name: BuildResources.BuildPathLabel,
                fieldName: BuildResources.BuildPathLabel,
                minWidth: 300,
                isResizable: false
            }
    ];
    return columns;
}

export function getColumns(): IColumn[] {
    let columns: IColumn[] = [
            {
                key: BuildResources.FavoritesText,
                name: "",
                fieldName: BuildResources.FavoritesText,
                minWidth: 100,
                isResizable: true,
                maxWidth: 100
            },
            {
                key: ListColumnKeys.CurrentActivity,
                name: BuildResources.CurrentActivity,
                fieldName: ListColumnKeys.CurrentActivity,
                maxWidth: 150,
                minWidth: 150,
                className: "queued-column",
                headerClassName: "queued-column",
                isResizable: true
            },
            {
                key: ListColumnKeys.ModifiedBy,
                name: BuildResources.LastUpdatedText,
                fieldName: ListColumnKeys.ModifiedBy,
                minWidth: 300,
                isResizable: true,
                maxWidth: 400
            },
            {
                key: ListColumnKeys.LastBuilt,
                name: BuildResources.LastBuiltText,
                fieldName: ListColumnKeys.LastBuilt,
                minWidth: 200,
                isResizable: false,
                maxWidth: 400
            }
        ];

        return columns;
}