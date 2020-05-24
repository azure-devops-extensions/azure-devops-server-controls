import Q = require("q");
import { RefreshTimerEvents } from "Dashboards/Scripts/Common";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import * as  Events_Action from "VSS/Events/Action";

/**
 * Base implementation for cached client data services.
 * Legacy Ax Data Service andmodern WidgetsCacheableQueryService derive from from it.
 */
export class QueryCache extends TfsService {
    private _cache: IDictionaryStringTo<IPromise<any>>;

    constructor() {
        super();
        this.resetCache();

        // Note: This aspect tightly couples consumption of this service to Dashboard. We may want to decouple this relation as part of cache responsabilty in future.
        this.clearCacheOnDashboardAutoRefresh();
    }

    protected getCachedData(key: string): IPromise<any> {
        return this._cache[key];
    }

    protected setCachedData(key: string, promise: IPromise<any>) {
        this._cache[key] = promise;
    }

    /**
     * On auto refresh clear the cache and get fresh data
     */
    private clearCacheOnDashboardAutoRefresh() {
        Events_Action.getService().registerActionWorker(RefreshTimerEvents.OnRefresh,
            (args: any, next: (actionArgs: any) => any) => {
                this.resetCache();

                // continue with the chain of responsibility
                if ($.isFunction(next)) {
                    next(args);
                }
            });
    }

    private resetCache(): void {
        this._cache = {};
    }
}
