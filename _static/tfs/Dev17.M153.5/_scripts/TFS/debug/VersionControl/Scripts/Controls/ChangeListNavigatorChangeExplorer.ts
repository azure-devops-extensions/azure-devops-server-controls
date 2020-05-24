/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import AdornmentCommon = require("Presentation/Scripts/TFS/TFS.Adornment.Common");
import Controls = require("VSS/Controls");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import Menus = require("VSS/Controls/Menus");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCChangeListNavigator = require("VersionControl/Scripts/Controls/ChangeListNavigator");
import VCChangeListNavigatorChangeExplorerGrid = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid");
import {ChangeExplorerItemType} from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

export interface ChangeExplorerItem {
    type: ChangeExplorerItemType;
    displayName: string;
    tooltip: string;
    iconCss?: string;

    path?: string;
    parentFolder?: string;
    name?: string;
    isRootFolder?: boolean;

    change?: VCLegacyContracts.Change;

    discussionThread?: DiscussionCommon.DiscussionThread;
    discussionComment?: DiscussionCommon.DiscussionComment;
    adornment?: AdornmentCommon.Adornment;
    isRootThreadItem?: boolean;
    isDiscussionContainer?: boolean;

    itemIndex?: number;
    parentItem?: ChangeExplorerItem;
    getContributionContext?: Function;
}

export class ChangeExplorer extends Controls.BaseControl {

    private _repositoryContext: RepositoryContext;
    private _changeList: VCLegacyContracts.ChangeList;
    private _discussionManager: DiscussionOM.DiscussionManager;
    private _discussionUpdatedListener: any;
    private _changeListFilesGrid: VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid;

    private _toolbarMenu: Menus.MenuBar;
    private _enableToolbar: boolean;

    private _supportCommentStatus = true;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "vc-change-explorer vc-tree",
        }, options));
    }

    public initialize() {
        super.initialize();

        this._supportCommentStatus = this._options.supportCommentStatus;
        this._discussionUpdatedListener = delegate(this, this.onDiscussionCommentsUpdated);
        this._updateToolbar = this._updateToolbar.bind(this);
        this._enableToolbar = !this._options.hideToolbar;
        this._toolbarMenu = null;
        if (this._enableToolbar) {
            this._toolbarMenu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $(domElem("div", "vc-change-explorer-menu toolbar")).appendTo(this._element), {
                items: []
            });
        }

        this._changeListFilesGrid = <VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid>Controls.BaseControl.createIn(VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid, $(domElem("div", "files-grid-container")).appendTo(this._element), {
            tfsContext: this._options.tfsContext,
            expandFileDiscussionsByDefault: this._options.expandFileDiscussionsByDefault,
            hideOverallComments: this._options.hideOverallComments,
            handleSourceControlActionInExplorerContext: this._options.handleSourceControlActionInExplorerContext
        });

        this._changeListFilesGrid._bind("display-options-changed", this._updateToolbar);

        this._updateToolbar();
    }

    public dispose() {
        super.dispose();

        if (this._discussionManager) {
            this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
        }

        if (this._changeListFilesGrid) {
            this._changeListFilesGrid._unbind("display-options-changed", this._updateToolbar);
            this._changeListFilesGrid.dispose();
            this._changeListFilesGrid = null;
        }
    }

    public refresh() {
        this._changeListFilesGrid.refresh();
    }

    /** Force a resize check and possible redraw of the virtualized ChangeExplorerGrid */
    public resize() {
        this._changeListFilesGrid.resize()
    }

    public clearSelection() {
        this._changeListFilesGrid.clearSelection();
    }

    public setSelectedItem(path: string, discussionId?: number, triggerSelectionChangedEvent?: boolean) {
        this._changeListFilesGrid.setSelectedItem(path, discussionId, triggerSelectionChangedEvent);
    }

    public getGrid() {
        return this._changeListFilesGrid;
    }

    public setChangeList(
        repositoryContext: RepositoryContext,
        changeListModel: VCLegacyContracts.ChangeList,
        discussionManager: DiscussionOM.DiscussionManager = null,
        keepState: boolean = false) {

        this._repositoryContext = repositoryContext;
        this._changeList = changeListModel;

        if (this._discussionManager !== discussionManager) {
            if (this._discussionManager) {
                this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionManager = discussionManager;
            if (discussionManager) {
                this._discussionManager.addDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
        }

        this._updateToolbar();
        this._changeListFilesGrid.setChangeList(this._repositoryContext, this._changeList, this._discussionManager, keepState, keepState);
    }

    public getChangeList(): VCLegacyContracts.ChangeList {
        return this._changeList;
    }

    private onDiscussionCommentsUpdated(sender: DiscussionOM.DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) {
        if (eventData.currentThreads || eventData.newThreads || eventData.deletedThreads || eventData.updateThreads) {
            this._updateToolbar();
        }
    }

    public getChangeListNavigator(): VCChangeListNavigator.ChangeListNavigator {
        return this._changeListFilesGrid.getChangeListNavigator();
    }

    public getSelectedGridItem() {
        return this._changeListFilesGrid.getSelectedItem();
    }

    private _updateToolbar() {
        this._enableToolbar && this._toolbarMenu.updateItems(this.getToolbarMenuItems());
    }

    private getToolbarMenuItems() {
        let menuItems: any[] = [],
            sharingTitle: string,
            displayMode = this._changeListFilesGrid.getDisplayMode(),
            commentsMode = this._changeListFilesGrid.getCommentsMode(),
            displayMenuIcon: string,
            numThreads = this._discussionManager ? this._discussionManager.getAllThreads().length : 0;

        if (this._options.hideOverallComments && this._discussionManager) {
            numThreads = 0;

            $.each(this._discussionManager.getAllThreads(), (index: number, thread: DiscussionCommon.DiscussionThread) => {
                if (!thread.itemPath) {
                    return true;
                }

                numThreads++;
            });
        }

        switch (displayMode) {
            case VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesOnly:
                displayMenuIcon = "bowtie-icon bowtie-view-list";
                break;
            case VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesByFolder:
                displayMenuIcon = "bowtie-icon bowtie-view-list-group";
                break;
            case VCWebAccessContracts.ChangeExplorerGridDisplayMode.FullTree:
                displayMenuIcon = "bowtie-icon bowtie-view-list-tree";
                break;
        }

        if (this._repositoryContext && this._changeList) {

            if (!this._options.hideShare) {
                if ($.isFunction(this._options.sharingAction)) {
                    menuItems.push({
                        id: "share-change-list",
                        showText: false,
                        title: this._options.sharingTitle || "",
                        icon: "bowtie-icon bowtie-mail-message",
                        action: this._options.sharingAction
                    });
                }
            }

            if (!this._options.hideDownload) {
                // Add Download as Zip menu item
                if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    // Add download as Zip menu item
                    menuItems.push({
                        id: "download",
                        title: VCResources.DownloadRepositoryAsZip,
                        showText: false,
                        icon: "bowtie-icon bowtie-transfer-download",
                        action: () => {
                            if (this._options.customerIntelligenceData) {
                                this._options.customerIntelligenceData.publish(CustomerIntelligenceConstants.CHANGELISTNAVIGATOR_CHANGEEXPLORER_DOWNLOAD, false);
                            }
                            window.open(VersionControlUrls.getZippedContentUrl(this._repositoryContext, this._repositoryContext.getRootPath(), this._changeList.version), "_blank");
                            return false;
                        }
                    });
                }
            }

            if (!this._options.hideDownload || !this._options.hideShare) {
                menuItems.push({
                    separator: true
                });
            }
        }

        if (commentsMode !== VCWebAccessContracts.ChangeExplorerGridCommentsMode.CommentsOnly) {

            menuItems.push({
                id: "change-tree-display-mode",
                showText: false,
                icon: displayMenuIcon,
                title: VCResources.ChangeExplorerDisplayModeTooltip,
                cssClass: "icon-only-dropdown",
                childItems: [
                    {
                        id: "change-tree-display-mode-flat",
                        text: VCResources.ChangeExplorerDisplayModeFlat,
                        icon: "bowtie-icon bowtie-view-list",
                        cssClass: displayMode === VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesOnly ? "selected-mode" : "",
                        action: () => {
                            if (this._options.customerIntelligenceData) {
                                this._options.customerIntelligenceData.publish(CustomerIntelligenceConstants.CHANGELISTNAVIGATOR_CHANGEEXPLORER_DISPLAY_MODE_FLAT, false);
                            }
                            this._changeListFilesGrid.setDisplayOptions(VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesOnly);
                            this._updateToolbar();
                        }
                    },
                    {
                        id: "change-tree-display-mode-byFolder",
                        text: VCResources.ChangeExplorerDisplayModeByFolder,
                        icon: "bowtie-icon bowtie-view-list-group",
                        cssClass: displayMode === VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesByFolder ? "selected-mode" : "",
                        action: () => {
                            if (this._options.customerIntelligenceData) {
                                this._options.customerIntelligenceData.publish(CustomerIntelligenceConstants.CHANGELISTNAVIGATOR_CHANGEEXPLORER_DISPLAY_MODE_BY_FOLDER, false);
                            }
                            this._changeListFilesGrid.setDisplayOptions(VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesByFolder);
                            this._updateToolbar();
                        }
                    },
                    {
                        id: "change-tree-display-mode-tree",
                        text: VCResources.ChangeExplorerDisplayModeTree,
                        icon: "bowtie-icon bowtie-view-list-tree",
                        cssClass: displayMode === VCWebAccessContracts.ChangeExplorerGridDisplayMode.FullTree ? "selected-mode" : "",
                        action: () => {
                            if (this._options.customerIntelligenceData) {
                                this._options.customerIntelligenceData.publish(CustomerIntelligenceConstants.CHANGELISTNAVIGATOR_CHANGEEXPLORER_DISPLAY_MODE_FULL, false);
                            }
                            this._changeListFilesGrid.setDisplayOptions(VCWebAccessContracts.ChangeExplorerGridDisplayMode.FullTree);
                            this._updateToolbar();
                        }
                    }
                ]
            });
        }

        if (numThreads > 0 ||
            commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithComments ||
            commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.CommentsOnly ||
            commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles) {

            let childItems: any[] = [
                {
                    id: "change-tree-comments-mode-on",
                    text: VCResources.ChangeExplorerCommentsModeInline,
                    cssClass: (commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.Default && this._changeListFilesGrid.getExpandingFileDiscussionsState()) ? "selected-mode" : "",
                    action: () => {
                        if (this._changeListFilesGrid.getExpandingFileDiscussionsState()) {
                            this._changeListFilesGrid.setDisplayOptions(undefined, VCWebAccessContracts.ChangeExplorerGridCommentsMode.Default);
                        }
                        else {
                            this._changeListFilesGrid.setDisplayOptions(undefined, VCWebAccessContracts.ChangeExplorerGridCommentsMode.Default, true);
                            this._changeListFilesGrid.setExpandingFileDiscussionsState(true);
                        }
                        this._updateToolbar();
                    }
                }
            ];

            if (this._supportCommentStatus) {
                childItems.push({
                    id: "change-tree-comments-mode-active-comments-under-files",
                    text: VCResources.ChangeExplorerCommentsModeActiveCommentsUnderFiles,
                    cssClass: commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles ? "selected-mode" : "",
                    action: () => {
                        if (this._changeListFilesGrid.getExpandingFileDiscussionsState()) {
                            this._changeListFilesGrid.setDisplayOptions(undefined, VCWebAccessContracts.ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles);
                        }
                        else {
                            this._changeListFilesGrid.setDisplayOptions(undefined, VCWebAccessContracts.ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles, true);
                            this._changeListFilesGrid.setExpandingFileDiscussionsState(true);
                        }
                        this._updateToolbar();
                    }
                });
            }

            childItems.push(
                {
                    id: "change-tree-comments-mode-off",
                    text: VCResources.ChangeExplorerCommentsModeOff,
                    cssClass: commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.Off ? "selected-mode" : "",
                    action: () => {
                        this._changeListFilesGrid.setDisplayOptions(undefined, VCWebAccessContracts.ChangeExplorerGridCommentsMode.Off);
                        this._updateToolbar();
                    }
                },
                {
                    id: "change-tree-comments-mode-filtered",
                    text: VCResources.ChangeExplorerCommentsModeOnlyFiles,
                    cssClass: commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithComments ? "selected-mode" : "",
                    action: () => {
                        this._changeListFilesGrid.setDisplayOptions(undefined, VCWebAccessContracts.ChangeExplorerGridCommentsMode.OnlyFilesWithComments);
                        this._updateToolbar();
                    }
                },
                {
                    id: "change-tree-comments-mode-comments-only",
                    text: VCResources.ChangeExplorerCommentsModeCommentsOnly,
                    cssClass: commentsMode === VCWebAccessContracts.ChangeExplorerGridCommentsMode.CommentsOnly ? "selected-mode" : "",
                    action: () => {
                        this._changeListFilesGrid.setDisplayOptions(undefined, VCWebAccessContracts.ChangeExplorerGridCommentsMode.CommentsOnly);
                        this._updateToolbar();
                    }
                }
                );

            menuItems.push({
                id: "change-tree-comments-mode",
                showText: numThreads > 0,
                icon: "bowtie-icon bowtie-comment-outline",
                toggled: commentsMode !== VCWebAccessContracts.ChangeExplorerGridCommentsMode.Off,
                title: VCResources.ChangeExplorerCommentsModeTooltip,
                text: numThreads + " ",
                cssClass: "comments-mode-menu-item",
                childItems: childItems
            });
        }

        return menuItems;
    }
}
