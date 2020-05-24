
import Diag = require("VSS/Diag");

var defaultPathSeparator = '/';

/**
* File encoding values.
*/
export enum FileEncoding {
    Unknown,
    Binary,
    ASCII,
    UTF8,
    UTF32_BE,
    UTF32_LE,
    UTF16_BE,
    UTF16_LE
}

/*
* Make a best-effort attempt to determine the file encoding for the given base64 encoded file contents
*
* @param base64Content Base64 encoded string of the file contents
*/
export function tryDetectFileEncoding(base64Content: string) {

    if (typeof window.atob === "undefined") {
        return FileEncoding.Unknown;
    }

    var decodedContent = window.atob(base64Content);

    // Read the byte order mark
    var bom: number[] = [];
    for (var i = 0; i < 4; i++) {
        bom.push(decodedContent.charCodeAt(i));
    }

    if (bom[0] === 0xFE && bom[1] === 0xFF) {
        return FileEncoding.UTF16_BE;
    }
    else if (bom[0] === 0xFF && bom[1] === 0xFE) {
        if (bom[2] === 0x00 && bom[3] === 0x00) {
            return FileEncoding.UTF32_LE;
        }
        else {
            return FileEncoding.UTF16_LE;
        }
    }
    else if (bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF) {
        return FileEncoding.UTF8;
    }
    else if (bom[0] === 0x00 && bom[1] === 0x00 && bom[2] === 0xFE && bom[3] === 0xFF) {
        return FileEncoding.UTF32_BE;
    }

    var isAscii = true;

    // Check for binary files
    for (var i = 0, l = decodedContent.length; i < l; i++) {
        var charCode = decodedContent.charCodeAt(i);

        // If buffer[i] is 0-0x1F OR 0x7F but not (TAB, CR, LF, FF, or ^Z)
        // then the file is a binary file.
        if ((charCode <= 0x1F || charCode == 0x7F) &&
            (charCode != 0x9 && charCode != 0xC && charCode != 0xD && charCode != 0xA && charCode != 0x1A)) {
            return FileEncoding.Binary;
        }
        else if (charCode > 0x7F) {
            isAscii = false;
        }
    }

    if (isAscii) {
        return FileEncoding.ASCII;
    }

    // Treat non-binary files without an explicit BOM as UTF8
    return FileEncoding.UTF8;
}


/**
* Combine 2 path segments using the given separator ("/" is the default)
*
* @param path1 First path segment
* @param path2 Second path segment
* @param pathSeparator Optional path separator ("/" is the default)
* @return combined string
*/
export function combinePaths(path1: string, path2: string, pathSeparator: string = defaultPathSeparator): string {
    var combinedPath = path1 || "";

    if (path2) {
        combinedPath = ensureTrailingSeparator(combinedPath, pathSeparator);

        if (path2.substr(0, pathSeparator.length) === pathSeparator) {
            combinedPath += path2.substr(pathSeparator.length);
        }
        else {
            combinedPath += path2;
        }
    }

    return combinedPath;
}

/**
* Ensure that the given path ends with a separator. If not, add the separator to the end.
*
* @param path Path to verify
* @param pathSeparator Optional path separator ("/" is the default)
* @return resulting string that ends with the separator
*/
export function ensureTrailingSeparator(path: string, pathSeparator: string = defaultPathSeparator): string {
    if (!path) {
        return pathSeparator;
    }
    if (path.substr(path.length - pathSeparator.length) === pathSeparator) {
        return path;
    }
    else {
        return path + pathSeparator;
    }
}

/**
 * Get parts of a path.
 *
 * @param path Path to extract parts.
 * @param pathSeparator Path separator (default '/').
 */

export function getPathParts(path: string, pathSeparator: string = defaultPathSeparator): string[] {
    let parts: string[] = [];
    if (path) {
        parts = path.split(pathSeparator);
    }

    let valid = parts.length > 0 && parts.every(s => !!s);
    if (!valid) {
        return null;
    }

    return parts;
}

export function getRootDirectory(path: string, pathSeparator: string = defaultPathSeparator): string {
    const parts = getPathParts(path, pathSeparator);
    return parts ? parts[0] : null;
}

/**
 * Gets the directory part of the specified path.
 *
 * @param path Path to extract directory name.
 * @param pathSeparator Path separator (default '/').
 * @returns {string}
 */
export function getDirectoryName(path: string, pathSeparator: string = defaultPathSeparator): string {
    let parts = getPathParts(path, pathSeparator);
    return parts ? parts.slice(0, parts.length - 1).join(pathSeparator) : null;
}

/**
 * Gets the filename part of the specified path.
 *
 * @param path Path to extract file name.
 * @param pathSeparator Path separator (default '/').
 * @returns {string}
 */
export function getFileName(path: string, pathSeparator: string = defaultPathSeparator): string {
    let parts = getPathParts(path, pathSeparator);
    return parts ? parts[parts.length - 1] : null;
}

/**
 * Normalize a path by using correct slash characters, removing duplicate slashes, and trimming trailing slashes
 * @param path The path to normalize
 * @param useBackslash Normalize to a backslash path if true. @default false
 */
export function normalizePath(path: string, useBackslash: boolean = false): string {
    if (path) {
        if (useBackslash) {
            return path.replace(/\//g, "\\").replace(/[\\]+/g, "\\").replace(/\\+$/, "");
        } else {
            return path.replace(/\\/g, "/").replace(/[\/]+/g, "/").replace(/\/+$/, "");
        }
    }

    return path;
}