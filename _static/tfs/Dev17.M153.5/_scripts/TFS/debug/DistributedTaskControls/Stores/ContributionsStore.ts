import { ContributionActions, IContributionsRetrievedPayload } from "DistributedTaskControls/Actions/ContributionActions";
import { ContributionActionsCreator } from "DistributedTaskControls/Actions/ContributionActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";

import Utils_String = require("VSS/Utils/String");

export class ContributionsStore extends StoreCommonBase.StoreBase {
    constructor() {
        super();

        this._actionsCreator = ActionCreatorManager.GetActionCreator<ContributionActionsCreator>(ContributionActionsCreator);
    }

    public static getKey(): string {
        return StoreKeys.ContributionsStore;
    }

    public initialize(): void {
        this._contributionActions = ActionsHubManager.GetActionsHub<ContributionActions>(ContributionActions);
        this._contributionActions.contributionsRetrieved.addListener(this._onContributionsRetrieved);
    }

    public getContributionsForTarget(targetId: string, contributionId?: string): Contribution[] {
        let result = this._contributionsByTargetId[targetId];
        let fetch: boolean = !result;

        if (fetch) {
            result = [];
            this._contributionsByTargetId[targetId] = result;
            this._actionsCreator.getContributions(targetId);
        }

        if (!fetch && contributionId) {
            result = result.filter((contribution) => {
                // contribution ids are not case-sensitive
                return Utils_String.equals(contributionId, contribution.id, true);
            });
        }

        return result;
    }

    protected disposeInternal(): void {
        this._contributionActions.contributionsRetrieved.removeListener(this._onContributionsRetrieved);
    }

    private _onContributionsRetrieved = (payload: IContributionsRetrievedPayload): void => {
        this._contributionsByTargetId[payload.targetId] = payload.contributions;
        this.emitChanged();
    }

    private _contributionsByTargetId: IDictionaryStringTo<Contribution[]> = {};
    private _contributionActions: ContributionActions;
    private _actionsCreator: ContributionActionsCreator;
}