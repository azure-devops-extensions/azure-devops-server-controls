// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeploymentTargetActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentTargetActions";
import { StoreKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { DeploymentPoolTarget } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model";
import { DeploymentPool } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";

export interface IDeploymentTargetData {
    deploymentPool: DeploymentPool;
    target: DeploymentPoolTarget;
    isTargetDeleted?: boolean;
}

export class DeploymentTargetStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return StoreKeys.DeploymentPoolTargetStore;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._deploymentTargetActions = ActionsHubManager.GetActionsHub<DeploymentTargetActions>(DeploymentTargetActions, instanceId);
        this._deploymentTargetActions.deploymentTargetLoaded.addListener(this.onDeploymentTargetLoaded);
        this._deploymentTargetActions.deploymentTargetDeleted.addListener(this.onDeploymentTargetDeleted);
        this._deploymentTargetActions.deploymentTargetUpdated.addListener(this.onDeploymentTargetUpdated);
        this._deploymentTargetData = { deploymentPool: undefined, target: undefined, isTargetDeleted: false };
    }

    protected disposeInternal(): void {
        this._deploymentTargetActions.deploymentTargetLoaded.removeListener(this.onDeploymentTargetLoaded);
        this._deploymentTargetActions.deploymentTargetDeleted.removeListener(this.onDeploymentTargetDeleted);
        this._deploymentTargetActions.deploymentTargetUpdated.removeListener(this.onDeploymentTargetUpdated);
    }

    public getDeploymentTargetData(): IDeploymentTargetData {
        return this._deploymentTargetData;
    }

    protected onDeploymentTargetLoaded = (deploymentTargetData: IDeploymentTargetData): void => {
        this._deploymentTargetData = { deploymentPool: deploymentTargetData.deploymentPool, target: deploymentTargetData.target, isTargetDeleted: false };
        this.emitChanged();
    }

    protected onDeploymentTargetDeleted = (targetId: number): void => {
        let storeData = this.getDeploymentTargetData();
        let target = storeData.target;
        
        if(target && target.id === targetId) {
            this._deploymentTargetData = { deploymentPool: undefined, target: undefined, isTargetDeleted: true };
            this.emitChanged();
        }
    }

    protected onDeploymentTargetUpdated = (updatedTarget: DeploymentPoolTarget): void => {
        let storeData = this.getDeploymentTargetData();
        let target = storeData.target;
        
        if(target && target.id === updatedTarget.id) {
            target.enabled = updatedTarget.enabled;
            target.agent = updatedTarget.agent;
            this.emitChanged();
        }
    }

    protected _deploymentTargetData: IDeploymentTargetData;
    private _deploymentTargetActions: DeploymentTargetActions;
}
