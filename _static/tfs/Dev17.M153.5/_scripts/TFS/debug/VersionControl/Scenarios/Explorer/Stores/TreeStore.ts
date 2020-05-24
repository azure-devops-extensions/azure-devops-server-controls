import { ActionAdapter, TreeStore, IItem, CompactMode } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getFolderName } from "VersionControl/Scripts/VersionControlPath";

export interface TreeState {
    visibleItems: IItem[];
}

export class ExplorerTreeAdapter extends ActionAdapter {
    constructor(private readonly isGit: boolean) {
        super();
    }

    public startExpand = (path: string) => {
        this.folderExpanding.invoke(path);
        this.emitIfPending.invoke(null);
    }

    public collapse = (path: string) => {
        this.folderCollapsed.invoke(path);
        this.emitIfPending.invoke(null);
    }

    public selectItem(path: string, hasChangedVersion: boolean, item: ItemModel, isKnownNonexistent?: boolean): void {
        if (hasChangedVersion) {
            this.refresh.invoke(null);
        } else if (item) {
            this.folderExpanded.invoke(item.serverItem);
        } else if (!isKnownNonexistent) {
            this.folderExpanding.invoke(path);
        }

        this.emitIfPending.invoke(null);
    }

    public renameOrDeleteItem(oldPath: string, isFolder: boolean, navigatePath: string, newPath: string): void {
        if (isFolder) {
            this.folderRemoved.invoke(oldPath);
        } else {
            this.itemsRemoved.invoke([oldPath]);
        }

        this.preserveRoot();

        if (newPath) {
            if (isFolder) {
                this.foldersAdded.invoke([newPath]);
            } else {
                this.itemsAdded.invoke([newPath]);
            }
        }

        if (navigatePath) {
            this.folderExpanding.invoke(navigatePath);
        }

        this.emitIfPending.invoke(null);
    }

    public addItemsAndExpandParent(items: ItemModel[], item: ItemModel): void {
        this.addItemsAndExpand(items, item && getItemFolderPath(item));
    }

    public addNewPathsAndExpand(newPaths: string[]): void {
        this.addItemsAndExpand(newPaths.map(path => ({ serverItem: path } as ItemModel)));
    }

    public addItemsAndExpand(items: ItemModel[], pathToExpand?: string): void {
        if (items) {
            const { files, folders } = extractPaths(items);
            this.foldersAdded.invoke(folders);
            this.itemsAdded.invoke(files);
        }

        if (!pathToExpand) {
            const deepestParentItem = max(items, item => item ? item.serverItem.length : 0);
            pathToExpand = deepestParentItem && deepestParentItem.serverItem;
        }

        if (pathToExpand) {
            this.folderExpanded.invoke(pathToExpand);
        }

        this.emitIfPending.invoke(null);
    }

    public deleteDiscardedNewFile([filePath, ...folderPaths]: string[] = []): void {
        if (filePath) {
            this.itemsRemoved.invoke([filePath]);
            for (const folderPath of folderPaths) {
                this.folderRemoved.invoke(folderPath);
            }

            this.preserveRoot();

            this.emitIfPending.invoke(null);
        }
    }

    private preserveRoot(): void {
        if (this.isGit) {
            this.foldersAdded.invoke(["/"]);
        }
    }
}

/**
 * Custom compact mode to avoid "$" root node, it yields "$/Team" instead as the first-level.
 * Unless we have more projects, then "$" will be displayed separately to let user view the
 * grid of projects and the changesets of all the projects together.
 */
const tfvcCompactFirstLevelOnly = (node, depth) => depth === 0 && CompactMode.singleFolders(node, depth);

/**
 * Creates the TreeStore with options.
 * @param adapter The adapter for this TreeStore.
 * @param isGit Whether the repo is Git or TFVC.
 */
export function createTreeStore(adapter: ExplorerTreeAdapter, isGit: boolean) {
    return new TreeStore({
        adapter,
        isDeferEmitChangedMode: true,
        keepEmptyFolders: !isGit,
        getLookupName: isGit
            ? name => name
            : name => name.toLowerCase(),
        canCompactNodeIntoChild: isGit
            ? CompactMode.singleFoldersExceptFirstlevel
            : tfvcCompactFirstLevelOnly,
    });
}

/**
 * Returns its path if the item is a folder, or the parent if it's a file.
 */
function getItemFolderPath(item: ItemModel): string {
    return item.isFolder
        ? item.serverItem
        : getFolderName(item.serverItem);
}

function extractPaths(items: ItemModel[]): { files: string[], folders: string[] } {
    const files: string[] = [];
    const folders: string[] = [];

    const add = (item: ItemModel) => (item.isFolder ? folders : files).push(item.serverItem);

    for (const item of items) {
        if (item) {
            add(item);

            if (item.childItems) {
                for (const childItem of item.childItems) {
                    add(childItem);
                }
            }
        }
    }

    return { files, folders };
}

function max<T>(array: T[], getValue: (item: T) => number): T {
    return array.reduce((previous, item) => getValue(previous) > getValue(item) ? previous : item, undefined);
}
