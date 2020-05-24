import { GitLastChangeItem, GitCommitRef } from "TFS/VersionControl/Contracts";
import {
    CommitPayload,
    FolderLatestChangesRetrievedPayload,
    RemainderFolderLatestChangesRequestedPayload,
} from "VersionControl/Scenarios/Explorer/ActionsHub";
import { FolderContentStore, FolderContentState, ChangeInfo } from "VersionControl/Scenarios/Explorer/Stores/FolderContentStore";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as ChangeListIdentityHelper from "VersionControl/Scripts/ChangeListIdentityHelper";
import { GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

/**
 * A store for Git repositories containing the state of the current folder view in the content tab.
 */
export class GitFolderContentStore extends FolderContentStore {
    public loadCommitDetails = (commitDetails: GitCommitRef[]): void => {
        const knownCommits = this.addNewCommits(this.state.knownCommits, commitDetails);
        const itemsChangeInfo = this.buildChangeInfoFromCommits(knownCommits);

        this.setState({
            knownCommits,
            itemsChangeInfo,
            loadingRemainderLatestChangesTriggerFullName: null,
        } as FolderContentState);
    }

    protected updateKnownCommitsAfterCommit(payload: CommitPayload): IDictionaryStringTo<GitCommitRef> {
        const { commitId } = (payload.newRealVersionSpec as GitCommitVersionSpec);

        return {
            ...this.state.knownCommits,
            [commitId]: {
                commitId,
                comment: payload.comment,
                author: {
                    name: payload.userName,
                    date: new Date(),
                },
            } as GitCommitRef,
        };
    }

    public showLoadingRemainderLatestChanges = (payload: RemainderFolderLatestChangesRequestedPayload): void => {
        this.setState({
            loadingRemainderLatestChangesTriggerFullName: payload.triggerFullName,
        } as FolderContentState);
    }

    protected generateChangeInfo(
        items: ItemModel[],
        itemNames: IDictionaryStringTo<string>,
        payload: FolderLatestChangesRetrievedPayload,
        knownCommits: IDictionaryStringTo<GitCommitRef>,
    ): IDictionaryStringTo<ChangeInfo> {
        const results: IDictionaryStringTo<ChangeInfo> = {};

        const lastChangesMap: IDictionaryStringTo<GitLastChangeItem> = {};
        for (const lastChange of payload.gitLastChanges) {
            lastChangesMap[lastChange.path] = lastChange;
        }

        for (const item of items) {
            const partName = this.getFirstPartOfName(itemNames[item.serverItem]);
            const lastChange = lastChangesMap[partName];
            if (lastChange) {
                results[item.serverItem] = this.createChangeInfoFromCommitId(
                    lastChange.commitId,
                    payload.changeUrls[lastChange.commitId],
                    knownCommits);
            }
        }

        return results;
    }

    protected generateChangeInfoFromItemsOnly(items: ItemModel[]): IDictionaryStringTo<ChangeInfo> {
        return {};
    }

    private getFirstPartOfName(name: string): string {
        return name.split("/")[0];
    }

    private buildChangeInfoFromCommits(knownCommits: IDictionaryStringTo<GitCommitRef>): IDictionaryStringTo<ChangeInfo> {
        return this.mapObject(
            this.state.itemsChangeInfo,
            (old: ChangeInfo) => this.createChangeInfoFromCommitId(old.changeId, old.changeUrl, knownCommits));
    }

    private createChangeInfoFromCommitId(commitId: string, changeUrl: string, knownCommits: IDictionaryStringTo<GitCommitRef>): ChangeInfo {
        const commit = knownCommits[commitId];
        if (commit) {
            const userDate = commit.author || commit.committer;
            return {
                changeId: commit.commitId,
                changeUrl,
                changeDate: userDate.date,
                userName: ChangeListIdentityHelper.getUserNameWithoutEmail(userDate.name),
                userNameWithEmail: userDate.name,
                comment: commit.comment,
            };
        } else {
            return {
                changeId: commitId,
            } as ChangeInfo;
        }
    }
}
