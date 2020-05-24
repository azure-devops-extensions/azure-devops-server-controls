import { Action } from "VSS/Flux/Action";

import { Plan } from "TFS/Work/Contracts";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";
import { IPlanSortOptions } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";
import { Favorite } from "Favorites/Contracts";

export class PlanHubActions {
    public onBeginGetAllPlans: Action<void>;
    public onEndGetAllPlans: Action<Plan[]>;

    public onBeginGetFavorites: Action<void>;
    public onEndGetFavorites: Action<Favorite[]>;

    public onBeginFavorite: Action<string>;
    public onEndFavorite: Action<Favorite>;

    public onBeginUnfavorite: Action<TabRowPlanData>;
    public onEndUnfavorite: Action<TabRowPlanData>;

    public filterPlansOnFavorites: Action<boolean>;
    public add: Action<Plan>;
    public delete: Action<string>;
    public open: Action<string>;
    public sort: Action<IPlanSortOptions>;

    public setFilterText: Action<string>;

    public constructor() {
        this.onBeginGetAllPlans = new Action<void>();
        this.onEndGetAllPlans = new Action<Plan[]>();

        this.onBeginGetFavorites = new Action<void>();
        this.onEndGetFavorites = new Action<Favorite[]>();

        this.onBeginFavorite = new Action<string>();
        this.onEndFavorite = new Action<Favorite>();

        this.onBeginUnfavorite = new Action<TabRowPlanData>();
        this.onEndUnfavorite = new Action<TabRowPlanData>();

        this.filterPlansOnFavorites = new Action<boolean>();
        this.add = new Action<Plan>();
        this.delete = new Action<string>();
        this.open = new Action<string>();
        this.sort = new Action<IPlanSortOptions>();

        this.setFilterText = new Action<string>();
    }
}
