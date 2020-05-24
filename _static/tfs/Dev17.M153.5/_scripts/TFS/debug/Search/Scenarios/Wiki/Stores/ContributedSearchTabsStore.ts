import * as VSSStore from "VSS/Flux/Store";
import { ResultsCountPayLoad, IEntityResultCount } from "Search/Scenarios/Wiki/ActionsHub";
import { PivotTabItem, getSearchEntities, SearchEntity, SearchEntitiesIds, getSearchEntitiesMap } from "Search/Scripts/React/Models";
import { SearchStartedPayload, SearchResultsLoadedPayload, TabChangedPayload, TabsLoadedPayload } from "Search/Scenarios/Wiki/ActionsHub";

export interface ContributedSearchTabsStoreState {
    tabItems: PivotTabItem[];

    countResults: { [key: string]: IEntityResultCount };

    currentTab: string;

    isLoadingTabs: boolean;
}

export class ContributedSearchTabsStore extends VSSStore.Store {
    private _state : ContributedSearchTabsStoreState = {
        currentTab: SearchEntitiesIds.wiki,
        isLoadingTabs: true
    } as ContributedSearchTabsStoreState;

    public get state(): ContributedSearchTabsStoreState {
        return this._state;
    }
    
    public onContributionsLoaded = (payload: TabsLoadedPayload): void => {
        this._state = {
            ...this._state,
            tabItems: getAvailableTabs(payload.availableTabs),
            isLoadingTabs: false
        };

        this.emitChanged();
    }

    public changeTab = (payload: TabChangedPayload): void => {
        this._state = {
            ...this.state,
            currentTab: payload.tab
        };

        this.emitChanged();
    }

    public onResultsCountLoaded = (payload: ResultsCountPayLoad): void => {
        const countResults: { [key: string]: IEntityResultCount; } = {};

        if(payload && payload.entityResults) {
            for (const entity of payload.entityResults)
            {
                countResults[entity.entityName] = entity;
            }
        }

        this._state = {
            ...this.state,
            countResults: countResults
        };

        this.emitChanged();
    }

    public onResultsCountFailed = (error: any): void => {
        this._state = {
            ...this.state,
            countResults: undefined
        };
    
        this.emitChanged();
    }
}

function getAvailableTabs(tabIds: string[]): PivotTabItem[] {
    const searchEntities = getSearchEntitiesMap();
    return (tabIds || [])
        .map(tabId => tabId.toLowerCase())
        .map(tabId => searchEntities[tabId] && createTabItems(searchEntities[tabId]));
}

function createTabItems(entity: SearchEntity): PivotTabItem {
    return { tabKey: entity.entity, title: entity.displayName } as PivotTabItem ;
}
