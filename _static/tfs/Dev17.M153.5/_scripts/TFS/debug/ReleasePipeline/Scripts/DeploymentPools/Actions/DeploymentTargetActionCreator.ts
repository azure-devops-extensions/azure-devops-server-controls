// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import DTContracts = require("TFS/DistributedTask/Contracts");
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeploymentTargetActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentTargetActions";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import { DeploymentPool } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";
import { ActionCreatorKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

export class DeploymentTargetActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.DeploymentPoolTargetActionCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<DeploymentTargetActions>(DeploymentTargetActions, instanceId);
        this._source = Model.DeploymentPoolSource.instance();
    }

    public loadDeploymentPoolWithSelectedTarget(poolId: number, targetId: number) {

        let progressId_loadDP = VSS.globalProgressIndicator.actionStarted("loadDeploymentPoolWithSelectedTarget", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolWithSelectedTargetBegin");
        let getDPPromise = this._source.beginGetDeploymentPool(poolId);
        getDPPromise.then((pool: DeploymentPool) => {
            let getTargetPromise = this._source.beginGetDeploymentPoolTarget(poolId, targetId, true, false);

            getTargetPromise.then((target: Model.DeploymentPoolTarget) => {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolWithSelectedTargetComplete");
                this._actions.deploymentTargetLoaded.invoke({deploymentPool: pool, target: target});
                VSS.globalProgressIndicator.actionCompleted(progressId_loadDP);
            }, (err: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.LoadTargetScenario);
                VSS.globalProgressIndicator.actionCompleted(progressId_loadDP);
                Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, err);
            })
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.LoadTargetScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_loadDP);
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, err);
        });
    }

    public deleteTarget(poolId: number, targetId: number) {
        let progressId_deleteTarget = VSS.globalProgressIndicator.actionStarted("deleteTarget", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteTargetBegin");
        let deleteTargetPromise = this._source.beginDeleteTarget(poolId, targetId);
        deleteTargetPromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteTargetComplete");
            this._actions.deploymentTargetDeleted.invoke(targetId);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteTarget);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.DeleteTargetScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteTarget);
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, err);
        });
    }

    public updateDeploymentTarget(poolId: number, target: Model.DeploymentPoolTarget, updatedState: boolean) {
        let agent = target.agent;
        agent.enabled = updatedState;
        let progressId_updateDeploymentTarget = VSS.globalProgressIndicator.actionStarted("updateDeploymentTarget", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateTargetBegin");
        let deleteTargetPromise = this._source.beginUpdateTarget(poolId, agent);
        deleteTargetPromise.then((updatedAgent: DTContracts.TaskAgent) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateTargetComplete");
            target.agent = updatedAgent;
            target.enabled = updatedAgent.enabled;
            this._actions.deploymentTargetUpdated.invoke(target);
            VSS.globalProgressIndicator.actionCompleted(progressId_updateDeploymentTarget);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.UpdateDeploymentTargetScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_updateDeploymentTarget);
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, err);
        });
    }

    private _source: Model.DeploymentPoolSource;
    private _actions: DeploymentTargetActions;
}

