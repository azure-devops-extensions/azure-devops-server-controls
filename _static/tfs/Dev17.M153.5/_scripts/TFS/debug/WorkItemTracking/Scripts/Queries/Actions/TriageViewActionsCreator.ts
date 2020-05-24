import { ITemporaryDataResponse, TemporaryDataHttpClient } from "Presentation/Scripts/TFS/TFS.Core.WebApi";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from "q";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import { EmptyGuidString } from "VSS/Utils/String";
import { QueryResultsProvider, SearchResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IQueryData } from "WorkItemTracking/Scripts/OM/TriageViewInterfaces";
import { ActionsCreator } from "WorkItemTracking/Scripts/Queries/Actions/ActionsCreator";
import { IQueryParameters, IQueryStatus, ITemporaryQueryData, TempQuery } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryProviderCreator } from "WorkItemTracking/Scripts/Queries/QueryProviderCreator";
import { ITempQueryDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/ITempQueryWiqlDataProvider";
import { IQueryHierarchyItemDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import { IWorkItemFilterData } from "WorkItemTracking/Scripts/Queries/Stores/WorkItemFilterStore";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { IWorkItemPermissionData, WorkItemPermissionDataHelper } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { createNewWorkItem } from "WorkItemTracking/SharedScripts/WorkItemDialogShim";

@registerDiagActions
export class TriageViewActionsHub {
    public QueryInResultViewUpdated = new Action();
    public WorkItemInEditViewUpdated = new Action();
    public WorkItemDirtyStatusChanged = new Action<boolean>();
    public OnCommandExecute = new Action<string>();
    public OnToggleFilter = new Action();
    public ProviderUpdated = new Action<QueryResultsProvider>();
    public OnSelectedWorkItemsChange = new Action<number[]>();
    public OnQueryStatusChanged = new Action<IQueryStatus>();
    public TempQueryWiqlAdded = new Action<TempQuery>();

    public WorkItemFilterCleared = new Action();
    public WorkItemFilterApplied = new Action<IWorkItemFilterData>();

    public WorkItemPermissionDataRetrieved = new Action<IWorkItemPermissionData>();
}

export class TriageViewActionsCreator {
    constructor(
        private _actionsHub: TriageViewActionsHub,
        private _actionsCreator: ActionsCreator,
        private _queryHierarchyItemDataProvider: IQueryHierarchyItemDataProvider,
        private _tempQueryWiqlDataProvider: ITempQueryDataProvider) {
    }

    public applyFilters(workItems: number[], filterState: FilterState) {
        this._actionsHub.WorkItemFilterApplied.invoke({
            isFiltering: Object.keys(filterState).length > 0,
            filteredWorkItemIds: workItems,
            filterState: filterState
        });
    }

    public clearFilter() {
        this._actionsHub.WorkItemFilterCleared.invoke({});
    }

    public initializeWorkItemPermissions() {
        WorkItemPermissionDataHelper.beginGetWorkItemPermissions().then((data: IWorkItemPermissionData) => {
            this._actionsHub.WorkItemPermissionDataRetrieved.invoke(data);
        });
    }

    public updateNavigatorInTriageView() {
        this._actionsHub.QueryInResultViewUpdated.invoke({});
    }

    public updateNavigatorInWorkItemEditView() {
        this._actionsHub.WorkItemInEditViewUpdated.invoke({});
    }

    public onCommandExecute(commandName: string) {
        this._actionsHub.OnCommandExecute.invoke(commandName);
    }

    public showNewWorkItemDialog(workItemTypeName: string) {
        createNewWorkItem(workItemTypeName);
    }

    public onWorkItemDirtyStatusChanged(isAnyWorkItemDirty: boolean) {
        this._actionsHub.WorkItemDirtyStatusChanged.invoke(isAnyWorkItemDirty);
    }

    public toggleFilterBar() {
        this._actionsHub.OnToggleFilter.invoke({});
    }

    public updateProvider(provider: QueryResultsProvider) {
        this._actionsHub.ProviderUpdated.invoke(provider);
    }

    public onSelectedWorkItemsChange(workItemIds: number[]) {
        this._actionsHub.OnSelectedWorkItemsChange.invoke(workItemIds);
    }

    public onQueryStatusChanged(primaryStatus: string, secondaryStatus?: string) {
        this._actionsHub.OnQueryStatusChanged.invoke({
            primaryStatus: primaryStatus,
            secondaryStatus: secondaryStatus
        });
    }

    public ensureProvider(queryProviderCreator: QueryProviderCreator, queryParameters: IQueryParameters) {
        if (queryParameters.tempQueryId) {
            this._runQueryByTempQueryId(queryProviderCreator, queryParameters.tempQueryId);
        } else if (queryParameters.newQuery) {
            if (queryParameters.parentId) {
                this._runNewQuery(queryProviderCreator, queryParameters.parentId);
            } else {
                this._actionsCreator.ensureRootQueryFolders().then(() => {
                    this._runNewQuery(queryProviderCreator, this._queryHierarchyItemDataProvider.getMyQueriesFolderItem().id);
                });
            }
        } else if (queryParameters.wiql) {
            this._runQueryByWiql(queryProviderCreator, queryParameters.wiql);
        } else if (queryParameters.id) {
            this._runQueryById(queryProviderCreator, queryParameters.id);
        } else if (queryParameters.searchText) {
            this._runQueryBySearchText(queryProviderCreator, queryParameters.searchText);
        } else if (queryParameters.path) {
            this._runQueryByPath(queryProviderCreator, queryParameters.path);
        }
    }

    private _runNewQuery(queryProviderCreator: QueryProviderCreator, parentId: string) {
        queryProviderCreator.beginGetProvider(
            null,
            EmptyGuidString,
            null,
            (provider, cancellable) => {
                this._actionsHub.ProviderUpdated.invoke(provider);
            },
            parentId);
    }

    private _runQueryById(queryProviderCreator: QueryProviderCreator, queryId: string) {
        queryProviderCreator.beginGetProvider(
            null,
            queryId,
            null,
            (provider, cancellable) => {
                provider.resultsValid = false;
                this._actionsHub.ProviderUpdated.invoke(provider);
            },
            null);
    }

    private _runQueryByPath(queryProviderCreator: QueryProviderCreator, path: string) {
        queryProviderCreator.beginGetProvider(
            path,
            null,
            null,
            (provider, cancellable) => {
                provider.resultsValid = false;
                this._actionsHub.ProviderUpdated.invoke(provider);
            },
            null);
    }

    private _runQueryByWiql(queryProviderCreator: QueryProviderCreator, wiql: string) {
        const queryData: IQueryData = this._getCustomWiqlQueryData(wiql);
        queryProviderCreator.beginGetProvider(
            null,
            QueryDefinition.CUSTOM_WIQL_QUERY_ID,
            queryData,
            (provider, cancellable) => {
                provider.queryDefinition.specialQuery = true;
                provider.queryDefinition.customQuery = true;

                this._actionsHub.ProviderUpdated.invoke(provider);
            },
            null);
    }

    private _runQueryBySearchText(queryProviderCreator: QueryProviderCreator, searchText: string) {
        const path = WITResources.SearchResults;
        const queryData: IQueryData = queryProviderCreator.createSearchQueryDefinition(path);

        queryProviderCreator.beginGetProvider(
            null,
            QueryDefinition.SEARCH_RESULTS_ID,
            queryData,
            (provider, cancellable) => {
                const searchProvider = provider as SearchResultsProvider;
                searchProvider.queryDefinition.specialQuery = true;
                if (searchProvider.searchText !== searchText) {
                    searchProvider.newSearch(searchText);
                }

                this._actionsHub.ProviderUpdated.invoke(provider);
            },
            null);
    }

    private _runQueryByTempQueryId(queryProviderCreator: QueryProviderCreator, tempQueryId: string) {
        this._getTempQueryData(queryProviderCreator, tempQueryId).then((tempQueryData: ITemporaryQueryData) => {
            const queryData: IQueryData = this._getCustomWiqlQueryData(tempQueryData.queryText);
            queryData.queryType = tempQueryData.queryType;
            queryProviderCreator.beginGetProvider(
                null,
                QueryDefinition.CUSTOM_WIQL_QUERY_ID,
                queryData,
                (provider, cancellable) => {
                    provider.queryDefinition.specialQuery = true;
                    provider.queryDefinition.customQuery = true;
                    provider.queryDefinition.tempQueryId = tempQueryId;
                    this._actionsHub.ProviderUpdated.invoke(provider);
                },
                null);
        });
    }

    private _getTempQueryData(queryProviderCreator: QueryProviderCreator, tempQueryId: string): IPromise<ITemporaryQueryData> {
        const deferred = Q.defer<ITemporaryQueryData>();
        const tempData = this._tempQueryWiqlDataProvider.getQueryDataForTempId(tempQueryId);
        if (tempData) {
            deferred.resolve(tempData);
        } else {
            const httpClient = ProjectCollection.getConnection(TfsContext.getDefault()).getHttpClient<TemporaryDataHttpClient>(TemporaryDataHttpClient);
            httpClient.beginGetTemporaryData(tempQueryId).then(
                (response: ITemporaryDataResponse) => {
                    const tempQueryData: ITemporaryQueryData = {
                        queryText: response.value.queryText,
                        queryType: response.value.queryType
                    };
                    this._actionsHub.TempQueryWiqlAdded.invoke({ tempId: tempQueryId, wiql: tempQueryData.queryText, queryType: tempQueryData.queryType });
                    deferred.resolve(tempQueryData);
                },
                (error: Error) => {
                    this._actionsCreator.showErrorMessageForTriageView(WITResources.CopyQueryURLNotFoundException);
                });
        }

        return deferred.promise;
    }

    private _getCustomWiqlQueryData(wiql: string): IQueryData {
        return {
            hasChildren: false,
            id: QueryDefinition.CUSTOM_WIQL_QUERY_ID,
            isFolder: false,
            isPublic: false,
            name: WITResources.AdhocQueryDefaultName,
            path: null,
            wiql: wiql
        } as IQueryData;
    }
}
