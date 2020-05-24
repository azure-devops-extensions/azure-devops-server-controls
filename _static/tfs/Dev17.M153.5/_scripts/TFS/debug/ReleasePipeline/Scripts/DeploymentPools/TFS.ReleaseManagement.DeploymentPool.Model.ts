// Copyright (c) Microsoft Corporation.  All rights reserved.

import Q = require("q");
import Utils_String = require("VSS/Utils/String");
import { VssIconType } from "VSSUI/VssIcon";

import DTContracts = require("TFS/DistributedTask/Contracts");
import { Singleton } from "DistributedTaskControls/Common/Factory";
import DTCoreContracts = require("TFS/Core/Contracts");
import Context = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Context");
import Manager = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Manager");
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import { DeploymentPool, TargetCapability, IIconStatus } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";

export interface Dictionary<T> {
    [index: number] : T;
};

export class DeploymentPoolSource extends Singleton {

    public beginGetDeploymentPools(): IPromise<DeploymentPool[]> {
        let dataDeferred: Q.Deferred<DeploymentPool[]> = Q.defer<DeploymentPool[]>();
        Context.serviceContext.agentPoolManager().beginGetDeploymentPools()
            .then((pools: DTContracts.TaskAgentPool[]) => {
                let deploymentPools: DeploymentPool[] = [];
                pools.forEach((pool: DTContracts.TaskAgentPool) => {
                deploymentPools.push(DeploymentPool.createFromPool(pool));
            });
                dataDeferred.resolve(deploymentPools);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetDeploymentPool(deploymentPoolId: number): IPromise<DeploymentPool> {
        let dataDeferred: Q.Deferred<DeploymentPool> = Q.defer<DeploymentPool>();
        Context.serviceContext.agentPoolManager().beginGetDeploymentPool(deploymentPoolId)
            .then((pool: DTContracts.TaskAgentPool) => {
                let deploymentPool: DeploymentPool = DeploymentPool.createFromPool(pool);
                dataDeferred.resolve(deploymentPool);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginCreateDeploymentPool(name: string): IPromise<DeploymentPool> {
        let dataDeferred: Q.Deferred<DeploymentPool> = Q.defer<DeploymentPool>();
        let newDeploymentPool = <DTContracts.TaskAgentPool> {
            name: name,
            poolType: DTContracts.TaskAgentPoolType.Deployment
        };

        Context.serviceContext.agentPoolManager().beginAddAgentPool(newDeploymentPool).then((pool: DTContracts.TaskAgentPool) => {
            let deploymentPool: DeploymentPool = DeploymentPool.createFromPool(pool);
            dataDeferred.resolve(deploymentPool);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginCreateDeploymentGroups(projectNameList: string[], deploymentPool: DeploymentPool): IPromise<any> {
        let projectNames = projectNameList || [];
        let createProjectPromise: IPromise<any>[] = [];
        let allPromiseDeferred: Q.Deferred<any> = Q.defer<any>();
        for(var projectName of projectNames) {
            var newDeploymentGroupName = new Utils_String.StringBuilder();
            newDeploymentGroupName.append(projectName);
            newDeploymentGroupName.append('-');
            newDeploymentGroupName.append(deploymentPool.name);
            let newDeploymentGroupDescription = Utils_String.format(Resources.AutoProvisonedDeploymentGroupDescription, deploymentPool.name);
            var newDeploymentGroup = <DTContracts.DeploymentGroupCreateParameter> {
                name: newDeploymentGroupName.toString(),
                description: newDeploymentGroupDescription,
                poolId: deploymentPool.id,
                pool: {
                    id: deploymentPool.id
                }
            }
            createProjectPromise.push(Context.serviceContext.machineGroupManager().beginAddMachineGroup(newDeploymentGroup, projectName));
        }

        Promise.all(createProjectPromise.map(this._promiseHandler)).then((responses) => {
            var failedResponse = responses.filter( response => response.status == "rejected");
            if(failedResponse.length) {
                var failedResponsesArray = [];
                for(var response of failedResponse) {
                    failedResponsesArray.push(response.error);
                }
                allPromiseDeferred.reject(failedResponsesArray.join(" "));
            }
            allPromiseDeferred.resolve(responses);
        });

        return allPromiseDeferred.promise;
    }

    public beginDeleteDeploymentPool(deploymentPoolId: number): IPromise<void> {
        return Context.serviceContext.agentPoolManager().beginDeleteAgentPool(deploymentPoolId);
    }

    public beginGetDeploymentPoolTargets(deploymentPoolId: number): IPromise<DeploymentPoolTarget[]> {
        let dataDeferred: Q.Deferred<DeploymentPoolTarget[]> = Q.defer<DeploymentPoolTarget[]>();
        Context.serviceContext.agentPoolManager().beginGetAgents(deploymentPoolId, null, false, true).then((agents: DTContracts.TaskAgent[]) => {
            let deploymentPoolTargets: DeploymentPoolTarget[] = [];

            agents.forEach((agent: DTContracts.TaskAgent) => {
                deploymentPoolTargets.push(DeploymentPoolTarget.createFromAgent(agent));
            });

            dataDeferred.resolve(deploymentPoolTargets);
        }, (error) => {
            dataDeferred.reject(error);
        });
        return dataDeferred.promise;
    }

    public beginGetDeploymentPoolTarget(deploymentPoolId: number, targetId: number, includeCapabilities?: boolean, includeAssignedRequest?: boolean): IPromise<DeploymentPoolTarget> {
        let dataDeferred: Q.Deferred<DeploymentPoolTarget> = Q.defer<DeploymentPoolTarget>();
        Context.serviceContext.agentPoolManager().beginGetAgent(deploymentPoolId, targetId, includeCapabilities, includeAssignedRequest).then((agent: DTContracts.TaskAgent) => {
            let deploymentPoolTarget = DeploymentPoolTarget.createFromAgent(agent);

            dataDeferred.resolve(deploymentPoolTarget);
        }, (error) => {
            dataDeferred.reject(error);
        });
        return dataDeferred.promise;
    }

    public beginGetDeploymentPoolJobRequests(deploymentPoolId: number): IPromise<Dictionary<DTContracts.TaskAgentJobRequest>> {
        let dataDeferred: Q.Deferred<Dictionary<DTContracts.TaskAgentJobRequest>> = Q.defer<Dictionary<DTContracts.TaskAgentJobRequest>>();
        Context.serviceContext.agentPoolManager().beginGetAgentRequestsForAgents(deploymentPoolId, null, 1).then((jobRequests: DTContracts.TaskAgentJobRequest[]) => {
            let result: Dictionary<DTContracts.TaskAgentJobRequest> = {};
            jobRequests.forEach((jobRequest) => {
               if(jobRequest.hasOwnProperty("result")) {
                   result[jobRequest.reservedAgent.id] = jobRequest;
               } 
            });
            dataDeferred.resolve(result);
        }, (error) => {
            dataDeferred.reject(error);
        });
        return dataDeferred.promise;
    }

    public beginUpdateDeploymentPool(deploymentPool: DTContracts.TaskAgentPool): IPromise<DeploymentPool> {
        let dataDeferred: Q.Deferred<DeploymentPool> = Q.defer<DeploymentPool>();

        Context.serviceContext.agentPoolManager().beginUpdateAgentPool(deploymentPool).then((pool: DTContracts.TaskAgentPool) => {
            let updatedPool: DeploymentPool = DeploymentPool.createFromPool(pool);
            dataDeferred.resolve(updatedPool);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginUpgradeDeploymentTargets(poolId: number): IPromise<void> {
        return Context.serviceContext.agentPoolManager().beginUpgradeAgents(poolId);
    }

    public beginDeleteTarget(poolId: number, targetId: number): IPromise<void> {
        return Context.serviceContext.agentPoolManager().beginDeleteAgent(poolId, targetId);
    }

    public beginUpdateTarget(poolId: number, agent: DTContracts.TaskAgent): IPromise<DTContracts.TaskAgent> {
        return Context.serviceContext.agentPoolManager().beginUpdateAgent(agent, poolId, agent.id);
    }

    public static instance(): DeploymentPoolSource {
        return super.getInstance<DeploymentPoolSource>(DeploymentPoolSource);
    }

    private _promiseHandler(promise) {
        return promise.then(function(v){ return {response:v, status: "resolved" }},
        function(e){
            return {error:e, status: "rejected" }});
    }
}

export class DeploymentPoolTarget {
    public id: number;
    public name: string;
    public latestDeployment: DTContracts.TaskAgentJobRequest;
    public status: string;
    public enabled: boolean;
    public capabilities: TargetCapability[];
    public agent: DTContracts.TaskAgent;

    public static getJobStatusIconClass(deploymentPoolTarget: DeploymentPoolTarget): IIconStatus {
        let iconName = "TriangleSolidRight12";
        let className = "deployment-pool-vss-Icon--TriangleSolidRight12";
        let iconType = VssIconType.fabric;
        if(deploymentPoolTarget.latestDeployment.hasOwnProperty("result")) {   
            if(deploymentPoolTarget.latestDeployment.result == DTContracts.TaskResult.Succeeded || deploymentPoolTarget.latestDeployment.result == DTContracts.TaskResult.SucceededWithIssues) {
                iconName = "Accept";
                className = "deployment-pool-vss-Icon--Accept";
            } else {
                iconName = "Cancel";
                className = "deployment-pool-vss-Icon--Cancel";
            }
        }
        return {
            iconName: iconName,
            className: className,
            iconType: iconType
        };
    }

    public static getDeploymentTargetIconClass() {
        return "machine-icon bowtie-icon bowtie-devices";
    }

    public static getDeploymentTargetStateIconClass(isOnline: boolean) {
        let iconName = "Blocked";
        let className = "deployment-pool-vss-Icon--Blocked";
        if (isOnline == true) {
            iconName = "CircleFill";
            className = "deployment-pool-vss-Icon--CircleFill";
        }
        return {
            iconName: iconName,
            className: className
        }
    }

    public static createFromAgent(agent: DTContracts.TaskAgent): DeploymentPoolTarget {

        let targetMachine: DeploymentPoolTarget = new DeploymentPoolTarget();
        targetMachine.id = agent.id;
        targetMachine.name = agent.name;
        if(agent.status == DTContracts.TaskAgentStatus.Offline) {
            targetMachine.status = DPUtils.DeploymentPoolsConstants.offlineStatus;
        } else {
            targetMachine.status = DPUtils.DeploymentPoolsConstants.onlineStatus;
        }
        targetMachine.enabled = agent.enabled;
        if(agent.assignedRequest) {
            targetMachine.latestDeployment = agent.assignedRequest;
        } else {
            targetMachine.latestDeployment = null;
        }
        targetMachine.capabilities = TargetCapability.getTargetCapabilities(agent);
        targetMachine.agent = agent;

        return targetMachine;
    }
}

var signalRDeferred: Q.Deferred<boolean> = Q.defer<boolean>();
export var signalRPromise: IPromise<boolean> = signalRDeferred.promise;

export function resolveSignalRPromise(): void {
    signalRDeferred.resolve(true);
}