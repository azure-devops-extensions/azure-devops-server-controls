import * as Q from "q";
import * as VSS_Service from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { WebPageDataService } from "VSS/Contributions/Services";

export interface IDataProviderSource {
    refresh(pullRequestId: number, mode?: DataProviderMode): IPromise<void>;
}

export type DataProviderMode = "iterations" | "simple" | "autoComplete";

export class DataProviderSource implements IDataProviderSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_AUTOCOMPLETE_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-autocomplete-data-provider";

    private _webPageDataService: WebPageDataService;
    private _autoCompleteDataProvider: Contribution;

    constructor() {
        this._webPageDataService = VSS_Service.getService(WebPageDataService) as WebPageDataService;

        this._autoCompleteDataProvider = {
            id: DataProviderSource.DATA_ISLAND_AUTOCOMPLETE_PROVIDER_ID,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;
    }

    public refresh(pullRequestId: number, mode?: DataProviderMode): IPromise<void> {
        if (mode === "autoComplete") {
            return this._refreshAutoCompleteProvider(pullRequestId);
        }

        return this._refreshDetailsProvider(pullRequestId, mode);
    }

    private _refreshDetailsProvider(pullRequestId: number, mode?: DataProviderMode): IPromise<void> {
        return Q.Promise<void>((resolve, reject, notify) => {
            const properties = {
                mode: mode || "simple",
                pullRequestId: pullRequestId
            };

            this._webPageDataService.reloadCachedProviderData(
                DataProviderSource.DATA_ISLAND_PROVIDER_ID,
                () => resolve(null),
                properties);
        });
    }

    private _refreshAutoCompleteProvider(pullRequestId: number): IPromise<void> {
        const properties = {
            pullRequestId: pullRequestId
        };

        return this._webPageDataService.ensureDataProvidersResolved([this._autoCompleteDataProvider], true, properties);
    }
}
