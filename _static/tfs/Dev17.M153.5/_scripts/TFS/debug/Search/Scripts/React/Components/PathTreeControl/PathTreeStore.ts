import * as TreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";
import { LoadingState } from "Search/Scripts/React/Models";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { ActionsHub, ITreeOperationsPayload, ITreePathExpandPayload } from "Search/Scripts/React/Components/PathTreeControl/ActionsHub";
import { Callback } from "Presentation/Scripts/TFS/Stores/Callback";
import { DelayedFunction, delay } from "VSS/Utils/Core";

export interface Item extends TreeStore.IItem {
    selected?: boolean
}

export class PathTreeAdapter extends TreeStore.ActionAdapter {
    private _loadingState: LoadingState;
    public refreshAndFilterTree = new Callback<{ items: string[], filter: string }>();

    constructor() {
        super();
        
        this._loadingState = LoadingState.Loading;
    }

    public getLoadingState(): LoadingState {
        return this._loadingState;
    }

    public updateLoadingState(loadingState: LoadingState): void {
        this._loadingState = loadingState;
        this.emitIfPending.invoke(null);
    }
}

export interface IPathTreeStoreOptions extends TreeStore.ITreeStoreOptions {
    skipRoot: boolean;
    rootPath: string;
}

export class PathTreeStore extends TreeStore.TreeStore {
    protected _options: IPathTreeStoreOptions;
    private _delayedFunction: DelayedFunction;

    constructor(options: IPathTreeStoreOptions) {
        super(options);

        let adapter = options.adapter as PathTreeAdapter;

        adapter.refreshAndFilterTree.register(this._filterTree, this);
    }

    private _filterTree(filterParams: { items: string[], filter: string }): void {
        if (this._delayedFunction) {
            this._delayedFunction.cancel();
            delete this._delayedFunction;
        }

        this._adapter.refresh.invoke(null);

        var filteredPaths = [];

        // 1. Path Matching
        if (filterParams.filter.indexOf(this._options.separator) !== -1) {
            let regex = filterParams.filter.replace(/\\/g, "\\\\");

            filteredPaths = filterParams.items.filter((path: string) => {
                return path.toLocaleLowerCase().search(regex.toLocaleLowerCase()) !== -1;
            });

            this._adapter.foldersAdded.invoke(filterParams.items);

            this._visitPath(filterParams.filter, node => node.expand(), node => { });
        } else {
        // 2. Node name matching

            filteredPaths = filterParams.items.filter((path: string) => {
                return path.toLocaleLowerCase().search(filterParams.filter.toLocaleLowerCase()) !== -1;
            });

            // Render few paths immediately so as to reduce the perceived delay.
            // We're picking the very small set i.e. of 5 
            var top5paths: string[] = [];

            for (let i = 0; i < filteredPaths.length && i < 5; i++) {
                top5paths.push(filteredPaths[i]);
            }

            this._adapter.foldersAdded.invoke(filteredPaths);

            let leafNodesMatching = this.getAll().filter((item) => {
                return item.name.toLocaleLowerCase().search(filterParams.filter.toLocaleLowerCase()) !== -1;
            });

            if (filterParams.filter.length === 0) {
                this._root.expand();
            } else {
                for (let i = 0; i < leafNodesMatching.length; i++) {
                    this._visitPath(leafNodesMatching[i].fullName, node => node.expand(), node => node.collapse());
                }
            }

            this._delayedFunction = delay(this, 150, () => {
                this._adapter.foldersAdded.invoke(filteredPaths);

                let leafNodesMatching = this.getAll().filter((item) => {
                    return item.name.toLocaleLowerCase().search(filterParams.filter.toLocaleLowerCase()) !== -1;
                });

                if (filterParams.filter.length === 0) {
                    this._root.expand();
                } else {
                    for (let i = 0; i < leafNodesMatching.length; i++) {
                        this._visitPath(leafNodesMatching[i].fullName, node => node.expand(), node => node.collapse());
                    }
                }

                this._adapter.emitIfPending.invoke(null);
            });
        }
    }
    
    public updateOptions(options: Partial<IPathTreeStoreOptions>): void {
        this._options = this._options && { ...this._options, ...options };
    }

    public hasChildren(item: TreeStore.IItem): boolean {
        let result = false;

        this._visitPath(item.fullName, () => { }, node => {
            if (!!node.folders && node.folders.length > 0) {
                result = true;
            }
        });

        return result;
    }

    private _removeLastSlash(path: string): string {
        while (path.length > 0 &&
            (path[path.length - 1] == '\\' ||
                path[path.length - 1] == '/')) {

            path = path.substr(0, path.length - 1);
        }

        return path;
    }
}