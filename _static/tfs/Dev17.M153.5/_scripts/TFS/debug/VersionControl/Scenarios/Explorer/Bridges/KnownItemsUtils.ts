import { KnownItemsState } from "VersionControl/Scenarios/Explorer/Stores/KnownItemsStore";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getFolderName } from "VersionControl/Scripts/VersionControlPath";

/**
 * Gets whether any part of the path is known to be a file, which would be ilegal in a folderPath.
 */
export function checkPathContainsFileUsedAsFolder(folderPath: string, knownItemsState: KnownItemsState): string {
    let parentPath = folderPath;
    let path;
    do {
        path = parentPath;

        const item = getKnownItem(path, knownItemsState);
        if (item) {
            return item.isFolder
                ? undefined
                : item.serverItem;
        }

        parentPath = getFolderName(path);
    } while (parentPath !== path);
}

/**
 * Gets whether we are certain, from the data already fetched, that the provided path doesn't exist.
 * If the path exists, or if any parent has not been fetched yet, it returns false.
 */
export function isKnownNonexistent(path: string, knownItemsState: KnownItemsState): boolean {
    let parentPath = getFolderName(path);
    let parentItem = getKnownItem(parentPath, knownItemsState);
    while (!parentItem) {
        const grandpaPath = getFolderName(parentPath);
        if (grandpaPath === parentPath) {
            return false;
        }

        parentPath = grandpaPath;
        parentItem = getKnownItem(grandpaPath, knownItemsState);
    }

    return parentItem.childItems && !getKnownItem(path, knownItemsState);
}

/**
 * Gets the item if we have already fetched it. First case-sensitive, falls back to case-insensitive if not found.
 */
export function getKnownItem(path: string, { knownItems, lowerCaseKnownItems }: KnownItemsState): ItemModel | undefined {
    return knownItems[path]
        || lowerCaseKnownItems[path.toLowerCase()];
}

/**
 * Gets the partial path that doesn't include any folder being created.
 */
export function getDeepestExistingFolder(path: string, knownItemsState: KnownItemsState): string {
    while (isCreating(path, knownItemsState)) {
        const parentPath = getFolderName(path);
        if (parentPath === path) {
            return path;
        } else {
            path = parentPath;
        }
    }

    return path;
}

function isCreating(path: string, { creatingItemPaths }: KnownItemsState): boolean {
    return creatingItemPaths && creatingItemPaths.indexOf(path) >= 0;
}
