import {Action} from "VSS/Flux/Action";
import * as Store from "VSS/Flux/Store";

export interface ViewStateUpdatedPayload {
    urlState: any;
}

export var viewStateUpdated = new Action<ViewStateUpdatedPayload>();

export class BaseViewStateStore extends Store.Store {
    private _urlState: any;

    constructor(initialUrlState: any) {
        super();

        this._setUrlState(initialUrlState);

        viewStateUpdated.addListener((payload) => {
            this._setUrlState(payload.urlState);
        });
    }

    public getUrlState(): any {
        return this._urlState;
    }

    private _setUrlState(urlState: any) {
        this._urlState = urlState;
        this.emitChanged();
    }
}

var _instance: BaseViewStateStore = null;
export function getInstance(initialUrlState?: any): BaseViewStateStore {
    if (!_instance) {
        _instance = new BaseViewStateStore(initialUrlState);
    }
    return _instance;
}
