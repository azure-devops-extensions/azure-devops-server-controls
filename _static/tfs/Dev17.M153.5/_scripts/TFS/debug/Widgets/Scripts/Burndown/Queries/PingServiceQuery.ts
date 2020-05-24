import { ODataQueryOptions } from "Analytics/Scripts/OData";
import { BurndownQueryBase } from "Widgets/Scripts/Burndown/Queries/BurndownQueryBase";

/**
 * A simple throwaway query used to determine whether or not the Analytics Service is available.
 */
export class PingServiceQuery extends BurndownQueryBase<void>{
    constructor() {
        super(PingServiceQuery.generateQueryOptions());
    }

    private static generateQueryOptions(): ODataQueryOptions {
        return {
            entityType: "Dates",
            oDataVersion: BurndownQueryBase.axODataVersion,
            $top: "1",
            $select: "DateSK"
        };
    }

    public getQueryName(): string {
        return "PingServiceQuery";
    }
}