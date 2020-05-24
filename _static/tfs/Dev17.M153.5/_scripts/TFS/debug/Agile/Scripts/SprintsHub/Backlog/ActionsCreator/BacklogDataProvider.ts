import { Iteration } from "Agile/Scripts/Models/Iteration";
import { ISprintBacklogInitialPayload, ISprintBacklogPivotData } from "Agile/Scripts/SprintsHub/Backlog/BacklogContracts";
import {
    AGGREGATEDCAPACITY_DATAPROVIDER_ID,
    CAPACITYOPTIONS_DATAPROVIDER_ID,
    SprintCapacityDataProvider,
    TEAMCAPACITY_DATAPROVIDER_ID
} from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { DateRange } from "TFS/Work/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

export const BACKLOG_DATAPROVIDER_ID = "ms.vss-work-web.sprints-hub-backlog-data-provider";

export interface IBacklogDataProvider {
    /** Initialize data for the backlog pivot */
    getBacklogData(
        teamId: string,
        iteration: Iteration,
        teamDaysOff: DateRange[]): ISprintBacklogInitialPayload;

    /** Refresh data for the backlog pivot */
    reloadAndGetBacklogData(
        teamId: string,
        iteration: Iteration,
        teamDaysOff: DateRange[]): IPromise<ISprintBacklogInitialPayload>;
}

export class BacklogDataProvider implements IBacklogDataProvider {
    /**
     * Initialize data for the backlog pivot
     */
    public getBacklogData(
        teamId: string,
        iteration: Iteration,
        teamDaysOff: DateRange[]): ISprintBacklogInitialPayload {

        return this._loadBacklogData(teamId, iteration, teamDaysOff);
    }

    /**
     * Refresh data for the backlog pivot
     */
    public reloadAndGetBacklogData(
        teamId: string,
        iteration: Iteration,
        teamDaysOff: DateRange[]): IPromise<ISprintBacklogInitialPayload> {

        const contributionIds = [
            BACKLOG_DATAPROVIDER_ID,
            AGGREGATEDCAPACITY_DATAPROVIDER_ID,
            CAPACITYOPTIONS_DATAPROVIDER_ID,
            TEAMCAPACITY_DATAPROVIDER_ID
        ];

        const contributions = contributionIds.map((cid) => {
            return {
                id: cid,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS
                }
            } as Contribution;
        });

        return this._getPageDataService().ensureDataProvidersResolved(contributions, /*refreshIfExpired */ true)
            .then(
                () => this.getBacklogData(teamId, iteration, teamDaysOff)
            );
    }

    private _getPageDataService(): WebPageDataService {
        return getService(WebPageDataService);
    }

    private _loadBacklogData(
        teamId: string,
        iteration: Iteration,
        teamDaysOff: DateRange[]): ISprintBacklogInitialPayload {

        const backlogContentData = this._getPageDataService().getPageData<ISprintBacklogPivotData>(BACKLOG_DATAPROVIDER_ID);

        //  Fetch capacity data: Aggregated capacity and capacity options. We need these to build the team capacity model.
        //  The team capacity model and aggregated capacity are used to build the field aggregator, which needs to be
        //  available on load to keep the backlog model and field aggregator data in sync, even if the work details pane
        //  is not toggled.
        const capacityOptions = SprintCapacityDataProvider.getCapacityOptionsFromPageData();
        const aggregatedCapacity = SprintCapacityDataProvider.getAggregatedCapacityFromPageData();
        const teamCapacity = SprintCapacityDataProvider.getTeamCapacityFromPageData();

        return {
            backlogContentData: backlogContentData,
            capacityData: {
                capacityOptions,
                aggregatedCapacity,
                teamCapacity
            }
        } as ISprintBacklogInitialPayload;
    }
}
