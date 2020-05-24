import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCPullRequest = require("VersionControl/Scripts/TFS.VersionControl.PullRequest");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

export interface IIterationDetail {
    id: number;
    author: VSS_Common_Contracts.IdentityRef;
    createdDate: Date;
    description: string;
    changeCount: number;
}

export interface GitDiffItem {
    oversion: string;
    mversion: string;
    opath: string;
    mpath: string;
    item: ItemModel;
}

export interface ISelectedTreeItem {
    path: string;
    gitDiffItem: GitDiffItem;

    isFile(): boolean;
    isDirectory(): boolean;
    isEdit(): boolean;
    isDelete(): boolean;
}

export interface GitObjectId {
    full: string;
    short: string;
}

export interface ItemModel {
    detailVersion: string;
    objectId: GitObjectId;
    gitObjectType: any;
    serverItem: string;
}

export interface Change {
    changeType: VCContracts.VersionControlChangeType;
    item: ItemModel;
    sourceServerItem: string;
}

export interface ChangeResult {
    change: Change;
    exactMatch?: boolean;
    directoryMatch?: boolean;
}

// this is a slimmed down version of the legacy changeslist
// it also contains all the "hidden" properties needed to implement
// for the change explorer
export interface ChangeList {
    allChangesIncluded: boolean;
    changeCounts: { [key: number]: number; }; // key is really VCContracts.VersionControlChangeType

    // list of all changes
    changes: Change[];
    
    // store the commit refs for the original and modified
    // versions we are comparing
    oversionSpec: string;
    mversionSpec: string;

    // store the current version for legacy changelist operations
    version: string;

    // a ref back to the common commit id
    commonCommitId: GitObjectId;

    // covert back to legacy (this is just a cast)
    legacyChangeList(): VCLegacyContracts.ChangeList;
}

/**
 * Helps us calculate the selected item by taking branch status and path selection into account.
 */
export class SelectedTreeItem implements ISelectedTreeItem {
    public path: string;
    public gitDiffItem: GitDiffItem;
    public changeResult: ChangeResult;

    constructor(branchStatus: VCPullRequest.IPullRequestBranchStatus, changeList: ChangeList, path: string) {
        this.path = path;
        this.changeResult = ChangeListUtils.getChangeFromChangeList(path, changeList);
        this.gitDiffItem = SelectedTreeItem._findSelectedDiff(branchStatus, this.changeResult.change, changeList, path);
    }

    public getChangeType(): VCContracts.VersionControlChangeType {
        if (!(this.changeResult.change && this.changeResult.change.changeType)) {
            return VCContracts.VersionControlChangeType.None;
        }

        return this.changeResult.change.changeType;
    }

    public isDelete(): boolean {
        return ChangeListUtils.isChangeDelete(this.changeResult.change);
    }

    public isDirectory(): boolean {
        return !this.changeResult.exactMatch && this.changeResult.directoryMatch;
    }

    public isFile(): boolean {
        return Boolean(this.changeResult.exactMatch);
    }

    public isEdit(): boolean {
        if (!this.changeResult.change) {
            return false;
        }

        return VCOM.ChangeType.isEdit(<VCLegacyContracts.VersionControlChangeType><number>this.changeResult.change.changeType);
    }

    private static _findSelectedDiff(branchStatus: VCPullRequest.IPullRequestBranchStatus, change: Change, changeList: ChangeList, path: string): GitDiffItem {
        const oversion: string = (changeList && changeList.oversionSpec) || (branchStatus && branchStatus.targetVersionSpec);
        const mversion: string = (changeList && changeList.mversionSpec) || (branchStatus && branchStatus.sourceVersionSpec);

        if (!oversion && !mversion) {
            return null;
        }

        return ChangeListUtils.getDiffItem(path, oversion, mversion, change);
    }
}

export class Transformer {
    /**
     * Converts the existing iterations into a slimmed down detail interface.
     */
    public static convertIteration(iteration: VCContracts.GitPullRequestIteration): IIterationDetail {
        if (!iteration) {
            return null;
        }

        const iterationDetail: IIterationDetail = {
            id: iteration.id,
            createdDate: iteration.createdDate,
            description: iteration.description,
            changeCount: iteration.changeList ? iteration.changeList.length : 0,
            author: iteration.author
        };

        return iterationDetail;
    }

    /**
     * Converts the existing code review/change data into a legacy change set
     * so we can pass it into the file explorer.
     */
    public static convertChanges(
        iterationChanges: VCContracts.GitPullRequestIterationChanges,
        iteration: VCContracts.GitPullRequestIteration,
        base?: VCContracts.GitPullRequestIteration,
        allChangesIncluded: boolean = true): ChangeList {

        if (!iteration || !iterationChanges) {
            // nothing came back in our iteration
            return {
                allChangesIncluded: true,
                changeCounts: {},
                changes: [],
                commonCommitId: {
                    full: null,
                    short: null
                },
                mversionSpec: null,
                oversionSpec: null,
                version: null,
                legacyChangeList: () => {
                    return null;
                }
            };
        }
        
        // pieces we need to create the object
        let adds = 0;
        let deletes = 0;
        let edits = 0;
        let renames = 0;
        const changes: Change[] = [];

        const sourceCommitId = iteration.sourceRefCommit.commitId;
        let targetCommitId = iteration.targetRefCommit.commitId;

        // an older version of the server would store iterations without a common commit
        // when the source and target commit were the same, handle old, bad data here
        let commonCommitId = targetCommitId;
        if (iteration.commonRefCommit) {
            commonCommitId = iteration.commonRefCommit.commitId;
        }

        // if a base iteration to compare was supplied, use it as the target/common
        if (base) {
            targetCommitId = base.sourceRefCommit.commitId;
            commonCommitId = targetCommitId;
        }

        // convert found full commit ids to short ids and version strings
        const sourceCommitVersion = new VCSpecs.GitCommitVersionSpec(sourceCommitId).toVersionString();
        const targetCommitVersion = new VCSpecs.GitCommitVersionSpec(targetCommitId).toVersionString();
        const commonCommitVersion = new VCSpecs.GitCommitVersionSpec(commonCommitId).toVersionString();

        const shortSourceCommitId = sourceCommitId.substring(0, 8);
        const shortTargetCommitId = targetCommitId.substring(0, 8);
        const shortCommonCommitId = commonCommitId.substring(0, 8);

        // count each type of change in the list
        iterationChanges.changeEntries.forEach(change => {
            let changeType = VCContracts.VersionControlChangeType.None;
            let path = "";
            let originalPath = change.originalPath;
            let version: string = null;

            // first, determine change type
            if (change.changeType & VCContracts.VersionControlChangeType.Add) {
                changeType = changeType | VCContracts.VersionControlChangeType.Add;
                path = change.item.path;
                version = sourceCommitVersion;
                adds++;
            }

            if (change.changeType & VCContracts.VersionControlChangeType.Edit) {
                changeType = changeType | VCContracts.VersionControlChangeType.Edit;
                path = change.item.path;
                //change.originalPath is not set with edits, it is set if it is an edit and rename
                if (!originalPath) {
                    originalPath = change.item.path;
                }
                version = sourceCommitVersion;
                edits++;
            }

            if (change.changeType & VCContracts.VersionControlChangeType.Rename) {
                changeType = changeType | VCContracts.VersionControlChangeType.Rename;
                path = change.item.path;
                version = sourceCommitVersion;
                renames++;
            }

            if (change.changeType & VCContracts.VersionControlChangeType.Delete) {
                changeType = changeType | VCContracts.VersionControlChangeType.Delete;
                path = change.originalPath;
                version = commonCommitVersion;
                deletes++;
            }

            // now convert each change
            const legacyChange: Change = {
                changeType: changeType,
                sourceServerItem: originalPath,
                item: {
                    serverItem: path,
                    gitObjectType: VCLegacyContracts.GitObjectType.Blob,
                    objectId: {
                        full: sourceCommitId,
                        short: shortSourceCommitId
                    },
                    detailVersion: version
                }
            };

            changes.push(legacyChange);
        });
  
        // create the changecount based on our stats
        const changeCounts: { [key: number]: number } = {};

        if (adds > 0) {
            changeCounts[<number>VCContracts.VersionControlChangeType.Add] = adds;
        }

        if (deletes > 0) {
            changeCounts[<number>VCContracts.VersionControlChangeType.Delete] = deletes;
        }

        if (edits > 0) {
            changeCounts[<number>VCContracts.VersionControlChangeType.Edit] = edits;
        }

        if (renames > 0) {
            changeCounts[<number>VCContracts.VersionControlChangeType.Rename] = renames;
        }

        const changeList: ChangeList = {
            allChangesIncluded: allChangesIncluded,
            changeCounts: changeCounts,
            changes: changes,
            commonCommitId: {
                full: commonCommitId,
                short: shortCommonCommitId
            },
            mversionSpec: new VCSpecs.GitCommitVersionSpec(sourceCommitId).toVersionString(),
            oversionSpec: new VCSpecs.GitCommitVersionSpec(commonCommitId).toVersionString(),
            version: new VCSpecs.GitCommitVersionSpec(sourceCommitId).toVersionString(),
            legacyChangeList: () => {
                return <VCLegacyContracts.ChangeList><any>changeList;
            }
        };

        return changeList;
    }
}

export module ChangeListUtils {

    export function getDiffItem(path: string, oversion: string, mversion: string, change: Change): GitDiffItem {
        // start by assuming this is a folder
        const diff: GitDiffItem = {
            oversion: oversion,
            mversion: mversion,
            opath: null,
            mpath: path,
            item: (change && change.item) || null
        };

        // if this is a folder, just go with the default differences between the commits
        if (!change || !change.item || !(change.item.gitObjectType == VCOM.GitObjectType.Blob || change.item.gitObjectType == VCOM.GitObjectType.Commit)) {
            return diff;
        }

        // deletes don't have an mpath b/c the file is gone
        diff.mpath = ChangeListUtils.isChangeDelete(change) ? null : change.item.serverItem;
        diff.opath = change.sourceServerItem;

        return diff;
    }

    export function getChangeFromChangeList(path: string, changeList: ChangeList): ChangeResult {
        const changeResult: ChangeResult = { 
            change: null, 
            exactMatch: false, 
            directoryMatch: false,
        };

        if (!path || !changeList) {
            return (!path && { ...changeResult, directoryMatch: true }) || changeResult;
        }

        changeList.changes && changeList.changes.some(change => {
            const pathMatchesOriginal = (change && change.sourceServerItem && change.sourceServerItem === path);
            const pathMatchesModified = (change && change.item && change.item.serverItem === path);

            const pathInOriginal = !pathMatchesOriginal && (change && change.sourceServerItem && change.sourceServerItem.lastIndexOf(path, 0) === 0);
            const pathInModified = !pathMatchesModified && (change && change.item && change.item.serverItem.lastIndexOf(path, 0) === 0);

            changeResult.directoryMatch = changeResult.directoryMatch || pathInOriginal || pathInModified;

            // current change is a match if the modified file name matches the provided path
            // if the change is a rename, there is also a match if the base file name matches the path
            if (pathMatchesModified || (pathMatchesOriginal && ChangeListUtils.isChangeRename(change))) {
                changeResult.exactMatch = true;
                changeResult.change = change;
                return true;
            }
        });

        return changeResult;
    }

    export function isPathInChangeList(path: string, changeList: ChangeList, matchPartial: boolean = true): boolean {
        const changeResult: ChangeResult = getChangeFromChangeList(path, changeList);
        return changeResult.exactMatch || (matchPartial && changeResult.directoryMatch);
    }

    export function isChangeAdd(change: Change): boolean {
        return isChangeOfType(change, VCLegacyContracts.VersionControlChangeType.Add);
    }

    export function isChangeDelete(change: Change): boolean {
        return isChangeOfType(change, VCLegacyContracts.VersionControlChangeType.Delete);
    }

    export function isChangeRename(change: Change): boolean {
        return isChangeOfType(change, VCLegacyContracts.VersionControlChangeType.Rename);
    }

    export function isChangeOfType(change: Change, changeType: VCLegacyContracts.VersionControlChangeType): boolean {
        return !!change && VCOM.ChangeType.hasChangeFlag(<VCLegacyContracts.VersionControlChangeType><number>change.changeType, changeType);
    }
}