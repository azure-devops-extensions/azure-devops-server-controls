import { GitRefUpdate } from "TFS/VersionControl/Contracts";
import { TabSelection, DeletedBranchSearch } from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { SelectionObject } from "VersionControl/Scenarios/Branches/Stores/TabSelectionStore";
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

export class DeletedFilterStateAdapter extends ActionAdapter<boolean> {
    constructor() {
        super();
        DeletedBranchSearch.addListener(this._onDeletedSearch);
        TabSelection.addListener(this._onTabChange);
    }

    private _onDeletedSearch = (newBranch: GitRefUpdate) => {
        this.itemsAdded.invoke(true);
    }

    private _onTabChange = (selection: SelectionObject) => {
        this.itemsAdded.invoke(false);
    }

    public dispose(): void {
        DeletedBranchSearch.removeListener(this._onDeletedSearch);
        TabSelection.addListener(this._onTabChange);
        super.dispose();
    }
}
