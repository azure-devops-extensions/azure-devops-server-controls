import Q = require("q");
import * as VSS_Service from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { SourceConstants } from "VersionControl/Scenarios/PullRequestList/Sources/SourceConstants";

export interface IDataProviderSource {
    refresh(): IPromise<void>;
}

export class DataProviderSource implements IDataProviderSource {

    private _webPageDataService: WebPageDataService;

    constructor() {
        this._webPageDataService = VSS_Service.getService(WebPageDataService) as WebPageDataService;
    }

    public refresh(): IPromise<void> {
        return this._webPageDataService.invalidateCachedProviderData(SourceConstants.DATA_ISLAND_PROVIDER_ID, true);
    }
}