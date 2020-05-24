import VSS = require("VSS/VSS");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Events_Services = require("VSS/Events/Services");
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeploymentPoolEventsActions} from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolEventsActions";
import { DeploymentPoolTargetsActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolTargetsActions";
import { ActionCreatorKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");

export class DeploymentPoolTargetsActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.DeploymentPoolTargetsActionCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<DeploymentPoolTargetsActions>(DeploymentPoolTargetsActions, instanceId);
        this._poolEventsActions = ActionsHubManager.GetActionsHub<DeploymentPoolEventsActions>(DeploymentPoolEventsActions, instanceId);
        this._source = Model.DeploymentPoolSource.instance();
    }

    public getDeploymentPoolTargets(deploymentPoolId: number) {
        let progressId_LoadDPTargets = VSS.globalProgressIndicator.actionStarted("loadDeploymentPoolTargets", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolTargetsBegin");
        this._source.beginGetDeploymentPoolTargets(deploymentPoolId).then((deploymentPoolTargets: Model.DeploymentPoolTarget[]) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolTargetsComplete");
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentPoolJobRequestsBegin");
            this._source.beginGetDeploymentPoolJobRequests(deploymentPoolId).then((jobRequests: Model.Dictionary<DTContracts.TaskAgentJobRequest>) => {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentJobRequestsComplete");
                deploymentPoolTargets.forEach((deploymentPoolTarget) => {
                    if(!deploymentPoolTarget.latestDeployment) {
                        if(!!jobRequests[deploymentPoolTarget.id]) {
                            deploymentPoolTarget.latestDeployment = jobRequests[deploymentPoolTarget.id];
                        }
                    }
                });
                this._actions.deploymentPoolTargetsLoaded.invoke(deploymentPoolTargets);
                VSS.globalProgressIndicator.actionCompleted(progressId_LoadDPTargets);
            }, (error: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.LandingOnDeploymentPoolTargetsPageScenario);
                VSS.globalProgressIndicator.actionCompleted(progressId_LoadDPTargets);
                VSS.handleError(error);                
            });
        }, (error: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.LandingOnDeploymentPoolTargetsPageScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_LoadDPTargets);
            VSS.handleError(error);
        });
    }

    public deleteTarget(poolId: number, targetId: number) {
        let progressId_deleteTarget = VSS.globalProgressIndicator.actionStarted("deleteTarget", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteTargetBegin");
        let deleteTargetPromise = this._source.beginDeleteTarget(poolId, targetId);
        deleteTargetPromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteTargetComplete");
            this._poolEventsActions.agentDeleted.invoke(targetId);
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
    private _actions: DeploymentPoolTargetsActions;
    private _poolEventsActions: DeploymentPoolEventsActions;
}
