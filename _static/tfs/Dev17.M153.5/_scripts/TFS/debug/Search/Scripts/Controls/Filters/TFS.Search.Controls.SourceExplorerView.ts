// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Path_Scope_Input_TextBox = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.PathScopeInputTextBox");
import Q = require("q");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TreeView = require("VSS/Controls/TreeView");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import domElem = Utils_UI.domElem;
import delegate = Utils_Core.delegate;

export class SourceExplorerView extends TreeView.TreeView {
    private _repositoryContext: RepositoryContext;
    private _version: string;
    private _sourceNodes: any;
    private _selectedPath: string;
    private _selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler;
    private _loggingHandler: (source: string) => void;
    private _repoName: string;
    private _versionControlType: Base_Contracts.VersionControlType;
    private _sourceItemCache: any;
    public currentSelectedNode: any;
    
    constructor(options?: any) {
        super(options);

        this._sourceItemCache = {};
        this._versionControlType = this._options["versionControlType"];
    }

    public initialiseRepositoryContext(repositoryContext: RepositoryContext, branchName: string) {
        this._repositoryContext = repositoryContext;
        this._repoName = SourceExplorerView._getRepositoryName(this._repositoryContext);
        this._version = branchName;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "source-explorer-tree vc-tree vc-hoverable",
            clickToggles: true
        }, options));

        this._loggingHandler = this._options["logHandler"];
    }

    public initialize() {
        super.initialize();
        this._element.bind("selectionchanged", delegate(this, this._onPathChanged));
    }

    public setSelectionChangedHandler(handler: Search_Filter_Base.FilterItemClickHandler): void {
        this._selectionChangedHandler = handler;
    }

    /**
    * Method is called as and when a user selects a node in the treeview.
    */
    public onItemClick(node, nodeElement, e?): any {
        // log telemetry for UX usage
        if (this._loggingHandler) {
            this._loggingHandler(Search_Constants.SearchConstants.SouceExplorerViewTraceSourceName);
        }

        if (node.type === "source" && node.folder === true) {
            this._selectedPath = node.path;

            var successDelegate = delegate(this, (result: any) => {
                var selectedNode = this._findSourceNodeByPath(this._selectedPath);
                if (selectedNode && selectedNode.folder === true) {
                    // no need to redraw here, as selectionChange event will be fired here
                    // which will cause the control to re-draw.
                    this._expandNode(selectedNode);
                    this.setSelectedNode(selectedNode);
                }
            });

            if (node.childrenPopulated === false) {
                this._fetchFolders([node.path]).then(successDelegate);
            }
            else {
                this._expandNode(node);
                this.setSelectedNode(node);
            }
        }

        return false;
    }

    /**
    * Method is called when a node is toggled from expanded to collapsed state or vice-versa. 
    * Fetch the item from the server if its children are not populated.
    */
    public _toggle(node, nodeElement): any {
        super._toggle(node, nodeElement);

        // just load children and expand
        if (node.type === "source" && node.folder === true && node.childrenPopulated === false) {
            var successDelegate: any = delegate(this, (result: boolean) => {
                if (node.expanded === false) {
                    this._expandNode(node);
                }

                this.draw();
            });

            this._fetchFolders([node.path]).then(successDelegate);
        }

        return true;
    }

    /**
    * Method instantiates the source node. Called once to initialize the source tree view.
    */
    public reload(): void {
        if (this._repositoryContext) {
            this._sourceNodes = [this._createRepoNode(this._repositoryContext)];
        }
        else {
            this._sourceNodes = [];
        }

        this._populateTree();
    }
    
    /**
    * Selects the node in the source tree specified by "itemPath".
    * The item is fetched from server if not found in the cache maintained.
    * Returns a promise. Promise is reject if the Item if the path is invalid or non-existent other wise
    * is resolved with the "itemPath" signifying the item has been selected successfully.
    */
    public setSelectedItemPath(itemPath: string, suppressPathChange: boolean): Q.Promise<any> {
        var deferred = Q.defer<any>();

        itemPath = itemPath || this._repositoryContext.getRootPath();

        // if current selected path is same as the itempath.
        // just resolve the promise no need to load the data again.
        if (this._selectedPath === itemPath) {
            deferred.resolve(itemPath);
            return deferred.promise;
        }

        var cachedItem: any = this._getCachedSourceItem(itemPath),
            successDelegate: any = delegate(this, (redraw: boolean) => {
                // if new data is loaded redraw the tree.
                if (redraw === true) {
                    this.draw();
                }

                deferred.resolve(itemPath);
            }),
            errorDelegate: any = delegate(this, (error: any) => {
                if (error.name === "TFS.WebApi.Exception") {
                    if ((Utils_String.ignoreCaseComparer(error.serverError.typeKey, "ItemNotFoundException") === 0)
                        || (Utils_String.ignoreCaseComparer(error.serverError.typeKey, "GitItemNotFoundException") === 0)) {
                        // Show invalid path error dialog
                        deferred.reject(error);
                    }
                    else if (error.message.indexOf("Cannot find any branches for the") !== -1 || error.message.indexOf("you do not have permission to access it") !== -1) {
                        var node = this._findSourceNodeByPath(itemPath);
                        node.emptyFolderNodeText = Search_Resources.TfvcNoItemsInDirectoryMessage;
                        this.draw();
                        deferred.resolve(itemPath);
                    }
                    else {
                        deferred.reject(error);
                    }
                }
                else {
                    deferred.reject(error);
                }
            });

        if (cachedItem) {
            this._setSelectedItem(cachedItem, suppressPathChange).then(successDelegate, errorDelegate);
        }
        else {
            this._repositoryContext.getClient().beginGetItem(this._repositoryContext, itemPath, this._version, null, (item) => {
                this._setSelectedItem(item, suppressPathChange).then(successDelegate, errorDelegate);
            }, errorDelegate);
        }

        return deferred.promise;
    }

    private draw(): void {
        super._draw();
    }

    /**
    * Method selects the "item" in the tree view.
    * There can be a case where the "item" is not present in the tree view, in such scenarios
    * all the items represented as folders in item's path are fetched and saved in cache.
    * Returns a promise. Promise is resolved if the item in the tree is successfully selected.
    * Resolution can either be "true" or "false". True in cases where, while loading new data
    * has caused change in the structure of tree, and false otherwise.
    */
    private _setSelectedItem(item: VCLegacyContracts.ItemModel, supressPathChangeEvent: boolean): Q.Promise<any> {
        var foldersToFetch = [],
            itemPath,
            parentItemPath,
            cachedItem,
            node,
            deferred = Q.defer<any>();

        if (!item) {
            this._selectedPath = "";
            this.setSelectedNode(null, true);

            // reject the promise as the item is undefined.
            deferred.reject(Search_Resources.SourceExplorerViewItemNotFoundErrorMessage);
            return deferred.promise;
        }

        itemPath = item.serverItem;
        this._selectedPath = itemPath;
        this._setCachedSourceItem(itemPath, item);

        if (item.isFolder === true && !item.childItems) {
            foldersToFetch.push(itemPath);
        }

        node = this._findSourceNodeByPath(this._selectedPath);

        // node can be undefined if item is not present in the tree. In these cases all folders
        // within the item's path are fetched. If node is non-null value (i.e. it was already there in the tree)
        // then it's child nodes are populated and the tree is drawn.
        var needRedraw: boolean = false;
        if (node && node.folder === true && item.childItems) {
            node.expanded = true;
            if (node.childrenPopulated === false) {
                this._populateChildItems(node, item.childItems);
            }

            this.setSelectedNode(node, supressPathChangeEvent);
            needRedraw = true;
        }

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
            var successDelegate = delegate(this, (result: any) => {
                var selectedNode = this._findSourceNodeByPath(this._selectedPath);
                if (selectedNode && selectedNode.folder === true) {
                    this._expandNode(selectedNode);
                    this.setSelectedNode(selectedNode, supressPathChangeEvent);
                }

                deferred.resolve(true);
            });

            this._fetchFolders(foldersToFetch).then(successDelegate, (error) => { deferred.reject(error) });
        }
        else {
            deferred.resolve(needRedraw);
        }

        return deferred.promise;
    }

    /**
    * Given a list of "path"(e.g. $/a/b/c) the method calls the rest api to fetch the items represented by their respective path.
    * Returns a Q promise. Promise is resolved successfully if the data is loaded without any error, rejected otherwise.
    */
    private _fetchFolders(folderPaths): Q.Promise<any> {
        var i, fetchItemsParam, deferred = Q.defer();

        // fetch the items in order - from root (parent) down to lowest child
        fetchItemsParam = [];
        for (i = folderPaths.length - 1; i >= 0; i--) {
            fetchItemsParam.push({ path: folderPaths[i], version: this._version });
        }

        var successCallback: any = delegate(this, (response: VCLegacyContracts.ItemModel[]) => {
            this._onItemsFetched(response);
            deferred.resolve(true);
        });

        var errorCallback: any = delegate(this, (error: any) => {
            deferred.reject(error);
        });

        this._repositoryContext.getClient().beginGetItems(this._repositoryContext, fetchItemsParam, <VCLegacyContracts.ItemDetailsOptions>{
            recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel
        }, successCallback, errorCallback);

        return deferred.promise;
    }

    /**
    * Method is called when the fetch for various "folderPaths" is completed.
    * It populates the tree with fetched items.
    */
    private _onItemsFetched(items: VCLegacyContracts.ItemModel[]): void {
        var selectedNode, nodePath;

        if (items) {
            $.each(items, (i, item) => {
                var node: any, parentNode: any;

                this._setCachedSourceItem(item.serverItem, item);
                node = this._findSourceNodeByPath(item.serverItem);
                if (!node) {
                    // Node not present - try to add to parent node
                    parentNode = this._findSourceNodeByPath(VersionControlPath.getFolderName(item.serverItem));
                    if (parentNode) {
                        node = this._createSourceNode(item);
                        parentNode.add(node);
                    }
                }

                if (node && item.childItems) {
                    this._populateChildItems(node, item.childItems);
                }
            });
        }
    }

    /**
    * Method to add child nodes to parent node, given their itemModel representaion.
    */
    private _populateChildItems(parentNode, childItems: VCLegacyContracts.ItemModel[]): void {
        parentNode.clear();

        $.each(childItems, (i, child) => {
            if (child.isFolder === true) {
                var childNode = this._createSourceNode(child);
                parentNode.add(childNode);
            }
        });

        parentNode.children.sort(SourceExplorerView._sortNodes);

        parentNode.emptyFolderNodeText = Search_Resources.TfvcNoItemsInDirectoryMessage;
        parentNode.childrenPopulated = true;
    }

    /**
    * Method to return the tree node given its path.
    */
    private _findSourceNodeByPath(path: string): any {
        var result = null;

        Utils_UI.walkTree.call(this.rootNode, (treeNode) => {
            if (!result && treeNode.type === "source" && this._repositoryContext.comparePaths(path, treeNode.path) === 0) {
                result = treeNode;
            }
        });

        return result;
    }

    private _expandNode(node: any): any {
        this._setNodeExpansion(node, $(this._getNodeElement(node)), true);
    }

    /**
    * Method adds source nodes in the source explorer tree and draws it.
    */
    private _populateTree(): void {
        var rootNode = this.rootNode;
        rootNode.clear();

        if (this._sourceNodes) {
            $.each(this._sourceNodes, (i, sourceNode) => {
                rootNode.add(sourceNode);
            });
        }

        // use base class's method.
        this.draw();
    }

    /**
    * Method creates the top level root node. e.g. $/ProjectName
    */
    private _createRepoNode(repositoryContext: RepositoryContext): any {
        var name: string = repositoryContext.getRepositoryType() === RepositoryType.Tfvc ? repositoryContext.getRootPath() : (<GitRepositoryContext>repositoryContext).getRepository().name,
            node: any = TreeView.TreeNode.create(name);

        var isTfsRepo: boolean = repositoryContext.getRepositoryType() === RepositoryType.Tfvc;
        var icon = isTfsRepo ? "bowtie-icon bowtie-vso-users" : "bowtie-icon bowtie-git";
        if (isTfsRepo) {
            icon = "bowtie-icon bowtie-tfvc-repo";
        }

        node.repositoryName = this._repoName;
        node.versionControlType = this._versionControlType;
        node.title = name;
        node.path = repositoryContext.getRootPath();
        node.type = "source";
        node.tag = repositoryContext;
        node.expanded = true;
        node.folder = true;
        node.emptyFolderNodeText = VCResources.LoadingText;
        node.childrenPopulated = false;
        node.icon = "source-icon " + icon;
        node.config = { css: "repository-node folder" };

        return node;
    }

    /**
    * Convertor method to convert a source node from ItemModel representation to treeNode representation.
    */
    private _createSourceNode(item): any {
        var node: any, name: string, repoName: string;

        name = VersionControlPath.getFileName(item.serverItem);
        node = TreeView.TreeNode.create(name),
        node.name = name;
        node.text = name;
        node.title = item.serverItem;
        node.path = item.serverItem;
        node.type = "source";
        node.tag = item;
        node.folder = item.isFolder;
        node.childrenPopulated = false;
        node.emptyFolderNodeText = VCResources.LoadingText;
        node.repositoryName = this._repoName;
        node.versionControlType = this._versionControlType;

        if (item.isBranch) {
            node.icon = "source-icon bowtie-icon bowtie-tfvc-branch";
        }
        else if (item.gitObjectType === VCOM.GitObjectType.Commit) {
            node.icon = "source-icon bowtie-icon bowtie-repository-submodule";
        }
        else if (item.isSymLink) {
            node.icon = "source-icon bowtie-icon bowtie-file-symlink";
            node.isSymLink = true;
        }
        else {
            node.icon = node.folder ? "source-icon bowtie-icon bowtie-folder" : "source-icon file";
        }

        return node;
    }

    /**
    * Called when selected path in the tree view is changed.
    */
    private _onPathChanged(e?): void {
        var currentNode: any = this.getSelectedNode();

        // call handler to handler the filter change event to update the filters in the URI appropriately.
        if (currentNode.folder === true) {
            if (this._selectionChangedHandler) {
                this._selectionChangedHandler(currentNode);
            }
        }
    }

    private _setCachedSourceItem(serverItem: string, item: any): void {
        var pathKey: string = SourceExplorerView._getPathKey(this._repositoryContext, item.serverItem);
        this._sourceItemCache[pathKey] = item;
    }

    private _getCachedSourceItem(serverItem: string): any {
        var pathKey: string = SourceExplorerView._getPathKey(this._repositoryContext, serverItem);
        return this._sourceItemCache[pathKey];
    }

    private static _getRepositoryName(repositoryContext: RepositoryContext): string {
        if (repositoryContext) {
            return repositoryContext.getRepositoryType() === RepositoryType.Tfvc ?
                repositoryContext.getRootPath() : (<GitRepositoryContext>repositoryContext).getRepository().name;
        }

        return null;
    }

    private static _getPathKey(repositoryContext: RepositoryContext, path: string): string {
        var itemPath = path;
        if (repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            itemPath = (path || "").toLowerCase();
        }

        return itemPath;
    }

    private static _sortNodes(node1: any, node2: any): number {
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
}