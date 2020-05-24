


import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Events_Handlers = require("VSS/Events/Handlers");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export class FieldDataProvider {

    public static TREE_PATH_SEPERATER_CHAR: string = "\\";
    public static EVENT_NEW_ITEM: string = "new-item-event";
    public static EVENT_REMOVED_ITEM: string = "removed-item-event";
    public static EVENT_UPDATE_ITEM: string = "updated-item-event";

    private _events: Events_Handlers.NamedEventCollection<FieldDataProvider, any>;
    private _nodes: any;
    private _idToNodeMap: any;
    private _pathToNodeMap: any;
    private _isTree: boolean;
    private _options: any;

    /**
     * Populates the provider with the given items (nodes).
     * 
     * @param nodes A collection of nodes in the following format:
     * 
     *    Every node of the tree has the following format:
     *    {
     *         id:       unique id, string, required
     *         parentId: parent id, string, required (may be null)
     *         text:     text for the node
     *         values:   node values, array, required
     *         children: array of nodes, node, optional
     *    }
     * 
     *    Here is a sample declaration of grid items:
     * 
     *    gridItems: [{
     *        id: 0,
     *        values: ["Root 1", "red", 100],
     *        children: [{
     *            id: 1,
     *            values: ["Node 1-2", "green", 10],
     *            children: [{
     *                id: 2,
     *                values: ["Leaf 1-2-1", "yellow", 70]
     *            },
     *            {
     *                id: 3,
     *                values: ["Leaf 1-2-2", "blue", 30]
     *            }]
     *        },
     *        {
     *            id: 4,
     *            values: ["Root 2", "white", 50]
     *        }]
     * 
     *        "checked" is an array of tree item ids that must be initially checked in the grid.
     *        If this parameter is not provided nothing is checked.
     * 
     * 
     * @param options 
     * OPTIONAL: Object with the following structure:
     *   {
     *     allowEmpty: boolean: Indicates if empty values should be treated as valid or not.
     *     sort: comparison function for nodes if sorting is required
     *   }
     * 
     */
    constructor(nodes: any, options?: any) {

        Diag.Debug.assertParamIsNotNull(nodes, "nodes");

        this._nodes = nodes;
        this._options = $.extend({
            allowEmpty: false,
            sort: null
        }, options);
        this._isTree = nodes.length > 0 && typeof (nodes[0]) === "object";
        this._events = new Events_Handlers.NamedEventCollection();
        if (this._isTree) {
            this._sortChildren({ children: this._nodes }, true);
        }
        this._populateNodeMappings();
    }

    /**
     * Move the node to a new parent.
     * 
     * @param node Node to be re-parented.
     * @param newParent The new parent for the node.
     */
    public reparentNode(node: any, newParent: any) {

        Diag.Debug.assertParamIsObject(node, "node");
        Diag.Debug.assertParamIsObject(newParent, "newParent");

        // Remove the node from the current parent.
        this.removeNode(node.id);

        // Add the node to the new parent.
        this.addNode(node, newParent);
    }

    /**
     * Return true if the value is valid
     * 
     * @param value The value to check
     * @return 
     */
    public isValidValue(value: string): boolean {
        Diag.Debug.assertParamIsString(value, "value");

        // If the value is empty and empty values are allowed, return true.
        if (value === "" && this._options.allowEmpty) {
            return true;
        }

        if (this._nodes.length === 0) {
            return value !== "";
        }

        // Cleanup any trailing \'s.
        value = this._cleanupPath(value);

        return this._pathToNodeMap.hasOwnProperty(value);
    }

    /**
     * return true if the data represented is tree
     * 
     * @return 
     */
    public isTree(): boolean {

        return this._isTree;
    }

    /**
     * get Nodes to use in the combo box
     * 
     * @return 
     */
    public getNodes(): any {

        return this._nodes;
    }

    /**
     * Get a node by its text
     * 
     * @param nodeText text of the node to lookup
     * @return 
     */
    public getNode(nodeText: string): any {
        Diag.Debug.assertParamIsString(nodeText, "nodeText");

        // Trim off any trailing \'s.
        nodeText = this._cleanupPath(nodeText);

        return this._pathToNodeMap[nodeText] || null;
    }

    /**
     * Get the node associated with the id provided.
     * 
     * @param nodeId id of the node
     * @return 
     */
    public getNodeFromId(nodeId: string): any {

        Diag.Debug.assertParamIsString(nodeId, "nodeId");

        return this._idToNodeMap[nodeId] || null;
    }

    /**
     * Update node in the tree.
     * 
     * @param node Node to update.
     * @return The updated node data
     */
    public updateNode(node: any): any {
        Diag.Debug.assertParamIsObject(node, "node");

        // check that the incoming node
        //  a) exists
        //  b) the parent id hasn't changed
        var currentNode = this.getNodeFromId(node.id);

        // check node exists
        if (typeof currentNode === 'undefined') {
            Diag.Debug.fail("Expected to find the node in the tree when updating a node. ID: " + node.id);
            return null;
        }

        // check node's parent matches incoming node's parent
        if (currentNode.parentId !== node.parentId) {
            Diag.Debug.fail("Expected the parentId of the node to be the same. If you're re-parenting, remove the node, then re-add it. ID: " + node.id);
            return null;
        }

        if (currentNode.text !== node.text) {

            // When the text changes, we need to reconstruct the internal indexes

            // Remove the node from all internal indexes.
            this._clearCache(currentNode);

            // text has changed, which affects the path and the internal maps.
            currentNode.text = node.text;

            // Re-index the node.
            this._addNode(currentNode.parent, currentNode);
        }

        // Update the values for the node and ensure the node remains sorted
        currentNode.values = node.values.slice(0);

        // If there is a parent, sort the children.
        if (currentNode.parent) {
            this._sortChildren(currentNode.parent);
        }

        this._raiseUpdateItem({
            node: currentNode
        });

        return currentNode;
    }

    /**
     * Gets the first root node of the payload.
     */
    public getRootNode() {

        var nodes = this.getNodes(),
            rootNode = null;

        if (nodes && nodes.length > 0) {
            rootNode = nodes[0];
        }

        return rootNode;
    }

    /**
     * Get the previous sibling node of the node identified by "id"
     * 
     * @param id The id (Guid string) for the node
     */
    public getPreviousSiblingNode(id: string) {
        Diag.Debug.assertParamIsString(id, "id");

        var i, l,
            prev = null,
            node = this.getNodeFromId(id),
            nodes;

        if (node) {
            nodes = node.parent ? node.parent.children : this._nodes;

            for (i = 0, l = nodes.length; i < l; i += 1) {
                if (nodes[i] === node) {
                    break;
                }
                prev = nodes[i];
            }
        }

        return prev;
    }

    /**
     * Deletes the specified node from the source list and all cached indexes.
     * Returns the removed node
     * 
     * @param id The ID of the node in which to remove.
     * @return 
     */
    public removeNode(id): any {

        Diag.Debug.assertParamIsString(id, "id");

        var node = this.getNodeFromId(id),
            treeSize;

        if (node) {
            treeSize = this._getChildrenCount(node) + 1;

            if (node.parent && node.parent.children) {
                node.parent.children = Utils_Array.subtract(node.parent.children, [node]);
            }

            this._clearCache(node);

            this._raiseRemovedItem({
                node: node,
                parent: node.parent,
                treeSize: treeSize
            });
        }

        return node;
    }

    /**
     * Add the provided node to the tree.
     * 
     * @param node New node to add.
     * @param parent The node to parent under
     */
    public addNode(node: any, parent: any) {

        Diag.Debug.assertParamIsObject(node, "node");
        Diag.Debug.assertParamIsObject(parent, "parent");

        var children = parent.children;

        // Check that the node is not already part of the tree
        if (this.getNodeFromId(node.id)) {
            Diag.Debug.fail("Shouldn't be adding a node to the tree that already exists. Id: " + node.id);
            return null;
        }

        // Check that the parent node in the tree
        if (!this.getNodeFromId(parent.id)) {
            Diag.Debug.fail(Utils_String.format("Couldn't find parent node in the tree when adding a child node. Parent Id: {0}; Child Id: {1}.", parent.id, node.id));
            return null;
        }

        // add into sorted position within the children && sort the node's children
        children.push(node);
        node.parentId = parent.id;
        this._sortChildren(parent, false);  // false = don't recurse, just ensure the new node is in the correct position
        this._sortChildren(node, true);     // true = ensure the node's children are sorted (recursively)

        // Add the new node to the mappings.
        this._addNode(parent, node);

        this._raiseNewItem({
            node: node,
            parent: parent
        });

        return node;
    }

    /**
     * Returns a clone, or deep-copy, of the source collection.
     */
    public cloneSource() {
        return [HierarchicalGridDataAdapter.cloneNode(this.getRootNode())];
    }

    /**
     *  Attach a handler for the EVENT_NEW_ITEM event. 
     * 
     * @param handler The handler to attach
     */
    public attachNewItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(FieldDataProvider.EVENT_NEW_ITEM, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_NEW_ITEM event
     * 
     * @param handler The handler to remove
     */
    public detachNewItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(FieldDataProvider.EVENT_NEW_ITEM, <any>handler);
    }

    /**
     * Attach a handler for the removed item event. 
     * 
     * @param handler 
     * The handler to attach.  This will be invoked with an argument in the following format:
     *   {
     *     workItemIndex: index,
     *     treeSize: treeSize
     *   }
     * 
     */
    public attachRemovedItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(FieldDataProvider.EVENT_REMOVED_ITEM, <any>handler);
    }

    /**
     * Remove a handler for the removed item event.
     * 
     * @param handler The handler to remove
     */
    public detachRemovedItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(FieldDataProvider.EVENT_REMOVED_ITEM, <any>handler);
    }

    /**
     *  Attach a handler for the EVENT_UPDATE_ITEM event. 
     * 
     * @param handler The handler to attach
     */
    public attachUpdateItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(FieldDataProvider.EVENT_UPDATE_ITEM, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_UPDATE_ITEM event
     * 
     * @param handler The handler to remove
     */
    public detachUpdateItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(FieldDataProvider.EVENT_UPDATE_ITEM, <any>handler);
    }

    /**
     * Populate the mapping of path to associated node and id to node.
     */
    private _populateNodeMappings() {
        var i, l,
            nodes = this._nodes;

        // Initialize the mapping to an empty object.
        this._pathToNodeMap = {};
        this._idToNodeMap = {};

        // Add each of the tree nodes to the mapping.
        if (this._isTree) {
            for (i = 0, l = nodes.length; i < l; i += 1) {
                this._addNode(null, nodes[i]);
            }
        }
        else {
            for (i = 0, l = nodes.length; i < l; i += 1) {
                this._pathToNodeMap[nodes[i]] = nodes[i];
            }
        }
    }

    /**
     * Sort the children of a node (possibly recursively)
     * 
     * @param node The node whose children will be sorted
     * @param recursive (optional)If true, then the sort will proceed recursively through descendents
     * @param sort (optional) Comparison function for sorting the nodes.
     *     If not supplied, the sort function from the options will be used.
     */
    private _sortChildren(node: any, recursive?: boolean, sort?: Function) {
        Diag.Debug.assertParamIsObject(node, "node");

        var nodes = node.children || [],
            nodeCount = nodes.length;

        sort = sort || this._options.sort;

        if ($.isFunction(sort)) {
            nodes.sort(sort);

            if (recursive) {
                while (nodeCount > 0) {
                    nodeCount -= 1;
                    this._sortChildren(nodes[nodeCount], true, sort);
                }
            }
        }
    }

    /**
     * Adds the specified node to all cached indexes.
     * 
     * @param node The node in which to add.
     * @param parent The parent of the node in which to add.
     */
    private _addNode(parent, node) {

        var i, l,
            path = (parent === null ? "" : parent.path + FieldDataProvider.TREE_PATH_SEPERATER_CHAR) + node.text;

        // Save the path to this node.
        node.path = path;

        // Record the parent for upwards traversal
        if (parent) {
            Diag.Debug.assert(parent.id === node.parentId, Utils_String.format("Expected the parent's id ({0}) to match the node's parentId ({1})", parent.id, node.parentId));
        }
        node.parent = parent;

        // Add an entry in path to node and id to node mappings for this node.
        this._pathToNodeMap[path] = node;
        this._idToNodeMap[node.id] = node;

        // If the node has children, add them.
        if (node.children) {
            for (i = 0, l = node.children.length; i < l; i += 1) {
                this._addNode(node, node.children[i]);
            }
        }
    }

    private _clearCache(node) {
        var i, l;

        if (node) {

            delete this._pathToNodeMap[node.path];
            delete this._idToNodeMap[node.id];

            if (node.children) {
                for (i = 0, l = node.children.length; i < l; i += 1) {
                    this._clearCache(node.children[i]);
                }
            }
        }
    }

    /**
     * Cleans up the path removing any trailing \'s
     * 
     * @param path Path to be cleaned up.
     */
    private _cleanupPath(path: string) {
        Diag.Debug.assertParamIsString(path, "path");

        var result = path;

        // If this is a tree, trim off any trailing \'s.
        if (result.length > 0 && this.isTree() && result.charAt(result.length - 1) === FieldDataProvider.TREE_PATH_SEPERATER_CHAR) {
            result = result.substr(0, result.length - 1);
        }

        return result;
    }

    /**
     * Gets a count of all the specified nodes' children, recursively.
     * 
     * @param node The node whose children to count.
     */
    private _getChildrenCount(node: any) {

        Diag.Debug.assertParamIsObject(node, "node");

        var i, l,
            childrenCount = 0;

        if ($.isArray(node.children)) {
            childrenCount = node.children.length;

            for (i = 0, l = childrenCount; i < l; i += 1) {
                childrenCount += this._getChildrenCount(node.children[i]);
            }
        }

        return childrenCount;
    }

    /**
     * Notifies listeners of NewItem
     * 
     * @param args args
     */
    private _raiseNewItem(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(FieldDataProvider.EVENT_NEW_ITEM, this, args);
    }

    /**
     * Notifies listeners of that a work item was removed.
     * 
     * @param args args
     */
    private _raiseRemovedItem(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(FieldDataProvider.EVENT_REMOVED_ITEM, this, args);
    }

    /**
     * Notifies listeners of updateItem
     * 
     * @param args args
     */
    private _raiseUpdateItem(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(FieldDataProvider.EVENT_UPDATE_ITEM, this, args);
    }
}

VSS.initClassPrototype(FieldDataProvider, {
    _events: null,
    _nodes: null,
    _idToNodeMap: null,
    _pathToNodeMap: null,
    _isTree: false,
    _options: null
});

export class HierarchicalGridDataAdapter {

    public static _ITEM_ID_DATA_SOURCE_INDEX: number = -1;

    /**
     * Binds a field data provider to a grid control.
     */
    public static bindAdapter(adapterType, fieldDataProvider, grid, options?) {

        Diag.Debug.assertParamIsObject(fieldDataProvider, "fieldDataProvider");
        Diag.Debug.assertParamIsObject(grid, "grid");

        var i, l,
            columns,
            /*jslint newcap: false*/ /* conscious use of lower case constructor */
            gridAdapter = new adapterType(fieldDataProvider, grid, options);
        /*jslint newcap: true*/

        columns = grid._options.columns;

        for (i = 0, l = columns.length; i < l; i++) {
            delete columns[i].index;
        }

        gridAdapter.refresh();

        return gridAdapter;
    }

    /**
     * Clones the specified node and all its children, returning the cloned node.
     * 
     * @param node The node to clone.
     */
    public static cloneNode(node) {

        var newNode: any = $.extend({}, node),
            i, l;

        newNode.children = [];
        delete newNode.parent;

        for (i = 0, l = node.children.length; i < l; i += 1) {
            newNode.children[i] = HierarchicalGridDataAdapter.cloneNode(node.children[i]);
        }

        return newNode;
    }

    private _options: any;
    private _expandStatesManager: any;

    public _flattenedItems: any;
    public _grid: Grids.Grid;
    public _expandStates: any[];
    public dataProvider: any;
    public fieldDataHelper: any;

    /**
     * Creates an adapter to provide data from a field data provider to a grid control.
     * 
     * @param fieldDataProvider The field data provider that represents a tree graph of data.
     * @param grid The grid control in which to bind to the data provider.
     * @param options Options that may be used to customize the behavior of this provider.
     */
    constructor(fieldDataProvider: any, grid: any, options?: any) {

        Diag.Debug.assertParamIsObject(fieldDataProvider, "fieldDataProvider");
        Diag.Debug.assertParamIsObject(grid, "grid");

        this._grid = grid;
        this._options = $.extend({}, options);
        this.dataProvider = fieldDataProvider;

        this.dataProvider.attachNewItem(delegate(this, function (source, args) {
            this._addNewItem(args.node, args.parent);
        }));

        this.dataProvider.attachRemovedItem(delegate(this, function (source, args) {
            this._removeItem(args.node, args.parent, args.treeSize);
        }));

        this.dataProvider.attachUpdateItem(delegate(this, function (source, args) {
            this._updateItem(args.node);
        }));
    }

    /**
     * Gets the grid that this adapter is associated with
     * 
     * @return 
     */
    public getGrid(): Grids.Grid {
        return this._grid;
    }

    /**
     * Refreshes the contents of the grid with the current contents of the field data provider.
     * 
     * @param calculateOnly Indicates whether the refresh should update the bound grids' data
     * source and expand states or should just rebuild all internal indexes.  When true, this function will
     * only rebuild the internal indexes and caches without updating the bound grid.  This is sometimes useful when
     * you need to recalculate indexes during a reparent but don't want to update the grid until the reparent has
     * completed.
     */
    public refresh(calculateOnly?: boolean) {

        var nodes = this.dataProvider.getNodes(),
            backupExpandStates = [],
            expandStates = this._grid.getExpandStates(),
            newExpandStates = [];

        if (expandStates) {
            backupExpandStates = expandStates.slice(0);
        }

        this._flattenedItems = [];

        // Reset the list of root nodes
        this._createDataSource(nodes, this._flattenedItems, newExpandStates, 1);

        if (!calculateOnly) {
            // We don't want to update the expanded states unless we intend on updating the
            // grid.
            this._expandStates = newExpandStates;

            // if we are refreshing on the same view, then keep the expanded states as is
            // if we are refreshing to a different view then the expanded states lengths won't match

            if (this._expandStates && (this._expandStates.length === backupExpandStates.length)) {
                this._expandStates = backupExpandStates;
            }

            // Bind the datasource to the grid
            this._grid.setDataSource(this._flattenedItems, this._expandStates, this._grid._options.columns);
        }
    }

    /**
     * Gets the node associated with the data index.
     * 
     * @param dataIndex Data index of the node to lookup.
     */
    public getNodeForDataIndex(dataIndex: number) {

        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var item = this._flattenedItems[dataIndex];

        if (item) {
            return this.dataProvider.getNodeFromId(item[HierarchicalGridDataAdapter._ITEM_ID_DATA_SOURCE_INDEX]);
        }
        else {
            return null;
        }
    }

    /**
     * Gets the parent of the node associated with the data index.
     * 
     * @param dataIndex Data index of the node to lookup.
     * @return A grid row index for the parent node of the node in the specified dataIndex of the grid.
     */
    public getParentNodeIndexForDataIndex(dataIndex: number) {

        // If we don't have a child data Index to start off with, don't
        // try to find the parent index because there won't be one.
        // Note, if we have a)a zero value, b)a null value, or c) an undefined value for dataIndex
        // don't proceed since we will not have a parent to fetch here.
        if (!dataIndex) {
            return -1;
        }

        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var node = this.getNodeForDataIndex(dataIndex),
            parentIndex = -1;

        if (node) {
            parentIndex = this.getDataIndexFromNode(node.parent);
        }

        return parentIndex;
    }

    /**
     * Gets the data index for the specified node ID.
     * 
     * @param node The node whose data index is to be retrieved.
     */
    public getDataIndexFromNode(node: any) {

        Diag.Debug.assertParamIsObject(node, "node");
        return node.dataIndex;
    }

   /**
    * Get the max expand level available in the hierarchy.
    *
    * @returns {number} the max expand level.
    */
    public getMaxExpandLevel(): number {
        return this._grid._indentLevels.reduce((maxLevel, indentLevel) => Math.max(maxLevel, indentLevel), 1) - 1;
    }

    /**
     * Returns a clone, or deep-copy, of the source collection.
     */
    public cloneSource() {

        return [HierarchicalGridDataAdapter.cloneNode(this.fieldDataHelper.getNodes()[0])];
    }

    /**
     * Overridable wrapper for populateDataSource
     */
    public _createDataSource(items, source, expandStates, level) {
        this._populateDataSource(items, source, expandStates, level);
    }

    /**
     * Constructs an array of values from the source row which is used
     * by the Checklist grid control to managed the items checked/unchecked.
     * 
     * @param sourceRow A row from the source data set.
     */
    public _constructRow(sourceRow) {

        // Prepare row values
        var itemSource = [].concat(sourceRow.values);

        // Add the ID (which is not stored as a value)
        itemSource[HierarchicalGridDataAdapter._ITEM_ID_DATA_SOURCE_INDEX] = sourceRow.id;

        return itemSource;
    }

    /**
     * Creates source data for the given items.
     * 
     * @param items The structure defining the tree for the grid.
     * See CheckboxSelectionGrid function for details about gridItems format.
     * @param source Array of grid rows where every row is an array of values.
     * @param expandStates Array of numbers of the same size as 'source' argument
     *     containing number of children in the tree under every row recursively.
     * @param checkedItems The table allows for fast lookup of checked item IDs.
     * @param level Current level of the tree (1 is for the roots).
     * @return Returns number of given items including their children recursively.
     */
    private _populateDataSource(items: any, source: any[], expandStates: any[], level: number) {

        var itemIndex,
            totalItems = items.length,
            i, l;

        // Perform depth first walk of the tree while creating a row for every item in the tree and
        // calculating the number of children under every item recursively.
        for (i = 0, l = items.length; i < l; i += 1) {

            // Create a new row for the item
            itemIndex = source.length;

            // Store the data index on the item for reverse lookup purposes.
            items[i].dataIndex = itemIndex;

            source[itemIndex] = this._constructRow(items[i]);

            // Reserve the space for the number of items under this item
            expandStates[itemIndex] = 0;

            if (typeof items[i].children !== "undefined") {
                expandStates[itemIndex] = this._populateDataSource(items[i].children, source, expandStates, level + 1);
                totalItems += expandStates[itemIndex];
            }
        }

        return totalItems;
    }

    /**
     * Responds to a new item added to the data provider.
     * 
     * @param node The node added to the data provider.
     * @param parent The parent the specified node was added to.
     */
    private _addNewItem(node: any, parent: any) {

        // Calculate the insertion position of the new node taking sort order
        // into consideration.
        this.refresh(true);

        var index = this.getDataIndexFromNode(node),
            parentIndex = this.getDataIndexFromNode(parent);

        // We need to add zero at the expanded state for the new item.
        if (index === 0) { // added to the root, so append to the end
            this._expandStates.splice(this._expandStates.length, 0, 0);
        }
        else {
            this._expandStates.splice(index, 0, 0);
        }

        // Update the expand states for the parents.
        this._updateExpandStates(parentIndex, 1);
    }

    /**
     * Remove a work item from the grid.
     * 
     * @param node The node removed from the data provider.
     * @param parent The parent of the node removed.
     * @param treeSize The total number of children of the node removed (including the node itself).
     */
    private _removeItem(node: any, parent: any, treeSize: number) {

        Diag.Debug.assertParamIsObject(node, "node");
        Diag.Debug.assertParamIsObject(parent, "parent");
        Diag.Debug.assertParamIsNumber(treeSize, "treeSize");

        var nodeIndex = this.getDataIndexFromNode(node),
            parentIndex = this.getDataIndexFromNode(parent);

        // Remove the expand states for the removed item and its children.
        this._expandStates.splice(nodeIndex, treeSize);

        // Update parents expand states
        this._updateExpandStates(parentIndex, -treeSize);

        // Update any indexes maintained using the data index
        this.refresh(true);
    }

    /**
     * Update a work item in the grid.
     * 
     * @param node The edited node from the data provider.
     */
    private _updateItem(node: any) {

        Diag.Debug.assertParamIsObject(node, "node");

        var oldNodeIndex = this.getDataIndexFromNode(node),
            newNodeIndex;

        // Recalculate the new position of the node in the tree
        this.refresh(true);

        // Move the expand states for the node and its children from the old location to the
        // new one.

        newNodeIndex = this.getDataIndexFromNode(node);

        this._moveExpandStatesForNode(oldNodeIndex, newNodeIndex);
    }

    /**
     * Updates the expand states to account for changes in the grid data.
     * 
     * @param itemIndex Index of the item to start updating at.
     * @param increment Number of items added or removed.  The expand states will be incremented by this value.
     */
    private _updateExpandStates(itemIndex: number, increment: number) {

        Diag.Debug.assertParamIsNumber(itemIndex, "itemIndex");
        Diag.Debug.assertParamIsNumber(increment, "increment");

        var nodeIndex = itemIndex,
            expandStates = this._expandStates;

        if (nodeIndex >= 0) {
            // Walk the expanded state tree and update the item and its parents.
            do {
                if (expandStates[nodeIndex] < 0) { // if collapsed then decrement to add new element to the tree
                    expandStates[nodeIndex] -= increment;
                }
                else {
                    expandStates[nodeIndex] += increment;
                }

                nodeIndex = this.getParentNodeIndexForDataIndex(nodeIndex);
            } while (nodeIndex >= 0); // check if it has a parent
        }
    }

    /**
     * Moves the expand states for a node and all its children from oldNodeIndex to newNodeIndex.
     * 
     * @param oldNodeIndex The source location of the node states to move.
     * @param newNodeIndex The destination location of the node states ot move.
     */
    private _moveExpandStatesForNode(oldNodeIndex: number, newNodeIndex: number) {

        var treeSize = Math.abs(this._expandStates[oldNodeIndex]) + 1,
            removedItems,
            i, l;

        // Pull the node out of its source location
        removedItems = this._expandStates.splice(oldNodeIndex, treeSize);

        // Push the node onto the array in the destination location
        for (l = removedItems.length, i = l - 1; i >= 0; i -= 1) {
            this._expandStates.splice(newNodeIndex, 0, removedItems[i]);
        }
    }
}

VSS.initClassPrototype(HierarchicalGridDataAdapter, {
    _flattenedItems: null,
    _grid: null,
    _expandStates: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _options: {},
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _expandStatesManager: null,
    dataProvider: null,
    fieldDataHelper: null
});

export class ChecklistDataAdapter extends HierarchicalGridDataAdapter {

    public static _CHECKBOX_COLUMN_INDEX: number = 0;
    public static _LABEL_COLUMN_INDEX: number = 1;
    public static _CHECK_CHANGED: string = "checked-items-changed";

    public static CHECK_COLUMN_NAME: string = "checks-column";

    private _checkedItems: any;
    private _itemStates: any;
    private _events: Events_Handlers.NamedEventCollection<ChecklistDataAdapter, any>;
    private _disabledTooltip: any;
    private _checkboxRangeRootId: any;
    private _checkboxRangeBegin: any;
    private _checkboxRangeEnd: any;
    private _allEnabled: boolean;
    private _blockedCheckIds: any;
    private _disableChildren: any;
    private _noCheckboxes: any;
    private _onBeforeCheckChanged: (dataIndex: number, checked: boolean) => boolean;

    /**
     * Description
     * 
     * @param fieldDataProvider field Data Provider
     * @param grid grid
     * @param option options that could include
     * allEnabled: if all checkboxes are enabled or disabled
     * rootNodeId: the root element to display checkboxes under
     * noColumn: whether to add the column for checkboxes to the grid
     * disabledTooltip: the tooltip text to show on disabled checkboxes
     * 
     */
    constructor(fieldDataProvider: any, grid: any, options?) {

        super(fieldDataProvider, grid);

        Diag.Debug.assertParamIsObject(fieldDataProvider, "fieldDataProvider");
        Diag.Debug.assertParamIsObject(grid, "grid");
        Diag.Debug.assertParamIsObject(options, "options");

        this._events = new Events_Handlers.NamedEventCollection();
        this._checkboxRangeRootId = options.rootNodeId || null;
        this._noCheckboxes = options.noCheckboxes;
        
        // Default all checkboxes enabled to true
        this._allEnabled = options.allEnabled === undefined ? true : options.allEnabled;

        var that = this,
            columns = grid._options.columns,
            checkboxColumn = {
                canSortBy: false,
                text: "",
                width: 30,
                fixed: true,
                name: ChecklistDataAdapter.CHECK_COLUMN_NAME,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    return that._createCheckboxCell(dataIndex, column);
                }
            };

        if (!options.noColumn) {
            columns.splice(ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX, 0, checkboxColumn);

            grid.getElement().keyup(function (e) {
                var dataIndex,
                    newState,
                    $checkBox;

                if (e.keyCode === Utils_UI.KeyCode.SPACE) {
                    dataIndex = that._grid.getSelectedDataIndex();
                    $checkBox = that._findCheckbox(dataIndex);
                    if ($checkBox.length === 1 && !$checkBox.attr("disabled")) {
                        newState = !$checkBox.prop("checked");
                        $checkBox.prop("checked", newState);
                        that._setCheckedState($checkBox, dataIndex, newState);
                    }
                }
            });
        }
        this._disabledTooltip = options.disabledTooltip || "";
        if (options.disableChildren && $.isFunction(options.disableChildren)) {
            this._disableChildren = options.disableChildren;
        }
        else {
            this._disableChildren = function () {
                return true;
            };
        }

        this._onBeforeCheckChanged = options.onBeforeCheckChanged;

        this.initialize(options.checkedItemIds || []);
    }

    /**
     * Initializes the data provider and prepares it for use
     * by the checklist selection grid. 
     * 
     * @param checkedItemIds A collection of item IDs representing the checked
     * items.
     */
    public initialize(checkedItemIds) {

        var checkedItems, i, l;

        checkedItems = {};

        // Populate lookup table with checked item IDs
        for (i = 0, l = checkedItemIds.length; i < l; i += 1) {
            checkedItems[checkedItemIds[i]] = checkedItemIds[i];
        }

        this._checkedItems = checkedItems;
        this._blockedCheckIds = {};
    }

    /**
     * Determine if a row has a checkbox
     * 
     * @param dataIndex index of the row to check
     * @return 
     */
    public hasCheckBox(dataIndex: number): boolean {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        return dataIndex >= this._checkboxRangeBegin && dataIndex <= this._checkboxRangeEnd;
    }

    /**
     * Updates the checkbox range
     * 
     * @param expandStates The expand states
     */
    public updateCheckboxesRange(expandStates: any[]) {
        Diag.Debug.assertParamIsArray(expandStates, "expandStates", false);

        var node,
            treeSize,
            rootIndex;

        if (this._checkboxRangeRootId) {
            node = this.dataProvider.getNodeFromId(this._checkboxRangeRootId);

            if (node) {
                rootIndex = this.getDataIndexFromNode(node);
                treeSize = Math.abs(expandStates[rootIndex]);
                if (treeSize > 0) {
                    this._checkboxRangeBegin = node.dataIndex + 1;
                    this._checkboxRangeEnd = node.dataIndex + treeSize;
                }
                else {
                    this._checkboxRangeBegin = -1;
                    this._checkboxRangeEnd = -1;
                }
            }
        }
        else if (this._noCheckboxes) {
            this._checkboxRangeBegin = -1;
            this._checkboxRangeEnd = -1;
        }
        else {
            this._checkboxRangeBegin = 0;
            this._checkboxRangeEnd = this._flattenedItems.length - 1;
        }
    }

    /** 
     * Returns the checkbox range start
     */
    public getCheckboxRangeBegin(): number {
        return this._checkboxRangeBegin;
    }

    /** 
     * Returns the checkbox range end
     */
    public getCheckboxRangeEnd(): number {
        return this._checkboxRangeEnd;
    }

    /**
     * Determines whether the node is a leaf node
     * 
     * @param node A tree node
     * @return 
     */
    public isLeafNode(node: any): boolean {
        Diag.Debug.assertParamIsObject(node, "node");

        return this._expandStates[node.dataIndex] === 0;
    }

    /**
     * Disables and blocks the checking operation for the provided data index
     * 
     * @param id The id the row in the grid
     */
    public blockCheck(id: string) {
        Diag.Debug.assertParamIsString(id, "id");

        this._blockedCheckIds[id] = true;
        this._grid.updateRow(undefined, this._getDataIndexFromId(id));
    }

    /**
     * Ensures enablement of the checking operation for the provided data index
     * 
     * @param id The id of the row in the grid
     */
    public unblockCheck(id: string) {
        Diag.Debug.assertParamIsString(id, "id");

        if (this._blockedCheckIds.hasOwnProperty(id)) {
            delete this._blockedCheckIds[id];
            this._grid.updateRow(undefined, this._getDataIndexFromId(id));
        }
    }

    /**
     * Sets the root of the check box range
     * 
     * @param id Id of the node to be the root of check boxes
     */
    public setCheckboxRangeRoot(id: string) {
        Diag.Debug.assertParamIsString(id, "id");

        this._checkboxRangeRootId = id;
        this.refresh();
    }

    /**
     * Gets the currently selected check boxes root id
     * 
     * @return The id of the checkbox range root
     */
    public getCheckboxRangeRoot(): number {
        return this._checkboxRangeRootId;
    }

    /**
     * Attach a handler for the removed item event. 
     * 
     * @param handler function
     */
    public attachCheckedItemsChanged(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ChecklistDataAdapter._CHECK_CHANGED, <any>handler);
    }

    /**
     * Remove a handler for the removed item event.
     * 
     * @param handler The handler to remove
     */
    public detachCheckedItemsChanged(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ChecklistDataAdapter._CHECK_CHANGED, <any>handler);
    }

    /**
     * OVERRIDE: create the datasource for the grid
     */
    public _createDataSource(items, source, expandStates, level) {

        var i, l,
            itemStates = [],
            dataSource,
            expandState,
            columnIndex = ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX,
            idIndex = HierarchicalGridDataAdapter._ITEM_ID_DATA_SOURCE_INDEX,
            currentIndex;

        super._createDataSource(items, source, expandStates, level);

        dataSource = this._flattenedItems;
        this.updateCheckboxesRange(expandStates);

        for (i = 0, l = expandStates.length; i < l; i++) {
            if (this.hasCheckBox(i)) {
                expandState = Math.abs(expandStates[i]);

                itemStates[i] = true;

                if (this._disableChildren(dataSource[i][idIndex]) && dataSource[i][columnIndex]) {
                    currentIndex = i;

                    while (i < currentIndex + expandState) {
                        itemStates[++i] = false;
                        dataSource[i][columnIndex] = false;
                        delete this._checkedItems[dataSource[i][idIndex]];
                    }
                }
            }
            else {
                delete this._checkedItems[dataSource[i][idIndex]];
                dataSource[i][columnIndex] = false;
            }
        }

        this._itemStates = itemStates;
    }

    /**
     * Sets the enabled state of the row
     * 
     * @param id The item ID used to look up the item in the state cache.
     * @param enabled The new state of the row.
     */
    public setItemState(id: string, enabled: boolean) {
        Diag.Debug.assertIsNotNull(id, "id");
        Diag.Debug.assertParamIsBool(enabled, "enabled");

        if (enabled) {
            this._checkedItems[id] = id;
        }
        else {
            delete this._checkedItems[id];
        }
    }

    /**
     * Return Whether the item at the dataIndex is checked
     * 
     * @param dataIndex index of item to check if checked
     * @return 
     */
    public getItemChecked(dataIndex: number): boolean {

        return this._grid.getColumnValue(dataIndex, ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX);
    }

    /**
     * Set the title of the checkbox identified by a given item id
     * 
     * @param id The item ID used to look up the item in the state cache.
     * @param title The title to set.
     */
    public setItemTitle(id: string, title: string) {
        Diag.Debug.assertParamIsString(id, "id");
        Diag.Debug.assertParamIsString(title, "title");

        var dataIndex = this._getDataIndexFromId(id),
            $checkbox = this._findCheckbox(dataIndex);

        $checkbox.attr("title", title);
    }

    /**
     * Reset the title of the checkbox identified by a given item id
     * 
     * @param id The item ID used to look up the item in the state cache.
     */
    public resetItemTitle(id: string) {
        Diag.Debug.assertParamIsString(id, "id");

        var dataIndex = this._getDataIndexFromId(id),
            $checkbox = this._findCheckbox(dataIndex);

        this._setCheckboxDefaultTitle($checkbox);
    }

    /**
     * Allows accessing the list of grid items that are currently checked.
     * 
     * @return Returns array of checked item ids.
     */
    public getCheckedItemIds() {
        var i, l,
            result = [],
            columnIndex = ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX,
            idIndex = HierarchicalGridDataAdapter._ITEM_ID_DATA_SOURCE_INDEX,
            checkedItems,
            dataSource = this._flattenedItems,
            itemStates = this._itemStates,
            value;

        checkedItems = {};

        // clean up checked items
        for (i = 0, l = itemStates.length; i < l; i++) {
            if (itemStates[i] && dataSource[i][columnIndex]) {
                checkedItems[dataSource[i][idIndex]] = dataSource[i][idIndex];
            }
        }

        this._checkedItems = checkedItems;

        for (value in checkedItems) {
            if (checkedItems.hasOwnProperty(value)) {
                result.push(checkedItems[value]);
            }
        }

        return result;
    }

    /**
     * Updates checkbox related data for grid row with the new state (without touching the actual checkbox element).
     * 
     * @param dataIndex The row index.
     * @param state New state for the row's checkbox.
     */
    public setCheckboxStateData(dataIndex: number, state: boolean) {
        Diag.Debug.assert(typeof dataIndex === "number", "Expected to be a number");
        Diag.Debug.assert(typeof state === "boolean", "Expected to be a number");

        var i,
            children = Math.abs(this._expandStates[dataIndex]),
            dataSource = this._grid._dataSource,
            id = dataSource[dataIndex][HierarchicalGridDataAdapter._ITEM_ID_DATA_SOURCE_INDEX];

        dataSource[dataIndex][ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX] = state;
        if (this._disableChildren(id)) {
            for (i = dataIndex + 1; i <= dataIndex + children; i++) {
                dataSource[i][ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX] = false;
                this.setItemState(dataSource[i][HierarchicalGridDataAdapter._ITEM_ID_DATA_SOURCE_INDEX], false);
                this._itemStates[i] = !state;
                this._grid.updateRow(undefined, i);
            }
        }

        // Update the checked items table
        this.setItemState(id, state);
        this._grid.updateRow(undefined, dataIndex);
    }

    /** 
     * Updates the check box state data for a given range of data indices
     *
     * @param startIndex Start Index of the range to set the state for
     * @param endIndex End Index of the range to set the state for
     * @param state State to set the checkboxes
     */
    public setCheckboxRangeStateData(startIndex: number, endIndex: number, state: boolean) {
        for (var i = startIndex; i <= endIndex; i++) {
            this.setCheckboxStateData(i, state);
        }
    }

    /**
     * Gets the checkbox state for the provided data index.
     * 
     * @param dataIndex The data index to get the checkbox state for.
     * @return True when the checkbox is checked and false otherwise.
     */
    public getCheckboxState(dataIndex: number): boolean {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var dataSource = this._grid._dataSource;

        if (dataIndex >= 0) {
            return dataSource[dataIndex][ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX];
        }

        return false;
    }

    /**
     * Determine whether the checkbox at the specified dataIndex is enabled
     * 
     * @return 
     */
    public getItemEnabled(dataIndex): boolean {
        return this._allEnabled && this._itemStates[dataIndex] && !this._blockedCheckIds[this._getIdFromDataIndex(dataIndex)];
    }

    /**
     * Gets the branch-level checked state based on the state grid items.
     * 
     * @return 
     */
    public getBranchCheckedState(): boolean {
        var state = true,
            source = this._grid._dataSource,
            rootNode = this.dataProvider.getRootNode(),
            roots = [],
            i, l;

        if (rootNode) {
            roots = rootNode.children;
        }

        // Do not check the header checkbox if there are no items.
        if (!roots || roots.length === 0) {
            state = false;
        }
        else {
            // The header checkbox can be checked only when all root items are checked.
            for (i = 0, l = roots.length; i < l && state; i += 1) {
                state = source[roots[i].dataIndex][ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX];
            }
        }

        return state;
    }

    /**
     * OVERRIDE: Constructs an array of values from the source row which is used
     * by the Checklist grid control to managed the items checked/unchecked.
     * 
     * @param sourceRow A row from the source data set.
     */
    public _constructRow(sourceRow) {
        Diag.Debug.assertParamIsObject(sourceRow, "sourceRow");

        var newRow = super._constructRow(sourceRow),
            checkboxState = this._checkedItems.hasOwnProperty(sourceRow.id);

        newRow.splice(ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX, 0, checkboxState);

        return newRow;
    }

    /**
     * Gets the value used for the ID attribute of the checkbox DOM element at a given index
     * 
     * @param dataIndex data index of the row
     * @return A (unique) id for the checkbox
     */
    private _getCheckboxCellId(dataIndex: number): string {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var gridId = this._grid.getId() || "";

        return Utils_String.format("checkbox-{0}-{1}", gridId, dataIndex);
    }

    /**
     * Attempts to find the checkbox associated with a given dataIndex
     * 
     * @param dataIndex data index of the row
     * @return A jQuery object containing the checkbox for the given dataIndex (or an empty jQuery object if one doesn't exist.
     */
    private _findCheckbox(dataIndex: number): JQuery {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var checkBoxId = this._getCheckboxCellId(dataIndex),
            $checkBox = $("#" + checkBoxId);

        Diag.Debug.assert($checkBox.length <= 1, "Expected there to be at most one checkbox with the given ID: " + checkBoxId + ", instead saw: " + $checkBox.length);
        return $checkBox;
    }

    /**
     * create checkbox cell at specific row in a column
     * 
     * @param dataIndex index of the row
     * @param column column object
     * @return The checkbox cell
     */
    private _createCheckboxCell(dataIndex: number, column: any): JQuery {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");
        Diag.Debug.assertParamIsObject(column, "column");
        Diag.Debug.assert(ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX === column.index,
            Utils_String.format("Expected that the checkbox column is in position {0}. Actual index is {1}", ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX, column.index));

        var $cell,
            checkboxId = this._getCheckboxCellId(dataIndex),
            $checkbox,
            $label,
            enabled,
            checked;

        // Create the cell which will contain the checkbox
        $cell = $(domElem("div", "grid-cell"));
        $cell.width(column.width || 20);

        // Get the current checkbox state
        if (this.hasCheckBox(dataIndex)) {
            enabled = this.getItemEnabled(dataIndex);
            checked = this.getItemChecked(dataIndex);

            $label = $("<label class='hidden' for='" + checkboxId + "'/>")
                .text(this._grid.getColumnValue(dataIndex, ChecklistDataAdapter._LABEL_COLUMN_INDEX));

            $cell.append($label);

            // Create the checkbox element and set its state
            $checkbox = $("<input type='checkbox' tabindex='-1' id='" + checkboxId + "'>")
                .data("checkbox-data-index", dataIndex)
                .prop('checked', checked)
                .prop("disabled", !enabled);

            this._setCheckboxDefaultTitle($checkbox);
            $checkbox.click(delegate(this, this._onCheckboxClicked));
            $cell.append($checkbox);
        }

        return $cell;
    }

    /**
     * The handler is invoked when a checkbox on a grid row is clicked.
     * 
     * @param e jQuery event object.
     */
    private _onCheckboxClicked(e?: any) {

        Diag.logTracePoint('TFS.UI.Controls.Data.ChecklistDataAdapter._onCheckboxClicked.start');

        var $checkbox = $(e.currentTarget),
            dataIndex,
            checked;

        dataIndex = $checkbox.data("checkbox-data-index");
        checked = $checkbox.is(":checked");

        this._setCheckedState($checkbox, dataIndex, checked);
    }

    private _setCheckedState($checkbox, dataIndex, checked) {
        var allow = true;

        if ($.isFunction(this._onBeforeCheckChanged)) {
            allow = this._onBeforeCheckChanged(dataIndex, checked);
        }

        if (allow) {
            // Remember the new state of this cell
            this.setCheckboxStateData(dataIndex, checked);

            // Don't return anything to allow the default action for the event execute
            this._raiseCheckedItemsChanged({ id: this._getIdFromDataIndex(dataIndex) });
        }
        else {
            // Revert the checked state
            $checkbox.prop("checked", !checked);
        }
    }

    /**
     * Notifies listeners of that a work item was removed.
     * 
     * @param args args
     */
    private _raiseCheckedItemsChanged(args?: any) {
        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(ChecklistDataAdapter._CHECK_CHANGED, this, args);
    }

    /**
     * Sets the title of the checkbox to the default value
     * 
     * @param $checkbox The jQuery object for the checkbox
     */
    private _setCheckboxDefaultTitle($checkbox: JQuery) {
        Diag.Debug.assertParamIsJQueryObject($checkbox, "$checkbox");
        Diag.Debug.assert($checkbox.length <= 1, "Expected at most one checkbox to be passed in. Got: " + $checkbox.length);

        $checkbox.attr("title", $checkbox.attr("disabled") ? this._disabledTooltip : "");
    }

    /**
     * Get the id of the row at the specified dataIndex
     * 
     * @return 
     */
    private _getIdFromDataIndex(dataIndex): string {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        return this._flattenedItems[dataIndex][HierarchicalGridDataAdapter._ITEM_ID_DATA_SOURCE_INDEX];
    }

    /**
     * Get the dataIndex of the row for the specified item id
     * 
     * @param id The item ID used to look up the item in the state cache.
     * @return 
     */
    private _getDataIndexFromId(id: string): number {
        Diag.Debug.assertParamIsString(id, "id");

        var node = this.dataProvider.getNodeFromId(id);
        Diag.Debug.assert(Boolean(node), "Expected to find a node for id: " + id);

        return (node ? node.dataIndex : undefined);
    }
}

VSS.initClassPrototype(ChecklistDataAdapter, {
    _checkedItems: null,
    _itemStates: null,
    _events: null,
    _disabledTooltip: null,
    _checkboxRangeRootId: null,
    _checkboxRangeBegin: null,
    _checkboxRangeEnd: null,
    _allEnabled: true,
    _blockedCheckIds: null,
    _disableChildren: null,
    _noCheckboxes: null
});



// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.Data", exports);
