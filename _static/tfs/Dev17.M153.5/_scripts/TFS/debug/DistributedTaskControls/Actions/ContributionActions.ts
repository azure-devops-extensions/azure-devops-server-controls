import { Action } from "VSS/Flux/Action";
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

export interface IContributionsRetrievedPayload {
    targetId: string;
    contributions: Contribution[];
}

export class ContributionActions extends ActionsHubBase {

    public initialize(): void {
        this._contributionsRetrieved = new Action<IContributionsRetrievedPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.ContributionActions;
    }

    public get contributionsRetrieved(): Action<IContributionsRetrievedPayload> {
        return this._contributionsRetrieved;
    }

    private _contributionsRetrieved = new Action<IContributionsRetrievedPayload>();
}