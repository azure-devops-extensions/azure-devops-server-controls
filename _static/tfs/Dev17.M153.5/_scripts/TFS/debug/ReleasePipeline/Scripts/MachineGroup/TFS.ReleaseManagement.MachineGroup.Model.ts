// Copyright (c) Microsoft Corporation.  All rights reserved.

import Q = require("q");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VssContext = require("VSS/Context");
import { VssIconType } from "VSSUI/VssIcon";

import TaskAgentClient = require("TFS/DistributedTask/TaskAgentRestClient");
import DTContracts = require("TFS/DistributedTask/Contracts");
import DTConstants = require("DistributedTaskControls/Generated/DistributedTask.Constants");

import {DeploymentPoolSummary, IIconStatus} from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import RMWebApiServices = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.WebApiServices");
import Context = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Context");
import Manager = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Manager");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import { IDeploymentGroupsMetricsResult, IDeploymentTargetsResult } from "DistributedTaskControls/Common/Types";
import { IReleasesResult} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import RMContracts = require("ReleaseManagement/Core/Contracts");

export class MachineGroups {

    public beginGetMachineGroups(): IPromise<MachineGroup[]> {
        let dataDeferred: Q.Deferred<MachineGroup[]> = Q.defer<MachineGroup[]>();
        Context.serviceContext.machineGroupManager().beginGetMachineGroups().then((mgs: DTContracts.DeploymentGroup[]) => {
            let machineGroups: MachineGroup[] = [];

            mgs.forEach((mg: DTContracts.DeploymentGroup) => {
                machineGroups.push(MachineGroup.createFromMg(mg));
            });

            dataDeferred.resolve(machineGroups);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetAllDeploymentGroups(): IPromise<MachineGroup[]> {
        let dataDeferred: Q.Deferred<MachineGroup[]> = Q.defer<MachineGroup[]>();
        Context.serviceContext.machineGroupManager().beginGetAllDeploymentGroups().then((mgs: DTContracts.DeploymentGroup[]) => {
            let machineGroups: MachineGroup[] = [];

            mgs.forEach((mg: DTContracts.DeploymentGroup) => {
                machineGroups.push(MachineGroup.createFromMg(mg));
            });

            dataDeferred.resolve(machineGroups);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetDeploymentGroupsMetrics(dgName?: string, continuationToken?: string): IPromise<DeploymentGroupsMetricsResult> {
        return this.beginGetDeploymentGroupsMetricsWithRetry(1, 10, dgName, continuationToken);
    }

    public beginGetDeploymentGroupsMetricsWithRetry(attemptCount: number, maxRetryCount, dgName?: string, continuationToken?: string): IPromise<DeploymentGroupsMetricsResult> {
        let dataDeferred: Q.Deferred<DeploymentGroupsMetricsResult> = Q.defer<DeploymentGroupsMetricsResult>();
        Context.serviceContext.machineGroupManager().beginGetDeploymentGroupsMetrics(dgName, continuationToken, 25).then((dgsMetricsResult: IDeploymentGroupsMetricsResult) => {
            let deploymentGroupsMetrics: DeploymentGroupUIMetrics[] = [];
            dgsMetricsResult.deploymentGroupsMetrics.forEach((dgmetrics: DTContracts.DeploymentGroupMetrics) => {
                deploymentGroupsMetrics.push(DeploymentGroupUIMetrics.createUIMetricsFromDgMetrics(dgmetrics));
            });

            if(attemptCount <= maxRetryCount && deploymentGroupsMetrics.length == 0 && dgsMetricsResult.continuationToken != null) {
                this.beginGetDeploymentGroupsMetricsWithRetry(attemptCount + 1, maxRetryCount, dgName, dgsMetricsResult.continuationToken).then((deploymentGroupsMetricsResult: DeploymentGroupsMetricsResult) => {
                    dataDeferred.resolve(deploymentGroupsMetricsResult);
                });
            } else{
                dataDeferred.resolve(<DeploymentGroupsMetricsResult>{ deploymentGroupsMetrics: deploymentGroupsMetrics, continuationToken: dgsMetricsResult.continuationToken });
            }
            
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetDeploymentGroupMetricsByName(dgName: string): IPromise<DeploymentGroupUIMetrics> {
        let dataDeferred: Q.Deferred<DeploymentGroupUIMetrics> = Q.defer<DeploymentGroupUIMetrics>();
        let getDataPromise = this.beginGetDeploymentGroupsMetrics(dgName);
        getDataPromise.then((data: DeploymentGroupsMetricsResult) => {
            if (!!data && data.deploymentGroupsMetrics.length > 0 && data.deploymentGroupsMetrics[0].name == dgName)
            {
                dataDeferred.resolve(data.deploymentGroupsMetrics[0]);
            }
            else
            {
                dataDeferred.resolve(undefined);
            }
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetMachines(deploymentGroupId: number, tags?: string[], name?: string, partialNameMatch?: boolean, expand?: DTContracts.DeploymentTargetExpands, agentStatus?: DTContracts.TaskAgentStatusFilter, agentJobResult?: DTContracts.TaskAgentJobResultFilter, continuationToken?: string, top?: number, enabled?: boolean): IPromise<PagedTarget> {
        let dataDeferred: Q.Deferred<PagedTarget> = Q.defer<PagedTarget>();
        Context.serviceContext.machineGroupManager().beginGetDeploymentTargets(deploymentGroupId, tags, name, partialNameMatch, expand, agentStatus, agentJobResult, continuationToken, top, enabled).then((deploymentTargetsResult: IDeploymentTargetsResult) => {
            let pagedTarget: PagedTarget = new PagedTarget();
            let targets: Machine[] = [];
            if (deploymentTargetsResult) {
                deploymentTargetsResult.deploymentTargets.forEach((machine: DTContracts.DeploymentMachine) => {
                    targets.push(Machine.createFromMachine(machine));
                });
                pagedTarget.targets = targets;
                pagedTarget.continuationToken = deploymentTargetsResult.continuationToken;
            }
            dataDeferred.resolve(pagedTarget);
        }, (error) => {
            dataDeferred.reject(error);
            });

        return dataDeferred.promise;
    }

   // Get all targets of deployment Group
    public beginGetAllMachines(deploymentGroupId: number, tags?: string[], name?: string, partialNameMatch?: boolean, expand?: DTContracts.DeploymentTargetExpands, agentStatus?: DTContracts.TaskAgentStatusFilter, agentJobResult?: DTContracts.TaskAgentJobResultFilter, continuationToken?: string, top?: number): IPromise<Machine[]> {
        let dataDeferred: Q.Deferred<Machine[]> = Q.defer<Machine[]>();
        let machines: Machine[] = [];
        this._getAllMachinesRecursively(deploymentGroupId, tags, name, partialNameMatch, expand, agentStatus, agentJobResult, continuationToken, top, machines).then((machines: Machine[]) => {
            dataDeferred.resolve(machines);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    // Get deployment targets recursively
    private _getAllMachinesRecursively(deploymentGroupId: number, tags?: string[], name?: string, partialNameMatch?: boolean, expand?: DTContracts.DeploymentTargetExpands, agentStatus?: DTContracts.TaskAgentStatusFilter, agentJobResult?: DTContracts.TaskAgentJobResultFilter, continuationToken?: string, top?: number, machines?: Machine[]): IPromise<Machine[]> {
        let dataDeferred: Q.Deferred<Machine[]> = Q.defer<Machine[]>();
        let getDataPromise = Context.serviceContext.machineGroupManager().beginGetDeploymentTargets(
            deploymentGroupId,
            tags,
            name,
            partialNameMatch,
            expand,
            agentStatus,
            agentJobResult,
            continuationToken,
            top
        );
        getDataPromise.then(
            (deploymentTargetsResult: IDeploymentTargetsResult) => {
                if (!machines) {
                    machines = [];
                }
                if (deploymentTargetsResult) {
                    deploymentTargetsResult.deploymentTargets.forEach((machine: DTContracts.DeploymentMachine) => {
                        machines.push(Machine.createFromMachine(machine));
                    });
                }
                if (deploymentTargetsResult.continuationToken) {
                    return dataDeferred.resolve(this._getAllMachinesRecursively(deploymentGroupId, tags, name, partialNameMatch, expand, agentStatus, agentJobResult, deploymentTargetsResult.continuationToken, top, machines));
                } else {
                    return dataDeferred.resolve(machines);
                }
            }, (error) => {
                dataDeferred.reject(error);
            });
        return dataDeferred.promise;
    }

    public beginAddMachineGroup(mgName: string, description: string, poolId: number = 0): IPromise<MachineGroup> {
        let dataDeferred: Q.Deferred<MachineGroup> = Q.defer<MachineGroup>();
        let newMg = <DTContracts.DeploymentGroupCreateParameter>{
            name: mgName,
            description: description,
            poolId: poolId
        };

        if (poolId > 0) {
            newMg.pool = <DTContracts.DeploymentGroupCreateParameterPoolProperty>{
                id: poolId
            }
        }

        Context.serviceContext.machineGroupManager().beginAddMachineGroup(newMg).then((mg: DTContracts.DeploymentGroup) => {
            let machineGroup = MachineGroup.createFromMg(mg);

            dataDeferred.resolve(machineGroup);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginUpdateMachineGroup(mgId: number, mgName: string, description: string): IPromise<MachineGroup> {
        let dataDeferred: Q.Deferred<MachineGroup> = Q.defer<MachineGroup>();
        let updatedMg = <DTContracts.DeploymentGroupUpdateParameter>{
            name: mgName,
            description: description
        };
        Context.serviceContext.machineGroupManager().beginUpdateMachineGroup(mgId, updatedMg).then((mg: DTContracts.DeploymentGroup) => {
            Context.serviceContext.machineGroupManager().beginGetMachineGroup(mg.id).then((updatedMg: DTContracts.DeploymentGroup) => {
                let machineGroup = MachineGroup.createFromMg(updatedMg);

                dataDeferred.resolve(machineGroup);
            }, (error) => {
                dataDeferred.reject(error);
            });
        }, (error) => {
            dataDeferred.reject(error);
        });
        return dataDeferred.promise;
    }

    public beginDeleteMachineGroup(mgId: number): IPromise<void> {
        return Context.serviceContext.machineGroupManager().beginDeleteMachineGroup(mgId);
    }

    public beginGetMachineGroup(mgId: number, actionFilter?: DTContracts.DeploymentGroupActionFilter, expand?: DTContracts.DeploymentGroupExpands): IPromise<MachineGroup> {
        let dataDeferred: Q.Deferred<MachineGroup> = Q.defer<MachineGroup>();
        Context.serviceContext.machineGroupManager().beginGetMachineGroup(mgId, actionFilter, expand).then((mg: DTContracts.DeploymentGroup) => {
            let machineGroup = MachineGroup.createFromMg(mg);
            dataDeferred.resolve(machineGroup);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginUpdateMachines(mgId: number, updatedMachines: DTContracts.DeploymentMachine[]): IPromise<Machine[]> {
        let machineUpdateParameters: DTContracts.DeploymentTargetUpdateParameter[] = [];
        if (!!updatedMachines) {
            updatedMachines.forEach((machine: DTContracts.DeploymentMachine) => {
                let deploymentTargetUpdateParameter = <DTContracts.DeploymentTargetUpdateParameter>{
                    id: machine.id,
                    tags: machine.tags
                };

                machineUpdateParameters.push(deploymentTargetUpdateParameter);
            });
        }

        let dataDeferred: Q.Deferred<Machine[]> = Q.defer<Machine[]>();
        Context.serviceContext.machineGroupManager().beginUpdateTargets(mgId, machineUpdateParameters).then((deploymentMachines: DTContracts.DeploymentMachine[]) => {
            let machines: Machine[] = [];
            deploymentMachines.forEach((a: DTContracts.DeploymentMachine) => {
                machines.push(Machine.createFromMachine(a));
            });

            dataDeferred.resolve(machines);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetMachine(mgId: number, machineId: number, expand?: DTContracts.DeploymentTargetExpands): IPromise<Machine> {
        let dataDeferred: Q.Deferred<Machine> = Q.defer<Machine>();
        Context.serviceContext.machineGroupManager().beginGetDeploymentTarget(mgId, machineId, expand).then((deploymentMachine: DTContracts.DeploymentMachine) => {
                let machine = Machine.createFromMachine(deploymentMachine);

                dataDeferred.resolve(machine);
            }, (error) => {
                dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetMachineDeploymentFromJobRequest(request: DTContracts.TaskAgentJobRequest): IPromise<MachineDeployment> {
        let dataDeferred: Q.Deferred<MachineDeployment> = Q.defer<MachineDeployment>();
        this.beginGetMachineDeploymentsFromJobRequests([request]).then((machineDeployments: MachineDeployment[]) => {
            dataDeferred.resolve(machineDeployments[0]);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginGetMachineDeployments(mgId: number, machineId: number): IPromise<MachineDeployment[]> {
        let dataDeferred: Q.Deferred<MachineDeployment[]> = Q.defer<MachineDeployment[]>();
        let machineDeployments: MachineDeployment[] = [];

        Context.serviceContext.machineGroupManager().beginGetAgentRequestsForDeploymentTarget(mgId, machineId).then((requests: DTContracts.TaskAgentJobRequest[]) => {
            try {
                this.beginGetMachineDeploymentsFromJobRequests(requests).then((machineDeployments)=> {
                    dataDeferred.resolve(machineDeployments);
                });
            }
            catch(error) {
                dataDeferred.reject(error);    
            }
        }, (error) => {
            dataDeferred.reject(error);
        });
                
        return dataDeferred.promise;
    }

    public beginUpgradeAgents(deploymentGroupId: number): IPromise<void> {
        let dataDeferred: Q.Deferred<void> = Q.defer<void>();

        Context.serviceContext.machineGroupManager().beginUpgradeTargets(deploymentGroupId).then(() => {
            dataDeferred.resolve(undefined);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginDeleteMachine(mgId: number, machineId: number): IPromise<void> {
        let dataDeferred: Q.Deferred<void> = Q.defer<void>();
        Context.serviceContext.machineGroupManager().beginDeleteTarget(mgId, machineId).then(() => {
            dataDeferred.resolve(undefined);
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }

    public beginCreatePersonalAccessTokenForMachineGroup(machineGroupId: number): IPromise<string> {
        let dataDeferred: Q.Deferred<string> = Q.defer<string>();

        Context.serviceContext.machineGroupManager().beginCreatePersonalAccessTokenForMachineGroup(machineGroupId).then((token: any) => {
            dataDeferred.resolve(token.value);
        }, (error) => {
            dataDeferred.reject(error);
            });

        return dataDeferred.promise;
    }

     public beginGetDeploymentPools(actionFilter?: DTContracts.TaskAgentPoolActionFilter): IPromise<DTContracts.TaskAgentPool[]> {
        let dataDeferred: Q.Deferred<DTContracts.TaskAgentPool[]> = Q.defer<DTContracts.TaskAgentPool[]>();

        Context.serviceContext.agentPoolManager().beginGetDeploymentAgentPoolsWithActionFilter(actionFilter).then((pools: any) => {
            dataDeferred.resolve(pools);
        }, (error) => {
            dataDeferred.reject(error);
            });

        return dataDeferred.promise;
    }    
    
    public beginGetDeploymentPoolByName(poolName: string, actionFilter?: DTContracts.TaskAgentPoolActionFilter): IPromise<DTContracts.TaskAgentPool> {
        let dataDeferred: Q.Deferred<DTContracts.TaskAgentPool> = Q.defer<DTContracts.TaskAgentPool>();

        Context.serviceContext.agentPoolManager().beginGetDeploymentAgentPoolsWithActionFilter(actionFilter, poolName).then((pools: DTContracts.TaskAgentPool[]) => {
            if(pools.length > 0){
                dataDeferred.resolve(pools[0]);
            }
            else{
                dataDeferred.resolve(undefined);
            }
        }, (error) => {
            dataDeferred.reject(error);
        });

        return dataDeferred.promise;
    }  

    private _getReleaseIdFromRequest(request: DTContracts.TaskAgentJobRequest): number {
        var releaseId: string = request.owner._links.self.href;
        var releaseAPISplitArray = releaseId.split("/");
        releaseId = releaseAPISplitArray[releaseAPISplitArray.length - 1];
        return parseInt(releaseId);
    }
    
    private _getReleaseDefnIdFromRequest(request: DTContracts.TaskAgentJobRequest): number {
        var releaseId: string = request.definition._links.self.href;
        var releaseAPISplitArray = releaseId.split("/");
        releaseId = releaseAPISplitArray[releaseAPISplitArray.length - 1];
        return parseInt(releaseId);
    }

    private _getTimelines(planIdList) {
        var getTimelinesPromise: IPromise<DTContracts.Timeline[]>[] = [];
        for(var planId of planIdList) {
            getTimelinesPromise.push(Context.serviceContext.distributedTasksManager().getTimelines("deployment", planId));
        }

        return getTimelinesPromise;
    }

    private _getTimelineRecords(planId, timelineIdList: DTContracts.Timeline[]) {
        var getTimelineRecordsPromise: IPromise<DTContracts.TimelineRecord[]>[] = [];
        for(var timelineId of timelineIdList) {
            getTimelineRecordsPromise.push(Context.serviceContext.distributedTasksManager().getTimelineRecords("deployment", planId, timelineId.id));
        }

        return getTimelineRecordsPromise;
    }

    private _getErrorFromtimelineRecords(timelineRecords: DTContracts.TimelineRecord[]): string {
        var recordErrors: string[] = [];
        for(var timelineRecord of timelineRecords) {
            if(timelineRecord.result == DTContracts.TaskResult.Failed && timelineRecord.errorCount > 0) {
                for(var error of timelineRecord.issues) {
                    recordErrors.push(error.message);
                }
                break;
            }
        }
        return recordErrors.join("\n");
    }

    private _getRecordErrorsFromPlanIds(planIds: string[]): IPromise<{ [key: string]: string}> {
        var dataDeferred: Q.Deferred<{ [key: string]: string}> = Q.defer<{ [key: string]: string}>();
        var planIdToErrorMap: { [key: string]: string} = {};
        var timelines: IPromise<DTContracts.Timeline>[] = [];
        var getTimelinesPromise = this._getTimelines(planIds);
        Promise.all(getTimelinesPromise).then((timelinesList: DTContracts.Timeline[][]) => {
            var timelineRecordsPromise: IPromise<DTContracts.TimelineRecord[]>[] = [];
            for(var planIdIterator in planIds) {
                var recordsPromise = this._getTimelineRecords(planIds[planIdIterator], timelinesList[planIdIterator]);
                timelineRecordsPromise = timelineRecordsPromise.concat(recordsPromise);
            }

            Promise.all(timelineRecordsPromise).then((timelineRecordsList: DTContracts.TimelineRecord[][]) => {
                var recordIterator: number = 0;
                for(var planIdIterator in planIds) {
                    for(var timelineIterator in timelinesList[planIdIterator]) {
                        var currentTimelineRecords = timelineRecordsList[recordIterator];
                        var recordErrors = this._getErrorFromtimelineRecords(currentTimelineRecords);
                        if(planIdToErrorMap[planIds[planIdIterator]]) {
                            planIdToErrorMap[planIds[planIdIterator]] = planIdToErrorMap[planIds[planIdIterator]].concat(recordErrors);
                        }
                        else {
                            planIdToErrorMap[planIds[planIdIterator]] = recordErrors;
                        }
                        recordIterator += 1;
                    }
                }

                dataDeferred.resolve(planIdToErrorMap);

            }, (error) => {
                dataDeferred.reject(error);
            })

        },
        (error) => {
            dataDeferred.reject(error);
        });
        return dataDeferred.promise;
    }

    private beginGetMachineDeploymentsFromJobRequests(requests: DTContracts.TaskAgentJobRequest[]) : IPromise<MachineDeployment[]> {
        var releaseIds: Array<number> = [];
        var requestToReleaseIdMap: { [key: number]: number} = {};
        var requestToReleaseDefnMap: { [key: number]: boolean} = {};
        var releaseIdToReleaseMap: { [key: number]: RMContracts.Release} = {};
        var planIdToErrorMap: { [key: string]: string} = {};
        var failedRequestPlanIdList: string[] = [];
        let machineDeployments: MachineDeployment[] = [];
        let projectId = VssContext.getDefaultWebContext().project.id;
        let collectionId = VssContext.getDefaultWebContext().collection.id;
        let dataDeferred: Q.Deferred<MachineDeployment[]> = Q.defer<MachineDeployment[]>();

        var projectJobRequests: DTContracts.TaskAgentJobRequest[] = requests.filter((request) => {
            return request.hostId === collectionId && request.scopeId === projectId;
        });

        for(var request of projectJobRequests) {
            var releaseId = this._getReleaseIdFromRequest(request);
            if(releaseId) {
                if(releaseIds.indexOf(releaseId) == -1) {
                    releaseIds.push(releaseId);
                }                    
                requestToReleaseIdMap[request.requestId] = releaseId;
            }

            var releaseDefn = this._getReleaseDefnIdFromRequest(request);
            if(request.result === DTContracts.TaskResult.Failed && !requestToReleaseDefnMap[releaseDefn] && failedRequestPlanIdList.length <= 5) {
                failedRequestPlanIdList.push(request.planId);
            }
            requestToReleaseDefnMap[releaseDefn] = true;
        }
        
        var releaseIdsString: string = releaseIds.join(",");
        Context.serviceContext.releaseManager().beginGetReleasesWithContinuationToken(null, null, null, null, null, null, null, 
            null, null, null, 4, null, null, null, releaseIdsString).then((releasesResult: IReleasesResult) => {

            for(var release of releasesResult.releases) {
                releaseIdToReleaseMap[release.id] = release;
            }

            for(var request of projectJobRequests) {
                machineDeployments.push(MachineDeployment.create(request, 
                    releaseIdToReleaseMap[requestToReleaseIdMap[request.requestId]]
                ));
            }

            if(failedRequestPlanIdList.length > 0) {
                this._getRecordErrorsFromPlanIds(failedRequestPlanIdList).then((planIdToErrorMap: { [key: string]: string}) => {
                    for(var machineDeployment of machineDeployments) {
                        if(planIdToErrorMap[machineDeployment.request.planId]) {
                            machineDeployment.error = planIdToErrorMap[machineDeployment.request.planId];
                        }
                    }
                    dataDeferred.resolve(machineDeployments);
                }, (error) => {
                    dataDeferred.resolve(machineDeployments);
                });
            }
            else {
                dataDeferred.resolve(machineDeployments);
            }

        }, (error) => {
            dataDeferred.reject(error);
        }); 

        return dataDeferred.promise;
    }
}

export class MachineGroup {
    public id: number;
    public name: string;
    public description: string;
    public count: number;
    public machines: Machine[];
    public deploymentMachineGroup: DTContracts.DeploymentGroup;
    public machineTags: string[];

    public static createFromMg(mg: DTContracts.DeploymentGroup): MachineGroup {
        let machineGroup: MachineGroup = new MachineGroup();
        machineGroup.id = mg.id;
        machineGroup.name = mg.name;
        machineGroup.description = mg.description === undefined ? "" : mg.description;
        machineGroup.count = (!!mg.pool && !!mg.pool.size) ? mg.pool.size : 0;
        machineGroup.machines = [];
        machineGroup.machineTags = !!mg.machineTags ? mg.machineTags : [];
        machineGroup.deploymentMachineGroup = mg;
        if (mg.machines) {
            mg.machines.forEach((machine: DTContracts.DeploymentMachine) => {
                machineGroup.machines.push(Machine.createFromMachine(machine));
            });
        }

        return machineGroup;
    }
}

export class DeploymentGroupsMetricsResult {
    public deploymentGroupsMetrics: DeploymentGroupUIMetrics[];
    public continuationToken: string;
}

export class DeploymentGroupUIMetrics {
    public id: number;
    public name: string;
    public count: number;
    public offlineTargetCount: number = 0;
    public onlineTargetCount: number = 0;
    public passingTargetCount: number = 0;
    public failingTargetCount: number = 0;
    public notDeployedTargetCount: number = 0;
    public onlineAndFailingTargetCount: number = 0;
    public onlineAndPassingTargetCount: number = 0;
    public onlineAndNotDeployedTargetCount: number = 0;
    public deploymentGroupTypeIconClass: string;
    public deploymentMachineGroupMetrics: DTContracts.DeploymentGroupMetrics;
    public isShared?: boolean;

    public static getDeploymentStatus(deploymentGroupMetrics: DeploymentGroupUIMetrics): string {
        let summary: string = "";
        if (deploymentGroupMetrics.failingTargetCount > 0) {
            summary += (deploymentGroupMetrics.failingTargetCount + Resources.DeploymentTargetFailing);
        }

        if (deploymentGroupMetrics.passingTargetCount > 0) {
            if (summary.length > 0) {
                summary += Resources.DeploymentTargetMetricsSeparator;
            }
            summary += (deploymentGroupMetrics.passingTargetCount + Resources.DeploymentTargetPassing);
        }

        if (deploymentGroupMetrics.notDeployedTargetCount > 0) {
            if (summary.length > 0) {
                summary += Resources.DeploymentTargetMetricsSeparator;
            }
            summary += (deploymentGroupMetrics.notDeployedTargetCount + Resources.DeploymentTargetNeverDeployed);
        }
        return summary;
    }

    public static getDeploymentStatusIconClass(deploymentGroupMetrics: DeploymentGroupUIMetrics): IIconStatus {
        let iconName: string = Utils_String.empty;
        let className: string = Utils_String.empty;
        let iconType = VssIconType.fabric;
        if (deploymentGroupMetrics.failingTargetCount > 0) {
            iconName = "Cancel";
            className =  "machine-group-vss-Icon--Cancel";
        } else if (deploymentGroupMetrics.passingTargetCount > 0) {
            iconName = "Accept";
            className =  "machine-group-vss-Icon--Accept";
        } 
        else {
            return null;
        }
        
        return {
            iconName: iconName,
            className: className,
            iconType: iconType
        };
    }

    public static getTargetStatus(deploymentGroupMetrics: DeploymentGroupUIMetrics): string {
        let summary: string = "";
        if (deploymentGroupMetrics.offlineTargetCount > 0) {
            summary += (deploymentGroupMetrics.offlineTargetCount + Resources.DeploymentTargetOffline);
        }

        if (deploymentGroupMetrics.onlineTargetCount > 0) {
            if (summary.length > 0) {
                summary += Resources.CommaSeparator;
            }
            summary += (deploymentGroupMetrics.onlineTargetCount + Resources.DeploymentTargetOnline);
        }
        return summary;
    }

    public static getTargetStatusIconClass(deploymentGroupMetrics: DeploymentGroupUIMetrics): IIconStatus {
        let iconName: string = Utils_String.empty;
        let className: string = Utils_String.empty;
        let iconType = VssIconType.fabric;
        if (deploymentGroupMetrics.offlineTargetCount > 0) {
            iconName = "Blocked";
            className =  "machine-group-vss-Icon--Blocked";
        } else if (deploymentGroupMetrics.onlineTargetCount > 0) {
            iconName = "CircleFill";
            className =  "machine-group-vss-Icon--CircleFill";
        } 
        return {
            iconName: iconName,
            className: className,
            iconType: iconType
        };
    }

    public static getSummaryStatus(deploymentGroupMetrics: DeploymentGroupUIMetrics): string {
        let summary: string = "";
        if (deploymentGroupMetrics.onlineAndFailingTargetCount > 0) {
            summary += (deploymentGroupMetrics.onlineAndFailingTargetCount + Resources.DeploymentTargetFailing);
        }

        if (deploymentGroupMetrics.offlineTargetCount > 0) {
            if (summary.length > 0) {
                summary += Resources.DeploymentTargetMetricsSeparator;
            }
            summary += (deploymentGroupMetrics.offlineTargetCount + Resources.DeploymentTargetOffline);
        }

        let healthyTargetsCount = deploymentGroupMetrics.onlineAndPassingTargetCount + deploymentGroupMetrics.onlineAndNotDeployedTargetCount;

        if (healthyTargetsCount > 0) {
            if (summary.length > 0) {
                summary += Resources.DeploymentTargetMetricsSeparator;
            }
            summary += (healthyTargetsCount + Resources.DeploymentTargetHealthy);
        }

        return summary;
    }

    public static getSummaryStatusIconClass(deploymentGroupMetrics: DeploymentGroupUIMetrics): IIconStatus {
        let iconName: string = Utils_String.empty;
        let className: string = Utils_String.empty;
        let iconType = VssIconType.fabric;
        if (deploymentGroupMetrics.onlineAndFailingTargetCount > 0) {
            iconName = "Cancel";
            className =  "machine-group-vss-Icon--Cancel";
        } else if (deploymentGroupMetrics.offlineTargetCount > 0) {
            iconName = "Blocked";
            className =  "machine-group-vss-Icon--Blocked";
        } else if (deploymentGroupMetrics.onlineAndPassingTargetCount > 0 || deploymentGroupMetrics.onlineAndNotDeployedTargetCount > 0) {
            iconName = "Accept";
            className =  "machine-group-vss-Icon--Accept";
        } 
        return {
            iconName: iconName,
            className: className,
            iconType: iconType
        };
    }

    public static createUIMetricsFromDgMetrics(dgMetrics: DTContracts.DeploymentGroupMetrics): DeploymentGroupUIMetrics {
        let deploymentGroupMetrics: DeploymentGroupUIMetrics = new DeploymentGroupUIMetrics();
        let deploymentGroup: DTContracts.DeploymentGroupReference = dgMetrics.deploymentGroup;

        deploymentGroupMetrics.deploymentMachineGroupMetrics = dgMetrics;
        deploymentGroupMetrics.id = deploymentGroup.id;
        deploymentGroupMetrics.name = deploymentGroup.name;
        deploymentGroupMetrics.deploymentGroupTypeIconClass = "bowtie-icon bowtie-server-remote machine-group-icon";
        deploymentGroupMetrics.onlineTargetCount  = DeploymentGroupUIMetrics.getCount("online",  dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows);
        deploymentGroupMetrics.offlineTargetCount = DeploymentGroupUIMetrics.getCount("offline", dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows); 
        deploymentGroupMetrics.passingTargetCount = DeploymentGroupUIMetrics.getCount("passing", dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows);
        deploymentGroupMetrics.failingTargetCount = DeploymentGroupUIMetrics.getCount("failing", dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows);
        deploymentGroupMetrics.notDeployedTargetCount = DeploymentGroupUIMetrics.getCount("NotDeployed", dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows);
        deploymentGroupMetrics.onlineAndFailingTargetCount = DeploymentGroupUIMetrics.getCount("OnlineAndFailing", dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows);
        deploymentGroupMetrics.onlineAndPassingTargetCount = DeploymentGroupUIMetrics.getCount("OnlineAndPassing", dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows);
        deploymentGroupMetrics.onlineAndNotDeployedTargetCount = DeploymentGroupUIMetrics.getCount("OnlineAndNotDeployed", dgMetrics.columnsHeader.dimensions, dgMetrics.columnsHeader.metrics, dgMetrics.rows);
        deploymentGroupMetrics.count = deploymentGroupMetrics.onlineTargetCount + deploymentGroupMetrics.offlineTargetCount;
        return deploymentGroupMetrics;
    }

    public static getPoolSummary(dgMetrics: DeploymentGroupUIMetrics): DeploymentPoolSummary{
        if(!!dgMetrics 
            && !!dgMetrics.deploymentMachineGroupMetrics
            && !!dgMetrics.deploymentMachineGroupMetrics.deploymentGroup
            && !!dgMetrics.deploymentMachineGroupMetrics.deploymentGroup.pool){
                let pool = dgMetrics.deploymentMachineGroupMetrics.deploymentGroup.pool;
                let poolSummary = <DTContracts.DeploymentPoolSummary> { offlineAgentsCount: dgMetrics.offlineTargetCount, onlineAgentsCount: dgMetrics.onlineTargetCount, pool: pool }
                return DeploymentPoolSummary.create(poolSummary);
            }

        return undefined;
    }

    private static getColumnMetadata(name: string, metadata: DTContracts.MetricsColumnMetaData[]): DTContracts.MetricsColumnMetaData {
        return metadata.filter(x => x.columnName.toLowerCase() === name.toLowerCase())[0];
    }

    private static getMetrics(
        dimensionsMetaData: DTContracts.MetricsColumnMetaData[],
        metricsMetaData: DTContracts.MetricsColumnMetaData[],
        columnValueFilters: ColumnValue[],
        metricMetaData: DTContracts.MetricsColumnMetaData,
        rows: DTContracts.MetricsRow[]): string[] {

        let result: string[] = [];
        let dimensionsIndexMapping = {};
        dimensionsMetaData.map((dimension: DTContracts.MetricsColumnMetaData, index: number) => {
            dimensionsIndexMapping[dimension.columnName] = index;
        });

        let metricIndex: number;
        metricsMetaData.map((metric: DTContracts.MetricsColumnMetaData, index: number) => {
            if (metric.columnName.toLowerCase() == metricMetaData.columnName.toLowerCase()) {
                metricIndex = index;
            }
        });

        rows.forEach((row: DTContracts.MetricsRow) => {
            let flag = true;
            columnValueFilters.forEach((columnValueFilter: ColumnValue) => {
                let index: number = dimensionsIndexMapping[columnValueFilter.metricsColumnMetadata.columnName];
                if (row.dimensions[index].toLowerCase() !== columnValueFilter.value.toLowerCase()) {
                    flag = false;
                }
            });
            if (flag == true) {
                result.push(row.metrics[metricIndex]);
            }
        });
        return result;
    }

    private static getCount(
        name: string,
        dimensionsMetaData: DTContracts.MetricsColumnMetaData[],
        metricsMetaData: DTContracts.MetricsColumnMetaData[],
        rows: DTContracts.MetricsRow[]): number {

        let totalDeploymentTargetCountColumnName = DTConstants.DeploymentGroupMetricsValidColumnNames.TotalDeploymentTargetCount;
        let deploymentTargetStateColumnName = DTConstants.DeploymentGroupMetricsValidColumnNames.DeploymentTargetState;
        let lastDeployedJobStatusColumnName = DTConstants.DeploymentGroupMetricsValidColumnNames.LastDeploymentStatus;
        let deploymentTargetOffline = DTConstants.DeploymentGroupMetricsValidTargetState.Offline;
        let deploymentTargetOnline = DTConstants.DeploymentGroupMetricsValidTargetState.Online;
        let jobFailed = DTConstants.DeploymentGroupMetricsValidJobStatus.NotSucceeded;
        let jobSucceeded = DTConstants.DeploymentGroupMetricsValidJobStatus.Succeeded;
        let jobNotDeployed = DTConstants.DeploymentGroupMetricsValidJobStatus.NotDeployed;

        let columnValueFilters: ColumnValue[] = [];
        let metricMetaData: DTContracts.MetricsColumnMetaData = DeploymentGroupUIMetrics.getColumnMetadata(totalDeploymentTargetCountColumnName, metricsMetaData);

        switch (name) {
            case "offline": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(deploymentTargetStateColumnName, dimensionsMetaData), deploymentTargetOffline));
                break;
            }

            case "online": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(deploymentTargetStateColumnName, dimensionsMetaData), deploymentTargetOnline));
                break;
            }

            case "passing": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(lastDeployedJobStatusColumnName, dimensionsMetaData), jobSucceeded));
                break;
            }

            case "failing": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(lastDeployedJobStatusColumnName, dimensionsMetaData), jobFailed));
                break;
            }

            case "NotDeployed": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(lastDeployedJobStatusColumnName, dimensionsMetaData), jobNotDeployed));
                break;
            }

            case "OnlineAndFailing": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(deploymentTargetStateColumnName, dimensionsMetaData), deploymentTargetOnline));
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(lastDeployedJobStatusColumnName, dimensionsMetaData), jobFailed));
                break;
            }

            case "OnlineAndPassing": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(deploymentTargetStateColumnName, dimensionsMetaData), deploymentTargetOnline));
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(lastDeployedJobStatusColumnName, dimensionsMetaData), jobSucceeded));
                break;
            }

            case "OnlineAndNotDeployed": {
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(deploymentTargetStateColumnName, dimensionsMetaData), deploymentTargetOnline));
                columnValueFilters.push(new ColumnValue(DeploymentGroupUIMetrics.getColumnMetadata(lastDeployedJobStatusColumnName, dimensionsMetaData), jobNotDeployed));
                break;
            }
        }

        let metrics: string[] = DeploymentGroupUIMetrics.getMetrics(dimensionsMetaData, metricsMetaData, columnValueFilters, metricMetaData, rows);
        let count: number = 0;
        metrics.forEach((metric: string) => {
            count += parseInt(metric);
        });
        return count;
    }
}

export class Machine {
    public id: number;
    public name: string;
    public enabled: boolean;
    public tags: Array<string>;
    public online: boolean;
    public systemConfiguration: MachineConfiguration[];
    public lastDeployment: MachineDeployment;
    public assignedRequest: MachineDeployment;
    public deploymentMachine: DTContracts.DeploymentMachine;

    public static createFromMachine(deploymentMachine: DTContracts.DeploymentMachine): Machine {
        let machine: Machine = new Machine();
        let agent = deploymentMachine.agent;
        machine.id = deploymentMachine.id;
        machine.name = agent.name;
        machine.enabled = agent.enabled;
        machine.online = agent.status === DTContracts.TaskAgentStatus.Online;
        machine.tags = deploymentMachine.tags === undefined ? [] : deploymentMachine.tags;
        machine.systemConfiguration = MachineConfiguration.getMachineConfigurations(agent);
        machine.lastDeployment = deploymentMachine.agent && deploymentMachine.agent.lastCompletedRequest ? MachineDeployment.create(deploymentMachine.agent.lastCompletedRequest) : null;
        machine.assignedRequest = deploymentMachine.agent && deploymentMachine.agent.assignedRequest ? MachineDeployment.create(deploymentMachine.agent.assignedRequest) : null;
        machine.deploymentMachine = deploymentMachine;
        return machine;
    }
}

export enum TaskAgentRequestState {
    InProgress = 1,
    Queued = 2,
    Completed = 4
}

export enum TargetStatusOptions {
    Offline = 1,
    Failing = 2,
    Healthy = 3,
    Filtered = 4,
}

export class PagedTarget {
    public targets: Machine[];
    public continuationToken?: string;
}

export class PagedTargetGroups {
    public offlinePagedTargetGroup: PagedTargetGroup;
    public failedPagedTargetGroup: PagedTargetGroup;
    public healthyPagedTargetGroup: PagedTargetGroup;
    public filteredPagedTargetGroup: PagedTargetGroup;
}

export interface IAgentFilters {
    agentStatus: DTContracts.TaskAgentStatusFilter;
    agentJobResult: DTContracts.TaskAgentJobResultFilter;
}

export class PagedTargetGroup {
    public targets: Machine[];
    public continuationToken?: string;
    public name?: string;
    public tagList?: string[];
    public statusList?: string[];
    public isNeverDeployed?: boolean;
}

export class MachineConfiguration {
    public name: string;
    public value: string;

    constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }

    public static getMachineConfigurations(agent: DTContracts.TaskAgent): MachineConfiguration[] {
        let machineConfigurations: MachineConfiguration[] = [];
        for (var key in agent.systemCapabilities) {
            var value = agent.systemCapabilities[key];
            machineConfigurations.push(new MachineConfiguration(key, value));
        }

        return machineConfigurations;
    }
}

export class MachineDeployment {
    public queueTimeText: string;

    public startTimeText: string;

    public durationText: string;

    public result: DTContracts.TaskResult;

    public statusIconClass: string;

    public definitionName: string;

    public definitionLink: string;

    public ownerName: string;

    public ownerLink: string;

    public request: DTContracts.TaskAgentJobRequest;

    public queueTime: Date;

    public startTime: Date;

    public releaseStatusIconClass: IIconStatus;

    public statusText: string;

    public releaseInfo?: RMContracts.Release;
    
    public finishTime: Date;

    public error: string;

    public static create(request: DTContracts.TaskAgentJobRequest, release?: RMContracts.Release): MachineDeployment {
        let deployment = new MachineDeployment();
        deployment.request = request;
        deployment.queueTimeText = request.queueTime != null ? Utils_Date.localeFormat(request.queueTime, "G") : null;
        deployment.startTimeText = request.receiveTime != null ? Utils_Date.localeFormat(request.receiveTime, "G") : null;
        deployment.durationText = deployment.getDurationString(request.receiveTime, request.finishTime);
        deployment.result = request.result;
        deployment.statusIconClass = deployment.getStatusIconClass();
        deployment.releaseStatusIconClass = deployment.getReleaseStatusIconClass();
        deployment.queueTime = request.queueTime;
        deployment.startTime = request.receiveTime;
        deployment.finishTime = request.finishTime;
        deployment.statusText = deployment.getStatusText();
        deployment.releaseInfo = release;
        deployment.error = null;
        if (request.definition) {
            deployment.definitionName = request.definition.name;

            if (request.definition._links && request.definition._links.web) {
                deployment.definitionLink = request.definition._links.web.href;
            }
            else {
                deployment.definitionLink = null;
            }
        }
        else {
            deployment.definitionLink = null;
            deployment.definitionName = Resources.MachineDeploymentUnknown;
        }

        if (request.owner) {
            if (!request.jobName) {
                deployment.ownerName = request.owner.name;
            }
            else {
                deployment.ownerName = Utils_String.format(Resources.TaskAgentJobNameFormat, request.owner.name, request.jobName);
            }

            if (request.owner._links && request.owner._links.web) {
                deployment.ownerLink = request.owner._links.web.href;
            }
            else {
                deployment.ownerLink = null;
            }
        }
        else {
            deployment.ownerLink = null;
            deployment.ownerName = Resources.MachineDeploymentUnknown;
        }

        return deployment;
    }

    public getState(): number {
        if (this.request.finishTime) {
            return TaskAgentRequestState.Completed;
        }
        else if (this.request.receiveTime) {
            return TaskAgentRequestState.InProgress;
        }
        else {
            return TaskAgentRequestState.Queued;
        }
    }

    private getDurationString(startDate: Date, endDate: Date): string {
        if (!startDate || !endDate) {
            return null;
        }

        let msecPerSecond = 1000;
        let msecPerMinute = 60000;
        let msecPerHour = 3600000;

        let msecs: number = endDate.valueOf() - startDate.valueOf();

        let seconds = Math.floor(msecs / msecPerSecond) % 60;
        let minutes = Math.floor(msecs / msecPerMinute) % 60;
        let hours = Math.floor(msecs / msecPerHour);

        let hoursValue = hours < 10 ? "0" + hours : hours;
        let minutesValue = minutes < 10 ? "0" + minutes : minutes;
        let secondsValue = seconds < 10 ? "0" + seconds : seconds;
        return Utils_String.format("{0}:{1}:{2}", hoursValue, minutesValue, secondsValue);
    }

    private getReleaseStatusIconClass(): IIconStatus {
        var state: TaskAgentRequestState = this.getState();
        if (state === TaskAgentRequestState.Completed) {
            switch (this.request.result) {
                case DTContracts.TaskResult.Succeeded:
                    return MGUtils.ReleaseIconClass.releaseSucceeded;

                case DTContracts.TaskResult.SucceededWithIssues:
                    return MGUtils.ReleaseIconClass.releaseSucceeded;

                case DTContracts.TaskResult.Abandoned:
                case DTContracts.TaskResult.Canceled:
                    return MGUtils.ReleaseIconClass.releaseCancelled;

                case DTContracts.TaskResult.Failed:
                    return MGUtils.ReleaseIconClass.releaseFailed;
            }
        }
        else if (state === TaskAgentRequestState.InProgress) {
            return MGUtils.ReleaseIconClass.releaseInProgress;
        }
        else {
            return MGUtils.ReleaseIconClass.releaseWaiting;
        }
    }

    private getStatusText(): string {
        var state: TaskAgentRequestState = this.getState();
        if (state === TaskAgentRequestState.Completed) {
            switch (this.request.result) {
                case DTContracts.TaskResult.Succeeded:
                    return Resources.ReleaseLogStateSucceeded;

                case DTContracts.TaskResult.SucceededWithIssues:
                    return Resources.ReleaseLogStateSucceeded;

                case DTContracts.TaskResult.Abandoned:
                    return Resources.ReleaseLogStateAbandoned;

                case DTContracts.TaskResult.Canceled:
                    return Resources.ReleaseLogStateCanceled;

                case DTContracts.TaskResult.Failed:
                    return Resources.ReleaseLogStateFailed;
            }
        }
        else if (state === TaskAgentRequestState.InProgress) {
            return Resources.InProgressReleasesText;
        }
        else {
            return Resources.ReleasesWaitingForDeploymentText;
        }
    }

    private getStatusIconClass(): string {
        var state: TaskAgentRequestState = this.getState();
        if (state === TaskAgentRequestState.Completed) {
            switch (this.request.result) {
                case DTContracts.TaskResult.Succeeded:
                    return "bowtie-icon bowtie-status-success";

                case DTContracts.TaskResult.SucceededWithIssues:
                    return "bowtie-icon bowtie-status-success";

                case DTContracts.TaskResult.Abandoned:
                case DTContracts.TaskResult.Canceled:
                    return "bowtie-icon bowtie-status-stop";

                case DTContracts.TaskResult.Failed:
                    return "bowtie-icon bowtie-status-failure";
            }
        }
        else if (state === TaskAgentRequestState.InProgress) {
            return "bowtie-icon bowtie-status-run";
        }
        else {
            return "bowtie-icon bowtie-status-waiting";
        }
    }
}

var signalRDeferred: Q.Deferred<boolean> = Q.defer<boolean>();
export var signalRPromise: IPromise<boolean> = signalRDeferred.promise;

export function resolveSignalRPromise(): void {
    signalRDeferred.resolve(true);
}

class ColumnValue
{
    public metricsColumnMetadata: DTContracts.MetricsColumnMetaData;
    public value: string;

    constructor(metadata: DTContracts.MetricsColumnMetaData, value: string)
    {
        this.metricsColumnMetadata = metadata;
        this.value = value;
    }
}
