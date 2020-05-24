import { GitCommitRef } from "TFS/VersionControl/Contracts";
import { ItemModel, ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as ChangeListIdentityHelper from "VersionControl/Scripts/ChangeListIdentityHelper";
import { FolderLatestChangesRetrievedPayload } from  "VersionControl/Scenarios/Explorer/ActionsHub";
import { FolderContentStore, ChangeInfo } from  "VersionControl/Scenarios/Explorer/Stores/FolderContentStore";

/**
 * A store for Git repositories containing the state of the current folder view in the content tab.
 */
export class TfvcFolderContentStore extends FolderContentStore {
    protected generateChangeInfoFromItemsOnly(items: ItemModel[]): IDictionaryStringTo<ChangeInfo> {
        const results: IDictionaryStringTo<ChangeInfo> = {};

        for (const item of items) {
            results[item.serverItem] = createMinimumChangeInfo(item);
        }

        return results;
    }

    protected generateChangeInfo(
        items: ItemModel[],
        itemNames: IDictionaryStringTo<string>,
        payload: FolderLatestChangesRetrievedPayload,
        knownCommits: IDictionaryStringTo<GitCommitRef>,
    ): IDictionaryStringTo<ChangeInfo> {
        const versionMap: IDictionaryStringTo<ChangeList> = {};

        for (const changeList of payload.changeLists) {
            versionMap[changeList.version] = changeList;
        }

        const results: IDictionaryStringTo<ChangeInfo> = {};

        for (const item of items) {
            const changeList = versionMap[item.versionDescription];
            results[item.serverItem] = changeList
                ? createChangeInfo(changeList, payload.changeUrls[changeList.version])
                : createMinimumChangeInfo(item);
        }

        return results;
    }
}

function createMinimumChangeInfo(item: ItemModel): ChangeInfo {
    return {
        changeId: item.versionDescription,
    } as ChangeInfo;
}

function createChangeInfo(changeList: ChangeList, changeUrl: string): ChangeInfo {
    return {
        changeId: changeList.version,
        changeDate: changeList.creationDate,
        userName: ChangeListIdentityHelper.getUserNameWithoutEmail(changeList.ownerDisplayName),
        userNameWithEmail: changeList.ownerDisplayName,
        comment: changeList.comment,
        changeUrl,
    };
}
