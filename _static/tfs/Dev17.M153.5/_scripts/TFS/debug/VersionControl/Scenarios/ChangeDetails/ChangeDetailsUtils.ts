import * as Utils_String from "VSS/Utils/String";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";

/**
 * We should react to display mode change only when either old or new display mode is "FilesOnly".
 * That is when we will refresh the right pane since the order in which files have to be displayed will change.
 */
export function shouldReactToDisplayModeChange(oldDisplayMode: ChangeExplorerGridDisplayMode, newDisplayMode: ChangeExplorerGridDisplayMode): boolean {
    if (oldDisplayMode === newDisplayMode) {
        return false;
    }

    return oldDisplayMode === ChangeExplorerGridDisplayMode.FilesOnly || newDisplayMode === ChangeExplorerGridDisplayMode.FilesOnly;
}

/**
 * If @displayMode is FilesOnly, clones the @currentChangeList and filters out folder entries from changes.
 * Otherwise it just returns the @currentChangeList object.
 */
export function getChangeListForDisplayMode(displayMode: ChangeExplorerGridDisplayMode, currentChangeList: VCLegacyContracts.ChangeList): VCLegacyContracts.ChangeList {
    if (currentChangeList && currentChangeList.changes && displayMode === ChangeExplorerGridDisplayMode.FilesOnly) {
        const newChangeList = $.extend(true, {}, currentChangeList);
        newChangeList.changes = newChangeList.changes.filter((change: VCLegacyContracts.Change) => {
            return !(change.item && change.item.isFolder);
        });

        return newChangeList;
    }

    return currentChangeList;
}

/**
 * returns a changelist by removing the Folder items from the changes, if there is a fileitem within these folders.
 */
export function getChangeListWithoutNonEmptyFolders(changeList: VCLegacyContracts.ChangeList): VCLegacyContracts.ChangeList {
    if (changeList && changeList.changes && changeList.changes.length > 0) {
        const changeListItemParentPathsMap: IDictionaryStringTo<boolean> = {};
        const pathSeparator = "/";

        changeList.changes.forEach((change: VCLegacyContracts.Change) => {
            if (change.item && change.item.serverItem) {
                const path = change.item.serverItem;
                changeListItemParentPathsMap[path.substr(0, path.lastIndexOf(pathSeparator))] = true;
            }
        });

        const filteredChanges = changeList.changes.filter(change =>
            !(change.item && change.item.isFolder && changeListItemParentPathsMap[change.item.serverItem])
        );
        
        const changeListWithoutNonEmptyFolders = $.extend({}, changeList);
        changeListWithoutNonEmptyFolders.changes = filteredChanges;

        return changeListWithoutNonEmptyFolders;
    }
    return changeList;
}

/**
 * Try to find a change in a change list with the given path
 * @param changeList ChangeList model
 * @param path Server path of the item to find
 */

export function findChange(changeList: VCLegacyContracts.ChangeList, path: string): VCLegacyContracts.Change {
    let matchingChange: VCLegacyContracts.Change = null;

    if (changeList && changeList.changes) {
        const changesCount = changeList.changes.length;
        for (let i = 0; i < changesCount; i++) {
            if (Utils_String.localeComparer(changeList.changes[i].item.serverItem, path) === 0) {
                matchingChange = changeList.changes[i];
                break;
            }
        }
    }

    return matchingChange;
}

export function isGitCommit(changeList: VCLegacyContracts.ChangeList): boolean {
    return !!changeList && !!(changeList as VCLegacyContracts.GitCommit).commitId;
}

/**
 * Returns the original path if the changeList is Git commit and includes a rename for it, else returns the given path.
 * @param changeList ChangeList model
 * @param path Server path of the item to find
 */
export function getOriginalPath(changeList: VCLegacyContracts.ChangeList, path: string): string {
    const gitCommit: boolean = isGitCommit(changeList);

    if (gitCommit) {
        const change = findChange(changeList, path);
        if (change && ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Rename)) {
            return change.sourceServerItem;
        }
    }
    return path;
}