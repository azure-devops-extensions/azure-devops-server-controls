import {GitCommitRef} from "TFS/VersionControl/Contracts";
import BranchesActions = require("VersionControl/Scenarios/Branches/Actions/BranchesActions");
import Utils_String = require("VSS/Utils/String");
import {ActionAdapter} from "Presentation/Scripts/TFS/Stores/DictionaryStore";

export class CommitMetadataKeyValueAdapater extends ActionAdapter<GitCommitRef> {
    constructor() {
        super();
        BranchesActions.InitializeCommitMetaData.addListener(this._onInitializeMyBranches);
    }

    private _onInitializeMyBranches = (payload: GitCommitRef[]) => {
        this.itemsAdded.invoke(payload);
    }

    public dispose(): void {
        BranchesActions.InitializeCommitMetaData.removeListener(this._onInitializeMyBranches);
        super.dispose();
    }
}

/**
 * Does a deep comparison on two refs.
 */
export function isEqual(x: GitCommitRef, y: GitCommitRef): boolean {
    return (Utils_String.localeIgnoreCaseComparer(x.commitId, y.commitId) == 0);
}
