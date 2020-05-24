import * as VSS from "VSS/VSS";
import * as Q from "q";

import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";

import { Plan } from "TFS/Work/Contracts";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";
import { Favorite } from "Favorites/Contracts";
import { MessageBarType } from "OfficeFabric/MessageBar";

import { IPlansDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/IPlansDataProvider";
import { IPlanHubFavoritesDataProvider } from "ScaledAgile/Scripts/PlanHub/DataProviders/IPlanHubFavoritesDataProvider";
import { PlanHubActions } from "ScaledAgile/Scripts/PlanHub/Actions/PlanHubActions";
import { IPlanSortOptions } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";

import { Message } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { onClickNavigationHandler, getPlanURL } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";

export class PlanHubActionsCreator {
    private _planDataProvider: IPlansDataProvider;
    private _favoritesDataProvider: IPlanHubFavoritesDataProvider;
    private _planHubActions: PlanHubActions;
    private _pageActions: PageActions;

    public constructor(planDataProvider: IPlansDataProvider,
        favoritesDataProvider: IPlanHubFavoritesDataProvider,
        planHubActions: PlanHubActions,
        sharedPageActions: PageActions) {

        if (!planDataProvider) {
            throw new Error("planDataProvider must be defined");
        }
        if (!favoritesDataProvider) {
            throw new Error("favoritesDataProvider must be defined");
        }
        if (!planHubActions) {
            throw new Error("planHubActions must be defined");
        }
        if (!sharedPageActions) {
            throw new Error("sharedPageActions must be defined");
        }
        this._planDataProvider = planDataProvider;
        this._favoritesDataProvider = favoritesDataProvider;
        this._planHubActions = planHubActions;
        this._pageActions = sharedPageActions;
    }

    /**
     * Refresh all Plans and/or favorite Plans store data.
     * @param {boolean} updatePlanData Update the all plans data?
     * @param {boolean} updateFavoriteData Update the favorite plans data?
     */
    public refreshStore(updatePlanData: boolean, updateFavoriteData: boolean): void {
        if (updatePlanData) {
            this._planHubActions.onBeginGetAllPlans.invoke(null);

            Q(this._planDataProvider.getAllPlans()).done(
                (plans: Plan[]) => { this._onGetAllPlansCallback(plans); },
                (error: TfsError) => { this._onErrorCallback(error); }
            );
        }

        if (updateFavoriteData) {
            this._planHubActions.onBeginGetFavorites.invoke(null);

            // Get extended information about favorites (links and if the artifact is deleted)
            Q(this._favoritesDataProvider.getFavorites(true)).done(
                (favorites: Favorite[]) => { this._onGetFavoritesCallback(favorites); },
                (error: TfsError) => { this._onErrorCallback(error); }
            );
        }
    }

    /**
     * Set the filter text, which will be used to filter the displayed plans.
     * @param {string} filterText the term to be used to filter the plans.
     */
    public setFilterText(filterText: string) {
        this._planHubActions.setFilterText.invoke(filterText);
    }

    /**
     * Filter to show only favorites or to show all
     * @param {boolean} showFavoritesOnly Only show favorites or show all (including favorites).
     */
    public filterPlansOnFavorites(showFavoritesOnly: boolean): void {
        this._planHubActions.filterPlansOnFavorites.invoke(showFavoritesOnly);
    }

    /**
     * Deletes plan from plan list
     */
    public deletePlan(plan: TabRowPlanData, isFavorite: boolean) {
        this._planHubActions.delete.invoke(plan.id);
        if (isFavorite) {
            Q(this._favoritesDataProvider.deleteFavorite(plan.favorite.id)).done(
                () => {
                },
                (error: TfsError) => { this._onErrorCallback(error); }
            );
        }
        Q(this._planDataProvider.deletePlan(plan.id)).done(
            () => { this._onDeletePlanCallback(); },
            (error: TfsError) => { this._onErrorCallback(error); }
        );
    }

    /**
     * Creates a copy of a plan from plan list
     */
    public copyPlan(planId: string, copiedPlanName: string, isFavorite: boolean) {
        Q(this._planDataProvider.copyPlan(planId, copiedPlanName)).done(
            (plan: Plan) => {
                this._planHubActions.add.invoke(plan);

                // favorite the new plan if source was favorite
                if (isFavorite) {
                    this._favoritePlan(plan);
                }
            },
            (error: TfsError) => {
                this._onErrorCallback(error);
            }
        );
    }

    /**
     * Favorite a plan. Does nothing if the plan is already considered favorited or if we are waiting for a prior favorite operation to complete.
     */
    public favoritePlan(plan: TabRowPlanData): void {
        if (plan.isChangingFavoriteState || plan.favorite) {
            return;
        }

        this._favoritePlan(plan);
    }

    /**
     * Unfavorite a plan. Does nothing if the plan is already considered favorited or if we are waiting for a prior favorite operation to complete.
     */
    public unfavoritePlan(plan: TabRowPlanData): void {
        if (plan.isChangingFavoriteState || !plan.favorite) {
            return;
        }

        this._planHubActions.onBeginUnfavorite.invoke(plan);

        Q(this._favoritesDataProvider.deleteFavorite(plan.favorite.id)).done(
            () => { this._onUnfavoriteCallback(plan); },
            (error: TfsError) => { this._onErrorCallback(error); }
        );
    }

    /**
     * Opens plan from plan list. Currently this will navigate to new page, if PlansXHRPageNavigation is not enabled.
     */
    public openPlan(planId: string) {
        const url = getPlanURL(planId);
        // If the onClickNavigationHandler handler doesn't handle this event, then we would trigger page navigation.
        // This would happen when "VisualStudio.Services.WebAccess.XHRHubSwitching" has not been turned on.
        if (onClickNavigationHandler(url)) {
            window.location.href = url;
        }
    }

    /**
     * Sorts the plan list
     */
    public sort(sortOptions: IPlanSortOptions) {
        this._planHubActions.sort.invoke(sortOptions);
    }

    protected _onGetAllPlansCallback(plans: Plan[]): void {
        this._planHubActions.onEndGetAllPlans.invoke(plans);
    }

    protected _onGetFavoritesCallback(favorites: Favorite[]): void {
        this._planHubActions.onEndGetFavorites.invoke(favorites);
    }

    protected _onDeletePlanCallback(): void {
        // no-op.
    }

    protected _onFavoriteCallback(favorite: Favorite): void {
        this._planHubActions.onEndFavorite.invoke(favorite);
    }

    protected _onUnfavoriteCallback(plan: TabRowPlanData): void {
        this._planHubActions.onEndUnfavorite.invoke(plan);
    }

    protected _onErrorCallback(error: TfsError): void {
        this._pageActions.setPageMessage.invoke(new Message(MessageBarType.error, VSS.getErrorMessage(error), false));
    }

    private _favoritePlan(plan: Plan) {
        this._planHubActions.onBeginFavorite.invoke(plan.id);

        Q(this._favoritesDataProvider.createFavorite(plan)).done(
            (favorite: Favorite) => { this._onFavoriteCallback(favorite); },
            (error: TfsError) => { this._onErrorCallback(error); }
        );
    }
}