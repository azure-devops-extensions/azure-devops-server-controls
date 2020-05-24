import { UserActions } from "Build/Scripts/Constants";
import { IContributionNavigationState } from "Build/Scripts/Linking";

import { RootPath } from "Build.Common/Scripts/Security";

import { logError } from "VSS/Diag";
import { getService as getEventService } from "VSS/Events/Services";
import { HistoryService } from "VSS/Navigation/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IPathData {
    upLevelPath: string;
    currentFolder: string;
}

export function getPathData(path: string): IPathData {
    path = sanitizePath(path);
    let paths = path.split(RootPath);
    return {
        upLevelPath: paths.slice(0, paths.length - 1).join(RootPath) || RootPath,
        currentFolder: paths[paths.length - 1]
    };
}

export function handleFolderNavigation(historyService: HistoryService, path: string) {
    let currentState: IContributionNavigationState = historyService.getCurrentState();
    if (currentState) {
        path = path || RootPath;
        let currentPath = currentState.path || RootPath;
        currentState.path = path;
        if (currentPath != path) {
            historyService.addHistoryPoint(currentState.action, currentState);
        }
        else {
            historyService.replaceHistoryPoint(currentState.action, currentState);
        }
    }
    else {
        logError("Navigation state cannot be null");
    }
}

export function onFolderClick(path: string) {
    getEventService().fire(UserActions.FolderClicked, this, path);
}

export function sanitizePath(path: string) {
    path = path || RootPath;
    // strip off trailing slash if exists
    if (path != RootPath && path[path.length - 1] === RootPath) {
        path = path.slice(0, path.length - 1);
    }
    return path;
}

export function updateChildrenOnParentPathChange(oldParentPath: string, updatedParentPath: string, childPath: string): string {
    const pathSeparator = "\\";
    const oldPathArray: string[] = oldParentPath.split(pathSeparator);
    const childPathArray: string[] = childPath.split(pathSeparator);
    const parentPathArray = childPathArray.slice(0, oldPathArray.length);
    const childPathMinusParentPathArray = childPathArray.slice(oldPathArray.length, childPathArray.length);
    if (Utils_String.ignoreCaseComparer(JSON.stringify(parentPathArray), JSON.stringify(oldPathArray)) === 0) {
        //For delete folder we send updatedParentPath as null
        if (!updatedParentPath) {
            // Return any non null value
            return oldParentPath;
        }
        else {
            let updatedPath: string = updatedParentPath;
            if (childPathMinusParentPathArray.length > 0) {
                updatedPath = updatedPath + pathSeparator + childPathMinusParentPathArray.join(pathSeparator);
            }
            return updatedPath;
        }
    }
    else {
        return Utils_String.empty;
    }
}
