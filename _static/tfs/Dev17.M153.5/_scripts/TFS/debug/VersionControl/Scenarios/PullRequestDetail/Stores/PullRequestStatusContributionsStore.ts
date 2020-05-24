import { RemoteStore } from "VSS/Flux/Store";

import { autobind } from "OfficeFabric/Utilities";

import { PullRequestStatusContributions } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusContributions";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export class PullRequestStatusContributionsStore extends RemoteStore {
    private _statusContributions: PullRequestStatusContributions;

    constructor() {
        super();
        this._statusContributions = new PullRequestStatusContributions([]);
    }

    public getStatusContribution(): PullRequestStatusContributions {
        return this._statusContributions;
    }

    @autobind
    public onStatusContributionUpdated(payload: Actions.IPullRequestStatusesContributionPayload): void {
        this._statusContributions = new PullRequestStatusContributions(payload.contributions);
        this.emitChanged();
    }
}
