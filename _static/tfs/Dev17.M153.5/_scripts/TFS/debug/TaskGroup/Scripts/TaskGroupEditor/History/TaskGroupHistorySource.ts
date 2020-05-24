import * as Q from "q";
import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import { IHistorySource } from "DistributedTaskControls/Sources/HistorySource";

import { DistributedTaskServiceCollectionClient } from "TaskGroup/Scripts/Clients/DistributedTaskClient";

export class TaskGroupHistorySource extends Singleton implements IHistorySource {

    constructor() {
        super();
        this._distributedTaskClient = ServiceClientManager.GetServiceClient<DistributedTaskServiceCollectionClient>(DistributedTaskServiceCollectionClient);
    }

    public static instance(): TaskGroupHistorySource {
        return super.getInstance<TaskGroupHistorySource>(TaskGroupHistorySource);
    }

    public static dispose(): void {
        this.instance()._distributedTaskClient = null;
        super.dispose();
    }

    public getTaskGroupRevisions(taskGroupId: string): IPromise<DTContracts.TaskGroupRevision[]> {
        return this._distributedTaskClient.getTaskGroupHistory(taskGroupId);
    }

    public getDefinitionRevision(definitionId: string, revision: number): IPromise<string> {
        return this._distributedTaskClient.getTaskGroupRevision(definitionId, revision);
    }

    private _distributedTaskClient: DistributedTaskServiceCollectionClient;
}