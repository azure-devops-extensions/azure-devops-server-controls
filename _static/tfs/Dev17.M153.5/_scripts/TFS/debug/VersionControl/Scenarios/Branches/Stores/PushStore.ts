import {GitPush, GitRefUpdate} from "TFS/VersionControl/Contracts";
import Utils_String = require("VSS/Utils/String");

import BranchesActions = require("VersionControl/Scenarios/Branches/Actions/BranchesActions");
import { RecreateBranchUpdate } from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

export class PushKeyValueAdapater extends ActionAdapter<GitPush> {
    constructor() {
        super();
        BranchesActions.InitializePush.addListener(this._onInitializePush);
        BranchesActions.BranchRecreated.addListener(this._onRefRecreated);
    }

    private _onInitializePush = (payload: GitPush) => {
        this.itemsAdded.invoke([payload]);
    }

    private _onRefRecreated = (recreateBranchUpdate: RecreateBranchUpdate) => {
        let gitPush = {
            refUpdates: [{
                name: recreateBranchUpdate.refUpdate.name
            } as GitRefUpdate]
        } as GitPush;
        this.itemsRemoved.invoke(gitPush);
    }

    public dispose(): void {
        BranchesActions.InitializePush.removeListener(this._onInitializePush);
        BranchesActions.BranchRecreated.removeListener(this._onRefRecreated);
        super.dispose();
    }
}
