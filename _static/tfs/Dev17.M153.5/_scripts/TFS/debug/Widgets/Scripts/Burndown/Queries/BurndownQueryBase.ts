import { AnalyticsODataVersions, ODataQueryOptions } from "Analytics/Scripts/OData";
import { BatchRequest } from "Analytics/Scripts/VSS.Analytics.WebApi";
import { CacheableAnalyticsQueryBase } from "Analytics/Scripts/QueryCache/CacheableAnalyticsQueryBase";
import { BurndownConstants } from "Widgets/Scripts/Burndown/BurndownConstants";

/** Provides bookkeeping tracking for all Ax queries owned by Burndown Widget. */
export abstract class BurndownQueryBase<T> extends CacheableAnalyticsQueryBase<T> {
    protected static readonly axODataVersion: string = AnalyticsODataVersions.v1;
    constructor(queryOptions: ODataQueryOptions) {
        const extendedQueryOptions = $.extend(
            {},
            queryOptions,
            { useBatch: BatchRequest.Enabled });

        super(BurndownConstants.command, BurndownConstants.featureName, extendedQueryOptions);
    }
}
