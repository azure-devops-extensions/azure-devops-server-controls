import * as VSSStore from  "VSS/Flux/Store";
import {
} from "Search/Scripts/React/ActionsHub"

/**urlState has the parsed URL values
 * type, lp (launch point), text, action, sortOptions, filters etc.
 */
export interface IRequestUrlState {
    urlState: any;
}

/**
 * Temporary Store. This store is used temporarily to store the request URL (especially the search text)
 * Later the request URL will reside as state distributed in entity store, SearchResultStore etc.
 *
 */
export class RequestUrlStore extends VSSStore.Store {

    private _requestUrlStoreState = {} as IRequestUrlState;

    public updateUrlState = (urlState: any): void => {
        this._requestUrlStoreState = urlState;
        this.emitChanged();
    }

    get getUrlState(): any {
        return this._requestUrlStoreState;
    }
}