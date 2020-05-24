/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import DiscussionContracts = require("CodeReview/Discussion/Contracts");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");

import Grids = require("VSS/Controls/Grids");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCChangeListNavigator = require("VersionControl/Scripts/Controls/ChangeListNavigator");
import VCChangeListNavigatorChangeExplorer = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorer");
import {ChangeExplorerItemType} from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";
import VCChangeListNavigatorChangeExplorerGridHelper = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGridHelper");
import VCChangeListNavigatorGitChangeExplorerGridHelper = require("VersionControl/Scripts/Controls/ChangeListNavigatorGitChangeExplorerGridHelper");
import VCChangeListNavigatorTfsChangeExplorerGridHelper = require("VersionControl/Scripts/Controls/ChangeListNavigatorTfsChangeExplorerGridHelper");
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";

import delegate = Utils_Core.delegate;

export interface ChangeExplorerGridModeChangedEventArgs {
    displayMode: VCWebAccessContracts.ChangeExplorerGridDisplayMode;
    commentsMode: VCWebAccessContracts.ChangeExplorerGridCommentsMode;
    displayModeChanged: boolean;
    commentsModeChanged: boolean;
}

interface ChangeExplorerGridTreeContainer {
    item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;
    children: ChangeExplorerGridTreeContainer[];
}

export class ChangeExplorerGrid extends Grids.GridO<any> {

    private static MAX_COMMENT_DISPLAY_LENGTH = 40;
    private static NO_SELECTION_INDEX = -1;

    private _repositoryContext: RepositoryContext;
    private _changeListNavigator: VCChangeListNavigator.ChangeListNavigator;
    private _changeListModel: VCLegacyContracts.ChangeList;

    private _displayMode: VCWebAccessContracts.ChangeExplorerGridDisplayMode;
    private _commentsMode: VCWebAccessContracts.ChangeExplorerGridCommentsMode;

    private _discussionManager: DiscussionOM.DiscussionManager;
    private _discussionUpdatedListener: any;

    private _gridItemsByPath: { [path: string]: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem; };
    private _discussionItemsById: { [id: string]: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem; };
    private _discussionIdToSelect: number;
    private _optionsChangedSinceLastRefresh: boolean;
    private _supressItemChangedEvent: boolean;
    private _expandFileDiscussions: boolean;

    private _changeExplorerGridHelper: VCChangeListNavigatorChangeExplorerGridHelper.ChangeExplorerGridHelper;

    public initializeOptions(options?: any) {
        options = $.extend({
            header: false,
            allowMultiSelect: false,
            useBowtieStyle: true,
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                executeAction: delegate(this, this._onMenuItemClick),
                contributionIds: ["ms.vss-code-web.source-item-menu", "ms.vss-code-web.change-list-item-menu"],
                columnIndex: "displayName",
                align: "right-bottom"
            },
            columns: <any[]>[{
                width: "100%",
                index: "displayName",
                getCellContents: delegate(this, this._drawChangeItemCellContents)
            }]
        }, options);

        options.cssClass = "vc-change-explorer-grid vc-hoverable" + (options.cssClass || "");

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();

        this._discussionUpdatedListener = delegate(this, this.onDiscussionCommentsUpdated);

        this._changeListNavigator = new VCChangeListNavigator.ChangeListNavigator();

        this._displayMode = VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesByFolder;
        this._commentsMode = VCWebAccessContracts.ChangeExplorerGridCommentsMode.Default;

        if (typeof this._options.initialDisplayMode !== "undefined") {
            this._displayMode = this._options.initialDisplayMode;
        }
        if (typeof this._options.initialCommentsMode !== "undefined") {
            this._commentsMode = this._options.initialCommentsMode;
        }

        this._expandFileDiscussions = this._options.expandFileDiscussionsByDefault === true;

        this._bind("selectionchanged", () => {
            if (!this._supressItemChangedEvent) {
                this.delayExecute("throttledSelectionChanged", 100, true, () => {
                    this._fire("change-explorer-selection-changed", this.getSelectedItem());
                });
            }
        });
    }

    public dispose() {
        super.dispose();

        if (this._discussionManager) {
            this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            this._discussionManager = null;
        }
    }

    public getChangeListNavigator() {
        return this._changeListNavigator;
    }

    public getDisplayMode() {
        return this._displayMode;
    }

    public getCommentsMode() {
        return this._commentsMode;
    }

    public getRepositoryContext() {
        return this._repositoryContext;
    }

    public getChangeListModel() {
        return this._changeListModel;
    }

    public getDiscussionManager() {
        return this._discussionManager;
    }

    public setDisplayOptions(displayMode: VCWebAccessContracts.ChangeExplorerGridDisplayMode, commentsMode?: VCWebAccessContracts.ChangeExplorerGridCommentsMode, skipRedraw: boolean = false, fireEvent: boolean = true) {
        let displayModeChanged = false,
            commentsModeChanged = false,
            keepExpandStates = true;

        if (typeof displayMode !== "undefined" && displayMode !== this._displayMode) {
            this._displayMode = displayMode;
            displayModeChanged = true;
            keepExpandStates = false;
        }

        if (typeof commentsMode !== "undefined" && commentsMode !== this._commentsMode) {
            this._commentsMode = commentsMode;
            commentsModeChanged = true;
            keepExpandStates = false;
        }

        if (displayModeChanged || commentsModeChanged) {
            if (!skipRedraw) {
                this.setGridSource(true, keepExpandStates);
            }
            else {
                this._optionsChangedSinceLastRefresh = true;
            }

            if (fireEvent) {
                this._fire("display-options-changed", <ChangeExplorerGridModeChangedEventArgs>{
                    displayMode: this._displayMode,
                    commentsMode: this._commentsMode,
                    displayModeChanged: displayModeChanged,
                    commentsModeChanged: commentsModeChanged
                });
            }
        }
    }

    public getExpandingFileDiscussionsState() {
        return this._expandFileDiscussions;
    }

    public setExpandingFileDiscussionsState(expandFileDiscussions: boolean) {
        if (this._expandFileDiscussions !== expandFileDiscussions) {
            this._expandFileDiscussions = expandFileDiscussions;
            this.setGridSource(true, false);
        }
    }

    public setChangeList(
        repositoryContext: RepositoryContext,
        changeListModel: VCLegacyContracts.ChangeList,
        discussionManager: DiscussionOM.DiscussionManager = null,
        keepSelection: boolean = false,
        keepExpandStates: boolean = false) {

        if (this._optionsChangedSinceLastRefresh ||
            this._repositoryContext !== repositoryContext ||
            this._changeListModel !== changeListModel ||
            this._discussionManager !== discussionManager) {

            if (this._discussionManager !== discussionManager) {
                if (this._discussionManager) {
                    this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
                }
                this._discussionManager = discussionManager;
                if (discussionManager) {
                    this._discussionManager.addDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
                }
            }

            let repositoryChanged = false;
            if (this._repositoryContext !== repositoryContext) {
                repositoryChanged = true;
            }

            this._repositoryContext = repositoryContext;
            this._changeListModel = changeListModel;

            if (!this._changeExplorerGridHelper || repositoryChanged) {
                if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
                    this._changeExplorerGridHelper = new VCChangeListNavigatorTfsChangeExplorerGridHelper.TfsChangeExplorerGridHelper(this);
                }
                else {
                    this._changeExplorerGridHelper = new VCChangeListNavigatorGitChangeExplorerGridHelper.GitChangeExplorerGridHelper(this, repositoryContext);
                }
            }

            this._changeExplorerGridHelper.setGridSource(keepSelection, keepExpandStates);
        }
    }

    /** Force a resize check and possible redraw of the virtualized grid */
    public resize() {
        this._onContainerResize();
    }

    public refresh(keepSelection: boolean = true, keepExpandStates: boolean = true) {
        this._changeExplorerGridHelper.setGridSource(keepSelection, keepExpandStates);
    }

    public nonAncestorFolderToggled(rowInfo, currSelectedDataIndex) {
        if (currSelectedDataIndex && this._selectedIndex && this._selectedIndex > rowInfo.rowIndex) {
            // the toggled folder is above me, so I must recalculate the selection
            this._clearSelection();
            if (this._rows && this._rows[currSelectedDataIndex]) {
                this._redraw();
                this._addSelection(this._rows[currSelectedDataIndex].rowIndex, currSelectedDataIndex);
            }
        }
    }

    public setGridSource(keepSelection: boolean, keepExpandStates: boolean) {
        let gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = [];

        this._optionsChangedSinceLastRefresh = false;
        this._gridItemsByPath = {};
        this._discussionItemsById = {};
        this._discussionIdToSelect = 0;

        if (this._changeListModel) {
            gridItems = this.createGridItems(this._changeListModel.changes);
        }

        this.updateGridDataSource(gridItems, keepSelection, keepExpandStates);
    }

    private updateGridDataSource(gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[], keepSelection: boolean, keepExpandStates: boolean) {
        let previousSelection: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem,
            newSelectionIndex: number,
            discussionGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem,
            expandedPaths: { [path: string]: boolean; },
            expandedDiscussions: { [id: string]: boolean; },
            oldExpandStates: number[],
            bestMatchingIndex: number,
            collapsedByDefault: number[] = [];

        $.each(gridItems, (index: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            gridItem.itemIndex = index;
            if (!gridItem.isDiscussionContainer && (gridItem.type === ChangeExplorerItemType.Folder || gridItem.type === ChangeExplorerItemType.File)) {
                this._gridItemsByPath[gridItem.path] = gridItem;
            }
            else if (gridItem.type === ChangeExplorerItemType.DiscussionComment) {
                this._discussionItemsById[gridItem.discussionComment.threadId + "." + gridItem.discussionComment.id] = gridItem;
                if (gridItem.isRootThreadItem) {
                    this._discussionItemsById["" + gridItem.discussionComment.threadId] = gridItem;
                }
            }
        });

        // Determine the new selection index
        if (keepSelection) {
            newSelectionIndex = -1;
            previousSelection = this.getSelectedItem();
            if (previousSelection) {
                bestMatchingIndex = -1;
                $.each(gridItems, (index: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
                    if (gridItem.path === previousSelection.path && gridItem.change === previousSelection.change) {
                        if (gridItem.discussionThread === previousSelection.discussionThread && gridItem.discussionComment === previousSelection.discussionComment) {
                            // Exact match
                            newSelectionIndex = index;
                            return false;
                        }
                        else if (gridItem.type === ChangeExplorerItemType.File) {
                            // Matching file but different discussion. The discussion may have been deleted, so remember this file node
                            bestMatchingIndex = index;
                        }
                    }
                });
                if (newSelectionIndex < 0 && bestMatchingIndex >= 0) {
                    newSelectionIndex = bestMatchingIndex;
                }
            }
            else if (this._discussionIdToSelect) {
                discussionGridItem = this._discussionItemsById["" + this._discussionIdToSelect];
                if (discussionGridItem) {
                    newSelectionIndex = discussionGridItem.itemIndex;
                }
            }
        }
        else {
            newSelectionIndex = 0;
        }

        this._discussionIdToSelect = 0;

        if (keepExpandStates && this._options.source && this._options.expandStates) {

            expandedPaths = {};
            expandedDiscussions = {};
            oldExpandStates = this._options.expandStates;

            $.each(this._options.source, (index: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
                const oldExpandState = oldExpandStates[index];
                if (oldExpandState !== 0) {
                    if (gridItem.isDiscussionContainer) {
                        expandedDiscussions["root" + gridItem.displayName] = oldExpandState > 0;
                    }
                    else if (gridItem.type === ChangeExplorerItemType.DiscussionComment) {
                        if (oldExpandState > 0) {
                            expandedDiscussions["" + gridItem.discussionThread.id] = true;
                        }
                    }
                    else {
                        expandedPaths[gridItem.path] = oldExpandState > 0;
                    }
                }
            });
        }

        this._options.source = gridItems;
        this._options.expandStates = this.computeExpandStates(gridItems, expandedPaths, expandedDiscussions);

        this._supressItemChangedEvent = true;

        this.setDataSource(
            this._options.source,
            this._options.expandStates,
            this._options.columns,
            this._options.sortOrder,
            undefined,
            false);

        this._selectRow(newSelectionIndex < 0 ? ChangeExplorerGrid.NO_SELECTION_INDEX : this._getRowIndex(newSelectionIndex));
        this._supressItemChangedEvent = false;

        $.each(collapsedByDefault, (i, idx) => {
            this.collapseNode(idx);
        });

        this._changeListNavigator.setChanges(gridItems);
    }

    private computeExpandStates(gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[], expandedPaths: { [path: string]: boolean; }, expandedDiscussions: { [id: string]: boolean; }) {
        let expandStates = [],
            lastIndentLevel = 0,
            parentIndex: number;

        $.each(gridItems, (index: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            let parent: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

            expandStates[index] = 0;

            parent = gridItem.parentItem;
            while (parent) {
                parentIndex = parent.itemIndex;
                expandStates[parentIndex] = (expandStates[parentIndex] || 0) + 1;
                parent = parent.parentItem;
            }
        });

        $.each(gridItems, (index: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            let expandState: boolean;
            if (expandStates[gridItem.itemIndex] !== 0) {
                expandState = true;
                if (gridItem.type === ChangeExplorerItemType.DiscussionComment) {
                    if (!expandedDiscussions || !expandedDiscussions["" + gridItem.discussionThread.id]) {
                        expandState = false;
                    }
                }
                else if (gridItem.isDiscussionContainer) {
                    expandState = expandedDiscussions && expandedDiscussions["root" + gridItem.displayName];
                    if (expandState === undefined) {
                        expandState = this._expandFileDiscussions;
                    }
                }
                else if (expandedPaths) {
                    expandState = expandedPaths[gridItem.path];
                    if (expandState === undefined) {
                        expandState = index === 0 ? true : this._expandFileDiscussions;
                    }
                }

                if (!expandState) {
                    expandStates[gridItem.itemIndex] = -expandStates[gridItem.itemIndex];
                }
            }
        });

        return expandStates;
    }

    private createGridItems(changes: VCLegacyContracts.Change[]) {
        let allGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = [];
        const displayMode = this._displayMode;
        let discussionThreads = this._discussionManager ? this._discussionManager.getAllThreads() : [];
        let changeGridItems = this.createChangeGridItems(changes);
        const rootGridItem = this.createRootGridItem(changeGridItems);

        if (this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.CommentsOnly) {
            allGridItems = [rootGridItem].concat(this.createCommentsOnlyDiscussionGridItems(discussionThreads));
        }
        else {
            if (this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles ||
                this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithActiveComments) {

                discussionThreads = discussionThreads.filter(thread =>
                    thread.status === DiscussionConstants.DiscussionStatus.Active || thread.status === DiscussionConstants.DiscussionStatus.Pending);
            }

            if (this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithComments ||
                this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithActiveComments) {
                changeGridItems = this.filterToGridItemsThatHaveDiscussions(changeGridItems, discussionThreads);
            }

            switch (this._displayMode) {
                case VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesByFolder:
                    allGridItems = this.createFilesByFolderGridItems(rootGridItem, changeGridItems);
                    break;

                case VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesOnly:
                    allGridItems = this.createFilesOnlyGridItems(rootGridItem, changeGridItems);
                    break;

                case VCWebAccessContracts.ChangeExplorerGridDisplayMode.FullTree:
                    allGridItems = this.createTreeGridItems(rootGridItem, changeGridItems);
                    break;
            }
            
            allGridItems = this.processGridItemDiscussionsAndAdornments(allGridItems, discussionThreads, this._commentsMode !== VCWebAccessContracts.ChangeExplorerGridCommentsMode.Off);
        }

        if (allGridItems.length <= 1 &&
            (this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.CommentsOnly ||
                this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithComments ||
                this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithActiveComments)) {

            const noCommentsMessage: string = this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithActiveComments ?
                VCResources.NoFilesWithActiveDiscussionComments : VCResources.NoDiscussionComments;

            // Add a node stating that there are no comments
            allGridItems.push(this.createInformationMessageGridItem(noCommentsMessage, null));
        }

        return allGridItems;
    }

    private createFilesByFolderGridItems(rootGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, changeGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {
        return [rootGridItem].concat(this._changeExplorerGridHelper.createGridItemsGroupsByFolders(rootGridItem, changeGridItems));
    }

    private createFilesOnlyGridItems(rootGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, changeGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {
        changeGridItems.sort((changeGridItem1: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, changeGridItem2: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            return Utils_String.localeIgnoreCaseComparer(changeGridItem1.name, changeGridItem2.name);
        });
        return [rootGridItem].concat(changeGridItems);
    }

    private createTreeGridItems(rootGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, changeGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {
        const folderItemsByPath: { [path: string]: ChangeExplorerGridTreeContainer; } = {},
            rootTreeItem = this.createTreeGridItem(rootGridItem, folderItemsByPath, true),
            allGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = [];

        $.each(changeGridItems, (i: number, changeGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            let existingFolderItem: ChangeExplorerGridTreeContainer;

            if (changeGridItem.type === ChangeExplorerItemType.Folder) {
                existingFolderItem = folderItemsByPath[this._changeExplorerGridHelper.getPathLookupKey(changeGridItem.path)];
                if (existingFolderItem) {
                    existingFolderItem.item.change = changeGridItem.change;
                    return true;
                }
            }

            this.createTreeGridItem(changeGridItem, folderItemsByPath);
        });

        // Add items recursively
        this.appendTreeGridItems(rootTreeItem, allGridItems);

        return allGridItems;
    }

    private createTreeGridItem(item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, folderItemsByPath: { [path: string]: ChangeExplorerGridTreeContainer; }, isRootItem = false) {
        let treeItem: ChangeExplorerGridTreeContainer,
            existingFolderItem: ChangeExplorerGridTreeContainer,
            parentPathKey: string,
            parentItem: ChangeExplorerGridTreeContainer,
            newParentGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

        treeItem = {
            item: item,
            children: []
        };

        folderItemsByPath[this._changeExplorerGridHelper.getPathLookupKey(item.path)] = treeItem;

        if (!isRootItem) {

            parentPathKey = this._changeExplorerGridHelper.getPathLookupKey(item.parentFolder);
            parentItem = folderItemsByPath[parentPathKey];

            if (!parentItem) {
                if (!item.parentFolder || item.parentFolder === "/") {
                    return treeItem;
                }
                newParentGridItem = this._changeExplorerGridHelper.createGridItemForPath(item.parentFolder, null);
                parentItem = this.createTreeGridItem(newParentGridItem, folderItemsByPath);
            }

            parentItem.children.push(treeItem);
        }

        return treeItem;
    }

    private appendTreeGridItems(treeItem: ChangeExplorerGridTreeContainer, gridItemsList: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {

        gridItemsList.push(treeItem.item);

        // Sort the child items
        treeItem.children.sort((treeItem1: ChangeExplorerGridTreeContainer, treeItem2: ChangeExplorerGridTreeContainer) => {
            if (treeItem1.item.type === ChangeExplorerItemType.Folder) {
                if (treeItem2.item.type !== ChangeExplorerItemType.Folder) {
                    return -1;
                }
            }
            else if (treeItem2.item.type === ChangeExplorerItemType.Folder) {
                return 1;
            }
            return this._repositoryContext.comparePaths(treeItem1.item.name, treeItem2.item.name);
        });

        $.each(treeItem.children, (i: number, childTreeItem: ChangeExplorerGridTreeContainer) => {
            childTreeItem.item.parentItem = treeItem.item;
            if (childTreeItem.item.type === ChangeExplorerItemType.Folder) {
                if (childTreeItem.item.change) {
                    childTreeItem.item.displayName = this._changeExplorerGridHelper.getChangeText(childTreeItem.item.name, childTreeItem.item.change);
                }
                else {
                    childTreeItem.item.displayName = childTreeItem.item.name;
                }
            }
            this.appendTreeGridItems(childTreeItem, gridItemsList);
        });
    }

    private createRootGridItem(changeGridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {
        let commonPath: string = null,
            rootItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

        $.each(changeGridItems, (index: number, changeGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            if (index === 0) {
                commonPath = changeGridItem.parentFolder;
            }
            else {
                commonPath = this.updateCommonPath(commonPath, changeGridItem.parentFolder);
            }

            if (!commonPath) {
                return false;
            }
        });

        if (!commonPath) {
            commonPath = this._repositoryContext.getRootPath();
        }

        // Create root item
        rootItem = this._changeExplorerGridHelper.createGridItemForPath(commonPath, null);
        rootItem.iconCss = "type-icon bowtie-icon bowtie-tfvc-change-list";
        rootItem.isRootFolder = true;

        if (this._repositoryContext.getRepositoryType() === RepositoryType.Git && commonPath === this._repositoryContext.getRootPath()) {
            rootItem.displayName = (<GitRepositoryContext>this._repositoryContext).getRepository().name;
        }

        return rootItem;
    }

    private updateCommonPath(previousCommonPath: string, newFolderPath: string) {
        let currentCommonPathSegment: string[],
            newFolderSegment: string[],
            i: number = 0,
            commonPath: string = "";

        if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            previousCommonPath = previousCommonPath.toLowerCase();
            newFolderPath = newFolderPath.toLowerCase();
        }

        currentCommonPathSegment = previousCommonPath.split("/");
        newFolderSegment = newFolderPath.split("/");

        while (i < currentCommonPathSegment.length && i < newFolderSegment.length
            && currentCommonPathSegment[i] === newFolderSegment[i]) {
            commonPath += (currentCommonPathSegment[i++] + "/");
        }
        
        //remove last trailing "/"
        return (commonPath) ? commonPath.substr(0, commonPath.length - 1) : null;
    }

    private createChangeGridItems(changes: VCLegacyContracts.Change[]) {
        const gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = [];

        $.each(this._changeListModel.changes, (i: number, change: VCLegacyContracts.Change) => {
            // Skip source-renames
            if (VCOM.ChangeType.isSourceRenameDelete(change.changeType)) {
                return true;
            }
            gridItems.push(this._changeExplorerGridHelper.createGridItemForChange(change, null));
        });

        return gridItems;
    }

    private filterToGridItemsThatHaveDiscussions(gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[], discussionThreads: DiscussionCommon.DiscussionThread[]) {
        let filteredItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = [],
            caseInsensitiveLookups = this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc,
            pathsWithDiscussion: { [path: string]: boolean; };

        if (!discussionThreads || discussionThreads.length == 0) {
            return filteredItems;
        }
        pathsWithDiscussion = {};
        $.each(discussionThreads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
            let key: string;
            if (thread.itemPath) {
                key = caseInsensitiveLookups ? thread.itemPath.toLowerCase() : thread.itemPath;
                pathsWithDiscussion[key] = true;
            }
        });

        $.each(gridItems, (i: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            let key: string;

            if (gridItem.change) {
                key = caseInsensitiveLookups ? gridItem.change.item.serverItem.toLowerCase() : gridItem.change.item.serverItem;
                if (pathsWithDiscussion[key]) {
                    filteredItems.push(gridItem);
                }
            }
        });

        return filteredItems;
    }

    private createGridItemsForDiscussionThread(change: VCLegacyContracts.Change, discussionThread: DiscussionCommon.DiscussionThread, parentItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        const gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = []
        $.each(discussionThread.comments, (index: number, comment: DiscussionCommon.DiscussionComment) => {
            gridItems.push(this.createGridItemForDiscussionComment(change, discussionThread, comment, index === 0 ? parentItem : gridItems[0]));
        });
        if (gridItems.length > 0) {
            gridItems[0].isRootThreadItem = true;
        }
        return gridItems;
    }

    private createGridItemForDiscussionComment(change: VCLegacyContracts.Change, discussionThread: DiscussionCommon.DiscussionThread, comment: DiscussionCommon.DiscussionComment, parentItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        const gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem = this._changeExplorerGridHelper.createGridItemForPath(discussionThread.itemPath, parentItem);

        gridItem.type = ChangeExplorerItemType.DiscussionComment;
        gridItem.change = change;
        gridItem.discussionThread = discussionThread;
        gridItem.discussionComment = comment;
        gridItem.iconCss = null;
        gridItem.getContributionContext = this._getContributionContextFuncForComment(discussionThread, comment);

        this.updateDiscussionCommentItemValues(gridItem, comment, discussionThread);

        return gridItem;
    }

    private _getContributionContextFuncForComment(discussionThread: DiscussionCommon.DiscussionThread, comment: DiscussionCommon.DiscussionComment) {
        return () => {
            return <any> {
                discussionThread: <DiscussionContracts.DiscussionThread>(<any>discussionThread), // force compat until generated clients are consumed.
                discussionComment: <DiscussionContracts.DiscussionComment>(<any>comment), // force compat until generated clients are consumed.
                changeList: VCOM.LegacyConverters.convertChangeList(this._changeListModel)
            };
        };
    }

    private updateDiscussionCommentItemValues(gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem, comment: DiscussionCommon.DiscussionComment, thread: DiscussionCommon.DiscussionThread) {
        if (comment.isDirty) {
            gridItem.displayName = "* " + (comment.newContent || "");
            gridItem.tooltip = comment.newContent || "";
        }
        else {
            gridItem.displayName = comment.content || "";
            gridItem.tooltip = comment.content || "";
        }

        if (gridItem.displayName.length > ChangeExplorerGrid.MAX_COMMENT_DISPLAY_LENGTH) {
            gridItem.displayName = gridItem.displayName.substr(0, ChangeExplorerGrid.MAX_COMMENT_DISPLAY_LENGTH) + "...";
        }
        if (!comment.isDirty && comment.publishedDate) {
            gridItem.displayName += " [" + Utils_Date.ago(comment.publishedDate) + "]";
        }

        if (thread && thread.itemPath) {
            gridItem.tooltip += "\r\n\r\n" + thread.itemPath;
            if (thread.position) {
                if (thread.position.endLine > thread.position.startLine) {
                    gridItem.tooltip += "\r\n" + Utils_String.format(VCResources.CommentLineInfoMultiLine, thread.position.startLine, thread.position.endLine);
                }
                else {
                    gridItem.tooltip += "\r\n" + Utils_String.format(VCResources.CommentLineInfoSingleLine, thread.position.endLine);
                }
            }
        }
    }

    private createInformationMessageGridItem(message: string, parentItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        return <VCChangeListNavigatorChangeExplorer.ChangeExplorerItem> {
            type: ChangeExplorerItemType.InformationMessage,
            displayName: message,
            tooltip: message,
            parentItem: parentItem
        };
    }

    public getSelectedItem() {
        return <VCChangeListNavigatorChangeExplorer.ChangeExplorerItem>this._dataSource[this.getSelectedDataIndex()];
    }

    public clearSelection() {
        this.setSelectedRowIndex(ChangeExplorerGrid.NO_SELECTION_INDEX);
    }

    public setSelectedItem(path: string, discussionId?: number, triggerSelectionChangedEvent: boolean = false) {
        let prevItem = this.getSelectedItem(),
            newItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

        this._discussionIdToSelect = 0;

        if (!triggerSelectionChangedEvent) {
            this._supressItemChangedEvent = true;
        }

        try {
            if (discussionId) {
                // Discussion Node
                if (prevItem && prevItem.discussionThread && prevItem.discussionThread.id === discussionId) {
                    return;
                }
                else {
                    newItem = this._discussionItemsById["" + discussionId];
                    if (!newItem) {
                        this._discussionIdToSelect = discussionId;
                    }
                }
            }
            else if (!path) {
                // Select the summary/root node if no path is provided
                if ((!prevItem || prevItem.itemIndex !== 0) && this._dataSource.length > 0) {
                    this.setSelectedDataIndex(0);
                    this.getSelectedRowIntoView();
                }
                return;
            }
            else {
                // File node
                if (prevItem && Utils_String.localeComparer(prevItem.path, path) === 0) {
                    return;
                }
                else if (this._gridItemsByPath) {
                    newItem = this._gridItemsByPath[path];
                }
            }

            if (newItem) {
                this.setSelectedDataIndex(newItem.itemIndex, true);
                this.refresh();
                this.getSelectedRowIntoView();
            }
            else {
                this.setSelectedRowIndex(-1);
            }
        }
        finally {
            this._supressItemChangedEvent = false;
        }
    }

    private onDiscussionCommentsUpdated(sender: DiscussionOM.DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) {
        let currentSelection: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

        if (eventData.currentThreads || eventData.newThreads || eventData.deletedThreads || eventData.newComments || eventData.deletedComments || eventData.updateThreads) {
            this.setAllDiscussionThreadsAndAdornments(sender.getAllThreads());
        }
        else {
            if (eventData.savedComments) {
                $.each(eventData.savedComments, (i: number, comment: DiscussionCommon.DiscussionComment) => {
                    this.updateSavedCommentItem(comment);
                });

                // Set changes on the navigator again since the thread/comment ids have changed.
                this._changeListNavigator.setChanges(this._options.source || []);
            }

            if (eventData.savedThreads) {
                $.each(eventData.savedThreads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
                    this.updateSavedDiscussionThreadItem(thread);
                });

                // Set changes on the navigator again since the thread/comment ids have changed.
                this._changeListNavigator.setChanges(this._options.source || []);
            }

            if (eventData.updatedComments) {
                $.each(eventData.updatedComments, (i: number, comment: DiscussionCommon.DiscussionComment) => {
                    this.updateCommentItem(comment);
                });
            }
        }

        if (eventData.threadSelected) {
            currentSelection = this.getSelectedItem();
            if (currentSelection && Utils_String.localeComparer(currentSelection.path, eventData.threadSelected.itemPath) === 0) {
                this.setSelectedItem(eventData.threadSelected.itemPath, eventData.threadSelected.id);
            }
        }
    }
    
    private setAllDiscussionThreadsAndAdornments(threads: DiscussionCommon.DiscussionThread[]) {
        let gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[];
        this._discussionItemsById = {};

        switch (this._commentsMode) {

            case VCWebAccessContracts.ChangeExplorerGridCommentsMode.CommentsOnly:
                // Take the root node and append all discussions
                gridItems = this._options.source ? [this._options.source[0]] : [];
                gridItems = gridItems.concat(this.createCommentsOnlyDiscussionGridItems(threads));
                this.updateGridDataSource(gridItems, true, true);
                break;

            case VCWebAccessContracts.ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles:
            case VCWebAccessContracts.ChangeExplorerGridCommentsMode.Off:
            case VCWebAccessContracts.ChangeExplorerGridCommentsMode.Default:

                gridItems = this._options.source || [];

                // Clear with-comments icon class
                $.each(gridItems, (index: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
                    if (gridItem.type === ChangeExplorerItemType.File) {
                        gridItem.iconCss = "type-icon bowtie-icon " + VCFileIconPicker.getIconNameForFile(gridItem.path);
                    }
                });

                // Remove previous comment and adornment items
                gridItems = $.grep(gridItems, (gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
                    return gridItem.type !== ChangeExplorerItemType.DiscussionComment &&
                        !gridItem.isDiscussionContainer;
                });

                // Add in the new comment items
                if (this._commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles) {
                    threads = threads.filter(thread =>
                        thread.status === DiscussionConstants.DiscussionStatus.Active || thread.status === DiscussionConstants.DiscussionStatus.Pending);
                }
                gridItems = this.processGridItemDiscussionsAndAdornments(gridItems, threads, this._commentsMode !== VCWebAccessContracts.ChangeExplorerGridCommentsMode.Off);
                this.updateGridDataSource(gridItems, true, true);
                break;

            case VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithComments:
                // Need to reset source since a new/deleted thread may change which files we show.
                // This is a full refresh and not optimal. We can improve this later if it suffers from
                // bad performance.
                this.setGridSource(true, true);
                break;
        }
    }

    /**
     * A discussion thread was just saved. Update temporary data (e.g. temporary / originalId) with
     * actual data.
     * @param discussionThread
     */
    private updateSavedDiscussionThreadItem(discussionThread: DiscussionCommon.DiscussionThread) {
        // Update the root node for the thread
        if (discussionThread.originalId) {
            const gridItem = this._discussionItemsById["" + discussionThread.originalId];
            if (gridItem) {
                // Replace the discussion thread object
                gridItem.discussionThread = discussionThread;

                delete this._discussionItemsById["" + discussionThread.originalId];
                this._discussionItemsById["" + discussionThread.id] = gridItem;
            }
        }
    }

    private updateSavedCommentItem(comment: DiscussionCommon.DiscussionComment) {
        let gridItem = this._discussionItemsById[comment.originalThreadId + "." + comment.originalId];
        if (!gridItem) {
            gridItem = this._discussionItemsById[comment.threadId + "." + comment.originalId];
        }

        if (gridItem) {
            delete this._discussionItemsById[comment.originalThreadId + "." + comment.originalId];
            delete this._discussionItemsById[comment.threadId + "." + comment.originalId];

            this._discussionItemsById[comment.threadId + "." + comment.id] = gridItem;
        }

        // Update the root node for the thread
        if (comment.originalThreadId) {
            gridItem = this._discussionItemsById["" + comment.originalThreadId];
            if (gridItem) {
                delete this._discussionItemsById["" + comment.originalThreadId];
                this._discussionItemsById["" + comment.threadId] = gridItem;
            }
        }

        this.updateCommentItem(comment);
    }

    private updateCommentItem(comment: DiscussionCommon.DiscussionComment) {
        let gridItem = this._discussionItemsById[comment.threadId + "." + comment.id],
            rowInfo: any;

        if (gridItem) {
            this.updateDiscussionCommentItemValues(gridItem, comment, this._discussionManager.findThread(comment.threadId));

            rowInfo = this._rows[gridItem.itemIndex];
            if (rowInfo && rowInfo.row) {
                rowInfo.row.find(".grid-cell").attr("title", gridItem.tooltip || "");
                rowInfo.row.find(".display-text").text(gridItem.displayName || " ");
            }
        }
    }

    private processGridItemDiscussionsAndAdornments(gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[], threads: DiscussionCommon.DiscussionThread[], includeDiscussionItems: boolean) {
        let itemsWithDiscussions: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[],
            discussionsByPath: { [path: string]: DiscussionCommon.DiscussionThread[] },
            rootDiscussions: DiscussionCommon.DiscussionThread[] = [],
            overallDiscussionsContainer: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem,
            otherDiscussionsContainer: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

        if (threads.length === 0) {
            return gridItems;
        }

        // Build hash of discussions by path
        discussionsByPath = {};
        $.each(threads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
            let list: DiscussionCommon.DiscussionThread[];
            if (thread.itemPath) {
                list = discussionsByPath[thread.itemPath];
                if (!list) {
                    list = [];
                    discussionsByPath[thread.itemPath] = list;
                }
            }
            else {
                list = rootDiscussions;
            }

            // Wrap the thread and put it in the list.
            // Only emit position if the thread was positioned.
            list.push(thread);
        });

        // Populate items list with discussions
        itemsWithDiscussions = [];
        $.each(gridItems, (index: number, gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            let discussionThreads: DiscussionCommon.DiscussionThread[];

            itemsWithDiscussions.push(gridItem);

            if (gridItem.change && gridItem.type !== ChangeExplorerItemType.DiscussionComment) {
                discussionThreads = discussionsByPath[gridItem.path];
            }

            if (index === 0) {
                discussionThreads = rootDiscussions.concat(discussionThreads || []);
            }

            if (discussionThreads) {
                if (gridItem.type === ChangeExplorerItemType.File) {
                    gridItem.iconCss += " with-comments bowtie-icon bowtie-file-comment";
                }
                if (includeDiscussionItems) {
                    if (discussionThreads.length > 1) {
                        discussionThreads = discussionThreads.sort(delegate(this, this.discussionThreadComparer));
                    }
                    if (index === 0) {

                        if (!this._options.hideOverallComments) {
                            // Add "overall" comments                            
                            $.each(discussionThreads, (discussionIndex: number, discussionThread: DiscussionCommon.DiscussionThread) => {
                                if (!discussionThread.originalItemPath) {
                                    if (!overallDiscussionsContainer) {
                                        overallDiscussionsContainer = this._changeExplorerGridHelper.createGridItemForPath(gridItem.path, gridItem);
                                        overallDiscussionsContainer.displayName = VCResources.OverallComments;
                                        overallDiscussionsContainer.iconCss = "bowtie-icon bowtie-comment-outline";
                                        overallDiscussionsContainer.isRootFolder = true;
                                        overallDiscussionsContainer.isDiscussionContainer = true;
                                        itemsWithDiscussions.push(overallDiscussionsContainer);
                                    }
                                    itemsWithDiscussions = itemsWithDiscussions.concat(this.createGridItemsForDiscussionThread(null, discussionThread, overallDiscussionsContainer));
                                }
                            });
                        }

                        // Add "other" comments - those on paths which are not included in the change list.
                        // This can happen with shelvesets which have older comments (from a previous
                        // shelveset with the same name) or in a case when an add is pended in a shelveset,
                        // comments are left on it, then someone checks in a rename of the folder being added to.
                        $.each(discussionThreads, (discussionIndex: number, discussionThread: DiscussionCommon.DiscussionThread) => {
                            // Only discussion threads (and not adornments) support "other" comments                            
                            if (discussionThread.originalItemPath) {
                                if (!otherDiscussionsContainer) {
                                    otherDiscussionsContainer = this._changeExplorerGridHelper.createGridItemForPath(gridItem.path, gridItem);
                                    otherDiscussionsContainer.displayName = VCResources.OtherComments;
                                    otherDiscussionsContainer.iconCss = "bowtie-icon bowtie-comment-outline";
                                    otherDiscussionsContainer.isRootFolder = true;
                                    otherDiscussionsContainer.isDiscussionContainer = true;
                                    itemsWithDiscussions.push(otherDiscussionsContainer);
                                }
                                itemsWithDiscussions = itemsWithDiscussions.concat(this.createGridItemsForDiscussionThread(null, discussionThread, otherDiscussionsContainer));
                            }                            
                        });
                    }
                    else {
                        $.each(discussionThreads, (discussionIndex: number, discussionThread: DiscussionCommon.DiscussionThread) => {
                            // Create the appropriate grid item for either a discussion or adornment
                            $.each(this.createGridItemsForDiscussionThread(gridItem.change, discussionThread, gridItem), (discussionItemIndex: number, discussionItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
                                itemsWithDiscussions.push(discussionItem);
                            });                            
                        });
                    }
                }
            }
        });

        return itemsWithDiscussions;
    }

    private createCommentsOnlyDiscussionGridItems(threads: DiscussionCommon.DiscussionThread[]) {
        let gridItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[] = [],
            changesByPath: { [path: string]: VCLegacyContracts.Change; } = {},
            sortedThreads: DiscussionCommon.DiscussionThread[];

        if (threads.length === 0) {
            return gridItems;
        }

        // Build hash of changes by path
        $.each(this._changeListModel.changes || [], (i: number, change: VCLegacyContracts.Change) => {
            changesByPath[change.item.serverItem] = change;
        });

        sortedThreads = threads.slice(0);
        sortedThreads.sort((thread1: DiscussionCommon.DiscussionThread, thread2: DiscussionCommon.DiscussionThread) => {
            if (!thread2.publishedDate) {
                if (!thread1.publishedDate) {
                    return thread1.id - thread2.id;
                }
                else {
                    return 1;
                }
            }
            else if (!thread1.publishedDate) {
                return -1;
            }
            else {
                return <any>(thread2.publishedDate) - <any>(thread1.publishedDate);
            }
        });

        $.each(sortedThreads, (index: number, thread: DiscussionCommon.DiscussionThread) => {
            if (this._options.hideOverallComments && !thread.itemPath) {
                return true;
            }

            const change = changesByPath[thread.itemPath],
                threadGridItems = this.createGridItemsForDiscussionThread(change, thread, null);

            $.each(threadGridItems, (commentIndex: number, threadGridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
                gridItems.push(threadGridItem);
            });
        });

        return gridItems;
    }

    private discussionThreadComparer(thread1: DiscussionCommon.DiscussionThread, thread2: DiscussionCommon.DiscussionThread) {
        // Sort threads
        if (thread1.position) {
            if (!thread2.position) {
                // position-less threads come first
                return 1;
            }
            else if (thread1.position.endLine !== thread2.position.endLine) {
                // 2 positioned threads on different lines. Sort by line number (which will be endLine for discussion threads)
                return thread1.position.endLine - thread2.position.endLine;
            }
        }
        else if (thread2.position) {
            // position-less threads come first
            return -1;
        }

        // 2 non-positioned threads. Sort by published date
        if (thread1.publishedDate) {
            if (thread2.publishedDate) {
                // Compare published dates
                return thread1.publishedDate.getTime() - thread2.publishedDate.getTime();
            }
            else {
                // Published threads come first
                return -1;
            }
        }
        else if (thread2.publishedDate) {
            // Published threads come first
            return 1;
        }
        return 0;
    }

    private _drawChangeItemCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        return this._changeExplorerGridHelper.drawChangeItemCellContents(rowInfo, this._dataSource[dataIndex], expandedState, level, column, indentIndex, columnOrder);
    }

    private _getContextMenuItems(contextInfo) {
        if (this._changeExplorerGridHelper) {
            return this._changeExplorerGridHelper.getContextMenuItems(contextInfo);
        }
    }

    private _onMenuItemClick(e?): any {
        if (this._changeExplorerGridHelper) {
            this._changeExplorerGridHelper.onMenuItemClick(e);
        }
    }
}
