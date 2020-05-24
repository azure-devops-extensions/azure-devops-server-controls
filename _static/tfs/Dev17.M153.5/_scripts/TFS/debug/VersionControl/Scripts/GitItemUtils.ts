import * as VCContracts from "TFS/VersionControl/Contracts";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {GitClientService} from "VersionControl/Scripts/GitClientService";
import {IVersionControlClientService} from "VersionControl/Scripts/IVersionControlClientService";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import * as Utils_String from "VSS/Utils/String";

export function gitItemToLegacyGitItem(item: VCContracts.GitItem, version: string): VCLegacyContracts.GitItem {
    return <VCLegacyContracts.GitItem>{
        isSymLink: item.isSymLink,
        isFolder: item.isFolder,
        serverItem: item.path,
        version: version,
        contentMetadata: item.contentMetadata,
        gitObjectType: this._newToLegacyGitObjectType(item.gitObjectType),
        commitId: this._toGitObjectId(item.commitId),
        objectId: this._toGitObjectId(item.objectId),
        changeDate: null,
        childItems: null,
        versionDescription: null,
        url: null
    };
}

export function gitItemArrayToLegacyGitItem(itemArray: VCContracts.GitItem[], version: string, versionDescriptor: any, combineNestedEmptyFolders?: boolean) {
    combineNestedEmptyFolders = combineNestedEmptyFolders || false;

    let rootItem: VCContracts.GitItem = itemArray[0];
    let gitItem = this.gitItemToLegacyGitItem(rootItem, version);

    gitItem.childItems = [];
    gitItem.versionDescription = this._getGitItemVersionDescription(rootItem, versionDescriptor);

    if (!combineNestedEmptyFolders) {
        for (let i = 1; i < itemArray.length; i++) {
            gitItem.childItems.push(this.gitItemToLegacyGitItem(itemArray[i], version));
        }
    } else {
        let combinedItems: VCContracts.GitItem[] = _combineNestedEmptyFolders(itemArray.slice(1));
        for (let i = 0; i < combinedItems.length; i++) {
            gitItem.childItems.push(this.gitItemToLegacyGitItem(combinedItems[i], version));
        }
    }

    return gitItem;
}

export function simpleGitCommitRefToLegacyChangeList(commit: VCContracts.GitCommitRef): VCLegacyContracts.ChangeList {
    return this.getLegacyChangeListFromGitCommitRefAndVersion(commit, commit.commitId);
}

export function gitCommitRefToLegacyChangeList(commit: VCContracts.GitCommitRef): VCLegacyContracts.ChangeList {
    const commitVersion: string = "GC" + commit.commitId;
    return this.getLegacyChangeListFromGitCommitRefAndVersion(commit, commitVersion);
}

export function getLegacyChangeListFromGitCommitRefAndVersion(commit: VCContracts.GitCommitRef, commitVersion: string): VCLegacyContracts.ChangeList {
    const changeList = <VCLegacyContracts.ChangeList> {
            changes: commit.changes ? this.gitChangesToLegacyChanges(commit.changes, commitVersion) : undefined,
            comment: commit.comment,
            commentTruncated: commit.commentTruncated,
            owner: commit.author.name,
            ownerDisplayName: commit.author.email
                ? Utils_String.format(VCResources.CommitOwnerDisplayNameFormat, commit.author.name, commit.author.email)
                : commit.author.name,
            sortDate: commit.committer.date,
            creationDate: commit.author.date,
            changeCounts: <{ [key: number]: number; }>commit.changeCounts,
            version: commitVersion,
        };

    /* Part of code to include Legacy GitCommit params
     * To be used by typecasting Legacy changeList to GitCommit
     */
    $.extend(changeList, {
        author: {
            id: commit.author.email,
            displayName: commit.author.name,
            date: commit.author.date,
            imageUrl: commit.author.imageUrl
        },
        committer: {
            id: commit.committer.email,
            displayName: commit.committer.name,
            date: commit.committer.date,
            imageUrl: commit.committer.imageUrl
        },
        commitId: {
            full: commit.commitId,
            short: CommitIdHelper.getShortCommitId(commit.commitId)
        },
        commitTime: commit.committer.date,
        parents: $.map(commit.parents || [], (parentCommitId: string) => {
            return {
                objectId: {
                    full: parentCommitId,
                    short: CommitIdHelper.getShortCommitId(parentCommitId)
                }
            };
        })
    });

    /*
     * If received commit is of type GitCommit instead of GitCommitRef
     * Need to intialize push details as part of that as well
     */
    const gitCommit = commit as VCContracts.GitCommit;
    if (gitCommit.push) {
        $.extend(changeList, {
            pushCorrelationId: gitCommit.push.pushCorrelationId,
            pusher: gitCommit.push.pushedBy ? gitCommit.push.pushedBy.displayName : null,
            pushId: gitCommit.push.pushId,
            pushTime: gitCommit.push.date
        });
    }

    return changeList;
}

export function gitItemToLegacyItemModel(gitItem: VCContracts.ItemModel, version: string): VCLegacyContracts.ItemModel {
    return <VCLegacyContracts.ItemModel>{
        changeDate: null,
        childItems: null,
        contentMetadata: gitItem.contentMetadata,
        isFolder: gitItem.isFolder,
        isSymLink: gitItem.isSymLink,
        serverItem: gitItem.path,
        version: version,
        versionDescription: null,
        url: gitItem.url
    };
}

export function gitChangesToLegacyChanges(changes: VCContracts.GitChange[], version: string): VCLegacyContracts.Change[] {
    return <VCLegacyContracts.Change[]>$.map(changes || [], (change: VCContracts.GitChange) => {
        return {
            changeType: change.changeType,
            sourceServerItem: change.sourceServerItem,
            item: change.item ? this.gitItemToLegacyItemModel(change.item, version) : null
        };
    });
}

export function _combineNestedEmptyFolders(allItems: VCContracts.GitItem[]): VCContracts.GitItem[] {
    let mappedToParent: boolean = false;
    let combinedItems: VCContracts.GitItem[] = [];

    for (let i = 0; i < allItems.length; i++) {

        // Skip files (only combine folders)
        if (!allItems[i].isFolder) {
            combinedItems.push(allItems[i]);
            continue;
        }

        // Find any previously-encountered folder that is a parent of this folder
        mappedToParent = false;
        for (let findIndex = 0; findIndex < combinedItems.length; findIndex++) {
            if (!combinedItems[findIndex].isFolder) {
                continue;
            }
            if (Utils_String.startsWith(allItems[i].path, combinedItems[findIndex].path + '/', Utils_String.defaultComparer)) {
                // Replace the parent folder entry (/src) with the child folder (/src/com)
                combinedItems[findIndex] = allItems[i];
                mappedToParent = true;
                break;
            }
        }

        // If no previously-encountered folder was found that is a parent of this folder,
        // add this folder as a new entry
        if (mappedToParent === false) {
            combinedItems.push(allItems[i]);
        }
    }

    return combinedItems;
}

export function _getGitItemVersionDescription(rootItem: VCContracts.GitItem, defaultDescriptor: any) {
    let versionDescription = (defaultDescriptor) ? defaultDescriptor.version : null;

    if (rootItem && rootItem.commitId) {
        versionDescription = rootItem.commitId;
    }

    return (versionDescription) ? Utils_String.format(VCResources.CommitDescriptionFormat, CommitIdHelper.getShortCommitId(versionDescription)) : null;
}

export function _toGitObjectId(id: string): VCLegacyContracts.GitObjectId {
    return {
        full: id,
        short: CommitIdHelper.getShortCommitId(id)
    };
}

export function _newToLegacyGitObjectType(newValue: VCContracts.GitObjectType): VCLegacyContracts.GitObjectType {
    switch (newValue) {
        case VCContracts.GitObjectType.Bad:
            return VCLegacyContracts.GitObjectType.Bad;
        case VCContracts.GitObjectType.Blob:
            return VCLegacyContracts.GitObjectType.Blob;
        case VCContracts.GitObjectType.Commit:
            return VCLegacyContracts.GitObjectType.Commit;
        case VCContracts.GitObjectType.Ext2:
            return VCLegacyContracts.GitObjectType.Ext2;
        case VCContracts.GitObjectType.OfsDelta:
            return VCLegacyContracts.GitObjectType.OfsDelta;
        case VCContracts.GitObjectType.RefDelta:
            return VCLegacyContracts.GitObjectType.RefDelta;
        case VCContracts.GitObjectType.Tag:
            return VCLegacyContracts.GitObjectType.Tag;
        case VCContracts.GitObjectType.Tree:
            return VCLegacyContracts.GitObjectType.Tree;
    }
}
