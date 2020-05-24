import * as Q from "q";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";

import { ContributionIds } from "PipelineWorkflow/Scripts/Common/Constants";
import { ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IVisibilityPayload, ReleaseEnvironmentPropertiesContributionsActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsActions";

export class ReleaseEnvironmentPropertiesContributionsActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.ReleaseEnvironmentPropertiesContributions;
    }

    public initialize(instanceId?: string): void {

        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseEnvironmentPropertiesContributionsActions>(ReleaseEnvironmentPropertiesContributionsActions, instanceId);
    }

    public updateContributions(): IPromise<void> {
        return ContributionSource.instance().getContributions(ContributionIds.ReleaseDeploymentPipelineNodeContributionId).then((contributions: Contribution[]) => {
            this._actionsHub.updateContributions.invoke(contributions);

            return Q.resolve(null);
        });
    }

    public updateVisibility(environmentInstanceId: string, extensionId: string, isVisible: boolean): void {
        this._actionsHub.updateVisibility.invoke({
            environmentInstanceId: environmentInstanceId,
            extensionid: extensionId,
            isVisible: isVisible
        });
    }

    private _actionsHub: ReleaseEnvironmentPropertiesContributionsActions;
}