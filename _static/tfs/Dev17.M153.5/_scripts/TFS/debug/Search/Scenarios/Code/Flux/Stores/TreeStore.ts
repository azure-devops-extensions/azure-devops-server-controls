import * as TreeFilter from "Search/Scenarios/Shared/Components/TreeFilter/TreeFilter.Props";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { SparseTreeStore, SparseTreeState, ITreeItem } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";
import { ItemRetrievedPayload, FilePathsRetrievedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { ActionAdapter, CompactMode } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { PathSeparator, TfvcRootPath, GitRootPath } from "Search/Scenarios/Code/Constants";
import { isGitRepo } from "Search/Scenarios/Code/Utils";

export class TreeFilterStore extends SparseTreeStore {
    constructor(adapter: ActionAdapter) {
        super({
            adapter,
            separator: PathSeparator,
            isDeferEmitChangedMode: true,
            keepEmptyFolders: false,
            getLookupName: name => name.toLowerCase(),
            canCompactNodeIntoChild: CompactMode.none
        })
    }

    public addItems = (payload: ItemRetrievedPayload): void => {
        // Update compact mode.
        !isGitRepo(payload.pathSourceParams.repositoryName) &&
            this.updateOptions({ canCompactNodeIntoChild: tfvcCompactFirstLevelOnly });

        const { allRetrievedItems, requestedPath } = payload;
        if (allRetrievedItems) {
            const folders = extractPaths(allRetrievedItems);
            this.addItemsAndExpandParent(folders, requestedPath);
        }
    }

    public onItemsRetrieved = (payload: ItemRetrievedPayload): void => {
        const { allRetrievedItems, requestedPath } = payload;
        if (allRetrievedItems) {
            const folders = extractPaths(allRetrievedItems);
            this.addItemsAndExpandParent(folders, requestedPath);
        }
    }

    public onFilePathFetched = (payload: FilePathsRetrievedPayload): void => {
        !isGitRepo(payload.pathSourceParams.repositoryName) &&
            this.updateOptions({ canCompactNodeIntoChild: tfvcCompactFirstLevelOnly });

        const { paths, requestedPath } = payload;
        if (paths) {
            const folders = extractFilePaths(paths);
            this.init(folders, true, requestedPath);
        }
    }
}

/**
 * Custom compact mode to avoid "$" root node, it yields "$/Team" instead as the first-level.
 * Unless we have more projects, then "$" will be displayed separately to let user view the
 * grid of projects and the changesets of all the projects together.
 */
const tfvcCompactFirstLevelOnly = (node, depth) => depth === 0 && CompactMode.singleFolders(node, depth);

function extractPaths(items: _VCLegacyContracts.ItemModel[]): { [id: string]: ITreeItem } {
    const folders = {};
    const add = (item: _VCLegacyContracts.ItemModel) => {
        const path = item.serverItem;
        const treeItem = {
            path: path,
            isLeafNode: false,
            name: path.substring(path.lastIndexOf(PathSeparator) + 1)
        }

        folders[item.serverItem] = treeItem;
    };

    for (const item of items) {
        if (item && item.isFolder) {
            add(item);
            if (item.childItems) {
                for (const childItem of item.childItems) {
                    if (childItem.isFolder) {
                        add(childItem);
                    }
                }
            }
        }
    }

    return folders;
}

export function extractFilePaths(items: string[]): { [id: string]: ITreeItem } {
    const treeItems: { [id: string]: ITreeItem } = {
        [GitRootPath]: { isLeafNode: false, name: GitRootPath, path: GitRootPath }
    };

    let allFolders: IDictionaryStringTo<boolean> = {},
        folderPaths: string[] = [GitRootPath],
        hasChildren: IDictionaryStringTo<boolean> = {};

    // Get all the folders from file paths collection
    for (let item of items) {
        let start = item.length - 1;
        let pos;

        while ((pos = item.lastIndexOf(PathSeparator, start)) > 0) {
            const folderPath = item.substring(0, pos),
                fullFolderPath = GitRootPath + folderPath;

            // we already have this folder and its parents
            if (allFolders[fullFolderPath]) {
                break;
            }

            allFolders[fullFolderPath] = true;
            folderPaths.push(fullFolderPath);
            const folderName = folderPath.substring(folderPath.lastIndexOf(PathSeparator) + 1);
            treeItems[fullFolderPath] = { isLeafNode: false, name: folderName, path: fullFolderPath };

            start = pos - 1;
        }
    }

    folderPaths.sort(comparePathLength);

    // Compute which folders have children
    for (let folder of folderPaths) {
        const start = folder.length - 1,
            pos = folder.lastIndexOf(PathSeparator, start);

        if (pos >= 0) {
            let parentPath = folder.substring(0, pos);
            if (parentPath === "") {
                parentPath = GitRootPath;
            }

            hasChildren[parentPath] = true;
        }
    }

    // Update isLeafNode property of ITreeItem within state.
    for (let key in treeItems) {
        treeItems[key].isLeafNode = !hasChildren[key];
    }

    return treeItems;
}

function comparePathLength(a: string, b: string): number {
    return a.length === b.length
        ? 0
        : a < b
            ? -1
            : 1;
}