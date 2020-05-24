import * as VSSStore from "VSS/Flux/Store";

import { GitCommitRef } from "TFS/VersionControl/Contracts";
import {
    CommitPayload,
    ItemInfo,
    TabChangedPayload,
    FolderLatestChangesRetrievedPayload,
} from "VersionControl/Scenarios/Explorer/ActionsHub";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getFileOrFolderDisplayName } from "VersionControl/Scripts/VersionControlPath";

export interface ChangeInfo {
    changeId: string;
    changeUrl?: string;
    changeDate: Date;
    userName: string;
    userNameWithEmail: string;
    comment: string;
}

export interface FolderContentState {
    items: ItemModel[];
    itemNames: IDictionaryStringTo<string>;
    selectedItems: ItemModel[];
    itemsChangeInfo: IDictionaryStringTo<ChangeInfo>;
    areFolderLatestChangesRequested: boolean;
    latestChangesPayload: FolderLatestChangesRetrievedPayload;
    lastExploredTime: Date;
    loadingRemainderLatestChangesTriggerFullName: string;
    knownCommits: IDictionaryStringTo<GitCommitRef>;
}

/**
 * A store containing the state of the current folder view in the content tab.
 */
export abstract class FolderContentStore extends VSSStore.Store {
    public state = {
        items: undefined,
        selectedItems: [],
        knownCommits: {},
        itemsChangeInfo: {},
        itemNames: {},
    } as FolderContentState;

    public changeItem = (path: string, itemInfo: ItemInfo): void => {
        const childItems = itemInfo && itemInfo.item.isFolder && itemInfo.item.childItems;

        this.setState({
            items: childItems,
            selectedItems: [],
            itemNames: childItems ? this.generateItemNames(childItems, itemInfo.item.serverItem) : {},
            itemsChangeInfo: childItems ? this.generateChangeInfoFromItemsOnly(childItems) : {},
            latestChangesPayload: undefined,
            areFolderLatestChangesRequested: itemInfo && itemInfo.areFolderLatestChangesRequested || false,
            lastExploredTime: null,
            loadingRemainderLatestChangesTriggerFullName: null,
        } as FolderContentState);
    }

    public commit = (payload: CommitPayload): void => {
        const knownCommits = this.updateKnownCommitsAfterCommit(payload);

        this.setState({
            itemsChangeInfo: {},
            latestChangesPayload: undefined,
            lastExploredTime: null,
            areFolderLatestChangesRequested: false,
            selectedItems: [],
            knownCommits,
        } as FolderContentState);
    }

    public changeTab = (payload: TabChangedPayload): void => {
        this.setState({
            areFolderLatestChangesRequested: payload.areFolderLatestChangesRequested || this.state.areFolderLatestChangesRequested,
        } as FolderContentState);
    }

    public loadItems = (itemInfo: ItemInfo, versionSpec?: VersionSpec): void => {
        if (itemInfo && itemInfo.item.isFolder) {
            const { childItems } = itemInfo.item;

            const itemNames = childItems
                ? this.generateItemNames(childItems, itemInfo.item.serverItem)
                : {};

            const itemsChangeInfo = childItems
                ? this.state.latestChangesPayload
                    ? this.generateChangeInfo(childItems, itemNames, this.state.latestChangesPayload, this.state.knownCommits)
                    : this.generateChangeInfoFromItemsOnly(childItems)
                : {};

            this.setState({
                items: childItems,
                itemNames,
                itemsChangeInfo,
                areFolderLatestChangesRequested: itemInfo.areFolderLatestChangesRequested || this.state.areFolderLatestChangesRequested,
            } as FolderContentState);
        }
    }

    public loadLatestChanges = (payload: FolderLatestChangesRetrievedPayload): void => {
        const knownCommits = payload.gitCommits ? this.addNewCommits(this.state.knownCommits, payload.gitCommits) : this.state.knownCommits;

        const itemsChangeInfo = this.state.items
            ? this.generateChangeInfo(this.state.items, this.state.itemNames, payload, knownCommits)
            : {};

        this.setState({
            knownCommits,
            itemsChangeInfo,
            latestChangesPayload: payload,
            lastExploredTime: payload.lastExploredTime,
            areFolderLatestChangesRequested: true,
        } as FolderContentState);
    }

    public selectChildren = (selectedItems: ItemModel[]): void => {
        if (!selectedItems) {
            throw new Error("selectedItems argument is required.");
        }

        this.setState({
            selectedItems,
        } as FolderContentState);
    }

    protected abstract generateChangeInfo(
        items: ItemModel[],
        itemNames: IDictionaryStringTo<string>,
        payload: FolderLatestChangesRetrievedPayload,
        knownCommits: IDictionaryStringTo<GitCommitRef>,
    ): IDictionaryStringTo<ChangeInfo>;

    protected addNewCommits(knownCommits: IDictionaryStringTo<GitCommitRef>, newCommits: GitCommitRef[]): IDictionaryStringTo<GitCommitRef> {
        const newKnownCommits: IDictionaryStringTo<GitCommitRef> = $.extend({}, knownCommits);
        for (const commitDetail of newCommits) {
            newKnownCommits[commitDetail.commitId] = commitDetail;
        }

        return newKnownCommits;
    }

    protected updateKnownCommitsAfterCommit(payload: CommitPayload): IDictionaryStringTo<GitCommitRef> {
        return this.state.knownCommits;
    }

    protected mapObject<T>(dictionary: IDictionaryStringTo<T>, transform: (item: T) => T): IDictionaryStringTo<T> {
        const result: IDictionaryStringTo<T> = {};

        for (const path in dictionary) {
            result[path] = transform(dictionary[path]);
        }

        return result;
    }

    private generateItemNames(items: ItemModel[], parentPath: string): IDictionaryStringTo<string> {
        const names: IDictionaryStringTo<string> = {};

        for (const item of items) {
            names[item.serverItem] = getFileOrFolderDisplayName(item, parentPath);
        }

        return names;
    }

    protected abstract generateChangeInfoFromItemsOnly(items: ItemModel[]): IDictionaryStringTo<ChangeInfo>;

    protected setState(newState: FolderContentState): void {
        this.state = {
            ...this.state,
            ...newState,
        };

        this.emitChanged();
    }
}
