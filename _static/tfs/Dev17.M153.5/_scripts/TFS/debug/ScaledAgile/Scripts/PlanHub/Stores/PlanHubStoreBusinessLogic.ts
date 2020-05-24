import * as Utils_Array from "VSS/Utils/Array";

import { Plan, PlanMetadata } from "TFS/Work/Contracts";
import { Favorite } from "Favorites/Contracts";

import { PlanHubStoreData } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreData";
import { TabRowPlanDataUtils } from "ScaledAgile/Scripts/PlanHub/Utils/TabRowPlanDataUtils";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";
import { PlansLoadingState, IPlanSortOptions, PlanColumnKey } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";
import { PlanHubIndexedSearchStrategy } from "ScaledAgile/Scripts/PlanHub/DataProviders/PlanHubIndexedSearchStrategy";
import { FavoritedPlanMetadataHelper } from "ScaledAgile/Scripts/Shared/Utils/FavoritedPlanMetadataHelper";
import { PlanType } from "TFS/Work/Contracts";

/**
 * The business logic for the plan hub store. Public methods in this class will, given the current state of the world (via ctor)
 * and a change will:
 *   1. Alter the state to account for the change.
 *   2. Return a boolean indicating if the state changed or was unaltered.
 */
export class PlanHubStoreBusinessLogic {
    private _value: PlanHubStoreData;
    private _searchStrategy: PlanHubIndexedSearchStrategy;

    public constructor(currentState: PlanHubStoreData, searchStrategy: PlanHubIndexedSearchStrategy) {
        if (!currentState) {
            throw new Error("currentState must be defined");
        }
        if (!searchStrategy) {
            throw new Error("searchStrategy must be defined");
        }

        this._value = currentState;
        this._searchStrategy = searchStrategy;
    }

    public getCurrentState(): PlanHubStoreData {
        return this._value;
    }

    /**
     * Set state for getting all plans to Loading.
     * @returns {boolean} indicates that the store has been modified.
     */
    public onBeginGetAllPlans(): boolean {
        if (this._value.allPlansLoadingState === PlansLoadingState.Loading) {
            return false;
        }

        this._value.allPlansLoadingState = PlansLoadingState.Loading;
        return true;
    }

    /**
     * Replace the current list of all the plans with the given list.
     * @param {Plan[]} plans - the new set of plans.
     * @returns {boolean} indicates that the store has been modified.
     */
    public onEndGetAllPlans(plans: Plan[]): boolean {
        if (!(plans instanceof Array)) {
            throw new Error("plans must be an array");
        }

        let modified = this._mergePlans(plans);
        if (this._value.allPlansLoadingState !== PlansLoadingState.Ready) {
            this._value.allPlansLoadingState = PlansLoadingState.Ready;
            modified = true;
        }

        return modified;
    }

    /**
     * Set state for getting favorites to Loading.
     * @returns {boolean} indicates that the store has been modified.
     */
    public onBeginGetFavorites(): boolean {
        if (this._value.favoritesLoadingState === PlansLoadingState.Loading) {
            return false;
        }

        this._value.favoritesLoadingState = PlansLoadingState.Loading;
        return true;
    }

    /**
     * Replace the current list of favorite plans with the given list.
     * @param {Favorite[]} favorites - the new set of favorite plans.
     * @returns {boolean} indicates that the store has been modified.
     */
    public onEndGetFavorites(favorites: Favorite[]): boolean {
        if (!(favorites instanceof Array)) {
            throw new Error("favorites must be an array");
        }

        let modified = this._mergeFavorites(favorites);
        if (this._value.favoritesLoadingState !== PlansLoadingState.Ready) {
            this._value.favoritesLoadingState = PlansLoadingState.Ready;
            modified = true;
        }

        return modified;
    }

    /**
     * Starting favorite
     * @returns {boolean} indicates that the store has been modified.
     */
    public onBeginFavorite(planId: string): boolean {
        let hasUpdates = false;

        this._forFirstPlanId(this._value.allPlans, planId, (matchingPlan, index) => {
            // Assume the favoriting will succeed and update the favorite pre-emptively.
            matchingPlan.showOnFavorites = true;
            matchingPlan.isChangingFavoriteState = true;
            this._updatePlansToBeDisplayed();
            hasUpdates = true;
        });

        return hasUpdates;
    }

    /**
     * Favorite operation completed successfully.
     * @returns {boolean} indicates that the store has been modified.
     */
    public onEndFavorite(favorite: Favorite): boolean {
        if (!favorite) {
            throw new Error("favorite must be defined");
        }

        let hasUpdates = false;

        // Find the plan and update it.
        this._forFirstPlanId(this._value.allPlans, favorite.artifactId, (matchingPlan, index) => {
            matchingPlan.favorite = favorite;
            matchingPlan.showOnFavorites = true;
            matchingPlan.isChangingFavoriteState = false;

            hasUpdates = true;
        });
        // Note: If we don't have the plan anymore then it was probably deleted (by unfavorite by user then delete by user) 
        //       in this case we want it removed from the plans list so it is fine to do nothing.

        return hasUpdates;
    }

    /**
     * Starting unfavorite operation.
     * @returns {boolean} indicates that the store has been modified.
     */
    public onBeginUnfavorite(plan: TabRowPlanData): boolean {
        if (!plan) {
            throw new Error("plan must be defined");
        }

        plan.isChangingFavoriteState = true;

        return true;
    }

    /**
     * Unfavorite operation completed successfully.
     * @returns {boolean} indicates that the store has been modified.
     */
    public onEndUnfavorite(plan: TabRowPlanData): boolean {
        if (!plan) {
            throw new Error("plan must be defined");
        }

        // Unfavoriting succeeded, remove the favorite link.
        plan.isChangingFavoriteState = false;
        plan.favorite = undefined;
        if (plan.isDeleted) {
            this._forFirstPlanId(this._value.allPlans, plan.id, (matchingPlan, index) => {
                this._value.allPlans.splice(index, 1);
            });

            // Don't update the plans list yet, we want the plan to stay on the favorites tab.
            this._updatePlansToBeDisplayed();
        }
        return true;
    }

    /**
     * Sets if only the favorite plans should be shown or if all plans should be shown.
     * @param {boolean} filterOnFavorites True if we should show only favorites otherwise false.
     * @returns {boolean} indicates that the store has been modified.
     */
    public filterPlansOnFavorites(filterOnFavorites: boolean): boolean {
        if (this._value.filterPlansOnFavorites === filterOnFavorites) {
            return false;
        }

        this._value.filterPlansOnFavorites = filterOnFavorites;

        // Ensure the showOnFavorites is set correctly when tabs are switched. 
        for (let i = 0, length = this._value.allPlans.length; i < length; ++i) {
            const current = this._value.allPlans[i];
            current.showOnFavorites = current.favorite !== undefined;
        }

        this._updatePlansToBeDisplayed();

        return true;
    }

    /**
     * Removes the plan with id planId from favorites list and all list
     * @returns {boolean} indicates that the store has been modified.
     */
    public deletePlan(planId: string): boolean {
        let found = false;

        this._forFirstPlanId(this._value.allPlans, planId, (matchingPlan, index) => {
            this._value.allPlans.splice(index, 1);
            found = true;
        });

        if (this._value.isFiltering) {
            this._forFirstPlanId(this._value.filteredPlans, planId, (matchingPlan, index) => {
                this._value.filteredPlans.splice(index, 1);
                found = true;
            });
        }

        if (found) {
            this._updatePlansToBeDisplayed();
        }
        return found;
    }

    /**
     * Add a new plan to favorites list and all list
     * @returns {boolean} indicates that the store has been modified.
     */
    public addPlan(plan: Plan): boolean {
        if (!plan) {
            throw new Error("plan must be defined");
        }

        this._addPlan(plan);

        return true;
    }

    /**
     * Sorts allPlans and the filteredPlans by the appropriate column and direction (ascending/descending).
     * @returns {boolean} indicates that the store has been modified.
     */
    public sort(options: IPlanSortOptions): boolean {
        let sorted = this._value.allPlans.slice();

        switch (options.columnKey) {
            case PlanColumnKey.Name:
                sorted.sort((a, b) => TabRowPlanDataUtils.compareByName(a, b, options.isSortedDescending));
                break;

            case PlanColumnKey.CreatedBy:
                sorted.sort((a, b) => TabRowPlanDataUtils.compareCreatedBy(a, b, options.isSortedDescending));
                break;

            case PlanColumnKey.Description:
                sorted.sort((a, b) => TabRowPlanDataUtils.compareDescription(a, b, options.isSortedDescending));
                break;

            case PlanColumnKey.ModifiedDate:
                sorted.sort((a, b) => TabRowPlanDataUtils.compareModifiedDate(a, b, options.isSortedDescending));
                break;
        }

        this._value.sortOptions = options;
        this._value.allPlans = sorted;

        this._updateFilteredPlans(this._value.filteredPlans.map(p => p.id));
        this._updatePlansToBeDisplayed();
        return true;
    }

    /**
     * Set the filter text, used to filter the plans displayed.
     * @param {string} filterText the term to be used to filter the plans.
     * @returns {boolean} indicates that the store has been modified.
     */
    public setFilterText(filterText: string): boolean {
        if (filterText && filterText.length > 0) {
            this._value.isFiltering = true;
            this._value.filterText = filterText;
            const filteredPlanIds = this._searchStrategy.setFilterText(filterText);
            this._updateFilteredPlans(filteredPlanIds);
        }
        else {
            this._value.isFiltering = false;
            this._value.filterText = null;
        }

        this._updatePlansToBeDisplayed();
        return true;
    }

    /**
     * Merge the given favorites into the full list of plans to display.
     * @param {Favorite[]} favorites - The favorites to merge.
     * @returns {boolean} indicates that the store has been modified.
     */
    protected _mergeFavorites(favorites: Favorite[]): boolean {
        let newPlans: TabRowPlanData[] = [];

        if (this._value.allPlans.length === 0) {
            // No plans yet, just convert the favorites.
            newPlans = favorites.map<TabRowPlanData>(x => this._createTabRowPlanDataFromFavorite(x));
        }
        else {
            // Already have plans, need to merge the favorites.
            const allPlansDict = Utils_Array.toDictionary(this._value.allPlans, x => x.id.toUpperCase(), x => x);
            for (let favoriteIndex = 0, favoritesLen = favorites.length; favoriteIndex < favoritesLen; ++favoriteIndex) {
                const currentFavorite = favorites[favoriteIndex];
                const currentFavoritePlanId = currentFavorite.artifactId.toUpperCase();

                const currentPlan = allPlansDict[currentFavoritePlanId];
                if (currentPlan) {
                    // Found the plan, update it to have the favorite info (leave the plan name, etc, unchanged).
                    currentPlan.showOnFavorites = true;
                    currentPlan.favorite = currentFavorite;
                    currentPlan.isChangingFavoriteState = false;
                    currentPlan.isDeleted = currentFavorite.artifactIsDeleted;
                }
                else {
                    newPlans.push(this._createTabRowPlanDataFromFavorite(currentFavorite));
                }
            }
        }

        // Only need to resort and update the search strategy if new plans were added because the rows are not sortable on the favorites metadata.
        if (newPlans.length > 0) {
            this._value.allPlans.push(...newPlans);
            this.sort(this._value.sortOptions);
            this._searchStrategy.setItems(this._value.allPlans);
            return true;
        }

        return false;
    }

    /**
     * Add the given plan into all plans
     * @param {TabRowPlanData} plan - A plan to add
     */
    protected _addPlan(plan: Plan): void {
        this._value.allPlans.push(plan as TabRowPlanData);
        this.sort(this._value.sortOptions);
        this._searchStrategy.setItems(this._value.allPlans);
    }

    /**
     * Merge the given plans into the full list of plans to display.
     * @param {Plan[]} plans - The plans to merge.
     * @returns {boolean} indicates that the store has been modified.
     */
    protected _mergePlans(plans: Plan[]): boolean {
        let newPlans: TabRowPlanData[] = [];

        if (this._value.allPlans.length === 0) {
            // No plans yet, just set them.
            newPlans = plans as TabRowPlanData[];
        }
        else {
            // Already have plans (from favorites), need to merge these into them (loop over original set of plans only).
            const allPlansDict = Utils_Array.toDictionary(this._value.allPlans, x => x.id.toUpperCase(), x => x);
            for (let newPlansIndex = 0, newPlansLength = plans.length; newPlansIndex < newPlansLength; ++newPlansIndex) {
                const currentNewPlan = plans[newPlansIndex];
                const currentNewPlanId = currentNewPlan.id.toUpperCase();

                if (!allPlansDict[currentNewPlanId]) {
                    newPlans.push(currentNewPlan as TabRowPlanData);
                }
            }
        }

        // Only need to resort and update the search strategy if new plans were added because we aren't updating the existing plan's display properties.
        if (newPlans.length > 0) {
            this._value.allPlans.push(...newPlans);
            this.sort(this._value.sortOptions);
            this._searchStrategy.setItems(this._value.allPlans);
            return true;
        }

        return false;
    }

    /**
     * Filters the plans displayed to the user to those in the active tab from all plans,
     * or from the filtered plans if the user is currently text filtering
     * @returns {boolean} indicates that the store has been modified.
     */
    protected _updatePlansToBeDisplayed(): boolean {
        let plansToDisplay = this._value.isFiltering ? this._value.filteredPlans : this._value.allPlans;
        if (this._value.filterPlansOnFavorites) {
            this._value.displayedPlans = plansToDisplay.filter(x => x.showOnFavorites);
        }
        else {
            this._value.displayedPlans = plansToDisplay.filter(x => !x.isDeleted);
        }

        return true;
    }

    /**
     * Updates the set of filtered plans based on the provided set of plan IDs.
     */
    protected _updateFilteredPlans(planIds: string[]) {
        const filteredPlans: TabRowPlanData[] = [];
        const planIdsMap = Utils_Array.toDictionary<string, boolean>(planIds, id => id.toUpperCase(), id => true);

        // Here we iterate over allPlans since it is already sorted, and we want the
        // the filterPlans to also be sorted.
        for (var i = 0; i < this._value.allPlans.length; i++) {
            const plan = this._value.allPlans[i];
            if (planIdsMap[plan.id.toUpperCase()]) {
                filteredPlans.push(plan);
            }
        }

        this._value.filteredPlans = filteredPlans;
    }

    /**
     * Create a new TabRowPlanData from a Favorite. Sets identity fields values if that data is available.
     * @param {Favorite} favorite - The favorite.
     */
    protected _createTabRowPlanDataFromFavorite(favorite: Favorite): TabRowPlanData {
        const planMetadata: PlanMetadata = FavoritedPlanMetadataHelper.convertToPlanMetadata(favorite.artifactProperties);
        return {
            // Plan properties.
            createdByIdentity: planMetadata.createdByIdentity,
            description: planMetadata.description,
            id: favorite.artifactId,
            createdDate: null,
            modifiedDate: planMetadata.modifiedDate,
            name: favorite.artifactName,
            modifiedByIdentity: null,
            properties: null,
            revision: null,
            type: PlanType.DeliveryTimelineView,
            url: null,
            userPermissions: planMetadata.userPermissions,
            // TabRowPlanData properties.
            showOnFavorites: true,
            favorite: favorite,
            isChangingFavoriteState: false,
            isDeleted: favorite.artifactIsDeleted
        };
    }

    /**
     * For the first plan with the matching id perform the given operation.
     * Exits immediatly after performing the operation so it is safe to modify allPlans.
     * @returns {boolean} indicates that the store has been modified.
     */
    protected _forFirstPlanId(plans: TabRowPlanData[], planId: string, action: (matchingPlan: TabRowPlanData, index: number) => void): boolean {
        const idUpper = planId.toUpperCase();
        for (let i = 0, length = plans.length; i < length; ++i) {
            const current = plans[i];
            if (current.id.toUpperCase() === idUpper) {
                action(current, i);
                return true;
            }
        }
        return false;
    }
}
