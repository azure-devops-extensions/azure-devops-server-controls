import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";

import * as Constants from "VersionControl/Scenarios/PullRequestCreate/Constants";
import { ChangeList, GitCommit, GitHistoryQueryResults, HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCOM from "VersionControl/Scripts/TFS.VersionControl";

export interface IDiffCommit {
    sourceBranchVersionString: string;
    targetBranchVersionString: string;
    commit: GitCommit;
}

export interface ICommitHistory {
    sourceBranchVersionString: string;
    targetBranchVersionString: string;
    history: GitHistoryQueryResults;
}

export class CommitsStore extends Store {
    private _history: ICommitHistory = null;
    private _diffCommit: IDiffCommit = null;

    // concat source and target together to ensure we load the correct
    // result from async calls that may be out of order
    private _diffHash: string = null;
    private _historyHash: string = null;

    constructor() {
        super();
    }

    public updateCommitsHistoryStarted(
        sourceBranchVersionString: string,
        targetBranchVersionString: string): void {

        this._historyHash = sourceBranchVersionString + targetBranchVersionString;
    }

    public updateCommitsHistory(commitHistory: ICommitHistory) {

        if (commitHistory.sourceBranchVersionString +
            commitHistory.targetBranchVersionString !== this._historyHash) {
            return;
        }

        this._history = commitHistory;
        this._historyHash = null;

        this.emitChanged();
    }

    public updateFullComment = (fullChangeList: ChangeList): void => {
        if (fullChangeList &&
            this._history &&
            this._history.history &&
            this._history.history.results
        ) {
            const [originalEntry] = this._history.history.results.filter(entry => entry.changeList.version === fullChangeList.version);
            if (originalEntry) {
                originalEntry.changeList = fullChangeList;

                this.emitChanged();
            }
        }
    }

    public updateDiffCommitStarted(
        sourceBranchVersionString: string,
        targetBranchVersionString: string): void {

        this._diffHash = sourceBranchVersionString + targetBranchVersionString;

        this.emitChanged();
    }

    public updateDiffCommit(diffCommit: IDiffCommit): void {
        if (diffCommit.sourceBranchVersionString +
            diffCommit.targetBranchVersionString !== this._diffHash) {
            return;
        }

        this._diffCommit = diffCommit;
        this._diffHash = null;

        this.emitChanged();
    }

    public isLoadingDiff(): boolean {
        return !this._diffCommit || !!this._diffHash;
    }

    public isLoadingHistory(): boolean {
        return !this._history || !!this._historyHash;
    }

    public getHistory(): ICommitHistory {
        return this._history;
    }

    public getTruncatedCommits(): HistoryEntry[] {
        return this._history && this._history.history
            ? this._history.history.results.filter(commit => commit.changeList.commentTruncated)
            : [];
    }

    public getCommitMessagesMarkdown(): string {
        if (!this._history || !this._history.history) {
            return "";
        }

        return this._history.history.results
            .reverse()
            .map(commit => `- ${commit.changeList.comment}`)
            .join("\n");
    }

    public getDiffCommit(): IDiffCommit {
        return this._diffCommit;
    }

    public get shouldShowPreview(): boolean {
        return (
            this._diffCommit &&
            this._diffCommit.commit &&
            this._history &&
            this._history.history &&
            this._history.history.results &&
            this._history.history.results.length > 0);
    }

    public getFilesTabName(): string {
        return Utils_String.format(VCResources.PullRequest_FilesSectionTitle, CommitsStore._filesCount(this._diffCommit));
    }

    public getCommitsTabName(): string {
        return Utils_String.format(VCResources.PullRequest_CommitsSectionTitle, CommitsStore._commitsCount(this._history));
    }

    private static _commitsCount(history: ICommitHistory): number {
        if (!history && !history.history && !history.history.results && !history.history.results.length) {
            return 0;
        }

        return Math.min(history.history.results.length, Constants.DEFAULT_MAX_HISTORY_ITEMS_COUNT);
    }

    private static _filesCount(diffCommit: IDiffCommit): number {
        return (diffCommit && diffCommit.commit && diffCommit.commit.changes) ? diffCommit.commit.changes.filter(change => {
                // Skip source-rename entries (would otherwise show up as delete's).
                if (VCOM.ChangeType.isSourceRenameDelete(change.changeType)) {
                    return false;
                }

                if (change.item.isFolder) {
                    return false;
                }

                return true;
        }).length : 0;
    }
}
