import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from "q";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Contribution_Services from "VSS/Contributions/Services";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { WorkItemsHubRouteConstants, WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubData } from "WorkItemsHub/Scripts/Generated/Contracts";
import * as WorkItemsHubTabUtils from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import { IPageData } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export namespace WorkItemsHubDataProviderConstants {
    export const DefaultDataProvider = "ms.vss-work-web.work-items-hub-default-data-provider";
    export const AssignedToMeDataProvider = "ms.vss-work-web.work-items-hub-assignedtome-tab-data-provider";
    export const FollowingDataProvider = "ms.vss-work-web.work-items-hub-following-tab-data-provider";
    export const MentionedDataProvider = "ms.vss-work-web.work-items-hub-mentioned-tab-data-provider";
    export const MyActivityDataProvider = "ms.vss-work-web.work-items-hub-myactivity-tab-data-provider";
    export const RecentlyUpdatedDataProvider = "ms.vss-work-web.work-items-hub-recentlyupdated-tab-data-provider";
    export const RecentlyCreatedDataProvider = "ms.vss-work-web.work-items-hub-recentlycreated-tab-data-provider";
    export const RecentlyCompletedDataProvider = "ms.vss-work-web.work-items-hub-recentlycompleted-tab-data-provider";
    export const MyTeamsDataProvider = "ms.vss-work-web.work-items-hub-myteams-tab-data-provider";
}

const DataProviderByTabMap: IDictionaryNumberTo<string> = {
    [WorkItemsHubTabs.AssignedToMe]: WorkItemsHubDataProviderConstants.AssignedToMeDataProvider,
    [WorkItemsHubTabs.Following]: WorkItemsHubDataProviderConstants.FollowingDataProvider,
    [WorkItemsHubTabs.Mentioned]: WorkItemsHubDataProviderConstants.MentionedDataProvider,
    [WorkItemsHubTabs.MyActivity]: WorkItemsHubDataProviderConstants.MyActivityDataProvider,
    [WorkItemsHubTabs.RecentlyUpdated]: WorkItemsHubDataProviderConstants.RecentlyUpdatedDataProvider,
    [WorkItemsHubTabs.RecentlyCreated]: WorkItemsHubDataProviderConstants.RecentlyCreatedDataProvider,
    [WorkItemsHubTabs.RecentlyCompleted]: WorkItemsHubDataProviderConstants.RecentlyCompletedDataProvider,
    [WorkItemsHubTabs.MyTeams]: WorkItemsHubDataProviderConstants.MyTeamsDataProvider
};

/**
 * Provides the raw hub data.
 */
export namespace WorkItemsHubDataProvider {
    export function refreshDataAsync(tabId: string): IPromise<WorkItemsHubData> {
        const dataProviderId = getDataProviderId(tabId);
        const contribution = {
            id: dataProviderId,
            properties: {
                "serviceInstanceType": ServiceInstanceTypes.TFS
            }
        } as Contributions_Contracts.Contribution;

        const dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.ensureDataProvidersResolved([contribution], true)
            .then((result) => endEnsureDataProvidersResolved(tabId, result));
    }

    export function getData(tabId: string): WorkItemsHubData {
        const dataProviderId = getDataProviderId(tabId);
        const dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.getPageData<WorkItemsHubData>(dataProviderId);
    }

    export function getDataForCurrentTab(): WorkItemsHubData {
        const currentTabId = getCurrentTabId();
        return getData(currentTabId);
    }

    export function getDataProviderId(tabId: string): string {
        const tab: WorkItemsHubTabs = WorkItemsHubTabUtils.TabEnumValueByTabIdMap[tabId];
        let dataProviderId = DataProviderByTabMap[tab];
        if (!dataProviderId) {
            dataProviderId = WorkItemsHubDataProviderConstants.DefaultDataProvider;
        }

        return dataProviderId;
    }

    export function getCurrentTabId(): string {
        const navHistoryService = getNavigationHistoryService();
        const routeValues = navHistoryService.getCurrentRouteValues();
        const name = routeValues[WorkItemsHubRouteConstants.TabRouteParameterName];
        return WorkItemsHubTabUtils.getTabIdByName(name);
    }

    export function pageWorkItems(workItemIds: number[], fieldReferenceNames: string[]): IPromise<IPageData> {
        const tfsContext = TfsContext.getDefault();
        const connection = ProjectCollection.getConnection(tfsContext);
        const store = connection.getService<WorkItemStore>(WorkItemStore);

        return Q.Promise<IPageData>((resolve, reject) => store.beginPageWorkItems(workItemIds, fieldReferenceNames, resolve, reject));
    }

    function endEnsureDataProvidersResolved(tabId: string, result: Q.PromiseState<WorkItemsHubData>[]): WorkItemsHubData {
        if (result && result[0].state === "rejected") {
            VSS.handleError(result[0].reason);
            return null;
        }
        return WorkItemsHubDataProvider.getData(tabId);
    }
}
