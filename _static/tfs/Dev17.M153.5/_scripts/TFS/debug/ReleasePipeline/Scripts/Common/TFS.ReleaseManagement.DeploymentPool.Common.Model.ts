// Copyright (c) Microsoft Corporation.  All rights reserved.

import Q = require("q");
import Utils_String = require("VSS/Utils/String");
import { VssIconType } from "VSSUI/VssIcon";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import Context = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Context");
import DTContracts = require("TFS/DistributedTask/Contracts");
import DTCoreContracts = require("TFS/Core/Contracts");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");

export class DeploymentPoolCommonSource extends Singleton {

    public beginGetDeploymentPoolsSummary(poolName?: string, expands: DTContracts.DeploymentPoolSummaryExpands = DTContracts.DeploymentPoolSummaryExpands.DeploymentGroups): IPromise<DeploymentPoolSummary[]> {
        let dataDeferred: Q.Deferred<DeploymentPoolSummary[]> = Q.defer<DeploymentPoolSummary[]>();
        Context.serviceContext.agentPoolManager().beginGetDeploymentPoolSummary(poolName, expands).then((poolsSummary: DTContracts.DeploymentPoolSummary[]) => {
            let deploymentPoolsSummary: DeploymentPoolSummary[] = [];
            poolsSummary.forEach((poolSummary: DTContracts.DeploymentPoolSummary) => {
                deploymentPoolsSummary.push(DeploymentPoolSummary.create(poolSummary));
            });

            dataDeferred.resolve(deploymentPoolsSummary);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }
    
    public beginUpdateDeploymentGroupReferences(deploymentPool: DeploymentPool, dgsToRemove: DTContracts.DeploymentGroupReference[], projectsToAddDG?: string[]): IPromise<any> {
        let projectNames = projectsToAddDG || [];
        let DgsToDelete = dgsToRemove || [];
        let updateDeploymentGroupPromise: IPromise<any>[] = [];
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

            updateDeploymentGroupPromise.push(Context.serviceContext.machineGroupManager().beginAddMachineGroup(newDeploymentGroup, projectName));
        }

        for(var dg of DgsToDelete) {
            updateDeploymentGroupPromise.push(Context.serviceContext.machineGroupManager().beginDeleteMachineGroup(dg.id, dg.project.name));
        }

        Promise.all(updateDeploymentGroupPromise.map(this._promiseHandler)).then((responses) => {
            var failedResponse = responses.filter( response => response.status == "rejected");
            if(failedResponse.length) {
                var failedResponsesArray = [];
                for(var response of failedResponse) {
                    failedResponsesArray.push(response.error);
                }
                allPromiseDeferred.reject(failedResponsesArray.join("\n"));
            }
            allPromiseDeferred.resolve(responses);
        });

        return allPromiseDeferred.promise;
    }

    // Get top 1000 projects.
    public beginGetProjectList(top: number = 1000, skip?: number, continuationToken?: string): IPromise<TeamProjectReference[]> {
        return Context.serviceContext.projectManager().getProjects("WellFormed", top, skip, continuationToken);
    }
    
    private _promiseHandler(promise) {
        return promise.then(function(v){ return {response:v, status: "resolved" }},
        function(e){
            return {error:e, status: "rejected" }});
    }

    public static instance(): DeploymentPoolCommonSource {
        return super.getInstance<DeploymentPoolCommonSource>(DeploymentPoolCommonSource);
    }
}

export class DeploymentPoolSummary {
    public id: number;
    public name: string;
    public size: number;
    public onlineAgentsCount: number;
    public offlineAgentsCount: number;
    public deploymentGroups: DTContracts.DeploymentGroupReference[];
    public poolSummary: DTContracts.DeploymentPoolSummary;

    public static create(poolSummary: DTContracts.DeploymentPoolSummary): DeploymentPoolSummary {
        let deploymentPoolSummary: DeploymentPoolSummary = new DeploymentPoolSummary();
        deploymentPoolSummary.id = poolSummary.pool.id;
        deploymentPoolSummary.name = poolSummary.pool.name;
        deploymentPoolSummary.size = poolSummary.pool.size;
        deploymentPoolSummary.onlineAgentsCount = poolSummary.onlineAgentsCount;
        deploymentPoolSummary.offlineAgentsCount = poolSummary.offlineAgentsCount;
        deploymentPoolSummary.deploymentGroups = poolSummary.deploymentGroups || [];
        deploymentPoolSummary.poolSummary = poolSummary;
        return deploymentPoolSummary;
    }

    public static getSummaryStatus(deploymentPoolSummary: DeploymentPoolSummary): string {
        let summary: string = "";
        if (deploymentPoolSummary.offlineAgentsCount > 0) {
            summary += (deploymentPoolSummary.offlineAgentsCount + Resources.DeploymentTargetOffline);
        }

        if (deploymentPoolSummary.onlineAgentsCount > 0) {
            if (summary.length > 0) {
                summary += Resources.CommaSeparator;
            }
            summary += (deploymentPoolSummary.onlineAgentsCount + Resources.DeploymentTargetOnline);
        }
        return summary;
    }

    public static getSummaryStatusIconClass(deploymentPoolSummary: DeploymentPoolSummary): IIconStatus {
        let iconName: string = Utils_String.empty;
        let className: string = Utils_String.empty;
        let iconType = VssIconType.fabric;
        if (deploymentPoolSummary.offlineAgentsCount > 0) {
            iconName = "Blocked";
            className =  "summary-vss-Icon--Blocked";
        } else if (deploymentPoolSummary.onlineAgentsCount > 0) {
            iconName = "CircleFill";
            className = "summary-vss-Icon--CircleFill";
        } 
        return {
            iconName: iconName,
            className: className,
            iconType: iconType
        };
    }
}

export class TeamProjectReference {
    public id: string;
    public name: string;

    public static createFromProject(projectReference: DTCoreContracts.TeamProjectReference): TeamProjectReference {
        let teamProjectReference = new TeamProjectReference();
        teamProjectReference.id = projectReference.id;
        teamProjectReference.name = projectReference.name;

        return teamProjectReference;
    }
}

export class DeploymentPool {
    public id: number;
    public name: string;
    public size: number;
    public pool: DTContracts.TaskAgentPool;

    public static createFromPool(agentPool: DTContracts.TaskAgentPool): DeploymentPool {
        let deploymentPool: DeploymentPool = new DeploymentPool();
        deploymentPool.id = agentPool.id;
        deploymentPool.name = agentPool.name;
        deploymentPool.size = agentPool.size;
        deploymentPool.pool = agentPool;
        return deploymentPool;
    }
}

export class DeploymentGroupReferenceData {
    public deploymentGroup : DTContracts.DeploymentGroupReference;
    public isMarkedForDeleted : boolean;
}

export class TargetCapability {
    public name: string;
    public value: string;

    constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }

    public static getTargetCapabilities(agent: DTContracts.TaskAgent): TargetCapability[] {
        let targetCapabilities: TargetCapability[] = [];
        for (var key in agent.systemCapabilities) {
            var value = agent.systemCapabilities[key];
            targetCapabilities.push(new TargetCapability(key, value));
        }

        return targetCapabilities;
    }
}

export interface IIconStatus {    
    iconName: string;
    className: string;
    iconType: number;
}
