/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\sourcecontrol\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

export interface AssociatedWorkItem {
    assignedTo: string;
    id: number;
    state: string;
    title: string;
    workItemType: string;
}

export interface AuthorCounts {
    changeListsCount: number;
    lastChangeDate: Date;
    user: TeamIdentityReference;
}

export interface Change extends Entity {
    changeType: VersionControlChangeType;
    item: ItemModel;
    sourceServerItem: string;
}

export interface ChangeList extends Entity {
    allChangesIncluded: boolean;
    changeCounts: { [key: number] : number; };
    changes: Change[];
    comment: string;
    commentTruncated: boolean;
    creationDate: Date;
    notes: CheckinNote[];
    owner: string;
    ownerDisplayName: string;
    ownerId: string;
    sortDate: Date;
    version: string;
}

export interface ChangeQueryResults {
    /**
     * Total counts for each type of change
     */
    changeCounts: { [key: number] : number; };
    /**
     * True if there are more results available to fetch (we're returning the max # of items requested)
     */
    moreResultsAvailable: boolean;
    /**
     * The change entries (results) from this query
     */
    results: Change[];
}

export interface CheckinNote {
    name: string;
    value: string;
}

export interface Entity {
    url: string;
}

export interface FileCharDiffBlock {
    charChange: FileDiffBlock[];
    lineChange: FileDiffBlock;
}

export interface FileContent {
    content: string;
    contentBytes: number[];
    contentLines: string[];
    exceededMaxContentLength: boolean;
    metadata: FileContentMetadata;
}

export interface FileContentMetadata {
    contentType: string;
    encoding: number;
    extension: string;
    fileName: string;
    isBinary: boolean;
    isImage: boolean;
    vsLink: string;
}

export interface FileDiff {
    binaryContent: boolean;
    blocks: FileDiffBlock[];
    emptyContent: boolean;
    identicalContent: boolean;
    imageComparison: boolean;
    lineCharBlocks: FileCharDiffBlock[];
    modifiedFile: ItemModel;
    modifiedFileTruncated: boolean;
    originalFile: ItemModel;
    originalFileTruncated: boolean;
    whitespaceChangesOnly: boolean;
}

export interface FileDiffBlock {
    changeType: FileDiffBlockChangeType;
    mLine: number;
    mLines: string[];
    mLinesCount: number;
    oLine: number;
    oLines: string[];
    oLinesCount: number;
    /**
     * True for "ChangeType=None" blocks in a partial diff that have been truncated after the included text.
     */
    truncatedAfter: boolean;
    /**
     * True for "ChangeType=None" blocks in a partial diff that have been truncated before the included text.
     */
    truncatedBefore: boolean;
}

/**
 * Type of change for a diff block
 */
export enum FileDiffBlockChangeType {
    /**
     * No change - left and right sides are identical
     */
    None = 0,
    /**
     * Content was added to the right side
     */
    Add = 1,
    /**
     * Content was deleted from the left side
     */
    Delete = 2,
    /**
     * Lines were modified
     */
    Edit = 3
}

/**
 * Parameters used when diffing 2 files
 */
export interface FileDiffParameters {
    /**
     * Unless false, ignore whitespace at the beginning and end of each line
     */
    ignoreTrimmedWhitespace: boolean;
    /**
     * If true, include char diffs with each diff block
     */
    includeCharDiffs: boolean;
    /**
     * If true, don't include the content in the returned diff blocks. Only include the line numbers.
     */
    lineNumbersOnly: boolean;
    /**
     * Server path of the right/modified item
     */
    modifiedPath: string;
    /**
     * Version description of the right/modified item
     */
    modifiedVersion: string;
    /**
     * Server path of the left/original item
     */
    originalPath: string;
    /**
     * Version description of the original item
     */
    originalVersion: string;
    /**
     * If true, only return the changed diff blocks plus a few unchanged lines before and after each change block.
     */
    partialDiff: boolean;
}

export interface GitAnnotateBatchResult {
    diffs: GitAnnotateResult[];
    mObjectId: string;
}

export interface GitAnnotateResult {
    diff: FileDiff;
    oObjectId: string;
}

export interface GitBranchDiff {
    aheadCount: number;
    behindCount: number;
    branchName: string;
    commit: GitCommit;
    isBaseCommit: boolean;
    isLockedBy: VSS_Common_Contracts.IdentityRef;
}

export interface GitChange extends Change {
}

export interface GitCommit extends ChangeList {
    author: GitIdentityReference;
    commitId: GitObjectId;
    committer: GitIdentityReference;
    commitTime: Date;
    parents: GitObjectReference[];
    pushCorrelationId: string;
    pusher: string;
    pushId: number;
    pushTime: Date;
    tree: GitItem;
}

export interface GitHistoryQueryResults extends HistoryQueryResults {
    /**
     * Seed commit used for querying history.  Used for skip feature.
     */
    startingCommitId: string;
    unpopulatedCount: number;
    unprocessedCount: number;
}

export interface GitIdentityReference extends TeamIdentityReference {
    date: Date;
}

export interface GitItem extends ItemModel {
    /**
     * This is not used on the serverside, but is used by TypeScript.  Its added here for code generation.
     */
    commitId: GitObjectId;
    gitObjectType: GitObjectType;
    /**
     * Git object id
     */
    objectId: GitObjectId;
}

export interface GitItemMetadata {
    comment: string;
    commitId: GitObjectId;
    item: GitItem;
    owner: string;
    ownerDisplayName: string;
}

export interface GitObjectId {
    full: string;
    short: string;
}

/**
 * Represents a shallow reference to a Git object for serialization
 */
export interface GitObjectReference extends Entity {
    name: string;
    objectId: GitObjectId;
}

export enum GitObjectType {
    Bad = 0,
    Commit = 1,
    Tree = 2,
    Blob = 3,
    Tag = 4,
    Ext2 = 5,
    OfsDelta = 6,
    RefDelta = 7
}

export interface GitSubmoduleItem extends GitItem {
    name: string;
    newObjectId: GitObjectId;
    oldObjectId: GitObjectId;
    repositoryUrl: string;
}

export interface HistoryEntry {
    /**
     * The Change list (changeset/commit/shelveset) for this point in history
     */
    changeList: ChangeList;
    /**
     * The change made to the item from this change list (only relevant for File history, not folders)
     */
    itemChangeType: VersionControlChangeType;
    /**
     * The path of the item at this point in history (only relevant for File history, not folders)
     */
    serverItem: string;
}

export interface HistoryQueryResults {
    /**
     * True if there are more results available to fetch (we're returning the max # of items requested) A more RESTy solution would be to include a Link header
     */
    moreResultsAvailable: boolean;
    /**
     * The history entries (results) from this query
     */
    results: HistoryEntry[];
}

/**
 * Optional details to include when returning an item model
 */
export interface ItemDetailsOptions {
    /**
     * If true, include metadata about the file type
     */
    includeContentMetadata: boolean;
    /**
     * If true, include a detailed version description
     */
    includeVersionDescription: boolean;
    /**
     * Specifies whether to include children (OneLevel), all descendants (Full) or None for folder items
     */
    recursionLevel: VersionControlRecursionType;
}

export interface ItemModel extends Entity {
    changeDate: Date;
    childItems: ItemModel[];
    contentMetadata: FileContentMetadata;
    isFolder: boolean;
    isSymLink: boolean;
    serverItem: string;
    version: string;
    versionDescription: string;
}

export interface TeamIdentityReference {
    displayName: string;
    id: string;
    url: string;
}

export interface TfsAnnotateDiffParameters {
    mEncoding: number;
    mFileId: number;
    mServerItem: string;
    oEncoding: number;
    oFileId: number;
    oServerItem: string;
}

export interface TfsChange extends Change {
    /**
     * Version at which a (shelved) change was pended against
     */
    pendingVersion: number;
}

export interface TfsChangeList extends ChangeList {
    changesetId: number;
    isShelveset: boolean;
    policyOverride: TfsPolicyOverrideInfo;
    shelvesetName: string;
}

export interface TfsHistoryEntry extends HistoryEntry {
    /**
     * The encoding of the item at this point in history (only relevant for File history, not folders)
     */
    encoding: number;
    /**
     * The file id of the item at this point in history (only relevant for File history, not folders)
     */
    fileId: number;
}

export interface TfsIdentityReference extends TeamIdentityReference {
    accountName: string;
    teamFoundationId: string;
}

export interface TfsItem extends ItemModel {
    changeset: number;
    deletionId: number;
    id: number;
    isBranch: boolean;
    isPendingChange: boolean;
}

export interface TfsPolicyFailureInfo {
    message: string;
    policyName: string;
}

export interface TfsPolicyOverrideInfo {
    comment: string;
    policyFailures: TfsPolicyFailureInfo[];
}

export enum VersionControlChangeType {
    None = 0,
    Add = 1,
    Edit = 2,
    Encoding = 4,
    Rename = 8,
    Delete = 16,
    Undelete = 32,
    Branch = 64,
    Merge = 128,
    Lock = 256,
    Rollback = 512,
    SourceRename = 1024,
    TargetRename = 2048,
    Property = 4096,
    All = 8191
}

export enum VersionControlRecursionType {
    /**
     * Only return the specified item.
     */
    None = 0,
    /**
     * Return the specified item and its direct children.
     */
    OneLevel = 1,
    /**
     * Return the specified item and its direct children, as well as recursive chains of nested child folders that only contain a single folder.
     */
    OneLevelPlusNestedEmptyFolders = 4,
    /**
     * Return specified item and all descendants
     */
    Full = 2
}

export var TypeInfo = {
    AuthorCounts: <any>{
    },
    Change: <any>{
    },
    ChangeList: <any>{
    },
    ChangeQueryResults: <any>{
    },
    FileCharDiffBlock: <any>{
    },
    FileDiff: <any>{
    },
    FileDiffBlock: <any>{
    },
    FileDiffBlockChangeType: {
        enumValues: {
            "none": 0,
            "add": 1,
            "delete": 2,
            "edit": 3
        }
    },
    GitAnnotateBatchResult: <any>{
    },
    GitAnnotateResult: <any>{
    },
    GitBranchDiff: <any>{
    },
    GitChange: <any>{
    },
    GitCommit: <any>{
    },
    GitHistoryQueryResults: <any>{
    },
    GitIdentityReference: <any>{
    },
    GitItem: <any>{
    },
    GitItemMetadata: <any>{
    },
    GitObjectType: {
        enumValues: {
            "bad": 0,
            "commit": 1,
            "tree": 2,
            "blob": 3,
            "tag": 4,
            "ext2": 5,
            "ofsDelta": 6,
            "refDelta": 7
        }
    },
    GitSubmoduleItem: <any>{
    },
    HistoryEntry: <any>{
    },
    HistoryQueryResults: <any>{
    },
    ItemDetailsOptions: <any>{
    },
    ItemModel: <any>{
    },
    TfsChange: <any>{
    },
    TfsChangeList: <any>{
    },
    TfsHistoryEntry: <any>{
    },
    TfsItem: <any>{
    },
    VersionControlChangeType: {
        enumValues: {
            "none": 0,
            "add": 1,
            "edit": 2,
            "encoding": 4,
            "rename": 8,
            "delete": 16,
            "undelete": 32,
            "branch": 64,
            "merge": 128,
            "lock": 256,
            "rollback": 512,
            "sourceRename": 1024,
            "targetRename": 2048,
            "property": 4096,
            "all": 8191
        }
    },
    VersionControlRecursionType: {
        enumValues: {
            "none": 0,
            "oneLevel": 1,
            "oneLevelPlusNestedEmptyFolders": 4,
            "full": 2
        }
    },
};

TypeInfo.AuthorCounts.fields = {
    lastChangeDate: {
        isDate: true,
    }
};

TypeInfo.Change.fields = {
    changeType: {
        enumType: TypeInfo.VersionControlChangeType
    },
    item: {
        typeInfo: TypeInfo.ItemModel
    }
};

TypeInfo.ChangeList.fields = {
    changeCounts: {
        isDictionary: true,
        dictionaryKeyEnumType: TypeInfo.VersionControlChangeType,
    },
    changes: {
        isArray: true,
        typeInfo: TypeInfo.Change
    },
    creationDate: {
        isDate: true,
    },
    sortDate: {
        isDate: true,
    }
};

TypeInfo.ChangeQueryResults.fields = {
    changeCounts: {
        isDictionary: true,
        dictionaryKeyEnumType: TypeInfo.VersionControlChangeType,
    },
    results: {
        isArray: true,
        typeInfo: TypeInfo.Change
    }
};

TypeInfo.FileCharDiffBlock.fields = {
    charChange: {
        isArray: true,
        typeInfo: TypeInfo.FileDiffBlock
    },
    lineChange: {
        typeInfo: TypeInfo.FileDiffBlock
    }
};

TypeInfo.FileDiff.fields = {
    blocks: {
        isArray: true,
        typeInfo: TypeInfo.FileDiffBlock
    },
    lineCharBlocks: {
        isArray: true,
        typeInfo: TypeInfo.FileCharDiffBlock
    },
    modifiedFile: {
        typeInfo: TypeInfo.ItemModel
    },
    originalFile: {
        typeInfo: TypeInfo.ItemModel
    }
};

TypeInfo.FileDiffBlock.fields = {
    changeType: {
        enumType: TypeInfo.FileDiffBlockChangeType
    }
};

TypeInfo.GitAnnotateBatchResult.fields = {
    diffs: {
        isArray: true,
        typeInfo: TypeInfo.GitAnnotateResult
    }
};

TypeInfo.GitAnnotateResult.fields = {
    diff: {
        typeInfo: TypeInfo.FileDiff
    }
};

TypeInfo.GitBranchDiff.fields = {
    commit: {
        typeInfo: TypeInfo.GitCommit
    }
};

TypeInfo.GitChange.fields = {
    changeType: {
        enumType: TypeInfo.VersionControlChangeType
    },
    item: {
        typeInfo: TypeInfo.ItemModel
    }
};

TypeInfo.GitCommit.fields = {
    author: {
        typeInfo: TypeInfo.GitIdentityReference
    },
    changeCounts: {
        isDictionary: true,
        dictionaryKeyEnumType: TypeInfo.VersionControlChangeType,
    },
    changes: {
        isArray: true,
        typeInfo: TypeInfo.Change
    },
    committer: {
        typeInfo: TypeInfo.GitIdentityReference
    },
    commitTime: {
        isDate: true,
    },
    creationDate: {
        isDate: true,
    },
    pushTime: {
        isDate: true,
    },
    sortDate: {
        isDate: true,
    },
    tree: {
        typeInfo: TypeInfo.GitItem
    }
};

TypeInfo.GitHistoryQueryResults.fields = {
    results: {
        isArray: true,
        typeInfo: TypeInfo.HistoryEntry
    }
};

TypeInfo.GitIdentityReference.fields = {
    date: {
        isDate: true,
    }
};

TypeInfo.GitItem.fields = {
    changeDate: {
        isDate: true,
    },
    childItems: {
        isArray: true,
        typeInfo: TypeInfo.ItemModel
    },
    gitObjectType: {
        enumType: TypeInfo.GitObjectType
    }
};

TypeInfo.GitItemMetadata.fields = {
    item: {
        typeInfo: TypeInfo.GitItem
    }
};

TypeInfo.GitSubmoduleItem.fields = {
    changeDate: {
        isDate: true,
    },
    childItems: {
        isArray: true,
        typeInfo: TypeInfo.ItemModel
    },
    gitObjectType: {
        enumType: TypeInfo.GitObjectType
    }
};

TypeInfo.HistoryEntry.fields = {
    changeList: {
        typeInfo: TypeInfo.ChangeList
    },
    itemChangeType: {
        enumType: TypeInfo.VersionControlChangeType
    }
};

TypeInfo.HistoryQueryResults.fields = {
    results: {
        isArray: true,
        typeInfo: TypeInfo.HistoryEntry
    }
};

TypeInfo.ItemDetailsOptions.fields = {
    recursionLevel: {
        enumType: TypeInfo.VersionControlRecursionType
    }
};

TypeInfo.ItemModel.fields = {
    changeDate: {
        isDate: true,
    },
    childItems: {
        isArray: true,
        typeInfo: TypeInfo.ItemModel
    }
};

TypeInfo.TfsChange.fields = {
    changeType: {
        enumType: TypeInfo.VersionControlChangeType
    },
    item: {
        typeInfo: TypeInfo.ItemModel
    }
};

TypeInfo.TfsChangeList.fields = {
    changeCounts: {
        isDictionary: true,
        dictionaryKeyEnumType: TypeInfo.VersionControlChangeType,
    },
    changes: {
        isArray: true,
        typeInfo: TypeInfo.Change
    },
    creationDate: {
        isDate: true,
    },
    sortDate: {
        isDate: true,
    }
};

TypeInfo.TfsHistoryEntry.fields = {
    changeList: {
        typeInfo: TypeInfo.ChangeList
    },
    itemChangeType: {
        enumType: TypeInfo.VersionControlChangeType
    }
};

TypeInfo.TfsItem.fields = {
    changeDate: {
        isDate: true,
    },
    childItems: {
        isArray: true,
        typeInfo: TypeInfo.ItemModel
    }
};
