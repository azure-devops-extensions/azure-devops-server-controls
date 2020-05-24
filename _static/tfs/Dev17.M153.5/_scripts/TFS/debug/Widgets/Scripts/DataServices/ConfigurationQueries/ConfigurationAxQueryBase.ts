import { AnalyticsODataVersions, ODataQueryOptions } from 'Analytics/Scripts/OData';
import { CacheableAnalyticsQueryBase } from 'Analytics/Scripts/QueryCache/CacheableAnalyticsQueryBase';

/** Base class for Ax-backed Configuration queries.
 *  Handles common telemetry accounting shared by all config queries.
 *  Look at parent class for implementation guidance. */
export abstract class ConfigurationAxQueryBase<T> extends CacheableAnalyticsQueryBase<T>{
    public static command: string = "AnalyticsPicker";
    protected static readonly axODataVersion1: string = AnalyticsODataVersions.v1;

    //Note: This was traditionally associated with the config consumer, but this pattern is muddied with the re-use scenario across widgets.
    //As we haven't been using this data, we're tracking under picker/config for now.
    public static featureName: string = "AnalyticsPicker";

    constructor(queryOptions: ODataQueryOptions){
        super(ConfigurationAxQueryBase.command, ConfigurationAxQueryBase.featureName, queryOptions);
    }
}