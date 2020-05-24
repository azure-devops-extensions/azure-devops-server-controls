
import Store_Base = require("VSS/Flux/Store");

import Actions_Identity = require("Utilization/Scripts/Actions/IdentityActions");

export class IdentityStore extends Store_Base.RemoteStore {
    private _displayName: string;
    private _identityID: string;

    constructor() {
        super();
        Actions_Identity.StartDataFetch.addListener(this._onStartDataFetch, this);
        Actions_Identity.DataLoad.addListener(this._onLoad, this);
        Actions_Identity.DataLoadError.addListener(this.onError, this);
    }

    public getIdentity(): any {
        return { id: this._identityID, displayName: this._displayName };
    }

    protected _onStartDataFetch(identityId: string): void {
        this._displayName = identityId; // Temporarily it's OK to display the user VSID as their display name
        this._identityID = identityId;
        this._error = null;
        this.emitChanged();
    }

    protected _onLoad(payload: { displayName: string, id: string }): void {
        this._displayName = payload.displayName;
        this._identityID = payload.id;
        this.emitChanged();
    }

    protected onError(error: any): void {
        // Ignore error for our purposes
        super.onError(error);
    }
}

export var IdentityData = new IdentityStore();
