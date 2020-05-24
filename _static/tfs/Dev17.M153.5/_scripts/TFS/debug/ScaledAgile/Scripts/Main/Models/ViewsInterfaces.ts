import { PlanType, CardSettings, PlanMetadata, FilterClause, Marker } from "TFS/Work/Contracts";
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

/**
 * Higher level of store. It contains all views of the page. This store is the one that handle
 * which view is active. It also contains the list of all Scaled Agile available for the user.
 */
export interface IViewsStoreData {
    /**
     * The selected view
     */
    view: IViewData;
}

/**
 * Represent a single view. For example, if a user as multiples DeliveryTimeLine, the IViewsStoreData
 * will have multiple instance of that interface
 */
export interface IViewData extends IModelWithValidation, PlanMetadata {
    /**
     * Unique identifier of the view. This is unique across all kind of view
     */
    id: string;

    /**
     * User defined name of the view
     */
    name: string;

    /**
     * Type of the view. This is unique for every different view. For example, every DeliveryTimelineView as a single type
     */
    type: string;

    /**
     * Plan revision number (not in PlanMetadata since it's used for Favorite)
     */
    revision: number;

    /**
     * Card informations
     */
    cardSettings: CardSettings;

     /**
     * Filter Criteria
     */
    criteria: FilterClause[];

    /**
     * Markers for the plan
     */
    markers: Marker[];
}

/**
 * Represent the payload for creating a view.
 */
export interface ICreateViewPayload {
    /**
     * The name of the view
     */
    name: string;
    /**
     * The description of the view
     */
    description: string;
    /**
     * The view type
     */
    viewType: PlanType;
    /**
     * The view properties needed for the view
     */
    viewProperties: IDictionaryStringTo<any[]>;
}

export interface IUpdateViewPayload {
    /**
     * ID of the view to modify
     */
    planId: string;

    /**
     * Current revision of the plan.
     */
    planRevision: number;

    /**
     * The view type
     */
    planType: PlanType;

    /**
     * Name of the plan to create.
     */
    name: string;
    /**
     * The description of the view.
     */
    description: string;

    /**
     * Plan properties.
     */
    properties: any;
}

/**
 * Interface that allow sub component to act at the page level
 */
export interface IPageRefs {
    /**
     * What: Start the animation that indicate that the page is loading
     * Why: We need a page level animation/UX to indicate to the user that something is loading. Page level because we want to be on top of everything.
     */
    startPageLoading(): void;
    /**
     * What: Stop the animation that indicate that the page is loading
     * Why: We need a page level animation/UX to indicate to the user that something is loading. Page level because we want to be on top of everything.
     */
    stopPageLoading(): void;
}

/**
 * Width and height of the view.
 */
export interface IViewBounds {
    width: number;
    height: number;
}
