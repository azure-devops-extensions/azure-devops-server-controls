// Copyright (c) Microsoft Corporation.  All rights reserved.

import Q = require("q");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import * as Utils_String from "VSS/Utils/String";

import * as RMUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import {DeploymentPoolSummary, DeploymentPoolCommonSource} from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
// Actions
import MachineGroups_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupsActions");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import MachineGroup_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupsActions");

import DTContracts = require("TFS/DistributedTask/Contracts");

export class MachineGroupsActionCreator {

    constructor(source?: Model.MachineGroups) {
        this._source = source || new Model.MachineGroups();
        this._deploymentPoolCommonSource = DeploymentPoolCommonSource.instance();
    }

    public loadDeploymentGroupsMetricsView(continuationToken ?: string, append: boolean = false, nameFilter?: string) {
        let progressId_loadMGMetricsView = VSS.globalProgressIndicator.actionStarted("loadMachineGroupsMetrics", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupsMetricsBegin");
        let getDataPromise = this._source.beginGetDeploymentGroupsMetrics(nameFilter, continuationToken);
        getDataPromise.then((deploymentGroupsMetricsResult: Model.DeploymentGroupsMetricsResult) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupsMetricsComplete");
            let poolsSummaryPromise = this._deploymentPoolCommonSource.beginGetDeploymentPoolsSummary(null, DTContracts.DeploymentPoolSummaryExpands.DeploymentGroups);
            poolsSummaryPromise.then((poolsSummary: DeploymentPoolSummary[])  => {
                let deploymentGroupsMetrics = deploymentGroupsMetricsResult.deploymentGroupsMetrics;
                if(deploymentGroupsMetrics) {
                    for(let mg of deploymentGroupsMetrics){
                        mg.isShared = false;
                        for(let pool of poolsSummary){
                            if(pool.id == mg.deploymentMachineGroupMetrics.deploymentGroup.pool.id){
                                if(pool.deploymentGroups.length > 1) {
                                    mg.isShared = true;
                                }
                                break;
                            }                
                        }
                    }
                }
                MachineGroups_Actions.deploymentGroupsMetricsLoaded.invoke({ deploymentGroupsMetricsResult: deploymentGroupsMetricsResult, append: append });
                VSS.globalProgressIndicator.actionCompleted(progressId_loadMGMetricsView);
            }, (error) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.LandingOnMachineGroupHubScenario);
                VSS.globalProgressIndicator.actionCompleted(progressId_loadMGMetricsView);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, error);
            });
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.LandingOnMachineGroupHubScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_loadMGMetricsView);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public deleteMachineGroup(mgid: number) {
        let progressId_deleteMG = VSS.globalProgressIndicator.actionStarted("deleteMachineGroup", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteMachineGroupBegin");
        let newMgPromise = this._source.beginDeleteMachineGroup(mgid);
        newMgPromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteMachineGroupComplete");
            MachineGroups_Actions.machineGroupDeleted.invoke(mgid);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteMG);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.DeleteMachineGroupScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteMG);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public loadAvailableSharedPools() {
        Q.all([this.beginGetDeploymentPoolsWithUsePermission(), this.beginDeploymentPoolsSummary()])
            .spread((deploymentPools: DTContracts.TaskAgentPool[], deploymentPoolsSummary: DeploymentPoolSummary[]) => {

                let availableSharedPoolsSummary: DeploymentPoolSummary[] = []
                if (deploymentPools.length > 0 && deploymentPoolsSummary.length > 0) {

                    let projectId = RMUtils.UrlHelper.getProjectId();

                    // Create the PoolSummery map with pool id as key
                    // Filter the PoolSummery which contains the has reference dg with current project
                    var deploymentPoolsSummaryMap = deploymentPoolsSummary.reduce(function (dpSummaryMap, dpSummery) {
                        if (dpSummery.deploymentGroups.length > 0)
                        {
                            let isDgExistsWithCurrentProject: boolean = false;
                            for (var dg of dpSummery.deploymentGroups) {
                                if (dg.project.id == projectId) {
                                    isDgExistsWithCurrentProject = true;
                                    break;
                                }
                            }

                            if (!isDgExistsWithCurrentProject) {
                                dpSummaryMap[dpSummery.id] = dpSummery;
                            }
                        }
                        else
                        {
                            dpSummaryMap[dpSummery.id] = dpSummery;
                        }

                        return dpSummaryMap;
                    }, {});

                    if (Object.keys(deploymentPoolsSummaryMap).length > 0)
                    {
                        deploymentPools.forEach(dpPool => {
                            if (!!deploymentPoolsSummaryMap[dpPool.id])
                            {
                                availableSharedPoolsSummary.push(deploymentPoolsSummaryMap[dpPool.id])
                            }
                        })
                    }
                }
                
                MachineGroups_Actions.availableSharedPoolsLoaded.invoke(availableSharedPoolsSummary.sort((r1, r2) => Utils_String.localeIgnoreCaseComparer(r1.name, r2.name)));
            });
    }

    private beginGetDeploymentPoolsWithUsePermission(): IPromise<DTContracts.TaskAgentPool[]> {
        return this._source.beginGetDeploymentPools(DTContracts.TaskAgentPoolActionFilter.Use);
    }

    private beginDeploymentPoolsSummary(): IPromise<DeploymentPoolSummary[]> {
        return this._deploymentPoolCommonSource.beginGetDeploymentPoolsSummary(null, DTContracts.DeploymentPoolSummaryExpands.DeploymentGroups);
    }

    private _source: Model.MachineGroups;
    private _deploymentPoolCommonSource: DeploymentPoolCommonSource;
}

export var ActionCreator = new MachineGroupsActionCreator();
