import { TfvcConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import { MappingDetails } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface ITfvcMappingItem {
    mapping: MappingDetails;
    index: number;
    isDeleted: boolean;
    displayedLocalPath: string;
    selectedFromPicker?: boolean;
}

/**
 * @brief Helper for tfvc path mapping
 */
export class TfvcMappingHelper {

    public getMappingsEligibleForGeneration(mappings: ITfvcMappingItem[]): ITfvcMappingItem[] {
        let existingMappings: ITfvcMappingItem[] = [];
        let eligibleMappings: ITfvcMappingItem[] = [];
        let serverPaths: string[] = [];
        mappings.forEach((value, index, array) => {
            // exclude cloaks
            if (value.mapping.mappingType === TfvcConstants.MappingType_Map) {
                if (!(Utils_String.ignoreCaseComparer(value.mapping.serverPath, Utils_String.empty) === 0)) {

                    serverPaths.push(value.mapping.serverPath);
                    existingMappings.push(value);
                }
                else {
                    // empty paths should attempt to be generated
                    eligibleMappings.push(value);
                }
            }
        });

        // generate local mappings without new value so we can figure out which paths are generated vs. manually input
        let generatedLocalPaths = this.calculateLocalMappings(serverPaths);

        existingMappings.forEach((value, index, array) => {
            let localPathValue = value.displayedLocalPath.trim();

            // if local paths were previously generated and not manually input, add them for regeneration
            if (Utils_String.ignoreCaseComparer(localPathValue, generatedLocalPaths[index].trim()) === 0) {
                eligibleMappings.push(value);
            }
        });

        return eligibleMappings;
    }

    public generateLocalMappings(mappings: ITfvcMappingItem[]) {
        let existingMappings: ITfvcMappingItem[] = [];
        let serverPaths: string[] = [];
        mappings.forEach((value, index, array) => {
            // don't use empty server paths
            if (!(Utils_String.ignoreCaseComparer(value.mapping.serverPath, Utils_String.empty) === 0)) {
                serverPaths.push(value.mapping.serverPath);
                existingMappings.push(value);
            }
        });

        let generatedLocalPaths = this.calculateLocalMappings(serverPaths);

        // set local paths
        existingMappings.forEach((value, index, array) => {
            value.displayedLocalPath = generatedLocalPaths[index];
            value.mapping.localPath = "\\" + value.displayedLocalPath;
        });
    }

    public convertServerPathToLocal(serverPath: string): string {
        if (!serverPath || Utils_String.equals(serverPath.trim(), Utils_String.empty)) {
            // empty path for null/empty
            return Utils_String.empty;
        }

        // remove the "$" from the server path
        if (serverPath.length > 1 && Utils_String.equals(serverPath.substr(0, 2), TfvcConstants.DefaultTfvcPrefix, true)) {
            serverPath = serverPath.substr(1);
        }

        // swap / for \
        return serverPath.replace(/\//g, "\\");
    }

    public calculateLocalMappings(serverPaths: string[]): string[] {
        let commonPath = this._getCommonServerPath(serverPaths);
        commonPath = commonPath.replace(TfvcConstants.DefaultTfvcPrefix, "\\").replace(/\//g, "\\");

        let localPaths: string[] = [];
        serverPaths.forEach((path) => {
            let localPath = this.convertServerPathToLocal(path)
                .replace(commonPath, Utils_String.empty)
                .replace(/\//g, "\\");

            // when the entire path is the same as the common path, represent with \
            if (localPath.length === 0) {
                localPath = "\\";
            }

            localPaths.push(this.convertLocalPathToDisplay(localPath));
        });

        return localPaths;
    }

    public convertLocalPathToDisplay(localPath: string): string {
        if (localPath && localPath.length > 0 && localPath.charAt(0) === "\\") {
            return localPath.substr(1);
        }

        return localPath;
    }

    public getCleanTfvcPath(str: string): string {
        if (!str) {
            return str;
        }
        let rtn = str.trim().replace(/\/+$/, Utils_String.empty).replace(/\\+$/, Utils_String.empty);
        let lastChar = str.substr(str.length - 1);
        // remove trailing chars until there are no more
        while (lastChar === "/" ||
            lastChar === " ") {
            rtn = str.trim().replace(/\/+$/, Utils_String.empty).replace(/\\+$/, Utils_String.empty);
            lastChar = rtn.length > 0 ? rtn.substr(str.length - 1) : Utils_String.empty;
        }

        return rtn;
    }

    public static GetMappingTypeColumnHeader(): string {
        return Resources.TypeText;
    }

    public static GetServerPathColumnHeader(): string {
        return Resources.ServerPathText;
    }

    public static GetLocalPathColumnHeader(): string {
        return Resources.LocalPathLabel;
    }

    private _getCommonServerPath(serverItems: string[]): string {
        if (!serverItems ||
            serverItems.length === 0) {
            return "/";
        }

        let root = serverItems[0];
        for (let i = 1; i < serverItems.length; i++) {
            root = this._getCommonPath(root, serverItems[i]);
            if (!root || Utils_String.equals(root, Utils_String.empty)) {
                return TfvcConstants.DefaultTfvcPrefix;
            }
        }

        return root;
    }

    private _getCommonPath(path1: string, path2: string): string {
        let commonPath: string[] = [];

        let path1Parts = path1.split("/");
        let path2Parts = path2.split("/");
        let shorterPathLength = Math.min(path1Parts.length, path2Parts.length);

        for (let i = 0; i < shorterPathLength; i++) {
            if (!Utils_String.equals(path1Parts[i], path2Parts[i], true)) {
                break;
            }

            commonPath.push(path1Parts[i]);
        }

        return commonPath.join("/");
    }
}
