import * as Q from "q";

import * as VssContext from "VSS/Context";
import { VssConnection } from "VSS/Service";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery"
import { BuildHttpClient } from "TFS/Build/RestClient";
import { DefinitionReference, DefinitionQueryOrder } from "TFS/Build/Contracts";
import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";

/**Op-store cacheable query for Build Definitions. */
export class BuildDefinitionOpStoreQuery implements ICacheableQuery<BuildDefinition[]>{
    private projectId: string;

    //Provides a list of builds scoped to the *current* project, as that is what the underlying client does.
    constructor() {
        this.projectId = VssContext.getDefaultWebContext().project.id;
    }

    public getKey(): string {
        return this.getQueryName() + '.' + this.projectId;
    }

    public getQueryName(): string {
        return "BuildDefinitionsOpStoreQuery";
    }

    public runQuery(): IPromise<BuildDefinition[]> {
        let client = VssConnection.getConnection().getHttpClient(BuildHttpClient);

        let extendedSettings = [];
        extendedSettings["queryOrder"] = DefinitionQueryOrder.DefinitionNameAscending;

        return client.getDefinitions(
            this.projectId,
            ...extendedSettings
        ).then((buildDefinitions) => {
            return buildDefinitions.map((value, i) => {
                return {
                    BuildDefinitionId: value.id,                    
                    Name: value.name,
                } as BuildDefinition;
            });
        });
    }
}