import { IDataSource, PathTreeCache } from "Search/Scripts/React/Sources/PathTreeCache";
import { ActionsHub } from "Search/Scripts/React/Components/PathTreeControl/ActionsHub";
import { PathTreeStore, PathTreeAdapter } from "Search/Scripts/React/Components/PathTreeControl/PathTreeStore";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { LoadingState } from "Search/Scripts/React/Models";
import Utils_Core = require("VSS/Utils/Core");

export class ActionsCreator {
    private _actionsHub: ActionsHub;

    constructor(actionsHub: ActionsHub) {
        this._actionsHub = actionsHub;
    }

    /**
     * Gets data from the cache/lower layers and triggers action to expand the node
     * for which data has been fetched.
     * @param cache
     * @param treeAdapter
     * @param path
     */
    public getData(cache: PathTreeCache, treeAdapter: PathTreeAdapter, path: string): void {
        cache.getItems([path]).done((folders) => {
            let paths: string[] = [];

            // Converts {[path]: [children]} dictionary to list of all the children and parents
            for (let key in folders.result) {
                if (folders.result.hasOwnProperty(key)) {
                    paths.push(key);
                    for (let i = 0; i < folders.result[key].length; i++) {
                        paths.push(folders.result[key][i]);
                    }
                }
            }

            // We need second level data as well to decide if a node in tree is expandable/collapsible.
            cache.getItems(paths).done((subfolders) => {
                for (let key in subfolders.result) {
                    if (subfolders.result.hasOwnProperty(key)) {
                        for (let i = 0; i < subfolders.result[key].length; i++) {
                            paths.push(subfolders.result[key][i]);
                        }
                    }
                }

                // This adds data to the tree store and expands the node for with data was fetched.
                // As the data has been successfully fetched, it'll set the loading state as well.
                treeAdapter.foldersAdded.invoke(paths);
                treeAdapter.folderExpanded.invoke(path);
                treeAdapter.updateLoadingState(folders.status);
                treeAdapter.emitIfPending.invoke(null);
            });
        }, (error) => {
            treeAdapter.updateLoadingState(LoadingState.LoadFailed);
        });
    }

    /**
     * Returns the filtered paths
     * @param cache
     * @param treeAdapter
     * @param filterText
     */
    public filterData(cache: PathTreeCache, treeAdapter: PathTreeAdapter, filterText: string): void {
        let paths = cache.getAllCachedPaths();
        
        treeAdapter.refreshAndFilterTree.invoke({ items: paths, filter: filterText });      
        treeAdapter.emitIfPending.invoke(null);
    }
}