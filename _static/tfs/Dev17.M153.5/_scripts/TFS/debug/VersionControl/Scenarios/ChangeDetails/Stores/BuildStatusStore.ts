import * as VSSStore from  "VSS/Flux/Store";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { GitStatus } from "TFS/VersionControl/Contracts";

export interface BuildStatusState {
    statuses: GitStatus[];
    isSetupExperienceVisible: boolean;
}

/**
 * A store containing the state of the build statuses for the commit.
 */
export class BuildStatusStore extends VSSStore.RemoteStore {
    private _state: BuildStatusState;

    constructor(private _actionsHub: ActionsHub) {
        super();
        this._state = {
            statuses: null,
            isSetupExperienceVisible: false
        } as BuildStatusState;

        this._actionsHub.buildStatusesLoaded.addListener(this._onBuildStatusesLoaded);
    }

    public get state(): BuildStatusState {
        return this._state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.buildStatusesLoaded.removeListener(this._onBuildStatusesLoaded);
            this._actionsHub = null;
        }

        this._state = null;
    }

    private _onBuildStatusesLoaded = (statuses: GitStatus[]): void => {
        this._state.statuses = statuses ? this._removeOldDuplicates(statuses) : [];

        this._loading = false;
        this.emitChanged();
    }

    private _removeOldDuplicates(statuses: GitStatus[]): GitStatus[] {
        const lookup: { [key: string]: GitStatus } = {};

        for (const status of statuses) {
            const typeKey = this._getStatusTypeUniqueKey(status);

            const existing = lookup[typeKey];
            if (!existing || existing.creationDate < status.creationDate) {
                lookup[typeKey] = status;
            }
        }

        const result: GitStatus[] = [];
        for (const typeKey in lookup) {
            result.push(lookup[typeKey]);
        }

        return result;
    }

    private _getStatusTypeUniqueKey(status: GitStatus): string {
        return status.context.genre + "/" + status.context.name;
    }
}
