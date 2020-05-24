// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeploymentPoolsActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolsActions";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import { ActionCreatorKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

export class DeploymentPoolsActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.DeploymentPoolsActionCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<DeploymentPoolsActions>(DeploymentPoolsActions, instanceId);
        this._source = Model.DeploymentPoolSource.instance();
        this._deploymentPoolCommonSource = DeploymentPoolCommonModel.DeploymentPoolCommonSource.instance();
    }

    public loadDeploymentPoolsSummary(nameFilter?: string) {
        let progressId_loadPoolsView = VSS.globalProgressIndicator.actionStarted("loadDeploymentPoolsSummary", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolsSummaryBegin");
        let getDataPromise = this._deploymentPoolCommonSource.beginGetDeploymentPoolsSummary(nameFilter);
        getDataPromise.then((deploymentPoolsSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[]) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolsSummaryComplete");
            this._actions.deploymentPoolsSummaryLoaded.invoke(deploymentPoolsSummary);
            VSS.globalProgressIndicator.actionCompleted(progressId_loadPoolsView);
        }, (error: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.LandingOnDeploymentPoolHubScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_loadPoolsView);
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, error);
        });
    }

    public deleteDeploymentPool(poolId: number) {
        let progressId_deleteDP = VSS.globalProgressIndicator.actionStarted("deleteDeploymentPool", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteDeploymentPoolBegin");
        let newMgPromise = this._source.beginDeleteDeploymentPool(poolId);
        newMgPromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteDeploymentPoolComplete");
            this._actions.deploymentPoolDeleted.invoke(poolId);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteDP);
        }, (error: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.DeleteDeploymentPoolScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteDP);
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, error);
        });
    }

    public upgradeDeploymentTargets(poolId: number) {
        let progressId_upgradeTargets = VSS.globalProgressIndicator.actionStarted("upgradeDeploymentTargets", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpgradeTargetsBegin");
        let upgradeTargetsPromise = this._source.beginUpgradeDeploymentTargets(poolId);
        upgradeTargetsPromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpgradeTargetsComplete");
            PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.UpgradeTargetsScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_upgradeTargets);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.UpgradeTargetsScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_upgradeTargets);
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, err);
        });
    }

    private _source: Model.DeploymentPoolSource;
    private _deploymentPoolCommonSource: DeploymentPoolCommonModel.DeploymentPoolCommonSource;
    private _actions: DeploymentPoolsActions;
}

