import { TfvcShelveSetsStore, TfvcShelveSetsStoreState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcShelveSetsStore";
import { TfvcShelveSetsActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionsHub";
import { ShelveSetsUrlState, ShelveSetsUrlStore } from "VersionControl/Scenarios/History/TfvcHistory/Stores/ShelveSetUrlStore"

export interface ShelveSetsPageState {
    shelvesetUrlState: ShelveSetsUrlState;
    shelvesetsState: TfvcShelveSetsStoreState;
}

export class TfvcShelveSetsStoreHub {
    public tfvcListStore: TfvcShelveSetsStore;
    public shelveSetUrlStore: ShelveSetsUrlStore;

    constructor(private _actionsHub: TfvcShelveSetsActionsHub) {
        this._createTfvcListStore();
        this._createUrlStore();
    }

    public getShelveSetsPageState = (): ShelveSetsPageState => {
        return {
            shelvesetUrlState: this.shelveSetUrlStore.state,
            shelvesetsState: this.tfvcListStore.state,
        };
    };

    public getshelveSetUrlState(): ShelveSetsUrlState {
        return this.shelveSetUrlStore && this.shelveSetUrlStore.state;
    }

    public getShelveSetsState(): TfvcShelveSetsStoreState {
        return this.tfvcListStore && this.tfvcListStore.state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            if (this.tfvcListStore) {
                this._actionsHub.shelvesetsLoadStarted.removeListener(this.tfvcListStore.clearAndStartLoading);
                this._actionsHub.shelvesetsLoaded.removeListener(this.tfvcListStore.populateTfvcShelveSetsList);
                this._actionsHub.shelvesetsLoadErrorRaised.removeListener(this.tfvcListStore.failLoad);
                this._actionsHub.shelvesetsClearAllErrorsRaised.removeListener(this.tfvcListStore.clearAllErrors);
                this.tfvcListStore.dispose();
                this.tfvcListStore = null;
            }

            if (this.shelveSetUrlStore) {
                this._actionsHub.urlChanged.removeListener(this.shelveSetUrlStore.onUrlChange);
                this.shelveSetUrlStore = null;
            }

            this._actionsHub = null;
        }
    }

    private _createTfvcListStore(): void {
        this.tfvcListStore = new TfvcShelveSetsStore();
        this._actionsHub.shelvesetsLoadStarted.addListener(this.tfvcListStore.clearAndStartLoading);
        this._actionsHub.shelvesetsLoaded.addListener(this.tfvcListStore.populateTfvcShelveSetsList);
        this._actionsHub.shelvesetsLoadErrorRaised.addListener(this.tfvcListStore.failLoad);
        this._actionsHub.shelvesetsClearAllErrorsRaised.addListener(this.tfvcListStore.clearAllErrors);
    }

    private _createUrlStore(): void {
        this.shelveSetUrlStore = new ShelveSetsUrlStore();
        this._actionsHub.urlChanged.addListener(this.shelveSetUrlStore.onUrlChange);
    }
}
