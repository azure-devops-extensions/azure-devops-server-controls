import * as VSSStore from "VSS/Flux/Store";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { FileContentRetrievedPayload, FileContentRetrievalFailedPayload} from "Search/Scenarios/Code/Flux/ActionsHub"
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";

export enum FileContentLoadState {
    Loading = 1,
    Success = 2,
    Failed = 3
}

export interface FileContentState {
    fileContent: _VCLegacyContracts.FileContent;

    loadState: FileContentLoadState;

    error?: any;
}

export class FileContentStore extends VSSStore.Store {
    private _state: FileContentState = {} as FileContentState;

    public get state(): FileContentState {
        return this._state;
    }

    public updateFileContent = (fileContentPayload: FileContentRetrievedPayload, presentSelectedItem: CodeResult): void => {
        if (fileContentPayload.item === presentSelectedItem) {
            this._state.fileContent = fileContentPayload.fileContent;
            this._state.loadState = FileContentLoadState.Success;
            this.emitChanged();
        }
    }

    public onFileContentLoading = (): void => {
        this._state.loadState = FileContentLoadState.Loading;
        this.emitChanged();
    }

    public reset = (): void => {
        this._state.fileContent = this._state.loadState = this._state.error = undefined;
    }

    public onLoadFailed = (payload: FileContentRetrievalFailedPayload): void => {
        this._state.fileContent = null;
        this._state.loadState = FileContentLoadState.Failed;
        this._state.error = payload.error;
        this.emitChanged();
    }
}

