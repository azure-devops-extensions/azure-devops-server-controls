import * as VSSStore from  "VSS/Flux/Store";
import { events } from  "Search/Scripts/React/ActionsHub";

export interface ISearchResultsActionStoreState {
    item: any;
    index: any;
}

export class SearchResultsActionStore extends VSSStore.Store {
    private state: ISearchResultsActionStoreState;

    constructor() {
        super();
        this.state = {
            index: 0,
            item: {}
        }
    }

    public updateActiveItemRow(item: any, index: number, sender: any): void {
        this.state.item = item;
        this.state.index = index;
        this.emit(events.RESULTS_GRID_ACTIVE_ROW_CHANGED_EVENT, sender);
    }

    public invokeItemRow(item: any, index: number, sender: any): void {
        this.state.item = item;
        this.state.index = index;
        this.emit(events.RESULTS_GRID_ACTIVE_ROW_INVOKED_EVENT, sender);
    }

    public toggleSearchContextMenuStateForItem(item: any, index: number, sender: any): void {
        this.state.item = item;
        this.state.index = index;
        this.emit(events.TOGGLE_RESULT_ITEM_CONTEXT_MENU, sender);
    }

    public fireShowMoreEvent(sender: any): void {
        this.emit(events.SHOW_MORE_RESULTS_EVENT, sender);
    }

    public get item(): any {
        return this
            .state
            .item;
    }

    public get index(): any {
        return this
            .state
            .index;
    }
}