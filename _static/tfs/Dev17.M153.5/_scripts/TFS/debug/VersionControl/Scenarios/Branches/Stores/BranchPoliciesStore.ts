import * as BranchesActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import { GitRefPolicyScope } from "VersionControl/Scenarios/Shared/Policy/GitRefPolicyScope";

export class BranchPoliciesKeyValueAdapater extends ActionAdapter<GitRefPolicyScope> {
    constructor() {
        super();
        BranchesActions.InitializeBranchPolicies.addListener(this._onBranchPoliciesAdded);
    }

    private _onBranchPoliciesAdded = (payload: GitRefPolicyScope[]) => {
        this.itemsAdded.invoke(payload);
    }

    public dispose(): void {
        BranchesActions.InitializeBranchPolicies.removeListener(this._onBranchPoliciesAdded);
        super.dispose();
    }
}
