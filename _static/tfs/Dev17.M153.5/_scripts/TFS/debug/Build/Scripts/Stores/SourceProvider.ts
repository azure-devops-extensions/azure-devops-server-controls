
import Build_Actions = require("Build/Scripts/Actions/Actions");
import BuildModelsCommon = require("Build/Scripts/Constants");
import {QueryResult} from "Build/Scripts/QueryResult";
import SourceProviderManager = require("Build/Scripts/SourceProviderManager");

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

export interface ISourceProviderStoreOptions extends TFS_React.IStoreOptions {
    sourceProviderManager?: SourceProviderManager.SourceProviderManager;
}

export class SourceProviderStore extends TFS_React.Store {
    private _sourceProviderManager: SourceProviderManager.SourceProviderManager;
    private _isInitialized: boolean = false;

    constructor(options?: ISourceProviderStoreOptions) {
        super(BuildModelsCommon.StoreChangedEvents.SourceProviderStoreUpdated, options);

        Build_Actions.sourceProviderInitialized.addListener(() => {
            this._isInitialized = true;
            this.emitChanged();
        });

        this._sourceProviderManager = (options && options.sourceProviderManager) ? options.sourceProviderManager : new SourceProviderManager.SourceProviderManager(options);

        this._sourceProviderManager.waitForInitialized().then(() => {
            Build_Actions.sourceProviderInitialized.invoke(null);
        });
    }

    public getSourceProviderManager(): QueryResult<SourceProviderManager.SourceProviderManager> {
        return {
            pending: !this._isInitialized,
            result: this._sourceProviderManager
        };
    }

    public isInitialized(): boolean {
        return this._isInitialized;
    }
}

var _sourceProviderStore: SourceProviderStore = null;
export function getSourceProviderStore(options?: ISourceProviderStoreOptions): SourceProviderStore {
    if (!_sourceProviderStore) {
        _sourceProviderStore = new SourceProviderStore(options);
    }
    return _sourceProviderStore;
}
