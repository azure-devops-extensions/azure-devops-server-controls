import * as Context from "VSS/Context";

import { AnalyticsODataVersions } from "Analytics/Scripts/OData";
import { CacheableAnalyticsQueryBase } from "Analytics/Scripts/QueryCache/CacheableAnalyticsQueryBase";
import { Release } from "Widgets/Scripts/DataServices/ConfigurationQueries/Release";

//FUTURE: This should move to central location under Analytics, once Entity is completely populated with metadata (e.g. Name)
/**
 * Query for Releases in the specified project
 */
export class ReleasesQuery extends CacheableAnalyticsQueryBase<Release[]>{
    constructor() {
        super(CacheableAnalyticsQueryBase.CommonQueryFeatureName, CacheableAnalyticsQueryBase.CommonQueryFeatureName,
            {
                entityType: "Releases",
                oDataVersion: AnalyticsODataVersions.v1,
                project: Context.getDefaultWebContext().project.id,
                $orderby: "ReleaseId",
                $select: "ReleaseSK, ReleaseId, ReleaseDefinitionId"
            }
        );
    } 

    public getQueryName(): string {
        return "ReleasesQuery";
    }
}


