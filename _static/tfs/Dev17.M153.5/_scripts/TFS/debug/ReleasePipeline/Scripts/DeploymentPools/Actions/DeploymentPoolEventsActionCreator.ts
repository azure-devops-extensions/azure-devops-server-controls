// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS_Events = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");

import DTContracts = require("TFS/DistributedTask/Contracts");
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import {TaskAgentPoolHub, PoolEvents} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.TaskAgentPoolHub.ConnectionManager";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
// Actions
import { DeploymentPoolEventsActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolEventsActions";
import { DeploymentPoolActionCreator } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolActionCreator";

import { FeatureFlagUtils as RMFeaturesFlag } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

export class DeploymentPoolEventsActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.DeploymentPoolEventsActionCreator;
    }

    public initialize(instanceId?: string) {
        Model.signalRPromise.then(() => {
            this._poolHub = TaskAgentPoolHub.getInstance();
        });
        this._eventManager = VSS_Events.getService();
        this._attachRealtimeEvents();
        this._actions = ActionsHubManager.GetActionsHub<DeploymentPoolEventsActions>(DeploymentPoolEventsActions, instanceId);
        this._deploymentPoolActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolActionCreator>(DeploymentPoolActionCreator, instanceId);
        this._source = Model.DeploymentPoolSource.instance();
    }

    public subscribe(poolId: number): void {
        this._poolId = poolId;
        Model.signalRPromise.then(() => {            
            this._poolHub.subscribe(poolId);
        });
    }

    public unSubscribe(poolId: number): void {
        Model.signalRPromise.then(() => {     
            this._poolHub.unsubscribe();
        });
    }

    protected _dispose() {
        this._detachRealtimeEvents();
    }

    private _attachRealtimeEvents() {
        if (!this._eventsAttached) {
            this._eventManager.attachEvent(PoolEvents.AgentAdded, Utils_Core.delegate(this, this.agentAdded));
            this._eventManager.attachEvent(PoolEvents.AgentDeleted, Utils_Core.delegate(this, this.agentDeleted));
            this._eventManager.attachEvent(PoolEvents.AgentConnected, Utils_Core.delegate(this, this.agentConnected));
            this._eventManager.attachEvent(PoolEvents.AgentDisconnected, Utils_Core.delegate(this, this.agentDisconnected));
            this._eventManager.attachEvent(PoolEvents.AgentRequestQueued, Utils_Core.delegate(this, this.agentRequestQueued));
            this._eventManager.attachEvent(PoolEvents.AgentRequestAssigned, Utils_Core.delegate(this, this.agentRequestAssigned));
            this._eventManager.attachEvent(PoolEvents.AgentRequestStarted, Utils_Core.delegate(this, this.agentRequestStarted));
            this._eventManager.attachEvent(PoolEvents.AgentRequestCompleted, Utils_Core.delegate(this, this.agentRequestCompleted));

            this._eventsAttached = true;
        }
    }

    private _detachRealtimeEvents() {
        if (this._eventsAttached) {                        
            this._eventManager.detachEvent(PoolEvents.AgentAdded, Utils_Core.delegate(this, this.agentAdded));
            this._eventManager.detachEvent(PoolEvents.AgentDeleted, Utils_Core.delegate(this, this.agentDeleted));
            this._eventManager.detachEvent(PoolEvents.AgentConnected, Utils_Core.delegate(this, this.agentConnected));
            this._eventManager.detachEvent(PoolEvents.AgentDisconnected, Utils_Core.delegate(this, this.agentDisconnected));
            this._eventManager.detachEvent(PoolEvents.AgentRequestQueued, Utils_Core.delegate(this, this.agentRequestQueued));
            this._eventManager.detachEvent(PoolEvents.AgentRequestAssigned, Utils_Core.delegate(this, this.agentRequestAssigned));
            this._eventManager.detachEvent(PoolEvents.AgentRequestStarted, Utils_Core.delegate(this, this.agentRequestStarted));
            this._eventManager.detachEvent(PoolEvents.AgentRequestCompleted, Utils_Core.delegate(this, this.agentRequestCompleted));

            this._eventsAttached = false;
        }
    }

    private agentAdded(sender: any, dpTarget: DTContracts.TaskAgent): void {
        this._deploymentPoolActionCreator.getDeploymentPoolWithSummary(this._poolId);
        this._actions.agentAdded.invoke(dpTarget);
    }

    private agentDeleted(sender: any, agentId: number): void {
        this._deploymentPoolActionCreator.getDeploymentPoolWithSummary(this._poolId);
        this._actions.agentDeleted.invoke(agentId);
    }

    private agentConnected(sender: any, agentId: number): void {
        this._deploymentPoolActionCreator.getDeploymentPoolWithSummary(this._poolId);
        this._actions.agentConnected.invoke(agentId);
    }

    private agentDisconnected(sender: any, agentId: number): void {
        this._deploymentPoolActionCreator.getDeploymentPoolWithSummary(this._poolId);
        this._actions.agentDisconnected.invoke(agentId);
    }

    private agentRequestQueued(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        this._actions.agentRequestQueued.invoke(jobRequest);
    }

    private agentRequestAssigned(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        this._actions.agentRequestAssigned.invoke(jobRequest);
    }

    private agentRequestStarted(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        this._actions.agentRequestStarted.invoke(jobRequest);
    }

    private agentRequestCompleted(sender: any, jobRequest: DTContracts.TaskAgentJobRequest): void {
        this._actions.agentRequestCompleted.invoke(jobRequest);
    }

    private _eventManager: VSS_Events.EventService;
    private _eventsAttached: boolean = false;
    private _source: Model.DeploymentPoolSource;
    private _poolId: number;
    private _actions: DeploymentPoolEventsActions;
    private _deploymentPoolActionCreator: DeploymentPoolActionCreator;
    private _poolHub: TaskAgentPoolHub;
}
