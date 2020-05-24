import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import { DeploymentCancelActions, IDeploymentCancelProgressState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancelActions";
import { ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseActionsSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseActionsSource";

import * as Utils_String from "VSS/Utils/String";
import { PermissionHelper } from "../../SharedComponents/Security/PermissionHelper";

export class DeploymentCancelActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.DeploymentCancel;
    }

    public initialize(instanceId?: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<DeploymentCancelActions>(DeploymentCancelActions, instanceId);
    }

    public showDialog() {
        this._actionsHub.updateDialogProgressState.invoke(IDeploymentCancelProgressState.Initial);
    }

    public hideDialog() {
        this._actionsHub.updateDialogProgressState.invoke(IDeploymentCancelProgressState.DialogNotShown);
    }

    public cancel(releaseId: number, environment: ReleaseEnvironment, comment: string): IPromise<void> {
        this._actionsHub.updateDialogProgressState.invoke(IDeploymentCancelProgressState.InProgress);
        this._publishButtonClickTelemetry(releaseId, environment, comment ? true : false);
        return this.cancelRelease(releaseId, environment.id, comment).then(() => {            
            this._actionsHub.updateDialogProgressState.invoke(IDeploymentCancelProgressState.DialogNotShown);
        }, (error: any) => {
            this._actionsHub.updateCancelState.invoke(error.message);            
        });
    }

    private _publishButtonClickTelemetry(releaseId: number, environment: ReleaseEnvironment, comment: boolean) {
        let feature: string = Feature.EnvironmentCancel;
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.ReleaseId] = releaseId;
        eventProperties[Properties.ReleaseDefinitionId] = environment.releaseDefinition.id;
        eventProperties[Properties.EnvironmentId] = environment.id;
        eventProperties[Properties.EnvironmentDefinitionId] = environment.definitionEnvironmentId;
        eventProperties[Properties.IsCommentPresent] = comment;

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private cancelRelease(releaseId, environmentId, comment): IPromise<RMContracts.ReleaseEnvironment> {
        return ReleaseActionsSource.instance().cancelReleaseEnvironment(releaseId, environmentId, comment);
    }


    private _actionsHub: DeploymentCancelActions;
}