/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import * as Context from "VSS/Context";
import { WebPageDataService } from "VSS/Contributions/Services";
import FileInput = require("VSS/Controls/FileInput");
import TreeView = require("VSS/Controls/TreeView");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import { HubsService } from "VSS/Navigation/HubsService";
import Performance = require("VSS/Performance");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import * as VSSService from "VSS/Service";
import Telemetry = require("VSS/Telemetry/Services");
import VSS = require("VSS/VSS");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import ControlsCommon = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCUIContracts = require("TFS/VersionControl/UIContracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCSourceEditingDialogs = require("VersionControl/Scripts/Controls/SourceEditingDialogs");
import VCSourceEditingEvents = require("VersionControl/Scripts/Controls/SourceEditingEvents");
import VCSourceEditingMenuItems = require("VersionControl/Scripts/Controls/SourceEditingMenuItems");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import TFS_Dashboards_PushToDashboard = require("Dashboards/Scripts/Pinning.PushToDashboard");
import TFS_Dashboards_PushToDashboardConstants = require("Dashboards/Scripts/Pinning.PushToDashboardConstants");
import TFS_Dashboards_WidgetDataForPinning = require("Dashboards/Scripts/Pinning.WidgetDataForPinning");
import VCSourceExplorerGridOrTreeMenuItemClickedEvent = require("VersionControl/Scripts/SourceExplorerGridOrTreeMenuItemClickedEvent");
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";

import CommonMenuItems = ControlsCommon.CommonMenuItems;
import delegate = Utils_Core.delegate;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface SourceExplorerTreeOptions extends TreeView.ITreeOptions {
    customerIntelligenceData: CustomerIntelligenceData;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    /**
     * As of M108, showFavorites now defaults false, which hides the path favorites in the Explorer View.
     * Support for path favorites will likely be removed in the near future after confirming no significant customer complaints.
     */
    showFavorites: boolean;
}

class CommonTreeNodes {

    private static _createContainerNode(text, type, css) {
        const node = TreeView.TreeNode.create(text);
        node.folder = true;
        node.type = type;
        node.noContextMenu = true;
        node.config = { css: css + " folder", unselectable: true };
        return node;
    }

    public static myFavorites(css) {
        return this._createContainerNode(TFS_Resources_Presentation.MyFavoritesText, "my", css);
    }

    public static teamFavorites(css) {
        return this._createContainerNode(TFS_Resources_Presentation.TeamFavoritesText, "team", css);
    }

    public static allItems(text, css) {
        return this._createContainerNode(text || VCResources.AllItemsText, "all", css);
    }

    constructor() {
    }
}

export class SourceExplorerTreeNode extends TreeView.TreeNode {
    title: string;
    children: SourceExplorerTreeNode[];
    name: string;
    vcPath: string;
    type: string;
    isHighlighted: boolean;
    tag: RepositoryContext | VCLegacyContracts.ItemModel;
    folder: boolean;
    isSymLink: boolean;
    childrenPopulated: boolean;
    icon: string;
    config: { css: string };
    emptyFolderNodeText: string;
    getSourceItemContext: () => VCUIContracts.SourceItemContext;
    favData: any;
    version: string;

    static create(text: string, config?: any, children?: SourceExplorerTreeNode[]): SourceExplorerTreeNode {
        return new SourceExplorerTreeNode(text, config, children);
    }

    constructor(text: string, config?: any, children?: SourceExplorerTreeNode[]) {
        super(text, config, children);
    }
}

interface MultiAPICallScenario {
    marker: Performance.IScenarioDescriptor;
    pendingAPICalls: number;
}

export class Tree extends TreeView.TreeViewO<SourceExplorerTreeOptions> {

    private _repositoryContext: RepositoryContext;
    private _version: string;
    private _isEditableVersion: boolean;
    private _myFavoriteStore: TFS_OM_Common.FavoriteStore;
    private _teamFavoriteStore: TFS_OM_Common.FavoriteStore;
    private _performance: MultiAPICallScenario; // fetch folder performance
    private _drawPerformance: Performance.IScenarioDescriptor;

    private _favoriteNodes: SourceExplorerTreeNode[];
    private _cachedSourceItems: { [itemPath: string]: VCLegacyContracts.ItemModel; };
    private _sourceNodes: SourceExplorerTreeNode[];
    private _selectedPath: string;
    private _unsavedItemsByParent: { [parentPath: string]: VCLegacyContracts.ItemModel[]; };
    private _unsavedItemsByPath: { [itemPath: string]: VCLegacyContracts.ItemModel; };
    private _dirtyStatesByPath: { [itemPath: string]: boolean; };
    private _allowEditing: boolean;
    private _expandNextClick: boolean = false;
    private _customerIntelligenceData: CustomerIntelligenceData;
    private _shouldPublishFavoritesTelemetry: boolean = false;

    // TreeView.TreeViewO overrides
    public _selectedNode: SourceExplorerTreeNode;

    // To handle "No branches found" etc errors on toggling an empty repo
    public toggleErrorCallback: IErrorCallback = undefined;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />		

        super.initializeOptions($.extend({
            cssClass: "source-explorer-tree vc-tree",
            contextMenu: {
                clickHandler: delegate(this, this._onMenuItemClick),
                "arguments": (contextInfo) => {
                    return <VCSourceExplorerGridOrTreeMenuItemClickedEvent.Arguments>{
                        item: contextInfo.item
                    };
                },
                sortMenuItems: false,
                contributionIds: ["ms.vss-code-web.source-item-menu", "ms.vss-code-web.source-tree-item-menu"]
            },
            clickToggles: true,
            useBowtieStyle: true
        }, options));

        if (this._options.customerIntelligenceData) {
            this._customerIntelligenceData = this._options.customerIntelligenceData.clone();
            this._customerIntelligenceData.properties["ParentControl"] = "SourceExplorerTree";
        }
    }

    public getSelectedNode() {
        return this._selectedNode;
    }

    /**
     *    When called, the next click on any node within this tree will expand 
     *    that node instead of toggling it, preventing the collapse of any 
     *    subtree for one click.
     */
    public expandNextClick() {
        this._expandNextClick = true;
    }

    private createRepoNode(repositoryContext: RepositoryContext, version: string): SourceExplorerTreeNode {
        const isTfsRepo: boolean = repositoryContext.getRepositoryType() === RepositoryType.Tfvc;

        const name = isTfsRepo ? repositoryContext.getRootPath() : (<GitRepositoryContext>repositoryContext).getRepository().name;
        const node = SourceExplorerTreeNode.create(name);

        // Use the new Tfvc purple paintball splatter icon only if hybrid Tfvc/Git projects are supported.  Else stick with the old team project icon until then.
        let icon = isTfsRepo ? "bowtie-icon bowtie-vso-users" : "bowtie-icon bowtie-git";
        if (isTfsRepo) {
            icon = "bowtie-icon bowtie-tfvc-repo";
        }

        node.title = name;
        node.vcPath = repositoryContext.getRootPath();
        node.type = "source";
        node.isHighlighted = true;
        node.tag = repositoryContext;
        node.folder = true;
        node.childrenPopulated = false;
        node.icon = "source-icon " + icon;
        node.config = { css: "repository-node folder" };
        node.emptyFolderNodeText = VCResources.LoadingText;

        node.getSourceItemContext = this._getContributionContextFunc(node, repositoryContext, version);
        return node;
    }

    private _getContributionContextFunc(node: SourceExplorerTreeNode, repository: RepositoryContext, version: string) {
        return (): VCUIContracts.SourceItemContext => {
            let contextItem: VCUIContracts.ISourceItem;
            const currentRepoType = repository.getRepositoryType();
            const context = <VCUIContracts.SourceItemContext>{};
            context.version = VCSpecs.VersionSpec.parse(version).toDisplayText();
            let path = <string | Function>node.vcPath;
            if (typeof path === "function") {
                path = (<Function>path)(true, "/");
            }
            if (currentRepoType === RepositoryType.Git) {
                const commitId = node["commitId"] || node.tag["commitId"];
                const objectId = node["objectId"] || node.tag["objectId"];

                contextItem = {
                    isFolder: (node["isFolder"] || node["folder"] || node["favData"]) ? true : false,
                    isSymLink: node["isSymLink"] ? true : false,
                    path: <string>path,
                    url: node["url"],
                    sourceProvider: "Git",
                    item: <VCContracts.GitItem>{
                        commitId: commitId ? (commitId.full ? commitId.full : commitId) : null,
                        gitObjectType: <VCContracts.GitObjectType>(node["gitObjectType"] || node.tag["gitObjectType"]),
                        latestProcessedChange: null,
                        objectId: objectId ? (objectId.full ? objectId.full : objectId) : null,
                    },
                    _links: null,
                    content: null,
                    contentMetadata: null,
                };
                context.gitRepository = repository.getRepository();
            } else if (currentRepoType === RepositoryType.Tfvc) {
                contextItem = {
                    isFolder: (node["isFolder"] || node["folder"] || node["favData"]) ? true : false,
                    isSymLink: node["isSymLink"] ? true : false,
                    path: <string>path,
                    url: node["url"],
                    sourceProvider: "Tfvc",
                    item: <VCContracts.TfvcItem>{
                        changeDate: node.tag["changeDate"] ? new Date(node.tag["changeDate"]) : null,
                        deletionId: node.tag["deletionId"] ? node.tag["deletionId"] : null,
                        isBranch: node.icon ? node.icon.indexOf("bowtie-tfvc-branch") >= 0 : false,
                        isPendingChange: node.tag["isPendingChange"] ? node.tag["isPendingChange"] : null,
                        version: node.tag["versionDescription"] ? node.tag["versionDescription"] : null
                    },
                    _links: null,
                    content: null,
                    contentMetadata: null,
                };
                context.gitRepository = null;
            }
            context.item = contextItem;
            return context;
        };
    }

    private createSourceNode(item: VCLegacyContracts.ItemModel, parentNode: SourceExplorerTreeNode) {

        const name: string = VersionControlPath.getFileOrFolderDisplayName(item, parentNode.vcPath);
        const node = SourceExplorerTreeNode.create(name);

        node.name = name;
        node.title = item.serverItem;
        node.vcPath = item.serverItem;
        node.type = "source";
        node.tag = item;
        node.folder = item.isFolder;
        node.childrenPopulated = false;
        node.emptyFolderNodeText = VCResources.LoadingText;

        const derivedItem = <VCLegacyContracts.TfsItem | VCLegacyContracts.GitItem>item;
        if ((<VCLegacyContracts.TfsItem>derivedItem).isBranch) {
            node.icon = "source-icon bowtie-icon bowtie-tfvc-branch";
        }
        else if ((<VCLegacyContracts.GitItem>derivedItem).gitObjectType === VCOM.GitObjectType.Commit) {
            node.icon = "source-icon bowtie-icon bowtie-repository-submodule";
        }
        else if (item.isSymLink) {
            node.icon = "source-icon bowtie-icon bowtie-file-symlink";
            node.isSymLink = true;
        }
        else {
            node.icon = node.folder ? "source-icon bowtie-icon bowtie-folder" : "source-icon bowtie-icon " + VCFileIconPicker.getIconNameForFile(node.vcPath);
        }

        this._updateItemNodeText(item.serverItem, node);

        node.getSourceItemContext = this._getContributionContextFunc(node, this._repositoryContext, this._version);

        return node;
    }

    private _updateItemNodeText(itemPath: string, node: SourceExplorerTreeNode) {
        if (this._unsavedItemsByPath[itemPath]) {
            node.text = node.name + " [+]";
        }
        else if (this._dirtyStatesByPath[itemPath]) {
            node.text = node.name + " *";
        }
        else {
            node.text = node.name;
        }
    }

    private createFavDefinitionNode(favoriteItem, type, favData) {
        let nodeName: string;

        if (favoriteItem.repositoryId && (!favoriteItem.path || favoriteItem.path === "/") && favoriteItem.version) {
            nodeName = VCSpecs.VersionSpec.parse(favoriteItem.version).toDisplayText();
        }
        else {
            nodeName = VersionControlPath.getFileName(favoriteItem.path) || favoriteItem.path;
        }

        const node = SourceExplorerTreeNode.create(nodeName);
        node.title = favoriteItem.path;
        node.vcPath = favoriteItem.path;

        if (favoriteItem.version) {
            node.version = favoriteItem.version;
            node.title += " " + VCSpecs.VersionSpec.parse(favoriteItem.version).toDisplayText();
        }

        node.type = type;
        node.noTreeIcon = false;
        node.tag = favoriteItem;
        node.favData = favData;
        node.config = { css: "path-favorite-node" };
        node.getSourceItemContext = this._getContributionContextFunc(node, this._repositoryContext, this._version);
        return node;
    }

    public onItemClick(node: SourceExplorerTreeNode, nodeElement, e?) {
        const $target = $(e.target);

        if ($target.hasClass("node-remove")) {
            if (node.type === "my") {
                this._removeFromMyFavorites(node.vcPath, node.favData);
            }
            else if (node.type === "team") {
                this._removeFromTeamFavorites(node.vcPath, node.favData);
            }
            return false;
        }

        if (node.type === "source" && node.folder) {
            if (node.expanded && node.vcPath !== this._selectedPath) {
                // Don't toggle already-open folders when the selected item has changed.
                this.setSelectedNode(node);
                return false;
            }
        }

        super.onItemClick(node, nodeElement, e);
        return false;
    }

    public onShowPopupMenu(node: SourceExplorerTreeNode, options?) {
        const items = this._getSourceContextMenuItems(node);
        super.onShowPopupMenu(node, $.extend({}, options, { items: items }));
    }

    public _toggle(node: SourceExplorerTreeNode, nodeElement) {
        if (this._expandNextClick) {
            this._expandNextClick = false;
            this._setNodeExpansion(node, $(nodeElement), true);
        } else {
            super._toggle(node, nodeElement);
        }

        if (node.type === "source" && node.folder && !node.childrenPopulated) {
            this._fetchFolders([node.vcPath], this.toggleErrorCallback);
        }
    }

    public initialize() {
        super.initialize();
        const that = this;

        this._element.bind("selectionchanged", delegate(this, this._onPathChanged));

        function synchronizedPopulate() {
            const isPersonalFavoritesReady = that._myFavoriteStore;
            const isTeamFavoritesReady = that._teamFavoriteStore;
            if (isPersonalFavoritesReady && (!that._options.tfsContext.currentTeam || isTeamFavoritesReady)) {
                that._shouldPublishFavoritesTelemetry = true;
                that._refreshFavorites(true);
            }
        }

        if (this._options.showFavorites) {      
            TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(this._options.tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Project, null, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_PATHS, "My Path Favorites", false, (favStore) => {
                this._myFavoriteStore = favStore;
                synchronizedPopulate();
            });
            if (this._options.tfsContext.currentTeam) {
                TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(this._options.tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Team, this._options.tfsContext.currentTeam.identity.id, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_PATHS, "Team Path Favorites", false, (favStore) => {
                    this._teamFavoriteStore = favStore;
                    synchronizedPopulate();
                });
            }
        }

        VCSourceEditingEvents.Events.subscribeItemDirtyStateChangedEvent((dirtyState: boolean, itemPath: string, itemVersion: string) => {
            this._updateDirtyState(itemPath, dirtyState);
        });
        VCSourceEditingEvents.Events.subscribeItemEditedEvent((newVersion: VCSpecs.VersionSpec, comment: string, itemPath: string, itemVersion: string) => {
            this._updateChangedItemNode(itemPath, true, false);
        });
        VCSourceEditingEvents.Events.subscribeItemsUploadedEvent((newVersion: VCSpecs.VersionSpec, comment: string, folderPath: string, fileNames: string[]) => {
            this._updateParentNodeWithAddedItems(folderPath, fileNames);
        });
        VCSourceEditingEvents.Events.subscribeRevertEditedItemEvent((itemPath: string, itemVersion: string) => {
            this._updateChangedItemNode(itemPath, false, false);
        });
        VCSourceEditingEvents.Events.subscribeItemDeletedEvent((newVersion: VCSpecs.VersionSpec, comment: string, itemPath: string, originalItemVersion: string) => {
            this._updateChangedItemNode(itemPath, false, true);
        });
    }

    public setRepositoryAndVersion(repositoryContext: RepositoryContext, version: string, allowEditing: boolean = false) {

        if (this._repositoryContext === repositoryContext && this._version === version) {
            if (this._allowEditing !== allowEditing) {
                this._allowEditing = allowEditing;
                this._isEditableVersion = this._allowEditing && VCSourceEditing.EditingEnablement.showEditingActions(this._repositoryContext, this._version);
            }
            return;
        }

        this._allowEditing = allowEditing;
        this._repositoryContext = repositoryContext;
        this._version = version;
        this.reload();
    }

    public reload() {

        this._isEditableVersion = this._allowEditing && VCSourceEditing.EditingEnablement.showEditingActions(this._repositoryContext, this._version);
        this._cachedSourceItems = {};
        this._unsavedItemsByParent = {};
        this._unsavedItemsByPath = {};
        this._dirtyStatesByPath = {};

        if (this._repositoryContext) {
            this._sourceNodes = [this.createRepoNode(this._repositoryContext, this._version)];
        }
        else {
            this._sourceNodes = [];
        }

        this._refreshFavorites(false);

        this._populateTree();
    }

    private _getCachedSourceItem(itemPath: string) {
        if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            return this._cachedSourceItems[(itemPath || "").toLowerCase()];
        }
        else {
            return this._cachedSourceItems[itemPath];
        }
    }

    private _setCachedSourceItem(itemPath: string, item: VCLegacyContracts.ItemModel) {
        if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            this._cachedSourceItems[(itemPath || "").toLowerCase()] = item;
        }
        else {
            this._cachedSourceItems[itemPath] = item;
        }
    }

    public addUnsavedItem(item: VCLegacyContracts.ItemModel, refreshNodes: boolean) {
        if (!this._unsavedItemsByPath[item.serverItem]) {
            this._unsavedItemsByPath[item.serverItem] = item;

            const parentFolder = VersionControlPath.getFolderName(item.serverItem);
            let unsavedItems = this._unsavedItemsByParent[parentFolder];
            if (!unsavedItems) {
                unsavedItems = [item];
                this._unsavedItemsByParent[parentFolder] = unsavedItems;
            }
            else {
                unsavedItems.push(item);
            }

            this._setCachedSourceItem(item.serverItem, item);

            if (refreshNodes) {
                const parentNode = this._findSourceNodeByPath(parentFolder);
                if (parentNode) {
                    const parentNodeItem = this._getCachedSourceItem(parentNode.vcPath);
                    if (parentNodeItem && parentNodeItem.childItems) {
                        this._updateChangedChildItems(parentNode, parentNodeItem.childItems);
                    }
                }
            }
        }
    }

    private _updateDirtyState(itemPath: string, dirtyState: boolean, forceRefreshNode: boolean = false) {
        const currentDirtyState = !!this._dirtyStatesByPath[itemPath];

        if (currentDirtyState !== dirtyState || forceRefreshNode) {
            this._dirtyStatesByPath[itemPath] = dirtyState;
            const node = this._findSourceNodeByPath(itemPath);
            if (node) {
                this._updateItemNodeText(itemPath, node);
                this.updateNode(node);
            }
        }
    }

    private _updateParentNodeWithAddedItems(folderPath: string, fileNames: string[]) {
        const parentNode = this._findSourceNodeByPath(folderPath);
        if (parentNode) {
            this._fetchFolders([folderPath]);
        }
    }

    private _updateChangedItemNode(itemPath: string, itemSaved: boolean, isDeleted: boolean) {

        let refreshNeeded = false;
        const unsavedItem = this._unsavedItemsByPath[itemPath];
        const itemFolder = VersionControlPath.getFolderName(itemPath);

        if (unsavedItem) {

            delete this._unsavedItemsByPath[itemPath];

            const unsavedItems = this._unsavedItemsByParent[itemFolder];
            if (unsavedItems) {
                this._unsavedItemsByParent[itemFolder] = $.grep(unsavedItems, (unsavedItem: VCLegacyContracts.ItemModel) => {
                    return unsavedItem.serverItem !== itemPath;
                });
            }
            refreshNeeded = true;
        }

        if (itemSaved) {
            this._updateDirtyState(itemPath, false, true);
        }
        else {
            this._setCachedSourceItem(itemPath, null);
        }

        if (refreshNeeded || isDeleted) {
            const parentNode = this._findSourceNodeByPath(itemFolder);
            if (parentNode) {
                const parentNodeItem = this._getCachedSourceItem(parentNode.vcPath);
                if (parentNodeItem && parentNodeItem.childItems) {
                    if (itemSaved && unsavedItem) {
                        parentNodeItem.childItems.push(unsavedItem);
                    }
                    else if (isDeleted) {
                        parentNodeItem.childItems = $.grep(parentNodeItem.childItems, (childItem: VCLegacyContracts.ItemModel) => {
                            return childItem.serverItem !== itemPath;
                        });
                    }
                    this._updateChangedChildItems(parentNode, parentNodeItem.childItems);
                }
            }
        }
    }

    /**
    * Contacts the server to retrieve item information for the provided path and sets the item as the
    * selected item in the source explorer tree.
    * @param {string} itemPath is the path of the item that gets selected in the tree
    * @param {boolean} ignoreErrors when set to true ignores any errors encountered when contacting the server
    * @param {IErrorCallback} errorCallback is called if it is set, ignoreErrors is set to false, and an error is encountered when contacting the server
    */
    public setSelectedItemPath(itemPath: string, ignoreErrors?: boolean, errorCallback?: IErrorCallback): void {
        const cachedItem = this._getCachedSourceItem(itemPath);
        let errorHandler = null;

        if (cachedItem) {
            this.setSelectedItem(cachedItem);
        }
        else {
            if (ignoreErrors) {
                errorHandler = () => { };
            }
            else if (errorCallback) {
                errorHandler = errorCallback;
            }

            this._repositoryContext.getClient().beginGetItem(this._repositoryContext, itemPath, this._version, <VCLegacyContracts.ItemDetailsOptions>{
                recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel
            }, (item) => {
                    this.setSelectedItem(item);
                }, errorHandler);
        }
    }

    public setSelectedItem(item: VCLegacyContracts.ItemModel, errorCallback?: IErrorCallback) {

        const foldersToFetch = [];
        let itemPath;
        let parentItemPath;
        let cachedItem;

        if (!this._repositoryContext) {
            return;
        }

        if (!item) {
            this._selectedPath = "";
            this.setSelectedNode(null, true);
            return;
        }

        itemPath = item.serverItem;
        this._selectedPath = itemPath;
        this._setCachedSourceItem(itemPath, item);

        if (item.isFolder && !item.childItems) {
            foldersToFetch.push(itemPath);
        }

        const node = this._findSourceNodeByPath(this._selectedPath);
        if (node && node.folder && item.childItems) {
            node.expanded = true;
            if (!node.childrenPopulated) {
                this._populateChildItems(node, item.childItems);
                this._draw();
            }
            else {
                this._updateChangedChildItems(node, item.childItems);
            }
        }

        this.setSelectedNode(node, true);

        // Make a list of parent nodes that we don't have cached.
        while (itemPath && this._repositoryContext.comparePaths(itemPath, this._repositoryContext.getRootPath()) !== 0) {
            parentItemPath = VersionControlPath.getFolderName(itemPath);
            if (parentItemPath === itemPath) {
                // Parent of the root is still the root
                break;
            }

            itemPath = parentItemPath;
            cachedItem = this._getCachedSourceItem(itemPath);
            if (!cachedItem || cachedItem.isFolder && !cachedItem.childItems) {
                foldersToFetch.push(itemPath);
            }
        }

        if (foldersToFetch.length > 0) {
            this._fetchFolders(foldersToFetch, errorCallback);
        }
    }

    private _getSourceContextMenuItems(node: SourceExplorerTreeNode) {

        const menuItems: any[] = [];
        const nodeIsFavorite = node.type === "my" || node.type === "team";

        menuItems.push({
            id: "view-content",
            text: VCResources.ViewContentsMenu,
            title: VCResources.ViewContentsMenu,
            action: () => {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_VIEW_CONTENT, {}));

                // After permanently switching to the SPA contributed VC hub model, we can get rid of this apps controller check and else statement.
                const controller: string = this._options.tfsContext.navigation.currentController;
                const fragment: string = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Contents, node.vcPath, this._version);
                if (controller.toLowerCase() === "apps") {
                    // Assuming we're in a Code group (collection or project level), get the git/tfvc files hub to switch to.
                    const hubsService = <HubsService>VSSService.getLocalService(HubsService);
                    const selectedHubGroupId: string = hubsService.getSelectedHubGroupId();
                    const hubs: Hub[] = hubsService.getHubsByGroupId(selectedHubGroupId);
                    const contentHub: Hub = selectedHubGroupId === "ms.vss-code-web.collection-code-hub-group" ?
                        Utils_Array.first(hubs, hub => hub.id === "ms.vss-code-web.collection-files-hub-tfvc") :
                        Utils_Array.first(hubs, hub => hub.id === "ms.vss-code-web.files-hub-git" || hub.id === "ms.vss-code-web.files-hub-tfvc");

                    if (contentHub) {
                        if (contentHub.isSelected) {
                            window.location.href = fragment;
                        }
                        else {
                            hubsService.navigateToHub(contentHub.id, contentHub.uri + fragment.replace("#", "?"));
                        }
                    }
                }
                else {
                    const url = this._options.tfsContext.getActionUrl(null, controller);
                    window.open(url + fragment, "_self");
                }
                return false;
            },
            groupId: "viewing"
        });

        if (this._isEditableVersion) {
            if (node.folder) {
                menuItems.push({ separator: true });
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getAddNewFileMenuItem(this._repositoryContext, node.vcPath, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
                if (node.vcPath !== this._repositoryContext.getRootPath()) {
                    menuItems.push(VCSourceEditingMenuItems.MenuItems.getRenameMenuItem(this._repositoryContext, node.vcPath, this._version, !!node.folder, { customerIntelligenceData: this._customerIntelligenceData }));
                    menuItems.push(VCSourceEditingMenuItems.MenuItems.getDeleteMenuItem(this._repositoryContext, node.vcPath, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
                }
            }
            else {
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getEditFileMenuItem(this._repositoryContext, node.vcPath, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
                menuItems.push({ separator: true });
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getRenameMenuItem(this._repositoryContext, node.vcPath, this._version, !!node.folder, { customerIntelligenceData: this._customerIntelligenceData }));
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getDeleteMenuItem(this._repositoryContext, node.vcPath, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
            }
            menuItems.push({ separator: true });
        }

        menuItems.push({
            id: "view-history",
            text: VCResources.ViewHistory,
            title: VCResources.ViewHistory,
            icon: "bowtie-icon bowtie-navigate-history",
            action: () => {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_VIEW_HISTORY, {}));
                window.open(VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.History, node.vcPath, this._version), "_self");
                return false;
            },
            groupId: "viewing"
        });

        if (node.folder || nodeIsFavorite) {
            if (this._options.showFavorites) {
                menuItems.push({ separator: true });

                if (nodeIsFavorite || this._isInMyFavorites(node.vcPath)) {
                    menuItems.push(CommonMenuItems.removeFromMyFavs());
                }
                else {
                    menuItems.push(CommonMenuItems.addToMyFavs());
                }

                // Display menu as disabled if the user does not have team admin permission
                const disableEditTeamFavorites = false;
                if (this._isInTeamFavorites(node.vcPath)) {
                    menuItems.push(CommonMenuItems.removeFromTeamFavs(disableEditTeamFavorites));
                } else {
                    menuItems.push(CommonMenuItems.addToTeamFavs(disableEditTeamFavorites));
                }

                // add pin to dashboard. 
                let widgetName = node.text;
                if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    widgetName += " (" + this._version.substring(2) + ")";
                } else if (widgetName.indexOf('$/') == 0) {
                    widgetName = widgetName.substring(2);
                }

                this._buildDashboardMenuEntry(menuItems,
                    JSON.stringify({
                        path: node.vcPath,
                        version: this._version,
                        repositoryId: this._repositoryContext.getRepositoryId()
                    }),
                    widgetName,
                    TFS_Dashboards_PushToDashboardConstants.CodeScalar_WidgetTypeID
                );
                
            }
            menuItems.push({ separator: true });
            menuItems.push({
                id: "downloadAsZip",
                text: VCResources.DownloadAsZip,
                icon: "bowtie-icon bowtie-transfer-download",
                action: () => {
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_DOWNNLOAD_AS_ZIP, {}));
                    window.open(VersionControlUrls.getZippedContentUrl(this._repositoryContext, node.vcPath, this._version), "_blank");
                    return false;
                },
                groupId: "actions"
            });
        }
        else if (!node.isSymLink) {
            menuItems.push({
                id: "download",
                text: VCResources.DownloadFile,
                icon: "bowtie-icon bowtie-transfer-download",
                action: () => {
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_DOWNNLOAD, {}));
                    window.open(VersionControlUrls.getFileContentUrl(this._repositoryContext, node.vcPath, this._version), "_blank");
                    return false;
                },
                groupId: "actions"
            });
            if (node.vcPath.split('.').pop().toLowerCase() === "md") {
                this._buildDashboardMenuEntry(menuItems,
                    JSON.stringify({
                        path: node.vcPath,
                        version: this._version,
                        repositoryId: this._repositoryContext.getRepositoryId()
                    }),
                    "Pinned Markdown",
                    TFS_Dashboards_PushToDashboardConstants.Markdown_WidgetTypeID
                    );
        }
        }

        if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc || node.vcPath === this._repositoryContext.getRootPath()) {
            menuItems.push({ separator: true });
            menuItems.push(CommonMenuItems.security());
        }

        return menuItems;
    }

    /*
    * Add an entry to the pin item into the Dashboard if the feature flag is on and if the pinning code is a team one.
    * @param {any[]} menuItems is the collection of items in the menu. This allow us to add a new entry for the dashboard
    * @param {string} artifactId is the item id used to be associated with the pin action
    * @param {string} widgetName is the name to display into the widget on the dashboard
    * @param {string} widgetTypeId is the type of the widget you are building the menu for: it could be CodeScaler or Markdown
    * @return {void} Nothing is returned, we add directly into the menuItems
    */
    private _buildDashboardMenuEntry(menuItems: any[], artifactId: string, widgetName: string, widgetTypeId: string): void {
            menuItems.push({ separator: true });
        const widgetData = new TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning(widgetName, widgetTypeId, artifactId);
            //Create the main menu for pinning to dashboard and do an Ajax call to get submenu
            const mainMenuWithSubMenus = TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(TfsContext.getDefault().contextData, widgetData);
            menuItems.push(mainMenuWithSubMenus);
        }

    private _getFetchFoldersPerformanceForAPICall() {
        if (this._performance) {
            this._performance.pendingAPICalls++; // if this is a subsequent call to _fetchFolders() while already processing
            return this._performance;
        }
        else {
            return {
                marker: Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "SourceExplorerTreePerformance._onItemsFetched"),
                pendingAPICalls: 1,
            }
        }
    }

    private _fetchFolders(folderPaths, errorCallback?: IErrorCallback) {
        let i;
        let fetchItemsParam;

        // fetch the items in order - from root (parent) down to lowest child
        fetchItemsParam = [];
        for (i = folderPaths.length - 1; i >= 0; i--) {
            fetchItemsParam.push({ path: folderPaths[i], version: this._version });
        }

        const onItemsFetchedPerformance = this._getFetchFoldersPerformanceForAPICall(); // Shove it onto the stack

        const getItemsCallback = (items: VCLegacyContracts.ItemModel[]) => {
            this._performance = onItemsFetchedPerformance; // pull it off the stack and store in an instance variable so we can catch it on re-entry to _fetchFolders
            this._performance.pendingAPICalls--;

            this._onItemsFetched(items);

            if (this._performance.pendingAPICalls > 0) {
                this._performance.marker.addSplitTiming("more folders pending fetch");
            }
            else {
                this._performance.marker.end();
            }

            this._performance = null;
        };

        this._repositoryContext.getClient().beginGetItems(this._repositoryContext, fetchItemsParam, <VCLegacyContracts.ItemDetailsOptions>{
            recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevelPlusNestedEmptyFolders
        }, getItemsCallback, errorCallback);
    }

    private _findSourceNodeByPath(path: string) {
        let result: SourceExplorerTreeNode = null;

        Utils_UI.walkTree.call(this.rootNode, (treeNode: SourceExplorerTreeNode) => {
            if (!result && treeNode.type === "source" && this._repositoryContext.comparePaths(path, treeNode.vcPath) === 0) {
                result = treeNode;
            }
        });

        return result;
    }

    private _onItemsFetched(items: VCLegacyContracts.ItemModel[]) {
        const originalNodeSelection = this._findSourceNodeByPath(this._selectedPath);

        if (items && items.length) {
            $.each(items, (i, item) => {
                this._setCachedSourceItem(item.serverItem, item);
                let node = this._findSourceNodeByPath(item.serverItem);

                // If the node was not found
                // because the path is a partial path (/folder1/folder2) of an existing, combined, nested folder path (/folder1/folder2/folder3),
                // set a flag to skip creation of a node and population of its children.
                const isPartialCombinedPath = !node && item.isFolder && item.childItems && item.childItems.length == 1 && item.childItems[0].isFolder;

                // Create node and populate its children?
                if (isPartialCombinedPath === false) {
                    if (!node) {
                        // Node not present - try to add to parent node
                        const parentNode = this._findSourceNodeByPath(VersionControlPath.getFolderName(item.serverItem));
                        if (parentNode) {
                            node = this.createSourceNode(item, parentNode);
                            parentNode.add(node);
                        }
                    }

                    if (node && item.childItems) {
                        this._populateChildItems(node, item.childItems);
                    }
                }
            });
        }

        this._draw();

        const selectedNode = this._findSourceNodeByPath(this._selectedPath);
        
        // If the selected node was not found,
        // such as when the path is a partial path (/folder1/folder2) of a combined, nested folder path (/folder1/folder2/folder3),
        // attempt to expand the root node.
        if (!selectedNode) {
            const rootNode = this._findSourceNodeByPath(this._repositoryContext.getRootPath());
            if (rootNode) {
                this._expandNode(rootNode);
            }
        }
        else if (originalNodeSelection !== selectedNode && this._selectedPath) {
            if (selectedNode && selectedNode.folder && !selectedNode.expanded) {
                this._expandNode(selectedNode);
            }
            this.setSelectedNode(selectedNode, true);
        }
    }

    protected _populateChildItems(parentNode: SourceExplorerTreeNode, childItems: VCLegacyContracts.ItemModel[]) {

        parentNode.clear();

        const unsavedNodes = this._unsavedItemsByParent[parentNode.vcPath];
        if (unsavedNodes) {
            childItems = [].concat(childItems).concat(unsavedNodes);
        }

        $.each(childItems, (i, childItem) => {
            // If we've cached an item with populated children, use that instead of this fetched and unpopulated child item
            const cachedItem = this._getCachedSourceItem(childItem.serverItem);
            let childNode;
            if (cachedItem) {
                childNode = this.createSourceNode(cachedItem, parentNode);
                if (cachedItem.childItems) {
                    // if we've already cached the item and its children, fill out more of the tree pre-emptively using the cached data (to avoid superfluous API calls)
                    this._populateChildItems(childNode, cachedItem.childItems);
                }
            }
            else {
                childNode = this.createSourceNode(childItem, parentNode);
            }
            parentNode.add(childNode);
        });

        parentNode.children.sort(this._sortNodes);

        parentNode.emptyFolderNodeText = Resources_Platform.NoItemsInThisFolder;
        parentNode.childrenPopulated = true;
    }

    private _updateChangedChildItems(parentNode: SourceExplorerTreeNode, currentChildItems: VCLegacyContracts.ItemModel[]) {
        let hasChanges = false;
        const updatedChildNodes: SourceExplorerTreeNode[] = [];
        const currentItemsByPath: { [index: string]: VCLegacyContracts.ItemModel } = {};
        const existingNodesByPath: { [index: string]: SourceExplorerTreeNode } = {};

        const unsavedNodes = this._unsavedItemsByParent[parentNode.vcPath];
        if (unsavedNodes) {
            currentChildItems = [].concat(currentChildItems).concat(unsavedNodes);
        }

        // Build a cache of items by path to avoid N-squared lookups
        $.each(currentChildItems, (i, currentChildItem) => {
            currentItemsByPath[currentChildItem.serverItem] = currentChildItem;
        });

        // Remove items that are not longer present
        $.each(parentNode.children, (i, existingNode) => {
            if (currentItemsByPath[existingNode.vcPath]) {
                updatedChildNodes.push(existingNode);
            }
            else {
                hasChanges = true;
            }
        });

        // Build a cache of nodes by path to avoid N-squared lookups
        $.each(updatedChildNodes, (i, updatedChildNode) => {
            existingNodesByPath[updatedChildNode.vcPath] = updatedChildNode;
        });

        // Add new items
        $.each(currentChildItems, (i, currentChildItem) => {
            if (!existingNodesByPath[currentChildItem.serverItem]) {
                hasChanges = true;
                updatedChildNodes.push(this.createSourceNode(currentChildItem, parentNode));
            }
        });

        if (hasChanges) {
            parentNode.children = updatedChildNodes;
            parentNode.children.sort(this._sortNodes);
            this._draw();
        }
    }

    private _sortNodes(node1: SourceExplorerTreeNode, node2: SourceExplorerTreeNode) {

        if (node1.folder) {
            if (!node2.folder) {
                // folders are first
                return -1;
            }
        }
        else if (node2.folder) {
            // folders are first
            return 1;
        }

        return Utils_String.localeIgnoreCaseComparer(node1.text, node2.text);
    }

    private _expandNode(node: SourceExplorerTreeNode) {
        this._setNodeExpansion(node, $(this._getNodeElement(node)), true);
    }

    private static getTreeItemCount(rootNode: TreeView.TreeNode): number {
        let itemCount = 0;

        Utils_UI.walkTree.call(rootNode, node => itemCount++);

        return itemCount - 1; // Subtract the root node.
    }

    public _draw() {
        this._drawPerformance = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "SourceExplorerTreePerformance._draw");

        this._drawPerformance.addData({
            numberOfRootItems: this.rootNode.children.length,
            numberOfItems: Tree.getTreeItemCount(this.rootNode),
        });

        super._draw();

        this._drawPerformance.end();
    }

    private _populateTree() {
        const rootNode = this.rootNode;
        rootNode.clear();

        let showingAnyFavorites = false;
        if (this._favoriteNodes) {
            $.each(this._favoriteNodes, (i, favNode) => {

                //only add the favorites nodes if we actually have any favorites under it.
                if (favNode.children.length > 0) {
                    rootNode.add(favNode);
                    showingAnyFavorites = true;
                }
            });
        }

        if (this._sourceNodes) {
            $.each(this._sourceNodes, (i, sourceNode) => {
                rootNode.add(sourceNode);
            });
        }

        this._draw();

        //The trees that have favorites should render a little differently.
        if (this._options.showFavorites && showingAnyFavorites) {
            this._element.addClass("with-favorites");
        }
        else {
            this._element.removeClass("with-favorites");
        }
    }

    private getFavoriteItemModel(favItem) {
        let favoriteItem: any;

        try {
            favoriteItem = Utils_Core.parseMSJSON(favItem.data, false);
        }
        catch (ex) {
        }

        if (!favoriteItem) {
            favoriteItem = {
                path: favItem.data || "$/"
            };
        }

        return favoriteItem;
    }

    private _refreshFavorites(populateTree: boolean) {
        let node: SourceExplorerTreeNode;

        this._favoriteNodes = [];

        if (this._repositoryContext) {

            if (this._myFavoriteStore) {

                // Creating my favorites container node
                const myNode = <SourceExplorerTreeNode>CommonTreeNodes.myFavorites("path-container-node");
                myNode.expanded = this._myFavoriteStore.children.length > 0;
                myNode.emptyFolderNodeText = VCResources.NoFavoritesFound;
                myNode.isHighlighted = true;
                this._favoriteNodes.push(myNode);

                // Populating my favorite paths
                $.each(this._myFavoriteStore.children, (i, favorite) => {
                    const favoriteItemModel = this.getFavoriteItemModel(favorite);
                    if ((favoriteItemModel.repositoryId || null) === (this._repositoryContext.getRepositoryId() || null)) {
                        node = this.createFavDefinitionNode(favoriteItemModel, "my", favorite.data);
                        myNode.add(node);
                    }
                });
            }

            // Populating team favorite paths (only in team context)
            if (this._teamFavoriteStore) {

                // Creating team favorites container node
                const teamNode = <SourceExplorerTreeNode>CommonTreeNodes.teamFavorites("path-container-node");
                teamNode.expanded = this._teamFavoriteStore.children.length > 0;
                teamNode.emptyFolderNodeText = VCResources.NoFavoritesFound;
                teamNode.isHighlighted = true;
                this._favoriteNodes.push(teamNode);

                $.each(this._teamFavoriteStore.children, (i, favorite) => {
                    const favoriteItemModel = this.getFavoriteItemModel(favorite);
                    if ((favoriteItemModel.repositoryId || null) === (this._repositoryContext.getRepositoryId() || null)) {
                        node = this.createFavDefinitionNode(favoriteItemModel, "team", favorite.data);
                        teamNode.add(node);
                    }
                });
            }

            // Publish telemetry for showing favorites only once.
            if (this._shouldPublishFavoritesTelemetry) {
                this._publishShowFavoritesTelemetry();
                this._shouldPublishFavoritesTelemetry = false;
            }
        }

        if (populateTree) {
            this._populateTree();
        }
    }

    /** Publish telemetry for showing My and Team Favorites along with counts of each item */
    private _publishShowFavoritesTelemetry() {

        const isGit = this._repositoryContext.getRepositoryType() === RepositoryType.Git;

        this._favoriteNodes.forEach((node: SourceExplorerTreeNode) => {

            // Iterate over "my" and "team" favorites.
            if (node.type === "my" || node.type === "team") {
                let folderCount: number = 0;
                let rootCount: number = 0;
                let totalCount: number = 0;

                // Collect information on favorite items.
                if (node.children && node.children.length > 0) {
                    node.children.forEach((favorite: SourceExplorerTreeNode) => {
                        totalCount++;

                        if (this._isFavoriteToRoot(isGit, favorite)) {
                            rootCount++;
                        }
                        else {
                            folderCount++;
                        }
                    });
                }

                // Publish telemetry with counts
                if (totalCount > 0) {
                    const feature = (node.type === "my") ? CustomerIntelligenceConstants.SOURCEEXPLORERTREE_SHOW_MY_FAVS : CustomerIntelligenceConstants.SOURCEEXPLORERTREE_SHOW_TEAM_FAVS;
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, feature, {
                        isGit,
                        rootCount,
                        folderCount,
                        totalCount
                    }));
                }
            }
        });
    }

    /** Returns true if the favorite node points to the repo root - either an empty path, "/" for Git, or "$/ProjectName" for Tfvc */
    private _isFavoriteToRoot(isGit: boolean, favorite: SourceExplorerTreeNode): boolean {
        return !favorite.vcPath || (isGit && favorite.vcPath === "/") || (!isGit && favorite.vcPath.lastIndexOf("/") === 1);
    }

    public _updateNode($li: JQuery, node: SourceExplorerTreeNode, level: number) {
        const divNodeContent = super._updateNode($li, node, level);
        let iconClass: string;
        let iconTitle: string;

        if (this._isEditableVersion && node.folder) {
            const $contentNode = $li.find("> .node-link > .node-content");
            FileInput.FileDropTarget.makeDropTarget($contentNode, {
                dropCallback: (dataDrop: DataTransfer) => {
                    VCSourceEditingDialogs.Actions.showAddNewItemsUI(this._repositoryContext, node.vcPath, this._version, dataDrop, false, true);
                }
            });
        }

        return divNodeContent;
    }

    private _onPathChanged(e?) {
        const currentNode = this.getSelectedNode();
        let changeData: { path: string, folder: boolean, version?: string };

        changeData = {
            path: currentNode ? currentNode.vcPath : null,
            folder: currentNode ? (currentNode.favData || currentNode.folder ? true : false) : true
        };

        if (currentNode && currentNode.version) {
            changeData.version = currentNode.version;
        }

        // Publish telemetry for clicking my or team favorites
        if (this._repositoryContext && currentNode && currentNode.type === "my" || currentNode.type === "team") {
            const isGit = this._repositoryContext.getRepositoryType() === RepositoryType.Git;
            const isToRoot = this._isFavoriteToRoot(isGit, currentNode);
            const isToFolder = !isToRoot;

            const feature = (currentNode.type === "my") ? CustomerIntelligenceConstants.SOURCEEXPLORERTREE_CLICK_MY_FAVS : CustomerIntelligenceConstants.SOURCEEXPLORERTREE_CLICK_TEAM_FAVS;
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, feature, {
                isGit,
                isToRoot,
                isToFolder
            }));
        }

        this._fire("source-item-path-changed", changeData);
        return false;
    }

    private _onMenuItemClick(e?: any): any {
        /// <param name="e" type="any" />
        /// <returns type="any" />

        const command = e.get_commandName();
        const args: {item: SourceExplorerTreeNode} = e.get_commandArgument();

        switch (command) {
            case CommonMenuItems.ADD_TO_MY_FAVORITES_ACTION:
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_ADD_TO_MY_FAVS, {}));
                this._addToMyFavorites(args.item.vcPath);
                break;
            case CommonMenuItems.ADD_TO_TEAM_FAVORITES_ACTION:
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_ADD_TO_TEAM_FAVS, {}));
                this._addToTeamFavorites(args.item.vcPath);
                break;
            case CommonMenuItems.REMOVE_FROM_MY_FAVORITES_ACTION:
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_REMOVE_FROM_MY_FAVS, {}));
                this._removeFromMyFavorites(args.item.vcPath, args.item.favData);
                break;
            case CommonMenuItems.REMOVE_FROM_TEAM_FAVORITES_ACTION:
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERTREE_REMOVE_FROM_TEAM_FAVS, {}));
                this._removeFromTeamFavorites(args.item.vcPath, args.item.favData);
                break;
            case TFS_Dashboards_PushToDashboardConstants.PinToDashboardCommand:
                TFS_Dashboards_PushToDashboard.PushToDashboard.pinToDashboard(TfsContext.getDefault().contextData, <any>args);
                break;
        }
        
        // Match the object that is used when this event is fired from SourceExplorerGrid
        e._commandArgument = <VCSourceExplorerGridOrTreeMenuItemClickedEvent.Arguments>{
            item: {
                path: args.item.vcPath,
                title: args.item.title
            }
        };
        
        this._fire(VCSourceExplorerGridOrTreeMenuItemClickedEvent.name, e);
    }

    private _removeFromFavorites(path: string, favData: string, store: TFS_OM_Common.FavoriteStore) {
        let favItem: TFS_OM_Common.FavoriteItem = null;
        let favItemName: string;

        if (store && favData) {
            favItem = store.findByData(favData);
        }
        else if (store && path) {
            favItemName = this._createFavItemName(path);
            favItem = store.findByPath(favItemName);

            if (!favItem && path.indexOf("$/") === 0) {
                // Handle old favorite storage format of just the path
                favItem = store.findByData(path);
            }
        }

        if (favItem) {
            favItem.beginDelete(() => {
                this._refreshFavorites(true);
            });
        }
    }

    private _removeFromMyFavorites(path: string, favData: string) {
        this._removeFromFavorites(path, favData, this._myFavoriteStore);
    }

    private _removeFromTeamFavorites(path: string, favData: string) {
        this._removeFromFavorites(path, favData, this._teamFavoriteStore);
    }

    private _addToFavorites(path: string, store: TFS_OM_Common.FavoriteStore) {
        /// <summary>Adds a VC path to My/Team Favorites.</summary>
        /// <param name="path" type="String">VC path to add</param>
        /// <param name="store" type="Object">Favorites store to add to</param>
        let favItemName;
        let favItemValue;
        if (path && store && !this._isFavorite(path, store)) {
            favItemName = this._createFavItemName(path);
            favItemValue = Utils_Core.stringifyMSJSON({
                path: path,
                version: this._version,
                repositoryId: this._repositoryContext.getRepositoryId() || undefined
            });
            store.beginCreateNewItem(favItemName, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_PATHS, favItemValue, () => {
                this._refreshFavorites(true);
            });
        }
    }

    private _addToMyFavorites(path: string) {
        /// <summary>Adds item to My Favorites.</summary>
        /// <param name="path" type="String">VC path to add</param>
        this._addToFavorites(path, this._myFavoriteStore);
    }

    private _addToTeamFavorites(path: string) {
        /// <summary>Adds item to Team Favorites.</summary>
        /// <param name="path" type="String">VC path to add</param>
        this._addToFavorites(path, this._teamFavoriteStore);
    }

    private _createFavItemName(path: string): string {
        /// <summary>Creates a new favorite item name.</summary>
        /// <param name="path" type="String">path of the item</param>
        /// <returns type="String">Item name</returns>
        const segments = [this._repositoryContext.getRepositoryId(), this._version || ""].concat(path.split("/"));
        return segments.join(":");
    }

    private _isFavorite(path: string, store: any): boolean {
        /// <summary>Checks if the VC path is in the specified my/team favorites store</summary>
        /// <param name="path" type="String">VC path to check</param>
        /// <param name="store" type="Object">Favorites store to check</param>
        /// <returns type="Boolean">True if a favorite</returns>
        const favItemName = this._createFavItemName(path);
        if (store && store.findByPath(favItemName)) {
            return true;
        }

        return false;
    }

    private _isInMyFavorites(path: string): boolean {
        /// <summary>Checks if the VC path is in My Favorites.</summary>
        /// <param name="path" type="String">VC path to check</param>
        /// <returns type="Boolean">True if my favorite</returns>
        return this._isFavorite(path, this._myFavoriteStore);
    }

    private _isInTeamFavorites(path: string): boolean {
        /// <summary>Checks if the VC path is in Team Favorites.</summary>
        /// <param name="path" type="String">VC path to check</param>
        /// <returns type="Boolean">True if team favorite</returns>
        return this._isFavorite(path, this._teamFavoriteStore);
    }
}

VSS.classExtend(Tree, TfsContext.ControlExtensions);
