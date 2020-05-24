import * as Q from "q";
import { QueryType } from "TFS/WorkItemTracking/Contracts";
import { getDirectoryName } from "VSS/Utils/File";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IQueryData } from "WorkItemTracking/Scripts/OM/TriageViewInterfaces";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { Project, WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IQueryHierarchyItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Navigation_Services = require("VSS/Navigation/Services");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { IQueryHierarchyData } from "WorkItemTracking/Scripts/Queries/Models/Models";

const historySvc = Navigation_Services.getHistoryService();

export interface IQueryProviderCreatorData {
    store: WorkItemStore;
    projectId: string;
    queriesHubContext: IQueriesHubContext;
}

export class QueryProviderCreator {
    private _store: WorkItemStore;
    private _cancelable: Utils_Core.Cancelable;
    private _projectId: string;
    private _queriesHubContext: IQueriesHubContext;
    private _newQueryId: number;

    constructor(queryProviderCreatorData: IQueryProviderCreatorData) {
        this._store = queryProviderCreatorData.store;
        this._projectId = queryProviderCreatorData.projectId;
        this._queriesHubContext = queryProviderCreatorData.queriesHubContext;
        this._newQueryId = 1;
    }

    public beginCancelableAction(): Utils_Core.Cancelable {
        let cancelable;
        if (this._cancelable) {
            this._cancelable.cancel();
        }

        cancelable = new Utils_Core.Cancelable(this);
        this._cancelable = cancelable;

        return cancelable;
    }

    public beginGetProvider(
        path?: string,
        queryId?: string,
        queryItemData?: IQueryData,
        callback?: IFunctionPPR<QueryResultsProvider, Utils_Core.Cancelable, void>,
        parentId?: string): void {

        const cancelable = this.beginCancelableAction();
        const hasUnsavedChanges = !!this._queriesHubContext.actionsCreator.getUnsavedItemsMessage();

        let queryResultsProvider = this._queriesHubContext.stores.queryResultsProviderStore.getValue();

        // If there is already a provider for this query in the store, then use that. 
        // Note that we only want to re-use the provider if its for an existing query, not for an unsaved query.
        if (queryResultsProvider
            && (queryId && !Utils_String.isEmptyGuid(queryId) && Utils_String.equals(queryResultsProvider.getId(), queryId, true)
                || (path && Utils_String.equals(queryResultsProvider.getPath(), path, true))
                || hasUnsavedChanges)) {
            // Its the same same provider or previous provider has unsaved changes. Reuse the current one.
            if (typeof callback === "function") {
                callback.call(this, queryResultsProvider, cancelable);
            }
        } else {
            const proceedProvider = (error?: Error) => {
                // Do nothing if current action has been canceled.
                if (cancelable.canceled) {
                    return;
                }

                if (queryResultsProvider) {
                    if ($.isFunction(callback)) {
                        callback.call(this, queryResultsProvider, cancelable);
                    }
                } else {
                    const errorMessage = error ? error.message : Utils_String.format(Resources.UnableToFindQueryDefinition, (path || "").replace(/\//gi, "\\"));
                    this._queriesHubContext.navigationActionsCreator.navigateToQueriesPage(false, true);
                    // We only set the error on the directory page because we immediately redirect from the query page to the directory
                    // page when an invalid id or path is provided
                    this._queriesHubContext.actionsCreator.showErrorMessageForQueriesView(errorMessage);
                }
            };

            const getQueryDefinition = (queryDefinition: QueryDefinition | IQueryData): QueryResultsProvider => {
                return QueryResultsProvider.get(queryDefinition, { queriesHubContext: this._queriesHubContext }, null, true);
            };

            this._store.beginGetProject(
                this._projectId,
                async (project: Project) => {
                    if (queryId && Utils_String.isEmptyGuid(queryId)) {
                        const queryData: IQueryHierarchyItem = {
                            name: Resources.UntitledQuery,
                            path: null,
                            wiql: QueryDefinition.defaultNewQueryWiql(),
                            isFolder: false,
                            isPublic: false,
                            hasChildren: false,
                            id: queryId,
                            children: null,
                            queryType: null
                        };

                        try {
                            await this._queriesHubContext.actionsCreator.ensureQueryItem(parentId);

                            const parentFolder = this._queriesHubContext.stores.queryHierarchyItemStore.getItem(parentId);
                            const queryDefinition = new QueryDefinition(project, queryData);
                            queryDefinition.parentPath = parentFolder.path;
                            queryResultsProvider = getQueryDefinition(queryDefinition);

                            proceedProvider();
                        } catch (error) {
                            proceedProvider(error);
                        }
                    } else {
                        const isSpecialQueryId = QueryUtilities.isSpecialQueryId(queryId || path);
                        if ((queryId || path) && !isSpecialQueryId) {
                            const state = historySvc.getCurrentState();
                            const wasRedirect = Boolean(state.redirect);
                            if (wasRedirect) {
                                delete state.redirect;
                                historySvc.replaceHistoryPoint(ActionUrl.ACTION_QUERY, state, document.title, true);
                            }
                            Q(this._queriesHubContext.actionsCreator.ensureQueryItem(queryId || path)).done(
                                () => {
                                    const queryHierarchyItem = this._queriesHubContext.stores.queryHierarchyItemStore.getItem(queryId || path);
                                    const queryDefinition = new QueryDefinition(project, queryHierarchyItem);
                                    queryDefinition.parentPath = getDirectoryName(queryHierarchyItem.path) || queryHierarchyItem.path;
                                    queryResultsProvider = getQueryDefinition(queryDefinition);

                                    proceedProvider();
                                },
                                (error: TfsError) => {
                                    if (Number(error.status) === 404 && wasRedirect) {
                                        this._queriesHubContext.navigationActionsCreator.navigateToQueriesHub(QueryUtilities.getQueryHubDefaultAction(), false);
                                        return;
                                    }
                                    proceedProvider(error);
                                });
                        } else if (isSpecialQueryId) {
                            // Custom wiql query
                            if (queryItemData) {
                                Q(this._queriesHubContext.actionsCreator.ensureRootQueryFolders()).done(
                                    () => {
                                        const queryDefinition = new QueryDefinition(project, queryItemData);
                                        queryResultsProvider = getQueryDefinition(queryDefinition);
                                        proceedProvider();
                                    },
                                    (error: Error) => proceedProvider(error));
                            } else if (Utils_String.equals(queryId, QueryDefinition.SEARCH_RESULTS_ID, true)) {
                                Q(this._queriesHubContext.actionsCreator.ensureRootQueryFolders()).done(
                                    () => {
                                        const queryDefinition = this.createSearchQueryDefinition(path);
                                        queryResultsProvider = getQueryDefinition(queryDefinition);
                                        proceedProvider();
                                    },
                                    (error: Error) => proceedProvider(error));
                            } else {
                                // Recycle bin query
                                this._queriesHubContext.actionsCreator.beginGetAdHocQueries(project).then(
                                    (queryData: IQueryHierarchyData) => {
                                        const queryDefinition = this._queriesHubContext.actionsCreator.getAdhocQueryDefinition(Resources.RecycleBin, project, queryData);
                                        queryResultsProvider = getQueryDefinition(queryDefinition);
                                        proceedProvider();
                                    },
                                    (error: Error) => this._queriesHubContext.actionsCreator.showErrorMessageForTriageView(error.message)
                                );
                            }
                        } else if (queryItemData) {
                            const queryDefinition = new QueryDefinition(project, queryItemData);
                            queryResultsProvider = getQueryDefinition(queryDefinition);
                            proceedProvider();
                        }
                    }
                });
        }
    }

    public getNewQueryData(wiql?: string): IQueryData {
        const newQueryId: number = this._newQueryId++;
        const newQueryName = Utils_String.format(Resources.QueryEditorNewQueryNameFormat, newQueryId);

        return <IQueryData>{
            name: newQueryName,
            path: null,
            wiql: wiql || QueryDefinition.defaultNewQueryWiql(),
            isFolder: false,
            isPublic: false,
            hasChildren: false,
            id: "",
            newQueryId: newQueryId.toString(10)
        };
    }

    public createSearchQueryDefinition(path: string): IQueryData {
        return <IQueryData>{
            name: path,
            isFolder: false,
            id: QueryDefinition.SEARCH_RESULTS_ID,
            queryType: QueryType[QueryType.Flat]
        };
    }
}