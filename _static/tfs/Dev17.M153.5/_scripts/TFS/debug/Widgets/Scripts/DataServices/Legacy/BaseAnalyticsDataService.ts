import { AnalyticsODataVersions, ODataQueryOptions } from 'Analytics/Scripts/OData';
import { AnalyticsChartingClient } from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";
import { QueryCache } from "Widgets/Scripts/DataServices/QueryCache";

/**
 * LEGACY BRIDGE
 *
 * Base implementation for cached client data services written against analytics.
 */
export class BaseAnalyticsDataService extends QueryCache {
    protected static readonly axODataVersion: string = AnalyticsODataVersions.v1;
    protected analyticsClient: AnalyticsChartingClient;

    constructor(command: string) {
        super();
        this.analyticsClient = new AnalyticsChartingClient(command);
    }
}
