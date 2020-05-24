import * as Service from "VSS/Service";
import { CacheableQueryService } from "Analytics/Scripts/QueryCache/CacheableQueryService";
import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";
import { Release } from 'Widgets/Scripts/DataServices/ConfigurationQueries/Release';
import { BuildDefinitionOpStoreQuery } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinitionOpStoreQuery";
import { ReleaseDefinitionOpStoreQuery } from "Widgets/Scripts/DataServices/ConfigurationQueries/ReleaseDefinitionOpStoreQuery";
import * as Dictionary from "Widgets/Scripts/Utilities/Dictionary";


export class PipelinesDataProvider {

    private cacheableQueryService = Service.getService(CacheableQueryService);

    public getBuildPipelines(): IPromise<{ [key: string]: BuildDefinition }> {
        return this.cacheableQueryService.getCacheableQueryResult(new BuildDefinitionOpStoreQuery()).then(
            items => Dictionary.fromArray(items, item => String(item.BuildDefinitionId))
        );
    }

    public getReleasePipelines(): IPromise<{ [key: string]: Release }> {
        return this.cacheableQueryService.getCacheableQueryResult(new ReleaseDefinitionOpStoreQuery()).then(
            items => Dictionary.fromArray(items, item => String(item.ReleaseDefinitionId))
        );
    }
}