import { Store } from "VSS/Flux/Store";

import { Plan } from "TFS/Work/Contracts";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";
import { Favorite } from "Favorites/Contracts";

import { IPlanHubStore, IPlanHubData, IPlanSortOptions } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";
import { PlanHubStoreData } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreData";
import { PlanHubActions } from "ScaledAgile/Scripts/PlanHub/Actions/PlanHubActions";
import { PlanHubStoreBusinessLogic } from "ScaledAgile/Scripts/PlanHub/Stores/PlanHubStoreBusinessLogic";
import { PlanHubIndexedSearchStrategy } from "ScaledAgile/Scripts/PlanHub/DataProviders/PlanHubIndexedSearchStrategy";

export class PlanHubStore extends Store implements IPlanHubStore {
    private _isDisposed: boolean;

    private _planHubActions: PlanHubActions;
    private _searchStrategy: PlanHubIndexedSearchStrategy;

    private _value: PlanHubStoreData;

    // -- Begin Handlers Region --
    private _onBeginGetAllPlansHandler: () => void;
    private _onEndGetAllPlansHandler: (plans: Plan[]) => void;

    private _onBeginGetFavoritesHandler: () => void;
    private _onEndGetFavoritesHandler: (favorites: Favorite[]) => void;

    private _onBeginFavoriteHandler: (planId: string) => void;
    private _onEndFavoriteHandler: (favorite: Favorite) => void;

    private _onBeginUnfavoriteHandler: (plan: TabRowPlanData) => void;
    private _onEndUnfavoriteHandler: (plan: TabRowPlanData) => void;

    private _filterPlansOnFavoritesHandler: (filterOnFavorites: boolean) => void;
    private _deletePlanHandler: (deletePlanId: string) => void;
    private _addPlanHandler: (plan: TabRowPlanData) => void;
    private _sortPlansHandler: (sortOptions: IPlanSortOptions) => void;

    private _setFiterTextHandler: (filterText: string) => void;

    // -- End Handlers Region --

    constructor(planHubActions: PlanHubActions, searchStrategy: PlanHubIndexedSearchStrategy) {
        super();
        if (!planHubActions) {
            throw new Error("planHubActions must be defined");
        }
        if (!searchStrategy) {
            throw new Error("searchStrategy must be defined");
        }

        // initialize to an empty store.
        this._value = new PlanHubStoreData();

        this._planHubActions = planHubActions;
        this._searchStrategy = searchStrategy;
        this._addActionListeners();
    }

    public dispose() {
        if (this._isDisposed) {
            return;
        }

        this._removeActionListeners();

        this._planHubActions = null;
        this._searchStrategy = null;
        this._isDisposed = true;
    }

    public getValue(): IPlanHubData {
        return this._value;
    }

    // -- Begin Add/Remove Handlers Region --
    protected _addActionListeners(): void {
        this._onBeginGetAllPlansHandler = () => this._onBeginGetAllPlans();
        this._onEndGetAllPlansHandler = (plans: Plan[]) => this._onEndGetAllPlans(plans);
        this._onBeginGetFavoritesHandler = () => this._onBeginGetFavorites();
        this._onEndGetFavoritesHandler = (favorites: Favorite[]) => this._onEndGetFavorites(favorites);
        this._onBeginFavoriteHandler = (planId: string) => this._onBeginFavorite(planId);
        this._onEndFavoriteHandler = (favorite: Favorite) => this._onEndFavorite(favorite);
        this._onBeginUnfavoriteHandler = (plan: TabRowPlanData) => this._onBeginUnfavorite(plan);
        this._onEndUnfavoriteHandler = (plan: TabRowPlanData) => this._onEndUnfavorite(plan);
        this._filterPlansOnFavoritesHandler = (filterOnFavorites: boolean) => this._filterPlansOnFavorites(filterOnFavorites);
        this._deletePlanHandler = (deletePlanId: string) => this._deletePlan(deletePlanId);
        this._addPlanHandler = (plan: TabRowPlanData) => this._addPlan(plan);
        this._sortPlansHandler = (sortOptions: IPlanSortOptions) => this._sort(sortOptions);
        this._setFiterTextHandler = (filterText: string) => this._setFiterText(filterText);

        this._planHubActions.onBeginGetAllPlans.addListener(this._onBeginGetAllPlansHandler);
        this._planHubActions.onEndGetAllPlans.addListener(this._onEndGetAllPlansHandler);
        this._planHubActions.onBeginGetFavorites.addListener(this._onBeginGetFavoritesHandler);
        this._planHubActions.onEndGetFavorites.addListener(this._onEndGetFavoritesHandler);
        this._planHubActions.onBeginFavorite.addListener(this._onBeginFavoriteHandler);
        this._planHubActions.onEndFavorite.addListener(this._onEndFavoriteHandler);
        this._planHubActions.onBeginUnfavorite.addListener(this._onBeginUnfavoriteHandler);
        this._planHubActions.onEndUnfavorite.addListener(this._onEndUnfavoriteHandler);
        this._planHubActions.filterPlansOnFavorites.addListener(this._filterPlansOnFavoritesHandler);
        this._planHubActions.delete.addListener(this._deletePlanHandler);
        this._planHubActions.add.addListener(this._addPlanHandler);
        this._planHubActions.sort.addListener(this._sortPlansHandler);
        this._planHubActions.setFilterText.addListener(this._setFiterTextHandler);
    }

    protected _removeActionListeners(): void {
        this._planHubActions.onBeginGetAllPlans.removeListener(this._onBeginGetAllPlansHandler);
        this._planHubActions.onEndGetAllPlans.removeListener(this._onEndGetAllPlansHandler);
        this._planHubActions.onBeginGetFavorites.removeListener(this._onBeginGetFavoritesHandler);
        this._planHubActions.onEndGetFavorites.removeListener(this._onEndGetFavoritesHandler);
        this._planHubActions.onBeginFavorite.removeListener(this._onBeginFavoriteHandler);
        this._planHubActions.onEndFavorite.removeListener(this._onEndFavoriteHandler);
        this._planHubActions.onBeginUnfavorite.removeListener(this._onBeginUnfavoriteHandler);
        this._planHubActions.onEndUnfavorite.removeListener(this._onEndUnfavoriteHandler);
        this._planHubActions.filterPlansOnFavorites.removeListener(this._filterPlansOnFavoritesHandler);
        this._planHubActions.delete.removeListener(this._deletePlanHandler);
        this._planHubActions.add.removeListener(this._addPlanHandler);
        this._planHubActions.sort.removeListener(this._sortPlansHandler);
        this._planHubActions.setFilterText.removeListener(this._setFiterTextHandler);

        this._onBeginGetAllPlansHandler = null;
        this._onEndGetAllPlansHandler = null;
        this._onBeginGetFavoritesHandler = null;
        this._onEndGetFavoritesHandler = null;
        this._onBeginFavoriteHandler = null;
        this._onEndFavoriteHandler = null;
        this._onBeginUnfavoriteHandler = null;
        this._onEndUnfavoriteHandler = null;
        this._filterPlansOnFavoritesHandler = null;
        this._deletePlanHandler = null;
        this._addPlanHandler = null;
        this._sortPlansHandler = null;
        this._setFiterTextHandler = null;
    }

    // -- End Add/Remove Handlers Region --

    protected _onBeginGetAllPlans(): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onBeginGetAllPlans(); });
    }

    protected _onEndGetAllPlans(plans: Plan[]): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onEndGetAllPlans(plans); });
    }

    protected _onBeginGetFavorites(): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onBeginGetFavorites(); });
    }

    protected _onEndGetFavorites(favorites: Favorite[]): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onEndGetFavorites(favorites); });
    }

    protected _onBeginFavorite(planId: string): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onBeginFavorite(planId); });
    }

    protected _onEndFavorite(favorite: Favorite): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onEndFavorite(favorite); });
    }

    protected _onBeginUnfavorite(plan: TabRowPlanData): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onBeginUnfavorite(plan); });
    }

    protected _onEndUnfavorite(plan: TabRowPlanData): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.onEndUnfavorite(plan); });
    }

    protected _filterPlansOnFavorites(filterOnFavorites: boolean): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.filterPlansOnFavorites(filterOnFavorites); });
    }

    protected _deletePlan(planId: string): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.deletePlan(planId); });
    }

    protected _addPlan(plan: TabRowPlanData): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => {  return businessLogic.addPlan(plan); });
    }

    protected _sort(sortOptions: IPlanSortOptions): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.sort(sortOptions); });
    }

    protected _setFiterText(filterText: string): void {
        this._invokeBusinessLogicAndEmitChanged((businessLogic: PlanHubStoreBusinessLogic) => { return businessLogic.setFilterText(filterText); });
    }

    protected _invokeBusinessLogicAndEmitChanged(method: (businessLogic: PlanHubStoreBusinessLogic) => boolean): void {
        const businessLogic = new PlanHubStoreBusinessLogic(this._value, this._searchStrategy);
        const changed = method(businessLogic);

        if (changed) {
            this._value = businessLogic.getCurrentState();
            this.emitChanged();
        }
    }
}
