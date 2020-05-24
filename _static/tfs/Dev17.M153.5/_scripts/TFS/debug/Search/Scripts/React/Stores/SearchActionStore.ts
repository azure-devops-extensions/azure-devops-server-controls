import * as VSSStore from  "VSS/Flux/Store";

export interface ISearchActionState {
    excecuting: boolean
}

/**
 * This store should go away. Temporarily required for "overlay" control.
 * We should remove this store once we go all flux/react.
 */
export class SearchActionStore extends VSSStore.Store {
    public state: ISearchActionState;

    constructor() {
        super();
        this.state = {
            excecuting: false
        };
    }

    public updateSearchState(executing: boolean): void {
        this.state.excecuting = executing;
        this.emitChanged();
    }
}