// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");

export class DeploymentPoolTargetsActions extends ActionsHubBase {

    public initialize(): void {
        this._deploymentPoolTargetsLoaded = new Action_Base.Action<Model.DeploymentPoolTarget[]>();
        this._deploymentTargetUpdated = new Action_Base.Action<Model.DeploymentPoolTarget>();
    }

    public static getKey(): string {
        return ActionsKeys.DeploymentPoolTargetsActions;
    }

    /**
     * Action for getting Deployment Pool Targets
     */
    public get deploymentPoolTargetsLoaded(): Action_Base.Action<Model.DeploymentPoolTarget[]> {
        return this._deploymentPoolTargetsLoaded;
    }

    /**
     * Action for update deployment target, i.e enable/disable target
     */
    public get deploymentTargetUpdated(): Action_Base.Action<Model.DeploymentPoolTarget> {
        return this._deploymentTargetUpdated;
    }

    private _deploymentPoolTargetsLoaded: Action_Base.Action<Model.DeploymentPoolTarget[]>;
    private _deploymentTargetUpdated: Action_Base.Action<Model.DeploymentPoolTarget>;
}
