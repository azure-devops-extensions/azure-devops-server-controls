import * as BaseFilterStore from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import * as _Filter from "SearchUI/Utilities/Filter";

import { ResultsLoadedPayload } from "Search/Scenarios/Shared/Base/ActionsHubV2";
import { areQueriesEqual } from "Search/Scenarios/WikiV2/WikiUtils";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { WikiSearchRequest, WikiSearchResponse, WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";

export class FilterStore extends BaseFilterStore.FilterStore {
    constructor(private isProjectContext: boolean, filter: _Filter.Filter, projectName: string) {
        super(filter);

        const defaultState = {};

        this._state.filter.setDefaultState(defaultState);
        this._state.filterItems = this.filterItems;
    }

    public updateFilters = (searchQuery: WikiSearchRequest, responsePayLoad: ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): void => {
        if (areQueriesEqual(searchQuery, responsePayLoad.request)) {
            const facets = responsePayLoad.response.facets || {};
            Object.keys(facets).forEach(k => {
                this._state.filterItems[k].enabled = true;
            });

            const filterState = this.getFilterState(this._state.filterItems, searchQuery);

            this._state.filter.setState(filterState, true);

            this.emitChanged();
        }
    }

    private getFilterState(
        filterItems: IDictionaryStringTo<BaseFilterStore.FilterItem>,
        request: WikiSearchRequest): _Filter.IFilterState {
        let state: _Filter.IFilterState = {} as _Filter.IFilterState;

        Object.keys(filterItems)
            .forEach(k => {
                let value: string[];

                if (filterItems[k].enabled) {
                    if (filterItems[k].filterType === BaseFilterStore.FilterType.PickList) {
                        value = request.filters[k];
                    }

                    state[k] = { value: value } as _Filter.IFilterItemState;
                }
            });

        return state;
    }

    private get filterItems(): IDictionaryStringTo<BaseFilterStore.FilterItem> {
        return {
            [SearchConstants.ProjectFilterNew]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: !this.isProjectContext
            },
            [SearchConstants.WikiFacet]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: true
            }
        };
    }

    private resetFilterItems(filterItems: IDictionaryStringTo<BaseFilterStore.FilterItem>): void {
        Object.keys(filterItems).forEach(key => filterItems[key].enabled = false);
    }
}