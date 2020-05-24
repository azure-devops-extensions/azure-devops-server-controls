import { Store } from "VSS/Flux/Store";
import { ColorsDataPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";

export class ColorsDataStore extends Store {
    private _state: ColorsDataPayload = {
        colorsData: {}
    };

    public get state(): ColorsDataPayload {
        return this._state;
    }

    public colorsDataObtained = (payload: ColorsDataPayload) => {
        this._state.colorsData = payload.colorsData;
        this.emitChanged();
    }
}