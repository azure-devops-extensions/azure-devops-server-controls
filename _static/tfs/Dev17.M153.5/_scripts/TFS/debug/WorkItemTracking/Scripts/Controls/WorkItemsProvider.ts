import Q = require("q");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { LinkQueryMode } from "WorkItemTracking/Scripts/OM/QueryConstants";
import { QueryDefinition, QueryItem } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IEditInfo, IQueryDisplayColumn, IQueryParams, IQueryResult, IQuerySortColumn } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { IQueryData } from "WorkItemTracking/Scripts/OM/TriageViewInterfaces";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import * as WITControlsRecycleBin_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { QueryCIEvents } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import QueryTelemetryUtil = require("WorkItemTracking/Scripts/Utils/QueryTelemetry");
import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import * as Models from "WorkItemTracking/Scripts/Queries/Models/Models";
import { showDialog } from "WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog.Renderer";

const handleError = VSS.handleError;

export interface IWorkItemsProviderOptions {
    suppressGlobalFire?: boolean;
    errorCallback?: IErrorCallback;
    queriesHubContext?: IQueriesHubContext;
}

export class WorkItemsProvider {
    public static readonly EVENT_REFRESH_REQUIRED: string = "refresh-required";
    public static readonly EVENT_CHANGED: string = "changed";
    public static readonly EVENT_QUERY_PROVIDER_DIRTY_CHANGED: string = "query-provider-dirty-state-changed";

    private _dirty: boolean;
    private _version: number;
    private _events: Events_Handlers.NamedEventCollection<WorkItemsProvider, any>;

    public options: IWorkItemsProviderOptions;
    public resultsValid: boolean;
    public queryEditable: boolean;
    public bypassSoftCap: boolean;

    constructor(options?: IWorkItemsProviderOptions) {
        this.options = options || {};
    }

    public getId(): string {
        return null;
    }

    public getVersion(): number {
        return this._version;
    }

    public _incrementVersion() {
        this._version = this._version + 1;
    }

    public getTitle(): string {
        return "";
    }

    public beginGetResults(callback: IFunctionPR<IQueryResult, void>, errorCallback?: IErrorCallback) {
    }

    public isDirty(): boolean {
        return this._dirty === true;
    }

    public setDirty(dirty: boolean, suppressFire?: boolean) {
        if (this.isEditable() && this._dirty !== dirty) {
            this._dirty = dirty;

            if (!suppressFire) {
                if (!this.options.suppressGlobalFire) {
                    this._fireGlobalDirtyChanged();
                }

                this._fireEvent(WorkItemsProvider.EVENT_CHANGED, this, { change: "dirtyState" });
            }
        }
    }

    protected _fireGlobalDirtyChanged() {
        Events_Services.getService().fire(WorkItemsProvider.EVENT_QUERY_PROVIDER_DIRTY_CHANGED, this);
    }

    public isEditable() {
        return false;
    }

    public invalidateResults() {
        this.resultsValid = false;
    }

    public setColumnWidth(columnName: string, width: number) {
    }

    public setColumns(columns: IQueryDisplayColumn[]) {
    }

    public setSortColumns(sortColumns: IQuerySortColumn[]) {
    }

    public fire(eventName: string, sender: any, eventArgs: any) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        if (this._events) {
            let eventBubbleCancelled: boolean;
            this._events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    public attachEvent(eventName: string, handler: IFunctionPPR<WorkItemsProvider, any, void>) {
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, handler);
    }

    public detachEvent(eventName: string, handler: IFunctionPPR<WorkItemsProvider, any, void>) {
        if (this._events) {
            this._events.unsubscribe(eventName, handler);
        }
    }

    public clearEvents() {
        this._events = new Events_Handlers.NamedEventCollection();
    }
}

export interface IQueryResultsProviderOptions extends IWorkItemsProviderOptions {
    project?: WITOM.Project;
    skipPersistingColumnResize?: boolean;
}

export class QueryResultsProvider extends WorkItemsProvider {
    public static readonly EVENT_QUERY_RESULTS_MODEL_CHANGED: string = "query-results-model-changed";

    private static _providerCache: { [id: string]: QueryResultsProvider } = null;
    private static _specialProviders: (typeof QueryResultsProvider & { supports: (queryDefinition: QueryDefinition, options?: IQueryResultsProviderOptions) => boolean })[] = null;

    private static _createInstance(queryDefinition: QueryDefinition, options?: IQueryResultsProviderOptions): QueryResultsProvider {
        let ProviderType: typeof QueryResultsProvider;
        if (this._specialProviders) {
            $.each(this._specialProviders, (i, pt) => {
                if (pt.supports(queryDefinition)) {
                    ProviderType = pt;
                    return false;
                }
            });
        }

        if (ProviderType) {
            return new ProviderType(queryDefinition, options);
        } else {
            return new QueryResultsProvider(queryDefinition, options);
        }
    }

    public static registerSpecialProvider(providerType: typeof QueryResultsProvider & { supports: (queryDefinition: QueryDefinition, options?: IQueryResultsProviderOptions) => boolean }) {
        this._specialProviders = this._specialProviders || [];
        this._specialProviders.push(providerType);
    }

    public static get(queryDefinition: QueryDefinition | QueryItem | IQueryData, options?: IQueryResultsProviderOptions, doNotCreate?: boolean, doNotCache?: boolean): QueryResultsProvider {
        let cache = this._providerCache;
        const queryId = queryDefinition && (queryDefinition.id || queryDefinition.name);
        if (!queryId) {
            return null;
        }
        let provider = cache && cache[queryId];

        if (!provider && !doNotCreate) {
            if (!cache) {
                this._providerCache = cache = {};
            }

            provider = this._createInstance(<QueryDefinition>queryDefinition, options);
            if (!doNotCache) {
                cache[queryId] = provider;
            }
        }

        return provider;
    }

    public static invalidateQueryResults() {
        const providers = this.getCachedProviders();
        for (const provider of providers) {
            provider.resultsValid = false;
        }
    }

    public static peek(queryDefinition: QueryDefinition | QueryItem | string): QueryResultsProvider {
        if (this._providerCache) {
            if (typeof queryDefinition === "string") {
                return this._providerCache[queryDefinition];
            } else {
                return this._providerCache[queryDefinition.id || queryDefinition.name];
            }
        }

        return null;
    }

    public static remove(queryItemId: string): void {
        if (this._providerCache) {
            delete this._providerCache[queryItemId];
        }
    }

    public static getCachedProviders(): QueryResultsProvider[] {
        const result: QueryResultsProvider[] = [], cache = this._providerCache;

        if (cache) {
            $.each(cache, function (i, prov) {
                result.push(prov);
            });
        }

        return result;
    }

    public static isDirty(): boolean {
        let dirty = false;
        const cache = this._providerCache;

        if (cache) {
            $.each(cache, function (i, prov) {
                if (prov && prov.isDirty()) {
                    dirty = true;
                    return false;
                }
            });
        }

        return dirty;
    }

    /**
     * check if the given provider is a recycle bin query result provider
     * @param query work item query result provider
     * @return true if it's a recycle bin query result provider. returns false otherwise
     */
    public static isRecycleBinQueryResultsProvider(provider: WorkItemsProvider): boolean {
        return provider && (provider instanceof QueryResultsProvider) && provider.queryDefinition &&
            QueryDefinition.isRecycleBinQuery(provider.queryDefinition);
    }

    public options: IQueryResultsProviderOptions;
    public project: WITOM.Project;
    public originalQuery: string;
    public queryDefinition: QueryDefinition;
    public queryResultsModel: IQueryResult;
    public originalEditInfo: IEditInfo;
    public originalColumns: IQueryDisplayColumn[];
    public originalSortColumns: IQuerySortColumn[];
    private _workItemIdToIndices: IDictionaryNumberTo<number[]>;
    private _queriesHubContext: IQueriesHubContext;
    private _isDisposed: boolean;

    constructor(queryDefinition: QueryDefinition, options?: IQueryResultsProviderOptions) {
        super(options);

        this.options = options || {};
        this.queryEditable = true;
        this.project = (options && options.project) || queryDefinition.project;
        this.update(queryDefinition);
        this._workItemIdToIndices = {};
        this._queriesHubContext = options && options.queriesHubContext;
        this._isDisposed = false;
    }

    public getId(): string {
        return this.queryDefinition.id;
    }

    public dispose() {
        this._isDisposed = true;
    }

    public isDisposed(): boolean {
        return this._isDisposed;
    }

    public getUniqueId(): string {
        return this.queryDefinition && (this.queryDefinition.tempQueryId || this.queryDefinition.id);
    }

    public getPath(): string {
        return this.queryDefinition.storedPath;
    }

    public getTitle(): string {
        return this.queryDefinition.name;
    }

    public beginGetDescription(callback: IFunctionPR<string, void>, errorCallback?: IErrorCallback) {
        let message: string = "";
        if (QueryDefinition.isRecycleBinQuery(this.queryDefinition)) {
            const cleanUpSettingSucessCallback = (days: number) => {
                if (days > 0) {
                    message = Utils_String.format(Resources.RecyclebinCleanupMessage, days);
                }
                callback(message);
            }
            VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin"], (WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) => {
                WITControlsRecycleBin.RecycleBin.beginGetCleanUpSetting(cleanUpSettingSucessCallback);
            }, errorCallback);
        } else {
            callback(message);
        }
    }

    public isCustomQuery(): boolean {
        return this.queryDefinition &&
            this.queryDefinition.customQuery;
    }

    public isSaveable(): boolean {
        return this.isDirty()
            && this.isEditable()
            && !this.isCustomQuery();
    }

    public isEditable(): boolean {
        return !this.queryDefinition.specialQuery
            || QueryDefinition.isCustomizableSpecialQuery(this.queryDefinition);
    }

    protected _fireGlobalDirtyChanged() {
        super._fireGlobalDirtyChanged();

        if (this.options.queriesHubContext) {
            this.options.queriesHubContext.triageViewActionCreator.updateProvider(this);
        }
    }

    /**
     * Start getting query results from the provider
     * @param callback
     * @param errorCallback
     * @param runQuery If true then query needs to be ran to retrieve the results
     * @param extras
     */
    public beginGetResults(callback?: IFunctionPR<IQueryResult, void>, errorCallback?: IErrorCallback, runQuery?: boolean, extras?: IQueryParams) {
        const onError = (error: TfsError) => {
            if (this._isDisposed) {
                return;
            }

            if (this.queryResultsModel) {
                delete this.queryResultsModel.payload;
                delete this.queryResultsModel.pageColumns;
                this.queryResultsModel.sourceIds = [];
                this.queryResultsModel.targetIds = [];
                this.queryResultsModel.isLinkQuery = LinkQueryMode.isLinkQuery(this.queryResultsModel.editInfo.mode);
                this.queryResultsModel.isTreeQuery = LinkQueryMode.isTreeQuery(this.queryResultsModel.editInfo.mode);
                this.queryResultsModel.error = error;

                this._updateModel(this.queryResultsModel);
                if ($.isFunction(callback)) {
                    callback.call(this, this.queryResultsModel);
                }
            } else {
                handleError(error, errorCallback || this.options.errorCallback, this);
            }
        };

        if (this._hasResults()) {
            if ($.isFunction(callback)) {
                // Updating the model with isCached data flag to true
                callback.call(this, {
                    ...this.queryResultsModel,
                    queryRan: runQuery,
                    isCachedData: true
                });
            }
        } else {
            const fields = this.getColumns();
            const sortFields = this.getSortColumns();

            this._beginQuery(
                (queryResults: IQueryResult) => {
                    if (this._isDisposed) {
                        return;
                    }

                    QueryCIEvents.publishEvent(
                        QueryCIEvents.EVENTS_QUERY_EXECUTED, {
                            isDirty: this.isDirty(),
                            isCustomQuery: this.isCustomQuery(),
                            queryId: this.queryDefinition && this.queryDefinition.id,
                            queryTempId: this.queryDefinition && this.queryDefinition.tempQueryId,
                            queryType: this.queryDefinition && this.queryDefinition.queryType
                        });

                    this._updateModel(queryResults);
                    if ($.isFunction(callback)) {
                        callback.call(this, queryResults);
                    }

                    if (queryResults) {
                        QueryTelemetryUtil.recordBoardFieldUsageInColumns(queryResults.columns, CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_QUERY_WORK_ITEM);
                    }
                },
                onError,
                $.extend({
                    fields: fields && fields.length ? fields : undefined,
                    sortFields: sortFields && sortFields.length ? sortFields : undefined,
                    runQuery: runQuery,
                    top: this.bypassSoftCap ? -1 : null,
                    persistenceId: this.queryDefinition && this.queryDefinition.id,
                    isDirty: this.isDirty()
                }, extras));
        }
    }

    public _beginQuery(callback: IFunctionPR<IQueryResult, void>, errorCallback?: IErrorCallback, extras?: IQueryParams) {
        this.beginGetQueryText((wiql) => {
            this.project.beginQuery(wiql, callback, errorCallback, extras);
        }, errorCallback);
    }

    public wiqlUpdateNeeded(): boolean {
        return this.isDirty() || this.isCustomQuery();
    }

    public getQueryText(): IPromise<string> {
        const defer = Q.defer<string>();

        this.beginGetQueryText((wiql: string) => {
            defer.resolve(wiql);
        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    public beginGetQueryText(callback: (wiql: string) => void, errorCallback?) {
        if (this.queryResultsModel) {
            if (this.wiqlUpdateNeeded()) {

                PerfScenarioManager.addSplitTiming(
                    CustomerIntelligenceConstants.PerformanceEvents.QUERY_GETQUERYTEXT, true);
                (<Service.VssConnection>this.project.store.tfsConnection).getService<QueryAdapter>(QueryAdapter).beginGenerateWiql(this.queryResultsModel.editInfo,
                    $.map(this.queryResultsModel.columns, function (column) { return column.name; }),
                    this.queryResultsModel.sortColumns,
                    (wiql: string) => {
                        PerfScenarioManager.addSplitTiming(
                            CustomerIntelligenceConstants.PerformanceEvents.QUERY_GETQUERYTEXT, false);
                        callback(wiql);
                    },
                    errorCallback);
            } else if ($.isFunction(callback)) {
                callback.call(this, this.queryResultsModel.wiql);
            }
        } else if ($.isFunction(callback)) {
            callback.call(this, this.originalQuery);
        }
    }

    public revertEditInfo(fireEvent: boolean = true) {
        if (this.queryResultsModel) {
            this.queryResultsModel.wiql = this.originalQuery;
            this.queryResultsModel.editInfo = $.extend(true, {}, this.originalEditInfo);
            this.queryResultsModel.columns = (this.originalColumns || []).slice(0);
            this.queryResultsModel.sortColumns = (this.originalSortColumns || []).slice(0);
            this.invalidateResults();
            this._incrementVersion();
            this.setDirty(false);
            if (fireEvent) {
                this._fireEvent(QueryResultsProvider.EVENT_QUERY_RESULTS_MODEL_CHANGED);
            }
        }
    }

    public getColumns(): string[] {
        if (this.queryResultsModel) {
            return $.map(this.queryResultsModel.columns || [], function (column) {
                if (column.width >= 0) {
                    return column.name + ";" + column.width;
                }
                else {
                    return column.name;
                }
            });
        }

        return [];
    }

    public getSortColumns() {
        if (this.queryResultsModel) {
            return $.map(this.queryResultsModel.sortColumns || [], function (sortColumn) {
                return sortColumn.name + (sortColumn.descending ? ";desc" : ";asc");
            });
        }

        return [];
    }

    /**
     * Updates the given row to the result model for the corresponding workitem
     * @param workItemId ID of the work item for the corresponding row
     * @param row Payload row from query result model
     */
    public updateQueryResultModelPayloadRow(workItemId: number, row: any) {
        const indices = this.getWorkItemIndicesById(workItemId);

        if (indices.length > 0 && row) {
            this.queryResultsModel.payload.rows[indices[0]] = row;
        }
    }

    public _updateModel(model: IQueryResult, overwriteOriginalEditInfo: boolean = false) {
        if (model) {
            if (!this.originalEditInfo || overwriteOriginalEditInfo) {
                this.originalQuery = model.wiql;
                this.originalEditInfo = $.extend(true, {}, model.editInfo);
                this.originalColumns = (model.columns || []).slice(0);
                this.originalSortColumns = (model.sortColumns || []).slice(0);
            }
        } else {
            this.originalEditInfo = null;
            this.originalColumns = null;
            this.originalSortColumns = null;
        }

        this.queryResultsModel = model;
        this._buildWorkItemIdToIndices();
        this.resultsValid = true;
        this._incrementVersion();

        this._fireEvent(QueryResultsProvider.EVENT_QUERY_RESULTS_MODEL_CHANGED);
    }

    private _buildWorkItemIdToIndices() {
        this._workItemIdToIndices = {};
        if (this.queryResultsModel && this.queryResultsModel.targetIds) {
            for (let i = 0; i < this.queryResultsModel.targetIds.length; i++) {
                const id = this.queryResultsModel.targetIds[i];
                if (this._workItemIdToIndices[id]) {
                    this._workItemIdToIndices[id].push(i);
                } else {
                    this._workItemIdToIndices[id] = [i];
                }
            }
        }
    }

    /**
     * Return index in datasource for workitemId
     * 
     * @param workitemId workitemId
     */
    public getWorkItemIndicesById(workItemId: number): number[] {
        return this._workItemIdToIndices[workItemId] || [];
    }

    /**
     * Get the total number of children of as workitem
     * 
     * @param index The index of the work item in data source to get the number of children for.
     * @return 
     */
    public getDescendantCount(index: number): number {
        let count = 0;
        if (this.queryResultsModel.sourceIds) {
            const len = this.queryResultsModel.sourceIds.length;
            const parentId = this.queryResultsModel.sourceIds[index] || 0;
            index += 1;
            while (index < len) {
                const nextParentId = this.queryResultsModel.sourceIds[index] || 0;
                if (nextParentId !== parentId && nextParentId !== 0) {
                    count++;
                    index++;
                } else {
                    break;
                }
            }
        }

        return count;
    }

    /**
     * Remove the given work item id and its children from data source.
     * 
     * @param workItemId ID of the work item to remove.
     * @return true if work item id is removed.
     */
    public removeWorkItem(workItemId: number): boolean {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        const indices = this.getWorkItemIndicesById(workItemId);

        // If the work item was not found, do nothing.
        if (indices === undefined || indices.length === 0) {
            return false;
        }

        for (let i = indices.length - 1; i >= 0; i--) {
            const index = indices[i];
            const treeSize = this.getDescendantCount(index) + 1;

            // Remove the items from the datasource arrays
            this._removeAtIndex(index, treeSize);
        }

        // rebuild the mapping of workitem id to indices.
        this._buildWorkItemIdToIndices();

        return true;
    }

    /**
     * Remove data in query result model at a given index.
     */
    private _removeAtIndex(index: number, count: number) {
        if (index >= 0 && index < this.queryResultsModel.targetIds.length) {
            this.queryResultsModel.targetIds.splice(index, count);
            this.queryResultsModel.payload.rows.splice(index, count);
            if (this.queryResultsModel.sourceIds) {
                this.queryResultsModel.sourceIds.splice(index, count);
                this.queryResultsModel.linkIds.splice(index, count);
            }
        }
    }

    public update(queryDefinition: QueryDefinition, saveFailure?: TfsError, refreshLegacyHierarchy: boolean = true) {
        this.queryDefinition = queryDefinition;
        this.originalQuery = queryDefinition.queryText;

        if (this.queryResultsModel) {
            //saveFailure is undefined on a successful save so this resets the prior error value in
            //this.queryResultsModel
            this.queryResultsModel.error = saveFailure;

            if (this.queryResultsModel.error) {
                this.resultsValid = true;
                this.setDirty(true);
            } else {
                this.queryResultsModel.wiql = this.originalQuery;
                this.originalEditInfo = $.extend(true, {}, this.queryResultsModel.editInfo);
                this.originalColumns = (this.queryResultsModel.columns || []).slice(0);
                this.originalSortColumns = (this.queryResultsModel.sortColumns || []).slice(0);
                this.setDirty(queryDefinition.isDirty);
                this._fireEvent(WorkItemsProvider.EVENT_REFRESH_REQUIRED);
            }

        } else {
            this.setDirty(queryDefinition.isDirty);
        }

        this._incrementVersion();

        if (refreshLegacyHierarchy) {
            this._fireEvent(WorkItemsProvider.EVENT_CHANGED, this, { change: "queryDefinition" });
        }
    }

    public reset(queryDefinition: QueryDefinition, doNotFireRefresh?: boolean) {
        this.queryResultsModel = null;
        this._workItemIdToIndices = {};
        this.invalidateResults();
        this.update(queryDefinition);
        if (!doNotFireRefresh) {
            this._fireEvent(WorkItemsProvider.EVENT_REFRESH_REQUIRED);
        }
    }

    public getResultsCount(): number {
        return this._hasResults() ? this.queryResultsModel.targetIds.length : 0;
    }

    public setColumns(columns: IQueryDisplayColumn[]) {
        let changed: boolean;
        if (this.queryResultsModel) {
            columns = columns || [];
            const old = this.queryResultsModel.columns || [];

            if (columns.length !== old.length) {
                changed = true;
            } else {
                for (let i = 0, l = columns.length; i < l; i++) {
                    if (columns[i] !== null && Utils_String.ignoreCaseComparer(columns[i].name, old[i].name) !== 0) {
                        changed = true;
                        break;
                    }
                }
            }

            this.queryResultsModel.columns = columns;

            if (changed) {
                this._incrementVersion();
                this.setDirty(true);
                this._fireEvent(WorkItemsProvider.EVENT_CHANGED, this, { change: "columns", oldColumns: old, newColumns: columns });
            }
        }

        return changed;
    }

    public setSortColumns(sortColumns: IQuerySortColumn[]) {
        let changed;
        if (this.queryResultsModel) {
            sortColumns = sortColumns || [];
            const old = this.queryResultsModel.sortColumns || [];

            if (sortColumns.length !== old.length) {
                changed = true;
            } else {
                for (let i = 0, l = sortColumns.length; i < l; i++) {
                    if (Utils_String.ignoreCaseComparer(sortColumns[i].name, old[i].name) !== 0) {
                        changed = true;
                        break;
                    }

                    if (Boolean(sortColumns[i].descending) !== Boolean(old[i].descending)) {
                        changed = true;
                        break;
                    }
                }
            }

            this.queryResultsModel.sortColumns = sortColumns;

            if (changed) {
                this._incrementVersion();
                this.setDirty(true);
                this._fireEvent(WorkItemsProvider.EVENT_CHANGED, this, { change: "sortColumns", oldColumns: old, newColumns: sortColumns });
            }
        }

        return changed;
    }

    public setColumnWidth(columnName: string, width: number) {
        const widths = [];

        if (this.queryResultsModel && this.queryResultsModel.columns) {
            $.each(this.queryResultsModel.columns, function (i, column) {
                if (Utils_String.ignoreCaseComparer(columnName, column.name) === 0) {
                    // When a user makes his or her monitor's size greater than 100%,
                    // the "Width" value will become float. Thus, we need to change it to Integer Value.  Otherwise,
                    // front-end will set it to default value.
                    column.width = Math.ceil(width);
                }

                widths[i] = column.name + ";" + Math.ceil(column.width);
            });

            if (!this.options.skipPersistingColumnResize && this.queryDefinition && this.queryDefinition.id && !Utils_String.isEmptyGuid(this.queryDefinition.id)) {
                this.project.beginUpdateColumnOptions(this.queryDefinition.id, widths, null, this.options.errorCallback);
            }
        }

        this._incrementVersion();
    }

    public beginSave(sucessCallback?: () => void, errorCallback?: IErrorCallback) {
        const callback = () => {
            const error = this.queryResultsModel.error;
            if (error && error.message) {
                // Query provider save is 'best effort' so the system calls the 
                // completed callback even when issues exist with the save.
                VSS.handleError(error, errorCallback, this);
            } else {
                if (sucessCallback) {
                    sucessCallback();
                }
                this.queryDefinition.tempQueryId = null;

                // NQE SaveExistingQuery scenario
                PerfScenarioManager.endScenario(CustomerIntelligenceConstants.WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_SAVEEXISTINGQUERY);

                Diag.logTracePoint("QueryResultGrid.saveQuery.complete");
                QueryTelemetryUtil.recordBoardFieldUsageInQueryFilters(
                    this.queryDefinition.queryText,
                    CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_CREATE_QUERY);
            }
        };

        this.getQueryText().then((wiql: string) => {
            this.queryDefinition.setQuery(wiql);

            let queryItem = {
                wiql: this.queryDefinition.queryText,
                path: this.queryDefinition.storedPath,
                name: this.queryDefinition.name
            } as Models.QueryItem;

            // If the query is new or a search result query or a temp query or a wiql query, we need to show the save as dialog
            if (!this.queryDefinition.id
                || Utils_String.isEmptyGuid(this.queryDefinition.id)
                || QueryDefinition.isSearchResults(this.queryDefinition)
                || QueryDefinition.isCustomWiqlQuery(this.queryDefinition)) {

                // Abort SaveExistingQuery scenario as this path is for saving a new query only.
                // New query as well as SaveAs scenario will be recorded somewhere else.
                PerfScenarioManager.abortScenario(
                    CustomerIntelligenceConstants.WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_SAVEEXISTINGQUERY);

                queryItem.name = ""; // Let user enter a query name
                showDialog(this._queriesHubContext, Models.QuerySaveDialogMode.NewQuery, queryItem, this.queryDefinition.parentPath, (savedQueryItem: Models.QueryItem) => {
                    this._queriesHubContext.stores.queryResultsProviderStore.clear();
                    this._queriesHubContext.navigationActionsCreator.navigateToQueryPreservingSupportedState(savedQueryItem.id, false);
                });
            } else {
                queryItem.id = this.queryDefinition.id;
                this._queriesHubContext.actionsCreator.updateQuery(queryItem).then((queryItem: Models.QueryItem) => {
                    const newQueryDefinition = new QueryDefinition(this.project, queryItem);
                    this.update(newQueryDefinition, null, false);
                    callback();
                }, errorCallback);
            }
        }, (e) => {
            if (e) {
                VSS.handleError(e, errorCallback, this);
            }
            this.update(this.queryDefinition, e);
        });
    }

    public getWorkItemIdAtDataIndex(index: number): number {
        if (index >= 0
            && this._hasResults()
            && this.queryResultsModel.targetIds
            && this.queryResultsModel.targetIds.length > index) {
            return this.queryResultsModel.targetIds[index];
        }
    }

    private _hasResults() {
        return this.resultsValid && this.queryResultsModel;
    }
}

export class SearchResultsProvider extends QueryResultsProvider {
    public static supports(queryDefinition: QueryDefinition) {
        return QueryDefinition.isSearchResults(queryDefinition);
    }

    public searchText: string;
    public searchDone: boolean;

    constructor(queryDefinition: QueryDefinition, options?: IQueryResultsProviderOptions) {
        super(queryDefinition, options);

        this.project = queryDefinition.project;
    }

    public newSearch(searchText: string) {
        this.searchText = searchText;
        this.searchDone = false;
        this.invalidateResults();
        this._incrementVersion();
    }

    public wiqlUpdateNeeded(): boolean {
        //Allows editing Search Results query
        return true;
    }

    public getTitle(): string {
        if (this.searchText) {
            return Utils_String.format("{0}: {1}", this.queryDefinition.name, this.searchText);
        } else {
            return super.getTitle();
        }
    }

    public _beginQuery(callback: IFunctionPR<IQueryResult, void>, errorCallback?: IErrorCallback, extras?: IQueryParams) {
        if (this.searchText) {
            if (this.searchDone && this.originalQuery) {
                super._beginQuery(callback, errorCallback, extras);
            } else {
                this.project.beginSearch(this.searchText, (queryResults: IQueryResult) => {
                    this.searchDone = true;
                    if ($.isFunction(callback)) {
                        callback.call(this, queryResults);
                    }
                }, errorCallback);
            }
        } else {
            // No search performed yet, and no initial query from previous search.
            if ($.isFunction(callback)) {
                callback.call(this, { columns: [], pageColumns: [], sortColumns: [], sourceIds: [], targetIds: [] });
            }
        }
    }

    public _updateModel(model: IQueryResult) {
        super._updateModel(model, true);
    }
}

QueryResultsProvider.registerSpecialProvider(SearchResultsProvider);
