import { ChangeListSearchCriteria } from 'TFS/VersionControl/Contracts';
import { ChangesetsFilterSearchCriteria } from 'VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter';
import { TfvcHistoryListSource } from 'VersionControl/Scenarios/History/TfvcHistory/Sources/TfvcHistoryListSource';
import { TfvcChangesetsFilterStoreState } from 'VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangesetsFilterStore';
import { TfvcChangeSetsStoreState } from 'VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStore';
import { ChangeSetsListItem, CriteriaChangedPayload, ErrorPayload, TfvcHistoryListPayload, TfvcHistoryLoadStartPayload } from 'VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces';
import { DelayAnnounceHelper } from 'VersionControl/Scripts/DelayAnnounceHelper';
import { TfsChangeList, VersionControlChangeType } from 'VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts';
import { RepositoryContext } from 'VersionControl/Scripts/RepositoryContext';
import * as VCResources from 'VersionControl/Scripts/Resources/TFS.Resources.VersionControl';
import * as VCOM from 'VersionControl/Scripts/TFS.VersionControl';
import * as VCSpecs from 'VersionControl/Scripts/TFS.VersionControl.VersionSpecs';

export interface TfvcHistoryInvokers {
    historyItemsLoadStarted(loadState: TfvcHistoryLoadStartPayload): void;
    historyItemsLoaded(items: TfvcHistoryListPayload): void;
    historyItemsLoadFailed(error: ErrorPayload): void;
    historyItemCollapsed(changesetId: number): void;
    searchCriteriaChanged(filterCriteria: CriteriaChangedPayload): void;
}

export interface AggregateState {
    path: string;
    version?: string;
    tfvcHistoryListState: TfvcChangeSetsStoreState;
    tfvcHistoryFilterState: TfvcChangesetsFilterStoreState;
    repositoryContext: RepositoryContext;
}

const initialTop = 50;

export class TfvcHistoryBridge {
    private _delayAnnounceHelper: DelayAnnounceHelper;

    constructor(
        private readonly invokers: TfvcHistoryInvokers,
        private readonly getAggregateState: () => AggregateState,
        private readonly tfvcListSource: TfvcHistoryListSource,
    ) {
        this._delayAnnounceHelper = new DelayAnnounceHelper();
    }

    public updateHistoryFilters = (searchCriteria: ChangesetsFilterSearchCriteria): void => {
        const itemPath = this.getAggregateState().path;
        this.changeFilterCriteria(itemPath, searchCriteria);
    }

    public changeFilterCriteria = (itemPath: string, filterCriteria: ChangesetsFilterSearchCriteria, itemVersion?: string): void => {
        this.fetchChangesetsIfNeeded(itemPath, itemVersion, filterCriteria);
        this.invokers.searchCriteriaChanged({ itemPath, ...filterCriteria });
    }

    public expandChangeSetHistory = (expandedChangeSetListItem: ChangeSetsListItem): IPromise<void> | undefined => {
        if (expandedChangeSetListItem && expandedChangeSetListItem.item &&
            expandedChangeSetListItem.item.changeList) {

            const changesetId = (expandedChangeSetListItem.item.changeList as TfsChangeList).changesetId;
            const cache = this.getAggregateState().tfvcHistoryListState.knownHistoryItems;
            // See if Client already has the data in cache
            if (cache && cache[changesetId]) {
                this.invokers.historyItemsLoaded({ changesetId } as TfvcHistoryListPayload);
            }
            // else call the source to fetch data
            else {
                return this._fetchExpandedChangesets(expandedChangeSetListItem, changesetId);
            }
        }
    }

    public collapseChangeSetsHistory = (collapsedChangeSetListItem: ChangeSetsListItem): void => {
        if (collapsedChangeSetListItem && collapsedChangeSetListItem.item &&
            collapsedChangeSetListItem.item.changeList) {

            const changeSetId = (collapsedChangeSetListItem.item.changeList as TfsChangeList).changesetId;
            this.invokers.historyItemCollapsed(changeSetId);
        }
    }

    public fetchChangesetsIfNeeded(itemPath: string, itemVersion?: string, newCriteria?: ChangesetsFilterSearchCriteria): void {
        const {tfvcHistoryFilterState, tfvcHistoryListState, path} = this.getAggregateState();
        const hasPathChanged = itemPath !== path;
        let shouldFetchChangesets = hasPathChanged;

        if (newCriteria && tfvcHistoryFilterState) {
            shouldFetchChangesets = !isCriteriaEqual(newCriteria, tfvcHistoryFilterState) || hasPathChanged;
        }

        if (shouldFetchChangesets || !tfvcHistoryListState.isSetBefore) {
            const newSearchCriteria = this._calculateSearchCriteria(itemPath, itemVersion, newCriteria);
            this.fetchChangesets(newSearchCriteria, false, initialTop);
        }
    }

    public fetchChangesets(searchCriteria?: ChangeListSearchCriteria, isFetchingMore?: boolean, top: number = initialTop): IPromise<void> | undefined {
        if (!searchCriteria) {
            searchCriteria = this._calculateSearchCriteria();
        }

        if (!this.tfvcListSource) {
            return;
        }

        this._delayAnnounceHelper.startAnnounce(VCResources.FetchingResultsText);
        this.invokers.historyItemsLoadStarted({ isLoadMore: isFetchingMore });

        if (top) {
            searchCriteria.top = top;
        }

        return this.tfvcListSource.getChangeSets(searchCriteria).then(
            results => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText);
                this.invokers.historyItemsLoaded({ historyList: results, isLoadMore: isFetchingMore });
            },
            error => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText, true);
                this.invokers.historyItemsLoadFailed({ error } as ErrorPayload);
            });
    }

    public fetchMoreChangesets(top?: number): void {
        if (!this.tfvcListSource) {
            return;
        }

        const { tfvcHistoryFilterState, path, version, tfvcHistoryListState } = this.getAggregateState();

        const searchCriteria = this._calculateSearchCriteria(path, version, tfvcHistoryFilterState);
        const length = tfvcHistoryListState.tfvcChangeSetsListItems.length;

        searchCriteria.toVersion = ((tfvcHistoryListState.tfvcChangeSetsListItems[length - 1].item.changeList as TfsChangeList).changesetId - 1).toString();
        this.fetchChangesets(searchCriteria, true, top);
    }

    /**
    * Fetch changesets incase of branch, merge, rename changes
    */
    private _fetchExpandedChangesets(expandedChangeSetListItem: ChangeSetsListItem, expandedChangeSetId: number): IPromise<void> | undefined {
        if (!this.tfvcListSource) {
            return;
        }

        // calculate item version based on the changetype
        const changeTypePath = (expandedChangeSetListItem && expandedChangeSetListItem.item) ? expandedChangeSetListItem.item.serverItem : null;
        const childHistoryItemVersion = new VCSpecs.MergeSourceVersionSpec(
            expandedChangeSetListItem.item.changeList.version,
            VCOM.ChangeType.hasChangeFlag(expandedChangeSetListItem.item.itemChangeType, VersionControlChangeType.Rename)).toVersionString();

        this._delayAnnounceHelper.startAnnounce(VCResources.FetchingResultsText);
        this.invokers.historyItemsLoadStarted({ changesetId: expandedChangeSetId });

        return this.tfvcListSource.getChangeSets(this._calculateSearchCriteria(changeTypePath, childHistoryItemVersion)).then(
            changeSets => {

                if (changeSets && changeSets.results && changeSets.results[0]) {
                    const initialChangesetId = (changeSets.results[0].changeList as TfsChangeList).changesetId;
                    // In case requested change type is rename, results contain the requested changeset as first item, omit it.
                    if (initialChangesetId === expandedChangeSetId) {
                        changeSets.results.splice(0, 1);
                    }
                }

                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText);
                this.invokers.historyItemsLoaded({ historyList: changeSets, changesetId: expandedChangeSetId });
            },
            error => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText, true);
                this.invokers.historyItemsLoadFailed({ error: error, changesetId: expandedChangeSetId });
            });
    }

    private _calculateSearchCriteria(path?: string, itemVersion?: string, newCriteria?: ChangesetsFilterSearchCriteria): ChangeListSearchCriteria {
        const itemPath = path || this.getAggregateState().path;
        const filterCriteria = newCriteria || this.getAggregateState().tfvcHistoryFilterState;

        const restCriteria = $.extend({}, filterCriteria, { itemPath, itemVersion }) as ChangeListSearchCriteria;
        restCriteria.user = filterCriteria.userId || filterCriteria.userName;

        return restCriteria;
    }
}

 export function isCriteriaEqual(a: ChangesetsFilterSearchCriteria, b: ChangesetsFilterSearchCriteria): boolean {
    return (
        a.fromDate == b.fromDate &&
        a.toDate == b.toDate &&
        a.userId == b.userId &&
        a.toVersion == b.toVersion &&
        a.fromVersion == b.fromVersion);
}
