import {GitRef,GitRefUpdate} from "TFS/VersionControl/Contracts";
import {
    InitializeDefaultBranch,
    RemoveDefaultBranch,
    BranchDeleted,
} from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import * as StoreBase from "VSS/Flux/Store";
import {localeIgnoreCaseComparer} from "VSS/Utils/String";

export class DefaultBranchStore extends StoreBase.Store {
    private _defaultBranch: GitRef;

    constructor() {
        super();
        InitializeDefaultBranch.addListener(this._set);
        RemoveDefaultBranch.addListener(this._unset);
        BranchDeleted.addListener(this._checkedUnset);
    }

    public dispose(): void {
        InitializeDefaultBranch.removeListener(this._set);
        RemoveDefaultBranch.removeListener(this._unset);
        BranchDeleted.removeListener(this._checkedUnset);
    }

    public get(): GitRef {
        return this._defaultBranch;
    }

    private _set = (payload: GitRef) => {
        this._defaultBranch = payload;
        this.emitChanged();
    }

    private _unset = (payload: GitRef) => {
        this._defaultBranch = null;
        this.emitChanged();
    }

    private _checkedUnset = (payload: GitRefUpdate) => {
        if (payload && this._defaultBranch &&
            localeIgnoreCaseComparer(payload.name, this._defaultBranch.name) === 0) {

            this._unset(null);
        }
    }
}
