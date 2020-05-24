import { autobind } from "OfficeFabric/Utilities";
import * as VSSStore from "VSS/Flux/Store";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { WikiPickerActionsHub } from "Wiki/Scenarios/Integration/WikiPicker/WikiPickerActionsHub";

export interface WikiPickerData {
    wikis: WikiV2[];
    isLoaded: boolean;
    error: Error;
}

export class WikiPickerDataStore extends VSSStore.RemoteStore {
    private _state: WikiPickerData = {} as WikiPickerData;

    constructor(
        private _actionsHub: WikiPickerActionsHub,
    ) {
        super();

        this._state = {
            wikis: null,
            isLoaded: undefined,
            error: undefined,
        };

        this._actionsHub.getAllWikisSucceeded.addListener(this.loadAllWikis);
        this._actionsHub.getAllWikisFailed.addListener(this.onError);
    }

    public get state(): WikiPickerData {
        return this._state;
    }

    public dispose(): void {
        this._actionsHub.getAllWikisSucceeded.removeListener(this.loadAllWikis);
        this._actionsHub.getAllWikisFailed.removeListener(this.onError);
    }

    @autobind
    public loadAllWikis(wikis: WikiV2[]): void {
        this._state.wikis = wikis;
        this._state.isLoaded = true;

        this.emitChanged();
    }

    @autobind
    public onError(error: Error): void {
        this._state.error = error;

        this.emitChanged();
    }
}
