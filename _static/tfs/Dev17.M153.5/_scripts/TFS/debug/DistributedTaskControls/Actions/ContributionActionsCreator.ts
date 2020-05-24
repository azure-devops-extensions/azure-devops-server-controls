import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ContributionActions } from "DistributedTaskControls/Actions/ContributionActions";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";

import * as Diag from "VSS/Diag";

export class ContributionActionsCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.ContributionActionsCreator;
    }

    public initialize(instanceId: string) {
        this._actions = ActionsHubManager.GetActionsHub<ContributionActions>(ContributionActions, instanceId);
    }

    public getContributions(targetId: string): void {
        ContributionSource.instance().getContributions(targetId).then((contributions: Contribution[]) => {
            this._actions.contributionsRetrieved.invoke({
                targetId: targetId,
                contributions: contributions
            });
        }, (err: any) => {
            Diag.logError(err);
            this._actions.contributionsRetrieved.invoke({
                targetId: targetId,
                contributions: []
            });
        });
    }

    private _actions: ContributionActions;
}