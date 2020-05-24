import WebApi_RestClient = require("VSS/WebApi/RestClient");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import DistributedTask = require("Presentation/Scripts/TFS/Generated/TFS.DistributedTask.Constants");

export class DistributedTaskCollectionHttpClient extends WebApi_RestClient.VssHttpClient {
    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    // get a plan
    public beginGetTaskOrchestrationPlan(planId: string): IPromise<DistributedTaskContracts.TaskOrchestrationPlan> {
        return this._beginRequest<DistributedTaskContracts.TaskOrchestrationPlan>({
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Plans,
            responseType: DistributedTaskContracts.TypeInfo.TaskOrchestrationPlan,
            routeValues: {
                planId: planId
            }
        });
    }

    /**
     * Queries a source-endpoint for data.
     * @param project The project name.
     * @param taskEndpoint Definition of the endpoint to query.
     */
    public beginQueryEndpoint(project: string, taskEndpoint: DistributedTaskContracts.TaskDefinitionEndpoint): IPromise<string[]> {
        return this._beginRequest<string[]>(
            {
                httpMethod: "POST",
                area: DistributedTask.TaskResourceIds.AreaName,
                locationId: DistributedTask.TaskResourceIds.TaskEndpoint,
                responseIsCollection: true,
                routeValues: {
                    project: project
                },
                data: taskEndpoint
            });
    }

    /**
     * Get all logs for a plan
     * @param planId The plan id
     */
    public beginGetLogs(planId: string): IPromise<DistributedTaskContracts.TaskLog[]> {
        return this._beginRequest<DistributedTaskContracts.TaskLog[]>({
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Logs,
            responseType: DistributedTaskContracts.TypeInfo.TaskLog,
            responseIsCollection: true,
            routeValues: {
                planId: planId
            }
        });
    }

    // get a log
    public beginGetLog(planId: string, logId: number, startLine: number = 0, endLine: number = 0): IPromise<string[]> {
        var data: any = {};
        if (!!startLine) {
            data.startLine = startLine;
        }
        if (!!endLine) {
            data.endLine = endLine;
        }

        // TODO: check the Content-Range header. note: if there are no lines, it probably doesn't exist
        return this._beginRequest<IWebApiArrayResult>(
            {
                httpMethod: "GET",
                area: DistributedTask.TaskResourceIds.AreaName,
                locationId: DistributedTask.TaskResourceIds.Logs,
                routeValues: {
                    planId: planId,
                    logId: logId
                },
                data: data
            })
            .then((result: IWebApiArrayResult) => {
                return <string[]>result.value;
            });
    }
}

export class DistributedTaskApplicationHttpClient extends WebApi_RestClient.VssHttpClient {    
    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginAddTaskAgentPool(pool: DistributedTaskContracts.TaskAgentPool): IPromise<DistributedTaskContracts.TaskAgentPool> {
        return this._beginRequest<DistributedTaskContracts.TaskAgentPool>({
            httpMethod: "POST",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Pools,
            responseType: DistributedTaskContracts.TypeInfo.TaskAgentPool,
            responseIsCollection: false,
            data: pool
        });
    }

    public beginDeleteTaskAgentPool(poolId: number): IPromise<any> {
        return this._beginRequest<DistributedTaskContracts.TaskAgentPool>({
            httpMethod: "DELETE",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Pools,
            routeValues: {
                poolId: poolId
            }
        });
    }
    
    public beginRefreshTaskAgentPool(poolId: number): IPromise<any> {
        return this._beginRequest({
            httpMethod: "POST",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.AgentMessages,
            routeValues: {
                poolId: poolId
            }
        });
    }

    /**
     * Gets Task Definitions
     * @param visiblity A comma delimited area names to filter out task definitions, if is null or empty, gets all tasks
     */
    public beginGetTaskDefinitions(visibility: string[]): IPromise<DistributedTaskContracts.TaskDefinition[]> {
        return this._beginRequest<DistributedTaskContracts.TaskDefinition[]>({
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Tasks,
            responseIsCollection: true,
            queryParams: {
                visibility: visibility
            }
        });
    }

    // get task agent pools
    public beginGetTaskAgentPools(poolName?: string, properties?: string): IPromise<DistributedTaskContracts.TaskAgentPool[]> {
        return this._beginRequest<DistributedTaskContracts.TaskAgentPool[]>(
            {
                httpMethod: "GET",
                area: DistributedTask.TaskResourceIds.AreaName,
                responseType: DistributedTaskContracts.TypeInfo.TaskAgentPool,
                responseIsCollection: true,
                locationId: DistributedTask.TaskResourceIds.Pools,
                routeValues: {
                    poolName: poolName
                },
                data: {
                    properties: properties
                }
            });
    }

    // get task agent pool
    public beginGetTaskAgentPool(poolId: number, properties?: string): IPromise<DistributedTaskContracts.TaskAgentPool> {
        return this._beginRequest<DistributedTaskContracts.TaskAgentPool>(
            {
                httpMethod: "GET",
                area: DistributedTask.TaskResourceIds.AreaName,
                responseType: DistributedTaskContracts.TypeInfo.TaskAgentPool,
                locationId: DistributedTask.TaskResourceIds.Pools,
                routeValues: {
                    poolId: poolId
                },
                data: {
                    properties: properties
                }
            });
    }

    // get task agents
    public beginGetTaskAgents(poolId: number, hostName?: string, includeCapabilities?: boolean, propertyFilters?: string, demands?: string): IPromise<DistributedTaskContracts.TaskAgent[]> {
        return this._beginRequest<DistributedTaskContracts.TaskAgent[]>(
            {
                httpMethod: "GET",
                area: DistributedTask.TaskResourceIds.AreaName,
                responseType: DistributedTaskContracts.TypeInfo.TaskAgent,
                responseIsCollection: true,
                locationId: DistributedTask.TaskResourceIds.Agents,
                routeValues: {
                    poolId: poolId
                },
                data: {
                    hostName: hostName,
                    includeCapabilities: includeCapabilities,
                    propertyFilters: propertyFilters,
                    demands: demands
                }
            });
    }

    // delete a task agent
    public beginDeleteTaskAgent(poolId: number, agentId: number): IPromise<any> {
        return this._beginRequest({
            httpMethod: "DELETE",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Agents,
            routeValues: {
                poolId: poolId,
                agentId: agentId
            }
        });
    }

    public beginGetPackage(packageType: string): IPromise<DistributedTaskContracts.TaskPackageMetadata> {
        return this._beginRequest({
            httpMethod: "GET",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Packages,
            routeValues: {
                packageType: packageType
            }
        });
    }

    public beginUpdateTaskAgent(poolId: number, agent: DistributedTaskContracts.TaskAgent): IPromise<DistributedTaskContracts.TaskAgent> {
        return this._beginRequest<DistributedTaskContracts.TaskAgent>({
            httpMethod: "PATCH",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Agents,
            responseType: DistributedTaskContracts.TypeInfo.TaskAgent,
            routeValues: {
                poolId: poolId,
                agentId: agent.id
            },
            data: agent
        });
    }

    public beginUpdateTaskAgentPool(poolId: number, pool: DistributedTaskContracts.TaskAgentPool): IPromise<DistributedTaskContracts.TaskAgentPool> {
        return this._beginRequest<DistributedTaskContracts.TaskAgentPool>({
            httpMethod: "PATCH",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.Pools,
            responseType: DistributedTaskContracts.TypeInfo.TaskAgentPool,
            routeValues: {
                poolId: poolId
            },
            data: pool
        });
    }

    // update user capabilities for an agent
    public beginUpdateTaskAgentUserCapabilities(poolId: number, agentId: number, capabilities: { [key: string]: string; }): IPromise<DistributedTaskContracts.TaskAgent> {
        return this._beginRequest<DistributedTaskContracts.TaskAgent>({
            httpMethod: "PUT",
            area: DistributedTask.TaskResourceIds.AreaName,
            locationId: DistributedTask.TaskResourceIds.UserCapabilities,
            responseType: DistributedTaskContracts.TypeInfo.TaskAgent,
            routeValues: {
                poolId: poolId,
                agentId: agentId
            },
            data: capabilities
        });
    }
}
