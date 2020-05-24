// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")

export class DeploymentPoolsActions extends ActionsHubBase {

    public initialize(): void {
        this._deploymentPoolsSummaryLoaded = new Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary[]>(); 
        this._deploymentPoolDeleted = new Action_Base.Action<number>();
    }

    public static getKey(): string {
        return ActionsKeys.DeploymentPoolsActions;
    }

    /**
    * Action to get deployment pools summary
    */
    public get deploymentPoolsSummaryLoaded(): Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary[]>{
        return this._deploymentPoolsSummaryLoaded;
    }

    /**
    * Action for deleting deployment pool.
    */
    public get deploymentPoolDeleted(): Action_Base.Action<number>{
        return this._deploymentPoolDeleted;
    }

   private _deploymentPoolDeleted: Action_Base.Action<number>;
   private _deploymentPoolsSummaryLoaded: Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary[]>; 
}
