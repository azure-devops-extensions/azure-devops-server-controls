import { FileLineDiffCountStore } from "VersionControl/Scripts/Stores/PullRequestReview/FileLineDiffCountStore";

import { SharedState, SharedStoresHub } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";
import { ComparePageStore } from "Wiki/Scenarios/Compare/Stores/ComparePageStore";
import { CompareActionsHub, ComparePagePayload } from "Wiki/Scenarios/Compare/CompareActionsHub";
import { ComparePageState } from "Wiki/Scenarios/Compare/Stores/ComparePageStore";

export interface AggregateState {
    sharedState: SharedState;
    comparePageState: ComparePageState;
}

export class CompareStoresHub implements IDisposable {
    public comparePageStore: ComparePageStore;
    public fileLineDiffCountStore: FileLineDiffCountStore;

    constructor(
        private _sharedStoresHub: SharedStoresHub,
        private _compareActionsHub: CompareActionsHub,
    ) {
        this.comparePageStore = this._createComparePageStore();
        this.fileLineDiffCountStore = new FileLineDiffCountStore();
    }

    private _createComparePageStore(): ComparePageStore {
        const comparePageStore = new ComparePageStore();
        this._compareActionsHub.comparePageDataLoaded.addListener(comparePageStore.onComparePageDataLoaded);
        this._compareActionsHub.compareDiffDataLoaded.addListener(comparePageStore.onCompareDiffDataLoaded);
        this._compareActionsHub.dataLoadFailed.addListener(comparePageStore.onAnyDataLoadFailed);
        this._compareActionsHub.itemDetailsLoaded.addListener(comparePageStore.onItemDetailsLoaded);
        this._compareActionsHub.fileContentLoaded.addListener(comparePageStore.onFileContentLoaded);

        return comparePageStore;
    }

    public get state(): AggregateState {
        return {
            sharedState: this._sharedStoresHub.state,
            comparePageState: this.comparePageStore.state,
        };
    }

    public dispose(): void {
        if (this.comparePageStore) {
            this._compareActionsHub.comparePageDataLoaded.removeListener(this.comparePageStore.onComparePageDataLoaded);
            this._compareActionsHub.compareDiffDataLoaded.removeListener(this.comparePageStore.onCompareDiffDataLoaded);
            this._compareActionsHub.dataLoadFailed.removeListener(this.comparePageStore.onAnyDataLoadFailed);
            this._compareActionsHub.itemDetailsLoaded.removeListener(this.comparePageStore.onItemDetailsLoaded);
            this._compareActionsHub.fileContentLoaded.removeListener(this.comparePageStore.onFileContentLoaded);
            this.comparePageStore = null;
        }
    }
}