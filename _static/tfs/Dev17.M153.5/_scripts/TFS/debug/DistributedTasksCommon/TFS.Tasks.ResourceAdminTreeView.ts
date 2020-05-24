import ko = require("knockout");

import VSS = require("VSS/VSS");
import TreeView = require("VSS/Controls/TreeView");
import Navigation = require("VSS/Controls/Navigation");
import Menus = require("VSS/Controls/Menus");
import Controls = require("VSS/Controls");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

import Contracts = require("VSS/WebApi/Contracts");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export interface IResource {
    name: string;
    id: string;
    administratorsGroup: any;
    readersGroup: any;
}

export module CommonAdminActionIds {
    export var Security = "security";
    export var Resources = "resources";
}

export interface CommonAdminTreeOptions extends TreeView.ITreeOptions {
    resourceNodeCss: string;
    resourceNodeIcon: string;
    resourceMenuItems: Menus.IMenuItemSpec[];
    identityImageCss: string;
    tfsContext: any;
}

export class CommonAdminTree extends TreeView.TreeViewO<CommonAdminTreeOptions> {
    private _resourceNode: IResource[];
    private _resourceMap: IDictionaryStringTo<IResource>;
    private _selectedResourceId: string;
    private _selectedSecurityGroupId: string;
    private _currentFilter: string;

    public currentResourceAction: string = null;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            contextMenu: {
                executeAction: delegate(this, this._onMenuItemClick),
                "arguments": (contextInfo) => {
                    return {
                        node: contextInfo.item
                    };
                }
            }
        }, options));
    }

    public initialize(): void {
        super.initialize();

        this._resourceMap = {};

        this._bind("selectionchanged", delegate(this, this._onSelectionChanged));
    }

    private _onSelectionChanged(e: JQueryEventObject): void {
        var selectedNode: any = this.getSelectedNode();
        if (!selectedNode.tag) {
            this._selectedResourceId = null;
            this._selectedSecurityGroupId = null;
            return;
        }
        if (!!selectedNode.tag.isContainer) {
            this._selectedResourceId = null;
            this._selectedSecurityGroupId = selectedNode.tag.id;
        }
        else {
            this._selectedResourceId = selectedNode.tag.id;
            this._selectedSecurityGroupId = null;
        }
    }

    private _setResources(resources: IResource[]): void {
        // sort resources
        var sortedResources: IResource[] = [].concat(<any[]>resources);
        sortedResources.sort((a: IResource, b: IResource) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });
        this._resourceNode = sortedResources;

        // map resource by id
        var resourceMap: IDictionaryStringTo<IResource> = {};
        $.each(resources, (index: number, resource: IResource) => {
            resourceMap[resource.id] = resource;
        });
        this._resourceMap = resourceMap;

        this._populateResources(sortedResources);
    }

    private _populateResources(resources: IResource[]): void {
        // Empty the root node children first
        this.rootNode.children = [];
        $.each(resources, (index: number, resource: IResource) => {
            var resource: IResource = this._resourceMap[resource.id];
            if (!!resource) {
                var resourceNode = this._createResourceNode(resource);
                this.rootNode.add(resourceNode);
            }
        });

        if (!!this._selectedResourceId) {
            this.setSelectedNode(this._findNode(this._selectedResourceId, this._selectedSecurityGroupId));
        }

        this._draw();
    }

    public refreshResources(action?: string, isUpdate: boolean = false): IPromise<IResource[]> {
        // If this is just an update to tree based on action, we don't need to refresh resources
        var refresh = isUpdate ? false : true;
        return this.beginGetResources(action, refresh)
            .then((resources: IResource[]) => {
                this._setResources(resources);
                return resources;
            });
    }

    public beginGetResources(action?: string, refresh: boolean = true): IPromise<IResource[]> {
        return $.Deferred<IResource[]>().resolve([]);
    }

    public beginGetResouces(action?: string, refresh: boolean = true): IPromise<IResource[]> {
        return this.beginGetResources(action, refresh);
    }

    public getResourceMap(): IDictionaryStringTo<IResource> {
        return this._resourceMap;
    }

    public getResources(): IResource[] {
        return this._resourceNode;
    }

    public getSelectedResource(): IResource {
        var selectedNode = this.getSelectedNode();
        return selectedNode ? <IResource>selectedNode.tag : null;
    }

    public setSelectedResourceOrGroup(resource: IResource, group: Contracts.IdentityRef): void {
        var node: TreeView.TreeNode;
        var currentSelectedResource: IResource;

        if (!resource) {
            if ($.isArray(this.rootNode.children) && this.rootNode.children.length > 0) {
                this.setSelectedNode(this.rootNode.children[0]);
            }
            else {
                this.setSelectedNode(this.rootNode);
            }
        }
        else {
            currentSelectedResource = this.getSelectedResource();
            if (!currentSelectedResource || currentSelectedResource.id !== resource.id) {
                node = this._findNode(resource.id, group ? group.id : null);
                if (!!node) {
                    this.setSelectedNode(node);

                    this._selectedResourceId = resource.id;
                    this._selectedSecurityGroupId = group ? group.id : null;
                }
            }
        }
    }

    private _findNode(resourceId: string, groupId: string): TreeView.TreeNode {
        var result: TreeView.TreeNode = null;

        Utils_UI.walkTree.call(this.rootNode, (treeNode: TreeView.TreeNode) => {
            var nodeInfo: IResource;
            if (!result && treeNode.tag) {
                if (!!groupId) {
                    if (!!treeNode.tag.isContainer && Utils_String.localeIgnoreCaseComparer(treeNode.tag.id, groupId) === 0) {
                        result = treeNode;
                    }
                }
                else {
                    nodeInfo = <IResource>treeNode.tag;
                    if (!!resourceId) {
                        if (nodeInfo.id === resourceId) {
                            result = treeNode;
                        }
                    }
                    else {
                        if (!treeNode.tag) {
                            result = treeNode;
                        }
                    }
                }
            }
        });

        return result;
    }

    private _createResourceNode(resource: IResource): TreeView.TreeNode {
        var node = TreeView.TreeNode.create(resource.name, {
            css: this._options.resourceNodeCss
        });

        node.tag = resource;

        node.icon = this.getResouceNodeIcon(resource);
        node.folder = false;

        // administrators
        if (!!resource.administratorsGroup) {
            var administratorsGroup = TreeView.TreeNode.create(resource.administratorsGroup.displayName, {
                identityRef: resource.administratorsGroup
            });
            administratorsGroup.tag = resource.administratorsGroup;

            node.add(administratorsGroup);
        }

        // valid users
        if (!!resource.readersGroup) {
            var readersGroup = TreeView.TreeNode.create(resource.readersGroup.displayName, {
                identityRef: resource.readersGroup
            });
            readersGroup.tag = resource.readersGroup;

            node.add(readersGroup);
        }

        return node;
    }

    public _updateNode(li: JQuery, node: TreeView.TreeNode, level: number): void {
        if (!!node.config.identityRef) {
            this._updateGroupNode(li, node, level);
        }
        else {
            var iconUrl = "";
            var placeholderIconClass = "placeholder-icon-class";
            if (!!node.icon && Utils_String.startsWith(node.icon, "url ")) {
                iconUrl = node.icon.split(" ")[1];
                node.icon = placeholderIconClass;
            }

            var div = super._updateNode(li, node, level);

            if (!!div && iconUrl !== "") {
                var iconElement = div.find(`.${placeholderIconClass}`);
                var newIconElement = $("<img>").attr("src", iconUrl).addClass("icon tree-node-img");
                iconElement.replaceWith(newIconElement);
            }
        }
    }

    public getResouceNodeIcon(resource: any): string {
        return "icon icon-tfs-build-status-queued";
    }

    public onShowPopupMenu(node, options?): void {
        var menuItems: any[] = [];

        var tag = null;
        if (node.tag) {
            tag = node.tag;
        }
        // Currently, property - isContainer is used to differentiate between resource and it's groups
        if (tag && !tag.isContainer) {
            menuItems = menuItems.concat(this._options.resourceMenuItems);
        }
        super.onShowPopupMenu(node, $.extend({}, options, { items: menuItems }));
    }

    public onMenuItemClick(resource: IResource, command: string): any {
    }

    public formatGroupDisplayName(name: string): string {
        return name;
    }

    public filter(searchText: string): void {
        if (Utils_String.localeIgnoreCaseComparer(this._currentFilter, searchText) != 0) {
            var resources = this.getResources();
            var filteredResources = [];
            if (resources) {
                filteredResources = $.grep(resources, (resource, index) => {
                    return resource.name && Utils_String.caseInsensitiveContains(resource.name, searchText);
                });
            }

            this._populateResources(filteredResources);
            this._currentFilter = searchText;
        }
    }

    private _updateGroupNode(li: JQuery, node: TreeView.TreeNode, level: number): void {
        var link, div, paddingOffset;

        li.addClass("node");

        if (!node.root) {
            li.attr("title", node.title || node.text || "")
                .attr("id", "tfs_tnli" + node.id);

            if (node.selected) {
                li.addClass("selected");
            }

            if (node.folder) {
                li.addClass("folder");
            }

            if (node.config && node.config.css) {
                li.addClass(node.config.css);
            }

            if (this._options.contextMenu && !node.noContextMenu) {
                li.append($(domElem("div", "node-context-menu icon")));
            } else {
                if (node.noContextMenu) {
                    li.append($(domElem("div", "node-no-context-menu")));
                }
            }

            link = $("<a />").addClass("node-link");

            div = $("<div />")
                .addClass("node-content");

            var picContainer: JQuery;
            picContainer = $("<div />")
                .addClass(this._options.identityImageCss)
                .addClass("tree-node-img")
                .addClass("node-img");

            $("<img />")
                .addClass("identity-image")
                .attr("src", this._options.tfsContext.getIdentityImageUrl(node.config.identityRef.id))
                .appendTo(picContainer);

            div.append(picContainer);
            div.append($(domElem("span")).text(this.formatGroupDisplayName(node.config.identityRef.displayName)));

            // Give 4 px of padding to nodes that only contain text (no images)
            // This prevents the text for selected nodes from running right up against the selection border.
            paddingOffset = 4;

            div.css("padding-left", paddingOffset + (level * 12));

            link.append(div);
            li.append(link);
        }

        // Set the node in the data for the list item so we can lookup
        // which node is associated with the element.
        li.data(TreeView.TreeView.NODE_DATA_NAME, node);
        li.data(TreeView.TreeView.LEVEL_DATA_NAME, level);

        if (node.hasChildren() || (node.folder && this._options.useEmptyFolderNodes)) {
            this._drawChildren(node, li, level);
        }

        return div;
    }

    private _onMenuItemClick(e?: any): any {
        var command = e.get_commandName(),
            node = e.get_commandArgument().node;
        var resource: IResource = null;
        if (node.tag) {
            resource = node.tag;
        }

        this.onMenuItemClick(resource, command);
    }
}

export class SidebarSearch extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.sidebarSearch";

    public _input: any;
    public _button: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "sidebar-search"
        }, options));
    }

    public getSearchWaterMarkText() {
        return VSS_Resources_Common.SidebarSearchWatermark;
    }

    public initialize() {
        var title = this.getSearchWaterMarkText(),
            container, inputContainer;

        container = this._element.find(".search-input-wrapper");
        if (container.length === 0) {
            container = $("<div class='search-input-wrapper' />").appendTo(this._element);
        }

        inputContainer = $("<div class='search-input-container' />").appendTo(container);

        this._input = $("<input type='text' class='input' />")
            .appendTo(inputContainer)
            .attr("title", title);

        Utils_UI.Watermark(this._input, { watermarkText: title });

        this._button = $("<span class='bowtie-icon bowtie-search button' />")
            .appendTo(container);

        this._attachEvents();
        super.initialize();
    }

    public focus() {
        Utils_UI.Watermark(this._input, 'focus');
    }

    public _changeSearchIcon(clear) {
        this._button.addClass(clear ? "bowtie-search" : "bowtie-edit-delete");
        this._button.removeClass(clear ? "bowtie-edit-delete" : "bowtie-search");
    }

    public clearSearch() {
        this._fire('clearSearch');
    }

    public executeSearch(searchText) {
        this._fire('executeSearch', { searchText: searchText });
    }

    private _attachEvents() {
        this._bind(this._input, "mouseup", delegate(this, this._onSearch));
        this._bind(this._input, "keyup", delegate(this, this._onSearch));
        this._bind(this._button, "click", delegate(this, this._onClearSearch));
    }

    private _onSearch(e?) {

        var searchText;

        searchText = $.trim(this._input.val());

        if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this._onClearSearch();
            return;
        }

        this.cancelDelayedFunction("onSearch");

        if (searchText) {
            this._changeSearchIcon(false);
            this.delayExecute("onSearch", this._options.eventTimeOut || 250, true, function () {
                this.executeSearch(searchText);
            });
        }
        else {
            this._clearSearch();
        }
    }

    private _onClearSearch() {
        this._input.val("");
        this._input.blur();
        this._clearSearch();
    }

    private _clearSearch() {
        this._changeSearchIcon(true);
        this.clearSearch();
    }
}

export class CommonAdminTreeSearchBar extends SidebarSearch {
    public getSearchWaterMarkText(): string {
        return this._options.searchWaterMarkText || super.getSearchWaterMarkText();
    }

    public executeSearch(searchText: string) {
        this._options.resourceTree.filter(searchText);
    }

    public clearSearch() {
        this._options.resourceTree.filter("");
    }
}

/*
*  This has two predefined actions - "resource", "security"
*  Trees and Menus can be dynamically updated based on any custom action
*  But, currently "security" action always refers to a tab with action set to "resource"
*/
export class CommonResourceAdminView extends Navigation.TabbedNavigationView {
    private _navigating: boolean = false;
    private _resourcesControl: CommonAdminTree;
    private _resources: IResource[] = [];
    private _resourcesMap: IDictionaryStringTo<IResource> = {};
    private _resourcesMembershipsMap: IDictionaryStringTo<Contracts.IdentityRef>;
    private _menuBar: Menus.MenuBar;
    private _historyService: Navigation_Services.HistoryService;
    private _adminTabs: {[key: string] : {}};
    public $leftPane: JQuery;


    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            tabs: this._options.tabs,
            hubContentSelector: this._options.hubContentSelector,
            pivotTabsSelector: this._options.pivotTabsSelector
        }, options));

        this._adminTabs = this._options.tabs;
    }

    public initialize(): void {
        this.$leftPane = this._element.find(this._options.leftPaneSelector);

        this._resourcesControl = this.getAdminTreeView();

        Controls.Enhancement.enhance(CommonAdminTreeSearchBar, this.$leftPane.find(".search-input-wrapper"), $.extend(this._options, { resourceTree: this._resourcesControl }));

        this.$leftPane.show();

        super.initialize();

        this._resourcesControl._bind("selectionchanged", (e: JQueryEventObject) => {
            var selectedNode: any = this._resourcesControl.getSelectedNode();
            if (!!selectedNode && !!selectedNode.tag) {
                this._resourcesControl.focusOnNode(selectedNode);
                if (!!selectedNode.tag.isContainer) {
                    var resourceId: string = (<IResource>selectedNode.parent.tag).id;
                    var groupId: string = (<Contracts.IdentityRef>selectedNode.tag).id;
                    this._navigateToSecurityGroup(resourceId, groupId);
                }
                else {
                    this._navigateToResource(selectedNode.tag.id, null, true);
                }
            }
        });

        this._resourcesControl._bind("resource-deleted", (e: JQueryEventObject, args?: { action: string }) => {
            var action = args ? args.action : null;
            this._refreshResources(action).then(() => {
                var resources = this._resources;
                var id = null;
                if (resources.length > 0) {
                    id = resources[0].id;
                    this._navigateToResource(id, action);
                }
                else {
                    this._emptyResourceNavigate();
                }
            });
        });

        this._resourcesControl._bind("resource-created", (e: JQueryEventObject, args?: { action: string, id: string, elementToFocus?: string }) => {
            var action = args ? args.action : null;
            this._refreshResources(action).then(() => {
                var resources = this._resources;
                var id = null;
                var filteredResource = resources.filter((resource) => {
                    return Utils_String.equals(resource.id, args.id, true);
                });
                if (filteredResource && filteredResource[0]) {
                    id = filteredResource[0].id;
                }
                if (id || resources.length > 0) {
                    id = id || resources[0].id;
                    this._navigateToResource(id, action);
                    if(!!args.elementToFocus) {
                        let element = $(args.elementToFocus);
                        if (element && element.length > 0) {
                            element[0].focus();
                        }
                    }
                }
                else {
                    this._emptyResourceNavigate();
                }
            });
        });

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.$leftPane.find(this._options.menuBarSelector), {
            items: this.getMenuBarItems()
        });

        this._historyService = Navigation_Services.getHistoryService();
    }

    public getMenuBarItems(action?: string): Menus.IMenuItemSpec[] {
        return this._options.menuBarItems;
    }

    public getAdminTreeView(): CommonAdminTree {
        return <CommonAdminTree>Controls.Enhancement.enhance(CommonAdminTree, this.$leftPane.find(this._options.leftPaneResourcesSelector), this._options);
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback): boolean {
        if(this._adminTabs && !this._adminTabs[action]) {
            action = undefined;
        }

        var state: any = {};

        this.setState(state);

        action = action || this._options.resourceName;

        state.resourceId = rawState.resourceId;
        state.action = action;
        if (!!this._resourcesControl
            && state.action
            && !Utils_String.equals(state.action, CommonAdminActionIds.Security, true)
            && !Utils_String.equals(state.action, this._resourcesControl.currentResourceAction, true)) {
            // update resources and menu based on action other than well known "security" action
            this._resourcesControl.refreshResources(state.action, true).then(() => {
                this._updateResources();
                this._resourcesControl.currentResourceAction = state.action;
                return this._onParseInfoState(rawState, state, callback);
            });

            if (this._menuBar) {
                var newMenuItems = this.getMenuBarItems(state.action);
                this._menuBar.updateItems(newMenuItems);
            }
        }
        else if (!!this._resourcesControl
            && Utils_String.equals(state.action, CommonAdminActionIds.Security, true)) {
            // Action 'security' so just refresh resources for default tab 'resources'
            this._resourcesControl.refreshResources().then(() => {
                this._updateResources();
                this._resourcesControl.currentResourceAction = CommonAdminActionIds.Resources;
                return this._onParseInfoState(rawState, state, callback);
            });
        }
        else {
            return this._onParseInfoState(rawState, state, callback);
        }

    }

    public onNavigate(state: any): void {
        this._navigating = true;
        if (!!this._resourcesControl && state.resourceId !== "-1") {
            this._resourcesControl.setSelectedResourceOrGroup(state.resource, (state.action == CommonAdminActionIds.Security) ? state.group : null);
            this._options.selectedResourceId(state.resourceId);
        }

        if (!!this._resourcesControl && state.resourceId === "-1") {
            this._resourcesControl.setSelectedNode(null);
        }

        if (this._resources.length === 0) {
            $(".info-tab").show();
        }
        else {
            $(".info-tab").hide();
        }

        this._navigating = false;
    }

    private _emptyResourceNavigate() {
        this.setViewTitle("");
        var state = this.getState();
        state.resourceId = null; // empty resourceId since this doesn't exist any more
        this._onNavigate(state);
    }

    private _onParseInfoState(rawState: any, state: any, callback: IResultCallback) {
        var resourceId = state.resourceId;
        var action = state.action;
        if (resourceId === "-1") {
            state.groupId = rawState.groupId;
            $.each(this._resourcesMembershipsMap, (i: string, resourceGroup: Contracts.IdentityRef) => {
                if (state.groupId == resourceGroup.id) {
                    state.resourceGroup = resourceGroup;
                }
            });
            callback(action, state);
            return false;
        }

        if (this._resources.length === 0) {
            this.showInformationTab(this._options.noResourceTitle, this._options.noResourceDescription);
            this._element.find(this._options.hubContentSelector).find(this._options.detailsView).hide();
            state.resourceId = null;
            state.resource = null;
            this._historyService.replaceHistoryPoint(action, state);
        }
        else {
            if (this._resourcesMap[resourceId]) {
                state.resource = this._resourcesMap[resourceId];
            }
            else {
                if (this._resources.length > 0) {
                    // resource not found for given id, default to first resource
                    state.resourceId = this._resources[0].id;
                    state.resource = this._resources[0];
                    this._historyService.replaceHistoryPoint(action, state);
                }
            }

            if (!!state.resource) {
                var resource = <IResource>state.resource;
                if (!!rawState.groupId && Utils_String.localeIgnoreCaseComparer(action, CommonAdminActionIds.Security) === 0) {
                    if (!!resource.administratorsGroup && Utils_String.localeIgnoreCaseComparer(resource.administratorsGroup.id, rawState.groupId) === 0) {
                        state.groupId = rawState.groupId;
                        state.group = resource.administratorsGroup;
                    }
                    else if (!!resource.readersGroup && Utils_String.localeIgnoreCaseComparer(resource.readersGroup.id, rawState.groupId) === 0) {
                        state.groupId = rawState.groupId;
                        state.group = resource.readersGroup;
                    }
                }
            }
        }

        callback(action, state);
    }

    private _navigateToResource(resourceId: string, currentAction?: string, fromSelectionChanged: boolean = false): void {
        if (!this._navigating) {
            var state = this.getState();
            if (fromSelectionChanged && !Utils_String.equals(state.action, CommonAdminActionIds.Security, true)) {
                currentAction = state.action;
            }
            if (Utils_String.equals(this._options.selectedResourceId(), resourceId, true)
                && Utils_String.equals(state.action, currentAction)) {
                // If action and resourceId match, and we are trying to navigate to resource, this could be some update to resource case, so just navigate
                this._onNavigate(this.getState());
            }
            else {
                if (fromSelectionChanged
                    && this._resourcesControl.currentResourceAction
                    && !Utils_String.equals(state.action, CommonAdminActionIds.Security, true)
                    && state.action !== this._resourcesControl.currentResourceAction) {
                    // if we are coming from selection changed event and if the state's action is different that control's currentaction, 
                    // this implies we are in a state where resourceId's are same for both action resources and resourceControl is not updated yet. it will be updated in other path, so do nothing
                    return;
                }
                this._historyService.addHistoryPoint(currentAction || this._options.resourceName, {
                    resourceId: resourceId || null
                });
            }
        }

        this._options.selectedResourceId(resourceId);
    }

    private _navigateToSecurityGroup(resourceId: string, groupId: string): void {
        if (!this._navigating) {
            this._historyService.addHistoryPoint(CommonAdminActionIds.Security, {
                resourceId: resourceId,
                groupId: groupId
            });
        }
    }

    private _refreshResources(action?: string): IPromise<any> {
        return this._resourcesControl.refreshResources(action)
            .then(() => {
                this._updateResources();
            });
    }

    private _updateResources() {
        this._resources = this._resourcesControl.getResources();
        this._resourcesMap = this._resourcesControl.getResourceMap();
    }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.ResourceAdminTreeView", exports);
