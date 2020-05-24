import { queuesRetrieved } from "Build/Scripts/Actions/Actions";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { TaskAgentQueue, TaskAgentQueueActionFilter } from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import { VssConnection } from "VSS/Service";

export class QueuesSource extends TfsService {
    private _taskAgentClient: TaskAgentHttpClient;

    private _retrieveOperations: IDictionaryNumberTo<boolean> = {};
    private _queuesPromise: IPromise<TaskAgentQueue[]> = null;

    public initializeConnection(connection: VssConnection) {
        super.initializeConnection(connection);

        this._taskAgentClient = this.getConnection().getHttpClient(TaskAgentHttpClient);
    }

    public getQueues(filter: TaskAgentQueueActionFilter): IPromise<TaskAgentQueue[]> {
        if (!this._retrieveOperations[filter]) {
            let projectId = this.getTfsContext().contextData.project.id;
            this._retrieveOperations[filter] = true;

            this._queuesPromise = this._taskAgentClient.getAgentQueues(projectId, null, filter);

            this._queuesPromise.then((queues) => {
                delete this._retrieveOperations[filter];

                queuesRetrieved.invoke({
                    filter: filter,
                    queues: queues
                });

            }, (err: any) => {
                delete this._retrieveOperations[filter];
                raiseTfsError(err);
            });
        }

        return this._queuesPromise;
    }
}