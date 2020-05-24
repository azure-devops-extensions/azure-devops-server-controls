import * as VSSStore from  "VSS/Flux/Store";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { SelectedPathChangedPayload } from "VersionControl/Scenarios/History/CommonPayloadInterfaces"

export interface VersionState {
    versionSpec: VersionSpec;
    deletedBranchName: string;
}

/**
 * A store containing the state of the currently displayed version (changeset or commit).
 */
export class VersionStore extends VSSStore.Store {
    public state = {} as VersionState;

    public selectVersion = (payload: SelectedPathChangedPayload): void => {
        if (this.state.versionSpec !== payload.version) {
            if (!!this.state.versionSpec) {
                this._setDeletedBranch("");
            }

            this.state.versionSpec = payload.version;
            this.emitChanged();
        }
    }

    public changeDeletedBranch = (deletedBranchName: string): void => {
        if (this.state.deletedBranchName !== deletedBranchName) {
            this._setDeletedBranch(deletedBranchName);
            this.emitChanged();
        }
    }

    public dispose(): void {
        this.state = null;
    }

    private _setDeletedBranch(deletedBranchName: string): void {
        this.state.deletedBranchName = deletedBranchName;
    }
}
