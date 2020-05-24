import * as VSSStore from "VSS/Flux/Store";

export interface PathsLoadedPayload {
    items: IItem[];

    defaultPath: string;
}

export interface IItem {
    path: string;

    isFolder: boolean;
}

export enum ContentLoadState {
    Loading = 0,

    LoadSuccess = 1,

    LoadFailed = 2,
}

export interface PathStoreState {
    items: IItem[];

    defaultItem: IItem;

    contentLoadState: ContentLoadState;
}

export class PathStore extends VSSStore.Store {
    private _state = { items: [], contentLoadState: ContentLoadState.Loading } as PathStoreState;

    public get state(): PathStoreState {
        return this._state;
    }

    public loadPaths = (payload: PathsLoadedPayload) => {
        //ToDo: Might need optimizations here.
        const defaultItems = !!payload.defaultPath
            ? payload.items.filter(item => item.path.toLowerCase() === payload.defaultPath.toLowerCase())
            : null;

        this._state.items = payload.items;
        this._state.defaultItem = defaultItems ? (defaultItems.length ? defaultItems[0]: null): null;
        this._state.contentLoadState = ContentLoadState.LoadSuccess;
        this.emitChanged();
    }
}
