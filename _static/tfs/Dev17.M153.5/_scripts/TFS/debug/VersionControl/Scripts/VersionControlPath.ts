import { format, startsWith, defaultComparer } from "VSS/Utils/String";

import * as FileSpecUtility from "VersionControl/Scripts/FileSpecUtility";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export const pathSeparator = "/";
export const gitRootPath = "/";
export const tfvcRootPath = "$/";
const maximumPathLength = 255;

export function getFileExtension(path: string) {
    let extension = "";
    const dotIndex = (path || "").lastIndexOf(".");

    if (dotIndex >= 0) {
        extension = path.substring(dotIndex + 1);
    }

    return extension;
}

export function getContainingFolder(path: string, rootPath: string) {
    if (!path) {
        return "";
    }

    if (path[path.length - 1] === pathSeparator) {
        // Trim an ending slash
        path = path.substr(0, path.length - 1);
    }

    const slashIndex = path.lastIndexOf(pathSeparator);
    if (slashIndex >= 0) {
        path = path.substr(0, slashIndex);
        if (!path) {
            path = rootPath;
        }
    }
    else {
        path = rootPath;
    }

    return path;
}

export function getFileOrFolderDisplayName(item: ItemModel, parentPath: string) {
    let name: string;

    if (item.isFolder &&
        item.serverItem.length > 0 &&
        startsWith(item.serverItem, parentPath, defaultComparer)) {
        // Trim parent path prefix from child path.
        // Trim 1 more character unless the parent path is the root "/" (Git) or "$", "$/" (Tfvc)
        name = item.serverItem.substring(parentPath.length + ((parentPath.length > 1 && parentPath !== tfvcRootPath) ? 1 : 0));
    }
    else {
        name = getFileName(item.serverItem);
    }

    return name;
}

export function getFileName(path: string) {
    let pos: number;

    if (!path) {
        return "";
    }

    pos = path.lastIndexOf(pathSeparator);

    if (pos >= 0) {
        return path.substring(pos + 1);
    }

    return path;
}

/**
 * Gets the containing directory of the last path component.
 * @param path The path
 * @returns Path characters up to the last slash.
 *          The trailing slash is included if the result is the root directory ("/" or "$/").
 *          Otherwise, the trailing slash is not included.
 *          Empty string if the path contains no slash.
 */
export function getFolderName(path: string) {
    let pos: number;
    let folder: string;

    if (path) {
        pos = path.lastIndexOf(pathSeparator);
        if (pos >= 0) {
            folder = path.substr(0, pos);

            // Always include a '/' for the root folder
            if (folder === "$") {
                return tfvcRootPath;
            }
            else if (folder === "") {
                return gitRootPath;
            }

            return folder;
        }
    }

    return "";
}

/**
 * Gets a list with all the parent full paths of a provided path.
 * @param path The path
 * @returns A list with parent paths, excluding the provided one.
 * @example ("/a/b/c") returns ["/a/b", "/a", "/"]
 */
export function getParentPaths(path: string) {
    const partials: string[] = [];

    if (path) {
        let previous = path;
        let parent = getFolderName(previous);
        while (previous !== parent) {
            partials.push(parent);
            previous = parent;
            parent = getFolderName(previous);
        }
    }

    return partials;
}

/**
 * Gets the containing directory of the last path component.
 * @param path The path
 * @returns Path characters up to and including the last slash.
 *          Empty string if the path contains no slash.
 */
export function getDirectory(path: string) {
    let pos: number;

    if (path) {
        pos = path.lastIndexOf(pathSeparator);
        if (pos >= 0) {
            return path.substr(0, pos + 1);
        }
    }

    return "";
}

export function combinePaths(path1: string, ...paths: string[]) {
    let combinedPath = path1 || "";

    for (const path of paths) {
        if (path) {
            if (combinedPath[combinedPath.length - 1] !== pathSeparator) {
                combinedPath += pathSeparator;
            }

            if (path[0] === pathSeparator) {
                combinedPath += path.substr(1);
            } else {
                combinedPath += path;
            }
        }
    }

    return combinedPath;
}

/**
 * Gets an error message if filename is invalid, or falsy if it's valid.
 * @param filename The name of the file to validate.
 * @param parentFolder The complete folder that will contain the file. Some names are invalid in nested folders like .git
 * @param repositoryType Type to check if name is valid.
 */
export function validateFilename(filename: string, parentFolder: string, repositoryType: RepositoryType): string {
    let errorMessage = FileSpecUtility.getNonLegalNtfsNameErrorMessage(filename);

    if (!errorMessage && repositoryType === RepositoryType.Git) {
        if (filename.toLowerCase() === ".git" && (!parentFolder || parentFolder === gitRootPath)) {
            errorMessage = VCResources.IllegalGitFolder;
        }
    }

    return errorMessage;
}

/**
 * Gets an error message if any subfolder in the given path is invalid, or falsy if it's valid.
 * @param filename The name of the file to validate.
 * @param parentFolder The complete folder that will contain the file. Some names are invalid in nested folders like .git
 * @param repositoryType Type to check if name is valid.
 */
export function validatePartialPath(subfoldersPath: string, parentFolder: string, repositoryType: RepositoryType): string | undefined {
    for (const subfolder of subfoldersPath.split(pathSeparator)) {
        if (!subfolder) {
            return format(VCResources.AddFileDialogSubfolderEmptyError, parentFolder);
        }

        const errorMessage = validateFilename(subfolder, parentFolder, repositoryType);
        if (errorMessage) {
            return errorMessage;
        }

        parentFolder = combinePaths(parentFolder, subfolder);
    }
}

/**
 * 
 * @param folderPath The parent path.
 * @param newItemName The new name for the item.
 * @param placeholderName The name of the subfolder where the new name will be hosted.
 */
export function validateMaxLength(folderPath: string, newItemName: string, placeholderName: string = ""): string {
    const fullPath = combinePaths(folderPath, newItemName, placeholderName);

    if (fullPath.length > maximumPathLength) {
        return format(VCResources.AddFileDialogPathTooLong, maximumPathLength);
    }
}

/**
 * Normalizes the path slashes.
 * @param path The input path
 * @param isGit Whether it's a Git or Tfvc path
 * @param rootPath The root path to use if empty
 */
export function normalizePath(path: string, isGit: boolean, rootPath: string): string {
    if (!path) {
        return rootPath;
    }

    path = path.trim();

    path = path.replace(/[\/\\]+/g, pathSeparator);

    if (path[path.length - 1] === pathSeparator) {
        path = path.substring(0, path.length - 1);
    }

    if (isGit) {
        if (path[0] !== pathSeparator) {
            path = pathSeparator + path;
        }
    } else {
        if (path === "$") {
            path = tfvcRootPath;
        }
    }

    return path;
}

/**
 * Generates the partial path of the new folder(s) to create for the new file.
 * @param newPath The new path to create.
 * @param creatingItemPaths The full paths we know that don't exist in the repo.
 */
export function calculateNewSubfolderPath(newPath: string, creatingItemPaths: string[]): string {
    const folderNames = newPath.split(pathSeparator).slice(1);
    let subfolder = "";

    for (const folderPath of getParentPaths(newPath)) {
        if (creatingItemPaths.indexOf(folderPath) < 0) {
            return subfolder;
        }

        subfolder = combinePaths(getFileName(folderPath), subfolder);
    }
}

/**
 * Adds a trailing slash, only if the path doesn't contain it already.
 */
export function addTrailingSlash(path: string): string {
    return path[path.length - 1] === pathSeparator
        ? path
        : path + pathSeparator;
}
