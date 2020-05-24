import ko = require("knockout");

import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");

import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
var domElem = Utils_UI.domElem;

/**
 * Custom array changed function to detect which item was added or removed from the observable array.
 * 
 * @param itemAddedCallback The callback that will be invoked when an item is added to the observable array.
 * @param itemRemovedCallback The callback that will be invoked when an item is removed from the observable array.
 * @param context The object that will be used as current 'this' object within the callback function.
 * @return The knockout subscriptions.
 */
ko.observableArray.fn.subscribeArrayChanged = function <T>(itemAddedCallback: (addedItem: T) => void, itemRemovedCallback: (removedItem: T) => void, context?: any): KnockoutSubscription<T>[] {
    var i: number,
        j: number,
        cachedPreviousValue: any[] = null,
        beforeChangeSubscription: KnockoutSubscription<T>,
        changeSubscription: KnockoutSubscription<T>;

    beforeChangeSubscription = this.subscribe(function (previousValue: any[]) {
        cachedPreviousValue = previousValue.slice(0);
    },
        null,
        "beforeChange");

    changeSubscription = this.subscribe(function (latestValue: T[]): void {
        var arrayChanges = ko.utils.compareArrays(cachedPreviousValue, latestValue);

        for (i = 0, j = arrayChanges.length; i < j; i++) {
            switch (arrayChanges[i].status) {
                case "retained":
                    break;
                case "deleted":
                    if (itemRemovedCallback) {
                        itemRemovedCallback.call(context, arrayChanges[i].value);
                    }

                    break;
                case "added":
                    if (itemAddedCallback) {
                        itemAddedCallback.call(context, arrayChanges[i].value);
                    }

                    break;
                default:
                    break;
            }
        }

        cachedPreviousValue = null;
    });

    return [beforeChangeSubscription, changeSubscription];
};


/**
 * A section in the definition tree
 */
export interface ITreeSection<T> {
    /**
     * Add a node to the section
     * @param node The node
     */
    add(node: T);

    /**
     * Sets the nodes in the section
     * @param nodes The nodes
     */
    setNodes(nodes: T[]);
}

/**
 * A tree node
 */
export interface ITreeNode {
    /**
     * The id that uniquely identifies this node
     */
    id?: KnockoutObservableBase<string>;

    /**
     * The text to display
     */
    text: KnockoutObservableBase<string>;

    /**
     * The CSS class for the node
     */
    cssClass: KnockoutObservableBase<string>;

    /**
     * Indicates whether the node should be displayed as a folder
     */
    isFolder: KnockoutObservableBase<boolean>;

    /**
     * Indicates whether the node is expanded
     */
    expanded: KnockoutObservableBase<boolean>;

    /**
     * Indicates whether to show an icon for the node
     */
    showIcon: KnockoutObservableBase<boolean>;

    /**
     * The CSS class for the icon
     */
    nodeIconCssClass: KnockoutObservableBase<string>;

    /**
     * The child nodes
     */
    nodes: KnockoutObservableArray<ITreeNode>;

    /**
     * The parent node
     */
    parent: KnockoutObservable<TreeNodeCollection>;

    /**
     * The root node
     */
    root: KnockoutObservableBase<TreeViewModel>;

    /**
     * Indicates whether the node is selectable
     */
    selectable: KnockoutObservable<boolean>

    /**
     * Indicates whether the node is selected
     */
    selected: KnockoutObservable<boolean>;

    /**
     * Indicates whether the cursor is hovering over the node
     */
    hovering: KnockoutObservable<boolean>;

    /**
     * ko template name to render after the node-link if this is being rendered as platform's treeview
     */
    templateName?: KnockoutObservableBase<string>;

    /**
     * getContributionContext to override TreeNode's one to provide custom contribution context for platform's TreeView popupmenu
     */
    getContributionContext?: () => any;

    /**
     * Optional label for the node
     */
    ariaLabel?: KnockoutObservableBase<string>;
}

/**
 * A tree node that contains a collection of nodes
 */
export class TreeNodeCollection {
    /**
     * The nodes
     */
    public nodes: KnockoutObservableArray<ITreeNode>;

    /**
     * The parent node
     */
    public parent: KnockoutObservable<TreeNodeCollection> = ko.observable<TreeNodeCollection>();

    /**
     * The root node in the tree
     */
    public root: KnockoutComputed<TreeViewModel>;

    /**
     * Indicates whether the node should be displayed as a folder
     */
    public isFolder: KnockoutComputed<boolean>;

    /**
     * Indicates whether the node is expanded
     */
    public expanded: KnockoutObservable<boolean> = ko.observable(false);

    constructor(nodes?: ITreeNode[], sort?: (a: ITreeNode, b: ITreeNode) => number);
    constructor(nodes?: KnockoutObservableArray<ITreeNode>, sort?: (a: ITreeNode, b: ITreeNode) => number);

    constructor(nodes?: any, sort?: (a: any, b: any) => number) {
        if (ko.isObservable(nodes)) {
            this.nodes = nodes;
        }
        else {
            this.nodes = ko.observableArray<ITreeNode>((nodes || []).sort(sort));
        }

        this.root = ko.computed({
            read: () => {
                if (!!this.parent()) {
                    return this.parent().root();
                }
                else {
                    return null;
                }
            }
        });

        // set parents for initial elements
        $.each(this.nodes(), (index: number, node: ITreeNode) => {
            this._onNodeAdded(node);
        });

        // set parents when the array is replaced
        this.nodes.subscribe((newArray: ITreeNode[]) => {
            $.each(newArray, (index: number, newNode: ITreeNode) => {
                this._onNodeAdded(newNode);
            });
        });

        // set or unset parents when items are added or removed from the array
        this.nodes.subscribeArrayChanged(
            (addedItem: ITreeNode) => {
                this._onNodeAdded(addedItem);
            },
            (removedItem: ITreeNode) => {
                this._onNodeRemoved(removedItem);
            });

        this.isFolder = ko.computed({
            read: () => {
                return this.nodes().length > 0;
            }
        });
    }

    /**
     * Called when a node is added to the collection
     * @param newNode The new node
     */
    public _onNodeAdded(newNode: ITreeNode) {
        newNode.parent(this);
    }

    /**
     * Called when a node is removed from the collection
     * @param removedNode The node that was removed
     */
    public _onNodeRemoved(removedNode: ITreeNode) {
        removedNode.parent(null);
    }

    /**
     * Called when the expand icon is clicked
     * @param target The node
     * @param args Event args
     */
    public _onExpandIconClick(target: ITreeNode, args: JQueryEventObject) {
        this.expanded(!this.expanded());
    }
}


/**
 * A basic tree node
 */
export class BaseTreeNode extends TreeNodeCollection {
    constructor(nodes?: ITreeNode[]);
    constructor(nodes?: KnockoutObservableArray<ITreeNode>);

    constructor(nodes?: any) {
        super(nodes);
    }

    /**
     * Called when the node is clicked
     * @param target The node
     * @param args Event args
     */
    public _onClick(target: ITreeNode, args: JQueryEventObject) {
        var root: TreeViewModel = this.root();
        if (!!root) {
            root._onClick(target, args, this);
        }
    }

    /**
     * Called when the mouse moves over the node
     * @param target The node
     * @param args Event args
     */
    public _onMouseover(target: ITreeNode, args: JQueryEventObject) {
        var root: TreeViewModel = this.root();
        if (!!root) {
            root.hoverNode(target);
        }
    }

    /**
     * Called when the mouse moves away from the node
     * @param target The node
     * @param args Event args
     */
    public _onMouseout(target: ITreeNode, args: JQueryEventObject) {
        var root: TreeViewModel = this.root();
        if (!!root) {
            root.hoverNode(null);
        }
    }

    /**
     * Called when the context menu is clicked
     * @param target The node
     * @param args Event args
     */
    public _onContextMenuClick(target: ITreeNode, args: JQueryEventObject) {
        var root: TreeViewModel = this.root();
        if (!!root) {
            root._onContextMenuClick(target, args);
        }
    }

    /**
     * Called when the folder icon is clicked
     * @param target The node
     * @param args Event args
     */
    public _onTreeIconClick(target: ITreeNode, args: JQueryEventObject) {
        if (this.isFolder()) {
            this.expanded(!this.expanded());
        }

        var root: TreeViewModel = this.root();
        if (!!root) {
            root._onTreeIconClick(target, args);
        }
    }

    /**
     * Called when the node icon is clicked
     * @param target The node
     * @param args Event args
     */
    public _onNodeIconClick(target: ITreeNode, args: JQueryEventObject) {
        var root: TreeViewModel = this.root();
        if (!!root) {
            root._onNodeIconClick(target, args);
        }
    }

    /**
     * Called when key down event is triggered on node
     * @param target The node
     * @param args Event args
     */
    public _onKeyDown(target: ITreeNode, args: JQueryEventObject): boolean {
        var root: TreeViewModel = this.root();
        if (!!root) {
            return root._onKeyDown(target, args, this);
        }
        return true;
    }

    /**
     * Indicates whether the node is selectable
     */
    public selectable: KnockoutObservable<boolean> = ko.observable(true);

    /**
     * Indicates whether the node is selected
     */
    public selected: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Indicates whether the cursor is hovering over the node
     */
    public hovering: KnockoutObservable<boolean> = ko.observable(false);
}


/**
 * A basic tree node whose properties are represented as simple observables
 */
export class StaticTreeNode extends BaseTreeNode implements ITreeNode {
    constructor(nodes?: ITreeNode[]);
    constructor(nodes?: KnockoutObservableArray<ITreeNode>);

    constructor(nodes?: any) {
        super(nodes);
    }

    /**
     * The text to display
     * see KoTree.ITreeNode
     */
    public text: KnockoutObservable<string> = ko.observable("");

    /**
     * The CSS class for the node
     * see KoTree.ITreeNode
     */
    public cssClass: KnockoutObservable<string> = ko.observable("");

    /**
     * Indicates whether to show an icon for the node
     * see KoTree.ITreeNode
     */
    public showIcon: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * The CSS class for the icon
     * see KoTree.ITreeNode
     */
    public nodeIconCssClass: KnockoutObservable<string> = ko.observable("");

    /**
     * The object or value represented by this node
     */
    public value: any;

    /**
     * Indicates whether the model is dirty
     * see KoTree.ITreeNode
     */
    public dirty: KnockoutObservable<boolean> = ko.observable(false);
}

/**
 * A basic tree section that has tree nodes in it
 */
export class BaseTreeSection<T extends ITreeNode> implements ITreeSection<T> {
    public root: StaticTreeNode = new StaticTreeNode();
    private _nodes: T[] = [];

    constructor(text: string, css: string) {
        this.root.text(text);
        this.root.selectable(false);
        this.root.cssClass(css);
        this.root.showIcon(false);

        // override isFolder calculation
        this.root.isFolder = ko.computed({
            read: () => {
                return true;
            }
        });
    }

    /**
     * Expands or collapses the node
     * @param newValue True to expand, false to collapse
     */
    public setExpanded(newValue: boolean) {
        this.root.expanded(newValue);
    }

    /**
     * Adds a node to the section
     * @param node The node to add
     * @param unshift If yes, it makes the node first element. Otherwise
     * node is added to the end.
     */
    public add(node: T, unshift: boolean = false) {
        if (unshift) {
            this.root.nodes.unshift(node);
        } else {
            this.root.nodes.push(node);
        }
        this._nodes = <T[]>this.root.nodes.peek();
    }

    /**
     * Sets the list of nodes in the section
     * @param nodes The new list of nodes
     */
    public setNodes(nodes: T[]) {
        this.root.nodes(nodes);
        this._nodes = nodes;
    }

    /**
     * Resets the nodes to the original list
     */
    public resetNodes() {
        this.root.nodes(this._nodes);
    }

    /**
     * Filters the nodes according to the search text, uses "text" property of node to filter
     * @param searchText The search text to filter
     */
    public filterNodes(searchText: string) {
        var toMatch = "";
        if (searchText) {
            toMatch = searchText.toLowerCase();
        }
        var matchedNodes = this._nodes.filter((node: ITreeNode) => {
            if (node && node.text) {
                var subscribableNode: any = node.text;
                try {
                    return subscribableNode().toLowerCase().indexOf(toMatch) >= 0;
                }
                catch (err) {
                    // if for some reason the node is not subscribable => subscribableNode() is not a string
                    console.log("The nodes of the section has to be subscribable and of type ITreeNode to get filtered");
                    return false;
                }
            }
            return false;
        });
        this.root.nodes(matchedNodes);
    }
}

/**
 * Represents a tree node click event
 */
export class TreeNodeEventArgs {
    /**
     * The node
     */
    public node: ITreeNode;

    /**
     * Event args
     */
    public eventObject: JQueryEventObject;

    /**
     * The object or value represented by the node
     */
    public value: any;
}


export class TreeViewModel extends TreeNodeCollection {
    public selectedNode: KnockoutComputed<ITreeNode>;
    public hoverNode: KnockoutComputed<ITreeNode>;

    public onClick: KnockoutObservable<TreeNodeEventArgs> = ko.observable<TreeNodeEventArgs>();
    public onContextMenuClick: KnockoutObservable<TreeNodeEventArgs> = ko.observable<TreeNodeEventArgs>();
    public onKeyDown: KnockoutObservable<TreeNodeEventArgs> = ko.observable<TreeNodeEventArgs>();

    private _selectedNode: KnockoutObservable<ITreeNode> = ko.observable<ITreeNode>();
    private _hoverNode: KnockoutObservable<ITreeNode> = ko.observable<ITreeNode>();

    public nodeSelectedByClick: boolean;

    constructor(nodes?: ITreeNode[], sort?: (a: ITreeNode, b: ITreeNode) => number);
    constructor(nodes?: KnockoutObservableArray<ITreeNode>, sort?: (a: ITreeNode, b: ITreeNode) => number);

    constructor(nodes?: any, sort?: (a: any, b: any) => number) {
        super(nodes, sort);

        this.nodeSelectedByClick = false;

        this.root = ko.computed({
            read: () => {
                return this;
            }
        });

        // set parents for initial elements
        $.each(this.nodes(), (index: number, node: ITreeNode) => {
            this._onNodeAdded(node);
        });

        this.selectedNode = ko.computed({
            read: () => {
                return this._selectedNode();
            },
            write: (newValue: ITreeNode, isClick?: boolean) => {
                this.nodeSelectedByClick = isClick === true;
                var oldSelection: ITreeNode = this._selectedNode();
                if (oldSelection !== newValue && !this._onNodeSelecting(newValue, isClick)) {
                    if (!!oldSelection) {
                        this._onNodeUnselected(oldSelection);
                    }

                    if (newValue) {
                        var parent = newValue.parent.peek();
                        if (parent) {
                            parent.expanded(true);
                        }
                    }

                    this._selectedNode(newValue);
                    this._onNodeSelected(newValue);
                }
            }
        });

        this.hoverNode = ko.computed({
            read: () => {
                return this._hoverNode();
            },
            write: (newValue: ITreeNode) => {
                var oldHoverNode: ITreeNode = this._hoverNode();
                if (!!oldHoverNode) {
                    this._onNodeMouseout(oldHoverNode);
                }

                this._hoverNode(newValue);

                this._onNodeMouseover(newValue);
            }
        });
    }

    public selectNode(predicate: (treeNode: ITreeNode) => boolean) {
        $.each(this.nodes(), (index: number, node: ITreeNode) => {
            return !this._selectNode(node, predicate);
        });
    }

    private _selectNode(node: ITreeNode, predicate: (treeNode: ITreeNode) => boolean): boolean {
        if (predicate(node)) {
            this.selectedNode(node);
            return true;
        }
        else {
            var result: boolean = false;

            $.each(node.nodes(), (index: number, node: ITreeNode) => {
                if (this._selectNode(node, predicate)) {
                    result = true;
                    return false;
                }
            });

            return result;
        }
    }

    public _onNodeUnselected(oldSelection: ITreeNode) {
        if (!!oldSelection) {
            oldSelection.selected(false);
        }
    }

    public _onNodeSelected(newSelection: ITreeNode) {
        if (!!newSelection) {
            newSelection.selected(true);
        }
    }

    public _onNodeMouseout(oldHoverNode: ITreeNode) {
        if (!!oldHoverNode) {
            oldHoverNode.hovering(false);
        }
    }

    public _onNodeMouseover(newHoverNode: ITreeNode) {
        if (!!newHoverNode) {
            newHoverNode.hovering(true);
        }
    }

    public _onNodeSelecting(target: ITreeNode, isClick?: boolean): boolean {
        return false;
    }

    public _onClick(target: ITreeNode, args: JQueryEventObject, value?: any) {
        if (target.selectable()) {
            var selectedNode = <any>this.selectedNode;
            selectedNode(target, true);
        }

        this.onClick({
            node: target,
            eventObject: args,
            value: value
        });
    }

    public _onContextMenuClick(target: ITreeNode, args: JQueryEventObject, value?: any) {
        this.onContextMenuClick({
            node: target,
            eventObject: args,
            value: value
        });
    }

    public _onKeyDown(target: ITreeNode, args: JQueryEventObject, value?: any): boolean {
        switch (args.keyCode) {
            case Utils_UI.KeyCode.ENTER:
                return TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(args);

            default:
                this.onKeyDown({
                    node: target,
                    eventObject: args,
                    value: value
                });
        }
        return true;
    }

    public _onTreeIconClick(target: ITreeNode, args: JQueryEventObject) {
    }

    public _onNodeIconClick(target: ITreeNode, args: JQueryEventObject) {
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Knockout.Tree", exports);
