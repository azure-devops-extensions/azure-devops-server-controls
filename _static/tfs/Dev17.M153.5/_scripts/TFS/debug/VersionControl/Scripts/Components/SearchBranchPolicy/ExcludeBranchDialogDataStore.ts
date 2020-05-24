import * as VSSStore from "VSS/Flux/Store";
import { ErrorStateEnum } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";

export interface ExcludeBranchDialogState{
    isOpen: boolean,
    errorState: ErrorStateEnum,
    branchToBeExcluded: string
}

export class ExcludeBranchDialogDataStore extends VSSStore.Store {
    private state: ExcludeBranchDialogState;

    constructor() {
        super();
        this.state = this._getInitialState();
    }

    private _getInitialState(): ExcludeBranchDialogState {
        return {
            isOpen: false,
            errorState: ErrorStateEnum.None
        } as ExcludeBranchDialogState;
    }

    public updateExcludeBranchDialogState(isOpen: boolean, errorState: ErrorStateEnum, branchToBeExcluded: string) {
        this.state.isOpen = isOpen;
        this.state.errorState = errorState;
        this.state.branchToBeExcluded = branchToBeExcluded;
        this.emitChanged();
    }

    public getExcludeBranchDialogState(): ExcludeBranchDialogState {
        return this.state;
    }
}