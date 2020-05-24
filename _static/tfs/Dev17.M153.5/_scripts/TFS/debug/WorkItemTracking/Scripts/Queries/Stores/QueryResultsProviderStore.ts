import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { TriageViewActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/TriageViewActionsCreator";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { format } from "VSS/Utils/String";
import * as StoreBase from "VSS/Flux/Store";
import * as Events_Document from "VSS/Events/Document";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { QueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";

/**
 * Query hierarchy data provider
 */
export interface IQueryResultsProviderDataProvider {
    /**
     * Gets the status of the store.
     *
     * @returns True if data is available.
     */
    getValue(): QueryResultsProvider;

    /**
     * Clears store data.
     *
     * @param fireChangedEvent If true, will fire store changed event. Default is false.
     */
    clear(fireChangedEvent?: boolean): void;
}

export class QueryResultsProviderStore extends StoreBase.Store implements IQueryResultsProviderDataProvider {
    private _queryResultsProvider: QueryResultsProvider;
    private _runningDocumentEntry: Events_Document.RunningDocumentsTableEntry;

    constructor(actions: ActionsHub, triageViewActions: TriageViewActionsHub) {
        super();

        triageViewActions.ProviderUpdated.addListener((queryResultsProvider) => {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYRESULTSPROVIDERSTORE_CHANGEQUERYRESULTSPROVIDER, true);
            this._unregisterRunningDocumentEntry();
            this._registerRunningDocumentEntry(queryResultsProvider);

            if (this._queryResultsProvider && queryResultsProvider && this._queryResultsProvider !== queryResultsProvider) {
                this._queryResultsProvider.dispose();
            }

            this._queryResultsProvider = queryResultsProvider;
            this.emitChanged();
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYRESULTSPROVIDERSTORE_CHANGEQUERYRESULTSPROVIDER, false);
        });

        // If the query item is updated, we need to clear the results provider so that
        // the next time the query is opened it's fetched fresh.  No need to fire any
        // events because there is no one listening to the event.
        actions.QueryItemUpdated.addListener((payload: QueryItem | QueryItem[]) => {
            this.clear(false);
        });
    }

    public getValue(): QueryResultsProvider {
        return this._queryResultsProvider;
    }

    public clear(fireChangedEvent?: boolean): void {
        this._unregisterRunningDocumentEntry();
        this._queryResultsProvider = undefined;

        if (fireChangedEvent) {
            this.emitChanged();
        }
    }

    private _registerRunningDocumentEntry(provider: QueryResultsProvider): void {
        if (!provider) {
            return;
        }

        if (!this._runningDocumentEntry) {
            this._runningDocumentEntry = Events_Document.getRunningDocumentsTable().add("QueryResultsProvider", {
                isDirty: () => provider.isDirty(),
                beginSave: (callback: () => void, errorCallback?: IErrorCallback) => {
                    if (provider.isDirty()) {
                        provider.beginSave(callback, errorCallback);
                    }
                },
                getDirtyDocumentTitles: (maxTitles: number) => maxTitles ? [format(Resources.QueryDirtyDocumentTitleFormat, provider.getTitle())] : [] as string[]
            });
        }
    }

    private _unregisterRunningDocumentEntry(): void {
        if (this._runningDocumentEntry) {
            Events_Document.getRunningDocumentsTable().remove(this._runningDocumentEntry);
            this._runningDocumentEntry = null;
        }
    }
}
