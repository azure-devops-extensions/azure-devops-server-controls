import * as VSSStore from "VSS/Flux/Store";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { ItemChangedPayload, ResultsLoadedPayload, SortOptionChangedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";

export interface ItemContentStoreState<TItem> {
    selectedItem: TItem;
}

export class ItemContentStore<TResponse extends _SearchSharedContracts.EntitySearchResponse, TItem> extends VSSStore.Store {
    private _state = {} as ItemContentStoreState<TItem>;

    public get state(): ItemContentStoreState<TItem> {
        return this._state;
    }

    public changeActiveItem = (payload: ItemChangedPayload<TItem>): void => {
        this._state.selectedItem = payload.item;
        this.emitChanged();
    }

    public updateActiveItemOnSort = (payload: SortOptionChangedPayload<TItem>): void => {
        this._state.selectedItem = payload.sortedItems[0];
    }

    public resetActiveItem = (payload: ResultsLoadedPayload<TResponse, TItem>): void => {
        this._state.selectedItem = payload.activeItem;
        this.emitChanged();
    }
}
