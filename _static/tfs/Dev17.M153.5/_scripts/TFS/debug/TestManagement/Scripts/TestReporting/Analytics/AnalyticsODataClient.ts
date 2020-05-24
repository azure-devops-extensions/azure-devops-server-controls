import { ODataQueryOptions } from "Analytics/Scripts/OData";
import { AnalyticsClientCore } from "Analytics/Scripts/QueryCache/AnalyticsClientCore";
import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";

export class AnalyticsODataClient extends AnalyticsClientCore {

    constructor(command: string) {
        super(command, AnalyticsODataClient.consumingArea);
    }

    public getBranches(projectId: string): IPromise<AnalyticsTypes.IAnalyticsBranchReference[]> {
        let queryOptions = {
            entityType: "Branches",
            project: projectId,
            $select: "BranchSK,BranchName,RepositoryId"
        } as ODataQueryOptions;

        return this.queryOData(queryOptions)
            .then((data: any) => {
                return data.value.map(b => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    return {
                        branchSK: b.BranchSK,
                        branchName: b.BranchName,
                        repositoryId: b.RepositoryId
                    } as AnalyticsTypes.IAnalyticsBranchReference;
                });
            });
    }

    /*
        * Queries the Analytics OData service, expresses consumer method name in telemetry for convenience.
        * @param queryOptions - (Optional) Options for the OData query.
    */
    protected queryOData(queryOptions?: ODataQueryOptions): IPromise<any> {        
        queryOptions.oDataVersion = queryOptions.oDataVersion ? queryOptions.oDataVersion : this.axODataSupportedVersion;

        return this.runODataQuery(queryOptions);
    }

    private readonly axODataSupportedVersion: string = "v2.0-preview";
    private static readonly consumingArea: string = "TestManagement";
}