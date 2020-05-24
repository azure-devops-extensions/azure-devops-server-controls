
import * as Service from "VSS/Service";
import { CacheableQueryService } from "Analytics/Scripts/QueryCache/CacheableQueryService";

import { BacklogConfigurationsQuery } from 'Analytics/Scripts/QueryCache/BacklogConfigurationsQuery';
import { WorkItemTypesQuery } from 'Analytics/Scripts/QueryCache/WorkItemTypesQuery';

import * as Work_Contracts from "TFS/Work/Contracts";

import * as WorkItemTracking_Contracts from "TFS/WorkItemTracking/Contracts";

export class WorkDataProvider {

    private cacheableQueryService = Service.getService(CacheableQueryService);

    public getCurrentProjectId(): string {
        return this.cacheableQueryService.getWebContext().project.id;
    }

    public getBacklogConfigurations():IPromise <Work_Contracts.BacklogConfiguration> {
        return this.cacheableQueryService.getCacheableQueryResult(new BacklogConfigurationsQuery());
    }

    public getWorkItemTypes() {
        let query = new WorkItemTypesQuery(this.getCurrentProjectId());
        return this.cacheableQueryService.getCacheableQueryResult(query)
    }
}