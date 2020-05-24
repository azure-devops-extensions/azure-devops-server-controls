import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";

/**
 * Plan hub store - this stores all the plans, filters, etc... (the data needed to render).
 */
export interface IPlanHubStore {
    getValue(): IPlanHubData;
}

export enum PlansLoadingState {
    None,       // No request for data has been made.
    Loading,    // A request for data is currently being made.
    Ready       // The request for data has completed.
}

export namespace PlanColumnKey {
    export const Name = "name";
    export const Description = "description";
    export const CreatedBy = "createdBy";
    export const ModifiedDate = "modifiedDate";
}

/**
 * Plan hub data exposed to components. This interface should be immutable - it is used by components.
 */
export interface IPlanHubData {
    /**
     * Filtered list of plans. This is what the list views should display.
     */
    readonly displayedPlans: TabRowPlanData[];

    /**
     * State of loading all the plans from the server (without favorite info).
     */
    readonly allPlansLoadingState: PlansLoadingState;

    /**
     * State of loading the favorite plans from the server.
     */
    readonly favoritesLoadingState: PlansLoadingState;

    /**
     * Sort options for the filterd plans.
     */
    readonly sortOptions: IPlanSortOptions;

    /**
     * If there is text filtering underway
     */
    readonly isFiltering: boolean;
}

/**
 * Represents the current sort options for a list of plans.
 */
export interface IPlanSortOptions {
    /**
     * The column to be sorted.
     */
    readonly columnKey: string;
    /**
     * The current direction of the sort order, ascending or descending.
     */
    readonly isSortedDescending: boolean;
}