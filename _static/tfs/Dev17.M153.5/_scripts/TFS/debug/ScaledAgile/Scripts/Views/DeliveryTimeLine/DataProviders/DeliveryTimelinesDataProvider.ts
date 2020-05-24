
import Q = require("q");
import ServerData = require("TFS/Work/Contracts");
import ServerDataWorkItemTracking = require("TFS/WorkItemTracking/Contracts");

import RestClientWorkItems = require("TFS/WorkItemTracking/RestClient");
import VSS_Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import moment = require("Presentation/Scripts/moment");

import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import { BaseDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/BaseDataProvider";
import { IMapper } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineMappers";
import { IDeliveryTimeLinesDataProvider } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DataProviders/DeliveryTimelinesInterfaces";
import { IDeliveryTimeLineViewData, ITimeLineRequestIds, ITimeLineRequest } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IItems } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IItems as ClientItems } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { DateManipulationFunctions } from "ScaledAgile/Scripts/Shared/Utils/DateManipulationFunctions";
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { PageWorkItemHelper } from "WorkItemTracking/Scripts/Utils/PageWorkItemHelper";

export class DeliveryTimelinesDataProvider extends BaseDataProvider implements IDeliveryTimeLinesDataProvider {
    // Limit the number of workitems fetched per call to 200, to avoid the query string being truncated.
    // 200 is a commonly used number such as WorkItemSource.checklistPageSize for Kanban boards.
    private static BATCH_SIZE = 200;

    private _mapper: IMapper;
    private _httpClientWorkItemsRestClient: RestClientWorkItems.WorkItemTrackingHttpClient3;

    constructor(mapper: IMapper) {
        super();
        this._mapper = mapper;

        let tfsConnection: VSS_Service.VssConnection = new VSS_Service.VssConnection(TFS_Host_TfsContext.TfsContext.getDefault().contextData);
        this._httpClientWorkItemsRestClient = tfsConnection.getHttpClient<RestClientWorkItems.WorkItemTrackingHttpClient3>(RestClientWorkItems.WorkItemTrackingHttpClient3);
    }

    public getInitialDataByDateRangeAndTeams(data: IViewsStoreData): IPromise<IDeliveryTimeLineViewData> {
        let requestedDataStartDate = moment().add(-1 * Constants.DefaultBeforeWeekCount, "weeks").toDate(); // we use the same parameters the default view filter uses
        let requestedDataEndDate = moment().add(Constants.DefaultAfterWeekCount, "weeks").toDate();

        return this.getViewPayload(data, requestedDataStartDate, requestedDataEndDate);
    }

    /**
     * Get data for teams in a date range. This is used when panning to get data.
     * @param {ITimeLineRequest} timeLineNeededData - data to get.
     * @retursn {IPromise<IDeliveryTimeLineViewData>} - plan data.
     */
    public getDataForDatesTeamsFor(timeLineNeededData: ITimeLineRequest): IPromise<IDeliveryTimeLineViewData> {
        return this._getWorkHttpClient()
            .getDeliveryTimelineData(
            this._getProjectId(),
            timeLineNeededData.timeLineId,
            timeLineNeededData.timeLineRevision,
            timeLineNeededData.startDate,
            timeLineNeededData.endDate)
            .then((response: ServerData.DeliveryViewData) => {
                return this._mapper.mapTimelineDataToTimelineState(response, null);
            });
    }

    /**
     * Gets the requested workitems, with IDs matching the itemsId in timeLineNeededData.
     * Batches the requests internally, in case the id count is greater than the batch size.
     * @param timeLineNeededData Required data to be fetched. itemsId contains the ids of the workitems to be fetched
     * @param workItemTypeColorAndIcons Work item type colors and icons provider
     * @returns Promise to be fulfilled with the collection of IItems
     */
    public getDataForIds(timeLineNeededData: ITimeLineRequestIds, workItemTypeColorAndIcons: WorkItemTypeColorAndIcons): IPromise<ClientItems> {
        return PageWorkItemHelper.pageWorkItems(timeLineNeededData.itemsId).then(
            (workItems: ServerDataWorkItemTracking.WorkItem[]) => {
                const clientItems: ClientItems = { cards: [] };
                const currentItems = this._mapper.mapWorkItemsToItems(workItems, workItemTypeColorAndIcons);
                clientItems.cards.push(...currentItems.cards);
                return clientItems;
            });
        }


    /**
     * Get the view's payload information for all teams.
     * @param {string} viewId the ID of the view
     * @param {Date} serverStartDate the start date for a specific interval.
     * @param {Date} serverEndDate the end date for a specific interval.
     * @param {IPlanData} Used to have the name of the plan
     * @returns IPromise<IDeliveryTimelineViewData> the payload for the view
     */
    public getViewPayload(plan: IViewsStoreData, startDate: Date, endDate: Date): IPromise<IDeliveryTimeLineViewData> {
        return this._getWorkHttpClient().getDeliveryTimelineData(this._getProjectId(), plan.view.id, plan.view.revision, startDate, endDate)
            .then((response: ServerData.DeliveryViewData) => {
                return this._mapper.mapTimelineDataToTimelineState(response, plan);
            });
    }
}
