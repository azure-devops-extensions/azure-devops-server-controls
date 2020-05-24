import { historyUpdated } from "Build/Scenarios/Definition/Deleted/Actions/History";
import { HistoryActionCreator } from "Build/Scenarios/Definition/Deleted/Actions/HistoryActionCreator";
import { BuildStore, getBuildStore } from "Build/Scripts/Stores/Builds";

import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";

import * as BuildContracts from "TFS/Build/Contracts";

import * as BaseStore from "VSS/Flux/Store";

import * as Utils_Array from "VSS/Utils/Array";

import { getCollectionService } from "VSS/Service";

export interface Options {
    buildStore?: BuildStore;
}

export class Store extends BaseStore.Store {
    private _buildStore: BuildStore;
    private _buildIds: number[] = [];
    private _continuationToken: string = "";
    private _definitionIds: number[] = [];
    private _filter: IBuildFilter = {};

    private _historyActionCreator: HistoryActionCreator = null;

    private _initialized: boolean = false;
    private _pendingHistoryUpdate: boolean = false;

    constructor(options?: Options) {
        super();

        this._buildStore = (options && options.buildStore) ? options.buildStore : getBuildStore();

        this._historyActionCreator = getCollectionService(HistoryActionCreator);

        historyUpdated.addListener((payload) => {
            this._filter = payload.filter;
            this._continuationToken = payload.continuationToken;

            if (this._filter && this._filter.definitions) {
                this._definitionIds = this._filter.definitions.split(",").map((id) => {
                    return parseInt(id);
                });
            }

            if (payload.append) {
                if (payload.buildIds.length > 0) {
                    this._buildIds = this._buildIds.concat(payload.buildIds);
                }
            }
            else if (!!payload.buildIds && !!this._buildIds && !Utils_Array.arrayEquals(payload.buildIds, this._buildIds)) {
                this._buildIds = payload.buildIds.slice(0);
            }

            this._initialized = true;
            this._pendingHistoryUpdate = false;

            this.emitChanged();
        });

        this._buildStore.addChangedListener(() => this.emitChanged());
    }

    public getContinuationToken(): string {
        return this._continuationToken;
    }

    public getFilter(): IBuildFilter {
        return this._filter;
    }

    public getBuilds(definitionId: number): BuildContracts.Build[] {
        // If builds aren't obtained for this new definition, trigger them, we would make sure that this store is initialized on page load
        // so to avoid unnecessary calls, trigger only if already initialized and if it's not pending
        // we handle only one definition, just one flag for pending is enough
        if (this._initialized && !this._pendingHistoryUpdate && !Utils_Array.contains(this._definitionIds, definitionId)) {
            let filter = { ...this._filter };
            filter.continuationToken = "";
            filter.definitions = definitionId.toString();

            this._pendingHistoryUpdate = true;
            this.triggerGetBuildHistory(definitionId, filter);
        }

        return this._buildStore.getBuildsById(this._buildIds);
    }

    public triggerGetBuildHistory(definitionId: number, filter: IBuildFilter) {
        this._historyActionCreator.getHistory(definitionId, filter);
    }
}
