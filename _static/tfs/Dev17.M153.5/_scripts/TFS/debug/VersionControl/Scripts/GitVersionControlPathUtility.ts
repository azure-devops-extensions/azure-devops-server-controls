import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as VersionControlPathUrl from "VersionControl/Scripts/VersionControlPathUrl";

export class GitVersionControlPathUtility {

    public static combine(path1: string, path2: string): string {

        if (!path1) {
            return path2;
        }

        if (!path2) {
            return path1;
        }

        let basePath = path1;
        let path = path2;

        if (path2.charAt(0) === "/") {

            basePath = "/";
            path = path2.substr(1);
        }

        let directory: string = VersionControlPath.getDirectory(basePath);
        path = VersionControlPathUrl.resolveRelativePath(path, directory);
        return path;
    }
}