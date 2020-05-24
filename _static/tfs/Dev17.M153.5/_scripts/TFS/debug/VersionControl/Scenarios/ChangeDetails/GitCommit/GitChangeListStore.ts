import * as Utils_String from "VSS/Utils/String";
import { ChangeListStore } from "VersionControl/Scenarios/ChangeDetails/Stores/ChangeListStore";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import {
    ChangeList,
    GitCommit,
    GitObjectReference,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import {
    VersionSpec,
    GitCommitVersionSpec,
} from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import {
    ActionsHub,
    IChangeListLoadedPayload,
    IGitMergeCommitParentChangeListLoadedPayload,
    IGitMergeCommitParentChangeListSelectedPayload,
} from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";

import { getChangeListForDisplayMode } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";

const MAX_DIFFS_TO_SHOW = 1000;
/**
 * ChangeList for change details page.
 */
export class GitChangeListStore extends ChangeListStore {
    // For Git merge commits: we have parent tabs to allow diffing with each parent commit (tabId = action, example: diffparent2)
    private _gitCommit: GitCommit;       // A typed version of this._currentChangeList
    private _isGitMergeCommit: boolean;

    // We are in the context of diffing a Git merge commit with one of its parents, and this is the current parent key (example: diffparent2)
    private _currentGitMergeParentId: string;
    private _parentIdToVersionSpec: { [parentId: string]: GitCommitVersionSpec };
    private _parentIdToChangeList: { [parentId: string]: GitCommit };
    private _parentIdToChangeListWithoutFolderEntries: { [parentId: string]: GitCommit };
    private _loadAllParentId: string;   

    constructor(protected _actionsHub: ActionsHub) {
        super(_actionsHub);
        this._actionsHub.gitMergeCommitParentChangeListLoaded.addListener(this._onGitMergeCommitParentChangeListLoaded);
        this._actionsHub.gitMergeCommitParentChangeListSelected.addListener(this._onGitMergeCommitParentChangeListSelected);
        this._actionsHub.changeListAutoLoadAllStarted.addListener(this._onGitCommitAutoLoadAllStarted);
    }

    public get currentGitMergeParentId(): string {
        return this._currentGitMergeParentId;
    }

    public get loadAllParentId(): string {
        return this._loadAllParentId;
    }

    public getCommitId(): GitCommit {
        return this._originalChangeList as GitCommit;
    }

    public get compareToVersionSpec(): VersionSpec {
        if (!!this._parentIdToVersionSpec && !!this._currentGitMergeParentId) {
            return this._parentIdToVersionSpec[this._currentGitMergeParentId];
        } else {
            return undefined;
        }
    }

    public get isGitMergeCommit(): boolean {
        return this._isGitMergeCommit;
    }

    public get maxDiffsToShow(): number {
        return MAX_DIFFS_TO_SHOW; //  no upper limit for tfvc
    }

    public get changeListTitle(): string {
        if (!this._originalChangeList) {
            return "";
        }

        const gitCommit = this._originalChangeList as GitCommit;
        if (gitCommit && gitCommit.commitId) {
            const parsedComment = VCCommentParser.Parser.parseComment(gitCommit.comment, 0, 1);
            let text = Utils_String.format(VCResources.ChangeDetailsPageTitle, CommitIdHelper.getShortCommitId(gitCommit.commitId.full), parsedComment.text);
            if (parsedComment.isTextTruncatedBeforeNewline) {
                text = Utils_String.format(VCResources.ElidedTextAtEnd, text);
            }
            return text;
        } else {
            return VCCommentParser.Parser.getChangeListDescription(this._originalChangeList, false);
        }
    }

    public getParentIdToVersionSpec(parentId: string): GitCommitVersionSpec {
        if (!!this._parentIdToVersionSpec) {
            return this._parentIdToVersionSpec[parentId];
        } else {
            return undefined;
        }
    }

    public getParentIdToChangeList(parentId: string): GitCommit {
        if (!!this._parentIdToChangeList) {
            return this._parentIdToChangeList[parentId];
        } else {
            return undefined;
        }
    }

    public getPreviousVersionSpec(isGitMergeCommitParentDiff?: boolean): string {
        const changeList = this.originalChangeList as GitCommit;
        if (!changeList) {
            return "";
        }

        let oVersionSpec = "P" + changeList.version;

        // If this is a Git merge commit, then we might show the diff against a specific parent
        if (!!isGitMergeCommitParentDiff) {

            const parentVersion = this.getParentIdToVersionSpec(this.currentGitMergeParentId);
            const parentChangeList = this.getParentIdToChangeList(this.currentGitMergeParentId);

            if (parentVersion && parentChangeList && changeList && parentChangeList.commitId === changeList.commitId) {
                oVersionSpec = parentVersion.toVersionString();
            }
        } else if (changeList.parents) {
            // else, we show diff with first parent
            const firstParent: GitObjectReference = changeList.parents[0];
            if (firstParent) {
                oVersionSpec = new GitCommitVersionSpec(firstParent.objectId.full).toVersionString();
            }
        }
        return oVersionSpec;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.gitMergeCommitParentChangeListLoaded.removeListener(this._onGitMergeCommitParentChangeListLoaded);
            this._actionsHub.gitMergeCommitParentChangeListSelected.removeListener(this._onGitMergeCommitParentChangeListSelected);
            this._actionsHub.changeListAutoLoadAllStarted.removeListener(this._onGitCommitAutoLoadAllStarted);
        }
        this._gitCommit = null;
        this._parentIdToVersionSpec = null;
        this._parentIdToChangeList = null;
        this._parentIdToChangeListWithoutFolderEntries = null;
        this._loadAllParentId = null;

        super.dispose();
    }

    /**
     * Called when changeList is loaded for the first time.
     */
    protected _onChangeListLoadHandler(payload: IChangeListLoadedPayload): void {
        this._originalChangeList = payload.originalChangeList;
        this._gitCommit = this._originalChangeList as GitCommit;
        this._isGitMergeCommit = this._gitCommit.parents && this._gitCommit.parents.length > 1;

        if (this._isGitMergeCommit) {
            this._gitCommit = this._originalChangeList as GitCommit;
            this._parentIdToVersionSpec = {};
            this._parentIdToChangeList = {};
            this._parentIdToChangeListWithoutFolderEntries = {};
            this._parentIdToChangeList[VersionControlActionIds.Summary] = this._originalChangeList as GitCommit;
            this._parentIdToChangeListWithoutFolderEntries[VersionControlActionIds.Summary] = getChangeListForDisplayMode(ChangeExplorerGridDisplayMode.FilesOnly, this._originalChangeList) as GitCommit;

            $.each(this._gitCommit.parents, (i, parentCommit) => {
                const parentId = VersionControlActionIds.DiffParent + (i + 1);
                this._parentIdToVersionSpec[parentId] = new GitCommitVersionSpec(parentCommit.objectId.full);
            });
        }
        super._onChangeListLoadHandler(payload);
    }

    protected _onGitCommitAutoLoadAllStarted = (): void => {
        // in case of Git parent might change while loading more commits, do not append changes to previous parent
        this._loadAllParentId = this._currentGitMergeParentId;

        this._onChangeListAutoLoadAllStarted();
    }

    protected _updateChangeList(newChangeList: ChangeList): void {
        super._updateChangeList(newChangeList);
        if (!!this._parentIdToChangeList) {
            this._parentIdToChangeList[this._currentGitMergeParentId] = this._currentChangeList as GitCommit;
            this._parentIdToChangeListWithoutFolderEntries[this._currentGitMergeParentId] = this._currentChangeListWithoutNonEmptyFolders as GitCommit;
        }
    }

    private _onGitMergeCommitParentChangeListLoaded = (payload: IGitMergeCommitParentChangeListLoadedPayload): void => {

        // load only if the changelist doesn't exist
        if (!this._parentIdToChangeList[payload.gitMergeParentId]) {
            // Update the Git "changelist" fields so that the commitId = the current merge commit, and the parent is the diffParent commit.
            const changeList = payload.gitMergeChangeList as GitCommit;
            changeList.parents = [{ objectId: changeList.commitId } as GitObjectReference];
            changeList.commitId = this._gitCommit.commitId;
            changeList.author = this._gitCommit.author;
            changeList.comment = this._gitCommit.comment;
            changeList.commentTruncated = this._gitCommit.commentTruncated;
            changeList.version = this._gitCommit.version;

            this._parentIdToChangeList[payload.gitMergeParentId] = changeList;
            this._parentIdToChangeListWithoutFolderEntries[payload.gitMergeParentId] = getChangeListForDisplayMode(ChangeExplorerGridDisplayMode.FilesOnly, changeList) as GitCommit;
            this.emitChanged();
        }
    }

    private _onGitMergeCommitParentChangeListSelected = (payload: IGitMergeCommitParentChangeListSelectedPayload): void => {
        this._currentGitMergeParentId = payload.gitMergeParentId;
        this._currentChangeList = this._parentIdToChangeList[payload.gitMergeParentId];
        this._currentChangeListWithoutNonEmptyFolders = this._parentIdToChangeListWithoutFolderEntries[payload.gitMergeParentId];
        this.emitChanged();
    }
}
