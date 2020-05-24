import * as BranchesActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";;
import {ActionAdapter} from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import {Action} from "VSS/Flux/Action";
import * as StoreBase from "VSS/Flux/Store";

export interface SelectionObject {
    selection: string;
    branchesStore: StoreBase.Store;
    displayFlat: boolean;
    folderExpandedAction: Action<string>;
    folderCollapsedAction: Action<string>;
}

export class TabSelectionAdapater extends ActionAdapter<SelectionObject> {
    constructor() {
        super();
        BranchesActions.TabSelection.addListener(this._onSelectionAdded)
    }

    private _onSelectionAdded = (payload: SelectionObject) => {
        this.itemsAdded.invoke(payload);
    }

    public dispose(): void {
        BranchesActions.TabSelection.removeListener(this._onSelectionAdded);
        super.dispose();
    }
}

/**
 * Compares the strings..
 */
export function isEqual(x: SelectionObject, y: SelectionObject): boolean {
    return x.selection === y.selection;
}
