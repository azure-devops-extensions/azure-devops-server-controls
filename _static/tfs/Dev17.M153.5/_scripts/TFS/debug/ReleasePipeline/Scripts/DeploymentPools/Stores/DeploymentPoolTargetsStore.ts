// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS = require("VSS/VSS");
import Utils_Array = require("VSS/Utils/Array");
import DTContracts = require("TFS/DistributedTask/Contracts");
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import { DeploymentPoolEventsActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolEventsActions";
import { StoreKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import { DeploymentPoolTargetsActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolTargetsActions";
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");

export class DeploymentPoolTargetsStore extends StoreCommonBase.StoreBase {
    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._deploymentPoolTargetsActions = ActionsHubManager.GetActionsHub<DeploymentPoolTargetsActions>(DeploymentPoolTargetsActions, instanceId);
        this._deploymentPoolTargetsActions.deploymentPoolTargetsLoaded.addListener(this.onDeploymentPoolTargetsLoaded);       
        this._deploymentPoolTargetsActions.deploymentTargetUpdated.addListener(this.onDeploymentTargetUpdated, this); 

        this._deploymentPoolEventsActions = ActionsHubManager.GetActionsHub<DeploymentPoolEventsActions>(DeploymentPoolEventsActions, instanceId);
        this._deploymentPoolEventsActions.agentAdded.addListener(this.onAgentAdded, this);
        this._deploymentPoolEventsActions.agentDeleted.addListener(this.onAgentDeleted, this);
        this._deploymentPoolEventsActions.agentConnected.addListener(this.onAgentConnected, this);
        this._deploymentPoolEventsActions.agentDisconnected.addListener(this.onAgentDisconnected, this);
        this._deploymentPoolEventsActions.agentRequestAssigned.addListener(this.onAgentRequestAssigned, this);
        this._deploymentPoolEventsActions.agentRequestStarted.addListener(this.onAgentRequestAssigned, this);
        this._deploymentPoolEventsActions.agentRequestCompleted.addListener(this.onAgentLatestDeploymentCompleted, this);
    }

    protected disposeInternal(): void {
        this._deploymentPoolTargetsActions.deploymentPoolTargetsLoaded.removeListener(this.onDeploymentPoolTargetsLoaded);
        this._deploymentPoolTargetsActions.deploymentTargetUpdated.removeListener(this.onDeploymentTargetUpdated);
        this._deploymentPoolEventsActions.agentAdded.removeListener(this.onAgentAdded);
        this._deploymentPoolEventsActions.agentDeleted.removeListener(this.onAgentDeleted);
        this._deploymentPoolEventsActions.agentConnected.removeListener(this.onAgentConnected);
        this._deploymentPoolEventsActions.agentDisconnected.removeListener(this.onAgentDisconnected);
        this._deploymentPoolEventsActions.agentRequestAssigned.removeListener(this.onAgentRequestAssigned);
        this._deploymentPoolEventsActions.agentRequestStarted.removeListener(this.onAgentRequestAssigned);
        this._deploymentPoolEventsActions.agentRequestCompleted.removeListener(this.onAgentLatestDeploymentCompleted);
    }

    public static getKey(): string {
        return StoreKeys.DeploymentPoolTargetsStore;
    }

    public getDeploymentPoolTargets():Model.DeploymentPoolTarget[] {
        return this._deploymentPoolTargets;
    }

    public onDeploymentPoolTargetsLoaded = (deploymentPoolTargets: Model.DeploymentPoolTarget[]): void => {
        this._deploymentPoolTargets = deploymentPoolTargets;
        this.emitChanged();
    }
    
    private onAgentAdded(dpTarget: DTContracts.TaskAgent) {
        if(!this._getTarget(dpTarget.id)){
            let target: Model.DeploymentPoolTarget = Model.DeploymentPoolTarget.createFromAgent(dpTarget);
            this._deploymentPoolTargets.push(target);
            this._deploymentPoolTargets.sort((t1, t2) => t1.name.localeCompare(t2.name));
            this.emitChanged();
        }
    }

    protected onAgentDeleted(agentId: number) {
        if (!!this._deploymentPoolTargets) {
            this._deploymentPoolTargets = this._deploymentPoolTargets.filter(target => target.id !== agentId);
            this.emitChanged();
        }
    }

    protected onAgentConnected(agentId: number) {
        this._updateAgentStatus(agentId, true);
        this.emitChanged();
    }

    protected onAgentDisconnected(agentId: number) {
        this._updateAgentStatus(agentId, false);
        this.emitChanged();
    }

    protected onAgentRequestAssigned(jobRequest: DTContracts.TaskAgentJobRequest) {
        let target: Model.DeploymentPoolTarget;
        if (!!jobRequest.reservedAgent) {
            target = this._getTarget(jobRequest.reservedAgent.id);
            if (!!target) {
                target.latestDeployment = jobRequest;
                target.agent.assignedRequest = jobRequest;
                this.emitChanged();
            }
        }
    }

    protected onAgentLatestDeploymentCompleted(jobRequest: DTContracts.TaskAgentJobRequest) {
        let target: Model.DeploymentPoolTarget;
        if (jobRequest.reservedAgent) {
            target = this._getTarget(jobRequest.reservedAgent.id);
            if (target) {
                target.latestDeployment = jobRequest;
                target.agent.assignedRequest = target.agent.assignedRequest && target.agent.assignedRequest.jobId === jobRequest.jobId ? null : target.agent.assignedRequest;
                this.emitChanged();
            }
        }
    }

    protected onDeploymentTargetUpdated(updatedTarget: Model.DeploymentPoolTarget) {
        let target = this._getTarget(updatedTarget.id);
        if (target) {
            this._updateDeploymentTarget(target, updatedTarget);
            this.emitChanged();
        }
    }

    private _getTarget(targetId: number): Model.DeploymentPoolTarget {
        let target = Utils_Array.first(this._deploymentPoolTargets, (t: Model.DeploymentPoolTarget) => {
            return t.id === targetId;
        });
        return target;
    }

    private _updateAgentStatus(agentId: number, online: boolean) {
        let target = this._getTarget(agentId);

        if (!!target) {
            target.status = online ? DPUtils.DeploymentPoolsConstants.onlineStatus : DPUtils.DeploymentPoolsConstants.offlineStatus;
            target.agent.status = online ? DTContracts.TaskAgentStatus.Online : DTContracts.TaskAgentStatus.Offline;
        }
    }

    private _updateDeploymentTarget(oldTarget: Model.DeploymentPoolTarget, updatedTarget: Model.DeploymentPoolTarget){
        oldTarget.enabled = updatedTarget.enabled;
        oldTarget.agent = updatedTarget.agent;
    }

    protected _deploymentPoolTargets: Model.DeploymentPoolTarget[];
    private _deploymentPoolTargetsActions: DeploymentPoolTargetsActions;
    private _deploymentPoolEventsActions: DeploymentPoolEventsActions;
}

