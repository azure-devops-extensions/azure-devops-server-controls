/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as VSSStore from "VSS/Flux/Store";
import { VCAdminActionsHub } from "VersionControl/Scenarios/VCAdmin/Actions/VCAdminActionsHub"
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes"
import { RepositoryOptionsContainerState } from "VersionControl/Scenarios/VCAdmin/Components/RepositoryOptionsContainer";

export class RepoOptionsStore extends VSSStore.Store {
    private _repoOptions: VCTypes.RepositoryOption[];
    private _loadError: Error;
    private _optionsHashtable: VCTypes.HashTable<VCTypes.RepositoryOption>;

    constructor() {
        super();
        this._repoOptions = [];
        this._optionsHashtable = {};
    }

    public onLoad(payload: VCTypes.RepositoryOption[]) {
        this._repoOptions = payload.sort((a, b) => a.category.localeCompare(b.category));

        for (const option of this._repoOptions) {
            this._optionsHashtable[option.key] = option;
        }

        this.emitChanged();
    }

    public onLoadFailed(error: Error) {
        this._loadError = error;
        this.emitChanged();
    }

    public onUpdateFailed(errorPair: VCTypes.RepoOptionUpdateError) {
        this._optionsHashtable[errorPair.optionKey].updateError = errorPair.error;
        this.emitChanged();
    }

    public getData(): RepositoryOptionsContainerState {
        return {
            loadError: this._loadError,
            optionsHashtable: this._optionsHashtable
        };
    }
}
