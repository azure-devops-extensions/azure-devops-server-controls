import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { Store } from "VSS/Flux/Store";
import { SortOptionChangedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";

export interface SortOptionsStoreState {
    sortOption: _SearchSharedContracts.EntitySortOption;

    isVisible: boolean;
}

export class SortOptionsStore<TItem> extends Store {
    protected _state: SortOptionsStoreState = {} as SortOptionsStoreState;

    public get state(): SortOptionsStoreState {
        return this._state;
    }

    public changeSortOption = (payload: SortOptionChangedPayload<TItem>) => {
        const { sortOption } = payload;

        this._state.sortOption = sortOption;
        this.emitChanged();
    }

    public changeSortOptionVisibility = (isVisible: boolean) => {
        this._state.isVisible = isVisible;
        this.emitChanged();
    }
}