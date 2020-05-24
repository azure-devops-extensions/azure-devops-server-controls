import * as Q from "q";

import * as WebPageData from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";

import { TaskAgentQueue, TaskAgentPool, TaskAgentQueueActionFilter } from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import * as Context from "VSS/Context";
import { VssConnection } from "VSS/Service";

/**
 * @brief Helper utility methods for Build Sources
 * @returns
 */
export class TaskAgentHelper {
    private static _vssConnection: VssConnection;
    private static _taskAgentClient: TaskAgentHttpClient;

    public static getTaskAgentClient(): TaskAgentHttpClient {
        if (!this._taskAgentClient) {
            this._taskAgentClient = this._getVssConnection().getHttpClient<TaskAgentHttpClient>(TaskAgentHttpClient);
        }

        return this._taskAgentClient;
    }

    public static getTaskAgentQueues(): IPromise<TaskAgentQueue[]> {
        const agentQueues: TaskAgentQueue[] = WebPageData.WebPageDataHelper.getTaskAgentQueues();

        return agentQueues ? Q.resolve(agentQueues) :
            this.getTaskAgentClient().getAgentQueues(Context.getDefaultWebContext().project.id, null, TaskAgentQueueActionFilter.Use);
    }

    public static getTaskAgentPools(): IPromise<TaskAgentPool[]> {
        const agentPools: TaskAgentPool[] = WebPageData.WebPageDataHelper.getTaskAgentPools();

        return agentPools ? Q.resolve(agentPools) : this.getTaskAgentClient().getAgentPools();
    }

    /**
     * @returns vssConnection object
     */
    private static _getVssConnection(): VssConnection {
        if (!this._vssConnection) {
            this._vssConnection = new VssConnection(Context.getDefaultWebContext());
        }
        return this._vssConnection;
    }
}
