/// <reference types="jquery" />
 
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import DistributedTaskConstants = require("Presentation/Scripts/TFS/Generated/TFS.DistributedTask.Constants");
import DistributedTaskWebApi = require("Presentation/Scripts/TFS/TFS.DistributedTask.WebApi");


/**
 * Converts a TaskVersion to a string
 * @param version The TaskVersion
 */
export function getTaskVersionString(version: DistributedTaskContracts.TaskVersion): string {
    return version.major.toString() + "." + version.minor.toString() + "." + version.patch.toString();
}

export class DistributedTaskClientService extends Service.VssService {
    private _collectionHttpClient: DistributedTaskWebApi.DistributedTaskCollectionHttpClient;
    private _applicationHttpClient: DistributedTaskWebApi.DistributedTaskApplicationHttpClient;

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);

        this._applicationHttpClient = Service.getApplicationClient(DistributedTaskWebApi.DistributedTaskApplicationHttpClient, this.getWebContext());
        this._collectionHttpClient = tfsConnection.getHttpClient(DistributedTaskWebApi.DistributedTaskCollectionHttpClient);
    }

    // get a plan
    public beginGetTaskOrchestrationPlan(planId: string): IPromise<DistributedTaskContracts.TaskOrchestrationPlan> {
        return this._collectionHttpClient.beginGetTaskOrchestrationPlan(planId);
    }

     /**
     * Gets Task Definitions
     * @param visibility A comma delimited area names to filter out task definitions, if is null or empty, gets all tasks
     */
    public beginGetTaskDefinitions(visibility: string[]): IPromise<DistributedTaskContracts.TaskDefinition[]> {
        return this._applicationHttpClient.beginGetTaskDefinitions(visibility)
            .then((taskDefinitions: DistributedTaskContracts.TaskDefinition[]) => {
                // lowercase the task ids
                $.each(taskDefinitions,(index: number, taskDefinition: DistributedTaskContracts.TaskDefinition) => {
                    taskDefinition.id = taskDefinition.id.toLowerCase();
                });
                return taskDefinitions;
            });
    }

    /**
     * Queries a source-endpoint for data.
     * @param project The project name.
     * @param taskEndpoint Definition of the endpoint to query.
     */
    public beginQueryEndpoint(project: string, taskEndpoint: DistributedTaskContracts.TaskDefinitionEndpoint): IPromise<string[]> {
        return this._collectionHttpClient.beginQueryEndpoint(project, taskEndpoint);
    }

    /**
     * Get all logs for a plan
     * @param planId The plan id
     */
    public beginGetLogs(planId: string): IPromise<DistributedTaskContracts.TaskLog[]> {
        return this._collectionHttpClient.beginGetLogs(planId);
    }

    // get a log
    public beginGetLog(planId: string, logId: number, startLine: number = 0, endLine: number = 0): IPromise<string[]> {
        return this._collectionHttpClient.beginGetLog(planId, logId, startLine, endLine);
    }

    /**
     * Add a task agent pool
     * @param pool The pool
     */
    public beginAddTaskAgentPool(pool: DistributedTaskContracts.TaskAgentPool): IPromise<DistributedTaskContracts.TaskAgentPool> {
        return this._applicationHttpClient.beginAddTaskAgentPool(pool);
    }

    // get task agent pools
    public beginGetTaskAgentPools(poolName?: string, properties?: string): IPromise<DistributedTaskContracts.TaskAgentPool[]> {
        return this._applicationHttpClient.beginGetTaskAgentPools(poolName, properties);
    }

    // refresh agent pool
    public beginRefreshTaskAgentPool(poolId: number): IPromise<any> {
        return this._applicationHttpClient.beginRefreshTaskAgentPool(poolId);
    }

    // get task agents
    public beginGetTaskAgents(poolId: number, hostName?: string, includeCapabilities?: boolean, propertyFilters?: string, demands?: string): IPromise<DistributedTaskContracts.TaskAgent[]> {
        return this._applicationHttpClient.beginGetTaskAgents(poolId, hostName, includeCapabilities, propertyFilters, demands);
    }

    // delete a task agent
    public beginDeleteTaskAgent(poolId: number, agentId: number): IPromise<any> {
        return this._applicationHttpClient.beginDeleteTaskAgent(poolId, agentId);
    }

    public beginUpdateTaskAgentPool(poolId: number, pool: DistributedTaskContracts.TaskAgentPool) {
        return this._applicationHttpClient.beginUpdateTaskAgentPool(poolId, pool);
    }

    // update user capabilities for a task agent
    public beginUpdateTaskAgentUserCapabilities(poolId: number, agentId: number, userCapabilities: { [key: string]: string; }): IPromise<DistributedTaskContracts.TaskAgent> {
        return this._applicationHttpClient.beginUpdateTaskAgentUserCapabilities(poolId, agentId, userCapabilities);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.DistributedTask.ClientServices", exports);
