/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { RootPath } from "Build.Common/Scripts/Security";

import { FolderRow } from "Build/Scenarios/Definitions/All/Components/FolderRow";
import { getStore, Store, IRow, IItemType } from "Build/Scenarios/Definitions/All/Stores/AllDefinitions";
import * as DefinitionContextualMenuItems from "Build/Scripts/Components/DefinitionContextualMenuItems";
import { DefinitionPopupContextualMenu, IDefinitionPopupContextualMenuProps } from "Build/Scripts/Components/DefinitionPopupContextualMenu";
import { DefinitionSummaryLink } from "Build/Scripts/Components/DefinitionSummaryLink";
import { FavoriteToggle } from "Build/Scripts/Components/FavoriteToggle";
import { getDivider, getQueueNewBuildMenuItem } from "Build/Scripts/ContextualMenuItems";
import { FavoriteDefinitionInfo } from "Build/Scripts/Favorites";
import { getPathData } from "Build/Scripts/Folders";
import { triggerEnterKeyHandler } from "Build/Scripts/ReactHandlers";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { Sources } from "Build/Scripts/Telemetry";

import { canUseFavorites } from "Favorites/FavoritesService";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import {
    BuildDefinitionReference,
    DefinitionQuality,
    DefinitionQueueStatus,
    Folder
} from "TFS/Build/Contracts";

export interface INameColumnProps {
    item: IRow;
    folderPath: string;
    onMoreDefinitionsClick: () => void;
    showFolderContext: boolean;
    showFavoriteToggle: boolean;
}

interface IAllDefinitionsContextualMenuData {
    isMyFavorite: boolean;
    isTeamFavorite: boolean;
    definition: BuildDefinitionReference;
    favoriteInfo: FavoriteDefinitionInfo;
}

export class NameColumn extends React.Component<INameColumnProps, {}> {

    public render(): JSX.Element {
        let itemRow = this.props.item;

        if (itemRow.isPending) {
            return <span>{BuildResources.Loading}</span>;
        }

        if (itemRow.itemType === IItemType.ShowMoreButton) {
            // render more button
            return <div className='show-more'><ShowMoreLinkComponent onClick={() => this.props.onMoreDefinitionsClick()}></ShowMoreLinkComponent></div>;
        }

        if (itemRow.itemType === IItemType.FolderUpButton) {
            // render folder up row
            let pathData = getPathData(this.props.folderPath);
            return <FolderRow key={RootPath} path={pathData.upLevelPath} folderIcon="bowtie-arrow-up" folderName="[..]" hidePopupMenu={true} />;
        }

        if (itemRow.itemType === IItemType.Folder) {
            let folder = itemRow.item as Folder;
            return <FolderRow path={folder.path} description={folder.description} />;
        }

        let definition = itemRow.item as BuildDefinitionReference;
        let definitionImageClass = "definition-node-icon";
        if (definition.quality === DefinitionQuality.Draft) {
            definitionImageClass = "definition-draft-node-icon"
        }
        let data = itemRow.data;

        let contextMenudata: IAllDefinitionsContextualMenuData = {
            isMyFavorite: data.isMyFavorite,
            isTeamFavorite: data.isTeamFavorite,
            definition: definition,
            favoriteInfo: data.favoriteInfo
        };

        const menuProps: ISmartPopupMenuProps = {
            data: contextMenudata
        };

        return <div>
            <div className={"build-definition-entry-definition-image " + definitionImageClass}></div>
            <div className="build-definition-entry-details">
                <DefinitionSummaryLink cssClass="summary-link" definition={definition} isFavDefinition={data.isMyFavorite} showFolderContext={this.props.showFolderContext} />
            </div>
            {this.props.showFavoriteToggle && <FavoriteToggle definition={definition} isMyFavorite={data.isMyFavorite} />}
            <SmartPopupMenu {...menuProps} />
        </div>;
    }
}

interface ISmartPopupMenuProps {
    data: IAllDefinitionsContextualMenuData;
}

class SmartPopupMenu extends React.Component<ISmartPopupMenuProps, {}> {
    public render(): JSX.Element {
        const props: IDefinitionPopupContextualMenuProps = {
            className: "popup-menu",
            iconClassName: "bowtie-ellipsis",
            getMenuItems: this._getItems,
            menuClassName: "build-popup-menu",
            contributionData: {
                contributionIds: ["ms.vss-build-web.build-definition-menu"],
                extensionContext: this.props.data.definition
            },
            definition: this.props.data.definition
        };

        return <DefinitionPopupContextualMenu {...props} />;
    }

    private _getItems = () => {
        return getAllDefinitionsContextualMenuItems(this.props.data);
    }
}

interface IShowMoreLinkProps {
    onClick: () => void;
}

class ShowMoreLinkComponent extends React.Component<IShowMoreLinkProps, {}> {

    public render(): JSX.Element {
        return <a onClick={this.props.onClick} onKeyDown={this._onKeyDown}>{BuildResources.ShowMoreLabel}</a>;
    }

    private _onKeyDown = (e) => {
        triggerEnterKeyHandler(e, this.props.onClick);
    }
}

function getAllDefinitionsContextualMenuItems(data: IAllDefinitionsContextualMenuData): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];

    if (!data.definition) {
        return items;
    }

    const queueNewBuildMenuItem = getQueueNewBuildMenuItem(data.definition, Sources.AllDefinitions);
    if (!!queueNewBuildMenuItem) {
        items.push(queueNewBuildMenuItem);
    }

    const moveDefinitionMenuItem = DefinitionContextualMenuItems.getMoveDefinitionMenuItem(data.definition);
    if (!!moveDefinitionMenuItem) {
        items.push(moveDefinitionMenuItem);
    }

    const viewDefinitionMenuItem = DefinitionContextualMenuItems.getViewDefinitionMenuItem(data.definition);
    if (!!viewDefinitionMenuItem) {
        items.push(viewDefinitionMenuItem);
    }

    const editDefinitionMenuItem = DefinitionContextualMenuItems.getEditDefinitionMenuItem(data.definition);
    if (!!editDefinitionMenuItem) {
        items.push(editDefinitionMenuItem);
    }

    if (data.definition.queueStatus === DefinitionQueueStatus.Enabled) {
        const pauseDefinitionMenuItem = DefinitionContextualMenuItems.getPauseDefinitionMenuItem(data.definition);
        if (!!pauseDefinitionMenuItem) {
            items.push(pauseDefinitionMenuItem);
        }
    }
    else { // This could apply to definitions that are disabled as well.
        const enableDefinitionMenuItem = DefinitionContextualMenuItems.getEnableDefinitionMenuItem(data.definition)
        if (!!enableDefinitionMenuItem) {
            items.push(enableDefinitionMenuItem);
        }
    }

    if (items.length > 0) {
        items.push(getDivider(1));
    }

    if (canUseFavorites()) {
        items = items.concat(DefinitionContextualMenuItems.getFavoriteMenuItems(data.definition, data.favoriteInfo.userId, data.favoriteInfo.userTeams, data.favoriteInfo.favoriteOwnerIds));
        items.push(getDivider(2));
    }

    const cloneDefinitionMenuItem = DefinitionContextualMenuItems.getCloneDefinitionMenuItem(data.definition);
    if (!!cloneDefinitionMenuItem) {
        items.push(cloneDefinitionMenuItem);
    }

    const exportDefinitionMenuItem = DefinitionContextualMenuItems.getExportDefinitionMenuItem(data.definition);
    if (!!exportDefinitionMenuItem) {
        items.push(exportDefinitionMenuItem);
    }

    const renameDefinitionMenuItem = DefinitionContextualMenuItems.getRenameDefinitionMenuItem(data.definition);
    if (data.definition.quality !== DefinitionQuality.Draft && renameDefinitionMenuItem) {
        items.push(renameDefinitionMenuItem);
    }

    const saveDefinitionAsTemplate = DefinitionContextualMenuItems.getSaveDefinitionAsTemplateMenuItem(data.definition);
    if (!!saveDefinitionAsTemplate) {
        items.push(saveDefinitionAsTemplate);
    }

    if (!!cloneDefinitionMenuItem || !!exportDefinitionMenuItem || !!renameDefinitionMenuItem || !!saveDefinitionAsTemplate) {
        items.push(getDivider(3));
    }

    const deleteDefinitionMenuItem = DefinitionContextualMenuItems.getDeleteDefinitionMenuItem(data.definition);
    if (!!deleteDefinitionMenuItem) {
        items.push(deleteDefinitionMenuItem);
        items.push(getDivider(4));
    }

    const viewDefinitionSecurityMenuItem = DefinitionContextualMenuItems.getViewDefinitionSecurityMenuItem(data.definition);
    if (!!viewDefinitionSecurityMenuItem) {
        items.push(viewDefinitionSecurityMenuItem);
        items.push(getDivider(5));
    }

    return items;
}
