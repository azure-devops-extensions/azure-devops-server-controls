import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { Store } from "VSS/Flux/Store";
import { QuerySearchStatus } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryHierarchyItem, QueryHierarchyItemsResult } from "TFS/WorkItemTracking/Contracts";
import Telemetry = require("VSS/Telemetry/Services");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import Utils_String = require("VSS/Utils/String");

/**
 * Query search data provider
 */
export interface IQuerySearchDataProvider {
    /**
     * Gets the status of the store.
     */
    getSearchStatus(): QuerySearchStatus;

    /**
     * Gets the current search text
     */
    getSearchText(): string;
}

export class QuerySearchStore extends Store implements IQuerySearchDataProvider {

    private readonly _emptySearchResult: QueryHierarchyItemsResult = { value: [], count: 0, hasMore: false };
    private _searchResults: QueryHierarchyItemsResult = this._emptySearchResult;
    private _searchStatus: QuerySearchStatus = QuerySearchStatus.None;
    private _searchText: string;

    constructor(actions: ActionsHub) {
        super();

        actions.SearchTextChanged.addListener((searchText) => {
            this._searchText = searchText && searchText.trim() ? searchText.trim() : null;
            this._searchResults = this._emptySearchResult;
            this._searchStatus = searchText && searchText.trim() ? QuerySearchStatus.Pending : QuerySearchStatus.None;
            this.emitChanged();
        });

        actions.QuerySearchStarted.addListener(() => {
            this._searchStatus = QuerySearchStatus.InProgress;
            this.emitChanged();
        });

        actions.QuerySearchFinished.addListener((searchResult) => {
            this._searchStatus = QuerySearchStatus.ResultsReady;
            this._searchResults = searchResult;

            if (searchResult) {
                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        CIConstants.WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                        CIConstants.WITCustomerIntelligenceFeature.QUERY_SEARCH,
                        {
                            "searchText": this._searchText || "",
                            "resultCount": searchResult.count || 0,
                            "hasMoreResults": searchResult.hasMore || false
                        }));
            }

            this.emitChanged();
        });
    }

    public getResults(): QueryHierarchyItem[] {
        return this.sortQueries(this._searchResults.value);
    }

    public hasMoreResults(): boolean {
        return this._searchResults.hasMore;
    }

    public getSearchStatus(): QuerySearchStatus {
        return this._searchStatus;
    }

    public getSearchText(): string {
        return this._searchText;
    }
    
    private sortQueries(queries: QueryHierarchyItem[]): QueryHierarchyItem[] {
        return queries.sort((x: QueryHierarchyItem, y: QueryHierarchyItem) => {
            if (x.isPublic && !y.isPublic) {
                return 1;
            } else if (!x.isPublic && y.isPublic) {
                return -1;
            } else {
                return Utils_String.ignoreCaseComparer(x.path, y.path);
            }
        });
    }

}
