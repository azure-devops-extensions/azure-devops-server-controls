import { RemoteStore } from "VSS/Flux/Store";
import { TfvcChangeListItems } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"
import { HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export type TfvcShelveSetsStoreState = TfvcChangeListItems;

export class TfvcShelveSetsStore extends RemoteStore {
    public state = {} as TfvcShelveSetsStoreState;

    public populateTfvcShelveSetsList = (payload: TfvcShelveSetsStoreState): void => {
        this._error = null;
        this._loading = false;
        this.state.tfvcHistoryItems = payload.tfvcHistoryItems;
        this.state.hasMoreUpdates = payload.hasMoreUpdates;

        this.emitChanged();
    }

    public clearAndStartLoading = (): void => {
        this._setDefaultState();
        this._loading = true;
        this.emitChanged();
    }

    public clearAllErrors = (): void => {
        this._error = null;
        this.emitChanged();
    }


    public failLoad = (error: Error): void => {
        this._error = error;
        this._loading = false;
        this.emitChanged();
    }

    public dispose(): void {
        this.state.tfvcHistoryItems = null;
    }

    private _setDefaultState(): void {
        this._error = null;
        this._loading = false;
        this.state = {
            tfvcHistoryItems: null,
            hasMoreUpdates: false, 
        } as TfvcShelveSetsStoreState;
    }
}