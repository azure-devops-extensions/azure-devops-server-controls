// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS_Events = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");

import DTContracts = require("TFS/DistributedTask/Contracts");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import {DeploymentGroupHub, DeploymentGroupEvents} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.DeploymentGroupHub.ConnectionManager";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
// Actions
import DM_Events_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineEventActions");

export class DeploymentMachineEventActionCreator {
    constructor() {

        Model.signalRPromise.then(() => {           
            this._deploymentGroupHub = DeploymentGroupHub.getInstance();
        });
        this._eventManager = VSS_Events.getService();
        this._attachRealtimeEvents();
        this._source = new Model.MachineGroups();
        this._machineId = -1;
    }

    public subscribe(deploymentGroupId: number, machineId: number): void {
        Model.signalRPromise.then(() => {
            this._deploymentGroupHub.subscribe(deploymentGroupId);
        });

        this._machineId = machineId;
    }

    public unSubscribe(deploymentGroupId: number): void {
        this._deploymentGroupHub.unsubscribe(deploymentGroupId);
        this._machineId = -1;
    }

    private _attachRealtimeEvents() {
        if (!this._eventsAttached) {
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

    protected _dispose() {
        this._detachRealtimeEvents();
    }

    private  machineDeleted(sender: any, machineId: number): void {
        DM_Events_Actions.machineDeleted.invoke(machineId);           
    }

    private machineConnected(sender: any, machineId: number): void {
        DM_Events_Actions.machineConnected.invoke(machineId);
    }

    private machineDisconnected(sender: any, machineId: number): void {
        DM_Events_Actions.machineDisconnected.invoke(machineId);
    }

    private deploymentMachineUpdated(sender: any, machines: DTContracts.DeploymentMachine[]): void {
        DM_Events_Actions.deploymentMachinesUpdated.invoke(machines);
    }

    private deploymentQueued(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        if (jobRequest.matchedAgents && jobRequest.matchedAgents.some(a => a.id === this._machineId)){
            let getDataPromise = this._source.beginGetMachineDeploymentFromJobRequest(jobRequest);
                getDataPromise.then((machineDeployment) => {
                    DM_Events_Actions.deploymentQueued.invoke(machineDeployment);
                }, (error) => {
            });
        }
    }

    private deploymentAssigned(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        if (this.isValidRequestEvent(jobRequest)){
            let getDataPromise = this._source.beginGetMachineDeploymentFromJobRequest(jobRequest);
                getDataPromise.then((machineDeployment) => {
                    DM_Events_Actions.deploymentAssignedToMachine.invoke(machineDeployment);
                }, (error) => {
            });
        }
    }

    private deploymentStarted(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        if (this.isValidRequestEvent(jobRequest)){
            let getDataPromise = this._source.beginGetMachineDeploymentFromJobRequest(jobRequest);
                getDataPromise.then((machineDeployment) => {
                    DM_Events_Actions.deploymentStarted.invoke(machineDeployment);
                }, (error) => {
            });
        }
    }

    private deploymentCompleted(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        if (this.isValidRequestEvent(jobRequest)){
            let getDataPromise = this._source.beginGetMachineDeploymentFromJobRequest(jobRequest);
                getDataPromise.then((machineDeployment) => {
                    DM_Events_Actions.deploymentCompleted.invoke(machineDeployment);
                }, (error) => {
            });
        }
    }

    private isValidRequestEvent(jobRequest: DTContracts.TaskAgentJobRequest): boolean {
        return (!!jobRequest.reservedAgent && jobRequest.reservedAgent.id === this._machineId);
    }

    private _eventManager: VSS_Events.EventService;
    private _eventsAttached: boolean = false;
    private _source: Model.MachineGroups;
    private _deploymentGroupHub: DeploymentGroupHub;
    private _machineId: number;
}

export var ActionCreator = new DeploymentMachineEventActionCreator();