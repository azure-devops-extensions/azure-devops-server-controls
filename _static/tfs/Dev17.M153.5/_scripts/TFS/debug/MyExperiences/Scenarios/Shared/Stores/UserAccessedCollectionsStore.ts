import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";
import { union } from "VSS/Utils/Array";
import { ignoreCaseComparer } from "VSS/Utils/String";

import { ICollectionItem } from "MyExperiences/Scenarios/Shared/Models";

export class IUserAccessedCollectionsState {
    collections: ICollectionItem[];
}

export class UserAccessedCollectionsStore extends RemoteStore {
    private _state: IUserAccessedCollectionsState;

    constructor() {
        super();
        this._state = {
            collections: []
        };
    }

    @autobind
    public onUserAccessedCollectionsLoaded(collections: ICollectionItem[]): void {
        this._state.collections = collections;
        this._loading = false;

        this.emitChanged();
    }

    @autobind
    public onMoreUserAccessedCollectionsLoaded(collections: ICollectionItem[]): void {
        this._state.collections = union<ICollectionItem>(
            this._state.collections,
            collections,
            (item1: ICollectionItem, item2: ICollectionItem) => ignoreCaseComparer(item1.id, item2.id)
        );

        this.emitChanged();
    }

    public get state(): IUserAccessedCollectionsState {
        return this._state;
    }
}
