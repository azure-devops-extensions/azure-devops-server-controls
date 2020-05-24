import { ContextHostType } from "VSS/Common/Contracts/Platform";
import * as Authentication_Services from "VSS/Authentication/Services";
import * as Context from "VSS/Context";
import * as Locations from "VSS/Locations";
import * as Service from "VSS/Service";
import * as WebApi_RestClient from "VSS/WebApi/RestClient";

import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";

export class OrganizationTokenManagerService extends Service.VssService {
    private _authTokenManger: Authentication_Services.WebSessionTokenManager;

    public getOrganizationTokenManager(): Authentication_Services.WebSessionTokenManager {
        if (this._authTokenManger) {
            return this._authTokenManger;
        }

        try {
            const dataSvc = Service.getLocalService(HubWebPageDataService);
            this._authTokenManger = new Authentication_Services.WebSessionTokenManager(
                dataSvc.getOrganizationSessionToken(),
                dataSvc.getOrganizationUrl()
            );
        } catch (e) {
            // do nothing, we'll return undefined and VSS/Service will get the default auth token manager instead
        }

        return this._authTokenManger;
    }
}

export function getCollectionUrlForService(collectionHostId: string, serviceInstanceId: string): IPromise<string> {
    const context = clone<WebContext>(Context.getDefaultWebContext());

    context.collection.id = collectionHostId;
    context.host.id = collectionHostId;

    const authTokenManager = Service.getService(OrganizationTokenManagerService).getOrganizationTokenManager();

    return Locations.beginGetServiceLocation(
        serviceInstanceId,
        ContextHostType.ProjectCollection,
        context,
        true,
        authTokenManager
    );
}

// needed for deep-copying the IDictionaryStringTo<IPolicy[]> objects (and used in getCollectionUrlForService above as well)
export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function getClientForCollection<T extends WebApi_RestClient.VssHttpClient>(
    collectionId: string,
    httpClientType: {
        new (url: string, options?: WebApi_RestClient.IVssHttpClientOptions): T;
        serviceInstanceId: string;
    }
): IPromise<T> {
    return getCollectionUrlForService(collectionId, httpClientType.serviceInstanceId).then((collectionUrl: string) => {
        const instance = new httpClientType(collectionUrl);
        instance.authTokenManager = Service.getService(OrganizationTokenManagerService).getOrganizationTokenManager();

        return instance;
    });
}

export function getUpstreamLocator(collectionName: string, feedName: string, viewName: string): string {
    return `vsts-feed://${collectionName}/${feedName}@${viewName}`;
}
