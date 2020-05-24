import * as BaseFilterStore from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _Filter from "SearchUI/Utilities/Filter";
import { CodeQueryResponse, SearchQuery } from "Search/Scenarios/WebApi/Code.Contracts";
import { areQueriesEqual } from "Search/Scenarios/Code/Utils";

export class FilterStore extends BaseFilterStore.FilterStore {    
    constructor(filter: _Filter.Filter, private isProjectContext: boolean, projectName: string) {
        super(filter);
        const defaultState = this.defaultState(isProjectContext, projectName);
        this._state.filter.setDefaultState(defaultState);
        this._state.filterItems = this.filterItems;
    }

    public updateFilters = (searchQuery: SearchQuery, response: CodeQueryResponse): void => {
        // Update filters only when the response is legit.
        if (areQueriesEqual(searchQuery, response.query)) {
            const filterCategories: _SearchSharedContracts.FilterCategory[] = response.filterCategories || [];
            this.resetFilterItems(this._state.filterItems);
            filterCategories.forEach((category, index) => { this._state.filterItems[category.name].enabled = true; });

            const projectFilterCategory = filterCategories.filter(c => c.name === Constants.FilterKeys.ProjectFiltersKey),
                selectedProjects = projectFilterCategory.length ? projectFilterCategory[0].filters.filter(f => f.selected) : [],
                repositoryFilterCategory = filterCategories.filter(c => c.name === Constants.FilterKeys.RepositoryFiltersKey),
                selectedRepos = repositoryFilterCategory.length ? repositoryFilterCategory[0].filters.filter(f => f.selected) : [],
                branchFilterCategory = filterCategories.filter(c => c.name === Constants.FilterKeys.BranchFiltersKey),
                selectedBranch = branchFilterCategory.length ? branchFilterCategory[0].filters.filter(f => f.selected) : [];

            if (selectedProjects.length === 1 &&
                selectedRepos.length === 1 &&
                selectedBranch.length <= 1) {
                this._state.filterItems[Constants.FilterKeys.PathFiltersKey].enabled = true;
            }

            const filterState = this.getFilterState(this._state.filterItems, searchQuery, response);

            this._state.filter.setState(filterState, true);

            this.emitChanged();
        }
    }

    private getFilterState(
        filterItems: IDictionaryStringTo<BaseFilterStore.FilterItem>,
        query: SearchQuery,
        response: CodeQueryResponse): _Filter.IFilterState {
        let state = {} as _Filter.IFilterState;

        Object.keys(filterItems)
            .forEach(k => {
                let value: string[];

                if (filterItems[k].enabled) {
                    if (filterItems[k].filterType === BaseFilterStore.FilterType.PickList ||
                        filterItems[k].filterType === BaseFilterStore.FilterType.Branch) {
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
            [Constants.FilterKeys.RepositoryFiltersKey]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: true
            },
            [Constants.FilterKeys.BranchFiltersKey]: {
                filterType: BaseFilterStore.FilterType.Branch,
                enabled: false,
                visible: true
            },
            [Constants.FilterKeys.PathFiltersKey]: {
                filterType: BaseFilterStore.FilterType.Path,
                enabled: false,
                visible: true
            },
            [Constants.FilterKeys.CodeTypeFiltersKey]: {
                filterType: BaseFilterStore.FilterType.PickList,
                enabled: false,
                visible: true
            }
        }
    }

    private resetFilterItems(filterItems: IDictionaryStringTo<BaseFilterStore.FilterItem>): void {
        Object.keys(filterItems).forEach(key => filterItems[key].enabled = false);
    }

    private defaultState = (isProjectContext: boolean, projectName: string): _Filter.IFilterState => {
        return isProjectContext ? {
            [Constants.FilterKeys.ProjectFiltersKey]: {
                value: [projectName]
            }
        } : {};
    }
}