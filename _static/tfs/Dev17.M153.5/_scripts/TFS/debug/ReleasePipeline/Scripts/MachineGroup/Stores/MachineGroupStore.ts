// Copyright (c) Microsoft Corporation.  All rights reserved.

import Store_Base = require("VSS/Flux/Store");
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import DTContracts = require("TFS/DistributedTask/Contracts");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import MachineGroup_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActions");
import MG_Events_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupEventsActions");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");

export interface IMachineGroupStoreData {
    machineGroup: Model.MachineGroup;
    updatedMgName?: string;
    updatedMgDescription?: string;
    clearErrorMessage?: boolean;
    deploymentGroupMetrics: Model.DeploymentGroupUIMetrics;
    permissions: ISecurityPermissions;
    pagedTargetGroups: Model.PagedTargetGroups;
    isPermissionSet: boolean;
    projectList?: string[];
    poolDGReference:  DTContracts.DeploymentGroupReference[];
    selectedProjectList?: string[];
    showingShareDGPanel?: boolean;
    showLoadSpinner?: boolean;
    hasPoolUsePermission: boolean;
    currentTagsBymachineIds?: Map<number, string[]>;
}

export interface ISecurityPermissions {
    hasDgManagePermission: boolean;
    hasDpManagePermission: boolean;
}

export interface IMachineTagsInfo {
    machine: Model.Machine;
    updatedTags: string[];
}

export class MachineGroupStore extends Store_Base.Store {
    constructor() {
        super();

        MachineGroup_Actions.machineGroupLoaded.addListener(this.onDataLoad, this);
        MachineGroup_Actions.machineGroupAdded.addListener(this.onMachineGroupAdded, this);
        MachineGroup_Actions.machineGroupUpdated.addListener(this.onMachineGroupUpdated, this);
        MachineGroup_Actions.machineGroupNameModified.addListener(this.onMachineGroupNameModified, this);
        MachineGroup_Actions.machineGroupDescriptionModified.addListener(this.onMachineGroupDescriptionModified, this);
        MachineGroup_Actions.machinesUpdated.addListener(this.onMachinesUpdated, this);
        MachineGroup_Actions.targetsLoaded.addListener(this.onTargetsLoaded, this);
        MachineGroup_Actions.targetsLoadMore.addListener(this.onTargetsLoadMore, this);
        MachineGroup_Actions.deploymentGroupMetricsLoaded.addListener(this.onDeploymentGroupMetricsLaoded, this);
        MachineGroup_Actions.checkManagePermission.addListener(this.onPermissionsFetched, this);
        MachineGroup_Actions.deploymentGroupInitialized.addListener(this.onDeploymentGroupInitialized, this);
        MachineGroup_Actions.deploymentPoolSummaryLoaded.addListener(this.onDeploymentPoolSummaryLoaded, this);
        MachineGroup_Actions.projectListLoaded.addListener(this.onProjectListLoaded);
        MachineGroup_Actions.deploymentGroupReferencesUpdated.addListener(this.onDeploymentGroupReferencesUpdated);
        MachineGroup_Actions.deploymentMachineTagsUpdated.addListener(this.onDeploymentMachineTagsUpdated);

        MG_Events_Actions.machineAdded.addListener(this.onMachineAdded, this);
        MG_Events_Actions.machineDeleted.addListener(this.onMachineDeleted, this);
        MG_Events_Actions.machineConnected.addListener(this.onMachineConnected, this);
        MG_Events_Actions.machineDisconnected.addListener(this.onMachineDisconnected, this);
        MG_Events_Actions.deploymentAssignedToMachine.addListener(this.onRequestAssignedToMachine, this);
        MG_Events_Actions.deploymentStarted.addListener(this.onRequestAssignedToMachine, this);
        MG_Events_Actions.deploymentCompleted.addListener(this.onMachineLastDeploymentUpdate, this);
        MG_Events_Actions.deploymentMachinesUpdated.addListener(this.onDeploymentMachinesUpdated, this);
    }

    public getData(): IMachineGroupStoreData {
        if (!this._machineGroupData) {
            this._machineGroupData = { 
                machineGroup: undefined, 
                clearErrorMessage: true,
                deploymentGroupMetrics: undefined,
                updatedMgName : undefined,
                updatedMgDescription : undefined,
                permissions: {hasDgManagePermission: false, hasDpManagePermission: false} as ISecurityPermissions,
                pagedTargetGroups: this._getTargetPagedGroups(),
                isPermissionSet: false,
                projectList: [],
                poolDGReference: [],
                selectedProjectList: [],
                showingShareDGPanel: false,
                showLoadSpinner: false,
                hasPoolUsePermission: false,
                currentTagsBymachineIds: new Map<number, string[]>()
            };
        }
        return this._machineGroupData;
    }

    protected onDataLoad(machineGroupData: MachineGroup_Actions.IMachineGroupData) {
        let mg: Model.MachineGroup = machineGroupData.machineGroup;
        let deploymentGroupMetrics = machineGroupData.deploymentGroupMetrics;
        let storeData = this.getData();
        if (((mg.id == undefined) || (mg.id === 0)) && !!this._machineGroupData.machineGroup && !!this._machineGroupData.machineGroup.deploymentMachineGroup) {
            storeData.clearErrorMessage = true;
            storeData.deploymentGroupMetrics = undefined;
            storeData.permissions = {hasDgManagePermission: false, hasDpManagePermission: false} as ISecurityPermissions;
            storeData.pagedTargetGroups = this._getTargetPagedGroups();
            storeData.isPermissionSet = false;
            storeData.poolDGReference = [];
            storeData.selectedProjectList = [];
            storeData.showingShareDGPanel = false;
            storeData.showLoadSpinner = false;
            storeData.hasPoolUsePermission = false;
            storeData.currentTagsBymachineIds =  new Map<number, string[]>();  
        }
        else {
            storeData.machineGroup = mg;
            storeData.clearErrorMessage = true;
            storeData.deploymentGroupMetrics = deploymentGroupMetrics;
            storeData.permissions = {hasDgManagePermission: false, hasDpManagePermission: false} as ISecurityPermissions;
            storeData.updatedMgName = undefined;
            storeData.updatedMgDescription = undefined;
            storeData.isPermissionSet = false;
            storeData.selectedProjectList = [];
            storeData.showingShareDGPanel = false;
            storeData.showLoadSpinner = false;
            storeData.hasPoolUsePermission = false;
            storeData.currentTagsBymachineIds =  new Map<number, string[]>();            
        }
        this.emitChanged();
    }

    protected onMachineGroupAdded(mg: Model.MachineGroup) {
        this._machineGroupData = { 
            machineGroup: mg,
            clearErrorMessage: true,
            deploymentGroupMetrics: undefined,
            updatedMgName : undefined,
            updatedMgDescription : undefined,
            permissions: {hasDgManagePermission: false, hasDpManagePermission: false} as ISecurityPermissions,
            pagedTargetGroups: this._getTargetPagedGroups(),
            isPermissionSet: false,
            poolDGReference: undefined,
            hasPoolUsePermission: false,
            currentTagsBymachineIds: new Map<number, string[]>()
        };
        this.emitChanged();
    }

    protected onMachineGroupUpdated(mg: Model.MachineGroup) {
        let storeData = this.getData();
        storeData.machineGroup = mg;
        storeData.clearErrorMessage = true;
        this.emitChanged();
    }

    protected onMachineGroupNameModified(updatedMgName: string) {
        let storeData = this.getData();
        storeData.updatedMgName = updatedMgName;
        storeData.clearErrorMessage = false;
        this.emitChanged();
    }

    protected onMachineGroupDescriptionModified(updatedMgDescription: string) {
        let storeData = this.getData();
        storeData.updatedMgDescription = updatedMgDescription;
        storeData.clearErrorMessage = false;
        this.emitChanged();
    }

    protected onMachinesUpdated(updatedMachines: Model.Machine[]) {
        let storeData = this.getData();
        updatedMachines.forEach((machine: Model.Machine) => {
            let machineFromStore = this._getMachineById(machine.id);
            if (machineFromStore) {
                machine.assignedRequest = machineFromStore.assignedRequest;
                machine.lastDeployment = machineFromStore.lastDeployment;
                this._deletedMachine(machine.id);
                this._addMachine(machine);
            }
        });
        storeData.clearErrorMessage = true;
        if(!!storeData.currentTagsBymachineIds) {
            storeData.currentTagsBymachineIds.clear();
        }
        this.emitChanged();
    }

    protected onMachineConnected(machineId: number) {
        this._updateMachineStatus(machineId, true);
        this.emitChanged();
    }

    protected onMachineDisconnected(machineId: number) {
        this._updateMachineStatus(machineId, false);
        this.emitChanged();
    }

    private _updateMachineStatus(machineId: number, online: boolean) {
        let machine = this._getMachineById(machineId);
        if (machine) {
            let storeData = this.getData();
            this._deletedMachine(machine.id);
            machine.online = online;
            this._addMachine(machine);
            storeData.clearErrorMessage = false; 
        }
    }    

    protected onMachineDeleted(machineId: number) {
        this._deletedMachine(machineId);
        this.getData().clearErrorMessage = false;
        this.emitChanged();
    }

    private _getMachineById(machineId: number): Model.Machine {
        let storeData = this.getData();
        let machine;
        if (this._isFilterApplied()) {
            machine = this._getMachine(machineId, storeData.pagedTargetGroups.filteredPagedTargetGroup.targets);
        } else {
            machine = this._getMachine(machineId, storeData.pagedTargetGroups.failedPagedTargetGroup.targets);
            if (!machine) {
                machine = this._getMachine(machineId, storeData.pagedTargetGroups.healthyPagedTargetGroup.targets);;
            }
            if (!machine) {
                machine = this._getMachine(machineId, storeData.pagedTargetGroups.offlinePagedTargetGroup.targets);;
            }
        }

        return machine;
    }

    private _deletedMachine(machineId: number) {
        let storeData = this.getData();
        if (this._isFilterApplied()) {
            storeData.pagedTargetGroups.filteredPagedTargetGroup.targets = this._removeMachine(machineId, storeData.pagedTargetGroups.filteredPagedTargetGroup.targets);
        } else {
            storeData.pagedTargetGroups.failedPagedTargetGroup.targets = this._removeMachine(machineId, storeData.pagedTargetGroups.failedPagedTargetGroup.targets);
            storeData.pagedTargetGroups.healthyPagedTargetGroup.targets = this._removeMachine(machineId, storeData.pagedTargetGroups.healthyPagedTargetGroup.targets);
            storeData.pagedTargetGroups.offlinePagedTargetGroup.targets = this._removeMachine(machineId, storeData.pagedTargetGroups.offlinePagedTargetGroup.targets);
        }
    }

    private _removeMachine(machineId: number, targets?: Model.Machine[]): Model.Machine[] {
        let targetResult = [];
        if (targets) {
            targetResult = targets.filter(machine => machine.id !== machineId);
        }
        return targetResult;
    }

    private _getMachine(machineId: number, targets?: Model.Machine[]): Model.Machine {
        let machine: Model.Machine;
        if (targets) {
            const targetResult = targets.filter(machine => machine.id === machineId);
            if (targetResult.length > 0) {
                machine = targetResult[0];
            }            
        }

        return machine;
    }

    private onMachineAdded(deploymentMachine: DTContracts.DeploymentMachine) {
        let machine: Model.Machine = Model.Machine.createFromMachine(deploymentMachine);
        this._addMachine(machine);
        this.getData().clearErrorMessage = false;
        this.emitChanged();
    }

    private _isFilterApplied(): boolean {
        let result = false;
        const pagedTargetGroups = this.getData().pagedTargetGroups;
        if (pagedTargetGroups &&
            pagedTargetGroups.filteredPagedTargetGroup &&
            ((pagedTargetGroups.filteredPagedTargetGroup.tagList &&
                pagedTargetGroups.filteredPagedTargetGroup.tagList.length > 0) ||
                (pagedTargetGroups.filteredPagedTargetGroup.name &&
                    pagedTargetGroups.filteredPagedTargetGroup.name !== "") ||
                (pagedTargetGroups.filteredPagedTargetGroup.statusList &&
                    pagedTargetGroups.filteredPagedTargetGroup.statusList.length > 0))) {
            result = true;
        }

        return result;
    }

    private _addMachine(machine: Model.Machine) {   
        let storeData = this.getData();
        if (machine) {
            if (this._isFilterApplied()) {
                if (this._meetMachineFilterCriteria(machine) && (!this._getMachine(machine.id, storeData.pagedTargetGroups.filteredPagedTargetGroup.targets)) && (!storeData.pagedTargetGroups.filteredPagedTargetGroup.continuationToken || machine.name.toLocaleLowerCase() < storeData.pagedTargetGroups.filteredPagedTargetGroup.continuationToken.toLocaleLowerCase())) {
                    storeData.pagedTargetGroups.filteredPagedTargetGroup.targets = storeData.pagedTargetGroups.filteredPagedTargetGroup.targets ? storeData.pagedTargetGroups.filteredPagedTargetGroup.targets : [];
                    storeData.pagedTargetGroups.filteredPagedTargetGroup.targets.push(machine);
                    storeData.pagedTargetGroups.filteredPagedTargetGroup.targets.sort(MGUtils.targetSort);
                }
            } else {
                if (!machine.online && (!this._getMachine(machine.id, storeData.pagedTargetGroups.offlinePagedTargetGroup.targets)) && (!storeData.pagedTargetGroups.offlinePagedTargetGroup.continuationToken || machine.name.toLocaleLowerCase() < storeData.pagedTargetGroups.offlinePagedTargetGroup.continuationToken.toLocaleLowerCase())) {
                    storeData.pagedTargetGroups.offlinePagedTargetGroup.targets = storeData.pagedTargetGroups.offlinePagedTargetGroup.targets ? storeData.pagedTargetGroups.offlinePagedTargetGroup.targets : [];
                    storeData.pagedTargetGroups.offlinePagedTargetGroup.targets.push(machine);
                    storeData.pagedTargetGroups.offlinePagedTargetGroup.targets.sort((m1, m2) => m1.name.localeCompare(m2.name));
                } else if (machine.online && !this._getMachine(machine.id, storeData.pagedTargetGroups.healthyPagedTargetGroup.targets) && this._isSatisfyPassedOrNeverDeployedCriteria(machine, storeData.pagedTargetGroups.healthyPagedTargetGroup.isNeverDeployed) && (!storeData.pagedTargetGroups.healthyPagedTargetGroup.continuationToken || machine.name.toLocaleLowerCase() < storeData.pagedTargetGroups.healthyPagedTargetGroup.continuationToken.toLocaleLowerCase())) {
                    storeData.pagedTargetGroups.healthyPagedTargetGroup.targets = storeData.pagedTargetGroups.healthyPagedTargetGroup.targets ? storeData.pagedTargetGroups.healthyPagedTargetGroup.targets : [];
                    storeData.pagedTargetGroups.healthyPagedTargetGroup.targets.push(machine);
                    storeData.pagedTargetGroups.healthyPagedTargetGroup.targets.sort(MGUtils.targetSort);
                } else if (machine.online && (!this._getMachine(machine.id, storeData.pagedTargetGroups.failedPagedTargetGroup.targets)) && !this._isHealthy(machine.lastDeployment) && (!storeData.pagedTargetGroups.failedPagedTargetGroup.continuationToken || machine.name.toLocaleLowerCase() < storeData.pagedTargetGroups.failedPagedTargetGroup.continuationToken.toLocaleLowerCase())) {
                    storeData.pagedTargetGroups.failedPagedTargetGroup.targets = storeData.pagedTargetGroups.failedPagedTargetGroup.targets ? storeData.pagedTargetGroups.failedPagedTargetGroup.targets : [];
                    storeData.pagedTargetGroups.failedPagedTargetGroup.targets.push(machine);
                    storeData.pagedTargetGroups.failedPagedTargetGroup.targets.sort((m1, m2) => m1.name.localeCompare(m2.name));
                }
            }
        }
    }

    private _isSatisfyPassedOrNeverDeployedCriteria(machine: Model.Machine, isNeverDeployed?: boolean): boolean {
        let result = false;
        const pagedTargetGroups = this.getData().pagedTargetGroups;
        let showNeverDeployedMachines = pagedTargetGroups.healthyPagedTargetGroup.isNeverDeployed !== false;
        if(!!pagedTargetGroups && !!pagedTargetGroups.healthyPagedTargetGroup && (showNeverDeployedMachines || !!machine.lastDeployment)) {
            result = this._isHealthy(machine.lastDeployment);
        }

        return result;
    }

    private _meetMachineFilterCriteria(machine: Model.Machine): boolean {
        let storeData = this.getData();
        let tagFilter = !!storeData.pagedTargetGroups.filteredPagedTargetGroup && !!storeData.pagedTargetGroups.filteredPagedTargetGroup.tagList ? storeData.pagedTargetGroups.filteredPagedTargetGroup.tagList.slice() : [];
        let flag: boolean = true;
        flag = flag && this._isSuperSet(tagFilter, machine.tags);
        flag = flag && (!storeData.pagedTargetGroups.filteredPagedTargetGroup.name || Utils_String.startsWith(machine.name, storeData.pagedTargetGroups.filteredPagedTargetGroup.name));
        flag = flag && this._isSatisfyStatusFilter(machine, storeData.pagedTargetGroups.filteredPagedTargetGroup);
        return flag;
    }

    private _isSatisfyStatusFilter(machine: Model.Machine, filteredPagedTargetGroup: Model.PagedTargetGroup): boolean {
        let _isSatisfyStatusFilter = true;
        let statusList = filteredPagedTargetGroup.statusList;
        const neverDeployed = filteredPagedTargetGroup.isNeverDeployed;
        if (statusList) {
            const agentFilter = MGUtils.getAgentFilters(statusList, neverDeployed);
            if ((agentFilter.agentStatus === DTContracts.TaskAgentStatusFilter.Online && !machine.online) || (agentFilter.agentStatus === DTContracts.TaskAgentStatusFilter.Offline && machine.online)) {
                _isSatisfyStatusFilter = false;
            }

            if ((agentFilter.agentJobResult === DTContracts.TaskAgentJobResultFilter.Failed && this._isHealthy(machine.lastDeployment)) ||
                ((agentFilter.agentJobResult === DTContracts.TaskAgentJobResultFilter.Passed ||
                    agentFilter.agentJobResult === DTContracts.TaskAgentJobResultFilter.NeverDeployed) && !this._isHealthy(machine.lastDeployment)) ||
                (agentFilter.agentJobResult === DTContracts.TaskAgentJobResultFilter.Passed && !machine.lastDeployment) ||
                (agentFilter.agentJobResult === DTContracts.TaskAgentJobResultFilter.NeverDeployed && !this._isHealthy(machine.lastDeployment))) {
                _isSatisfyStatusFilter = false;
            }
        }

        return _isSatisfyStatusFilter;
    }

    private _isHealthy(lastDeployment: Model.MachineDeployment): boolean {
        let isHealthy = true;
        if (lastDeployment) {
            switch (lastDeployment.result) {
                case DTContracts.TaskResult.Succeeded:
                case DTContracts.TaskResult.SucceededWithIssues:
                    isHealthy = true;
                    break;
                case DTContracts.TaskResult.Failed:
                case DTContracts.TaskResult.Abandoned:
                case DTContracts.TaskResult.Canceled:
                case DTContracts.TaskResult.Skipped:
                    isHealthy = false;
                    break;
            }
        }
        return isHealthy;
    }

    protected onMachineLastDeploymentUpdate(jobRequest: DTContracts.TaskAgentJobRequest) {
        let storeData = this.getData();
        let machine: Model.Machine;
        if (jobRequest.reservedAgent) {
            if (this._isFilterApplied()) {
                machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.filteredPagedTargetGroup.targets);
            } else {
                machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.offlinePagedTargetGroup.targets);
                if (!machine) {
                    machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.failedPagedTargetGroup.targets);
                }
                if (!machine) {
                    machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.healthyPagedTargetGroup.targets);
                }
            }
            if (machine) {
                machine.lastDeployment = Model.MachineDeployment.create(jobRequest);
                machine.assignedRequest = machine.assignedRequest && machine.assignedRequest.request && machine.assignedRequest.request.jobId === jobRequest.jobId ? null : machine.assignedRequest;
                this._deletedMachine(machine.id);
                this._addMachine(machine);
                storeData.clearErrorMessage = false;
                this.emitChanged();
            }
        }
    }

    protected onRequestAssignedToMachine(jobRequest: DTContracts.TaskAgentJobRequest) {
        let storeData = this.getData();
        let machine: Model.Machine;
        if (jobRequest.reservedAgent) {
            if (this._isFilterApplied()) {
                machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.filteredPagedTargetGroup.targets);
            } else {
                machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.offlinePagedTargetGroup.targets);
                if (!machine) {
                    machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.failedPagedTargetGroup.targets);
                }
                if (!machine) {
                    machine = this._getMachine(jobRequest.reservedAgent.id, storeData.pagedTargetGroups.healthyPagedTargetGroup.targets);
                }
            }
            if (machine) {
                machine.assignedRequest = Model.MachineDeployment.create(jobRequest);
                storeData.clearErrorMessage = false;
                this.emitChanged();
            }
        }
    }

    protected onDeploymentMachinesUpdated(updatedDeploymentMachines: DTContracts.DeploymentMachine[]) {
        let storeData = this.getData();
        if (storeData.machineGroup) {
            updatedDeploymentMachines.forEach((updatedDeploymentMachine: DTContracts.DeploymentMachine) => {
                const machine = Model.Machine.createFromMachine(updatedDeploymentMachine);
                let machineFromStore = this._getMachineById(machine.id);
                if (machineFromStore) {
                    machine.assignedRequest = machineFromStore.assignedRequest;
                    machine.lastDeployment = machineFromStore.lastDeployment;
                    this._deletedMachine(machine.id);
                    this._addMachine(machine);
                }
            });
            storeData.clearErrorMessage = false;
            this.emitChanged();
        } 
    }

    protected onTargetsLoaded(pagedTargetGroups: Model.PagedTargetGroups): void {
        this._processTargetGroupResult(pagedTargetGroups);
        let storeData = this.getData();
        storeData.clearErrorMessage = true;
        this.emitChanged();
    }

    protected onTargetsLoadMore(pagedTargetGroups: Model.PagedTargetGroups): void {
        this._processTargetGroupResult(pagedTargetGroups, true);
        let storeData = this.getData();
        storeData.clearErrorMessage = true;
        this.emitChanged();
    }

    private onProjectListLoaded = (projectList: DeploymentPoolCommonModel.TeamProjectReference[]): void => {
        var projectNameArray = [];
        var deploymentGroupData = this.getData();
        deploymentGroupData.clearErrorMessage = false;
        for (var project of projectList) {
            projectNameArray.push(project.name);
        }

        deploymentGroupData.projectList = projectNameArray.sort(Utils_String.localeIgnoreCaseComparer);
        this.emitChanged();
    }

    private onDeploymentPoolSummaryLoaded = (dpSummary : DeploymentPoolCommonModel.DeploymentPoolSummary): void => {
        var deploymentGroupData = this.getData();
        deploymentGroupData.poolDGReference = dpSummary.deploymentGroups;
        deploymentGroupData.showingShareDGPanel = false;
        deploymentGroupData.selectedProjectList = [];
        deploymentGroupData.showLoadSpinner = false;
        deploymentGroupData.hasPoolUsePermission = true;
        deploymentGroupData.clearErrorMessage = false;
        this.emitChanged();
    }
    
    private onDeploymentGroupReferencesUpdated = (dpWithSummary : DeploymentPoolCommonModel.DeploymentPoolSummary): void => {
        var deploymentGroupData = this.getData();
        deploymentGroupData.poolDGReference = dpWithSummary.deploymentGroups;
        deploymentGroupData.showingShareDGPanel = false;
        deploymentGroupData.selectedProjectList = [];
        deploymentGroupData.showLoadSpinner = false;
        deploymentGroupData.clearErrorMessage = true;
        this.emitChanged();
    }

    private onDeploymentMachineTagsUpdated = (machineTagsInfo: IMachineTagsInfo): void => {
        var deploymentGroupData = this.getData();
        let machineId = machineTagsInfo.machine.id;
        let tags = machineTagsInfo.machine.deploymentMachine.tags;
        let updatedTags = machineTagsInfo.updatedTags;

        if(Utils_Array.arrayEquals(tags, updatedTags, (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0)) {
            deploymentGroupData.currentTagsBymachineIds.delete(machineId);    
        } else {
            deploymentGroupData.currentTagsBymachineIds.set(machineId, updatedTags);
        }

        this.emitChanged();
    }

    private _processTargetGroupResult(pagedTargetGroups: Model.PagedTargetGroups, isLoadMore?: boolean) {
        let storeData = this.getData();
        if (!storeData.pagedTargetGroups) {
            storeData.pagedTargetGroups = new Model.PagedTargetGroups();
        }
        pagedTargetGroups.offlinePagedTargetGroup = isLoadMore ? this._getConcatPagedTargets(storeData.pagedTargetGroups.offlinePagedTargetGroup, pagedTargetGroups.offlinePagedTargetGroup) : pagedTargetGroups.offlinePagedTargetGroup ;
        pagedTargetGroups.failedPagedTargetGroup = isLoadMore ? this._getConcatPagedTargets(storeData.pagedTargetGroups.failedPagedTargetGroup, pagedTargetGroups.failedPagedTargetGroup) : pagedTargetGroups.failedPagedTargetGroup ;
        pagedTargetGroups.healthyPagedTargetGroup = isLoadMore ? this._getConcatPagedTargets(storeData.pagedTargetGroups.healthyPagedTargetGroup, pagedTargetGroups.healthyPagedTargetGroup) : pagedTargetGroups.healthyPagedTargetGroup;
        pagedTargetGroups.filteredPagedTargetGroup = isLoadMore? this._getConcatPagedTargets(storeData.pagedTargetGroups.filteredPagedTargetGroup, pagedTargetGroups.filteredPagedTargetGroup) : pagedTargetGroups.filteredPagedTargetGroup;
        storeData.pagedTargetGroups = pagedTargetGroups;
    }

    protected onPermissionsFetched(permissions: ISecurityPermissions): void {
        let storeData = this.getData();
        storeData.permissions = permissions
        storeData.isPermissionSet = true;
        this.emitChanged();
    }

    private _updateMachine(oldMachine: Model.Machine, updatedMachine: Model.Machine) {
        oldMachine.tags = updatedMachine.tags;
    }

    private _getConcatPagedTargets(pagedTargetGroup1?: Model.PagedTargetGroup, pagedTargetGroup2?: Model.PagedTargetGroup): Model.PagedTargetGroup {
        if (!pagedTargetGroup1) {
            pagedTargetGroup1 = new Model.PagedTargetGroup();
        }

        if (pagedTargetGroup2 && pagedTargetGroup2.targets) {
            pagedTargetGroup1.targets = Utils_Array.union(pagedTargetGroup1.targets ? pagedTargetGroup1.targets : [], pagedTargetGroup2.targets, MGUtils.machineValueComparer);
            pagedTargetGroup1.continuationToken = pagedTargetGroup2.continuationToken;
            pagedTargetGroup1.name = pagedTargetGroup2.name;
            pagedTargetGroup1.tagList = pagedTargetGroup2.tagList;
            pagedTargetGroup1.statusList = pagedTargetGroup2.statusList;
            pagedTargetGroup1.isNeverDeployed = pagedTargetGroup2.isNeverDeployed;
        }

        return pagedTargetGroup1;
    }

    protected onDeploymentGroupMetricsLaoded(deploymentGroupMetrics: Model.DeploymentGroupUIMetrics): void {
        let storeData = this.getData();
        storeData.deploymentGroupMetrics = deploymentGroupMetrics;
        this.emitChanged();
    }

    protected onDeploymentGroupInitialized(deploymentGroup: Model.MachineGroup): void {
        let initialDGName: string = !!deploymentGroup ? deploymentGroup.name : undefined;
        this._machineGroupData = {
            machineGroup: deploymentGroup,
            clearErrorMessage: true,
            deploymentGroupMetrics: undefined,
            permissions: {hasDgManagePermission: false, hasDpManagePermission: false} as ISecurityPermissions,
            pagedTargetGroups: this._getTargetPagedGroups(),
            isPermissionSet: false,
            updatedMgName: initialDGName,
            projectList: undefined,
            poolDGReference: undefined,
            hasPoolUsePermission: false
        };
        this.emitChanged();
    }

    private _isSuperSet(smallSet: string[], bigSet: string[]): boolean {
        var isSuperset = smallSet.every(function (val) {
            return bigSet.indexOf(val) >= 0;
        });

        return isSuperset;
    }

    private _getTargetPagedGroups(): Model.PagedTargetGroups {
        return {
            offlinePagedTargetGroup: new Model.PagedTargetGroup(),
            failedPagedTargetGroup: new Model.PagedTargetGroup(),
            healthyPagedTargetGroup: new Model.PagedTargetGroup(),
            filteredPagedTargetGroup: new Model.PagedTargetGroup()
        }
    }

    protected _machineGroupData: IMachineGroupStoreData;
}

export var MachineGroup = new MachineGroupStore();
