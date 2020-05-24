// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS_Events = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");

import DTContracts = require("TFS/DistributedTask/Contracts");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import {DeploymentGroupHub, DeploymentGroupEvents} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.DeploymentGroupHub.ConnectionManager";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
// Actions
import MachineGroup_Events_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupEventsActions");
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");
import MachineGroup_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActions");

import MachineGroupStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/MachineGroupStore");
import { FeatureFlagUtils as RMFeaturesFlag } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");

export class MachineGroupEventsActionCreator {

    constructor(source?: Model.MachineGroups) {        
        Model.signalRPromise.then(() => {
            this._deploymentGroupHub = DeploymentGroupHub.getInstance();
        });
        this._eventManager = VSS_Events.getService();
        this._attachRealtimeEvents();
        this._machineGroupStore = MachineGroupStore.MachineGroup;
        this._source = source || new Model.MachineGroups();
        
    }

    public subscribe(poolId: number, deploymentGroupId: number): void {
        this._deploymentGroupId = deploymentGroupId;
        Model.signalRPromise.then(() => {            
            this._deploymentGroupHub.subscribe(deploymentGroupId);
        });
    }

    public unSubscribe(deploymentGroupId: number): void {
        Model.signalRPromise.then(() => {     
            this._deploymentGroupHub.unsubscribe(deploymentGroupId);
        });
    }

    protected _dispose() {
        this._detachRealtimeEvents();
    }

    private _attachRealtimeEvents() {
        if (!this._eventsAttached) {
            this._eventManager.attachEvent(DeploymentGroupEvents.DeploymentMachineAdded, Utils_Core.delegate(this, this.machineAdded));
            this._eventManager.attachEvent(DeploymentGroupEvents.DeploymentMachineDeleted, Utils_Core.delegate(this, this.machineDeleted));
            this._eventManager.attachEvent(DeploymentGroupEvents.DeploymentMachineConnected, Utils_Core.delegate(this, this.machineConnected));
            this._eventManager.attachEvent(DeploymentGroupEvents.DeploymentMachineDisconnected, Utils_Core.delegate(this, this.machineDisconnected));
            this._eventManager.attachEvent(DeploymentGroupEvents.DeploymentMachinesUpdated, Utils_Core.delegate(this, this.deploymentMachineUpdated));
            this._eventManager.attachEvent(DeploymentGroupEvents.AgentRequestQueued, Utils_Core.delegate(this, this.deploymentQueued));
            this._eventManager.attachEvent(DeploymentGroupEvents.AgentRequestAssigned, Utils_Core.delegate(this, this.deploymentAssigned));
            this._eventManager.attachEvent(DeploymentGroupEvents.AgentRequestStarted, Utils_Core.delegate(this, this.deploymentStarted));
            this._eventManager.attachEvent(DeploymentGroupEvents.AgentRequestCompleted, Utils_Core.delegate(this, this.deploymentCompleted));

            this._eventsAttached = true;
        }
    }

    private _detachRealtimeEvents() {
        if (this._eventsAttached) {                        
            this._eventManager.detachEvent(DeploymentGroupEvents.DeploymentMachineAdded, Utils_Core.delegate(this, this.machineAdded));
            this._eventManager.detachEvent(DeploymentGroupEvents.DeploymentMachineDeleted, Utils_Core.delegate(this, this.machineDeleted));
            this._eventManager.detachEvent(DeploymentGroupEvents.DeploymentMachineConnected, Utils_Core.delegate(this, this.machineConnected));
            this._eventManager.detachEvent(DeploymentGroupEvents.DeploymentMachineDisconnected, Utils_Core.delegate(this, this.machineDisconnected));
            this._eventManager.detachEvent(DeploymentGroupEvents.DeploymentMachinesUpdated, Utils_Core.delegate(this, this.deploymentMachineUpdated));
            this._eventManager.detachEvent(DeploymentGroupEvents.AgentRequestQueued, Utils_Core.delegate(this, this.deploymentQueued));
            this._eventManager.detachEvent(DeploymentGroupEvents.AgentRequestAssigned, Utils_Core.delegate(this, this.deploymentAssigned));
            this._eventManager.detachEvent(DeploymentGroupEvents.AgentRequestStarted, Utils_Core.delegate(this, this.deploymentStarted));
            this._eventManager.detachEvent(DeploymentGroupEvents.AgentRequestCompleted, Utils_Core.delegate(this, this.deploymentCompleted));

            this._eventsAttached = false;
        }
    }

    private  machineAdded(sender: any, machine: DTContracts.DeploymentMachine): void {
        if (this._machineGroupStore.getData().machineGroup){
            MachineGroupActionCreator.ActionCreator.loadDeploymentGroupMetrics(this._machineGroupStore.getData().machineGroup.name);
        }
        MachineGroup_Events_Actions.machineAdded.invoke(machine);

    }

    private machineDeleted(sender: any, machineId: number): void {
        if (this._machineGroupStore.getData().machineGroup) {
            MachineGroupActionCreator.ActionCreator.loadDeploymentGroupMetrics(this._machineGroupStore.getData().machineGroup.name);
        }
        
        MachineGroup_Events_Actions.machineDeleted.invoke(machineId);
    }

    private _deletedMachine(machines: Model.Machine[]) {
        let targets = [];
        const pagedtargetGroup = this._machineGroupStore.getData().pagedTargetGroups;
        if (pagedtargetGroup.failedPagedTargetGroup && pagedtargetGroup.failedPagedTargetGroup.targets) {
                targets.push(...pagedtargetGroup.failedPagedTargetGroup.targets);
        }
        if (pagedtargetGroup.offlinePagedTargetGroup && pagedtargetGroup.offlinePagedTargetGroup.targets) {
            targets.push(...pagedtargetGroup.offlinePagedTargetGroup.targets);
        }
        if (pagedtargetGroup.healthyPagedTargetGroup && pagedtargetGroup.healthyPagedTargetGroup.targets) {
            targets.push(...pagedtargetGroup.healthyPagedTargetGroup.targets);
        }
        if (pagedtargetGroup.filteredPagedTargetGroup && pagedtargetGroup.filteredPagedTargetGroup.targets) {
            targets.push(...pagedtargetGroup.filteredPagedTargetGroup.targets);
        }

        targets.forEach((target: Model.Machine) => {
            if (!machines.some(m => m.deploymentMachine.agent.id === target.deploymentMachine.agent.id)) {
                MachineGroup_Events_Actions.machineDeleted.invoke(target.id);
            }
        });
    }

    private machineConnected(sender: any, machineId: number): void {
        if (this._machineGroupStore.getData().machineGroup) {
            MachineGroupActionCreator.ActionCreator.loadDeploymentGroupMetrics(this._machineGroupStore.getData().machineGroup.name);
        }
        MachineGroup_Events_Actions.machineConnected.invoke(machineId);
    }

    private machineDisconnected(sender: any, machineId: number): void {
        if (this._machineGroupStore.getData().machineGroup) {
            MachineGroupActionCreator.ActionCreator.loadDeploymentGroupMetrics(this._machineGroupStore.getData().machineGroup.name);
        }
        MachineGroup_Events_Actions.machineDisconnected.invoke(machineId);
    }

    private deploymentQueued(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        MachineGroup_Events_Actions.deploymentQueued.invoke(jobRequest);
    }

    private deploymentAssigned(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        MachineGroup_Events_Actions.deploymentAssignedToMachine.invoke(jobRequest);
    }

    private deploymentStarted(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        MachineGroup_Events_Actions.deploymentStarted.invoke(jobRequest);
    }

    private deploymentCompleted(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        MachineGroup_Events_Actions.deploymentCompleted.invoke(jobRequest);
    }

    private deploymentMachineUpdated(sender: any, machines: DTContracts.DeploymentMachine[]): void {
        MachineGroup_Events_Actions.deploymentMachinesUpdated.invoke(machines);
    }

    private _eventManager: VSS_Events.EventService;
    private _eventsAttached: boolean = false;
    private _machineGroupStore: MachineGroupStore.MachineGroupStore;
    private _source: Model.MachineGroups;
    private _deploymentGroupId: number;
    private _deploymentGroupHub: DeploymentGroupHub;
}

export var ActionCreator = new MachineGroupEventsActionCreator();
