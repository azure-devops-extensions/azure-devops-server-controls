import Ajax = require("VSS/Ajax");
import Context = require("VSS/Context");
import Service = require("VSS/Service");

export interface Statistic {
    name: string;
    id: string;
    parentId?: string;
}

export interface ActivityStatistic extends Statistic {
    actionDate: string;
    status?: number;
}

export interface ActivtyStatsCollectionAllowedCallback {
    (): boolean;
}

export class ActivityStatsCollector implements Service.ILocalService{
    public static ACTIVITY_COLLECTION_STATUS = "TFS.ActivityCollectionStatus";
    public static ACTIVITY_ID_STORAGE_ITEM = "TFS.ActivityIdStats";
    public static CURRENT_PAGE = "TFS.CurrentPageActivity";

    private _activtyIdHeader = "ActivityId";

    private _progressPendingActions: IDictionaryNumberTo<string> = null;
    private _progressPendingActionsNewId = 0;
    private _activtyStatsCollectionAllowedCallbacks: ActivtyStatsCollectionAllowedCallback[];

    /**
     * Global handler for logging activity data
     */
    constructor() {
        this._progressPendingActions = {};
        this._activtyStatsCollectionAllowedCallbacks = [];
    }

    public initialize(): void {
    }

    public addActivtyStatsCollectionAllowedCallback(callback: ActivtyStatsCollectionAllowedCallback): void {
        this._activtyStatsCollectionAllowedCallbacks.push(callback);
    }

    public actionStarted(name: string): number {
        if (!this.isCollectingStats()) {
            return -1;
        }
        var id = ++this._progressPendingActionsNewId;
        this._progressPendingActions[id] = name;
        return id;
    }

    public actionCompleted(id: number, jqXHR: JQueryXHR): void {
        var currentTopLevelPage: ActivityStatistic = null
        if (id > -1 && this._allowStatsCollection() && this.isCollectingStats()) {
            // get the name        
            var activityName: string = this._progressPendingActions[id];
            if (activityName) {
                // delete the pending action
                delete this._progressPendingActions[id];

                // store the activity id in local storage
                try {
                    var activityId = jqXHR.getResponseHeader(this._activtyIdHeader);

                    //If Activity Id exists, store it
                    if (activityId) {
                        // do not store results for /_apis/Stats/Activities
                        if (activityName.toLowerCase().indexOf("/_apis/stats/activities") === -1) {
                            currentTopLevelPage = this.getCurrentPage();
                            var stat: ActivityStatistic = {
                                actionDate: (new Date()).toUTCString(),
                                name: activityName,
                                id: activityId,
                                status: jqXHR.status,
                                parentId: currentTopLevelPage ? currentTopLevelPage.id : null
                            }

                            // save new stat
                            this._saveActivity(stat);
                        }
                    }
                } catch (error) {
                    this.clearStats();
                }
            }
        }
    }

    public logActivity(activityId: string, page: string): void {
        try {
            if (this._allowStatsCollection() && page && page.toLowerCase().indexOf("_statistics") === -1) {
                var stat: ActivityStatistic = {
                    actionDate: (new Date()).toUTCString(),
                    name: page,
                    id: activityId
                }

                this._saveActivity(stat, true);
            }
        } catch (error) {
            this.clearStats();
        }
    }

    public getActivityStatistics(): ActivityStatistic[] {
        try {
            var stats: string = window.localStorage.getItem(ActivityStatsCollector.ACTIVITY_ID_STORAGE_ITEM);
            if (stats) {
                return JSON.parse(stats);
            } else {
                return [];
            }
        } catch (error) {
            return [];
        }
    }

    public clearStats() {
        try {
            window.localStorage.removeItem(ActivityStatsCollector.ACTIVITY_ID_STORAGE_ITEM);
            window.localStorage.removeItem(ActivityStatsCollector.CURRENT_PAGE);
        } catch (error) {
            // eat error;
        }
    }

    public collectStats(shouldCollect: boolean): void {
        try {
            window.localStorage.setItem(ActivityStatsCollector.ACTIVITY_COLLECTION_STATUS, shouldCollect.toString());
        } catch (error) {
            //ignore
        }
    }

    public getCurrentPage(): ActivityStatistic {
        try {
            var currentPage = window.localStorage.getItem(ActivityStatsCollector.CURRENT_PAGE);
            if (currentPage) {
                return JSON.parse(currentPage);
            }
        } catch (error) {
            //ignore
        }
        return null;
    }

    public setCurrentPage(currentPage: ActivityStatistic): void {
        try {
            window.localStorage.setItem(ActivityStatsCollector.CURRENT_PAGE, JSON.stringify(currentPage));
        } catch (error) {
            //ignore
        }
    }

    public isCollectingStats(): boolean {
        try {
            var collectionState: string = window.localStorage.getItem(ActivityStatsCollector.ACTIVITY_COLLECTION_STATUS);
            if (!collectionState) {
                return false;
            } else {
                collectionState = collectionState.toLowerCase();
                if (collectionState === 'true') {
                    return true;
                } else if (collectionState === 'false') {
                    return false;
                } else {
                    window.localStorage.removeItem(ActivityStatsCollector.ACTIVITY_COLLECTION_STATUS);
                    return false;
                }
            }
        } catch (error) {
            return false;
        }
    }

    private _saveActivity(stat: ActivityStatistic, isCurrentPage?: boolean): void {
        if (this.isCollectingStats() && this._allowStatsCollection()) {
            // look up existing stats 
            var stats = this.getActivityStatistics();

            // add new stat
            stats.push(stat);

            // store array
            window.localStorage.setItem(ActivityStatsCollector.ACTIVITY_ID_STORAGE_ITEM, JSON.stringify(stats));

            if (isCurrentPage) {
                this.setCurrentPage(stat);
            }
        }
    }

    private _allowStatsCollection(): boolean {
        var allowCollection = true;
        var i: number;

        for (i = 0; i < this._activtyStatsCollectionAllowedCallbacks.length; i++) {
            allowCollection = allowCollection && this._activtyStatsCollectionAllowedCallbacks[i]();
        }

        return allowCollection;
    }
}

// ActivityStats service entries //
function initializeActivityData(): void {
    var pageContext = Context.getPageContext();
    if (pageContext && pageContext.diagnostics.allowStatsCollection && pageContext.diagnostics.activityId) {
        Service.getLocalService(ActivityStatsCollector).logActivity(pageContext.diagnostics.activityId, window.location.href);
    }
}

initializeActivityData();

Service.getLocalService(ActivityStatsCollector).addActivtyStatsCollectionAllowedCallback(() => {
    var pageContext = Context.getPageContext();
    return !!(pageContext && pageContext.diagnostics.allowStatsCollection);
});

var httpClientActivityIdsByRequest: IDictionaryNumberTo<number> = {};
var defaultPageContext = Context.getPageContext();

if (defaultPageContext && defaultPageContext.diagnostics.allowStatsCollection) {
    Ajax.addGlobalListener({
        beforeRequest: (requestId: number, requestUrl: string, ajaxOptions: JQueryAjaxSettings) => {
            var actionId = Service.getLocalService(ActivityStatsCollector).actionStarted(requestUrl);
            httpClientActivityIdsByRequest[requestId] = actionId;
        },
        responseReceived: (requestId: number, data: any, textStatus: string, jqXHR: JQueryXHR) => {
            Service.getLocalService(ActivityStatsCollector).actionCompleted(httpClientActivityIdsByRequest[requestId], jqXHR);
            delete httpClientActivityIdsByRequest[requestId];

        }
    });
}
