import * as BaseFilterStore from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _Filter from "SearchUI/Utilities/Filter";
import { WorkItemSearchRequest, WorkItemSearchResponse } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { areQueriesEqual } from "Search/Scenarios/WorkItem/Utils";

export class FilterStore extends BaseFilterStore.FilterStore {
    constructor(private isProjectContext: boolean, private isMember: boolean, private isAssignedToEnabled: boolean, filter: _Filter.Filter, projectName: string) {
        super(filter);

        const defaultState = isProjectContext ? {
            [Constants.FilterKeys.ProjectFiltersKey]: {
                value: [projectName]
            }
        } : {};

        this._state.filter.setDefaultState(defaultState);
        this._state.filterItems = this.filterItems;
    }

    public updateFilters = (searchQuery: WorkItemSearchRequest, response: WorkItemSearchResponse): void => {
        if (areQueriesEqual(searchQuery, response.query)) {
            const filterCategories: _SearchSharedContracts.FilterCategory[] = response.filterCategories || [];
            this.resetFilterItems(this._state.filterItems);
            filterCategories.forEach((category, index) => { this._state.filterItems[category.name].enabled = true; });

            const projectFilterCategory = filterCategories.filter(c => c.name === Constants.FilterKeys.ProjectFiltersKey),
                selectedProjects = projectFilterCategory.length ? projectFilterCategory[0].filters.filter(f => f.selected) : [];

            if (selectedProjects.length === 1) {
                this._state.filterItems[Constants.FilterKeys.AreaPathsFilterKey].enabled = true;
            }

            const filterState = this.getFilterState(this._state.filterItems, searchQuery, response);

            this._state.filter.setState(filterState, true);

            this.emitChanged();
        }
    }

    private getFilterState(
        filterItems: IDictionaryStringTo<BaseFilterStore.FilterItem>,
        query: WorkItemSearchRequest,
        response: WorkItemSearchResponse): _Filter.IFilterState {
        let state: _Filter.IFilterState = {} as _Filter.IFilterState;

        Object.keys(filterItems)
            .forEach(k => {
                let value: string[];

                if (filterItems[k].enabled) {
                    if (filterItems[k].filterType === BaseFilterStore.FilterType.PickList) {
                        value = response
                            .filterCategories
                            .filter(c => c.name === k)[0]
                            .filters
                            .filter(f => f.selected)
                            .map(f => f.id);
                    }
                    else if (filterItems[k].filterType === BaseFilterStore.FilterType.Path) {
                        value = query.searchFilters[k];
                    }

                    state[k] = { value: value } as _Filter.IFilterItemState;
                }
            });

        return state;
    }

    private get filterItems(): IDictionaryStringTo<BaseFilterStore.FilterItem> {

        return {
            [Constants.FilterKeys.ProjectFiltersKey]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: !this.isProjectContext
            },
            [Constants.FilterKeys.AreaPathsFilterKey]: {
                filterType: BaseFilterStore.FilterType.Path,
                enabled: false,
                visible: true
            },
            [Constants.FilterKeys.WorkItemTypesFiltersKey]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: true
            },
            [Constants.FilterKeys.StateFiltersKey]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: true
            },
            [Constants.FilterKeys.AssignedToFiltersKey]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: this.isMember || this.isAssignedToEnabled
            }
        };
    }

    private resetFilterItems(filterItems: IDictionaryStringTo<BaseFilterStore.FilterItem>): void {
        Object.keys(filterItems).forEach(key => filterItems[key].enabled = false);
    }
}
