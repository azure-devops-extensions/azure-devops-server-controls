import Contribution_Services = require("VSS/Contributions/Services");
import Q = require("q");
import Serialization = require("VSS/Serialization");
import VSS_Service = require("VSS/Service");

/**
 * A source that implements caching via contributions.
 */
export class CachedSource {
    private _dataProviderId: string;
    private _keyPrefix: string;
    private _wasLoaded: { [key: string]: boolean; };

    /**
     * Construct the source with a cache prefix (usually the data provider name).
     * @param dataProviderId
     * @param keyPrefix
     */
    constructor(dataProviderId: string, keyPrefix: string) {
        this._dataProviderId = dataProviderId;
        this._keyPrefix = keyPrefix;
        this._wasLoaded = {};
    }

    /**
     * Load data from the cache based on a key (but only the suffix portion of the key).
     */
    protected fromCache<T>(keySuffix: string, contractMetaData?: Serialization.ContractMetadata): T {
        if (!this._wasLoaded || this._wasLoaded[keySuffix]) {
            return null;
        }

        // mark the cache as loaded, so we only load once
        this._wasLoaded[keySuffix] = true; 

        const pageData = VSS_Service.getService(Contribution_Services.WebPageDataService).getPageData<any>(this._dataProviderId) || {};
        return <T>Serialization.ContractSerializer.deserialize(pageData[this._keyPrefix + "." + keySuffix], contractMetaData);
    }

    /**
     * Return a promise with cached data, *or* in the case where no cache data is available, return null.
     */
    protected fromCacheAsync<T>(keySuffix: string, contractMetaData?: Serialization.ContractMetadata): IPromise<T> {
        const result = this.fromCache<T>(keySuffix, contractMetaData);

        if (result !== undefined && result !== null) {
            return Q<T>(result);
        }

        return null; // no result
    }

    /**
     * Call this to tell the source to "turn off the cache" (i.e. cache data is stale so don't use it)
     */
    protected invalidateCache(): void {
        this._wasLoaded = null;
    }

    /**
     * Call this to reset what the source tracks it has already loaded from the cache.
     */
    public resetCache(): void {
        this._wasLoaded = {};
    }
}