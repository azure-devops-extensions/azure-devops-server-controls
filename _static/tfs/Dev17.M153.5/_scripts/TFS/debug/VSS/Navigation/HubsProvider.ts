import Diag = require("VSS/Diag");
import Contribution_Services = require("VSS/Contributions/Services");
import Q = require("q");
import Serialization = require("VSS/Serialization");
import VSS_Service = require("VSS/Service");

/**
 * Base class for hubs providers.
 */
export class HubsProvider implements IHubsProvider {

    private _containerHubPromises: IDictionaryStringTo<IPromise<IContributedHub>> = {};
    private _containerHubCommonPromise: IPromise<IContributedHub>;
    private _refreshDelegates: IDictionaryStringTo<Function> = {};
    private _variesByOwner: boolean;

    /**
     * Create a hubs provider
     *
     * @param sameAtAllLevels True if the provider's items are different based on the owner control
     */
    constructor(variesByOwner: boolean) {
        this._variesByOwner = variesByOwner;
    }

    /**
     * Get the root contributed hub for this provider
     *
     * @param context hubs provider context
     */
    protected getRootContributedHub(context: IHubsProviderContext): IContributedHub | IPromise<IContributedHub> {
        return null;
    }

    public getContainerHub(context: IHubsProviderContext): IPromise<IContributedHub> {

        this._refreshDelegates[context.contributionId] = context.refreshDelegate;

        if (this._variesByOwner && this._containerHubPromises[context.contributionId]) {
            return this._containerHubPromises[context.contributionId];
        }
        else if (!this._variesByOwner && this._containerHubCommonPromise) {
            return this._containerHubCommonPromise;
        }

        var rootHub = Q(this.getRootContributedHub(context));

        if (this._variesByOwner) {
            this._containerHubPromises[context.contributionId] = rootHub;
        }
        else {
            this._containerHubCommonPromise = rootHub;
        }

        return rootHub;
    }

    public invokeRefreshCallbacks() {

        this._containerHubPromises = {};
        this._containerHubCommonPromise = null;

        for (let id in this._refreshDelegates) {
            let refreshDelegate = this._refreshDelegates[id];
            if (refreshDelegate) {
                refreshDelegate();
            }
        }
    }

    /**
     * Get page data from a data provider contribution that is cached, optionally queueing an update of the data
     * after reading from the cache
     *
     * @param cachedDataProviderContributionId Id of the data provider which caches data in localStorage
     * @param primaryDataProviderContributionId Optional contribution id of a data provider to use if it exists. The cached data will not be used or updated if this exists.
     * @param refreshCache If true and data was read from the cache, queue up a request to update it.
     * @param contractMetadata Optional contract metadata to use when deserializing the JSON island data
     */
    public getCachedPageData<T>(cachedDataProviderContributionId: string, primaryDataProviderContributionId?: string, refreshCache: boolean = true, contractMetadata?: Serialization.ContractMetadata): T {

        let webPageDataSvc = VSS_Service.getService(Contribution_Services.WebPageDataService);
        var data = webPageDataSvc.getCachedPageData<T>(cachedDataProviderContributionId, primaryDataProviderContributionId, refreshCache, contractMetadata, () => { this.invokeRefreshCallbacks; });
        if (!data) {
            Diag.logWarning(`Hubs provider contribution data not found (${cachedDataProviderContributionId}).`);
        }
        return data;
    }

    /**
     * Always reloads provider data by queuing up a new request
     *
     * @param cachedDataProviderContributionId Id of the data provider
     * @param properties Additional properties to pass to the provider on reload as part of the context
     */
    public reloadCachedProviderData(cachedDataProviderContributionId: string, properties?: any) {

        let webPageDataSvc = VSS_Service.getService(Contribution_Services.WebPageDataService);
        webPageDataSvc.reloadCachedProviderData(cachedDataProviderContributionId, () => { this.invokeRefreshCallbacks; }, properties);
    }
}
