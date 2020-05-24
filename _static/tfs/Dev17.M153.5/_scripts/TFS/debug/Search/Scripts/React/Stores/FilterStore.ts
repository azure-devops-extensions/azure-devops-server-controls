import * as VSSStore from  "VSS/Flux/Store";
import {ignoreCaseComparer} from "VSS/Utils/String";
import { searchFilterCategories, filterCategoryCreators, isFilterCategoryEnabled } from "Search/Scripts/React/Common";
import { UserPreferences } from "Search/Scripts/UserPreferences/TFS.Search.UserPreferences";
import * as Models from "Search/Scripts/React/Models";

export interface IFilterStoreState {
    filters: any[],
    visible: boolean
}

const FILTER_VISIBILITY_PREF_KEY: string = "vss-search-platform/v2layout/FilterPaneToggleState";

export class FilterStore extends VSSStore.Store {
    private state: IFilterStoreState;

    constructor() {
        super();

        let hidden = UserPreferences.getUserPreference(FILTER_VISIBILITY_PREF_KEY);
        this.state = { filters: [], visible: !hidden };
    }

    /**
     * Updates Store's state to contain latest set of filter categories.
     * @param filters
     */
    public updateFilters(filters: any[]): void {
        this.state.filters = filters;

        this.emitChanged();
    }

    /**
     * Updates Store's state to contain the visibility state of the filters.
     * @param visible
     */
    public toggleFiltersVisibility(): void {
        let newVisibilityState = !this.state.visible;
        
        this.state.visible = newVisibilityState;
        UserPreferences.setUserPreference(FILTER_VISIBILITY_PREF_KEY, !newVisibilityState);

        this.emitChanged();
    }

    /**
     * Returns the visibility of the filters
     */
    public getFiltersVisibility(): boolean {
        return this.state.visible;
    }

    /**
     * Use the method to fetch the list of filters a user needs to be presented before.
     * Returns a merged list of filters. The list contains the filters from response, as well as those not present in the response.
     * Filters which are not present in the response the method returns an empty object for those, the ones which are in the response
     * method returns those as it is, thereby making the list, and the categories in the list constant. In otherwords, the number of filter categories will always be the same no matter what,
     * even if the search response doesn’t contain some of them.
     * @param searchEntity
     */
    public filters(searchEntity: Models.SearchProvider): any[] {
        return this.merge(searchFilterCategories[searchEntity], this.state.filters);
    }
    
    private merge(requiredFiltersCategories: string[], filtersInResponse: any[]): any[] {
        let filters = [];
        if (requiredFiltersCategories) {
            requiredFiltersCategories.forEach((f1) => {
                let filterPresentInResponse = false;
                for (let idx = 0; idx < filtersInResponse.length; idx++) {
                    let f2 = filtersInResponse[idx];
                    if (ignoreCaseComparer(f2.name, f1) === 0) {
                        // push the filter to render only if the feature is enabled.
                        if (isFilterCategoryEnabled(f2.name)) {
                            filters.push(f2);
                        }

                        filterPresentInResponse = true;
                        break;
                    }
                }

                // Add filter category if not present in the response and corresponding feature is enabled.
                if (!filterPresentInResponse && isFilterCategoryEnabled(f1)) {
                    filters.push(filterCategoryCreators[f1]());
                }
            });

        }

        return filters;
    }
}
