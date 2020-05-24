import * as StoreBase from "VSS/Flux/Store";
import { first } from "VSS/Utils/Array";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { Callback } from "Presentation/Scripts/TFS/Stores/Callback";

export const DEFAULT_SEPARATOR = "/";

export interface IMoveParams {
    source: string;
    target: string;
}

export interface IRenameParams {
    original: string;
    renamed: string;
}

/**
 * The interface action adapters for the TreeStore should use.
 * Note the TreeStore works only on string keys. This is codified
 * in this interface.
 */
export interface IActionAdapter {
    /** Invoke when items should be added to the TreeStore. */
    itemsAdded: Callback<string[]>;
    /** Invoke when items should be removed from the TreeStore. */
    itemsRemoved: Callback<string[]>;
    /** Invoke when an item that is not a folder is moved within the store */
    itemMoved: Callback<IMoveParams>;
    /** Invoke when an item that is not a folder is renamed within the store */
    itemRenamed: Callback<IRenameParams>;
    /** Invoke when a folder should be added to the TreeStore. */
    foldersAdded: Callback<string[]>;
    /** Invoke when a folder should be removed from the TreeStore. */
    folderRemoved: Callback<string>;
    /** Invoke when a folder should be collapsed in the TreeStore. */
    folderExpanding: Callback<string>;
    /** Invoke when a folder should be collapsed in the TreeStore. */
    folderExpanded: Callback<string>;
    /** Invoke when a folder should be collapsed in the TreeStore. */
    folderCollapsed: Callback<string>;
    /** Invoke when folder is moved within the store */
    folderMoved: Callback<IMoveParams>;
    /** Invoke when folder is renamed within the store */
    folderRenamed: Callback<IRenameParams>;
    /** Invoke when all folders should be expanded in the TreeStore. */
    expandAll: Callback<{}>;
    /** Invoke when all folders should be collapsed in the TreeStore. */
    collapseAll: Callback<{}>;
    /** Invoke when Tree should be cleared and loaded from new items */
    refreshItemsAndExpand: Callback<string[]>;
    /** Invoke when Tree should be cleared and loaded from new items */
    refresh: Callback<string[]>;
    /** Invoke in deferred mode to emit changed event if pending */
    emitIfPending: Callback<string[]>;
    /** Invoke when the store should be disposed */
    dispose?: Function;
}

/**
 * Action adapters for the TreeStore should extend this class. It provides the
 * expected implementation for the callbacks.
 */
export class ActionAdapter implements IActionAdapter {
    public itemsAdded = new Callback<string[]>();
    public itemsRemoved = new Callback<string[]>();
    public itemMoved = new Callback<IMoveParams>();
    public itemRenamed = new Callback<IRenameParams>();
    public foldersAdded = new Callback<string[]>();
    public folderRemoved = new Callback<string>();
    public folderMoved = new Callback<IMoveParams>();
    public folderRenamed = new Callback<IRenameParams>();
    public folderExpanded = new Callback<string>();
    public folderExpanding = new Callback<string>();
    public folderCollapsed = new Callback<string>();
    public expandAll = new Callback<any>();
    public collapseAll = new Callback<any>();
    public refreshItemsAndExpand = new Callback<any>();
    public refresh = new Callback<any>();
    public emitIfPending = new Callback<any>();

    public dispose() {
        this.itemsAdded.unregister();
        this.itemsRemoved.unregister();
        this.itemMoved.unregister();
        this.itemRenamed.unregister();
        this.foldersAdded.unregister();
        this.folderRemoved.unregister();
        this.folderExpanded.unregister();
        this.folderExpanding.unregister();
        this.folderCollapsed.unregister();
        this.folderMoved.unregister();
        this.folderRenamed.unregister();
        this.expandAll.unregister();
        this.collapseAll.unregister();
        this.refreshItemsAndExpand.unregister();
        this.refresh.unregister();
        this.emitIfPending.unregister();
    }
}

/**
 * Nodes in the tree. Exposed publically only for testing.
 */
export class Node {
    private _expanded: boolean = false;
    private _expanding: boolean = false;
    private _folders: IDictionaryStringTo<Node> = {};
    private _foldersList: Node[] = [];
    private _items: string[] = [];
    private _itemsLookup: IDictionaryStringTo<boolean> = {};

    constructor(
        public name: string,
        private getLookupName: (name: string) => string) {
    }

    get expanded() { return this._expanded; }
    get expanding() { return this._expanding; }
    get items() { return this._items; }
    get folders() { return this._foldersList; }

    public expand() { this._expanded = true; this._expanding = false; }
    public startExpanding() { this._expanding = true; }
    public collapse() { this._expanded = false; }

    public folderCount(): number {
        return this._foldersList.length;
    }

    public itemCount(): number {
        return this._items.length;
    }

    public addItem(item: string) {
        this._items.push(item);
        this._itemsLookup[this.getLookupName(item)] = true;
    }

    public hasItem(item: string): boolean {
        const lookupName = this.getLookupName(item);
        return this._itemsLookup[lookupName];
    }

    public removeItem(item: string) {
        let index = this._items.indexOf(item);
        if (index >= 0) {
            this._items.splice(index, 1);
            delete this._itemsLookup[this.getLookupName(item)];
        }
    }

    /**
     * @param folderName to add
     * @returns folder added
     */
    public addFolder(folderName: string): Node {
        return this.addFolderNode(new Node(folderName, this.getLookupName));
    }

    /**
     * @param folder to add
     * @returns folder added
     */
    public addFolderNode(folder: Node): Node {
        if (this.hasFolder(folder.name)) {
            throw new Error(`Already have a folder named ${folder.name} in ${this.name}`);
        }
        this._folders[this.getLookupName(folder.name)] = folder;
        this._foldersList.push(folder);
        return folder;
    }

    public hasFolder(folderName: string): boolean {
        return this._folders.hasOwnProperty(this.getLookupName(folderName));
    }

    public getFolder(folderName: string): Node {
        const lookupName = this.getLookupName(folderName);
        return this._folders.hasOwnProperty(lookupName) &&
            this._folders[lookupName];
    }

    public removeFolder(folderName: string) {
        if (this.hasFolder(folderName)) {
            delete this._folders[folderName];

            this._foldersList = this._foldersList.filter(node => node.name !== folderName);
        }
    }

    public sort(): void {
        this._items.sort(ignoreCaseComparer);
        this._foldersList.sort((a, b) => ignoreCaseComparer(a.name, b.name));
    }
}

/**
 * Items returned from traversing the TreeStore.
 */
export interface IItem {
    name: string;
    fullName: string;
    isFolder: boolean;
    depth: number;
    expanded: boolean;
    expanding: boolean;
    setSize: number;
    indexInParent: number;
}

/**
 * Concrete Item class: contains a couple of useful factory functions for producing instance of Item.
 */
export class Item implements IItem {
    constructor(public name: string, public fullName: string, public isFolder: boolean, public depth: number, public expanded: boolean, public expanding: boolean, public setSize: number, public indexInParent: number) {
    }

    static folder(name: string, fullName: string, depth: number, expanded: boolean, expanding: boolean, setSize: number, indexInParent: number): Item {
        return new Item(name, fullName, true, depth, expanded, expanding, setSize, indexInParent);
    }

    static item(name: string, fullName: string, depth: number, setSize: number, indexInParent: number): Item {
        return new Item(name, fullName, false, depth, false, false, setSize, indexInParent);
    }
}

/**
 * An object returned by the split function must expose these properties.
 */
export interface SplitResult {
    folderParts: string[];
    itemName: string;
}

export type KeysComparer = (a: string, b: string) => number;

export type ChildrenComparer = (parentPath: string, a: Node | string, b: Node | string) => number;

/**
 * Option adapter to help drive a TreeStore with different data types.
 */
export interface ITreeStoreOptions {
    /**
     * The action adapter to wire the store up to.
     */
    adapter: IActionAdapter;

    /**
     * The path separator. Defaults to DEFAULT_SEPARATOR.
     */
    separator?: string;

    /**
     * Given a delimited key, split the key into the components.
     *
     * Defaults to splitting the key on separator.
     */
    splitItemPath?: (path: string, separator?: string, justFolder?: boolean) => SplitResult;

    /**
     * Gets the name ready to be searched or compared with other names.
     * Use a function like toLowercase to make the tree case-insensitive.
     * It doesn't apply to sorting, which is always case-insensitive unless compareChildren is provided.
     */
    getLookupName?(name: string): string;

    /**
     * If provided, sorts children of each node, otherwise it defaults to case-insensitive comparer with folders first.
     * This function compares two children, which can be either a folder (Node) or an item (string).
     * Comparison happens for folders and items together during the visit operation.
     */
    compareChildren?: ChildrenComparer;

    /**
     * True to trigger changed events from the adapter. Pending is recorded yet.
     * False to do it automatically right after each handler in the Tree Store.
     */
    isDeferEmitChangedMode?: boolean;

    /**
     * When an item is removed and its parent folder becomes empty, it will be also removed if this flag isn't true.
     * Note this works recursively upwards.
     */
    keepEmptyFolders?: boolean;

    /**
     * Configures which nodes can be compacted into its child node
     */
    canCompactNodeIntoChild?: CompactModeDecider;
}

export type CompactModeDecider = (node: Node, depth: number) => boolean;

export namespace CompactMode {
    /**
     * Compacts folders with no items and having only one child folder
     * @example
     * If given paths ['$/a/b/File1.txt', '$/a/b/File2.txt']
     *      $/a/b
     *      ---->File1.txt
     *      ---->File2.txt
     */
    export const singleFolders: CompactModeDecider = (node, depth) => node.itemCount() === 0 && node.folderCount() === 1;
    /**
     * Compacts folders with no items and having only one child folder, except folders in the first level
     * @example
     * If given paths ['$/a/b/File1.txt', '$/a/b/File2.txt']
     *      $
     *      ---->/a/b
     *      --------->File1.txt
     *      --------->File2.txt
     */
    export const singleFoldersExceptFirstlevel: CompactModeDecider = (node, depth) => singleFolders(node, depth) && depth > 0;
    /**
     * Compacts no folders into its child folder
     * @example
     * If given paths ['$/a/b/File1.txt', '$/a/b/File2.txt']
     *      $
     *      ---->a
     *      --------->b
     *      -------------->File1.txt
     *      -------------->File2.txt
     */
    export const none: CompactModeDecider = (node, depth) => false;
}

/**
 * Interface the TreeStore exposes.
 */
export interface ITreeStore {
    getAll(): IItem[];
    getVisible(): IItem[];
}

export type NodeVisitor = (node: Node) => void;

/**
 * Processes events and helps build a smart tree for navigating a heirarchy
 * of things. The TreeStore is responsible for folder/item expand/collapse
 * and collapsing multiple empty folders into a single node.
 *
 * For example, given this set of items:
 *  - x
 *  - y
 *  - a/b2
 *  - d/e/f/g
 *  - a/b/c
 *  - a/b/d
 *  - a/b/e
 *  - d/e/h/i
 *
 * The smart tree will be (where f = folder and i = item)
 * [F] a
 *      [F] b
 *          [I] c
 *          [I] d
 *          [I] e
 *      [I] b2
 * [F] d/e
 *      [F] f
 *          [I] g
 *      [F] h
 *          [I] i
 * [I] x
 * [I] y
 */
export class TreeStore extends StoreBase.Store implements ITreeStore {
    protected _options: ITreeStoreOptions;
    protected _root: Node;
    private emitManager: TransactionManager;
    protected _adapter: IActionAdapter;

    constructor(options: ITreeStoreOptions) {
        super();
        this._initializeOptions(options);
        this._reset();

        this.emitManager = new TransactionManager(!this._options.compareChildren, () => this.emitChanged());

        if (!this._options.adapter) {
            throw new Error("Adapter is required in TreeStore options.");
        }

        this._adapter = this._options.adapter;

        // Wire up the adapter to the event processors.
        this._adapter.refresh.register(this._onRefresh, this);
        this._adapter.refreshItemsAndExpand.register(this._onItemsRefreshedExpand, this);
        this._adapter.itemsAdded.register(this._onItemsAdded, this);
        this._adapter.itemsRemoved.register(this._onItemsRemoved, this);
        this._adapter.itemMoved.register(this._onItemMoved, this);
        this._adapter.itemRenamed.register(this._onItemRenamed, this);
        this._adapter.foldersAdded.register(this._onFoldersAdded, this);
        this._adapter.folderRemoved.register(this._onFolderRemoved, this);
        this._adapter.folderRenamed.register(this._onFolderRenamed, this);
        this._adapter.folderExpanded.register(this._onFolderExpanded, this);
        this._adapter.folderMoved.register(this._onFolderMoved, this);
        this._adapter.folderCollapsed.register(this._onFolderCollapsed, this);
        this._adapter.expandAll.register(this._onExpandAll, this);
        this._adapter.collapseAll.register(this._onCollapseAll, this);
        this._adapter.folderExpanding.register(this._onFolderExpanding, this);
        this._adapter.emitIfPending.register(this.emitIfPending, this);
    }

    public dispose() {
        if (this._adapter) {
            if (this._adapter.dispose) {
                this._adapter.dispose();
            }
            this._adapter = null;
        }
        this._options = null;
    }

    private emitIfPendingInternal() {
        if (!this._options.isDeferEmitChangedMode) {
            this.emitIfPending();
        }
    }

    protected emitIfPending(): void {
        this.emitManager.emitIfPending();
    }

    /**
     * Return all of the items in the store.
     */
    public getAll(): IItem[] {
        let result = [] as IItem[];
        const childCount = this._root.folders.length + this._root.items.length;
        this._visit(this._root, -1, -1, null, null, result, false, childCount, 0);
        return result;
    }

    /**
     * Return the visible items in the store.
     * Visiblity is controlled by the expand/collapse state of the folders
     * and the pageSize in the options for folders containing a lot of items.
     */
    public getVisible(): IItem[] {
        let result = [] as IItem[];
        const childCount = this._root.folders.length + this._root.items.length;
        this._visit(this._root, -1, -1, null, null, result, true, childCount, 0);
        return result;
    }

    protected _visit(node: Node, nodeDepth: number, itemDepth: number, path: string, compactedPath: string, result: IItem[], respectExpandState: boolean = false, siblingCount: number, nodeIndex: number): void {
        // When do we add a node to the results?
        // When it is not the root
        // - and -
        //   when it has items or multiple folders
        //   - or -
        //   when it has no items and no folders
        //   - or -
        //   when it need not be compacted with child
        // Otherwise, recurse.
        let isNotRoot = node !== this._root;

        let canCompactNodeIntoChild = this._options.canCompactNodeIntoChild(node, nodeDepth);

        let fullFolderName = this._maybePrepend(path, node.name);
        // Add a node if it meets the criteria
        if (isNotRoot && !canCompactNodeIntoChild) {
            const nonEmptyFullFolderName = fullFolderName || this._options.separator;
            result.push(Item.folder(this._maybePrepend(compactedPath, node.name), nonEmptyFullFolderName, itemDepth, node.expanded, node.expanding, siblingCount, nodeIndex));
        }

        let childrenList: (Node | string)[] = [...node.folders, ...node.items];
        if (this._options.compareChildren) {
            // Only if childrenComparer is provided we perform the sort
            childrenList.sort((a, b) => this._options.compareChildren(fullFolderName, a, b));
        }

        // Recurse if it meets the criteria.
        let shouldCompact = isNotRoot && canCompactNodeIntoChild;
        let depthIncrement = shouldCompact ? 0 : 1;
        const newCompactedPath = shouldCompact ? this._maybePrepend(compactedPath, node.name) : null;
        for (let i = 0; i < childrenList.length; ++i) {
            const child = childrenList[i];
            if (child instanceof Node) {
                // We only recurse if the current folder is expanded, or if we're not respecting the expanded state, or if the node should be compacted.
                if (!respectExpandState || (respectExpandState && node.expanded) || shouldCompact) {
                    // Pass through the sibling count and index if we're compacting the folder name, since visually we're collapsing two nodes into one
                    const childrenCount = shouldCompact ? siblingCount : childrenList.length;
                    const index = shouldCompact ? nodeIndex : i;
                    this._visit(child, nodeDepth + 1, itemDepth + depthIncrement, fullFolderName, newCompactedPath, result, respectExpandState, childrenCount, index);
                }
            } else {
                // Add node's items to the results if the node is expanded.
                if (!respectExpandState || node.expanded) {
                    result.push(Item.item(child, this._maybePrepend(fullFolderName, child), itemDepth + 1, childrenList.length, i));
                }
            }
        }
    }

    /**
     * Prepends maybeEmpty to target if maybeEmpty is not null.
     * Empty "" is a valid value for a root folder, like in "/a/b/c" (Git paths).
     */
    protected _maybePrepend(maybeEmpty: string, target: string): string {
        return maybeEmpty !== null ? maybeEmpty + this._options.separator + target : target;
    }

    // Add these items replacing existing items
    private _onItemsRefreshedExpand(items: string[]) {
        this._reset();

        for (const item of items) {
            this._addItem(item);
        }

        this._onExpandAll();

        this.emitIfPendingInternal();
    }

    private _onRefresh(): void {
        this._reset();
        this.emitManager.setPending();

        this.emitIfPendingInternal();
    }

    /**
     * Remove all items from the tree.
     */
    private _reset() {
        this._root = new Node(null, this._options.getLookupName);
        this._root.expand();
    }

    private _onItemsAdded(items: string[]) {
        // Loop instead of forEach() for performance (here and below)
        for (let item of items) {
            this._addItem(item);
        }
        this.emitIfPendingInternal();
    }

    private _onItemsRemoved(items: string[]) {
        for (let item of items) {
            this._removeItem(item);
        }
        this.emitIfPendingInternal();
    }

    private _onItemMoved({ source, target }: IMoveParams) {
        const { itemName } = this._options.splitItemPath(source);
        const targetNode = this._findNodeOrDeepestParent(target);
        this._removeItem(source);
        targetNode.addItem(itemName);
        this.emitManager.setSortPending(targetNode);
        this.emitIfPendingInternal();
    }

    private _onItemRenamed({ original, renamed }: IRenameParams): void {
        this._removeItem(original);
        this._addItem(renamed);
        this.emitIfPendingInternal();
    }

    private _onFoldersAdded(folders: string[]) {
        for (let folder of folders) {
            this._addFolder(folder);
        }
        this.emitIfPendingInternal();
    }

    private _onFolderRemoved(folderPath: string) {
        this._removeItemOrFolder(folderPath, true);
        this.emitIfPendingInternal();
    }

    private _onFolderMoved({ source, target }: IMoveParams) {
        const sourceNode = this._findNodeOrDeepestParent(source);
        const targetNode = this._findNodeOrDeepestParent(target);
        this._removeItemOrFolder(source, true);
        targetNode.addFolderNode(sourceNode);
        this.emitManager.setSortPending(targetNode);
        this.emitIfPendingInternal();
    }

    private _onFolderRenamed({ original, renamed }: IRenameParams): void {
        // Original folder node
        const originalNode = this._findNodeOrDeepestParent(original);
        // This will get the parent of renamed node as the node does not exist yet
        const targetParentNode = this._findNodeOrDeepestParent(renamed);

        // Remove the folder from it's current parent
        this._removeItemOrFolder(original, true);

        // Add the renamed node to the target location
        const { itemName } = this._options.splitItemPath(renamed);
        originalNode.name = itemName;
        targetParentNode.addFolderNode(originalNode);

        this.emitManager.setSortPending(targetParentNode);
        this.emitIfPendingInternal();
    }

    protected _onFolderExpanding(folderName: string) {
        const node = this._findNodeOrDeepestParent(folderName);

        if (node && !node.expanding) {
            node.startExpanding();
            this.emitManager.setPending();
        }
        this.emitIfPendingInternal();
    }

    protected _onFolderExpanded(folderName: string) {
        this._visitPath(folderName, node => node.expand(), null);
        this.emitManager.setPending();
        this.emitIfPendingInternal();
    }

    private _onFolderCollapsed(folderName: string) {
        this._visitPath(folderName, null, node => node.collapse());
        this.emitManager.setPending();
        this.emitIfPendingInternal();
    }

    protected _findNodeOrDeepestParent(folderName: string): Node {
        return this._visitPath(folderName, null, null);
    }

    protected _visitPath(folderName: string, eachVisitor: NodeVisitor, terminalVisitor: NodeVisitor): Node {
        let result = this._options.splitItemPath(folderName, this._options.separator, true);

        let current = this._root;
        for (let folder of result.folderParts) {
            const parent = current;
            current = current.getFolder(folder);
            if (!current) {
                return parent;
            }

            if (eachVisitor) {
                eachVisitor(current);
            }
        }

        if (terminalVisitor) {
            terminalVisitor(current);
        }
        return current;
    }

    private _onExpandAll() {
        this._visitAll(node => node.expand());
        this.emitManager.setPending();
        this.emitIfPendingInternal();
    }

    private _onCollapseAll() {
        this._visitAll(node => node.collapse());
        this.emitManager.setPending();
        this.emitIfPendingInternal();
    }

    private _visitAll(visitor: NodeVisitor) {
        let stack = [this._root];
        while (stack.length) {
            let node = stack.pop();
            for (let folder of node.folders) {
                stack.push(folder);
            }
            if (node !== this._root) {
                visitor(node);
            }
        }
    }

    protected _addItem(item: string): void {
        let result = this._options.splitItemPath(item, this._options.separator, false);

        let current = this._root;
        for (let folder of result.folderParts) {
            current = this.getOrAddFolder(current, folder);
        }

        // Don't add the same item to the tree twice
        if (!current.hasItem(result.itemName)) {
            current.addItem(result.itemName);
            this.emitManager.setSortPending(current);
        }
    }

    private getOrAddFolder(parent: Node, folderName: string): Node {
        let current = parent.getFolder(folderName);

        if (!current) {
            current = parent.addFolder(folderName);
            this.emitManager.setSortPending(parent);
        }

        return current;
    }

    protected _removeItem(path: string): void {
        this._removeItemOrFolder(path, false);
    }

    protected _removeItemOrFolder(path: string, isFolder: boolean): void {
        interface NodePair {
            current: Node;
            previous: Node;
        }

        let { folderParts, itemName } = this._options.splitItemPath(path);

        // Walk down the tree until we find the folder containing the node.
        // Along the way, build a stack, pairing the current with the previous.
        let prev = this._root;
        let current = this._root;
        let stack: NodePair[] = [];
        for (let folder of folderParts) {
            current = current.getFolder(folder);
            stack.push({ current: current, previous: prev });
            prev = current;

            // If the tree has not yet been initialized with all items,
            // then the folder node may not exist.  Just return.
            if (!current) {
                return;
            }
        }

        // Now that we found the correct folder, remove the item.
        if (isFolder) {
            current.removeFolder(itemName);
        } else {
            current.removeItem(itemName);
        }
        this.emitManager.setPending();

        if (!this._options.keepEmptyFolders) {
            // Walk back up the stack.
            // Remove folders when they contain no items and no folders.
            while (stack.length) {
                let pair = stack.pop();
                let curr = pair.current;
                if (curr.itemCount() === 0 && curr.folderCount() === 0) {
                    pair.previous.removeFolder(curr.name);
                    this.emitManager.setPending();
                }
            }
        }
    }

    private _addFolder(folderName: string): void {
        let result = this._options.splitItemPath(folderName, this._options.separator, true);

        let current = this._root;
        for (let folder of result.folderParts) {
            current = this.getOrAddFolder(current, folder);
        }
    }

    public updateOptions(options: Partial<ITreeStoreOptions>): void {
        this._options = this._options && { ...this._options, ...options };
    }

    private _initializeOptions(options: ITreeStoreOptions) {
        this._options = {
            splitItemPath: defaultSplitItemPath,
            separator: DEFAULT_SEPARATOR,
            getLookupName: name => name,
            canCompactNodeIntoChild: CompactMode.singleFolders,
            ...options,
        };
    }
}

class TransactionManager {
    private isRemovalEmitPending: boolean;
    private nodesSortPending: Node[] = [];

    public constructor(private shouldSort: boolean, private emitChanged: () => void) {
    }

    public setPending() {
        this.isRemovalEmitPending = true;
    }

    public setSortPending(folder: Node) {
        if (this.shouldSort) {
            if (this.nodesSortPending.indexOf(folder) < 0) {
                this.nodesSortPending.push(folder);
            }
        }
    }

    public emitIfPending(): void {
        if (this.isRemovalEmitPending || this.nodesSortPending.length) {
            for (let node of this.nodesSortPending) {
                node.sort();
            }

            this.emitChanged();

            this.isRemovalEmitPending = false;
            this.nodesSortPending = [];
        }
    }
}

/**
 * Default splitting of an item path on DEFAULT_SEPARATOR. Exposed publically for testability.
 */
export function defaultSplitItemPath(key: string, separator: string = DEFAULT_SEPARATOR, justFolder?: boolean): SplitResult {
    let parts = key.split(separator);

    if (parts[parts.length - 1] === "") {
        parts.pop();
    }

    if (justFolder) {
        return { folderParts: parts, itemName: null } as SplitResult;
    } else {
        let item = parts.pop();
        return { folderParts: parts, itemName: item } as SplitResult;
    }
}
