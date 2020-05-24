import * as VssContext from "VSS/Context";
import { VssConnection } from "VSS/Service";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery"
import { ReleaseHttpClient } from "ReleaseManagement/Core/RestClient";
import { ReleaseDefinitionQueryOrder } from "ReleaseManagement/Core/Contracts";
import { Release } from "Widgets/Scripts/DataServices/ConfigurationQueries/Release";

/** Op-store cacheable query for Release Definitions. Will be replaced by an Analytics-backed query (see ReleasesQuery.ts) in the future. */
export class ReleaseDefinitionOpStoreQuery implements ICacheableQuery<Release[]>{
    private projectId: string;

    constructor() {
        this.projectId = VssContext.getDefaultWebContext().project.id;
    }

    public getKey(): string {
        return this.getQueryName() + '.' + this.projectId;
    }

    public getQueryName(): string {
        return "ReleaseDefinitionsOpStoreQuery";
    }

    public runQuery(): IPromise<Release[]> {
        let client = VssConnection.getConnection().getHttpClient(ReleaseHttpClient);

        let extendedSettings = [];
        extendedSettings["queryOrder"] = ReleaseDefinitionQueryOrder.NameAscending;

        return client.getReleaseDefinitions(
            this.projectId,
            ...extendedSettings
        ).then((releaseDefinitions) => {
            return releaseDefinitions.map((value) => {
                return {
                    ReleaseDefinitionId: value.id,                    
                    Name: value.name,
                } as Release;
            });
        });
    }
}