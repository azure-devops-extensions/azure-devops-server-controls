import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import VCUIContracts = require("TFS/VersionControl/UIContracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCChangeListNavigatorChangeExplorer = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorer");
import VCChangeListNavigatorChangeExplorerGrid = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid");
import VCChangedFilesContextMenuItems = require("VersionControl/Scripts/ChangedFilesContextMenuItems");
import {ChangeExplorerItemType} from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";

import domElem = Utils_UI.domElem;

export class ChangeExplorerGridHelper {

    private _grid: VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid;

    constructor(grid: VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid) {
        this._grid = grid;
    }

    public getGrid(): VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid {
        return this._grid;
    }

    public setGridSource(keepSelection: boolean, keepExpandStates: boolean) {
        this.getGrid().setGridSource(keepSelection, keepExpandStates);
    }

    public createGridItemForChange(change: VCLegacyContracts.Change, parentItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {

        let gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem = this.createGridItemForPath(this.getGridItemPath(change), parentItem);

        gridItem.change = change;
        gridItem.displayName = this.getChangeText(gridItem.name, change);
        gridItem.tooltip = this.getChangeTooltip(change);

        gridItem.iconCss = this.getGridItemIconCss(change);
        gridItem.type = this.getGridItemType(change);
        gridItem.getContributionContext = this._getContributionContextFunc(change);

        return gridItem;
    }

    private _getContributionContextFunc(change): () => VCUIContracts.ChangeListSourceItemContext {
        let changeListModel = this._grid.getChangeListModel();
        return (): VCUIContracts.ChangeListSourceItemContext => {
            return <VCUIContracts.ChangeListSourceItemContext>{
                change: {
                    changeType: change.changeType,
                    item: change.item
                },
                changeList: VCOM.LegacyConverters.convertChangeList(changeListModel)
            };
        };
    }

    public getGridItemPath(change: VCLegacyContracts.Change) {
        return change.item.serverItem;
    }

    public createGridItemForPath(path: string, parentItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        return <VCChangeListNavigatorChangeExplorer.ChangeExplorerItem> {
            type: ChangeExplorerItemType.Folder,
            displayName: path,
            tooltip: path,
            path: path,
            parentFolder: VersionControlPath.getFolderName(path),
            name: VersionControlPath.getFileName(path),
            iconCss: "type-icon bowtie-icon bowtie-folder",
            parentItem: parentItem
        };
    }

    public createGridItemsGroupsByFolders(rootGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, changeGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]): VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] {
        let allGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = [],
            folderChangeByPath: { [path: string]: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem; } = {},
            changeItemsByParentPath: { [parentPath: string]: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]; } = {},
            allParentPaths: string[] = [];

        // Sort initial grid items
        changeGridItems.sort((item1: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, item2: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            return Utils_String.localeIgnoreCaseComparer(item1.name, item2.name);
        });

        // Build a hash of items by parent folder
        $.each(changeGridItems, (i: number, changeGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            let parentKey = this.getParentKey(changeGridItem),
                pathKey: string,
                changesForPath: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[];

            if (changeGridItem.type === ChangeExplorerItemType.Folder) {
                pathKey = this.getPathLookupKey(changeGridItem.path);
                folderChangeByPath[pathKey] = changeGridItem;
            }
            else {
                changesForPath = changeItemsByParentPath[parentKey];

                if (!changesForPath) {
                    allParentPaths.push(changeGridItem.parentFolder);
                    changesForPath = [];
                    changeItemsByParentPath[parentKey] = changesForPath;
                }
                changesForPath.push(changeGridItem);
            }
        });

        // Sort the parent folders
        allParentPaths.sort((parentPath1: string, parentPath2: string) => {
            return Utils_String.localeIgnoreCaseComparer(parentPath1, parentPath2);
        });

        // Add entries for each folder, followed by all its child items
        $.each(allParentPaths, (i: number, parentPath: string) => {
            let lookupKey = this.getPathLookupKey(parentPath),
                folderItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

            if (Utils_String.localeIgnoreCaseComparer(parentPath, rootGridItem.path) !== 0) {
                folderItem = folderChangeByPath[lookupKey];
                if (folderItem) {
                    folderItem.displayName = this.getChangeText(folderItem.path.substr(rootGridItem.path.length), folderItem.change);
                }
                else {
                    folderItem = this.createGridItemForPath(parentPath, null);
                    folderItem.displayName = folderItem.path.substr(rootGridItem.path.length);
                }
                if (folderItem.displayName.length > 1 && folderItem.displayName[0] === "/") {
                    folderItem.displayName = folderItem.displayName.substr(1);
                }
                allGridItems.push(folderItem);
            }

            let changeItemsByPath: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = changeItemsByParentPath[lookupKey];
            if (changeItemsByPath) {
                $.each(changeItemsByPath, (i: number, changeItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
                    if (folderItem) {
                        changeItem.parentItem = folderItem;
                    }
                    else {
                        changeItem.parentItem = rootGridItem;
                    }
                    allGridItems.push(changeItem);
                });
            }
        });

        return allGridItems;
    }

    public getChangeText(displayName: string, change: VCLegacyContracts.Change) {
        let decoration = VCOM.ChangeType.getDecorationText(change.changeType, true);
        if (decoration) {
            return displayName + " [" + decoration + "]";
        }
        else {
            return displayName;
        }
    }

    public getChangeTooltip(change: VCLegacyContracts.Change) {
        let tooltip = change.item.serverItem + " [" + VCOM.ChangeType.getDisplayText(change.changeType) + "]";
        if (change.sourceServerItem && VCOM.ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Rename)) {
            tooltip += "\r\n\r\n" + Utils_String.format(VCResources.RenamedFromFormat, change.sourceServerItem);
        }
        return tooltip;
    }

    public drawChangeItemCellContents(rowInfo: any, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        let $cell: JQuery,
            $treeSign: JQuery,
            $textElement: JQuery,
            textIndent = 0,
            iconCss = gridItem.iconCss,
            $iconContainer: JQuery;

        // Create the container cell
        $cell = $(domElem("div", "grid-cell"))
            .css("width", "100%")
            .attr("title", gridItem.tooltip || "");

        $cell.addClass(this.getCellCssClass(gridItem.type));

        // Create the expand/collapase icon (if needed)
        if (level > 0) {
            textIndent = (level - 1) * 16;
            $cell.css("padding-left", textIndent + "px");

            textIndent += 18;
            $treeSign = $(domElem("div", "icon")).appendTo($(domElem("span")).appendTo($cell));

            $treeSign.addClass(this.getTreeSignCssClass(gridItem, expandedState));
        }

        // Create the row icon (if needed)
        if (gridItem.type === ChangeExplorerItemType.DiscussionComment) {
            $iconContainer = $(domElem("span", "grid-icon")).appendTo($cell);
            textIndent += 18;
        }
        else if (iconCss) {
            $iconContainer = $(domElem("span", "grid-icon")).appendTo($cell);
            $(domElem("div", "icon " + gridItem.iconCss)).appendTo($iconContainer);
            textIndent += 18;
        }

        // Add the display text
        $textElement = $(domElem("div", "display-text"))
            .text(gridItem.displayName || " ")
            .appendTo($cell);

        if (textIndent > 0) {
            $textElement.css("left", textIndent + "px");
        }

        // Set custom classes on the row
        if (gridItem.change) {
            if (VCOM.ChangeType.hasChangeFlag(gridItem.change.changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
                $cell.addClass("change-type-delete");
            }
        }

        return $cell;
    }

    public getCellCssClass(changeType: ChangeExplorerItemType) {
        let cssClass: string;
        switch (changeType) {
            case ChangeExplorerItemType.Folder:
                cssClass = "folder-item";
                break;

            case ChangeExplorerItemType.File:
                cssClass = "file-item";
                break;

            case ChangeExplorerItemType.DiscussionComment:
                cssClass = "discussion-item";
                break;

            case ChangeExplorerItemType.InformationMessage:
                cssClass = "message-item";
                break;
        }

        return cssClass;
    }

    public getTreeSignCssClass(gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, expandedState: number) {
        if (expandedState > 0) {
            return "grid-tree-icon icon-visible-on-hover bowtie-icon bowtie-chevron-down";
        }
        else if (expandedState < 0) {
            return "grid-tree-icon icon-visible-on-hover bowtie-icon bowtie-chevron-right";
        }
    }

    public getContextMenuItems(contextInfo) {
        let menuItems: any[] = [],
            gridItem = <VCChangeListNavigatorChangeExplorer.ChangeExplorerItem>contextInfo.item;

        switch (gridItem.type) {
            case ChangeExplorerItemType.File:
            case ChangeExplorerItemType.Folder:
                menuItems = VCChangedFilesContextMenuItems.ChangedFilesContextMenuItems.getContextMenuItems(
                    this.getGrid().getRepositoryContext(),
                    gridItem.path,
                    this.getGrid().getChangeListModel(),
                    gridItem.change,
                    this.getGrid().getDiscussionManager());

                break;

            case ChangeExplorerItemType.DiscussionComment:
                if (this.getGrid().getDiscussionManager()) {
                    menuItems.push({
                        id: "delete-discussion-comment",
                        text: VCResources.DeleteCommentAction,
                        icon: "bowtie-icon bowtie-edit-remove",
                        disabled: !gridItem.discussionComment.isEditable,
                        arguments: {
                            discussionManager: this.getGrid().getDiscussionManager(),
                            threadId: gridItem.discussionComment.threadId,
                            commentId: gridItem.discussionComment.id
                        }
                    });
                }
                break;
        }

        return menuItems;
    }

    public onMenuItemClick(e?): any {
        let command = e.get_commandName(),
            selectedItem = <VCChangeListNavigatorChangeExplorer.ChangeExplorerItem>this.getGrid().getRowData(this.getGrid().getSelectedDataIndex()),
            change: VCLegacyContracts.Change;

        if (selectedItem) {
            change = selectedItem.change;
            return VCChangedFilesContextMenuItems.ChangedFilesContextMenuItems.handleMenuItemClick(
                command,
                this.getGrid().getRepositoryContext(),
                change ? change.item.serverItem : (selectedItem.path || ""),
                this.getGrid().getChangeListModel(),
                change,
                this.getGrid()._options.handleSourceControlActionInExplorerContext);
        }
    }

    public getGridItemIconCss(change: VCLegacyContracts.Change): string {
        throw new Error('getGridItemIconCss is abstract and must be overriden by derived class');
    }

    public getGridItemType(change: VCLegacyContracts.Change): ChangeExplorerItemType {
        throw new Error('getGridItemType is abstract and must be overriden by derived class');
    }

    public getParentKey(gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem): string {
        throw new Error('getParentKey is abstract and must be overriden by derived class');
    }

    public getPathLookupKey(path: string): string {
        throw new Error('getPathLookupKey is abstract and must be overriden by derived class');
    }

    public getAfterToggleEventName(): string {
        throw new Error('getAfterToggleEventName is abstract and must be overriden by derived class');
    }
}
