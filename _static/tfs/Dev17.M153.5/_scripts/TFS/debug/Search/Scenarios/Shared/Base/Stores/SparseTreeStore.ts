import * as TreeFilter from "Search/Scenarios/Shared/Components/TreeFilter/TreeFilter.Props";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { ActionAdapter, TreeStore, IItem, CompactMode, ITreeStoreOptions } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { announce } from "VSS/Utils/Accessibility";

export enum SearchType {
    Path,

    Keyword,

    None
}

export interface SparseTreeState {
    visibleItems: () => IItem[];

    items: { [id: string]: ITreeItem };

    defaultPath: string;

    initialLoadingState: TreeFilter.ContentLoadState;

    searchable: boolean;

    searchType: SearchType;

    itemHitCount: number;

    isTreeDropdownActive: boolean;
}

export interface ITreeItem {
    path: string;

    name: string;

    isLeafNode: boolean;
}

export class SparseTreeStore extends TreeStore {
    protected _state: SparseTreeState;

    constructor(options: ITreeStoreOptions) {
        super(options);
        this._state = this.getInitialState();
    }

    public get state(): SparseTreeState {
        return this._state;
    }

    public updateDefaultPath = (defaultPath: string): void => {
        this._state.defaultPath = defaultPath;
        this.emitChanged();
    }

    public onTreeDropdownDismissed = (): void => {
        // reset the tree
        this._state.isTreeDropdownActive = false;
        const { searchable, defaultPath, items } = this._state;
        if (searchable) {
            this._adapter.refresh.invoke(null);
            this.addPaths(Object.keys(items), false, defaultPath);
        }
    }

    public onTreeDropdownInvoked = (): void => {
        this._state.isTreeDropdownActive = true;
        this._state.searchType = SearchType.None;
        this.state.itemHitCount = undefined;
        this.emitChanged();
    }

    public onItemRetrievalFailed = (): void => {        
        this._state.searchable = false;
        this._state.initialLoadingState = TreeFilter.ContentLoadState.LoadFailed;
        this._adapter.refresh.invoke(null);
    }

    public refineTreeItems = (searchText: string): void => {
        if (this._state.searchable) {
            searchText = searchText.replace(/[\/]+/g, this._options.separator).trim().toLowerCase();
            if (searchText === "") {
                // Restore tree with root expanded.
                this._adapter.refresh.invoke(null);

                this.state.searchType = SearchType.None;
                this.state.itemHitCount = undefined;

                this.addPaths(Object.keys(this._state.items), true);


                return;
            }

            if (searchText.indexOf(this._options.separator) >= 0) {

                this._state.searchType = SearchType.Path;
                this.state.itemHitCount = undefined;

                // In this case tree is restored, and try to expand the node if path is full-formed and correct.
                this._adapter.refresh.invoke(null);
                this.addPaths(Object.keys(this._state.items), false, searchText);
            }
            else {
                // In this case all paths with ouccurences of "searchText" are filtered out.
                // And nodes with node-name containing search text are expanded.

                let filteredPaths: string[] = [];

                for (let key in this._state.items) {
                    if (key.toLowerCase().indexOf(searchText) >= 0) {
                        filteredPaths.push(key);
                    }
                }

                // List of the refined tree items eligible for display count
                let pathsToExpand =
                    filteredPaths
                        .filter(p => this._state.items[p].name.toLowerCase().indexOf(searchText) >= 0);

                this._state.searchType = SearchType.Keyword;
                this._state.itemHitCount = pathsToExpand.length;

                // the paths to be expanded - Removing the hit node from expansion
                pathsToExpand = pathsToExpand.map(p => {
                    let path = p.substring(0, p.lastIndexOf(this._options.separator));
                    return path === "" ? this._options.separator : path;
                });

                this._adapter.refresh.invoke(null);
                this.addPaths(filteredPaths, false, ...pathsToExpand);
            }
        }
    }

    public startExpand = (path: string) => {
        this._adapter.folderExpanding.invoke(path);
        this._adapter.emitIfPending.invoke(null);
    }

    public collapse = (path: string) => {
        this._adapter.folderCollapsed.invoke(path);
        this._adapter.emitIfPending.invoke(null);
        if (this._state.searchable) {
            announce(`${Resources.Collapsed} ${path }`);
        }
    }

    public expanded = (path: string) => {
        this._adapter.folderExpanded.invoke(path);
        this._adapter.emitIfPending.invoke(null);

        if (this._state.searchable) {
            announce(`${ Resources.Expanded } ${path}`);
        }
    }

    public resetTree = () => {
        this._adapter.refresh.invoke(null);
        this._state = this.getInitialState();
        this._adapter.emitIfPending.invoke(null);
    }

    /*
    * Use this method to initialize a sparse tree with search enabled. This method should only be call once.
    * Made public for L0 testing purposes.
    **/
    public init = (paths: { [id: string]: ITreeItem }, isSearchable: boolean, pathToExpand: string): void => {
        this._adapter.refresh.invoke(null);
        this._state.initialLoadingState = TreeFilter.ContentLoadState.LoadSuccess;
        this._state.items = paths;
        this._state.searchable = isSearchable;
        this.addPaths(Object.keys(paths), false, pathToExpand);
    }

    /*
    * Made public for L0 testing purposes.
    **/
    public addItemsAndExpandParent = (paths: { [id: string]: ITreeItem }, parentPath: string): void => {
        // ToDO: this is not safe given the async behavior.
        this._state.items = { ...this._state.items, ...paths };
        this._state.initialLoadingState = TreeFilter.ContentLoadState.LoadSuccess;
        this._state.searchable = false;
        this.addPaths(Object.keys(paths), false, parentPath);
    }

    private addPaths = (paths: string[], expandRoot: boolean, ...pathsToExpand: string[]): void => {
        this._adapter.foldersAdded.invoke(paths);

        if (expandRoot) {
            const rootPath = paths[0];
            this._adapter.folderExpanded.invoke(rootPath);
        }
        else {
            pathsToExpand.forEach(p =>
                this._adapter.folderExpanded.invoke(p));
        }

        this._adapter.emitIfPending.invoke(null);
    }


    private getInitialState = (): SparseTreeState => {
        return {
            defaultPath: "",
            initialLoadingState: TreeFilter.ContentLoadState.Loading,
            searchable: false,
            visibleItems: () => { return this.getVisible(); },
            items: {},
            searchType: SearchType.None,
            itemHitCount: 0,
            isTreeDropdownActive: false
        };
    }
}