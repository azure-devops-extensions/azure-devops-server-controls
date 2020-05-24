// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import { DeploymentPoolTarget } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model";
import { IDeploymentTargetData } from"ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentTargetStore";

export class DeploymentTargetActions extends ActionsHubBase {

    public initialize(): void {
        this._deploymentTargetLoaded = new Action_Base.Action<IDeploymentTargetData>(); 
        this._deploymentTargetDeleted = new Action_Base.Action<number>(); 
        this._deploymentTargetUpdated = new Action_Base.Action<DeploymentPoolTarget>();      
    }

    public static getKey(): string {
        return ActionsKeys.DeploymentPoolTargetActions;
    }

    /**
     * Action for loading deployment target
     */
    public get deploymentTargetLoaded(): Action_Base.Action<IDeploymentTargetData> {
        return this._deploymentTargetLoaded;
    }

    /**
     * Action for deleting deployment target
     */
    public get deploymentTargetDeleted(): Action_Base.Action<number> {
        return this._deploymentTargetDeleted;
    }

    /**
     * Action for update deployment target, i.e enable/disable target
     */
    public get deploymentTargetUpdated(): Action_Base.Action<DeploymentPoolTarget> {
        return this._deploymentTargetUpdated;
    }

    private _deploymentTargetLoaded: Action_Base.Action<IDeploymentTargetData>;
    private _deploymentTargetDeleted: Action_Base.Action<number>;
    private _deploymentTargetUpdated: Action_Base.Action<DeploymentPoolTarget>;
}
