import * as VSSStore from "VSS/Flux/Store";
import { ErrorStateEnum } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";

export interface IncludeBranchDialogState{
    isOpen: boolean,
    errorState: ErrorStateEnum
}

export class IncludeBranchDialogDataStore extends VSSStore.Store {
    private state: IncludeBranchDialogState;

    constructor() {
        super();
        this.state = this._getInitialState();
    }

    private _getInitialState(): IncludeBranchDialogState {
        return {
            isOpen: false,
            errorState: ErrorStateEnum.None
        } as IncludeBranchDialogState;
    }

    public updateIncludeBranchDialogState(isOpen: boolean, errorState: ErrorStateEnum) {
        this.state.isOpen = isOpen;
        this.state.errorState = errorState;
        this.emitChanged();
    }

    public getIncludeBranchDialogState(): IncludeBranchDialogState {
        return this.state;
    }
}