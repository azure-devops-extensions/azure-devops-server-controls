import Q = require("q");
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery";
import {CacheableQueryService} from "Analytics/Scripts/QueryCache/CacheableQueryService";
import { RefreshTimerEvents } from "Dashboards/Scripts/Common";
import * as  Events_Action from "VSS/Events/Action";

/**
 * Modern implementation of QueryCache. Use this going forward.
 */
export class WidgetsCacheableQueryService extends CacheableQueryService {
    constructor() {
        super();

        this.clearCacheOnDashboardAutoRefresh();
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
}
