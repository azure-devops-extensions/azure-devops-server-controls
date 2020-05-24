import { AnalyticsODataVersions, ODataQueryOptions } from "Analytics/Scripts/OData";
import { BatchRequest } from "Analytics/Scripts/VSS.Analytics.WebApi";
import { CacheableAnalyticsQueryBase } from "Analytics/Scripts/QueryCache/CacheableAnalyticsQueryBase";

import { AnalyticsTestTrendConstants } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendConstants';

/** Provides bookkeeping tracking for all Ax queries owned by the Test Trend Widget. */
export abstract class AnalyticsTestTrendQueryBase<T> extends CacheableAnalyticsQueryBase<T> {
    protected static readonly axODataVersion: string = AnalyticsODataVersions.v2Preview;
    constructor(queryOptions: ODataQueryOptions) {
        const extendedQueryOptions = $.extend(
            {},
            queryOptions,
            { useBatch: BatchRequest.Auto });

        super(AnalyticsTestTrendConstants.command, AnalyticsTestTrendConstants.featureName, extendedQueryOptions);
    }
}
