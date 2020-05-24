// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS = require("VSS/VSS");
import Q = require("q");
import Utils_String = require("VSS/Utils/String");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Events_Services = require("VSS/Events/Services");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
// Actions
import MG_Events_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupEventsActions");
import MachineGroup_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActions");
import Machine_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineActions");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { ISecurityPermissions, IMachineTagsInfo } from 'ReleasePipeline/Scripts/MachineGroup/Stores/MachineGroupStore';
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import TFS_Host_TfsContext = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Host.TfsContext");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")

export class MachineGroupActionCreator {

    constructor(source?: Model.MachineGroups) {
        this._source = source || new Model.MachineGroups();
        this._deploymentPoolCommonSource = DeploymentPoolCommonModel.DeploymentPoolCommonSource.instance();
    }

    public getProjectList() {
        let newDpPromise: IPromise<DeploymentPoolCommonModel.TeamProjectReference[]>;
        // Get top 1000 projects.
        //TODO: use smaller top value and show more button for better user experience
        newDpPromise = this._deploymentPoolCommonSource.beginGetProjectList();
        newDpPromise.then((value: DeploymentPoolCommonModel.TeamProjectReference[]) => {
            MachineGroup_Actions.projectListLoaded.invoke(value);
        }, (error) => {
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateSharePoolFailureMessage, this, error);
        })
    }
    
    public updateDeploymentGroupReferences(deploymentPool: DeploymentPoolCommonModel.DeploymentPool, dgsToRemove: DTContracts.DeploymentGroupReference[], projectsToAddDG?: string[]) {
        let updateDPReferencePromise: IPromise<any>;
        updateDPReferencePromise = this._deploymentPoolCommonSource.beginUpdateDeploymentGroupReferences(deploymentPool, dgsToRemove, projectsToAddDG);
        updateDPReferencePromise.then((value)  => {
            let dpSummaryPromise = this._deploymentPoolCommonSource.beginGetDeploymentPoolsSummary(deploymentPool.name);
            dpSummaryPromise.then((poolsData: DeploymentPoolCommonModel.DeploymentPoolSummary[])  => {
                if (!!poolsData && poolsData.length > 0 && poolsData[0].name == deploymentPool.name)
                {
                    MachineGroup_Actions.deploymentGroupReferencesUpdated.invoke(poolsData[0]);
                }
            }, (error) => {
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateSharePoolFailureMessage, this, error);
            });
        },  (error) => {
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateSharePoolFailureMessage, this, error);
        });
    }
    
    public getDeploymentPoolSummary(poolName: string, actionFilter?: DTContracts.TaskAgentPoolActionFilter) {
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.getDeploymentPool");
        this._source.beginGetDeploymentPoolByName(poolName, actionFilter).then((pool: DTContracts.TaskAgentPool) => {
            let dpName: string = !!pool ? pool.name : null;
            if(!!dpName) {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolSummary");
                this._deploymentPoolCommonSource.beginGetDeploymentPoolsSummary(dpName).then((poolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[]) => {
                    if (!!poolSummary && poolSummary.length > 0 && poolSummary[0].name == dpName) {
                        let poolData = DeploymentPoolCommonModel.DeploymentPool.createFromPool(pool);
                        MachineGroup_Actions.deploymentPoolSummaryLoaded.invoke(poolSummary[0]);
                    }
                }, (error: any) => {
                    Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, error);
                });
            }
        }, (error: any) => {
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, error);
        });
    }

    public addMachineGroup(mgName: string, description: string, poolId: number = 0) {
        let progressId_addMG = VSS.globalProgressIndicator.actionStarted("addMachineGroup", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.CreateMachineGroupBegin");
        let newMgPromise: IPromise<Model.MachineGroup>;
        newMgPromise = this._source.beginAddMachineGroup(mgName, description, poolId);

        newMgPromise.then((machineGroup: Model.MachineGroup) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.CreateMachineGroupComplete");
            MachineGroup_Actions.machineGroupAdded.invoke(machineGroup);
            this.getDeploymentPoolSummary(machineGroup.deploymentMachineGroup.pool.name);
            this._checkDeploymentGroupManagePermission(machineGroup);

            VSS.globalProgressIndicator.actionCompleted(progressId_addMG);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.CreateOrUpdateMachineGroupScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_addMG);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public updateMachines(mgid: number, machines: DTContracts.DeploymentMachine[]) {
        let progressId_updateMachines = VSS.globalProgressIndicator.actionStarted("updateMachines", true);
        if (!!machines) {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateMachineBegin");
            let getDataPromise = this._source.beginUpdateMachines(mgid, machines);
            getDataPromise.then((updatedMachines: Model.Machine[]) => {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateMachineComplete");
                MachineGroup_Actions.machinesUpdated.invoke(updatedMachines);
                VSS.globalProgressIndicator.actionCompleted(progressId_updateMachines);
            }, (err: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.UpdateMachineScenario);
                VSS.globalProgressIndicator.actionCompleted(progressId_updateMachines);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
            });
        }
    }

    public deleteMachine(mgid: number, machineId: number) {
        let progressId_deleteMachine = VSS.globalProgressIndicator.actionStarted("deleteMachine", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteMachineBegin");
        let deleteMachinePromise = this._source.beginDeleteMachine(mgid, machineId);
        deleteMachinePromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteMachineComplete");
            MG_Events_Actions.machineDeleted.invoke(machineId);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteMachine);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.DeleteMachineScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteMachine);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public upgradeMachines(machineGroupId: number) {
        let progressId_upgradeMG = VSS.globalProgressIndicator.actionStarted("upgradeMachineGroup", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpgradeMachinesBegin");
        let upgradeMachinesPromise = this._source.beginUpgradeAgents(machineGroupId);
        upgradeMachinesPromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpgradeMachinesComplete");
            PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.UpgradeMachinesScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_upgradeMG);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.UpgradeMachinesScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_upgradeMG);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public loadMachineGroup(mgid: number) {
        if ((mgid == undefined) || (mgid === 0)) {
            let mg = new Model.MachineGroup();
            mg.id = 0;
            mg.name = "";
            let machineGroupData: MachineGroup_Actions.IMachineGroupData = {
                machineGroup: mg,
                deploymentGroupMetrics: undefined
            };
            MachineGroup_Actions.machineGroupLoaded.invoke(machineGroupData);
        } else {
            let progressId_loadMG = VSS.globalProgressIndicator.actionStarted("loadMachineGroup", true);
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupBegin");
            let getDataPromise = this._source.beginGetMachineGroup(mgid, null, DTContracts.DeploymentGroupExpands.Tags);
            getDataPromise.then((machineGroup: Model.MachineGroup) => {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupComplete");
                if (machineGroup && machineGroup.name) {
                    PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupsMetricsBegin");
                    let getDataPromise = this._source.beginGetDeploymentGroupMetricsByName(machineGroup.name);
                    getDataPromise.then((deploymentGroupUIMetrics: Model.DeploymentGroupUIMetrics) => {
                        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupsMetricsComplete");
                        this._updateDeploymentGroupData(machineGroup, deploymentGroupUIMetrics);
                        this._checkDeploymentGroupManagePermission(machineGroup)
                        VSS.globalProgressIndicator.actionCompleted(progressId_loadMG);
                    }, (err: any) => {
                        PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
                        Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
                    });
                }else{
                        this._updateDeploymentGroupData(machineGroup, undefined);
                        this._checkDeploymentGroupManagePermission(machineGroup)
                        VSS.globalProgressIndicator.actionCompleted(progressId_loadMG);
                 }
            }, (err: any) => {
                VSS.globalProgressIndicator.actionCompleted(progressId_loadMG);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
            });
        }
    }

    public updateMachineGroupAndReferences(mg: Model.MachineGroup, updatedName: string, updatedDescription: string, dgsToRemove: DTContracts.DeploymentGroupReference[]) {
        let poolObj = new DeploymentPoolCommonModel.DeploymentPool();
        if(Utils_String.equals(updatedName, mg.name, false) && Utils_String.equals(updatedDescription, mg.description, false)) {
            poolObj.id = mg.deploymentMachineGroup.pool.id;
            poolObj.name = mg.deploymentMachineGroup.pool.name;
            this.updateDeploymentGroupReferences(poolObj, dgsToRemove, []);
            return;
        }

        let progressId_updateMG = VSS.globalProgressIndicator.actionStarted("updateMachineGroup", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateMachineGroupBegin");
        let updatedMgPromise: IPromise<Model.MachineGroup>;
        updatedMgPromise = this._source.beginUpdateMachineGroup(mg.id, updatedName, updatedDescription);

        updatedMgPromise.then((machineGroup: Model.MachineGroup) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateMachineGroupComplete");
            MachineGroup_Actions.machineGroupUpdated.invoke(machineGroup);
            if (!!dgsToRemove && dgsToRemove.length > 0) {
                poolObj.id = machineGroup.deploymentMachineGroup.pool.id;
                poolObj.name = machineGroup.deploymentMachineGroup.pool.name;
                this.updateDeploymentGroupReferences(poolObj, dgsToRemove, []);
            }
            VSS.globalProgressIndicator.actionCompleted(progressId_updateMG);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.CreateOrUpdateMachineGroupScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_updateMG);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public loadDeploymentGroupMetrics(dgName: string) {
        if (dgName) {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupsMetricsBegin");
            let getDataPromise = this._source.beginGetDeploymentGroupMetricsByName(dgName);
            getDataPromise.then((data: Model.DeploymentGroupUIMetrics) => {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineGroupsMetricsComplete");
                MachineGroup_Actions.deploymentGroupMetricsLoaded.invoke(data);
            }, (err: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
            });
        }
    }

    public getMachines(deploymentGroupId: number, isLoadMore?: boolean, tags?: string[], name?: string, statusFilters?: string[], isNeverDeployed?: boolean, isFiltered?: boolean, continuationToken?: string, top?: number) {
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetTargetsBegin");
        const nameRegex = name ? name + "*" : null;
        const agentFilters = MGUtils.getAgentFilters(statusFilters, isNeverDeployed);
        let getDataPromise = this._source.beginGetMachines(deploymentGroupId, tags, nameRegex, true, DTContracts.DeploymentTargetExpands.LastCompletedRequest | DTContracts.DeploymentTargetExpands.AssignedRequest, agentFilters.agentStatus, agentFilters.agentJobResult, continuationToken, MGUtils.MachineGroupsConstants.targetPageSize);
        getDataPromise.then((pagedTarget: Model.PagedTarget) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetTargetsComplete");
            let pagedTargetGroup = this._getTargetGroup(pagedTarget, tags, name, statusFilters, isNeverDeployed);
            let pagedTargetGroups = this._getTargetResultGroup(agentFilters, pagedTargetGroup, isFiltered);
            // This call is just to accumulate passed status with never deployed
            const isPassedStatusFilter = agentFilters.agentJobResult === DTContracts.TaskAgentJobResultFilter.Passed ? true : false;
            if (isPassedStatusFilter && !pagedTargetGroup.continuationToken) {
                getDataPromise = this._source.beginGetMachines(deploymentGroupId, tags, nameRegex, true, DTContracts.DeploymentTargetExpands.LastCompletedRequest, DTContracts.TaskAgentStatusFilter.Online, DTContracts.TaskAgentJobResultFilter.NeverDeployed, null, MGUtils.MachineGroupsConstants.targetPageSize - pagedTarget.targets.length);
                getDataPromise.then((pagedTargetGroup1: Model.PagedTargetGroup) => {
                    if (isFiltered) {
                        pagedTargetGroups.filteredPagedTargetGroup = this._getHealthyPagedTargetGroup(pagedTargetGroup, pagedTargetGroup1, tags, name, statusFilters, true);
                    } else {
                        pagedTargetGroups.healthyPagedTargetGroup = this._getHealthyPagedTargetGroup(pagedTargetGroup, pagedTargetGroup1, tags, name, statusFilters, true);
                    }
                    if (isLoadMore) {
                        MachineGroup_Actions.targetsLoadMore.invoke(pagedTargetGroups);
                    } else {
                        MachineGroup_Actions.targetsLoaded.invoke(pagedTargetGroups);
                    }                  
                });
            } else {
                if (isLoadMore) {
                    MachineGroup_Actions.targetsLoadMore.invoke(pagedTargetGroups);
                } else {
                    MachineGroup_Actions.targetsLoaded.invoke(pagedTargetGroups);
                }
            }
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }
    
    public getMachinesByGrouping(deploymentGroupId: number) {
        const agentFilters: Model.IAgentFilters = {
            agentStatus: DTContracts.TaskAgentStatusFilter.All,
            agentJobResult: DTContracts.TaskAgentJobResultFilter.All
        };
        Q.all([
            this._source.beginGetMachines(deploymentGroupId, [], null, true, DTContracts.DeploymentTargetExpands.LastCompletedRequest | DTContracts.DeploymentTargetExpands.AssignedRequest, DTContracts.TaskAgentStatusFilter.Offline, DTContracts.TaskAgentJobResultFilter.All, null, MGUtils.MachineGroupsConstants.targetPageSize),
            this._source.beginGetMachines(deploymentGroupId, [], null, true, DTContracts.DeploymentTargetExpands.LastCompletedRequest | DTContracts.DeploymentTargetExpands.AssignedRequest, DTContracts.TaskAgentStatusFilter.Online, DTContracts.TaskAgentJobResultFilter.Failed, null, MGUtils.MachineGroupsConstants.targetPageSize),
            this._source.beginGetMachines(deploymentGroupId, [], null, true, DTContracts.DeploymentTargetExpands.LastCompletedRequest | DTContracts.DeploymentTargetExpands.AssignedRequest, DTContracts.TaskAgentStatusFilter.Online, DTContracts.TaskAgentJobResultFilter.Passed, null, MGUtils.MachineGroupsConstants.targetPageSize),
            this._source.beginGetMachines(deploymentGroupId, [], null, true, DTContracts.DeploymentTargetExpands.LastCompletedRequest | DTContracts.DeploymentTargetExpands.AssignedRequest, DTContracts.TaskAgentStatusFilter.Online, DTContracts.TaskAgentJobResultFilter.NeverDeployed, null, MGUtils.MachineGroupsConstants.targetPageSize),
        ]).spread((
            offlinePagedTarget: Model.PagedTarget,
            failedPagedTarget: Model.PagedTarget,
            passedPagedTarget: Model.PagedTarget,
            neverDeployedPagedTarget: Model.PagedTarget
        ) => {
            MachineGroup_Actions.targetsLoaded.invoke(this._getTargetGroups(offlinePagedTarget, failedPagedTarget, passedPagedTarget, neverDeployedPagedTarget));
            },
            (err: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
            });
    }

    public intialisedPagedTargetGroups() {
        MachineGroup_Actions.targetsLoaded.invoke(this._intialisedPagedTargetGroups());
    }

    public modifyMachineGroupName(updatedMgName: string) {
        MachineGroup_Actions.machineGroupNameModified.invoke(updatedMgName);
    }

    public modifyMachineGroupDescription(updatedMgDescription: string) {
        MachineGroup_Actions.machineGroupDescriptionModified.invoke(updatedMgDescription);
    }

    public initializeDeploymentGroup(deploymentGroup: Model.MachineGroup) {
        MachineGroup_Actions.deploymentGroupInitialized.invoke(deploymentGroup);
    }

    public deploymentMachineTagsUpdate(machine: Model.Machine, updatedTags: string[]) {
        MachineGroup_Actions.deploymentMachineTagsUpdated.invoke({machine: machine, updatedTags: updatedTags} as IMachineTagsInfo);
    }

    private _getTargetGroups(offlinePagedTarget: Model.PagedTarget, failedPagedTarget: Model.PagedTarget, passedPagedTarget: Model.PagedTarget, neverDeployedPagedTarget: Model.PagedTarget): Model.PagedTargetGroups {
        let pagedTargetGroups = new Model.PagedTargetGroups();
        pagedTargetGroups.filteredPagedTargetGroup = new Model.PagedTargetGroup();
        pagedTargetGroups.offlinePagedTargetGroup = this._getTargetGroup(offlinePagedTarget, null, null, [MGUtils.MachineGroupsConstants.offlineStatus], false);
        pagedTargetGroups.failedPagedTargetGroup = this._getTargetGroup(failedPagedTarget, null, null, [MGUtils.MachineGroupsConstants.failingStatus], false);
        if (passedPagedTarget.continuationToken) {
            pagedTargetGroups.healthyPagedTargetGroup = this._getTargetGroup(passedPagedTarget, null, null, [MGUtils.MachineGroupsConstants.healthyStatus], false);
        } else {
            pagedTargetGroups.healthyPagedTargetGroup = this._getHealthyPagedTargetGroup(passedPagedTarget, neverDeployedPagedTarget, null, null, [MGUtils.MachineGroupsConstants.healthyStatus], true);
        }

        return pagedTargetGroups;
    }

    private _getTargetGroup(pagedTarget: Model.PagedTarget, tags?: string[], name?: string, statusFilters?: string[], isNeverDeployed?: boolean): Model.PagedTargetGroup {
        let pagedTargetGroup = new Model.PagedTargetGroup();
        pagedTargetGroup.targets = pagedTarget.targets;
        pagedTargetGroup.continuationToken = pagedTarget.continuationToken;
        pagedTargetGroup.name = name;
        pagedTargetGroup.statusList = statusFilters;
        pagedTargetGroup.tagList = tags;
        pagedTargetGroup.isNeverDeployed = isNeverDeployed;
        return pagedTargetGroup;
    }

    private _getHealthyPagedTargetGroup(passedPagedTargetGroup: Model.PagedTargetGroup, neverDeployedPagedTargetGroup: Model.PagedTargetGroup, tags?: string[], name?: string, statusFilters?: string[], isNeverDeployed?: boolean): Model.PagedTargetGroup {
        let resultPagedTargetGroup: Model.PagedTargetGroup;
        if (passedPagedTargetGroup && passedPagedTargetGroup.continuationToken) {
            resultPagedTargetGroup = passedPagedTargetGroup;
        } else {
            const targets = MGUtils.getConcatTargets(
                (passedPagedTargetGroup ? passedPagedTargetGroup.targets : []),
                (neverDeployedPagedTargetGroup ? neverDeployedPagedTargetGroup.targets : [])
            );

            resultPagedTargetGroup = {
                targets: targets,
                continuationToken: (neverDeployedPagedTargetGroup ? neverDeployedPagedTargetGroup.continuationToken : null),
                name: name,
                tagList: tags,
                statusList: statusFilters,
                isNeverDeployed: isNeverDeployed
            };
        }
        return resultPagedTargetGroup;
    }

    private _getTargetResultGroup(agentFilters: Model.IAgentFilters, pagedTargetGroup: Model.PagedTargetGroup, isFiltered?: boolean): Model.PagedTargetGroups {
        let pagedTargetGroups = this._intialisedPagedTargetGroups();
        if (isFiltered) {
            pagedTargetGroups.filteredPagedTargetGroup = pagedTargetGroup;
        } else if (agentFilters.agentStatus === DTContracts.TaskAgentStatusFilter.Offline) {
            pagedTargetGroups.offlinePagedTargetGroup = pagedTargetGroup;
        } else if (agentFilters.agentJobResult === DTContracts.TaskAgentJobResultFilter.Failed) {
            pagedTargetGroups.failedPagedTargetGroup = pagedTargetGroup;
        } else {
            pagedTargetGroups.healthyPagedTargetGroup = pagedTargetGroup;
        }

        return pagedTargetGroups;
    }

    private _intialisedPagedTargetGroups(): Model.PagedTargetGroups {
        return {
            filteredPagedTargetGroup: new Model.PagedTargetGroup(),
            failedPagedTargetGroup: new Model.PagedTargetGroup(),
            offlinePagedTargetGroup: new Model.PagedTargetGroup(),
            healthyPagedTargetGroup: new Model.PagedTargetGroup()
        };
    }

    private _updateDeploymentGroupData(machineGroup: Model.MachineGroup, deploymentGroupMetrics?: Model.DeploymentGroupUIMetrics): void {
        let machineGroupData: MachineGroup_Actions.IMachineGroupData = {
            machineGroup: machineGroup,
            deploymentGroupMetrics: deploymentGroupMetrics
        };
        MachineGroup_Actions.machineGroupLoaded.invoke(machineGroupData);
    }

    private _checkDeploymentGroupManagePermission(deploymentGroup: Model.MachineGroup) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            const manageRolesPermission: number = 8;
            RMUtilsCore.SecurityHelper.hasMachineGroupPermission(tfsContext.contextData.project.id, deploymentGroup.id, manageRolesPermission).then((hasDgManagePermission: boolean) => {
                if(hasDgManagePermission) {
                    RMUtilsCore.SecurityHelper.hasDeploymentPoolPermission(deploymentGroup.deploymentMachineGroup.pool.id, manageRolesPermission).then((hasDpManagePermission: boolean) => {
                        MachineGroup_Actions.checkManagePermission.invoke({hasDgManagePermission: hasDgManagePermission, hasDpManagePermission: hasDpManagePermission} as ISecurityPermissions);
                    }, (err: any) => {
                        PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
                        Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
                    });
                }
                else {
                    MachineGroup_Actions.checkManagePermission.invoke({hasDgManagePermission: hasDgManagePermission, hasDpManagePermission: false} as ISecurityPermissions);
                }
            }, (err: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
            });
    }
    
    private _source: Model.MachineGroups;
    private _deploymentPoolCommonSource: DeploymentPoolCommonModel.DeploymentPoolCommonSource;
}

export var ActionCreator = new MachineGroupActionCreator();
