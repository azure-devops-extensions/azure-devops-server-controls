import * as Q from "q";

import * as VSS from "VSS/VSS";
import Utils_Array = require("VSS/Utils/Array");
import * as Utils_Date from "VSS/Utils/Date";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { ReleaseReportingKeys, ReleaseReportingProgressIndicatorAction, DeploymentQueryConstants } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";
import { IEnvironmentDeployments, IDeploymentRenderingData } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDialog";
import { ReleaseReportingActions } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActions";

import { ProgressIndicatorActionsCreator } from "PipelineWorkflow/Scripts/Common/Actions/ProgressIndicatorActionsCreator";
import { DialogActions } from "PipelineWorkflow/Scripts/Common/Actions/DialogActions";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionsSource } from "PipelineWorkflow/Scripts/Definitions/DefinitionsSource";
import { ReleaseEnvironmentDeploymentSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseEnvironmentDeploymentSource";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";

export class ReleaseReportingActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseReportingKeys.ActionsCreatorKey_ReleaseReportingActionsCreator;
    }

    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub(ReleaseReportingActions, instanceId);
    }

    public initializeData(id: number, progressStoreInstanceId: string, environmentListStoreInstanceId: string): void {
        this._initializeData(id, progressStoreInstanceId);
    }

    public updateErrorMessage(errorMessage: string): void {
        this._actions.updateErrorMessage.invoke(errorMessage);
    }

    public updateDeployments(id: number, numberOfDaysToFilter: number): void {
        if (!!this._definition.environments) {
              this._definition.environments.forEach((environment) => { 
                   this._fetchDeployments(this._definition.id, environment.id, environment.name, numberOfDaysToFilter); 
           });
        }
    }

    private _initializeData(id: number, progressStoreInstanceId: string): void {
        this._progressIndicatorActionsCreator = ActionCreatorManager.GetActionCreator<ProgressIndicatorActionsCreator>(ProgressIndicatorActionsCreator, progressStoreInstanceId);
        this._progressIndicatorActionsCreator.actionStarted(ReleaseReportingProgressIndicatorAction.initializeDeploymentsAction);
        let promise: Q.Promise<PipelineDefinition>;
        promise = <Q.Promise<PipelineDefinition>>DefinitionsSource.instance().getDefinition(id);

        promise.then((data: PipelineDefinition) => {
            this._actions.initializeDefinition.invoke(data);
            this._definition = data;
            if (!!data && !!data.environments)
            {
                data.environments.forEach((environment) => 
                { 
                    this._initializeDeployments(data.id, environment.id, environment.name);
                });
            }
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
        }).fin(() => {
            this._progressIndicatorActionsCreator.actionCompleted(ReleaseReportingProgressIndicatorAction.initializeDeploymentsAction);
        });

        this._progressIndicatorActionsCreator.actionStarted(ReleaseReportingProgressIndicatorAction.initializeContributionsAction);        
        ContributionSource.instance().getContributions("ms.vss-releaseManagement-web.report").then((contributions: Contribution[]) => {
            this._actions.initializeContributions.invoke(contributions);
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
        });
    }

    private _fetchDeployments(definitionId?: number, definitionEnvironmentId?: number, definitionEnvironmentName?: string, daysToAnalyze?: number): void {
        let maxStartedTime = Utils_Date.getNowInUserTimeZone();
        let minStartedTime = Utils_Date.addDays(maxStartedTime, -1 * daysToAnalyze, true);
        let deploymentsPromise = <Q.Promise<PipelineTypes.IDeploymentResult>>ReleaseEnvironmentDeploymentSource.instance()
                                 .getDeploymentsOnEnvironment(definitionId, definitionEnvironmentId, DeploymentQueryConstants.StatusToQuery, DeploymentQueryConstants.QueryOder, DeploymentQueryConstants.Top, null, minStartedTime, maxStartedTime);

        deploymentsPromise.then((deploymentResult: PipelineTypes.IDeploymentResult) => {
            let deploymentDataByEnvironment: IEnvironmentDeployments = 
                                             {
                                                 environmentId: definitionEnvironmentId, 
                                                 environmentName: definitionEnvironmentName, 
                                                 deployments: this._fillDeploymentDataByEnvironment(deploymentResult) 
                                             };
            if (!deploymentResult.continuationToken) {
                this._actions.initializeDeployments.invoke(deploymentDataByEnvironment);
                return; 
            }
            else {
                this._getAllDeploymentsWithContinuationToken(definitionId, definitionEnvironmentName, definitionEnvironmentId, DeploymentQueryConstants.StatusToQuery, DeploymentQueryConstants.QueryOder, DeploymentQueryConstants.Top, deploymentResult.continuationToken, minStartedTime, maxStartedTime, deploymentDataByEnvironment);
            }
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
        });
    }

    private _initializeDeployments(definitionId?: number, definitionEnvironmentId?: number, definitionEnvironmentName?: string): void {
        this._fetchDeployments(definitionId, definitionEnvironmentId, definitionEnvironmentName, DeploymentQueryConstants.DaysToAnalyze);
    }
    
    private _getAllDeploymentsWithContinuationToken(definitionId: number, definitionEnvironmentName: string, definitionEnvironmentId: number, status: ReleaseContracts.DeploymentStatus, queryOrder: ReleaseContracts.ReleaseQueryOrder, top: number, continuationToken: number, minStartedTime: Date, maxStartedTime: Date, deploymentDataByEnvironment: IEnvironmentDeployments): void 
    {
        let deploymentsPromise = <Q.Promise<PipelineTypes.IDeploymentResult>>ReleaseEnvironmentDeploymentSource.instance()
                                 .getDeploymentsOnEnvironment(definitionId, definitionEnvironmentId, DeploymentQueryConstants.StatusToQuery, DeploymentQueryConstants.QueryOder, DeploymentQueryConstants.Top, continuationToken, minStartedTime, maxStartedTime);
        deploymentsPromise.then((deploymentResult: PipelineTypes.IDeploymentResult) => {
            let deployments = this._fillDeploymentDataByEnvironment(deploymentResult);
            Utils_Array.addRange(deploymentDataByEnvironment.deployments, deployments);
            if (!deploymentResult.continuationToken)  
               {
                this._actions.initializeDeployments.invoke(deploymentDataByEnvironment); 
                return; 
               } 
            this._getAllDeploymentsWithContinuationToken(definitionId, definitionEnvironmentName, definitionEnvironmentId, status, queryOrder, DeploymentQueryConstants.Top, deploymentResult.continuationToken, minStartedTime, maxStartedTime, deploymentDataByEnvironment);
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
        });

    }

    private _fillDeploymentDataByEnvironment(deploymentResult: PipelineTypes.IDeploymentResult): IDeploymentRenderingData[]
    {
        let deploymentsRenderingData: IDeploymentRenderingData[] = [];
        deploymentResult.deployments.forEach((deployment) => {
            let deploymentData: IDeploymentRenderingData = { id: deployment.id, status: deployment.deploymentStatus, startedOn: deployment.startedOn, completedOn: deployment.completedOn,  totalTimeInSeconds: this._computeTotalTimeForDeployment(deployment.completedOn, deployment.startedOn) };
            deploymentsRenderingData.push(deploymentData);
        });
        return deploymentsRenderingData;
    }

    private _computeTotalTimeForDeployment(completedOn: Date, startedOn: Date): number 
    {
        let totalTimeInSeconds : number = 0;
        if (!!completedOn && !!startedOn)
        {
            totalTimeInSeconds = (completedOn.getTime() - startedOn.getTime()) / 1000;
        }
        return totalTimeInSeconds;
    }

    private _actions: ReleaseReportingActions;
    private _progressIndicatorActionsCreator: ProgressIndicatorActionsCreator;
    private _definition: PipelineDefinition;
}
