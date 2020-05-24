import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as EventsServices from "VSS/Events/Services";
import * as SearchEvents from "Search/Scenarios/Shared/Events";
import * as _ContributedSearchTab from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { ActionsHub, IEntityResultCount, ResultsCountPayLoad } from "Search/Scenarios/Hub/Flux/ActionsHub";
import { AggregatedState } from "Search/Scenarios/Hub/Flux/StoresHub";
import { ProvidersContributionSource } from "Search/Scenarios/Hub/Flux/Sources/ContributionSource";
import { ResultsCountSource } from "Search/Scenarios/Hub/Flux/Sources/ResultsCountSource";
import { ContributionIds } from "Search/Scenarios/Hub/Contributions";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { IPivotStateService, PivotStateService } from "Search/Scenarios/Shared/Base/PivotStateService";
import { getService } from "VSS/Service";
import { deserialize } from "Search/Scenarios/Shared/Utils";

export interface CountQuery {
    [entityId: string]: _SearchSharedLegacy.CountRequest;
}

export interface Sources {
    contributions: ProvidersContributionSource;

    resultsCount: ResultsCountSource;
}

export class ActionCreator {
    private innerPromise: IPromise<void>;
    private readonly tabStateProviderService: IPivotStateService;

    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly sources: Sources,
        private readonly pageContext: Object,
        private getAggregatedState: () => AggregatedState,
        private onFullScreen: (isFullScreen: boolean) => void
    ) {
        this.innerPromise = Promise.resolve();
        EventsServices.getService().attachEvent(SearchEvents.ENTITY_SEARCH_STARTED, this.onSearchStarted);
        EventsServices.getService().attachEvent(SearchEvents.ENTITY_SEARCH_COMPLETED, this.onSearchCompleted);
        EventsServices.getService().attachEvent(SearchEvents.ENTITY_SEARCH_FAILED, this.onSearchCompleted);
        this.tabStateProviderService = getService<PivotStateService>(PivotStateService);
    }

    public intializePage = (rawState: any): void => {
        const searchEntityType: string = rawState.type;
        const isProjectContext = TfsContext.getDefault().navigation.topMostLevel >= NavigationContextLevels.Project;

        this.sources
            .contributions
            .getSearchProviders()
            .then((providers: Contributions_Contracts.Contribution[]) => {
                const providerId = getEntityId(searchEntityType, providers) || providers[0].id;
                this.actionsHub.contributedSearchTabsLoaded.invoke({ providers, selectedProviderId: providerId });
                this.sources
                    .contributions
                    .getProviderService(providerId, false, isProjectContext, this.pageContext, this.onFullScreen)
                    .then((provider: _ContributedSearchTab.ContributedSearchTab) => {
                        this.intializeProvider(provider);
                        this.actionsHub.providerImplementationLoaded.invoke({ provider, providerId });
                    },    (error) => {
                        this.actionsHub.providerImplementationLoadFailed.invoke({ providerId, error })
                    })
            },    (error) => {
                this.actionsHub.contributedSearchTabsLoadFailed.invoke({ error })
            });
    }

    public changeSearchProvider = (providerId: string): void => {
        const aggregatedState = this.getAggregatedState();
        const selectedTabId = aggregatedState.selectedTabId;
        const currentActiveProvider = aggregatedState.provider;

        if (providerId !== selectedTabId) {
            this.actionsHub.providerImplementationChangeStarted.invoke({ providerId });
            const isProjectContext = TfsContext.getDefault().navigation.topMostLevel >= NavigationContextLevels.Project;

            this.sources
                .contributions
                .getProviderService(providerId, true, isProjectContext, this.pageContext, this.onFullScreen)
                .then((provider: _ContributedSearchTab.ContributedSearchTab) => {
                    // Dispose current provider only when the new provider is loaded successfully
                    this.disposeProvider(currentActiveProvider);
                    this.intializeProvider(provider);
                    this.actionsHub.providerImplementationLoaded.invoke({ provider, providerId });
                },    (error) => {
                    this.actionsHub.providerImplementationLoadFailed.invoke({ providerId, error })
                });
        }
    }

    public navigateToProvider = (rawState: any): void => {
        const { provider } = this.getAggregatedState();
        if (provider) {
            provider.navigate(rawState);
        }
    }

    public disposeProvider = (provider: _ContributedSearchTab.ContributedSearchTab): void => {
        if (provider) {
            provider.dispose();
        }
    }
    
    public dispose = (): void => {
        EventsServices.getService().detachEvent(SearchEvents.ENTITY_SEARCH_STARTED, this.onSearchStarted);
        EventsServices.getService().detachEvent(SearchEvents.ENTITY_SEARCH_COMPLETED, this.onSearchCompleted);
        EventsServices.getService().detachEvent(SearchEvents.ENTITY_SEARCH_FAILED, this.onSearchCompleted);
    }

   /**
    * This method updates the pivot count of all the tabs except the count of selected tab.
    * It is made public for testing purpose.
    */
    public refreshInActiveTabPivotCounts = (evtData: SearchEvents.ISearchStartedPayload, isProjectContext: boolean): void => {
            const { availableTabs, selectedTabId } = this.getAggregatedState();
            const tabsContributionInfo = availableTabs.map(tab => tab.contributionInfo);
            const entityIds: string[] = tabsContributionInfo
                .map(contributionInfo => contributionInfo.id)
                .filter(id => id !== selectedTabId && this.isCountRefreshNeeded(id, evtData.searchText));

            const defaultFilters = (isProjectContext ? evtData.searchFilters : {});
            const countRequest = this.createCountRequest(entityIds, evtData.searchText, defaultFilters);

            const resultCountPromises: IPromise<_SearchSharedLegacy.CountResponse>[] =
                    entityIds.map(entityId => {
                        if (isExtensionStatusPivot(entityId)) {
                            // if the pivot is for showing extension status, we return count as 0
                            // no need to make api call here.
                            return Promise.resolve({
                                count: 0,
                                errors: [],
                                isEntityActive: false,
                                relationFromExactCount: _SearchSharedLegacy.RelationFromExactCount.Equals,
                            });
                        }
                        else {
                            return this.sources
                                .resultsCount
                                .getResultsCount(countRequest[entityId], getEntityUrlParam(entityId, tabsContributionInfo));
                        }
                    });

            Promise
                .all(resultCountPromises)
                .then((countResponses: _SearchSharedLegacy.CountResponse[]) => {
                    const entityResults: IEntityResultCount[] = [];
                    for (let i = 0; i < entityIds.length; i++) {
                        const { count, relationFromExactCount } = countResponses[i];
                        entityResults.push({ entityId: entityIds[i], count, relationFromExactCount, isEntityActive: false });
                    }
                    this.actionsHub.inactiveEntityResultsCountReceived.invoke({ entityResults });
                },    (error: any) => {
                    this.actionsHub.inactiveEntityReceiveResultsCountFailed.invoke({ error: error, isActiveEntity: false });
                });
    }

    private isCountRefreshNeeded = (providerContributionId: string, text: string): boolean => {
        const state = this.tabStateProviderService.getState(providerContributionId);

        if (state && state.countState) {
            return state.countState.searchtext!== text;
        }
        return true;
    }

    public createCountRequest = (
        entityIds: string[],
        searchText: string,
        defaultFilters: { [key: string]: string[] }
    ): CountQuery => {
        let countRequest: CountQuery = {};

        for (let id in entityIds) {
            const storedState = this.tabStateProviderService.getState(entityIds[id]);
            const searchFilters: { [key: string] : string[] } = (storedState && storedState.filtersString) ? deserialize(storedState.filtersString) : defaultFilters;
            countRequest[entityIds[id]] = { searchFilters, searchText };
        }

        return countRequest;
    }

    /**
    * This method updates the pivot count of currently active tab.
    * It is made public for testing purpose.
    */
    public refreshActiveTabPivotCount = (evtData: SearchEvents.ISearchResultsPayload, selectedTabId: string): void => {
            if (evtData.resultsCount === undefined) {
                this.actionsHub.activeEntityReceiveResultsCountFailed.invoke({ error: undefined, isActiveEntity: true });
            }
            else {
                const entityResults: IEntityResultCount[] = [{
                    entityId: selectedTabId,
                    count: evtData.resultsCount,
                    relationFromExactCount: _SearchSharedLegacy.RelationFromExactCount.Equals,
                    isEntityActive: true
                }];
                this.tabStateProviderService.resetCountState(evtData.searchText);
                this.actionsHub.activeEntityResultsCountReceived.invoke({ entityResults });
            }
    }

    private onSearchCompleted = (sender: any, evtData: SearchEvents.ISearchResultsPayload): void => {
        const { selectedTabId } = this.getAggregatedState();
        this.refreshActiveTabPivotCount(evtData, selectedTabId);
    }

    private intializeProvider = (provider: _ContributedSearchTab.ContributedSearchTab): void => {
        if (provider) {
            provider.initialize();
        }
    }

    public onSearchStarted = (sender: any, evtData: SearchEvents.ISearchStartedPayload): void => {
        const isProjectContext: boolean = TfsContext.getDefault().navigation.topMostLevel >= NavigationContextLevels.Project
        // Do not fire a count request if it is a landing page
        if (!evtData.isLandingPage) {
            this.refreshInActiveTabPivotCounts(evtData, isProjectContext);
        }
    }
}

export function getEntityId(type: string, contributions: Contribution[]): string {
    if (typeof type !== "undefined" && contributions.length) {
        const requiredContribution = contributions.filter(c => {
            const urlParamLowerCase: string[] = c.properties.urlParam && c.properties.urlParam.map(u => u.toLowerCase());
            return urlParamLowerCase.indexOf(type.toLowerCase()) >= 0;
        })[0];

        return requiredContribution ? requiredContribution.id : undefined;
    }
}

function getEntityUrlParam(id: string, contributions: Contribution[]): string {
    return contributions.filter(c => c.id === id)[0].properties.urlParam[0];
}

function isExtensionStatusPivot(entityId: string): boolean {
    return (entityId === ContributionIds.ExtensionStatusContributionId);
}