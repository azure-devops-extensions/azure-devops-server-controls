///<amd-dependency path="jQueryUI/droppable"/>
///<amd-dependency path="VSS/Utils/Draggable"/>
/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Combos = require("VSS/Controls/Combos");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Controls_Popup = require("VSS/Controls/PopupContent");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Service = require("VSS/Service");
import Telemetry_Services = require("VSS/Telemetry/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Virtualization = require("VSS/Controls/Virtualization");
import VSS = require("VSS/VSS");

var log = Diag.log;
var verbose = Diag.LogVerbosity.Verbose;
var delegate = Utils_Core.delegate;
var getErrorMessage = VSS.getErrorMessage;
var keyCode = Utils_UI.KeyCode;
var domElem = Utils_UI.domElem;
var TFS_UI_CONTROLS_AREA = "TFSUICommonControls";

var nodeIdSeed = 0;
function treeNodeComparer(comparer) {
    comparer = comparer || Utils_String.localeIgnoreCaseComparer;
    return function (n1, n2) {
        return comparer(n1.text, n2.text);
    };
}

export class TreeDataSource extends Controls.BaseDataSource {

    public root: any;

    constructor(options?) {
        super($.extend({
            sepChar: "\\"
        }, options));

        this._initRoot();
    }

    public setSource(source) {
        this._initRoot();
        this.root.clear();

        super.setSource(source);
    }

    /**
     * @param source 
     */
    public prepareSource(source?) {
        var nodes = ensureSourceIsTreeNodes(source);

        this.root.addRange(nodes);

        if (this._options.sorted) {
            this.root.sort(true, treeNodeComparer(this._options.comparer));
        }

        if (this._options.treeLevel) {
            expandToLevel(this.root, this._options.treeLevel);
        }

        this.updateItemsFromSource();
    }

    /**
     * Update the flat content representation from the current tree
     */
    public updateItemsFromSource() {

        var allItems = [];
        flatten(this.root, allItems, true);

        var items = [];
        flatten(this.root, items, false);

        this.setItems(items, allItems);
    }

    /**
     * @param all 
     * @param textOnly 
     * @return 
     */
    public getItemText(index, all?, textOnly?): string {

        if (textOnly === true) {
            return this.getItem(index, all).text;
        }
        else {
            return this.getItem(index, all).path(false, this._options.sepChar);
        }
    }

    /**
     * @param startsWith 
     * @param all 
     */
    public getItemIndex(itemText, startsWith?, all?) {

        var index = super.getItemIndex(itemText, startsWith, true), node, reconstruct;

        if (index >= 0) {
            node = this.getItem(index, true);

            //node is found. Lets figure out if it is visible
            while (node.parent) {
                node = node.parent;
                if (!node.expanded) {
                    reconstruct = true;
                }

                node.expanded = true; //make visible
            }

            if (reconstruct) {
                //node was not visible, recreate items array
                this._prepareCurrentItems();
            }
            // we need to call now with the same all setting so we get the right index in the tree taking collapsed sub trees into account
            return super.getItemIndex(itemText, startsWith, all);
        }

        return index;
    }

    public expandNode(node) {
        if (!node.expanded) {
            node.expanded = true;
            this._prepareCurrentItems();
        }
    }

    public collapseNode(node) {
        if (node.expanded) {
            node.expanded = false;
            this._prepareCurrentItems();
        }
    }

    public _initRoot() {
        if (!this.root) {
            this.root = new TreeNode("");
            this.root.expanded = true;
            this.root.root = true;
        }
    }

    private _prepareCurrentItems() {
        var items = [];
        flatten(this.root, items, false);
        this.setItems(items, this.getItems(true));
    }
}

VSS.initClassPrototype(TreeDataSource, {
    root: null
});

/**
 * @publicapi
 */
export interface ITreeOptions {
    /**
     * List of nodes used by TreeView for rendering. TreeView only accepts nodes of concrete type TreeNode. Existing node hierarchy needs to be converted to TreeNode before providing to TreeView, see samples for details.
     */
    nodes?: TreeNode[];

    /**
     * Determines whether icons of the nodes are visible or not.
     * @defaultvalue true
     */
    showIcons?: boolean;

     /**
     * Optional custom icon render, overriding node's icon
     * @defaultvalue undefined
     */
    onRenderIcon?: (node: TreeNode) => Element;

    /**
     * Determines whether clicking a node expands/collapses the node or not (if the node has children).
     * @defaultvalue false
     */
    clickToggles?: boolean;

    /**
     * Determines whether clicking a node selects the node or not.
     * @defaultvalue true
     */
    clickSelects?: boolean;
    contextMenu?: any;
    useEmptyFolderNodes?: boolean;
    defaultEmptyFolderNodeText?: string;
    styleFocusElement?: boolean;

    /**
     * Defines "droppable" options for drag and drop (see jQuery UI droppable options)
     */
    droppable?: any;

    /**
     * Defines "draggable" options for drag and drop (see jQuery UI draggable options)
     */
    draggable?: any;

    /**
     * Specifies whether to use the modern bowtie styling (bowtie styles are in preview and subject to change).
     * @defaultvalue false
     */
    useBowtieStyle?: boolean;

    /**
     * Determine use arrow keys or TAB for navigation between tree nodes, in arrow keys mode only one node will have tabIndex at one time. 
     * @defaultvalue false
     */
    useArrowKeysForNavigation?: boolean,

    /**
     * Determine if always set title or only set title on overflow 
     * @defaultvalue false
     */
    setTitleOnlyOnOverflow?: boolean

     /**
     * Callback that will be called when a folder is toggled
     * @defaultvalue undefined
     */
    onItemToggle?: (node: TreeNode) => void;
}

/**
 * @publicapi
 */
export class TreeNode {

    /**
     * @param text 
     * @param config 
     * @param children 
     * @return 
     */
    public static create(text: string, config?: any, children?: TreeNode[]): TreeNode {

        return new TreeNode(text, config, children);
    }

    public id: any;
    public root: boolean;
    public text: string;
    public parent: TreeNode;
    public children: TreeNode[];
    public config: any;
    public expanded: boolean;
    public selected: boolean;
    public icon: any;
    public tag: any;
    public noFocus: boolean;
    public noContextMenu: boolean;
    public noTreeIcon: boolean;
    public folder: any;
    public type: any;
    public link: string;
    public title: string;
    public droppable: any;
    public iterationPath: string;
    public definition: any;
    public linkDelegate: any;
    public hasExpanded: boolean;
    public owner: any;
    public application: any;
    public emptyFolderNodeText: string;
    public isEmptyFolderChildNode: boolean;
    // Indicates if the node should be styled as a search hit
    public isSearchHit: boolean;

    /**
     * @param text 
     * @param config 
     * @param children 
     * @param id
     */
    constructor(text: string, config?: any, children?: TreeNode[], id?: string) {

        if (id) {
            this.id = id;
        }
        else {
            this._ensureNodeId();
        }
        this.text = text;
        this.config = config || {};
        this.children = [];
        this.addRange(children);
    }

    public hasChildren() {
        return this.children.length > 0;
    }

    public clear() {
        this.children = [];
    }

    public remove() {
        if (this.parent) {
            this.parent.children = $.map(this.parent.children, (node) => {
                if (node !== this) {
                    return node;
                }
            });
        }
    }

    public add(node: TreeNode) {
        this.children.push(node);
        node.parent = this;
    }

    /**
     *  Move this node to reside under the specified new parent.
     * 
     * @param newParent The destination to reparent the source under.
     */
    public moveTo(newParent: any) {
        Diag.Debug.assertParamIsObject(newParent, "newParent");

        this.remove();
        newParent.add(this);
    }

    public addRange(nodes) {
        var i, l;
        if (nodes) {
            for (i = 0, l = nodes.length; i < l; i++) {
                this.add(nodes[i]);
            }
        }
    }

    /**
     * Finds a node using the given path
     * 
     * @param path Path to find
     * @param sepChar Path separator, if not given default will be used
     * @param comparer Comparer used to compare nodes in the path, if not given default will be used
     */
    public findNode(path: string, sepChar?: string, comparer?: (a: string, b: string) => number): TreeNode {

        return Utils_UI.findTreeNode.call(this, path, sepChar || "/", comparer || Utils_String.localeIgnoreCaseComparer, "text");
    }

    public sort(recursive, treeNodeComparer) {
        this._sort(recursive, treeNodeComparer);
    }

    public path(includeRoot, sepChar) {
        return Utils_UI.calculateTreePath.call(this, includeRoot, sepChar || "/", "text", "root");
    }

    public level(noRoot) {
        var level = 0, n = this.parent;

        while (n) {
            if (noRoot && n.root) {
                break;
            }

            level++;
            n = n.parent;
        }

        return level;
    }

    public getContributionContext(): TreeNode {
        return this;
    }

    public getHtmlId() {
        return "treeNode" + this.id;
    }

    private _ensureNodeId() {
        if (this.id < 0 || this.id === undefined || this.id === null) {
            this.id = "" + nodeIdSeed++;
        }
    }

    private _sort(recursive, treeNodeComparer) {
        var i, l, children = this.children;
        if (children && children.length) {
            children.sort(treeNodeComparer);

            if (recursive) {
                for (i = 0, l = children.length; i < l; i++) {
                    children[i]._sort(recursive, treeNodeComparer);
                }
            }
        }
    }
}

VSS.initClassPrototype(TreeNode, {
    id: -1,
    root: false,
    text: null,
    parent: null,
    children: null,
    config: null,
    expanded: false,
    selected: false,
    icon: null,
    tag: null,
    noFocus: false,
    noContextMenu: false,
    noTreeIcon: false,
    folder: null,
    type: null,
    link: "",
    title: "",
    droppable: null,
    iterationPath: null,
    definition: null,
    linkDelegate: null,
    hasExpanded: false,
    owner: null,
    application: null,
    isSearchHit: null
});

/**
 * @publicapi
 */
export class TreeViewO<TOptions extends ITreeOptions> extends Controls.Control<TOptions> {
    public static _typeName: string = "tfs.treeView";

    public static NODE_DATA_NAME: string = "node-data";
    public static LEVEL_DATA_NAME: string = "node-level";
    public static EXPANDED_CLASS = "expanded";
    public static COLLAPSED_CLASS = "collapsed";
    private static NODE_VISIBLE_AND_FOCUSABLE = "li.node:visible:not(.nofocus)";

    private _focusDelegate: any;
    private _blurDelegate: any;
    private _dragStartDelegate: any;
    private _hasFocus: boolean;
    private _draggable: any;
    private _droppable: any;
    public _focusedNode: JQuery;
    private _popupMenu: any;
    private _nodeHasTabindex: TreeNode;
    private _ariaDescribedById: string;

    public rootNode: TreeNode;
    public _selectedNode: TreeNode;

    /**
     * Creates new Grid Control
     */
    constructor(options?) {

        super(options);

        this.rootNode = new TreeNode("root");
        this.rootNode.root = true;
        this._droppable = this._options.droppable;
        this._draggable = this._options.draggable;
        this._focusDelegate = delegate(this, this._onFocus);
        this._blurDelegate = delegate(this, this._onBlur);
        this._dragStartDelegate = delegate(this, this._onDragStart);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            clickSelects: true,
            clickToggles: false,
            contextMenu: false,
            coreCssClass: "tree-view",
            showIcons: true,
            sortMenuItems: true,
            styleFocusElement: true,
            useArrowKeysForNavigation: true,
            useEmptyFolderNodes: true
        }, options));
    }

    public initialize() {
        var that = this;
        super.initialize();

        this._bind("mouseover", function (e) {
            var $target = $(e.target), $closest, $node;

            $closest = $target.closest("div.node-content, div.node-context-menu-container");

            if ($closest.length > 0) {
                $node = $closest.closest("li.node");

                that._setFocusElement($node);
            }
        });

        this._bind("mouseout", function (e) {
            that._setFocusElement(null);
        });

        this._bind("click", delegate(this, this._click));
        this._bind("contextmenu", delegate(this, this._onContextMenu));
        this._bind("keydown", delegate(this, this._onInputKeyDown));

        // Checking any nodes specified in the options
        if ($.isArray(this._options.nodes)) {
            this.rootNode.addRange(this._options.nodes);
        }
        if (this._options.contextMenu && this._options.contextMenu.contributionIds) {
            Service.getService(Contributions_Services.ExtensionService).getContributionsForTargets(this._options.contextMenu.contributionIds);
        }

        var treeStyle = this._options.useBowtieStyle ? "bowtie-tree" : "basic-tree";
        this.getElement().addClass(treeStyle);

        this._draw();

        Diag.logTracePoint("TreeView.initialize.complete");
    }

    public _draw() {

        // Get focused node (if possible) before we empty the whole tree 
        // (Data will be gone after emptying and we'll not be able to find the node)
        var focusNode: TreeNode;
        var tempFocus: JQuery;
        if (this._focusedNode) {
            focusNode = this._getNode(this._focusedNode);
            // Give focus to a temp element. 
            // If we don't do this, emptying the tree will never allow recovering the focus
            tempFocus = $("<button>").appendTo("body").focus();
        }

        // Empty the whole tree.
        this.getElement().empty();

        if (this._options.contextMenu) {
            // Add help text for screen reader
            this._ariaDescribedById = String(Controls.getId());
            $(domElem("div"))
            .attr("id", this._ariaDescribedById)
            .addClass("visually-hidden")
            .text(Resources_Platform.TreeViewOptionsText)
            .appendTo(this.getElement());
        }

        // Redraw tree using the node information
        this._drawNode(this.rootNode, this.getElement(), -1);

        // Refocus the node if possible
        if (focusNode) {
            // Get new DOM element of this node
            var _focusElement = this._getNodeElement(focusNode);
            if (_focusElement.length > 0) {
                // Focus first tabbable child
                this._getFirstTabbableChild(_focusElement).focus();
            }
        }
        else {
            if (this._options.useArrowKeysForNavigation) {
                this._setNodeHasTabindex(this._getNode(this.getElement().find(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first()));
            }
        }

        // Get rid of temp focus element
        if (tempFocus) {
            tempFocus.remove();
        }
    }

    /**
     * Gets the DOM element associated with the specified node

     * @param node Node associated with the seeked DOM element
     * @returns {JQuery}
     */
    public _getNodeElement(node: TreeNode): JQuery {
        return this.getElement().find("#tfs_tnli" + node.id).eq(0);
    }

    /**
     * Gets the node associated with the element
     * 
     * @param $element The jQuery object wrapping the tree node's DOM element
     * @returns {TreeNode}
     */
    public _getNode($element: JQuery): TreeNode {
        return $element.data(TreeView.NODE_DATA_NAME);
    }

    /**
     * Gets the currently selected node.
     * 
     * @returns {TreeNode}
     * @publicapi 
     */
    public getSelectedNode(): TreeNode {
        return this._selectedNode;
    }

    /**
     * Sets the specified node as selected.
     
     * @param node Node to be selected.
     * @param suppressChangeEvent If specified true, "selectionChanged" event will not fire.
     * @publicapi
     */
    public setSelectedNode(node: TreeNode, suppressChangeEvent?: boolean): void {

        if (node && node.config && node.config.unselectable) {
            return;
        }

        if (this._selectedNode) {
            this._selectedNode.selected = false;
        }

        this._selectedNode = node;
        if (node) {
            node.selected = true;

            if (!suppressChangeEvent) {
                this._fire("selectionchanged", { selectedNode: node });
            }

            this._expandNodeParents(node, suppressChangeEvent);

            if (this._options.useArrowKeysForNavigation) {
                this._setNodeHasTabindex(node);
            }
        }

        this._updateSelections();

    }

    public focus() {
        if (this._selectedNode) {
            this._getNodeElement(this._selectedNode).children('.node-link').focus();
            if (this._options.useArrowKeysForNavigation) {
                this._setNodeHasTabindex(this._selectedNode)
            }
        }
    }

    public _expandNodeParents(node, suppressChangeEvent?: boolean) {
        var n = node, root = this.rootNode, startNode, nodeElement;

        while (n.parent) {
            n = n.parent;

            if (n !== root && !n.expanded) {
                n.expanded = true;
                startNode = n;
            }
        }

        if (startNode) {
            startNode.expanded = false;
            nodeElement = this._getNodeElement(startNode);
            this._toggle(startNode, nodeElement, suppressChangeEvent);
        }
    }

    public _updateSelections() {
        var that = this;
        this.getElement().find("li.node").each(function () {
            var li = $(this), node;
            node = that._getNode(li);
            if (node) {
                li.toggleClass("selected", node.selected);
                li.find('.node-link').each(function() {
                    var nodeLink = $(this);
                    nodeLink.attr("aria-selected", node.selected);
                });
            }
        });
    }

    public _updateNode(li: JQuery, node: TreeNode, level: number) {
        var link, div, paddingOffset;

        li.addClass("node");

        if (!node.root) {
            li.attr("id", "tfs_tnli" + node.id);
            li.attr("role", "presentation");

            // If the node is tagged as draggable and we have draggable options, apply them.
            if ((<any>node).draggable && this._draggable) {
                li.draggable(this._draggable);
            }

            // If the node is tagged as droppable and we have droppable options, apply them.
            if (node.droppable && this._droppable) {
                li.droppable(this._droppable);
            }

            // If the containing tree allows drag behavior, disallow selectstart behavior arising anywhere within list item (occurs concurrently with Drag in IE8). 
            // The underlying content is still selectable from drags initiated outside.
            if (this._draggable) {
                this._bind(li, 'selectstart', function (event) {
                    event.preventDefault();
                });
            }

            if (node.selected) {
                li.addClass("selected");
            }

            if (node.noFocus) {
                li.addClass("nofocus");
            }

            if (node.folder) {
                li.addClass("folder");
            }

            if (node.config && node.config.css) {
                li.addClass(node.config.css);
            }

            link = $("<a />").addClass("node-link").attr("role", "treeitem");

            if (this._options.contextMenu && !node.noContextMenu) {
                var $contextMenu = $(domElem("div", "node-context-menu-container node-context-menu")).attr("title", "");
                var $contextMenuIcon = $(domElem("span", "node-context-menu-icon"));
                var iconCss = this._options.useBowtieStyle ? "bowtie-icon bowtie-ellipsis" : "icon icon-drop";
                $contextMenuIcon.addClass(iconCss);
                $contextMenu.append($contextMenuIcon);
                li.append($contextMenu);
                link.attr("aria-describedby", this._ariaDescribedById);
            } else {
                if (node.noContextMenu) {
                    li.append($(domElem("div", "node-context-menu-container node-no-context-menu")));
                }
            }

            //Disable browser default drag behavior on hyperlink when JQuery drag support is enabled.
            if (this._draggable) {
                this._bind(link, "dragstart", this._dragStartDelegate);
            }

            if (node.link) {
                link.attr("href", node.link);
            }

            if (node.linkDelegate && $.isFunction(node.linkDelegate)) {
                this._bind(link, "click", node.linkDelegate);
            }

            // Aria-levels start from one, that's why we add 1
            link.attr("aria-level", level + 1);

            if (!node.noFocus) {
                if (!this._options.useArrowKeysForNavigation) {
                    link.attr("tabindex", 0);
                }
                else {
                    link.attr("tabindex", -1);
                }

                // These binding are required for keyboard navigation (tab and shift-tab) to traverse the tree nodes.
                this._bind(link, "focus", this._focusDelegate);
                this._bind(link, "blur", this._blurDelegate);
            }

            div = $("<div />")
                .addClass("node-content")
                .text(node.text || "");

            //Disable browser default drag behavior on selected text when JQuery drag support is enabled.
            if (this._draggable) {
                this._bind(div, "dragstart", this._dragStartDelegate);
            }

            // Give 4 px of padding to nodes that only contain text (no images)
            // This prevents the text for selected nodes from running right up against the selection border.
            paddingOffset = 4;

            if (this._options.showIcons) {
                paddingOffset = 0;
                let icon = this._options.onRenderIcon && this._options.onRenderIcon(node);
                if(icon) {
                    div.prepend($(icon));
                }
                else if (node.icon) {
                    $("<span />")
                        .addClass("icon tree-node-img")
                        .addClass(node.icon)
                        .prependTo(div);
                }
            }

            if (!node.noTreeIcon) {
                var iconStyle = "icon";
                if (this._options.useBowtieStyle) {
                    iconStyle = "bowtie-icon";
                    if (node.hasChildren() || (node.folder && this._options.useEmptyFolderNodes)) {
                        iconStyle += " bowtie-chevron-right";
                    }
                }
                $(domElem("span", "node-img " + iconStyle)).prependTo(div);
            }

            paddingOffset = this._options.useBowtieStyle ? paddingOffset + 4 : paddingOffset;
            div.css("padding-left", paddingOffset + (level * 12));

            link.append(div);
            li.append(link);

            if (this._options.setTitleOnlyOnOverflow !== false) {
                Controls_Popup.RichContentTooltip.addIfOverflow(node.text || "", div);
            }
            else {
                li.attr("title", node.text || "");
            }
        }

        // Set the node in the data for the list item so we can lookup
        // which node is associated with the element.
        li.data(TreeView.NODE_DATA_NAME, node);
        li.data(TreeView.LEVEL_DATA_NAME, level);

        if (node.hasChildren() || (node.folder && this._options.useEmptyFolderNodes)) {
            this._drawChildren(node, li, level);
        }

        return div;
    }

    /**
     * @param level 
     */
    public _drawChildren(node: TreeNode, nodeElement, level?: number) {

        var ul, i, len;
        if (node.root || node.expanded) {
            len = node.children.length;
            this._setNodeElementExpandState(nodeElement, true, len > 0);

            ul = $(domElem("ul", "tree-children"))
                .attr("id", "tfs_tnul" + node.id)
                .attr("role", node.root ? "tree" : "group");

            if (typeof level === "undefined") {
                level = nodeElement.data(TreeView.LEVEL_DATA_NAME);
            }

            level = level + 1;
            if (len === 0) {
                this._drawEmptyFolderNode(ul, level, node.emptyFolderNodeText || this._options.defaultEmptyFolderNodeText || Resources_Platform.NoItemsInThisFolder);
            }
            else {
                for (i = 0; i < len; i++) {
                    this._drawNode(node.children[i], ul, level);
                }
            }

            nodeElement.append(ul);
        }
        else {
            this._setNodeElementExpandState(nodeElement, false);
        }
    }

    /**
     * @return 
     */
    public _toggle(node: TreeNode, nodeElement, suppressChangeEvent?: boolean): any {
        if (node && (node.folder || node.hasChildren())) {
            if (node.expanded) {
                node.expanded = false;
                nodeElement.find("ul.tree-children:first").remove();
            }
            else {
                node.expanded = true;
                this._drawChildren(node, nodeElement);
            }

            this._setNodeElementExpandState(nodeElement, node.expanded);
            return true;
        }

        return false;
    }

    /**
     * Ensure the tree node's expansion state is set to a particular value
     * 
     * @param node The tree node
     * @param nodeElement The element associated with the node
     * @param expand The desired expand state of the node - true = expanded, false = collapsed
     * @return true = the node's expansion state was changed, false otherwise
     */
    public _setNodeExpansion(node: TreeNode, nodeElement: JQuery, expand: boolean): boolean {
        if (node.expanded !== expand) {
            return this._toggle(node, nodeElement);
        }
        return false;
    }

    /**
     * Removes the specified node from the tree.
     * 
     * @param node Node to be removed.
     * @publicapi
     */
    public removeNode(node: TreeNode): void {
        if (this._options.useArrowKeysForNavigation) {
            let $nodeElement = this._getNodeElement(node);
            let fallbackNode: TreeNode;
            if (node.parent) {
                let nodeIndex = node.parent.children.indexOf(node);
                for (let i = nodeIndex - 1; i >= 0; i--) {
                    if (!node.parent.children[i].noFocus) {
                        fallbackNode = node.parent.children[i]; // predecessor exists
                        break;
                    }
                }
                if (!fallbackNode) {
                    for (let i = nodeIndex + 1; i < node.parent.children.length; i++) {
                        if (!node.parent.children[i].noFocus) {
                            fallbackNode = node.parent.children[i]; // successer exists
                            break;
                        }
                    }
                    if (!fallbackNode) {
                        fallbackNode = node.parent; // no siblings, fallback to parent
                    }
                }
            }
            let shouldReRefocus = this._getNodeElement(node).is(this._focusedNode);
            $nodeElement.remove();
            node.remove();

            this._restoreTabindexAndFocus(fallbackNode, shouldReRefocus);
        }
        else {
            this._getNodeElement(node).remove();
            node.remove();
        }
    }


    /**
     * Update the specified node by refreshing the child nodes if anything is added or removed.
     * 
     * @param node Node to be updated.
     * @param suppressFocus suppress focusing on the node
     * @publicapi
     */
    public updateNode(node: TreeNode, suppressFocus?: boolean): void {
        var nodeElement, level;
        if (node.root) {
            nodeElement = this.getElement();
            level = -1;
        }
        else {
            nodeElement = this._getNodeElement(node);
            level = nodeElement.data(TreeView.LEVEL_DATA_NAME);
            nodeElement.removeClass(); //will remove all classes
        }
        
        let shouldReFocus = nodeElement.is(this._focusedNode);

        // As of JQuery UI 1.9, calling a method on a non-initialized widget will throw an error instead of a no-op.
        if (nodeElement.data("ui-draggable")) {
            nodeElement.draggable("destroy");
        }
        if (nodeElement.data("ui-droppable")) {
            nodeElement.droppable("destroy");
        }
        nodeElement.empty();
        this._updateNode(nodeElement, node, level);


        if (this._options.useArrowKeysForNavigation && !suppressFocus) {
            // After node update the tabindex set before could be gone
            this._restoreTabindexAndFocus(node, shouldReFocus);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public onItemClick(node: TreeNode, nodeElement, e?: JQueryEventObject): any {

        if (this._options.clickToggles) {
            if (this._toggle(node, nodeElement)) {
                return false;
            }
        }

        if (this._options.clickSelects) {
            this.setSelectedNode(node);
        }
    }

    public onShowPopupMenu(node: TreeNode, options?) {
        var items, nodeElement, escapeReceiver, menuPin;

        if (options && options.items && options.items.length) {
            nodeElement = this._getNodeElement(node);
            escapeReceiver = this._getFirstTabbableChild(nodeElement)[0];
            menuPin = nodeElement.find("div.node-context-menu");

            if (this._popupMenu) {
                if (nodeElement.hasClass("context-menu-active")) {
                    // If we suppress loading at the start, then refresh the contributed items
                    if (options.suppressInitContributions) {
                        this._popupMenu.refreshContributedItems();
                    }
                    this._popupMenu.popup(escapeReceiver, menuPin);

                    return;
                }
                else {
                    this._popupMenu.dispose();
                    this._popupMenu = null;
                }
            }

            items = options.items.slice(0); //create a clone
            if (options.sortMenuItems) {
                // If your menu items do not explicitly supply rank, you should skip this step.
                // Browsers with unstable sort implementations(Stability is not constrained by standards) will re-order items which evaluate as equal.
                items.sort(function (a, b) { return (a.rank || 9999) - (b.rank || 9999); });
            }

            var nodeData = <any>$.extend({}, node);

            // Creating the popup menu which will be displayed when the gutter is clicked (or ellipses, for bowtie menus).
            this._popupMenu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, nodeElement, {
                align: options.align || (this._options.useBowtieStyle ? "right-bottom" : "left-bottom"),
                useBowtieStyle: this._options.useBowtieStyle,
                executeAction: options.executeAction || options.clickHandler,
                items: [{
                    childItems: items
                }],
                onActivate: function () {
                    nodeElement.addClass("context-menu-active");
                },
                onDeactivate: function () {
                    nodeElement.removeClass("context-menu-active");
                },
                onPopupEscaped: function () {
                    nodeElement.removeClass("context-menu-active");
                },
                getCommandState: options.getCommandState,
                updateCommandStates: options.updateCommandStates,
                'arguments': options['arguments'],
                contributionIds: options.contributionIds,
                contextInfo: { item: nodeData, menu: this._popupMenu },
                suppressInitContributions: options.suppressInitContributions
            });

            // We need to make sure that the popup menu is the first element of this node
            // because if there are a lot of child nodes, popup menu goes off screen and
            // when it's being popped up, it tries to activate the focus element (which is off screen)
            // and causes issues with the scroll
            this._popupMenu.getElement().prependTo(nodeElement);

            // Displaying the popup
            // Grid set tries to set focus on container mouse down event with a timeout
            // This behavior causes our popup menu item to close immediately since it loses focus.
            // Lets popup our menu in another epoch
            Utils_Core.delay(this, 10, function () {
                // If we suppress loading at the start, then refresh the contributed items
                if (options.suppressInitContributions) {
                    this._popupMenu.refreshContributedItems();
                }
                this._popupMenu.popup(escapeReceiver, menuPin);
            });
        }
    }

    /**
     * Indicate whether the element that has focus should be styled differently.
     * The current focus element will be updated to match the new preference
     * 
     * @param enabled true, if focus element should be styled.
     */
    public enableFocusStyling(enabled: boolean) {

        if (this._options.styleFocusElement !== enabled) {
            this._options.styleFocusElement = enabled;

            // update styling to ensure it's consistent with the new styling status
            this._setFocusElement(this._focusedNode);
        }
    }

    public _setFocusElement(element: JQuery) {
        var styleFocusElement = this._options.styleFocusElement;

        if (this._focusedNode && this._focusedNode.length) {
            this._focusedNode.removeClass("focus");
        }

        this._focusedNode = element;

        if (styleFocusElement && this._focusedNode && this._focusedNode.length) {
            if (!this._focusedNode.hasClass("nofocus")) {
                this._focusedNode.addClass("focus");
            }
        }
    }

    /**
     * Gets the node associated with the provided DOM/JQuery element.
     * 
     * @param element Element to get the node for.
     * @return  {TreeNode}
     * @publicapi
     */
    public getNodeFromElement(element: any): TreeNode {
        Diag.Debug.assertParamIsNotNull(element, "element");

        var $element = $(element);

        return this._getNode($element);
    }
    
    private _drawNode(node, parentElement, level) {
        var li;

        if (node.root) {
            li = parentElement;
        }
        else {
            li = $("<li />").appendTo(parentElement);
        }

        this._updateNode(li, node, level);
    }

    private _drawEmptyFolderNode(parentElement, level, text) {
        var node, li;

        li = $("<li />").appendTo(parentElement);
        node = new TreeNode(text);
        node.isEmptyFolderChildNode = true;
        node.config.css = "info";
        node.config.unselectable = true;
        node.noFocus = true;
        node.noContextMenu = true;

        this._updateNode(li, node, level);
    }

    /**
     * @param e 
     * @return 
     */
    private _click(e?: JQueryEventObject): any {

        var $target = $(e.target), $closestNode = $target.closest("li.node");

        if ($closestNode.length > 0) {
            if (this._options.useArrowKeysForNavigation) {
                $closestNode.children("a.node-link").focus(); //set focus allow future keyboard event get captured
            }

            this._setFocusElement($closestNode);

            if ($target.closest("span.node-img").length > 0) {
                return this._onToggle(e);
            }
            else if ($target.closest("div.node-content").length > 0) {
                return this._itemClick(e);
            }
            else if ($target.closest("div.node-context-menu").length > 0) {
                return this._onContextMenu(e);
            }

        }
    }

    /**
     * Set UI Focus on the node (Does not change selected node state) 
     * @param node Tree node to navigate to
     */
    public focusOnNode(node: TreeNode) {
        if (node && !node.noFocus) {
            let $nodeElement = this._getNodeElement(node);
            if ($nodeElement.length > 0) {                
                $nodeElement.children("a.node-link").focus();
            }
        }
    }

    /**
     * Handle key down events (node selection & expansion)
     * 
     * @param e 
     * @return 
     */
    public _onInputKeyDown(e?: JQueryEventObject): any {
        var $target = $(e.target), $closestNode = $target.closest("li.node"), node = this._getNode($closestNode);

        let navigateToNode = ($nodeElement: JQuery, findTargetNodeElement: (element: JQuery) => JQuery) => {
            let $targetElement = findTargetNodeElement($nodeElement);
            if ($targetElement.length > 0) {
                $targetElement.children("a.node-link").focus();
                return false;
            }
            return;
        }

        switch (e.keyCode) {
            case keyCode.RIGHT:
                if (node && node.expanded === true && this._options.useArrowKeysForNavigation) {
                    return navigateToNode($closestNode, (e: JQuery) => { return e.children("ul.tree-children").find(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first(); });
                }
                else {
                    this._setNodeExpansion(this._getNode($closestNode), $closestNode, true);
                    return false;
                }
            case keyCode.LEFT:
                if (node && node.expanded === false && this._options.useArrowKeysForNavigation) {
                    return navigateToNode($closestNode, (e: JQuery) => { return e.parents(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first(); });
                }
                else {
                    this._setNodeExpansion(this._getNode($closestNode), $closestNode, false);
                    return false;
                }
            case keyCode.DOWN:
                if (this._options.useArrowKeysForNavigation) {
                    return navigateToNode($closestNode, (e: JQuery) => {
                        let node = this.getNodeFromElement(e);
                        if (node && node.expanded === true) {
                            let firstChild = e.children("ul.tree-children").find(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first();
                            if (firstChild.length === 1) {
                                return firstChild; // If node is expanded and have focusable children, move onto first child. 
                            }
                        }

                        let nextSibling = e.nextAll(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first();
                        if (nextSibling.length === 1) {
                            return nextSibling; // If have next sibling, move onto next sibling 
                        }
                        let nextParent = e.parents(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first();
                        while (nextParent.length === 1) {
                            let nextParentSibling = nextParent.nextAll(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first();
                            if (nextParentSibling.length === 1) {
                                return nextParentSibling; // If parent have next sibling, move onto parent's next sibling 
                            }
                            nextParent = nextParent.parents(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first();
                        }

                        return $([]); // This is end of the tree - do nothing 
                    });
                }
            case keyCode.UP:
                if (this._options.useArrowKeysForNavigation) {
                    return navigateToNode($closestNode, (e: JQuery) => {

                        let prevSibling = e.prevAll(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first();
                        if (prevSibling.length === 1) {
                            let node = this.getNodeFromElement(prevSibling);
                            if (node && node.expanded === true) {
                                let lastChild = prevSibling.children("ul.tree-children").find(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).last();
                                if (lastChild.length === 1) {
                                    return lastChild; // if prev sibling is expanded and have focusable children, move onto last child of that 
                                }
                            }

                            return prevSibling; // else move onto prev sibling
                        }

                        let parent = e.parents(TreeViewO.NODE_VISIBLE_AND_FOCUSABLE).first();
                        if (parent.length === 1) {
                            return parent; // If no sibling but has parent , move onto parent
                        }

                        return $([]); // This is beginning of the tree - do nothing 
                    });
                }
            case keyCode.ENTER:
                // If no href associated with node-link, click the node
                if (!$(".node-link", $closestNode).attr("href")) {
                    this.onItemClick(node, $closestNode, e);
                    return false;
                }
                break;
            case keyCode.F10:
                if (e.shiftKey) {
                    return this._onContextMenu();
                }
                else {
                    return;
                }
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onToggle(e?: JQueryEventObject): any {

        var li = $(e.target).parents("li.node:first");
        const node = this._getNode(li);
        
        if ($.isFunction(this._options.onItemToggle)) {
            this._options.onItemToggle.call(this, node);
        }
	
        this._toggle(node, li);
        return false;
    }

    /**
     * @param e 
     * @return 
     */
    private _itemClick(e?: JQueryEventObject): any {

        var li = $(e.target).closest("li.node"), node;

        node = this._getNode(li);

        return this.onItemClick(node, li, e);
    }

    /**
     * @param e 
     * @return 
     */
    private _onContextMenu(e?: JQueryEventObject): any {

        if (this._options.contextMenu) {
            if (this._focusedNode && this._focusedNode.length > 0) {
                this._showPopupMenu(this._getNode(this._focusedNode));
                return false;
            }
        }
    }

    private _showPopupMenu(node) {
        var nodeContextMenu, option;
        if (node) {
            nodeContextMenu = node.contextMenu;

            if (typeof nodeContextMenu !== "undefined") {
                if ($.isFunction(nodeContextMenu)) {
                    option = nodeContextMenu.call(this, node);
                }
                else {
                    option = nodeContextMenu;
                }
            }
            else {
                option = this._options.contextMenu;
            }

            this.onShowPopupMenu(node, option);
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onFocus(e?: JQueryEventObject): any {

        var $closestNode = $(e.target).closest("li.node");

        if ($closestNode.length > 0) {
            this._setFocusElement($closestNode);
            if (this._options.useArrowKeysForNavigation) {
                this._setNodeHasTabindex(this._getNode(this._focusedNode));
            }
        }

        this.getElement().toggleClass("focus", true);
        this._hasFocus = true;
    }

    /**
     * @param e 
     * @return 
     */
    public _onBlur(e?: JQueryEventObject): any {
        this._setFocusElement(null);
        this._clearFocusOnElement();
    }

    public _clearFocusOnElement(): void {
        this.getElement().toggleClass("focus", false);
        this._hasFocus = false;
    }

    /**
     * Suppress browser default drag behavior associated with the supplied element to prevent conflicting behavior (text selection/HTML5 default DnD) with JQuery Drag Drop.
     * 
     * @param e 
     * @return 
     */
    private _onDragStart(e?: JQueryEventObject): any {

        return false;
    }

    /**
     * Set the droppable
     * 
     * @param droppable 
     */
    public setDroppable(droppable: any) {
        this._droppable = droppable;
    }

    private _getFirstTabbableChild(nodeElement: JQuery): JQuery {
        return nodeElement.children("a.node-link, div.node-content[tabIndex]").first();
    }

    private _setNodeElementExpandState(nodeElement: JQuery, expand: boolean, hasChildren: boolean = true): void {
        nodeElement.removeClass(TreeView.EXPANDED_CLASS + " " + TreeView.COLLAPSED_CLASS);
        nodeElement.addClass(expand ? TreeView.EXPANDED_CLASS : TreeView.COLLAPSED_CLASS);
        const nodeLink = this._getFirstTabbableChild(nodeElement);
        if (nodeLink.length > 0 && hasChildren) {
            nodeLink.attr("aria-expanded", "" + expand);
        }
    }

    /*
     * This function helps restore tabindex on the node in the tree should have tabindex
     * @param fallbackNode node to set tabindex if the last remembered node having tabindex no longer exist
     */
    private _restoreTabindexAndFocus(fallbackNode: TreeNode, setFocus: boolean) {
        if (this._nodeHasTabindex) {
            let $nodeElement = this._getNodeElement(this._nodeHasTabindex);
            if ($nodeElement.is(":visible")) {
                this._setNodeHasTabindex(this._nodeHasTabindex)
                if (setFocus) {
                    $nodeElement.children("a.node-link").focus();
                }
                return;
            }
        }
        this._setNodeHasTabindex(fallbackNode);
        if (setFocus) {
            this._getNodeElement(fallbackNode).children("a.node-link").focus();
        }
    }

    private _setNodeHasTabindex(node: TreeNode) {
        if (node) {
            if (this._nodeHasTabindex) {
                let $node = this._getNodeElement(this._nodeHasTabindex);
                $node.removeClass("has-tab-index");
                $node.children("a.node-link").attr("tabindex", -1);
            }
            this._nodeHasTabindex = node;

            let $node = this._getNodeElement(this._nodeHasTabindex);
            $node.addClass("has-tab-index");
            $node.children("a.node-link").attr("tabindex", 0);
        }
    }
}

export class TreeView extends TreeViewO<ITreeOptions> { }

VSS.initClassPrototype(TreeView, {
    rootNode: null,
    _focusDelegate: null,
    _blurDelegate: null,
    _dragStartDelegate: null,
    _hasFocus: false,
    _selectedNode: null,
    _draggable: null,
    _droppable: null,
    _focusedNode: null,
    _popupMenu: null
});

Controls.Enhancement.registerJQueryWidget(TreeView, "treeView");

export class ComboTreeDropPopup extends Combos.ComboListDropPopup {
    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            cssClass: "tree",
            createItem: delegate(this, this._createItem),
            itemClick: delegate(this, this._onItemClick),
            dropPopupRole: "treeview",
            virtualizingListViewRole: "tree",
        }, options));
    }

    public expandNode() {
        var node = this._getSelectedNode();

        if (node && node.hasChildren() && !node.expanded) {
            this.getDataSource<TreeDataSource>().expandNode(node);
            this.virtualizingListView.update();
            return true;
        }

        return false;
    }

    public collapseNode() {
        var node = this._getSelectedNode();

        if (node && node.hasChildren() && node.expanded) {
            this.getDataSource<TreeDataSource>().collapseNode(node);
            this.virtualizingListView.update();
            return true;
        }

        return false;
    }

    public _createItem(index) {
        const node = this.getDataSource().getItem(index) as TreeNode;
        const $li = $(domElem("li", this._options.nodeCss));
        const level = node.level(true);

        $li.attr({
            id: node.getHtmlId(),
            role: "treeitem",
            "aria-posinset": node.parent.children.indexOf(node) + 1,
            "aria-setsize": node.parent.children.length,
            "aria-level": level + 1,
        });

        if (node.hasChildren()) {
            $li.addClass(node.expanded ? "expanded" : "collapsed");
            $li.attr("aria-expanded", String(node.expanded));
            const childContainer = $("<ul></ul>");
            $li.append(childContainer);
            childContainer.attr({
                id: `${node.getHtmlId()}_group`,
                role: "group",
                "aria-owns": node.children.map(tn => tn.getHtmlId()).join(" "),
            });
        }

        const $div = $(domElem("div", "node-content"))
            .css("padding-left", level * 10);

        $(domElem("span", "node-img icon"))
            .appendTo($div);

        if (this._options.showIcons && node.icon) {
            $(domElem("span", node.icon))
                .appendTo($div);
        }

        const text = node.text || "";
        const $innerDiv = $(domElem("span", "text")).text(text);
        if (this._options.setTitleOnlyOnOverflow !== false) {
            Controls_Popup.RichContentTooltip.addIfOverflow(text, $div);
        }
        else {
            $innerDiv.attr("title", text);
        }


        if (node.isSearchHit) {
            $innerDiv.addClass("searchHit");
        }

        $div.append($innerDiv);
        $li.append($div);
        return $li;
    }

    public _onItemClick(e?, itemIndex?, $target?, $li?): boolean {
        var node;

        if ($target.hasClass("node-img")) {
            var dataSource = this.getDataSource<TreeDataSource>();
            node = dataSource.getItem(itemIndex);
            if (node.hasChildren()) {
                if (node.expanded) {
                    dataSource.collapseNode(node);
                    this.combo._fire("treeNodeCollapsed");
                }
                else {
                    dataSource.expandNode(node);
                    this.combo._fire("treeNodeExpanded");
                }

                this.virtualizingListView.update();
                return false;
            }
        }

        return true;
    }

    public _getSelectedNode() {
        return this.getDataSource<TreeDataSource>().getItem(this.virtualizingListView.getSelectedIndex());
    }
}

export class ComboTreeBehavior extends Combos.ComboListBehavior {

    constructor(combo, options?) {
        super(combo, $.extend({
            dropControlType: ComboTreeDropPopup,
            sepChar: "\\",
            treeLevel: 2
        }, options));
    }

    public canType() {
        return !this.isDropVisible();
    }

    /**
     * @param e 
     * @return 
     */
    public leftKey(e?: JQueryEventObject): any {
        var dropPopup = this.getDropPopup<ComboTreeDropPopup>();
        if (dropPopup) {
            dropPopup.collapseNode();

            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public rightKey(e?: JQueryEventObject): any {
        var dropPopup = this.getDropPopup<ComboTreeDropPopup>();
        if (dropPopup) {
            dropPopup.expandNode();

            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyUp(e?: JQueryEventObject): any {

        if (this.isDropVisible()) {
            return false;
        }
        else {
            return super.keyUp(e);
        }
    }

    public _createDataSource(): Controls.BaseDataSource {
        return new TreeDataSource(this._options);
    }
}

export var ComboTreeBehaviorName = "tree";
Combos.Combo.registerBehavior(ComboTreeBehaviorName, ComboTreeBehavior);

export class MultiSelectTreeComboDropPopup extends Combos.ComboListDropPopup {
    /**
     * @param options 
     */

    private _checkStates: { [id: string]: boolean; };

    constructor(options?) {
        super(options);
        this._checkStates = {};
    }

    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            cssClass: "tree",
            createItem: delegate(this, this._createItem),
            itemClick: delegate(this, this._onItemClick)
        }, options));
    }

    public initialize(): void {

        if (!this._options.id) {
            this._options.id = "ctmvdp_" + Controls.getId();
        }

        this._updateCheckList();

        super.initialize();
    }

    public expandNode(): boolean {
        var node = this._getSelectedNode();

        if (node && node.hasChildren() && !node.expanded) {
            this.getDataSource<TreeDataSource>().expandNode(node);
            this.virtualizingListView.update();
            return true;
        }

        return false;
    }

    public collapseNode(): boolean {
        var node = this._getSelectedNode();

        if (node && node.hasChildren() && node.expanded) {
            this.getDataSource<TreeDataSource>().collapseNode(node);
            this.virtualizingListView.update();
            return true;
        }

        return false;
    }

    public getCheckedItems(): string[] {
        var self = this;
        var dataSource = this.getDataSource<TreeDataSource>();
        var itemText;
        return $.map(dataSource.getItems(true), function (itemText, i) {
            itemText = dataSource.getItemText(i, true);
            if (self._checkStates[itemText]) {
                return itemText;
            }
        });
    }

    public getValue(): string {
        return this.getCheckedItems().join(this._options.multiJoinChar);
    }

    public _createItem(itemIndex) {
        const dataSource = this.getDataSource<TreeDataSource>();
        const node = dataSource.getItem(itemIndex);
        let $li: JQuery;
        let $div: JQuery;
        const id = this._options.id + "_cb" + itemIndex;
        const isChecked = this._checkStates[dataSource.getItemText(itemIndex)];
        const level = node.level(true);
        const labelId = this._options.id + "_label" + itemIndex;

        $li = $(domElem("li", this._options.nodeCss))
            .attr({
                id: this._options.id + "_li" + itemIndex,
                "aria-checked": isChecked ? "true" : "false",
                "aria-level": level + 1,
                "aria-posinset": node.parent.children.indexOf(node) + 1,
                "aria-setsize": node.parent.children.length,
                "aria-labelledby": labelId,
            });

        if (node.hasChildren()) {
            $li.addClass(node.expanded ? "expanded" : "collapsed");
        }

        $div = $(domElem("div", "node-content"))
            .css("padding-left", level * 10);

        $(domElem("span", "node-img icon"))
            .appendTo($div);

        if (this._options.showIcons && node.icon) {
            $(domElem("span", node.icon))
                .appendTo($div);
        }

        const $innerDiv = $(domElem("input", "cb")).data("value", node.text || "").attr("title", node.text || "").attr("type", "checkbox").attr("id", id).data("index", itemIndex);
        const $innerDivLabel = $(domElem("label", "text")).attr({"for": id, "id": labelId, "title": node.text || ""}).text(node.text || "");

        if (isChecked) {
            $innerDiv.prop("checked", true);
        }

        if (node.isSearchHit) {
            $innerDiv.addClass("searchHit");
        }

        $div.append($innerDiv);
        $div.append($innerDivLabel);
        $li.append($div);
        return $li;
    }

    public _onItemClick(e?, itemIndex?, $target?, $li?): boolean {

        var dataSource = this.getDataSource<TreeDataSource>();
        var node = dataSource.getItem(itemIndex);

        if ($target.hasClass("node-img")) {

            this._fireDropPopupChange(dataSource, itemIndex, $li);

            if (node.hasChildren()) {
                if (node.expanded) {
                    dataSource.collapseNode(node);
                }
                else {
                    dataSource.expandNode(node);
                }

                this.virtualizingListView.update();
                return false;
            }
        }

        if ($target.hasClass("text") || $target.hasClass("cb")) {
            this._fireDropPopupChange(dataSource, itemIndex, $li);
        }
    }

    public _getSelectedNode() {
        return this.getDataSource<TreeDataSource>().getItem(this.virtualizingListView.getSelectedIndex());
    }

    public toggleCheckbox(selectedIndex): void {
        var id = this._options.id + "_cb" + selectedIndex, $cb, itemText;

        itemText = this.getDataSource<TreeDataSource>().getItemText(selectedIndex);
        $cb = $("#" + id);

        if ($cb.prop("checked")) {
            $cb.prop("checked", false);
            this._checkStates[itemText] = false;
        }
        else {
            $cb.prop("checked", true);
            this._checkStates[itemText] = true;
        }
    }

    public update(): void {
        this._updateCheckList();
        super.update();
    }

    private _updateCheckList() {
        var parts = this.combo.getText().split(this._options.multiJoinChar);
        var self = this;

        this._clearCheckList();

        $.each(parts, function (index: number, part: string) {
            part = $.trim(part);
            if (part) {
                self._checkStates[part] = true;
            }
        });
    }

    private _clearCheckList() {
        this._checkStates = {};
    }

    private _fireDropPopupChange(dataSource: TreeDataSource, itemIndex?, $li?): void {
        var oldValue, newValue,
            itemText = dataSource.getItemText(itemIndex);

        oldValue = Boolean(this._checkStates[itemText]);
        newValue = Boolean($li.find("input").prop("checked"));
        this._checkStates[itemText] = newValue;

        if (oldValue !== newValue) {
            this._fireChange();
        }
    }
}

export class MultiSelectTreeComboBehavior extends Combos.ComboListBehavior {

    constructor(combo, options?) {
        super(combo, $.extend({
            dropControlType: MultiSelectTreeComboDropPopup,
            sepChar: "\\",
            joinChar: "\\",
            multiJoinChar: "; ",
            treeLevel: 2
        }, options));
    }

    public canType() {
        return !this.isDropVisible();
    }

    public getDropOptions(): any {

        return $.extend(super.getDropOptions(), {
            sepChar: this._options.sepChar,
            joinChar: this._options.joinChar,
            multiJoinChar: this._options.multiJoinChar,
            selectedIndex: -1,
            selectionChange: () => {
                this.combo.updateAriaActiveDescendant();
            },
            change: delegate(this, this._onChange)
        });
    }

    /**
     * @param e 
     * @return 
     */
    public leftKey(e?: JQueryEventObject): any {
        var dropPopup = this.getDropPopup<MultiSelectTreeComboDropPopup>();
        if (dropPopup) {
            dropPopup.collapseNode();

            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public rightKey(e?: JQueryEventObject): any {
        var dropPopup = this.getDropPopup<MultiSelectTreeComboDropPopup>();
        if (dropPopup) {
            dropPopup.expandNode();

            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyUp(e?: JQueryEventObject): any {

        if (this.isDropVisible()) {
            return false;
        }
        else {
            return super.keyUp(e);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public upKey(e?: JQueryEventObject): any {

        if (this.isDropVisible()) {
            super.upKey(e);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public downKey(e?: JQueryEventObject): any {

        if (!this.isDropVisible()) {
            this.showDropPopup();
        } else {
            super.downKey(e);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyDown(e?: JQueryEventObject): any {
        var dropPopup = this.getDropPopup<MultiSelectTreeComboDropPopup>();
        if (dropPopup) {
            if (e.keyCode === keyCode.SPACE) {
                var selectedIndex = dropPopup.getSelectedIndex();
                if (selectedIndex >= 0) {
                    dropPopup.toggleCheckbox(selectedIndex);
                    this.setText(dropPopup.getValue(), true);
                }
            }
        }
    }

    public _createDataSource(): Controls.BaseDataSource {
        return new TreeDataSource(this._options);
    }

    private _onChange(): boolean {
        var dropPopup = this.getDropPopup<MultiSelectTreeComboDropPopup>();
        this.setText(dropPopup.getValue(), true);
        return false;
    }

    public setSource(source: any[] | Function): void {
        // The source for MultiSelectTreeCombo is never cyclic
        // Hence JSON.stringify can be used to stringify. This check needs to be done so that
        // on checking a check box on tree node, the source _items and _allItems dont get reset to null.
        if ((JSON.stringify(source) === JSON.stringify(this.getDataSource().getSource()))) {
            this._maxItemLength = null;
            return;
        }

        super.setSource(source);
    }
}

export var ComboTreeMultivalueBehaviorName = "treeMultiValue";
Combos.Combo.registerBehavior(ComboTreeMultivalueBehaviorName, MultiSelectTreeComboBehavior);

export class SearchComboTreeBehavior extends Combos.ComboListBehavior {

    private hitText: string[];
    private selectedHitIndex: number;
    private originalNodes: TreeNode[];
    private lastSearchText: string;
    private searchDebounceTimeout: any;
    private debounceWaitTime: number;
    private textHasChanged: boolean;

    constructor(combo, options?) {
        super(combo, $.extend({
            dropControlType: ComboTreeDropPopup,
            sepChar: "\\",
            treeLevel: 2
        }, options));

        this.hitText = [];
        this.selectedHitIndex = -1;
        this.originalNodes = null;
        this.lastSearchText = "";
        this.debounceWaitTime = 300;
        this.textHasChanged = false;
    }

    public initialize() {
        super.initialize();
        this.combo._bind(this.combo.getInput(), "mouseup", delegate(this, this.mouseUp));
    }

    public canType(): boolean {
        // We are enabling search as-you-type, so people need to be able to type always
        return true;
    }

    public getAriaAutocomplete() {
        return "list";
    }

    /**
     * Get additional text to use to label the control for screen reader users.
     */
    public getAriaDescription() {
        return Resources_Platform.ComboSearchTreeScreenReaderHelp;
    }

    /**
     * @param e 
     * @return 
     */
    public leftKey(e?: JQueryEventObject): any {
        var dropPopup = this.getDropPopup<ComboTreeDropPopup>();
        if (dropPopup) {
            dropPopup.collapseNode();

            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public rightKey(e?: JQueryEventObject): any {
        var dropPopup = this.getDropPopup<ComboTreeDropPopup>();
        if (dropPopup) {
            dropPopup.expandNode();
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyDown(e?: JQueryEventObject): any {
        var key = e.keyCode || e.charCode;
        if (this.isDropVisible() && (key === keyCode.ENTER || key === keyCode.TAB) && !this.searchDebounceTimeout) {
            var searchText: string = this.combo.getText();
            if (searchText === this.lastSearchText) {
                // If the user is not currently entering text, the dropdown is open and the current text === what was last searched for,
                // enter or tab should select the currently selected hit
                this.acceptSelectedIndex();
                return true;
            }
        }

        if (key === keyCode.TAB && this.searchDebounceTimeout) {
            // If the user tabs away from the control, make sure to cancel the search so the dropdown doesn't pop up when the control no longer has focus
            this.clearSearchDebounce();
            return true;
        }

        return super.keyDown(e);
    }

    /**
     * @param e 
     * @return 
     */
    public keyUp(e?: JQueryEventObject): any {

        var key = e.keyCode || e.charCode;
        var returnVar: boolean = super.keyUp(e);
        // Paths will always return no result since this is currently searching on node text, so don't retrigger the search 
        if (this._options.mode !== "text" && !this.isComboTextPath()) {

            if (key === keyCode.ENTER) {
                // If its an enter and the text isn't a path, don't debounce the search (no need for another 300ms wait, they likely meant to search)
                this.debounceSearch(0);
                return true;
            }

            // Don't trigger search on navigation actions
            if (key === keyCode.UP || key === keyCode.DOWN || key === keyCode.PAGE_UP || key === keyCode.PAGE_DOWN || key === keyCode.ESCAPE
                || (this.isDropVisible() && (key === keyCode.LEFT || key === keyCode.RIGHT))) {
                this.clearSearchDebounce();
                return true;
            }

            // Don't try to search on every key stroke, wait for user to stop typing
            this.debounceSearch(this.debounceWaitTime);
        }

        return returnVar;
    }

    public _createDataSource(): Controls.BaseDataSource {
        return new TreeDataSource(this._options);
    }

    private mouseUp(): void {
        if ($.isFunction(this._options.onMouseUp)) {
            this._options.onMouseUp.call(this);
            return;
        }
        if (!this.textHasChanged) {
            this.lastSearchText = this.combo.getText();
            this.textHasChanged = true;
            return;
        }
        this.debounceSearch(this.debounceWaitTime);
    }

    private clearSearchDebounce(): void {
        clearTimeout(this.searchDebounceTimeout);
        this.searchDebounceTimeout = null;
    }

    private debounceSearch(waitInMilliseconds: number): void {
        var that = this;
        var debouncedSearchTrigger = function () {
            that.searchDebounceTimeout = null;
            that.searchNodes();
        };
        clearTimeout(this.searchDebounceTimeout);
        this.searchDebounceTimeout = setTimeout(debouncedSearchTrigger, waitInMilliseconds);
    }

    private isComboTextPath(): boolean {
        var itemText: string = this.combo.getText();
        return itemText.indexOf("\\") >= 0;
    }

    private searchNodes() {
        // Get the text to search on
        var searchText: string = this.combo.getText();

        this._ensureOriginalNodesStored();

        // If nothing changed, don't re-execute the search
        if (this.lastSearchText === searchText) {
            return;
        }

        var searchStartTime: any = Date.now();

        // Clear out the variables storing past search hit status
        this.hitText = [];
        this.selectedHitIndex = -1;

        var searchHitsFound: boolean = false;

        // Don't search if its empty or its a path, just return the full set as though no hits were found
        if (searchText !== "" && !this.isComboTextPath()) {
            var nodesToSearch: TreeNode[] = this.getNodesToSearch(searchText);
            searchHitsFound = this.createCopyOfSubtreeWhichMatchesSearch(searchText, nodesToSearch);
        }

        // At this point, search results are contained within the hierarchy structure inside the datasource root node
        this.modifyDatasourceAndDropdownWithResults(searchHitsFound);

        // log the search text and time taken for this search
        var searchEndTime: any = Date.now();
        var cidata: { [key: string]: any } = {
            "SearchText": searchText,
            "SearchTimeTaken": searchEndTime - searchStartTime
        };

        var eventName = "TreeSearch";
        Telemetry_Services.publishEvent(new Telemetry_Services.TelemetryEventData(TFS_UI_CONTROLS_AREA, eventName, cidata));

        // Store this search's query to compare to the next
        this.lastSearchText = searchText;
    }

    private _ensureOriginalNodesStored() {
        if (!this.originalNodes) {
            var ds: TreeDataSource = <TreeDataSource>this._dataSource;
            // if this is the first time searching, make a full copy of the items from the datasource
            this.originalNodes = ds.getItems(true);
        }
    }

    private getNodesToSearch(searchText: string): TreeNode[] {
        var ds: TreeDataSource = <TreeDataSource>this._dataSource;
        var nodesToSearch: TreeNode[];

        if (this.lastSearchText !== "" && Utils_String.startsWith(searchText, this.lastSearchText)) {
            // If this is a refinement on the earlier search, search the earlier results only (as close to "only past matches" as we can ask for)
            nodesToSearch = ds.getItems(false);
        } else {
            nodesToSearch = this.originalNodes;
        }

        return nodesToSearch;
    }

    private createCopyOfSubtreeWhichMatchesSearch(searchText: string, nodesToSearch: TreeNode[]): boolean {
        var ds: TreeDataSource = <TreeDataSource>this._dataSource;
        var searchResultsNodeSet: TreeNode[] = [];
        var searchHitsFound: boolean = false;

        // Create a copy of the root node, which we can use as the basis of our new culled tree                       
        ds.root = this.copyNodeToArray(searchResultsNodeSet, ds.root);
        ds.root.root = true;

        var l: number = nodesToSearch.length;
        var item: TreeNode;
        var searchItemsCount: number = 0;

        // Traverse the tree, copying over items which match the search and their ancestors/descendants            
        for (var i: number = 0; i < l; i++) {
            item = nodesToSearch[i];

            var itemText: string = item.text;
            if (this.stringContains(itemText, searchText)) {
                searchHitsFound = true;
                this.performSearchHitProcessing(searchResultsNodeSet, item);
                searchItemsCount++;
            }
        }

        // log the search string and count of items searched and returned by search
        var cidata: { [key: string]: any } = {
            "SearchText": searchText,
            "SearchResultCount": searchItemsCount.toString(),
            "CountOfItemsSearched": l.toString()
        };

        var eventName = "TreeSearch";
        Telemetry_Services.publishEvent(new Telemetry_Services.TelemetryEventData(TFS_UI_CONTROLS_AREA, eventName, cidata));

        return searchHitsFound;
    }

    private stringContains(text: string, contains: string): boolean {
        // Ideally, this would be caseInsensativeLocaleInsensativeStringContains, but have been unable to get 
        // the local insensative string comparisonO to work in a performant manner. Bug filed against.
        return Utils_String.caseInsensitiveContains(text, contains);
    }

    private modifyDatasourceAndDropdownWithResults(searchHitsFound: boolean) {

        var ds: TreeDataSource = <TreeDataSource>this._dataSource;

        // If there were no hits , close the dropdown and replace the root with the original (which will put the full content into the datasource below)
        if (!searchHitsFound) {
            this.hideDropPopup();
            this.selectedHitIndex = -1;

            ds.root = this.originalNodes[0].parent;
        }

        // Set the items in datasource
        var visibleFlattenedNodes: TreeNode[] = [];
        var allFlattenedNodes: TreeNode[] = [];
        flatten(ds.root, visibleFlattenedNodes, false);
        flatten(ds.root, allFlattenedNodes, true);
        ds.setItems(visibleFlattenedNodes, allFlattenedNodes);

        // If there were hits & drop down doesn't exist, make it so we can see those tasty culled results
        if (searchHitsFound) {
            this.showDropPopup();

            var dropPopup: ComboTreeDropPopup = this.getDropPopup<ComboTreeDropPopup>();
            dropPopup.virtualizingListView.update();

            this.selectedHitIndex = 0;
            this.setHit(this.selectedHitIndex);
        }
    }

    private expandAncestors(node: TreeNode) {
        node = node.parent;
        while (node && !node.expanded) {
            // once you hit an expanded node, all ancestors should already be expanded
            node.expanded = true;
            node = node.parent;
        }
    }

    private performSearchHitProcessing(alreadyCopiedNodes: TreeNode[], node: TreeNode): void {
        this.copyNodeAndAncestorsToArray(alreadyCopiedNodes, node);
        this.copyDecendantsToArray(alreadyCopiedNodes, node);

        this.hitText[this.hitText.length] = node.path(false, "\\");

        // use the newly created item to fix expansion for item that matched search and mark it as a hit
        node = alreadyCopiedNodes[node.id];
        node.expanded = false;
        this.expandAncestors(node);
        node.isSearchHit = true;
    }

    private copyNodeToArray(array: TreeNode[], node: TreeNode): TreeNode {
        var newNode = new TreeNode(node.text, node.config);
        newNode.id = node.id;
        array[newNode.id] = newNode;
        return newNode;
    }

    private copyNodeAndAncestorsToArray(array: TreeNode[], node: TreeNode) {
        // do nothing if this node is already in the array, we should already have the ancestors as well
        if (!array[node.id]) {
            var newNode = this.copyNodeToArray(array, node);
            if (node.parent) {
                this.copyNodeAndAncestorsToArray(array, node.parent);
                // add it as a child of the copy of the old parent
                array[node.parent.id].add(newNode);
            }
        }
        array[node.id].expanded = true;
    }

    private copyDecendantsToArray(array: TreeNode[], node: TreeNode) {
        if (node.hasChildren) {
            for (var key in node.children) {
                var childNode: TreeNode = node.children[key];
                // do nothing for this child if this node is already in the array
                if (!array[childNode.id]) {
                    var newNode = this.copyNodeToArray(array, childNode);
                    newNode.expanded = false;
                    // add it as a child of the copy of the old parent
                    array[childNode.parent.id].add(newNode);
                    this.copyDecendantsToArray(array, childNode);
                }
            }
        }
    }

    private setHit(index: number): boolean {
        if (index < 0 || index >= this.hitText.length) {
            return false;
        }

        var newHitText = this.hitText[index];
        var dropPopup = this.getDropPopup();
        if (dropPopup) {
            dropPopup.setSelectedValue(newHitText);
        }

        return true;
    }

    private acceptSelectedIndex(): void {
        // Sets the text of the control with the content of the current index if its valid
        if (this.selectedHitIndex >= 0 && this.selectedHitIndex < this.hitText.length) {
            this.setText(this.hitText[this.selectedHitIndex], true);
        }
    }
}

export var SearchComboTreeBehaviorName = "treeSearch";
Combos.Combo.registerBehavior(SearchComboTreeBehaviorName, SearchComboTreeBehavior);

export function flatten(node, items, all) {
    var i, l, n, children = node.children;

    if (children && (l = children.length)) {
        for (i = 0; i < l; i++) {
            n = children[i];
            items[items.length] = n;

            if (all || n.expanded) {
                flatten(n, items, all);
            }
        }
    }
}
function convertToTreeNodes(items) {
    return $.map(items, function (item) {
        if (item.id) {
            node = new TreeNode(item.text, item.config, [], item.id);
        }
        else {
            var node = new TreeNode(item.text, item.config);
        }

        if (item.children && item.children.length) {
            node.addRange(convertToTreeNodes(item.children));
        }

        return node;
    });
}
function ensureSourceIsTreeNodes(source) {
    if (source) {
        if (source.length) {
            if (!(source[0] instanceof TreeNode)) {
                return convertToTreeNodes(source);
            }
        }

        return source;
    }
    else {
        return [];
    }
}

function expandToLevel(node, level) {
    node.expanded = true;
    if (level && node.hasChildren()) {
        $.each(node.children, function (i, n) {
            expandToLevel(n, level - 1);
        });
    }
}

VSS.tfsModuleLoaded("VSS.UI.Controls.TreeView", exports);