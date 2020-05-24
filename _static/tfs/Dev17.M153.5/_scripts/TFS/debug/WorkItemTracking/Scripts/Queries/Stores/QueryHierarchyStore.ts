import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { TreeStore, IItem, ActionAdapter, Node, Item } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { ExtendedQueryHierarchyItem, MovedQueryItem, RenamedQueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";

/**
 * Query hierarchy data provider
 */
export interface IQueryHierarchyDataProvider {
    /**
     * Gets the status of the store.
     *
     * @returns True if data is available.
     */
    isLoaded(): boolean;
    /**
     * All of the items in the store
     */
    getAll(): IItem[];
}

export class QueryHierarchyStore<T extends ActionAdapter> extends TreeStore implements IQueryHierarchyDataProvider {
    constructor(adapter: T) {
        super({
            adapter: adapter,
            keepEmptyFolders: true,
        });
    }

    public isLoaded(): boolean {
        return this._root.folderCount() > 0; // Either My Queries and Shared Queries needs to be loaded
    }

    protected _visit(node: Node, nodeDepth: number, itemDepth: number, path: string, collapsedPath: string, result: IItem[], respectExpandState = false, siblingCount: number, nodeIndex: number): void {
        const isNotRoot = node !== this._root;
        const fullFolderName = this._maybePrepend(path, node.name);

        if (isNotRoot) {
            const nonEmptyFullFolderName = fullFolderName || this._options.separator;
            result.push(Item.folder(this._maybePrepend(collapsedPath, node.name), nonEmptyFullFolderName, itemDepth, node.expanded, node.expanding, siblingCount, nodeIndex));
        }

        // We only recurse if the current folder is expanded, or if we're not respecting the expanded state.
        if (!respectExpandState || node.expanded) {
            for (let i = 0; i < node.folders.length; ++i) {
                const folder = node.folders[i];
                this._visit(folder, nodeDepth + 1, itemDepth + 1, fullFolderName, null, result, respectExpandState, node.folders.length + node.items.length, i);
            }

            // Add node's items to the results if the node is expanded.
            for (let i = 0; i < node.items.length; ++i) {
                const item = node.items[i];
                result.push(Item.item(item, this._maybePrepend(fullFolderName, item), itemDepth + 1, node.folders.length + node.items.length, i + node.folders.length));
            }
        }
    }
}

export class QueryHierarchyAdapter extends ActionAdapter {
    constructor(actions: ActionsHub) {
        super();

        actions.InitializeQueryHierarchy.addListener((items?: QueryHierarchyItem[]) => {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYHIERARCHYSTORE_INITIALIZEQUERYHIERARCHY, true);
            if (items) {
                const foldersAndItems = this._getFoldersAndItems(items);
                this.foldersAdded.invoke(foldersAndItems.folders);
                this.itemsAdded.invoke(foldersAndItems.items);
            } else {
                this.emitIfPending.invoke(null);
            }
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYHIERARCHYSTORE_INITIALIZEQUERYHIERARCHY, false);
        });

        actions.QueryFolderChildrenLoaded.addListener((queryFolder: QueryHierarchyItem) => {
            let queryFolders: string[] = [];
            let queryItems: string[] = [];
            const loadChildren = (queryItem: QueryHierarchyItem) => {

                if (queryItem.isFolder && queryItem.hasChildren && queryItem.children && queryItem.children.length) {
                    const foldersAndItems = this._getFoldersAndItems(queryItem.children);
                    queryFolders = queryFolders.concat(foldersAndItems.folders);
                    queryItems = queryItems.concat(foldersAndItems.items);

                    for (const childQueryItem of queryItem.children) {
                        loadChildren(childQueryItem);
                    }
                }
            };

            loadChildren(queryFolder);

            this.foldersAdded.invoke(queryFolders);
            this.itemsAdded.invoke(queryItems);
        });

        actions.QueryFolderEmptyContentLoaded.addListener((emptyContent: ExtendedQueryHierarchyItem) => {
            if (emptyContent && emptyContent.isEmptyFolderContext) {
                const foldersAndItems = this._getFoldersAndItems([emptyContent]);
                this.itemsAdded.invoke(foldersAndItems.items);
            }
        });

        actions.QueryFolderEmptyContentRemoved.addListener((emptyContent: ExtendedQueryHierarchyItem) => {
            if (emptyContent && emptyContent.isEmptyFolderContext) {
                this.itemsRemoved.invoke([emptyContent.path]);
            }
        });

        actions.QueryFolderDeleted.addListener((item) => {
            this.folderRemoved.invoke(item.path);
        });

        actions.QueryDeleted.addListener((item) => {
            this.itemsRemoved.invoke([item.path]);
        });

        actions.QueryItemCreated.addListener((item) => {
            if (item.isFolder) {
                this.foldersAdded.invoke([item.path]);
            } else {
                this.itemsAdded.invoke([item.path]);
            }
        });

        actions.QueryItemMoved.addListener(({ isFolder, originalPath, updatedPath }: MovedQueryItem) => {
            if (isFolder) {
                this.folderMoved.invoke({ source: originalPath, target: updatedPath });
            } else {
                this.itemMoved.invoke({ source: originalPath, target: updatedPath });
            }
        });

        actions.QueryItemRenamed.addListener(({ isFolder, originalPath, renamedPath }: RenamedQueryItem) => {
            if (isFolder) {
                this.folderRenamed.invoke({ original: originalPath, renamed: renamedPath });
            } else {
                this.itemRenamed.invoke({ original: originalPath, renamed: renamedPath });
            }
        });

        this.registerQueryFolderExpandCollapsedEvents(actions);
    }

    protected registerQueryFolderExpandCollapsedEvents(actions: ActionsHub) {
        actions.ExpandQueryFolder.addListener((item) => {
            this.folderExpanding.invoke(item.path);
        });

        actions.QueryFolderExpanded.addListener((item) => {
            this.folderExpanded.invoke(item.path);
        });

        actions.QueryFolderCollapsed.addListener((item) => {
            this.folderCollapsed.invoke(item.path);
        });
    }

    private _getFoldersAndItems(hierarchy: QueryHierarchyItem[]): { folders: string[], items: string[] } {
        const queryFolders = hierarchy.filter((value, index, array) => {
            return value.isFolder;
        });
        const queryItems = hierarchy.filter((value, index, array) => {
            return !value.isFolder;
        });
        const folders: string[] = queryFolders.map((folder) => {
            return folder.path;
        });
        const items: string[] = queryItems.map((item) => {
            return item.path;
        });

        return {
            folders, items
        }
    }
}
