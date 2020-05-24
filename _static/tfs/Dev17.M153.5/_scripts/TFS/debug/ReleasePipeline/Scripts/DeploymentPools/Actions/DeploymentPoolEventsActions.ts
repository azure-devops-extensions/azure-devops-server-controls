// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import DTContracts = require("TFS/DistributedTask/Contracts");
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");

export class DeploymentPoolEventsActions extends ActionsHubBase {
    initialize(): void {
        this._agentAdded = new Action_Base.Action<DTContracts.TaskAgent>(); 
        this._agentDeleted = new Action_Base.Action<number>();
        this._agentConnected = new Action_Base.Action<number>();
        this._agentDisconnected = new Action_Base.Action<number>();
        this._agentRequestQueued = new Action_Base.Action<DTContracts.TaskAgentJobRequest>(); 
        this._agentRequestAssigned = new Action_Base.Action<DTContracts.TaskAgentJobRequest>(); 
        this._agentRequestStarted = new Action_Base.Action<DTContracts.TaskAgentJobRequest>(); 
        this._agentRequestCompleted = new Action_Base.Action<DTContracts.TaskAgentJobRequest>(); 
    }

    public static getKey(): string {
        return ActionsKeys.DeploymentPoolEventsActions;
    }
    
    /**
     * Action for adding agent.
     */
    public get agentAdded() : Action_Base.Action<DTContracts.TaskAgent>{
        return this._agentAdded;
    }

    /**
     * Action for deleting agent.
     */
    public get agentDeleted() : Action_Base.Action<number>{
        return this._agentDeleted;
    }

    /**
     * Action for agent become online.
     */
    public get agentConnected() : Action_Base.Action<number>{
        return this._agentConnected;
    }

    /**
     * Action for agent become offline.
     */
    public get agentDisconnected() : Action_Base.Action<number>{
        return this._agentDisconnected;
    }

    /**
     * Action for job request queued to machine group.
     */
    public get agentRequestQueued() : Action_Base.Action<DTContracts.TaskAgentJobRequest>{
        return this._agentRequestQueued;
    }

    /**
     * Action for job request assigned to machine.
     */
    public get agentRequestAssigned() : Action_Base.Action<DTContracts.TaskAgentJobRequest>{
        return this._agentRequestAssigned;
    }

    /**
     * Action for job request started.
     */
    public get agentRequestStarted() : Action_Base.Action<DTContracts.TaskAgentJobRequest>{
        return this._agentRequestStarted;
    }

    /**
     * Action for job request completed.
     */
    public get agentRequestCompleted() : Action_Base.Action<DTContracts.TaskAgentJobRequest>{
        return this._agentRequestCompleted;
    }

    private _agentAdded: Action_Base.Action<DTContracts.TaskAgent>;
    private _agentDeleted: Action_Base.Action<number>;
    private _agentConnected: Action_Base.Action<number>;
    private _agentDisconnected: Action_Base.Action<number>;
    private _agentRequestQueued: Action_Base.Action<DTContracts.TaskAgentJobRequest>; 
    private _agentRequestAssigned: Action_Base.Action<DTContracts.TaskAgentJobRequest>; 
    private _agentRequestStarted: Action_Base.Action<DTContracts.TaskAgentJobRequest>; 
    private _agentRequestCompleted: Action_Base.Action<DTContracts.TaskAgentJobRequest>; 

}