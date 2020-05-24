
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WebSessionToken } from "VSS/Authentication/Contracts";
import { WebSessionTokenManager } from "VSS/Authentication/Services";
import { ContextHostType, WebContext } from "VSS/Common/Contracts/Platform";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import {
    RemoteLinkStatusPendingAdd,
    RemoteLinkStatusSuccess,
    RemoteLinkStatusFailed,
    RemoteLinkStatusPendingUpdate,
    RemoteLinkStatusPendingDelete
} from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { RemoteLinkStatus } from "TFS/WorkItemTracking/ExtensionContracts";
import { Uri } from "VSS/Utils/Url";
import { publishErrorToTelemetry } from "VSS/Error";

interface IRemoteWorkItemSessionToken {
    remoteWorkItemSessionToken: WebSessionToken;
}

const RemoteWorkItemSessionTokenDataProvider = "ms.vss-work-web.remote-workitem-token-data-provider";

export function getRemoteContext(remoteHostId: string, remoteUrl: string): WebContext {
    const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    remoteUrl = remoteUrl + "/";
    return {
        account: {
            id: remoteHostId,
            name: "",
            relativeUri: "",
            uri: remoteUrl
        },
        collection: {
            id: remoteHostId,
            name: "",
            relativeUri: "",
            uri: remoteUrl
        },
        host: {
            authority: "",
            hostType: ContextHostType.ProjectCollection,
            id: remoteHostId,
            name: "",
            scheme: tfsContext.contextData.host.scheme,
            relativeUri: "",
            uri: remoteUrl,
            isAADAccount: tfsContext.contextData.host.isAADAccount,
        },
        project: null,
        team: null,
        user: tfsContext.contextData.user
    } as WebContext;
}

let sessionTokenData: IRemoteWorkItemSessionToken;
export async function getRemoteWorkItemAuthSessionToken(): Promise<WebSessionTokenManager> {
    if (sessionTokenData) {
        // Check token expiration time and invalidate if it's almost expired. Check 1 minute before to prevent issues caused by network latency
        if (sessionTokenData.remoteWorkItemSessionToken
            && sessionTokenData.remoteWorkItemSessionToken.validTo
            && new Date().getTime() > (sessionTokenData.remoteWorkItemSessionToken.validTo.getTime() - 60000)) {
            // Token almost expired, invalidate cache to force a new token
            sessionTokenData = null;
        }
    }
    if (!sessionTokenData) {
        sessionTokenData = await _getRemoteWorkItemSessionToken();
    }

    let authTokenManger: WebSessionTokenManager;
    if (sessionTokenData && sessionTokenData.remoteWorkItemSessionToken) {
        authTokenManger = new WebSessionTokenManager(sessionTokenData.remoteWorkItemSessionToken);
    }

    return authTokenManger;
}

function _getRemoteWorkItemSessionToken(): Promise<IRemoteWorkItemSessionToken> {
    return getService(WebPageDataService)
        .getDataAsync<IRemoteWorkItemSessionToken>(RemoteWorkItemSessionTokenDataProvider);
}

export function getFriendlyRemoteLinkStatus(remoteLinkStatus: RemoteLinkStatus): string {
    switch (remoteLinkStatus) {
        case RemoteLinkStatus.PendingAdd:
            return RemoteLinkStatusPendingAdd;
        case RemoteLinkStatus.Success:
            return RemoteLinkStatusSuccess;
        case RemoteLinkStatus.Failed:
            return RemoteLinkStatusFailed;
        case RemoteLinkStatus.PendingUpdate:
            return RemoteLinkStatusPendingUpdate;
        case RemoteLinkStatus.PendingDelete:
            return RemoteLinkStatusPendingDelete;
    }
}

export function sanitizeRemoteWorkItemUrl(url: string): string {
    try {
        const uri = Uri.parse(url);
        const path = uri.path.replace(/\/$/, "");
        return `${uri.scheme}://${uri.host}/${path}`;
    } catch (error) {
        if (error) {
            publishErrorToTelemetry(error);
        }
        return "";
    }
}

export function getRemoteWorkItemRestUrl(remoteHostUrl: string, projectName: string, workItemId: number): string {
    return `${remoteHostUrl}/${projectName}/_apis/wit/workItems/${workItemId}`;
}
