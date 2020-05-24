import { AnalyticsODataVersions, OData, ODataQueryOptions } from "Analytics/Scripts/OData";
import { CacheableQueryService } from "Analytics/Scripts/QueryCache/CacheableQueryService";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery";
import { BatchRequest } from "Analytics/Scripts/VSS.Analytics.WebApi";
import { IODataQueryResponse } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as Service from "VSS/Service";

class AnalyticsODataQueryByOptions implements ICacheableQuery<IODataQueryResponse> {
    constructor(private _command: string, private _oDataQueryOptions: ODataQueryOptions, private _timeoutMs: number) { }

    public runQuery(): IPromise<IODataQueryResponse> {
        return OData.query(this._command, this._oDataQueryOptions, this._timeoutMs);
    }

    public getKey(): string {
        return JSON.stringify(this._oDataQueryOptions);
    }
}

class AnalyticsODataQueryByUrl implements ICacheableQuery<IODataQueryResponse> {
    constructor(private _command: string, private _odataQueryUrl: string, private _timeoutMs: number, private _useBatch: BatchRequest) { }

    public runQuery(): IPromise<IODataQueryResponse> {
        return OData.queryByUrl(this._command, this._odataQueryUrl, this._timeoutMs, this._useBatch);
    }

    public getKey(): string {
        return this._odataQueryUrl;
    }
}

export abstract class AnalyticsODataClientBase {

    constructor(private _command: string) {
        this._cacheableQueryService = Service.getService(CacheableQueryService);
    }

    protected queryOData(queryOptions: ODataQueryOptions, fetchSinglePage?: boolean): IPromise<IODataQueryResponse> {
        //Setting some queryOptions
        queryOptions.oDataVersion = AnalyticsODataVersions.v2Preview;
        queryOptions.followNextLink = !fetchSinglePage;
        queryOptions.useBatch = BatchRequest.Auto;
        
        const _oDataQuery = new AnalyticsODataQueryByOptions(this._command, queryOptions, this._timeoutMs);

        let isCachedData: boolean = this._cacheableQueryService.hasCachedData(_oDataQuery);
        return this._cacheableQueryService.getCacheableQueryResult(_oDataQuery).then((responseData: IODataQueryResponse) => {
            responseData.isCachedData = isCachedData;
            return responseData;
        });
    }

    protected queryODataByUrl(requestUrl: string): IPromise<IODataQueryResponse> {
        const _oDataQuery = new AnalyticsODataQueryByUrl(this._command, requestUrl, this._timeoutMs, BatchRequest.Auto);

        let isCachedData: boolean = this._cacheableQueryService.hasCachedData(_oDataQuery);
        return this._cacheableQueryService.getCacheableQueryResult(_oDataQuery).then((responseData: IODataQueryResponse) => {
            responseData.isCachedData = isCachedData;
            return responseData;
        });
    }

    private readonly _timeoutMs: number = 120000;       // 2 minutes.
    private _cacheableQueryService: CacheableQueryService;
}