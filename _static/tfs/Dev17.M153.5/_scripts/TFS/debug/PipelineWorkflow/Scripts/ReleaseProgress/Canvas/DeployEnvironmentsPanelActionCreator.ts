import * as Q from "q";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { LoadableComponentActionsHub } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsHub";

import { MessageBarType } from "OfficeFabric/MessageBar";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { PipelineArtifact } from "PipelineWorkflow/Scripts/Common/Types";
import { DeploymentUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DeploymentUtils";
import { ArtifactUtilities } from "PipelineWorkflow/Scripts/ReleaseProgress/ArtifactComparison/ArtifactUtilities";
import { DeployEnvironmentsPanelActions, IEnvironmentDeployProgressState, IEnvironmentSkeleton } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";
import { CanvasSelectorConstants, ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { ReleaseSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseSignalRManager";
import { ReleaseActionsSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseActionsSource";
import { ReleaseEnvironmentDeploymentSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseEnvironmentDeploymentSource";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IEnvironmentAgentPhaseWarningData, ReleaseEnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";

import { ReleaseEnvironment, ConfigurationVariableValue } from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class DeployEnvironmentsPanelActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.DeployEnvironmentsPanel;
    }

    public initialize(instanceId?: string): void {
        this._instanceId = instanceId;
        this._releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        this._actionsHub = ActionsHubManager.GetActionsHub<DeployEnvironmentsPanelActions>(DeployEnvironmentsPanelActions, instanceId);
        this._loadableComponentActionsHub = ActionsHubManager.GetActionsHub<LoadableComponentActionsHub>(LoadableComponentActionsHub, instanceId);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public initializeData(releaseDefinitionId: number, currentReleaseId: number, environments: ReleaseEnvironment[], artifacts: PipelineArtifact[]) {
        this._actionsHub.updateDeployableEnvironments.invoke(environments);
        this.initializeReleasesToCompare(releaseDefinitionId, currentReleaseId, environments, artifacts);
        this.validateDemands(environments);
    }

    public initializeReleasesToCompare(releaseDefinitionId: number,
        currentReleaseId: number,
        environments: ReleaseEnvironment[],
        artifacts: PipelineArtifact[]): IPromise<void> {
        this._loadableComponentActionsHub.showLoadingExperience.invoke({});

        let environmentDefinitionIds = environments.map((environment: ReleaseEnvironment) => { return environment && environment.definitionEnvironmentId; });
        return ReleaseEnvironmentDeploymentSource.instance().getLatestReleaseToCompareForAllEnvironments(releaseDefinitionId, environmentDefinitionIds, currentReleaseId)
            .then((deployments: { [id: string]: PipelineTypes.ReleaseDeployment }) => {
                if (deployments) {
                    for (let environment of environments) {
                        if (deployments[environment.definitionEnvironmentId]) {
                            let deployment = deployments[environment.definitionEnvironmentId];
                            let isRollback = ArtifactUtilities.isRollback(ArtifactUtilities.getPrimaryArtifact(artifacts), ArtifactUtilities.getPrimaryArtifact(deployment.release.artifacts));

                            this._actionsHub.updateReleaseToCompare.invoke({
                                environmentId: environment.id,
                                currentlyDeployedRelease: {
                                    name: deployment.release.name,
                                    id: deployment.release.id,
                                    deploymentStatus: ReleaseDeploymentAttemptHelper.getStatusText(deployment.deploymentStatus),
                                    completedOn: DateTimeUtils.getLocaleTimestamp(deployment.completedOn),
                                    deploymentStatusIconProps: DeploymentUtils.getDeploymentIconProps(deployment),
                                    isRollback: isRollback
                                }
                            });
                        }
                    }
                }
                this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
                this._messageHandlerActionsCreator.dismissMessage(this._instanceId);
                this._actionsHub.updateErrorInFetchingRelease.invoke(false);
                return Q.resolve(null);
            },
                (error: any) => {
                    this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
                    this._handleError(error);
                    return Q.reject(error);
                });
    }

    public validateDemands(environments: ReleaseEnvironment[]): IPromise<void> {
        let warningsDataPromise = ReleaseEnvironmentUtils.getEnvironmentsPhasesDemandsWarning(environments);

        return warningsDataPromise.then((data: IEnvironmentAgentPhaseWarningData[]) => {
            this._actionsHub.updateDemands.invoke(data);
        });
    }

    public deployEnvironments(releaseId: number,
        releaseDefinitionId: number,
        environments: IEnvironmentSkeleton[],
        comment: string,
        deployableEnvironmentsCount: number,
        deployTimeOverrideVariables?: IDictionaryStringTo<ConfigurationVariableValue>): IPromise<boolean> {
        this._actionsHub.updateDeployState.invoke(IEnvironmentDeployProgressState.InProgress);
        let promises: IPromise<any>[] = [];
        let succeeded = false;
        for (let environment of environments) {
            promises.push(this._deploy(releaseId, environment, comment, deployTimeOverrideVariables));
        }
        return Q.allSettled(promises).then((promisesState: Q.PromiseState<ReleaseEnvironment>[]) => {
            let isError = false;
            let errorMessages = {};
            let failedEnvironments = [];

            promisesState.forEach((promiseData: Q.PromiseState<ReleaseEnvironment>) => {
                if (promiseData
                    && promiseData.state === "rejected"
                    && promiseData.reason) {
                    isError = true;
                    failedEnvironments.push(promiseData.reason.environmentName);
                    errorMessages[promiseData.reason.environmentName] = promiseData.reason.error.message ? promiseData.reason.error.message : promiseData.reason.error;
                }
            });

            if (isError) {
                let errorMessage = Resources.DeploymentFailedMultipleEnvironments;
                for (let environment in errorMessages) {
                    errorMessage += "\n" + Utils_String.localeFormat(Resources.DeploymentFailedMultipleEnvironmentsFormat, environment, errorMessages[environment]);
                }
                this._actionsHub.updateErrorInDeploy.invoke(errorMessage);
            }
            else {
                this._actionsHub.updateDeployState.invoke(IEnvironmentDeployProgressState.Initial);
                succeeded = true;
            }
            this._releaseActionCreator.refreshRelease(releaseId);
            ReleaseSignalRManager.instance().startLiveWatchIfNeeded(true);
            return Q.resolve(succeeded);
        }, (error: any) => {
            return Q.reject(false);
        });
    }

    public publishSingleDeployClickTelemetry(releaseId: number,
        releaseDefinitionId: number,
        environment: ReleaseEnvironment,
        isCommentPresent: boolean,
        isRollback: boolean) {
        let feature: string = Feature.EnvironmentDeploy;
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.ReleaseId] = releaseId;
        eventProperties[Properties.ReleaseDefinitionId] = releaseDefinitionId;
        eventProperties[Properties.EnvironmentId] = environment.id;
        eventProperties[Properties.EnvironmentDefinitionId] = environment.definitionEnvironmentId;
        eventProperties[Properties.IsCommentPresent] = isCommentPresent;
        eventProperties[Properties.IsRollback] = isRollback;

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    public publishMultipleDeployClickTelemetry(releaseId: number,
        releaseDefinitionId: number,
        isCommentPresent: boolean,
        selectedEnvironmentCount: number,
        applicableEnvironmentCount: number) {
        let feature: string = Feature.MultipleEnvironmentsDeploy_Action;
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.ReleaseId] = releaseId;
        eventProperties[Properties.ReleaseDefinitionId] = releaseDefinitionId;
        eventProperties[Properties.IsCommentPresent] = isCommentPresent;
        eventProperties[Properties.ApplicableEnvironmentsCount] = applicableEnvironmentCount;
        eventProperties[Properties.DeployedEnvironmentsCount] = selectedEnvironmentCount;

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    public updateDeploymentOption(deploymentOption: string): void {
        if (deploymentOption) {
            this._actionsHub.updateDeploymentOption.invoke(deploymentOption);
        }
    }

    private _handleError(error): void {
        let errorMessage: string = error && error.message;
        if (errorMessage) {
            this._messageHandlerActionsCreator.addMessage(this._instanceId, errorMessage, MessageBarType.error);
        }
        this._actionsHub.updateErrorInFetchingRelease.invoke(true);
    }

    private _deploy(releaseId: number, environment: IEnvironmentSkeleton, comment: string, deployTimeOverrideVariables?: IDictionaryStringTo<ConfigurationVariableValue>): IPromise<ReleaseEnvironment> {
        let deployPromise = ReleaseActionsSource.instance().deployReleaseEnvironment(releaseId, environment.id, comment, deployTimeOverrideVariables);

        return deployPromise.then((environment: ReleaseEnvironment) => {
            return Q.resolve(environment);
        }, (errorData) => {
            return Q.reject({
                error: errorData,
                environmentId: environment.id,
                environmentName: environment.name
            });
        });
    }

    private _releaseActionCreator: ReleaseActionCreator;
    private _actionsHub: DeployEnvironmentsPanelActions;
    private _loadableComponentActionsHub: LoadableComponentActionsHub;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;
    private _instanceId: string;
}