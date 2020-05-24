import { ChangeListSearchCriteria } from 'TFS/VersionControl/Contracts';
import { TfvcActionsHub } from 'VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcActionsHub';
import { AggregateState, TfvcHistoryBridge, TfvcHistoryInvokers } from 'VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryBridge';
import { ChangesetsFilterSearchCriteria } from 'VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter';
import { ChangeSetsTelemetrySpy } from 'VersionControl/Scenarios/History/TfvcHistory/Sources/ChangeSetsTelemetrySpy';
import { TfvcHistoryListSource } from 'VersionControl/Scenarios/History/TfvcHistory/Sources/TfvcHistoryListSource';
import { TfvcChangeSetsStoresHub } from 'VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStoresHub';
import { ChangeSetsListItem, CriteriaChangedPayload } from 'VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces';
import { RepositoryContext } from 'VersionControl/Scripts/RepositoryContext';

export class TfvcHistoryActionCreator {
    private _historyListBridge: TfvcHistoryBridge;
    constructor(
        private _actionsHub: TfvcActionsHub,
        private _storeHub: TfvcChangeSetsStoresHub,
        private _repositoryContext: RepositoryContext,
        private _telemetrySpy?: ChangeSetsTelemetrySpy,
        private _tfvcListSource?: TfvcHistoryListSource,
    ) {
        const historyListInvokers: TfvcHistoryInvokers = {
            historyItemsLoadStarted: load => this._actionsHub.tfvcHistoryItemsLoadStarted.invoke(load),
            historyItemsLoaded: items => this._actionsHub.tfvcHistoryItemsLoaded.invoke(items),
            historyItemsLoadFailed: error => this._actionsHub.errorRaised.invoke(error),
            historyItemCollapsed: changesetId => this._actionsHub.changeTypeHistoryItemsCollapsed.invoke(changesetId),
            searchCriteriaChanged: filterCriteria => this._actionsHub.criteriaChanged.invoke(filterCriteria),
        }

        const getAggregateState = (): AggregateState => ({
            path: this._storeHub.getPathState().path,
            tfvcHistoryListState: this._storeHub.getChangeSetsPageState().changesetsState,
            tfvcHistoryFilterState: this._storeHub.getChangeSetsPageState().filterState,
            repositoryContext: this._storeHub.getChangeSetsPageState().repositoryContext
        });

        this._historyListBridge = new TfvcHistoryBridge(historyListInvokers, getAggregateState, this.tfvcListsource);
    }

    private get tfvcListsource(): TfvcHistoryListSource {
        if (!this._tfvcListSource) {
            this._tfvcListSource = new TfvcHistoryListSource((this._repositoryContext));
        }
        return this._tfvcListSource;
    }

    public clearAllErrors = (): void => {
        this._actionsHub.tfvcHistoryClearAllErrorsRaised.invoke(null);
    }

    public updateFilters = (searchCriteria: ChangesetsFilterSearchCriteria): void => {
        const itemPath = this._storeHub.getPathState().path;
        this.changeCriteria({ itemPath, ...searchCriteria });
    }

    public changeCriteria = (newCriteria: CriteriaChangedPayload): void => {
        let {itemPath, ...filterCriteria} = newCriteria;
        itemPath = this._normalizePath(itemPath, this._repositoryContext.getRootPath());
        this._historyListBridge.changeFilterCriteria(itemPath, filterCriteria);
    }

    /**
     * Load intial changesets
     */
    public loadChangesets = (newCriteria?: CriteriaChangedPayload): void => {

        const results = this.tfvcListsource.getChangeSetsDataFromJsonIsland();
        if (results) {
            this._actionsHub.tfvcHistoryItemsLoaded.invoke({ historyList: results.changesets });
            const searchCriteria = results.searchcriteria;
            if (searchCriteria) {
                const {itemPath, fromDate, toDate, fromVersion, toVersion, user} = searchCriteria;
                this._actionsHub.criteriaChanged.invoke({ itemPath, userId: user, fromVersion, toVersion, fromDate, toDate } as CriteriaChangedPayload);
            }
        }
        else {
            if (newCriteria) {
                newCriteria.itemPath = this._normalizePath(newCriteria.itemPath, this._repositoryContext.getRootPath());
                this._actionsHub.criteriaChanged.invoke(newCriteria);
            }

            this._historyListBridge.fetchChangesets(null, false);
        }
    }

    public fetchMoreChangesets = (top?: number): void => {
        this._historyListBridge.fetchMoreChangesets(top);
    }

    // This method isused only by TfvcHistory Viewer that is exposed to RM, Search and WIT dialog
    // This method gets called only once in case of RM and WIT, 
    // wheras from search it gets called each time a different file is chosen from the search results
    public fetchChangesets = (searchCriteria: ChangeListSearchCriteria): void => {
        const criteria = this._fillCriteriaChangedPayload(searchCriteria);
        const mergedSearchCriteria = this._mergeCriteria(criteria, searchCriteria);
        this._actionsHub.criteriaChanged.invoke(criteria);
        this._historyListBridge.fetchChangesets(mergedSearchCriteria);
    }

    public expandChangeSetHistory = (expandedChangeSetListItem: ChangeSetsListItem): void => {
        this._historyListBridge.expandChangeSetHistory(expandedChangeSetListItem);
    }

    public collapseChangeSetsHistory = (collapsedChangeSetListItem: ChangeSetsListItem): void => {
        this._historyListBridge.collapseChangeSetsHistory(collapsedChangeSetListItem);
    }

    public changeRepository = (): void => {
        this._actionsHub.currentRepositoryChanged.invoke({
            isGit: false,
            repositoryName: this._repositoryContext.getRootPath(),
            repositoryContext: this._repositoryContext
        });
    }

    public changePath = (itemPath: string): void => {
        if (this._storeHub.pathState.path === itemPath) {
            return;
        }

        const filters = this._storeHub.getFilterState();
        this.changeCriteria({ itemPath, ...filters });
    }

    public startPathEditing = (): void => {
        const tailoredPath = this._storeHub.pathState.path;
        this._actionsHub.pathEditingStarted.invoke(tailoredPath);
    }

    public editPathText = (text: string): void => {
        this._actionsHub.pathEdited.invoke(text);
    }

    public cancelPathEditing = (): void => {
        this._actionsHub.pathEditingCancelled.invoke(null);
    }

    public abortScenario = (): void =>
        this._telemetrySpy && this._telemetrySpy.abortScenario();

    public notifyContentRendered = (splitTimingName: string): void =>
        this._telemetrySpy && this._telemetrySpy.notifyContentRendered(splitTimingName);

    public flushErrorNotification = (): void => {
        this._actionsHub.errorFlushed.invoke(null);
    }

    public raiseError = (error: Error): void => {
        this._actionsHub.errorRaised.invoke({ error });
    }

    // creates criteria changed payload based on the filter state and searchcriteria
    private _fillCriteriaChangedPayload(searchCriteria: ChangeListSearchCriteria): CriteriaChangedPayload {
        const filterState = this._storeHub.getChangeSetsPageState().filterState;
        const criteria = {
            itemPath: searchCriteria.itemPath || this._storeHub.getPathState().path,
            userName: searchCriteria.user || filterState.userName,
            userId: searchCriteria.user || filterState.userId,
            fromDate: searchCriteria.fromDate || filterState.fromDate,
            toDate: searchCriteria.toDate || filterState.toDate,
            fromVersion: searchCriteria.fromVersion || filterState.fromVersion,
            toVersion: searchCriteria.toVersion || filterState.toVersion,
        } as CriteriaChangedPayload;

        return criteria;
    }

    // updates the searchCriteria based on the current criteria in filter state
    private _mergeCriteria(criteria: CriteriaChangedPayload, searchCriteria: ChangeListSearchCriteria): ChangeListSearchCriteria {
        const mergedSearchCriteria = $.extend({}, searchCriteria, criteria) as ChangeListSearchCriteria;
        mergedSearchCriteria.user = searchCriteria.user || criteria.userId || criteria.userName;
        return mergedSearchCriteria;
    }

    private _normalizePath(path: string, rootPath: string): string {
        if (!path) {
            return rootPath;
        }

        if (path === "$") {
            path = "$/"; //incase of collection root level, pass the right path
        }

        const pathSeparator = "/";
        path = path.replace(/[\/\\]+/g, pathSeparator);

        return path;
    }
}

