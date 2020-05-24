import { IPlanHubData, PlansLoadingState, IPlanSortOptions, PlanColumnKey } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";

/**
 * The data stored by the plan hub store.
 */
export class PlanHubStoreData implements IPlanHubData {
    /**
     * All the plans (favorite and non-favorite). This may be empty.
     */
    allPlans: TabRowPlanData[];

    /**
     * Filtered collection of plans in allPlans that should be displayed in the UI.
     */
    displayedPlans: TabRowPlanData[];

    /**
     * Filtered collection of plans in allPlans based on the text from the search box.
     */
    filteredPlans: TabRowPlanData[];

    /**
     * Loading state for all plans.
     */
    allPlansLoadingState: PlansLoadingState;

    /**
     * Loading state for favorites.
     */
    favoritesLoadingState: PlansLoadingState;

    /**
     * Current filter for favorites (true = show only favorites, false = show all including favorites).
     */
    filterPlansOnFavorites: boolean;

    /**
     * If there is text filtering underway.
     */
    isFiltering: boolean;

    /**
     * The string that is filtering the set of plans to be displayed.
     */
    filterText: string;

    /**
     * Sort options for the filterd plans.
     */
    sortOptions: IPlanSortOptions;

    constructor() {
        this.allPlans = [];
        this.filteredPlans = [];
        this.displayedPlans = [];
        this.allPlansLoadingState = PlansLoadingState.None;
        this.favoritesLoadingState = PlansLoadingState.None;
        this.filterPlansOnFavorites = false;
        this.isFiltering = false;
        // Default sort order from the server is plan name sorted ascending.
        this.sortOptions = {
            columnKey: PlanColumnKey.Name,
            isSortedDescending: false
        };
    }
}
