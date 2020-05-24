// Copyright (c) Microsoft Corporation.  All rights reserved.

import { Store as StoreBase } from "VSS/Flux/Store";
import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import * as PATTokenActions from "ReleasePipeline/Scripts/Common/Actions/PATTokenActions";

export class PATTokenStore extends StoreBase {
    constructor() {
        super();

        this._token = Utils_String.empty;
        PATTokenActions.patTokenCreated.addListener(this._onPatTokenFetched);
    }
    
    public getToken(): string {
        return this._token;
    }    

    private _onPatTokenFetched = (token: string): void => {
        this._token = token;
        this.emitChanged();
    };

    private _token: string;
}

export var Store = new PATTokenStore();


