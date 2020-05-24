import { RemoteStore } from "VSS/Flux/Store";

import { ChangeLinkRow, ChangeSetsListItem, ErrorPayload, TfvcHistoryListPayload, TfvcHistoryLoadStartPayload } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces";
import { HistoryEntry, HistoryQueryResults, TfsChangeList, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCOM from "VersionControl/Scripts/TFS.VersionControl";

export interface TfvcChangeSetsStoreState {
    knownHistoryItems: IDictionaryNumberTo<HistoryEntry[]>;
    tfvcChangeSetsListItems: ChangeSetsListItem[];
    hasMoreChangeSets: boolean;
    isLoading: boolean;
    error: Error;
    isSetBefore: boolean;
}

/**
 * A store containing Tfvc history list state
 */
export class TfvcChangeSetsStore extends RemoteStore {
    private readonly DEFAULT_CACHE_KEY: number = -1;
    private expandedChangesets: IDictionaryNumberTo<boolean> = {};
    private _getDefaultState = (): TfvcChangeSetsStoreState => {
        return {
            knownHistoryItems: {},
            tfvcChangeSetsListItems: [],
            hasMoreChangeSets: false,
            isLoading: true,
            isSetBefore: false,
            error: null,
        } as TfvcChangeSetsStoreState;
    }

    public state: TfvcChangeSetsStoreState = this._getDefaultState();

    public loadHistoryList = (payload: TfvcHistoryListPayload): void => {
        this.state.error = null;
        this.state.isLoading = false;
        this.state.isSetBefore = true;

        let cacheKey = this.DEFAULT_CACHE_KEY;

        // check for expanded changeset case
        if (payload.changesetId) {
            this.expandedChangesets[payload.changesetId] = true;
            cacheKey = payload.changesetId;
        }

        if (payload.historyList && payload.historyList.results) {
            this.state.hasMoreChangeSets = payload.historyList.moreResultsAvailable;
            this.updateCache(cacheKey, payload.historyList, payload.isLoadMore);
        }

        this._refreshChangesetsListItems();
        this.emitChanged();
    }

    public collapseChangeset = (collapsedChangeSetId: number): void => {
        if (this.expandedChangesets[collapsedChangeSetId]) {
            this.expandedChangesets[collapsedChangeSetId] = null;
        }

        this._refreshChangesetsListItems();
        this.emitChanged();
    }

    public setLoadingStarted = (payload?: TfvcHistoryLoadStartPayload): void => {
        if (payload && payload.changesetId) {
            this._setLinkLoading(payload.changesetId, true);
        }
        else if (payload && payload.isLoadMore) {
            this.state.isLoading = true;
        }
        else {
            this._setDefaultState();
        }

        this.emitChanged();
    }

    public clearAllErrors = (): void => {
        this.state.error = null;
        this.emitChanged();
    }

    public clear = (): void => {
        this._setDefaultState();
        this.emitChanged();
    }

    public failLoad = (payload: ErrorPayload): void => {
        this.state.isLoading = false;
        if (payload)
        {
            this.state.error = payload.error;
            if (payload.changesetId) {
                this._setLinkLoading(payload.changesetId, false);
            }
        }

        this.emitChanged();
    }

    public dispose(): void {
        this.state.tfvcChangeSetsListItems = null;
        this.expandedChangesets = null;
        this.state.knownHistoryItems = null;
    }

    private _setLinkLoading(changeSetId: number, loadingState: boolean): void {
        const index = this._findLinkItemIndex(changeSetId);
        if (index > 0) {
            this.state.tfvcChangeSetsListItems[index].changeLinkRow.isLoadingHistory = loadingState;
        }
    }

    /**
     * Find the index of the Link for which we should display spinner
     */
    private _findLinkItemIndex(changeSetId: number): number {
        let itemIndex: number = -1;
        for (let iter = 0; iter < this.state.tfvcChangeSetsListItems.length; iter++) {
            const currItem = this.state.tfvcChangeSetsListItems[iter];
            const currChangeSetId = (currItem.item.changeList as TfsChangeList).changesetId;
            if (changeSetId === currChangeSetId && currItem.changeLinkRow) {
                itemIndex = iter;
                break;
            }
        }
        return itemIndex;
    }

    private _setDefaultState = (): void => {
        this.expandedChangesets = [];
        this.state = this._getDefaultState();
    }

    private _constructHistoryListRenameRowItem(
        historyEntryItem: HistoryEntry,
        isLinkExpanded: boolean,
        oldFileName: string,
        itemDepth: number,
        isExpandedHistoryEmpty?: boolean,
    ): ChangeSetsListItem {
        return {
            item: historyEntryItem,
            itemDepth: itemDepth,
            changeLinkRow: {
                isExpanded: isLinkExpanded,
                changeType: historyEntryItem.itemChangeType,
                oldFileName: oldFileName,
                isExpandedHistoryEmpty: isExpandedHistoryEmpty ? isExpandedHistoryEmpty : null,
            },
        }
    }

    private updateCache(key: number, payload: HistoryQueryResults, appendtoExistingResults: boolean = false): void {
        const items = payload.results;
        if (!key) {
            key = -1;
        }

        this.state.knownHistoryItems[key] =
            (appendtoExistingResults && this.state.knownHistoryItems[key])
                ? this.state.knownHistoryItems[key].concat(items)
                : items;
    }

    private _refreshChangesetsListItems(): void {
        const historyResultsEntries = this.state.knownHistoryItems[this.DEFAULT_CACHE_KEY];
        this.state.tfvcChangeSetsListItems = [];
        this._traverseRecursivelyToConstructFinalList(historyResultsEntries, 0);
    }

    private _traverseRecursivelyToConstructFinalList(historyResultsEntries: HistoryEntry[], itemDepth: number): void {
        for (let i = 0; i < historyResultsEntries.length; i++) {
            const historyEntryItem: HistoryEntry = historyResultsEntries[i];
            const changeSetId = (historyEntryItem.changeList as TfsChangeList).changesetId;

            const historyListItem: ChangeSetsListItem = { item: historyEntryItem, itemDepth: itemDepth };
            this.state.tfvcChangeSetsListItems.push(historyListItem);

            // Add a expand or collapse link if:
            // 1. changeType is branch or merge, or
            // 2. changeType is rename and it is the last item. ( the history is omitted).
            const shouldAddLink = historyEntryItem
                && ((VCOM.ChangeType.hasChangeFlag(historyEntryItem.itemChangeType, VersionControlChangeType.Rename)
                      && (i + 1 === historyResultsEntries.length))
                || VCOM.ChangeType.hasChangeFlag(historyEntryItem.itemChangeType, VersionControlChangeType.Branch)
                || VCOM.ChangeType.hasChangeFlag(historyEntryItem.itemChangeType, VersionControlChangeType.Merge));

            if (shouldAddLink) {

                // Construct Expand Link (Eg: Show Rename History)
                if (!this.expandedChangesets[changeSetId]) {
                    this.state.tfvcChangeSetsListItems.push(this._constructHistoryListRenameRowItem(historyEntryItem, false, "", itemDepth));
                }
                // Construct Collapse Link (Eg: Hide Rename History for file1)
                else {
                    const oldFile: string = "";

                    const expandedHistoryResults = this.state.knownHistoryItems[changeSetId];
                    // Data for the expanded results should be in cache when we reach here
                    if (expandedHistoryResults && expandedHistoryResults.length > 0) {
                        this.state.tfvcChangeSetsListItems.push(this._constructHistoryListRenameRowItem(historyEntryItem, true, expandedHistoryResults[0].serverItem, itemDepth));
                        this._traverseRecursivelyToConstructFinalList(expandedHistoryResults, itemDepth + 1);
                    }
                    // else it means the data after expansion did not meet the current filter criteria and should display empty message
                    else {
                        this.state.tfvcChangeSetsListItems.push((this._constructHistoryListRenameRowItem(historyEntryItem, true, oldFile, itemDepth, true)));
                    }
                }
            }
        }
    }
}
