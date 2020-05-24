import * as BranchesActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRef, GitRefUpdate} from "TFS/VersionControl/Contracts";
import {ActionAdapter} from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import {MyBranchesUpdate, RecreateBranchUpdate} from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import {CompareBranch} from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import {StaleBranchesUpdate} from "VersionControl/Scenarios/Branches/Stores/StaleBranchesStore";

export interface GitRefWithState {
    gitRef: GitRef;
    isNew?: boolean;
    isDeleted?: boolean;
}

export class BranchesKeyValueAdapater extends ActionAdapter<GitRefWithState> {
    constructor() {
        super();
        BranchesActions.InitializeMyBranches.addListener(this._onBranchesAdded);
        BranchesActions.InitializeAllBranches.addListener(this._onBranchesAdded);
        BranchesActions.InitializeStaleBranches.addListener(this._onStaleBranches);
        BranchesActions.InitializeDefaultBranch.addListener(this._onBranchesAdded);
        BranchesActions.InitializeCompareBranch.addListener(this._onCompareBranch);
        BranchesActions.InitializeFilterBranches.addListener(this._onBranchesAdded);
        BranchesActions.BranchCreated.addListener(this._onBranchesCreated);
        BranchesActions.BranchRecreated.addListener(this._onBranchesRecreated);
        BranchesActions.DeletedBranchSearch.addListener(this._onBranchesRemoved);
        BranchesActions.BranchDeleted.addListener(this._onBranchesRemoved);
        BranchesActions.LockBranch.addListener(this._onBranchesAdded);
        BranchesActions.UnLockBranch.addListener(this._onBranchesAdded);
        BranchesActions.MyBranchesChanged.addListener(this._onMyBranchesUpdate);
    }

    private _onCompareBranch = (payload: CompareBranch) => {
        this._onBranchesAdded(payload.ref);
    }

    private _onStaleBranches = (payload: StaleBranchesUpdate) => {
        this._onBranchesAdded(payload.refs);
    }

    private _onBranchesCreated = (payload: GitRefUpdate) => {
        this.itemsAdded.invoke({
            gitRef: {
                name: GitRefUtility.getFullRefNameFromBranch(payload.name),
                objectId: payload.newObjectId
            } as GitRef,
            isNew: true
        } as GitRefWithState);
    }

    private _onBranchesRecreated = (recreateBranchUpdate: RecreateBranchUpdate) => {
        this.itemsAdded.invoke({
            gitRef: {
                name: GitRefUtility.getFullRefNameFromBranch(recreateBranchUpdate.refUpdate.name),
                objectId: recreateBranchUpdate.refUpdate.newObjectId
            } as GitRef,
            isDeleted: false
        } as GitRefWithState);
    }

    private _onBranchesRemoved = (payload: GitRefUpdate) => {
        if (payload) {
            this.itemsAdded.invoke({
                gitRef: {
                    name: payload.name,
                    objectId: payload.oldObjectId
                } as GitRef,
                isDeleted: true
            } as GitRefWithState);
        }
    }

    private _onBranchesAdded = (payload: GitRef | GitRef[]) => {

        if (Array.isArray(payload)) {
            const refs: GitRefWithState[] = payload.map(gitRef => {
                return {
                    gitRef: gitRef
                } as GitRefWithState
            });
            this.itemsAdded.invoke(refs);
        }
        else {
            this.itemsAdded.invoke({
                gitRef: payload
            } as GitRefWithState);
        }
    }

    private _onMyBranchesUpdate = (payload: MyBranchesUpdate) => {
        const refs: GitRefWithState[] = payload.branchesToAdd.map(gitRef => {
            return {
                gitRef: gitRef
            } as GitRefWithState
        });
        this.itemsAdded.invoke(refs);
    }

    public dispose(): void {
        BranchesActions.InitializeMyBranches.removeListener(this._onBranchesAdded);
        BranchesActions.InitializeAllBranches.removeListener(this._onBranchesAdded);
        BranchesActions.InitializeStaleBranches.removeListener(this._onStaleBranches);
        BranchesActions.InitializeDefaultBranch.removeListener(this._onBranchesAdded);
        BranchesActions.InitializeCompareBranch.removeListener(this._onCompareBranch);
        BranchesActions.InitializeFilterBranches.removeListener(this._onBranchesAdded);
        BranchesActions.BranchCreated.removeListener(this._onBranchesCreated);
        BranchesActions.BranchRecreated.removeListener(this._onBranchesRecreated);
        BranchesActions.DeletedBranchSearch.removeListener(this._onBranchesRemoved);
        BranchesActions.BranchDeleted.removeListener(this._onBranchesRemoved);
        BranchesActions.LockBranch.removeListener(this._onBranchesAdded);
        BranchesActions.UnLockBranch.removeListener(this._onBranchesAdded);
        BranchesActions.MyBranchesChanged.removeListener(this._onMyBranchesUpdate);
        super.dispose();
    }
}

/**
 * Does a deep comparison on two refs.
 */
export function isEqual(x: GitRefWithState, y: GitRefWithState): boolean {
    return GitRefUtility.compareRefs(x.gitRef, y.gitRef) === 0
        && x.gitRef.objectId === y.gitRef.objectId
        && x.isDeleted === y.isDeleted
        && x.isNew === y.isNew
        && ((!x.gitRef.isLockedBy && !y.gitRef.isLockedBy)
        || ((x.gitRef.isLockedBy && y.gitRef.isLockedBy)
        && (x.gitRef.isLockedBy.id == y.gitRef.isLockedBy.id)));
}
