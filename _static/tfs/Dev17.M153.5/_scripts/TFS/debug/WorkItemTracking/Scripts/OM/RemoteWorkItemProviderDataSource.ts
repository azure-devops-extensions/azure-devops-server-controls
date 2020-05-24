import { WorkItem, WorkItemStateColor, WorkItemTypeColorAndIcon } from "TFS/WorkItemTracking/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { getRemoteWorkItemAuthSessionToken, getRemoteContext } from "WorkItemTracking/Scripts/Utils/RemoteWorkItemUtils";
import { getService as getUserClaimService, UserClaims } from "VSS/User/Services";

export interface IRemoteWorkItemData {
    "work-item-data"?: WorkItem;
    "work-item-type-color-icon"?: WorkItemTypeColorAndIcon;
    "work-item-type-state-color"?: WorkItemStateColor;
}

export interface IRemoteWebApiWorkItemData {
    "work-item-host-id"?: string;
    "work-item-host-name"?: string;
    "work-item-host-url"?: string;
    "work-item-project-id"?: string;
    "work-item-data"?: WorkItem;
}

export interface IRemoteWorkItemsDataProviderPayload {
    "work-items-data"?: IRemoteWorkItemData[];
}

const RemoteWorkitemDataProvider = "ms.vss-work-web.remote-workitem-data-provider";
const RemoteWorkitemByUrlDataProvider = "ms.vss-work-web.remote-workitem-url-data-provider";

export function getMetadataKey(remoteHostId: string, remoteProjectId: string, workItemType: string, state?: string): string {
    return `${remoteHostId}${remoteProjectId}${workItemType}${state}`;
}

export async function getRemoteWorkItemsById(
    ids: number[],
    remoteHostId: string,
    remoteHostUrl: string,
    remoteProjectId: string
): Promise<IRemoteWorkItemsDataProviderPayload> {
    const dataProviderRequestProperties = {
        "ids": ids
    };
    const targetContext: WebContext = getRemoteContext(remoteHostId, remoteHostUrl);
    const dataProviderScope = {
        name: "project",
        value: remoteProjectId
    };
    const isAnonymousUser = getUserClaimService().hasClaim(UserClaims.Anonymous);
    let authTokenManager;
    // If it is anonymous user, we dont want to get auth token
    if (!isAnonymousUser) {
        authTokenManager = await getRemoteWorkItemAuthSessionToken();
    }
    return getService(WebPageDataService, targetContext)
        .getRemoteDataAsync(RemoteWorkitemDataProvider, dataProviderScope, authTokenManager, null, dataProviderRequestProperties);
}

export async function getRemoteWorkItemByUrl(
    workItemUrl: string
): Promise<IRemoteWebApiWorkItemData> {
    const dataProviderRequestProperties = {
        "url": workItemUrl
    };
    return getService(WebPageDataService, getDefaultWebContext())
        .getDataAsync(RemoteWorkitemByUrlDataProvider, null, dataProviderRequestProperties);
}
