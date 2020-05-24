import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ResultsCountSource } from "Search/Scenarios/Hub/Flux/Sources/ResultsCountSource";
import { ActionsHub, IEntityResultCount } from "Search/Scenarios/Wiki/ActionsHub";
import { ContributionsSource } from "Search/Scenarios/Wiki/Sources/ContributionsSource";
import { WikiSearchSource } from "Search/Scenarios/Wiki/Sources/WikiSearchSource";
import { AggregateState } from "Search/Scenarios/Wiki/Stores/StoresHub";
import { entityIdsToUrlEntityTypeMap } from "Search/Scenarios/Wiki/WikiSearchConstants";
import { InfoCodes, WikiSearchRequest, WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { CountRequest, CountResponse, ErrorData, RelationFromExactCount } from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { SearchEntitiesIds } from "Search/Scripts/React/Models";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";

const defaultMaxResults = 50;

export interface Sources {
    wikiSearch: WikiSearchSource;
    contributions: ContributionsSource;
    countSource: ResultsCountSource;
}

export class ActionCreator {
    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly sources: Sources,
        private readonly getAggregateState: () => AggregateState
    ) { }

    public loadInitialState = (context: TfsContext): void => {
        this.sources.contributions.getSearchProviders().then(
            tabs => { this.actionsHub.tabsLoaded.invoke({ availableTabs: tabs }); });

        this.actionsHub.contextUpdated.invoke({ tfsContext: context });
    }

    public performSearch = (
        searchText: string,
        searchFilters: { [key: string]: string[]; },
        tab?: string,
        loadMoreResults?: boolean,
    ): void => {
        const { searchState, contributionsState } = this.getAggregateState();

        const currentTab = tab || contributionsState.currentTab;

        if (tab && (currentTab !== contributionsState.currentTab)) {
            this.actionsHub.tabChanged.invoke({ tab: currentTab });
        }

        if (currentTab !== SearchEntitiesIds.wiki) {
            return;
        }

        searchText = searchText && searchText.trim();
        if (!searchText) {
            return;
        }

        searchText = searchText.trim();

        this.actionsHub.searchStarted.invoke({
            searchText: searchText,
            tab: currentTab,
            searchFilters: searchFilters,
            isLoadMore: loadMoreResults
        });

        const skip = loadMoreResults
            ? searchState &&
            searchState.searchResponse &&
            searchState.searchResponse.results.length
            : 0;

        const query = {
            $orderBy: null,
            searchText: searchText,
            $skip: skip,
            $top: defaultMaxResults,
            filters: searchFilters
        } as WikiSearchRequest;

        this.sources.wikiSearch.getWikiSearchResults(query).then(
            results => this._onSearchSucceded(query, results, loadMoreResults),
            error => this._onSearchFailed(error));
    }

    public changeTab = (tab: string): void => {
        const { searchState, contributionsState } = this.getAggregateState();

        if(tab && tab === contributionsState.currentTab) {
            return;
        }

        this.performSearch(searchState.searchText, searchState.searchFilters, tab);
    }

    public fetchMoreItems = (): void => {
        const { searchState: { searchText, searchFilters, searchResponse }, contributionsState: { currentTab } } = this.getAggregateState();
        const loadMoreResults = true;
        this.performSearch(searchText, searchFilters, currentTab, loadMoreResults);
    }

    public updatePivotCountForAllEntities = (): void => {
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessSearchEnableNewRoute)) {
            return;
        }

        const isProjectContext = TfsContext.getDefault().navigation.topMostLevel >= NavigationContextLevels.Project,
            { searchState } = this.getAggregateState(),
            countRequest: CountRequest = {
                searchFilters: isProjectContext ? searchState.searchFilters : {},
                searchText: searchState.searchText
            };

        const activeEntity = entityIdsToUrlEntityTypeMap[SearchEntitiesIds.wiki];

        const contributionsState = this.getAggregateState().contributionsState;

        if (contributionsState && contributionsState.tabItems) {
            const entityList: string[] = contributionsState.tabItems.map(tab => tab.tabKey);
            this.fireResultCountForAllEntities(countRequest, activeEntity, entityList);
        } else {
            this.sources.contributions.getSearchProviders().then(
                tabs => {
                    const entityList: string[] = tabs.map(tab => tab.toLowerCase());
                    this.fireResultCountForAllEntities(countRequest, activeEntity, entityList);
                });
        }
    }

    private fireResultCountForAllEntities = (countRequest: CountRequest, activeEntity: string, availableEntities: string[]): void => {
        const resultCountPromises: IPromise<CountResponse>[] = availableEntities.map(entity => {
            if (ignoreCaseComparer(entity, activeEntity) !== 0) {
                return this.sources.countSource.getResultsCount(countRequest, entityIdsToUrlEntityTypeMap[entity]);
            }
            else {
                const searchErrorCode = this.getAggregateState().searchState.errorCode;
                // Results count for currently active entity is already available,
                // no need to make api call here.
                return Promise.resolve({
                    count: searchErrorCode !== 0 ? undefined : this.getAggregateState().searchState.searchResponse.count,
                    errors: searchErrorCode !== 0 ? [{ errorCode: InfoCodes[searchErrorCode] } as ErrorData]: [],
                    relationFromExactCount: RelationFromExactCount.Equals,
                });
            }
        });

        Promise.all(resultCountPromises)
            .then((countResponses: CountResponse[]) => {
                let countResults: IEntityResultCount[] = [];
                for (let i = 0; i < availableEntities.length; i++) {
                    const isActiveEntity = ignoreCaseComparer(availableEntities[i], activeEntity) === 0,
                        { count, relationFromExactCount } = countResponses[i];
                    countResults.push({ entityName: availableEntities[i], count, relationFromExactCount });
                }

                this.actionsHub.resultsCountLoaded.invoke({ entityResults: countResults });
            },
            (error) => {
                this.actionsHub.resultsCountFailed.invoke(error);
            });
    }

    private _onSearchSucceded = (query: WikiSearchRequest, results: WikiSearchResponse, isLoadMore: boolean): void => {
        this.actionsHub.searchResultsLoaded.invoke({
            query: query,
            response: results,
            isLoadMore: isLoadMore
        });

        this.updatePivotCountForAllEntities();
    }

    private _onSearchFailed = (error): void => {
        this.actionsHub.searchFailed.invoke(error);
        this.updatePivotCountForAllEntities();
    }
}