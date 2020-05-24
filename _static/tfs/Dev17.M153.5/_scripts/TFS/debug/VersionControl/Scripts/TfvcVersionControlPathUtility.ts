import * as VersionControlPathUrl from "VersionControl/Scripts/VersionControlPathUrl";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import {TfvcVersionControlPath} from "VersionControl/Scripts/TfvcVersionControlPath";

export class TfvcVersionControlPathUtility {

    public static isAbsolutePath(path: string): boolean {
        if (typeof path === "undefined" || path === null) {
            throw new Error("path parameter is required");
        }
        return path.length >= 2 && path.substr(0, 2) == "$/";
    }

    public static getProjectRelativePathFromAbsolutePath(path: string): string {
        if (typeof path === "undefined" || path == null) {
            throw new Error("path parameter is required");
        }
        if (!TfvcVersionControlPathUtility.isAbsolutePath(path)) {
            throw new Error("path parameter must be an absolute path");
        }
        let segments = path.split("/");
        if (segments.length < 2 || segments[1] === "") {
            throw new Error("path should be of the form '$/[project][/...]'");
        }
        let relativePathSegments = segments.slice(2, segments.length);
        if (relativePathSegments.length === 0 || relativePathSegments[0] === "") {
            return "";
        } else {
            return relativePathSegments.join("/");
        }
    }

    public static combine(path1: string, path2: string): string {

        if (!path1) {
            return path2;
        }

        if (!path2) {
            return path1;
        }

        let tfvcPath1: TfvcVersionControlPath = new TfvcVersionControlPath(path1);
        if (!tfvcPath1.getIsValid()) {
            throw new Error(path1 + " is not a valid TfVC path.");
        }

        let root: string = tfvcPath1.getProjectRoot();

        let basePath = VersionControlPathUrl.resolveRelativePath(tfvcPath1.getRelativePath(), "/");
        let path = path2;

        let tfvcPath2: TfvcVersionControlPath = new TfvcVersionControlPath(path2);
        // if path is root, return it as-is
        if (tfvcPath2.getIsValid()) {
            if (!tfvcPath2.getRelativePath()) {
                return path2;
            }
            else {
                root = tfvcPath2.getProjectRoot();
                basePath = "/";
                path = tfvcPath2.getRelativePath();
            }
        }
        else if (path2.charAt(0) === '/') {
            basePath = "/";
            path = path2.substr(1);
        }

        let directory: string = VersionControlPath.getDirectory(basePath);
        path = VersionControlPathUrl.resolveRelativePath(path, directory);
        let fullPath = root + path;
        return fullPath;
    }
}