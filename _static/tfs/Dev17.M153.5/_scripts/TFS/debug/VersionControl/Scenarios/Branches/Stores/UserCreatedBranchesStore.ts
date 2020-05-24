import * as BranchesActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { RecreateBranchUpdate } from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRef, GitRefUpdate} from "TFS/VersionControl/Contracts";
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

export class UserCreatedBranchesKeyValueAdapater extends ActionAdapter<GitRef> {
    constructor() {
        super();
        BranchesActions.InitializeCreatedBranches.addListener(this._onCreatedBranchesAdded);
        BranchesActions.BranchCreated.addListener(this._onBranchesCreated);
        BranchesActions.BranchDeleted.addListener(this._onBranchesRemoved);
        BranchesActions.BranchRecreated.addListener(this._onBranchRecreated);
    }

    private _onBranchesCreated = (payload: GitRefUpdate) => {
        this.itemsAdded.invoke({
            name: GitRefUtility.getFullRefNameFromBranch(payload.name),
            objectId: payload.newObjectId
        } as GitRef);
    }

    private _onBranchesRemoved = (payload: GitRefUpdate) => {
        this.itemsRemoved.invoke({
            name: payload.name
        } as GitRef);
    }

    private _onCreatedBranchesAdded = (payload: GitRef[]) => {
        this.itemsAdded.invoke(payload);
    }

    private _onBranchRecreated = (payload: RecreateBranchUpdate) => {
        this.itemsAdded.invoke({
            name: GitRefUtility.getFullRefNameFromBranch(payload.refUpdate.name)
        } as GitRef);
    }

    public dispose(): void {
        BranchesActions.InitializeCreatedBranches.removeListener(this._onCreatedBranchesAdded);
        BranchesActions.BranchCreated.removeListener(this._onBranchesCreated);
        BranchesActions.BranchDeleted.removeListener(this._onBranchesRemoved);
        BranchesActions.BranchRecreated.removeListener(this._onBranchRecreated);
        super.dispose();
    }
}
