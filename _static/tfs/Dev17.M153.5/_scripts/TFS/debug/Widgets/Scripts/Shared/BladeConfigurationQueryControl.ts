import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import WitContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemTracking_RestClient = require("TFS/WorkItemTracking/RestClient");

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import PopupContent = require("VSS/Controls/PopupContent");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Utils_TreeView = require("VSS/Controls/TreeView");
import QueryScalar = require("Widgets/Scripts/QueryScalar");
import Widgets_Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import WIT = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import * as WIT_QueryFolderTree from "WorkItemTracking/SharedScripts/QueryFolderTree";
import Locations = require("VSS/Locations");
import { QueryItem, QueryHierarchy } from "WorkItemTracking/SharedScripts/QueryHierarchy";
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

var keyCode = Utils_UI.KeyCode;

//TODO Factor a common contract for WIT Query View Contracts & Config Controls

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

//Note: The QueryConfiguration Widget code has changed substantially from what was in this file.
//As there was no consumer widgets to evaluate against, we should talk about factoring details, or re-snap it.

export interface QuerySelectorOptions extends Dashboard_Shared_Contracts.ConfigurationControlOptions<QueryScalar.IQueryInformation> {
    webContext: Contracts_Platform.WebContext;
    onError?: (error: any) => void;
    disabled?: boolean;
}

/**
* Control that encapsulates the combo box and the query tree as well as event interactions around them. 
*/
export class QuerySelectorControl extends Controls.Control<QuerySelectorOptions> implements Dashboard_Shared_Contracts.IConfigurationControl<QueryScalar.IQueryInformation>{

    // div holding the query text.
    private _$selectQueryText: JQuery;

    // div holding the query tree.
    private _$treeContainerDiv: JQuery;

    // query combo box. 
    private _querySelectorPopup: PopupContent.PopupContentControl;

    // query tree proxy object around WIT query tree.
    private _querySelectorTree: QueryFolderTree;

    // object representing the currently selected query. 
    private _selectedQuery: WitContracts.QueryHierarchyItem = <WitContracts.QueryHierarchyItem>{};

    //TODO: We should remove this state, and rely solely on _selectedQuery
    private _queryId: string;
    private _queryName: string;

    // information for the loading gif
    private _loadingImage: string;
    private _$loadingImageDiv: JQuery;

    //for testing only
    public __test() {
        return {
            $treeContainer: this._$treeContainerDiv
        }
    }

    // constants. 
    public static DomCoreCssClass: string = "query-selector";
    public static DomNodeContentClass = "node-content";
    public static DomSelectQueryWaterMarkClass: string = "select-query-dropdown-watermark";
    public static DomSelectQueryDropDownDivClass: string = "select-query-dropdown-div";
    public static DomSelectQueryProgressClass: string = "select-query-progress";
    public static UnSavedQueryLink: string = "#path=Unsaved+work+items&_a=query";

    private static _disabledQuerySelectorClass: string = "query-selector-disabled";

    constructor(options: any) {
        super(options);
    }

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: QuerySelectorControl.DomCoreCssClass
        }, options));
        this._loadingImage = Locations.urlHelper.getVersionedContentUrl("big-progress.gif");
    }

    public initialize(): void {
        super.initialize();
        this._decorate();
        this._setupInitialState();
        this._renderPopUp();
        this._setupEventDelegates();
    }

    public isValid(): boolean {
        return ((this._selectedQuery.name) && (this._selectedQuery.id)) ? true : false;
    }

    public getErrorMessage(): string {
        return (!this.isValid()) ? Widgets_Resources.QueryScalar_ConfigNoQuerySelected : null;
    }

    /** Provides domain specific selection information */
    public getCurrentValue(): QueryScalar.IQueryInformation {
        return {
            queryId: this._selectedQuery.id,
            queryName: this._selectedQuery.name
        };
    }

    public getCurrentProject(): WIT.Project {
        return this._querySelectorTree.getCurrentProject();
    }


    public showLoadingProgress(): void {
        if (this._$loadingImageDiv) {
            this._$loadingImageDiv.css("display", "block");
        }
    }

    public hideLoadingProgress(): void {
        if (this._$loadingImageDiv) {
            this._$loadingImageDiv.css("display", "none");
        }
    }

    /**
    * Set the DOM composition of the control.
    */
    private _decorate(): void {
        this._$selectQueryText = $("<input />")
            .attr("type", "text")
            .attr("role", "combobox")
            .attr("aria-haspopup", "tree")
            .attr("aria-multiline", "false")
            .attr("autocomplete", "off")
            .prop("readonly", true)
            .appendTo(this.getElement());
        if (!this._options.disabled) {
            this.getElement().append($("<span>").addClass("drop-icon bowtie-icon bowtie-chevron-down-light"));
        }
        this._$loadingImageDiv = $("<div>").addClass(QuerySelectorControl.DomSelectQueryProgressClass)
            .append($("<img>").attr("src", this._loadingImage));
        this.getElement().append(this._$loadingImageDiv);
        this._$treeContainerDiv = $(domElem("div")).addClass(QuerySelectorControl.DomSelectQueryDropDownDivClass);
        this._querySelectorPopup = <PopupContent.PopupContentControl>Controls.Enhancement.enhance(PopupContent.PopupContentControl,
            this.getElement(),
            $.extend({
                cssClass: null,
                content: () => {
                    return this._$treeContainerDiv;
                },
                menuContainer: this.getElement().parent(),
                leftOffsetPixels: -1 // The popup is positioned relative to the menu area above it excluding the border. We need to move left 1px to align
            }, {}));

        // Bind event handlers
        this._bindKeyboardAccessibility();
        this._$treeContainerDiv.keydown((e) => {
            if (e.keyCode == Utils_UI.KeyCode.ESCAPE) {
                this._querySelectorPopup.hide();
                this._$selectQueryText.focus();
                e.stopPropagation();
            }
        });
    }

    /**
    * Setup initial data state for the combo box. At this point the tree is hidden and only the selected query if any is visible. 
    */
    private _setupInitialState(): void {
        // get the selected option - query name and backing value of the query id. 
        if (this._options.initialValue) {
            this._queryId = this._options.initialValue.queryId;
            this._queryName = this._options.initialValue.queryName;
        }

        if (this._queryId) {
            // make sure that the queryId exists. It is possible that the backing query was removed in WIT store. 
            this._verifyQueryExists(this._queryId).then((queryItem: WitContracts.QueryHierarchyItem) => {

                // the first is the case for pinned widgets, we need to pull the actual query name as the tile name may be different. 
                // this way we will be converting it to standard config state. 
                // TODO: these contracts need to be coalesced. 
                this._selectedQuery.id = this._queryId;
                this._selectedQuery.name = this._queryName || queryItem.name;
                this._$selectQueryText.val(this._selectedQuery.name);

                if (this._options.onInitialized) {
                    this._options.onInitialized();
                }
            }, () => {
                // if the query was deleted, this is already apparent from the widget.
            });
        } else {
            this._$selectQueryText.val(Widgets_Resources.QueryScalar_Watermark);
            this._$selectQueryText.addClass(QuerySelectorControl.DomSelectQueryWaterMarkClass);
        }

        if (this._options.disabled) {
            this.getElement().addClass(QuerySelectorControl._disabledQuerySelectorClass);
            this._$selectQueryText.addClass(QuerySelectorControl._disabledQuerySelectorClass);
            this._$selectQueryText.attr("tabindex", -1);
        }
    }

    /**
     * Enables keyboard accessibility on this control for showing/hiding the popup
     */
    private _bindKeyboardAccessibility() {
        // Copied from CodeScalarPathSelectorMenu and modified
        this._$selectQueryText.on("keydown", (e) => {
            switch (e.keyCode) {
                case Utils_UI.KeyCode.DOWN:
                    if (e.altKey && !this._querySelectorPopup.getElement().is(":visible")) {
                        this._querySelectorPopup.show();
                    }
                    return false;
                case Utils_UI.KeyCode.UP:
                    if (e.altKey) {
                        this._querySelectorPopup.hide();
                    }
                    return false;
                case Utils_UI.KeyCode.TAB:
                    this._querySelectorPopup.hide();
                    break;
            }
        });
    }

    /**
    * check if the query exists by calling the WIT query store (REST APIs)
    * @params {string} queryId: query to search for. 
    * @returns promise of searched query. 
    */
    private _verifyQueryExists(queryId: string): IPromise<WitContracts.QueryHierarchyItem> {
        return WorkItemTracking_RestClient.getClient().getQuery(this._options.webContext.project.id, queryId);
    }

    /**
    * Setup event delegates on the control elements. 
    */
    private _setupEventDelegates(): void {
        // pair with proxy control event that tells the control that an item has been selected when the query tree is open. 
        this._bind(this._$treeContainerDiv, QueryFolderTree.EventQuerySelectorNodeClicked, delegate(this, this._onItemClick));

        this._querySelectorPopup._bind("popup-opened", () => {
            this._focusPopup();
        });

        this._querySelectorPopup._bind("popup-closed", () => {
            this._onPopupClose();
        });
    }

    /**
    * Move focus to appropriate element when opening the popup
    */
    private _focusPopup(): void {
        if (this._querySelectorTree) {
            if (this._selectedQuery.id) {
                // After the tree is opened, and if we have a queryId
                this._querySelectorTree.setSelectedQuery(this._selectedQuery.id);
            }
            else {
                // if no query is selected, the first selectable node in the tree is selected and focused on.
                this._querySelectorTree.focusFirstVisibleNode();
            }
        }
    }

    /**
    * render the query tree
    */
    private _renderPopUp() {
        this._$treeContainerDiv.append($("<div>").addClass(QueryFolderTree.QueryFolderTreeEnhancementName));

        // Why aren't we (and other users of QueryFolderTree) doing a regular explicit CreateIn? ensureEnhancement is for triggering deferred instantiation against HTML.
        this._querySelectorTree = <QueryFolderTree><any>(Controls.Enhancement.ensureEnhancement(QueryFolderTree, this._$treeContainerDiv));
        this._querySelectorTree._options.errorHandler = this._options.onError;
        this._querySelectorTree._options.tfsContext = new TFS_Host_TfsContext.TfsContext({
            ...tfsContext.contextData,
            team: {
                ...TFS_Dashboards_Common.getDashboardTeamContext()
            }
        });
        (this._querySelectorTree._options as QueryFolderTreeOptions).onFocusoutFromQueryTree = (e) => this.onFocusOutFromQueryTree(e);
        this._querySelectorTree.ensureInitialized();

        this._$selectQueryText.attr("aria-expanded", (true).toString());
        this._$selectQueryText.attr("aria-owns", this._querySelectorTree.getId());

    }

    private onFocusOutFromQueryTree(e?: JQueryEventObject): any {
        // hide the popup control
        this._querySelectorPopup.hide();

        // return focus to the query selector. This will now cause the shift tab/tab to move to the relevant previous/next focusable element. 
        this._$selectQueryText.focus();
    }

    /**
     * Called when the popup containing the query selector is hidden/closed
     */
    private _onPopupClose() {
        // Call onChange if we changed the query
        // Also call it if we're invalid to notify config that error presentation should be updated
        if (!this.isValid() || this._queryId != this._selectedQuery.id) {
            this._options.onChange();

            this._queryId = this._selectedQuery.id;
            this._queryName = this._selectedQuery.name;
        }

        this._$selectQueryText.attr("aria-expanded", (false).toString());
        this._$selectQueryText.removeAttr("aria-owns");
        this._$selectQueryText.focus();
    }

    /**
    * Controls what happens when a tree item is clicked. Ignores adhoc or special queries (including folder) selections. 
    * When selected, combo is reset with the selected query and the tree is closed. 
    */
    private _onItemClick(e, args) {
        var treeNode = args.treeNode;
        if (treeNode.config.unselectable || treeNode.link === QuerySelectorControl.UnSavedQueryLink) {
            return;
        };

        this._selectedQuery.name = treeNode.text;
        this._selectedQuery.path = treeNode.link;
        this._selectedQuery.id = args.treeNode.queryId;
        this._$selectQueryText.val(this._selectedQuery.name);
        this._$selectQueryText.removeClass(QuerySelectorControl.DomSelectQueryWaterMarkClass);

        // Fires the popup-closed event
        this._querySelectorPopup.hide();
    }
}

export interface QueryFolderTreeOptions extends WIT_QueryFolderTree.QueryFolderTreeOptions {
    onFocusoutFromQueryTree: (e?: JQueryEventObject) => any;
}

/**
* A proxy class to use the WIT Controls for query folder tree.
* TODO: the goal is to avoid using the bulky WIT tree for something leaner that provides a better structure for options and event propogation
* than observed here. 
*/
export class QueryFolderTree extends WIT_QueryFolderTree.QueryFolderTree {

    // remant of the older enhancement registration which is needed due to the underlying control used. 
    public static _typeName: string = "tfs.wit.dashboards.queryfoldertree";

    // event triggered when a tree item is selected from the WIT control. 
    public static EventQuerySelectorNodeClicked: string = "wit-widget-query-selector-node-click-event";

    // enhancement name for the proxy class. 
    public static QueryFolderTreeEnhancementName: string = "query-folder-tree";

    constructor(options?: QueryFolderTreeOptions) {
        super(options);
    }

    public initializeOptions(options: QueryFolderTreeOptions) {
        super.initializeOptions($.extend({
            contextMenu: null, // this removes/hides all menus from the wit query tree and provides a leaner DOM. 
            disableDragDrop: true
        }, options));
    }

    /**
     * try to set focus on a specific node
     * @param node node to setfocus on
     * @returns boolean indicating whether focus was applied or not. 
     */
    public tryFocusOnNode(node: Utils_TreeView.TreeNode): boolean {
        var jqueryNode = this._getNodeElement(node);
        if (jqueryNode.is(":visible")) {

            // enable focus styling and set focus on node.
            this.setSelectedNode(node);
            this.focusOnNode(node);
            // Stick the node into the internal TreeView variable to preserve focus on tree repaints
            // For example on first open, the parent hierarchy is not present and tree gets wiped out and focus lost without this
            this._setFocusElement(jqueryNode)
            return true;
        }

        return false;
    }

    /**
     * set focus on the first visible node in the tree
     */
    public focusFirstVisibleNode(): void {
        // Filter each time we open popup, as nodes show up again (we only filter visually)
        this.filterUnselectableQueries();

        var rootChildren = this.rootNode.children;
        if (rootChildren) {
            var length = rootChildren.length;
            for (let i = 0; i < length; ++i) {
                // set focus on first available root child and break out once done. 
                let focused = this.tryFocusOnNode(rootChildren[i]);
                if (focused) {
                    break;
                }
            }
        }
    }

    public setSelectedQuery(queryId: string): void {
        this._queryHierarchy.beginFindQueryById(queryId).then(
            (queryItemToSelect) => {
                var nodeToSelect = this.findNodesByQueryId(queryId);
                // if the selected query is found. 
                if (nodeToSelect.length > 0) {
                    // Filter each time we open popup, as nodes show up again (we only filter visually)
                    this.filterUnselectableQueries();

                    var selectedNode = nodeToSelect[0];
                    // Populate parent hierarchy (this is async and potentially goes to server)
                    this._expandNodeParents(selectedNode, true);
                    // if we are unable to focus on the selected query, set focus on the first element in the tree 
                    if (!this.tryFocusOnNode(selectedNode)) {
                        this.focusFirstVisibleNode();
                    }
                }
                // if the selected query cannot be found  (deleted while tree is being loaded), set focus on first element in the tree. 
                else {
                    this.focusFirstVisibleNode();
                }
            });
    }

    /**
    * overrides wit control tree click to trigger a scoped event that can be used by another control to performs as needed off the event. 
    * @override
    */
    public onItemClick(treeNode, nodeElement, e?) {
        this._fire(QueryFolderTree.EventQuerySelectorNodeClicked, { treeNode });
        e.preventDefault();
        super.onItemClick(treeNode, nodeElement, e);
    }

    /**
    * Filter the queries from the list that are not applicable to the query tile configuration
    */
    public filterUnselectableQueries() {
        // favorites is not part of the query hierarchy and is bolted onto the root note. We need to compare with the elements directly to identify and hide it. 
        if (this.rootNode.children) {
            this.rootNode.children.forEach((node: WIT_QueryFolderTree.QueryTreeNode, index: number) => {
                if (node.favoriteItem && Utils_String.localeIgnoreCaseComparer(node.favoriteItem.name, TFS_Resources_Presentation.MyFavoritesText) === 0) {
                    this._getNodeElement(node).hide();
                }
            });
        }

        // if the query hierarchy exists and the children have been loaded, hide any items that are personally scoped. 
        if (this.getQueryHierarchy() && this.getQueryHierarchy().children && this.getQueryHierarchy().childrenLoaded()) {
            this.getQueryHierarchy().children.forEach((queryItem: QueryItem, index: number) => {
                if (queryItem.personal) {
                    var queryNodes: any[] = this.findNodesByQuery(queryItem);
                    if (queryNodes) {
                        queryNodes.forEach((node: WIT_QueryFolderTree.QueryTreeNode) => {
                            this._getNodeElement(node).hide();
                        });
                    }
                }
            });
        }
    }

    public getCurrentProject(): WIT.Project {
        if (this._queryHierarchy) {
            return this._queryHierarchy.project;
        } else {
            return null;
        }
    }

    public getQueryHierarchy(): QueryHierarchy {
        return this._queryHierarchy;
    }

    /**
    * set focus on the last visible node in the tree
    */
    public focusLastVisibleNode(): void {
        if (this.rootNode.hasChildren) {
            let length = this.rootNode.children.length;
            let lastRootNode = this.rootNode.children[length - 1];
            // if the last root node is not expanded, set focus on the one. 
            if (!lastRootNode.expanded) {
                this.tryFocusOnNode(lastRootNode);
            }
            // if the root node is expanded, set focus on any tree items (tree-children) that are visible and are tagged to be focusable. 
            else {
                let lastRootNodeElement = this._getNodeElement(lastRootNode);
                var lastNode = lastRootNodeElement.children("ul.tree-children").find("li.node:visible:not(.nofocus)").last();
                this.tryFocusOnNode(this._getNode(lastNode));
            }
        }
    }

    /**
     * Handle key down events. Here we specifically handle the Enter event as the query selector overrides the native tree view Enter behaviour
     * @param e event object
     */
    public _onInputKeyDown(e?: JQueryEventObject): any {
        // the target of the key down
        var $target: JQuery = $(e.target);

        // find the closest node for the key down event, as the target may only be a wrapping div. 
        var $closestNode: JQuery = $target.closest("li.node");

        // map node to a tree node for queries. 
        var node: WIT_QueryFolderTree.QueryTreeNode;

        var keyCode = e.keyCode || e.which;
        if (keyCode === Utils_UI.KeyCode.ENTER) {
            node = <WIT_QueryFolderTree.QueryTreeNode>this.getNodeFromElement($closestNode);

            // make sure that the node can actually be selected (partial queries and folders are unselectable). 
            if (node && node.config && !node.config.unselectable) {

                // simulate click behaviour for enter. 
                this.onItemClick(node, $closestNode, e);

                // prevent propagation of the event as it has been handled. 
                return false;
            }
        }

        // when focusing out from the query tree, we allow the popup control to handle it. 
        else if ((keyCode === Utils_UI.KeyCode.UP && e.altKey) || (keyCode === Utils_UI.KeyCode.TAB)) {
            (this._options as QueryFolderTreeOptions).onFocusoutFromQueryTree(e);
            return true;
        }

        else if (keyCode === Utils_UI.KeyCode.HOME) {
            this.focusFirstVisibleNode();
            return false;
        }

        else if (keyCode === Utils_UI.KeyCode.END) {
            this.focusLastVisibleNode();
            return false;
        }

        return super._onInputKeyDown(e);
    }
}

Controls.Enhancement.registerEnhancement(QueryFolderTree, "." + QueryFolderTree.QueryFolderTreeEnhancementName);
