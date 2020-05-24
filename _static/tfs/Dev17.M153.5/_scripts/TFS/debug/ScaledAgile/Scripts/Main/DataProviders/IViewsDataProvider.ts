import { IViewData, IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { IUpdateViewPayload } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";

/**
 * ViewData Provider is all methods to get information about the view. At this level, we should not be aware of any specific information of
 * specific views. It's high level information only
 */
export interface IViewsDataProvider {
    /**
     * Get the view to be displayed
     * @param {string} planId - The plan ID. Could be valid or not.
     * @returns {IPromise<IViewsStoreData>} the view
     */
    getPlan(planId: string): IPromise<IViewsStoreData>;

    /**
     * Updates a plan with new properties
     * @param {IUpdateViewPayload} updatePlanPayload New properties for the plan plus the plan id.
     * @returns {IPromise<IViewData>}
     */
    updatePlan(updatePlanPayload: IUpdateViewPayload): IPromise<IViewData>;
}
