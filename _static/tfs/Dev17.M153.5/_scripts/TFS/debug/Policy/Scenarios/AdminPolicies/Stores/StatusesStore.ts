import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

import { Actions } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";
import { Status } from "Policy/Scripts/PolicyTypes";
import { GitStatusContext } from "TFS/VersionControl/Contracts";
import * as StringUtils from "VSS/Utils/String";

export class StatusesStore extends RemoteStore {
    private _statuses: GitStatusContext[];

    constructor(pageData: any) {
        super();

        this.onStatusesLoaded({statuses: pageData.pullRequestStatuses || []});
    }

    @autobind
    public onStatusesLoaded(payload: Actions.PullRequestStatusesPayload) {
        this._statuses = payload.statuses;
        if (this._statuses) {
            this._statuses = this._statuses.sort((a: GitStatusContext, b: GitStatusContext) => {
                return StringUtils.ignoreCaseComparer(a.genre, b.genre)
                    || StringUtils.ignoreCaseComparer(a.name, b.name);
            });
        }
        this._loading = false;
        this.emitChanged();
    }

    public getStatuses(): GitStatusContext[] {
        return this._statuses;
    }

    public getStatus(configSettings: Status.Settings): GitStatusContext {
        const matchingStatuses = this._statuses.filter(s =>
            s.name === configSettings.statusName
            && s.genre == configSettings.statusGenre);

        return matchingStatuses.length > 0 ? matchingStatuses[0] : null;
    }
}
