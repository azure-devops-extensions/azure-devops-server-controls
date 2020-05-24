import { IBacklogData } from "Agile/Scripts/BacklogsHub/BacklogHubContracts";
import { BacklogsHubConstants, RightPanelExtensionIds } from "Agile/Scripts/Generated/HubConstants";
import { Contribution } from "VSS/Contributions/Contracts";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";

export interface IBacklogDataProvider {
    /** Load the backlog data */
    initializeBacklogData(): IBacklogData;

    /** Load 3rd party contributions */
    loadRightPanelContributions(): Promise<Contribution[]>;

    /** Reload the backlog data from the server */
    reloadBacklogPivotData(forecasting: boolean, inProgress: boolean): Promise<IBacklogData>;
}

export class BacklogDataProvider implements IBacklogDataProvider {
    public initializeBacklogData(): IBacklogData {
        const service = getService(WebPageDataService);
        return service.getPageData<IBacklogData>(BacklogsHubConstants.PRODUCTBACKLOG_DATAPROVIDER_ID);
    }

    public loadRightPanelContributions(): Promise<Contribution[]> {
        const service = getService(WebPageDataService);
        const backlogData = service.getPageData<IBacklogData>(BacklogsHubConstants.PRODUCTBACKLOG_DATAPROVIDER_ID);
        // In error state we may not have a backlogPayload
        const contributionId = backlogData.backlogPayload && backlogData.backlogPayload.isRequirementBacklog ? RightPanelExtensionIds.RequirementBacklog : RightPanelExtensionIds.PortfolioBacklog;
        return toNativePromise(getService(ExtensionService).getContributionsForTargets([contributionId]));
    }

    public reloadBacklogPivotData(forecasting: boolean, inProgress: boolean): Promise<IBacklogData> {
        const service = getService(WebPageDataService);

        // Show Parents is a query parameter and does not need to be sent in the properties
        const properties = {
            forecasting,
            inProgress
        };

        const contribution = {
            id: BacklogsHubConstants.PRODUCTBACKLOG_DATAPROVIDER_ID,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;

        return toNativePromise(service.ensureDataProvidersResolved([contribution], /*refreshIfExpired */ true, properties)
            .then(() => this.initializeBacklogData()));
    }
}