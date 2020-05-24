import * as Service from "VSS/Service";

import { CacheableQueryService } from "Analytics/Scripts/QueryCache/CacheableQueryService";
import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";
import { BuildDefinitionOpStoreQuery } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinitionOpStoreQuery";

/**
 * Handles neccessary data-handling queries for this widget's config scenarios.
 */
export class TestVisualConfigDataManager {
    private cacheableQueryService = Service.getService(CacheableQueryService);

    public getDefinitions(): IPromise<BuildDefinition[]> {
        return this.cacheableQueryService.getCacheableQueryResult(new BuildDefinitionOpStoreQuery());
    }
}
