import * as VSSStore from "VSS/Flux/Store";

import {ISearchProvidersPayload} from "Search/Scripts/React/ActionsHub";
import {SearchProvider} from "Search/Scripts/React/Models";
import * as Models from "Search/Scripts/React/Models";
import * as SearchResources from "Search/Scripts/Resources/TFS.Resources.Search";

interface ISearchProvidersStoreState extends ISearchProvidersPayload {}

const SEARCH_PROVIDER_TO_DISPLAY_NAME: IDictionaryNumberTo<string> = {};
SEARCH_PROVIDER_TO_DISPLAY_NAME[SearchProvider.code] = SearchResources.CodeEntityName;
SEARCH_PROVIDER_TO_DISPLAY_NAME[SearchProvider.workItem] = SearchResources.WorkItemEntityNameV2;
SEARCH_PROVIDER_TO_DISPLAY_NAME[SearchProvider.wiki] = SearchResources.WikiEntityName;

export const SEARCH_PROVIDER_TO_ENTITY_ID: IDictionaryStringTo<string> = {};
SEARCH_PROVIDER_TO_ENTITY_ID[SearchProvider.code] = Models.SearchEntitiesIds.code;
SEARCH_PROVIDER_TO_ENTITY_ID[SearchProvider.workItem] = Models.SearchEntitiesIds.workItem;
SEARCH_PROVIDER_TO_ENTITY_ID[SearchProvider.wiki] = Models.SearchEntitiesIds.wiki;

export class SearchProvidersStore extends VSSStore.Store {
    private state = {
        availableProviders: [],
    } as ISearchProvidersStoreState;

    public updateSearchProviders = (payload: ISearchProvidersPayload): void => {
        this.state.availableProviders = payload.availableProviders;
        this.state.currentProvider = payload.currentProvider;
        this.emitChanged();
    }

    public get ProviderTabs(): Models.SearchPivotTabItem[] {
        return this.state.availableProviders.map((provider: SearchProvider) => {
            return SEARCH_PROVIDER_TO_DISPLAY_NAME[provider] && {
                title: SEARCH_PROVIDER_TO_DISPLAY_NAME[provider],
                tabKey: provider.toString(),
                entityId: SEARCH_PROVIDER_TO_ENTITY_ID[provider]
            } as Models.SearchPivotTabItem;
        }).filter((tab) => {
            return !!tab;
        });
    }

    public get CurrentProviderTab(): Models.SearchPivotTabItem {
        return typeof this.state.currentProvider !== "undefined" &&
            SEARCH_PROVIDER_TO_DISPLAY_NAME[this.state.currentProvider] && {
                title: SEARCH_PROVIDER_TO_DISPLAY_NAME[this.state.currentProvider],
                tabKey: this.state.currentProvider.toString(),
                entityId: SEARCH_PROVIDER_TO_ENTITY_ID[this.state.currentProvider]
            } as Models.SearchPivotTabItem;
    }

    public get CurrentProvider(): Models.SearchProvider {
        return this.state.currentProvider;
    }
}