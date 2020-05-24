import * as VSSStore from  "VSS/Flux/Store";
import { events } from  "Search/Scripts/React/ActionsHub";

export interface ITfsDataStore {
    data: any;
}

export class TfsDataStore extends VSSStore.Store {
    public state: ITfsDataStore;
    constructor() {
        super();
        this.state = {
            data: {}
        };
    }

    public updateTfsData(data: any): void {
        this.state.data = data;
        this.emitChanged();
    }
}