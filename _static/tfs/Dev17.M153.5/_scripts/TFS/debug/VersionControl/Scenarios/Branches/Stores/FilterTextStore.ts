import {SetFilter}  from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

export class FilterTextAdapter extends ActionAdapter<string> {
    constructor() {
        super();
        SetFilter.addListener(this._onSetFilter);
    }

    private _onSetFilter = (payload: string) => {
        this.itemsAdded.invoke(payload);
    }

    public dispose(): void {
        SetFilter.removeListener(this._onSetFilter);
        super.dispose();
    }
}
