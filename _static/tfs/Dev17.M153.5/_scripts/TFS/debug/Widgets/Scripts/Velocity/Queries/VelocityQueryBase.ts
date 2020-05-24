import { AnalyticsODataVersions, ODataQueryOptions } from "Analytics/Scripts/OData";
import { CacheableAnalyticsQueryBase } from "Analytics/Scripts/QueryCache/CacheableAnalyticsQueryBase";
import { BatchRequest } from "Analytics/Scripts/VSS.Analytics.WebApi";

/** Provides bookkeeping tracking for all Ax queries owned by Velocity Widget. */
export abstract class VelocityQueryBase<T> extends CacheableAnalyticsQueryBase<T> {
    public static command: string = "Velocity";
    protected static readonly axODataVersion: string = AnalyticsODataVersions.v1;

    // Note: This was traditionally associated with the config consumer, but this pattern is muddied with the re-use scenario across widgets.
    // As we haven't been using this data, we're tracking under picker/config for now.
    public static featureName: string = "Velocity";

    constructor(queryOptions: ODataQueryOptions) {
        const extendedQueryOptions = $.extend(
            {},
            queryOptions,
            { useBatch: BatchRequest.Enabled });

        super(VelocityQueryBase.command, VelocityQueryBase.featureName, extendedQueryOptions);
    }
}
