import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PathSeparator, TfvcRootPath, GitRootPath } from "Search/Scenarios/Code/Constants";
import { areFiltersEqual } from "Search/Scenarios/Shared/Utils";
import { CodeResult, VersionControlType, SearchQuery } from "Search/Scenarios/WebApi/Code.Contracts";
import { ignoreCaseComparer } from "VSS/Utils/String";

export function isVCType(itemType: VersionControlType): boolean {
    return isGitType(itemType) || isTfvcType(itemType);
}

export function isGitType(itemType: VersionControlType): boolean {
    return ignoreCaseComparer(itemType.toString(), VersionControlType[VersionControlType.Git].toString()) === 0 || itemType === VersionControlType.Git;
}

export function isTfvcType(itemType: VersionControlType): boolean {
    return ignoreCaseComparer(itemType.toString(), VersionControlType[VersionControlType.Tfvc].toString()) === 0 || itemType === VersionControlType.Tfvc;
}

export function constructLinkToContent(item: CodeResult): string {
    let fileLink: string;
    const { project, path, repository, branch } = item;

    // ToDo: Need to see if this violates search across collection scenarios.
    const tfsContext = TfsContext.getDefault();

    if (isTfvcType(item.vcType)) {
        fileLink = tfsContext.navigation.serviceHost.uri
            + encodeURIComponent(project) + "/_versionControl" + "#path="
            + encodeURIComponent(path.split("\\").join("/")) + "&version="
            + encodeURIComponent("T") + "&_a=contents";
    } else if (isGitType(item.vcType)) {
        fileLink = tfsContext.navigation.serviceHost.uri
            + encodeURIComponent(project) + "/_git/"
            + encodeURIComponent(repository) + "#path="
            + encodeURIComponent(path.split("\\").join("/")) + "&version="
            + encodeURIComponent(`GB${branch}`) + "&_a=contents";
    }

    return fileLink;
}

export function getItemResultKey(item: CodeResult): string {
    if (!item) {
        return;
    }

    let identifier: string;
    if (isTfvcType(item.vcType)) {
        identifier = `${item.collection}/${item.project}/${item.repository}/${item.changeId}/${item.path}`;
    }
    else {
        identifier = `${item.collection}/${item.project}/${item.repository}/GB${item.branch}/${item.path}`;
    }

    return identifier;
}

export function areQueriesEqual(left: SearchQuery, right: SearchQuery): boolean {
    if (left.searchText !== right.searchText) {
        return false;
    }

    if (left.takeResults !== right.takeResults) {
        return false;
    }

    return areFiltersEqual(left.searchFilters, right.searchFilters);
}

/**
 * Normalizes the path slashes.
 * @param path The input path
 * @param isGit Whether it's a Git or Tfvc path
 * @param rootPath The root path to use if empty
 * Copied from /Tfs/Service/WebAccess/VersionControl/Scripts/VersionControlPath.ts
 */
export function normalizePath(path: string, isGit: boolean, rootPath: string): string {
    if (!path) {
        return rootPath;
    }

    let normalizedPath = path.trim();

    normalizedPath = normalizedPath.replace(/[\/\\]+/g, PathSeparator);

    if (normalizedPath[normalizedPath.length - 1] === PathSeparator) {
        normalizedPath = normalizedPath.substring(0, normalizedPath.length - 1);
    }

    if (isGit) {
        if (normalizedPath[0] !== PathSeparator) {
            normalizedPath = PathSeparator + normalizedPath;
        }
    } else {
        if (normalizedPath === "$") {
            normalizedPath = TfvcRootPath;
        }
    }

    return normalizedPath;
}

export function isGitRepo(repoName: string): boolean {
    return repoName.indexOf(TfvcRootPath) < 0;
}

/**
 * Gets the containing directory of the last path component.
 * @param path The path
 * @returns Path characters up to the last slash.
 *          The trailing slash is included if the result is the root directory ("/" or "$/").
 *          Otherwise, the trailing slash is not included.
 *          Empty string if the path contains no slash.
 * Copied from : /Tfs/Service/WebAccess/VersionControl/Scripts/VersionControlPath.ts
 */
function getFolderName(path: string) {
    let pos: number;
    let folder: string;

    if (path) {
        pos = path.lastIndexOf(PathSeparator);
        if (pos >= 0) {
            folder = path.substr(0, pos);

            // Always include a '/' for the root folder
            if (folder === "$") {
                return TfvcRootPath;
            }
            else if (folder === "") {
                return GitRootPath;
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
 * Copied from /Tfs/Service/WebAccess/VersionControl/Scripts/VersionControlPath.ts
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

export function getFileExtension(path: string) {
    let extension = "";
    const dotIndex = (path || "").lastIndexOf(".");

    if (dotIndex >= 0) {
        extension = path.substring(dotIndex + 1);
    }
    return extension;
}
