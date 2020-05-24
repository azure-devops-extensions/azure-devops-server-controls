import { localeIgnoreCaseComparer } from "VSS/Utils/String";

import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export function filterChangeListByPath(
    repositoryContext: RepositoryContext,
    changeList: ChangeList,
    filterPath: string,
    recursive: boolean): ChangeList {

    if (!changeList || !changeList.changes) {
        return changeList;
    }

    // make sure to not change the original list
    let filteredChangeList: ChangeList = {...changeList};

    if (filterPath[filterPath.length - 1] !== "/") {
        filterPath = filterPath + "/";
    }

    filteredChangeList.changes = filteredChangeList.changes.filter((change) => {
        return doesFilterMatchFile(repositoryContext, filterPath, change.item.serverItem, recursive);
    });

    return filteredChangeList;
}

export function doesFilterMatchFile(
    repositoryContext: RepositoryContext,
    filterPath: string,
    filePath: string,
    recursive: boolean): boolean {

    let matchesPath = repositoryContext.pathStartsWith(filePath, filterPath);
    if (matchesPath && !recursive) {
        if (filePath.indexOf("/", filterPath.length) >= 0) {
            matchesPath = false;
        }
    }

    return matchesPath;
}

/**
 * Compares the names of 2 folders.
 * Places subfolders before its parent, because the parent represent the files at that level.
 * This matches the tree ordering.
 */
export function compareFolderPaths(path1: string, path2: string): number {
    const parts1 = getPathSubfolders(path1);
    const parts2 = getPathSubfolders(path2);

    let index = 0;
    while (true) {
        if (index >= parts1.length) {
            if (index >= parts2.length) {
                return 0;
            }

            // If parts2 was equal til here and is longer, it's a subfolder of parts1,
            // so it should go ahead of the files in this folder, thus +1 (path1 is bigger than path2)
            return 1;
        } else if (index >= parts2.length) {
            return -1;
        } else {
            const result = localeIgnoreCaseComparer(parts1[index], parts2[index]);
            if (result !== 0) {
                return result;
            }
        }

        index++;
    }
}

/**
 * Get the parts of the given path, removing the empty ones.
 * @example "/" returns []
 * @example "/a//b/" returns ["a", "b"]
 */
function getPathSubfolders(path: string): string[] {
    if (!path || path === "/") {
        return [];
    }

    return path.split("/").filter(subfolder => subfolder !== "");
}
