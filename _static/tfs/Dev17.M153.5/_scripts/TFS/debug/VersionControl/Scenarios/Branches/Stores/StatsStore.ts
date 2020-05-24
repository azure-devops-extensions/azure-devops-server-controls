import {GitBranchStats} from "TFS/VersionControl/Contracts";
import BranchesActions = require("VersionControl/Scenarios/Branches/Actions/BranchesActions");
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

export interface AheadBehindCount {
    name: string;
    ahead: number;
    behind: number;
    isDefault?: boolean;
    isPending?: boolean;
    errorMessage?: string;
}

export class StatsKeyValueAdapter extends ActionAdapter<GitBranchStats> {
    constructor() {
        super();
        BranchesActions.AddBranchStats.addListener(this._onAddBranchStats);
        BranchesActions.RemoveAllBranchStats.addListener(this._onRemoveAllBranchStats);
    }

    public _onAddBranchStats = (stats: GitBranchStats[]) => {
        this.itemsAdded.invoke(stats);
    }

    public _onRemoveAllBranchStats = (str: string) => {
        this.clearItems.invoke(str);
    }

    public dispose(): void {
        BranchesActions.AddBranchStats.removeListener(this._onAddBranchStats);
        BranchesActions.RemoveAllBranchStats.removeListener(this._onRemoveAllBranchStats);
        super.dispose();
    }
}
