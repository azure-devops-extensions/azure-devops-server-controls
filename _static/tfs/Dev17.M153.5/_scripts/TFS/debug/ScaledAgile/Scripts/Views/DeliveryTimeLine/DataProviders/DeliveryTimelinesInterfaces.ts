
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { IItems } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IDeliveryTimeLineViewData, ITimeLineRequestIds, ITimeLineRequest } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";

/**
 * Data provider for Delivery Time Line only
 */
export interface IDeliveryTimeLinesDataProvider {

    /**
     * This method is called once. After the initial load from the server, we load subsequence card depending of the
     * user's browser. Any further loading must be done through the mechanism of getting IDS first and then loading
     * full data.
     * @param {string} PlanId - The plan to get the initial data
     * @returns {IDeliveryTimeLineViewData}
     */
    getInitialDataByDateRangeAndTeams(data: IViewsStoreData): IPromise<IDeliveryTimeLineViewData>;

    /**
     * Get the top X of the cards + the rest of the ids for a specific range of time and teams.
     * This pre-fetch is used with *getFullDataFor* for performance reason
     * @param {ITimeLineRequestData} timeLineNeededData contains the request parameters
     * @returns {IDeliveryTimeLineViewData} - List of Cards for the specific teams and times
     */
    getDataForDatesTeamsFor(timeLineNeededData: ITimeLineRequest): IPromise<IDeliveryTimeLineViewData>;

    /**
     * Get data from ids
     * @param timeLineNeededData Time line request ids
     * @param workItemTypeColorAndIcons Work item type colors and icons provider
     * @returns List of full cards.
     */
    getDataForIds(timeLineNeededData: ITimeLineRequestIds, workItemTypeColorAndIcons: WorkItemTypeColorAndIcons): IPromise<IItems>;
}
