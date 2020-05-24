// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeploymentPoolsActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolsActions";
import { StoreKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import * as Utils_Array from 'VSS/Utils/Array';
import * as Utils_String from 'VSS/Utils/String';

export interface IDeploymentPoolsStoreData {
    _deploymentPoolsSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[];
}

export class DeploymentPoolsStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return StoreKeys.DeploymentPoolsStore;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._deploymentPoolsActions = ActionsHubManager.GetActionsHub<DeploymentPoolsActions>(DeploymentPoolsActions, instanceId);
        this._deploymentPoolsActions.deploymentPoolsSummaryLoaded.addListener(this.onPoolsSummaryLoad);
        this._deploymentPoolsActions.deploymentPoolDeleted.addListener(this.onPoolDeleted);
        this._deploymentPoolsData = { _deploymentPoolsSummary: [] };
    }

    protected disposeInternal(): void {
        this._deploymentPoolsActions.deploymentPoolDeleted.removeListener(this.onPoolDeleted);
        this._deploymentPoolsActions.deploymentPoolsSummaryLoaded.removeListener(this.onPoolsSummaryLoad);
    }

    public getPoolsSummaryData(): DeploymentPoolCommonModel.DeploymentPoolSummary[] {
        return this._deploymentPoolsData._deploymentPoolsSummary;
    }

    protected onPoolsSummaryLoad = (deploymentPoolsSummaryPayload: DeploymentPoolCommonModel.DeploymentPoolSummary[]): void => {
        let poolsComparer: IComparer<DeploymentPoolCommonModel.DeploymentPoolSummary> = (pool1: DeploymentPoolCommonModel.DeploymentPoolSummary, pool2: DeploymentPoolCommonModel.DeploymentPoolSummary) => {
            return Utils_String.localeIgnoreCaseComparer(pool1.name, pool2.name);
        }        
        Utils_Array.sortIfNotSorted(deploymentPoolsSummaryPayload, poolsComparer);
        this._deploymentPoolsData._deploymentPoolsSummary = this._handleEmptyProjectName(deploymentPoolsSummaryPayload);
        this.emitChanged();
    }

    protected onPoolDeleted = (poolId: number): void => {
        if (!this._deploymentPoolsData._deploymentPoolsSummary) {
            this._deploymentPoolsData._deploymentPoolsSummary = [];
        }
        this._deploymentPoolsData._deploymentPoolsSummary = this._deploymentPoolsData._deploymentPoolsSummary.filter(pool => pool.id !== poolId);

        this.emitChanged();
    }

    private _handleEmptyProjectName(dpsSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[]) : DeploymentPoolCommonModel.DeploymentPoolSummary[] {
        dpsSummary.forEach((dpSummary: DeploymentPoolCommonModel.DeploymentPoolSummary) => {
            // If project name is null or empty we will not show project reference in Deployment Pools page
            dpSummary.deploymentGroups = dpSummary.deploymentGroups.filter(dg => (!!dg.project && !!dg.project.name))
        });

        return dpsSummary;
    }

    protected _deploymentPoolsData: IDeploymentPoolsStoreData;
    private _deploymentPoolsActions: DeploymentPoolsActions;
}

