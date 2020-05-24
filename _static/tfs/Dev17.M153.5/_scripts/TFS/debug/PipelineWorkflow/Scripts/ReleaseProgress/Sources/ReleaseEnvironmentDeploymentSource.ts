import * as Q from "q";

import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

export class ReleaseEnvironmentDeploymentSource extends ReleaseManagementSourceBase {

    constructor() {
        super();
        this._lastDeploymentsOnEnvironment = {};
    }

    public static getKey(): string {
        return "ReleaseEnvironmentDeploymentSource";
    }

    public static instance(): ReleaseEnvironmentDeploymentSource {
        return SourceManager.getSource(ReleaseEnvironmentDeploymentSource);
    }

    public getLatestDeploymentAttemptsOnEnvironment(definitionId: number, environmentDefinitionId: number, fetchLatest: boolean = false, continuationToken: number = 0): IPromise<PipelineTypes.IDeploymentResult> {

        if (!this._lastDeploymentsOnEnvironment[environmentDefinitionId] || fetchLatest) {
            let pastOperationStatus: number = this._getPastOperationStatus();
            let pastDeploymentStatus: number = this._getPastDeploymentStatus();

            // Currently top (number of releases to fetch) is 1.
            // TODO: ankhokha: handle case when comparison with multiple releases is required

            return this.getClient().getLatestDeploymentAttempts(
                definitionId, 
                environmentDefinitionId, 
                null, 
                pastDeploymentStatus, 
                pastOperationStatus, 
                ReleaseContracts.ReleaseQueryOrder.Descending, 
                this.DefaultTopDeploymentsCount, 
                continuationToken)
                .then((deploymentResult: PipelineTypes.IDeploymentResult) => {
                    this._lastDeploymentsOnEnvironment[environmentDefinitionId] = Q.resolve(deploymentResult);
                    return this._lastDeploymentsOnEnvironment[environmentDefinitionId];
                }, (error: any) => {
                    return Q.reject(error);
                });
        }

        return this._lastDeploymentsOnEnvironment[environmentDefinitionId];
    }

    public getLastDeploymentsOnAllEnvironments(definitionId: number, environmentDefinitionIds: number[]): IPromise<PipelineTypes.IDeploymentResult> {

        let pastOperationStatus: number = this._getPastOperationStatus();
        let pastDeploymentStatus: number = this._getPastDeploymentStatus();

        let environmentDefinitionId = null;
        if (environmentDefinitionIds && environmentDefinitionIds.length === 1){
            environmentDefinitionId = environmentDefinitionIds[0];
        }

        // Currently top (number of releases to fetch) is 1.
        // TODO: ankhokha: handle case when comparison with multiple releases is required

        return this.getClient().getDeployments(definitionId, environmentDefinitionId, null, pastDeploymentStatus, pastOperationStatus);
    }

    public getLatestReleaseToCompareForAllEnvironments(definitionId: number, 
        environmentDefinitionIds: number[],
        currentReleaseId: number): IPromise<{[id: string]: PipelineTypes.ReleaseDeployment}> {

        let deploymentDefer = Q.defer<{[id: string]: PipelineTypes.ReleaseDeployment}>();

        this.getLastDeploymentsOnAllEnvironments(definitionId, environmentDefinitionIds).then((deploymentResult: PipelineTypes.IDeploymentResult) => {
            // TODO: ankhokha: handle when multiple releases are fetched
            // currently we will only fetch the first one
            let currentlyDeployed: {[id: string]: PipelineTypes.ReleaseDeployment} = {};

            if (deploymentResult.deployments && deploymentResult.deployments.length > 0) {

                deploymentResult.deployments.forEach((deploymentResult: PipelineTypes.ReleaseDeployment) => {
                    if (!currentlyDeployed[deploymentResult.definitionEnvironmentId]) {
                        currentlyDeployed[deploymentResult.definitionEnvironmentId] = deploymentResult;
                    }
                });

                deploymentDefer.resolve(currentlyDeployed);
            }
            deploymentDefer.resolve(null);
        }, (error: any) => {
            deploymentDefer.reject(error);
            return null;
        });
        return deploymentDefer.promise;
    }

    public getDeploymentsOnEnvironment(definitionId: number, definitionEnvironmentId: number, status: ReleaseContracts.DeploymentStatus, queryOrder: ReleaseContracts.ReleaseQueryOrder, top: number, continuationToken: number, minStartedTime: Date, maxStartedTime: Date): IPromise<PipelineTypes.IDeploymentResult> {
        return this.getClient().getDeployments(definitionId, definitionEnvironmentId, null, status, null, queryOrder, top, continuationToken, minStartedTime, maxStartedTime);
    }

    public deferEnvironmentDeployment(releaseId: number, releaseEnvironmentId: number, scheduledDeploymentTime: Date) {
        return this.getClient().patchReleaseEnvironmentScheduledDeploymentTime(releaseId, releaseEnvironmentId, scheduledDeploymentTime);
    }

    private _getPastOperationStatus(): number {
        return PipelineTypes.ReleaseOperationStatus.Rejected | PipelineTypes.ReleaseOperationStatus.PhaseSucceeded |
            PipelineTypes.ReleaseOperationStatus.PhasePartiallySucceeded | PipelineTypes.ReleaseOperationStatus.PhaseFailed |
            PipelineTypes.ReleaseOperationStatus.Canceled | PipelineTypes.ReleaseOperationStatus.PhaseCanceled |
            PipelineTypes.ReleaseOperationStatus.Approved;
    }

    private _getPastDeploymentStatus(): number {
        return PipelineTypes.ReleaseDeploymentStatus.Failed | PipelineTypes.ReleaseDeploymentStatus.InProgress |
            PipelineTypes.ReleaseDeploymentStatus.PartiallySucceeded | PipelineTypes.ReleaseDeploymentStatus.Succeeded;
    }

    private _lastDeploymentsOnEnvironment: IDictionaryNumberTo<IPromise<PipelineTypes.IDeploymentResult>>;

    private readonly DefaultTopDeploymentsCount: number = 50;
}
