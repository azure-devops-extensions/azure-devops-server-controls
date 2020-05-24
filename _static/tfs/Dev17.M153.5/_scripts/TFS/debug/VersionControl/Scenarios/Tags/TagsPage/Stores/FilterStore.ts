import * as VSSStore from "VSS/Flux/Store";

export interface FilterState {
    filterText: string;
}

export class FilterStore extends VSSStore.Store {
    public state: FilterState;

    constructor() {
        super();
        this.state = {
            filterText: ""
        }
    }

    public clearFilters = (): void => {
        this.state.filterText = "";
        this.emitChanged();
    }

    public updateFilter = (filterText: string): void => {
        this.state.filterText = filterText;
        this.emitChanged();
    }

    public getState = (): FilterState => {
        return this.state;
    }

    public dispose(): void {
        this.state = null;
    }
}