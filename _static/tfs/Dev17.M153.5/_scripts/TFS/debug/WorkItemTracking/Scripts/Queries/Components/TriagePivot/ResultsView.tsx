import "VSS/LoaderPlugins/Css!Queries/Components/TriagePivot/ResultsView";

import * as React from "react";
import * as Q from "q";
import TriageView = require("WorkItemTracking/Scripts/Controls/TriageView");
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { Enhancement } from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { QueryPivotView, IQueryPivotViewProps } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/QueryPivotView";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { IQueryParamsExtras, IQueryContext } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import * as Utils_Core from "VSS/Utils/Core";
import { publishErrorToTelemetry } from "VSS/Error";
import { getErrorMessage } from "VSS/VSS";
import { getLocalService } from "VSS/Service";
import { EventService } from "VSS/Events/Services";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TemporaryDataHttpClient, ITemporaryDataResponse } from "Presentation/Scripts/TFS/TFS.Core.WebApi";
import { WorkItemPaneMode } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemsNavigator } from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { QueryResultGrid } from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { PerformanceEvents, WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { IDeleteEventArguments } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import { autobind } from "OfficeFabric/Utilities";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { getFileName } from "VSS/Utils/File";
import { FilterShortcutGroup } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/FilterShortcutGroup";
import { LearningBubbleManager } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/LearningBubbleManager";

export interface IResultsViewProps extends IQueryPivotViewProps {
    workItemPaneMode: string;
    workItemsNavigator: WorkItemsNavigator;
    isVSOpen: boolean;
    workItemId: string;
    queryContextId: string;
    filterState?: FilterState;
}

export interface IQueryResultViewCommandArgs {
    queryResultsGrid: QueryResultGrid;
    queryDefinition: QueryDefinition;
    queriesHubContext: IQueriesHubContext;
}

export class ResultsView extends QueryPivotView<IResultsViewProps, IQueryResultViewCommandArgs> {
    private _triageView: TriageView;
    private _filterShortcut: FilterShortcutGroup;
    private _runQueryWithProviderCompleted: boolean;
    private _learningBubbleManager = new LearningBubbleManager();

    constructor(props: IResultsViewProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);

        this._contentContainerClass = "query-results-view-container";
    }

    public componentWillMount() {
        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_QUERYRESULTSPIVOT_COMPONENT_MOUNT, true);
    }

    public componentDidMount() {
        super.componentDidMount();

        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_QUERYRESULTSPIVOT_COMPONENT_MOUNT, false);

        this._triageView = Enhancement.enhance(TriageView, this._getTriageViewElement(), {
            tfsContext: this._tfsContext,
            workItemsNavigator: this.props.workItemsNavigator,
            queriesHubContext: this.context,
            initialSelectedWorkItemId: this.props.workItemsNavigator.getSelectedWorkItemId(),
            initialFilterState: this.props.filterState
        }) as TriageView;
        this._triageView.getElement().find(".splitter .leftPane").attr("role", "main").attr("aria-label", Resources.QueryResultsGridRoleTitle);
        this._triageView.getElement().find(".splitter .rightPane").attr("role", "form").attr("aria-label", Resources.WorkItemDetailsRoleTitle);

        this._attachEvents();

        this._attachFilterShortcut();

        this._refreshView(this.props, false);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        this._detachEvents();
        this._detachFilterShortcut();

        if (this._triageView) {
            this._triageView.dispose();
        }

        this._triageView = null;
    }

    protected getQueriesViewContent(): JSX.Element {
        return <div className="triage-view" style={{ display: "none" }}>
            <div className="splitter right-fix content horizontal">
                <div className="leftPane">
                    <div className="toolbar filter-bar"></div>
                    <div className="query-result-grid work-item-list"></div>
                </div>
                <div className="handleBar"></div>
                <div className="rightPane hub-no-content-gutter"></div>
            </div>
        </div>;
    }

    protected onPivotSelected(props: IResultsViewProps): void {
        this._attachEvents();
        this._attachFilterShortcut();
        this._refreshView(props, true);
    }

    protected onPivotDeselected(props: IResultsViewProps): void {
        this._detachEvents();
        this._detachFilterShortcut();
    }

    protected onQueryChanged(props: IResultsViewProps): void {
        this._refreshView(props, true);
    }

    protected onReceiveNewProps(props: IResultsViewProps): void {
        // if nextProps.workItemPaneMode is null, we should ignore it
        if (this._triageView && props && props.workItemPaneMode
            && props.workItemPaneMode !== this.props.workItemPaneMode) {
            this._triageView.showWorkItemPane(props.workItemPaneMode, true);
        }
    }

    private _attachEvents(): void {
        // Triage view
        this.context.triageViewActions.OnToggleFilter.addListener(this._onToggleFilter);
        if (this._triageView) {
            this._triageView.attachNavigatorEvents();
            this._triageView.attachWorkItemSelectionEvents();
            this.props.workItemsNavigator.attachEvent(WorkItemsNavigator.EVENT_NAVIGATE_INDEX_CHANGED, this._onGridSelectedWorkItemChanged);
            this._triageView.getResultsGrid()._bind("dirty-status-changed", this._onGridDirtyStatusChanged);
            this._triageView.getResultsGrid()._bind("statusUpdate", this.onQueryStatusChanged);

            // Events for query results perf scenario
            this._runQueryWithProviderCompleted = false;
            this._triageView.getResultsGrid()._bind("queryResultsRendered", this._onQueryResultsRendered);
        }

        // Recycle bins
        const eventService = getLocalService(EventService);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED_TEXT_ONLY, this._deleteItemEventErrorDelegate);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemSuccessEventDelegate);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemEventStartDelegate);
        eventService.attachEvent(RecycleBinConstants.EVENT_RESTORE_STARTED, this._deleteItemEventStartDelegate);
        eventService.attachEvent(RecycleBinConstants.EVENT_DESTROY_STARTED, this._deleteItemEventStartDelegate);
    }

    private _detachEvents(): void {
        // Triage view
        this.context.triageViewActions.OnToggleFilter.removeListener(this._onToggleFilter);
        if (this._triageView) {
            this._triageView.detachNavigatorEvents();
            this._triageView.detachWorkItemSelectionEvents();
            this._triageView.getResultsGrid()._unbind("dirty-status-changed", this._onGridDirtyStatusChanged);
            this.props.workItemsNavigator.detachEvent(WorkItemsNavigator.EVENT_NAVIGATE_INDEX_CHANGED, this._onGridSelectedWorkItemChanged);
            this._triageView.getResultsGrid()._unbind("statusUpdate", this.onQueryStatusChanged);
            this._triageView.getResultsGrid()._unbind("queryResultsRendered", this._onQueryResultsRendered);
        }

        // Recycle bins
        const eventService = getLocalService(EventService);
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED_TEXT_ONLY, this._deleteItemEventErrorDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemSuccessEventDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemEventStartDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_RESTORE_STARTED, this._deleteItemEventStartDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_DESTROY_STARTED, this._deleteItemEventStartDelegate);
    }

    private _onQueryResultsRendered = () => {
        // Now we are ending the QueryResults scenario on where it should be ended: the queries hub results view.
        //
        // To make sure we end scenario when the grid is interactive
        // and because of the fact that the rendering of QueryResultsGrid is async,
        // we need a flag to indicate whether the query is ran successfully before trying to end the scenario.
        if (this._runQueryWithProviderCompleted) {
            PerfScenarioManager.endScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS);

            // Unbind event immediately once it's triggered.
            this._triageView.getResultsGrid()._unbind("queryResultsRendered", this._onQueryResultsRendered);
        }

        this._learningBubbleManager.showQueryLearningBubble();
    }

    private _attachFilterShortcut(): void {
        if (!this._filterShortcut) {
            this._filterShortcut = new FilterShortcutGroup(Resources.KeyboardShortcutGroup_Queries, this._triageView);
        }
    }

    private _detachFilterShortcut(): void {
        if (this._filterShortcut) {
            this._filterShortcut.dispose();
            this._filterShortcut = null;
        }
    }

    /**
     * Refreshes query results grid
     *
     * @param props IResultsViewProps data
     * @param delay True to put entire refresh on a 0 second delay. Only do this when the pivot is about to change its rendering size (e.g. switching pivot).
     */
    private _refreshView(props: IResultsViewProps, delay: boolean): void {
        const action = () => {
            // since this is called via a delay, it's possible it was already disposed
            if (this._triageView) {
                this._triageView.showElement();
                if (props.isVSOpen) {
                    this._handleVSOpen(props.workItemId, props.queryId, props.queryContextId, props.workItemsNavigator, props.workItemPaneMode);
                } else if (props.queryProvider) {
                    this._runQueryWithProvider(props.queryProvider, Resources.QueryingStatusText, this._focusWorkItemQueryResultGrid);
                }

                // no code path that calls _refreshView should have come from a user
                // changing the work item pane mode.
                this._triageView.showWorkItemPane(this.props.workItemPaneMode, false);
            }
        };

        this.executeDelayableAction(action, delay);
    }

    private _deleteItemEventErrorDelegate = (message: string) => {
        this.context.actionsCreator.showErrorMessageForTriageView(message);
    }

    private _deleteItemEventStartDelegate = (startedArguments: IDeleteEventArguments) => {
        if (startedArguments) {
            const workItemIds = startedArguments.workItemIds;
            // If we have valid work items to delete, and the delete operation has not come from the WIT Form, immediately update the view
            if ((workItemIds && workItemIds.length > 0) && !startedArguments.deleteFromForm && this._triageView && this._triageView.getResultsGrid()) {
                this._triageView.getResultsGrid().removeWorkItems(workItemIds);
            }
        }
    }

    private _deleteItemSuccessEventDelegate = (sender?: any, succeededArguments?: IDeleteEventArguments) => {
        if (succeededArguments) {
            const workItemIds = succeededArguments.workItemIds;
            // If we have a valid work item to delete, and there is only one because the delete operation must come from the WIT Form, update the view on success
            if ((workItemIds && workItemIds.length === 1) && succeededArguments.deleteFromForm && this._triageView && this._triageView.getResultsGrid()) {
                this._triageView.getResultsGrid().removeWorkItems(workItemIds);
            }
        }
    }

    private _onGridSelectedWorkItemChanged = () => {
        this.context.triageViewActionCreator.onSelectedWorkItemsChange(this._triageView.getResultsGrid().getSelectedWorkItemIds());
    }

    private _onGridDirtyStatusChanged = () => {
        const isAnyWorkItemDirty = (this._triageView && this._triageView.getResultsGrid()) ? this._triageView.getResultsGrid().isDirty(true) : false;
        this.context.triageViewActionCreator.onWorkItemDirtyStatusChanged(isAnyWorkItemDirty);
    }

    private _getTriageViewElement(): JQuery {
        return this._getContentContainerElement().find(".triage-view");
    }

    private _runQueryWithProvider(provider: QueryResultsProvider, busyText: string, successCallback?: Function, errorCallback?: Function, extras?: IQueryParamsExtras, keepWindowTitle?: boolean) {
        this._triageView.setProvider(provider, () => {
            this._runQueryWithProviderCompleted = true;
            if ($.isFunction(successCallback)) {
                successCallback();
            }
        }, (error) => {
            if ($.isFunction(errorCallback)) {
                errorCallback();
            }
            // Error here happens only when the wiql is totally invalid like wiql=foo for all other scenarios we will have queryresultmodel
            // in this case we cannot render anything in triage view, so redirecting to  directory page

            this.context.navigationActionsCreator.navigateToQueriesPage(false, true);
            this.context.actionsCreator.showErrorMessageForQueriesView((error.serverError || error).message);
        }, $.extend({ statusText: busyText, keepSelection: true }, extras));
    }

    @autobind
    private _focusWorkItemQueryResultGrid() {
        this.executeDelayableAction(() => {
            if (this._triageView && this._triageView.getElement().is(":visible")) {
                this._triageView.getResultsGrid().focus();
            }
        }, true);
    }

    protected getCommandArgs(): IQueryResultViewCommandArgs {
        return {
            queryResultsGrid: this._triageView ? this._triageView.getResultsGrid() : null,
            queryDefinition: this.props.queryProvider && this.props.queryProvider.queryDefinition,
            queriesHubContext: this.context
        };
    }

    private _onToggleFilter = () => {
        if (this._triageView) {
            this._triageView.toggleFilter();
        }
    }

    private _handleVSOpen(workItemId: string, queryId: string, context: string, workItemsNavigator: WorkItemsNavigator, workItemPaneMode: string) {
        const replaceHistoryPointForWorkItem = () => {
            this.context.navigationActionsCreator.navigateToView(ActionUrl.ACTION_EDIT, false, { id: workItemId }, true);
        };

        if (Utils_String.isGuid(context) || Utils_String.isGuid(queryId)) {
            const originalInitialSelectionSetting: boolean = this._triageView.getResultsGrid().getInitialSelectionSetting();

            // When we
            // a) fail to run the query provided due to any reason, or
            // b) we ran the query successfully and the given work item id is not in the query result (work item(s) might have
            //    changed since the query was last run in VS)
            // we don't want to show the up/down and 'back to query' button. In addition, if the an existing query item was
            // dirtied (because it was dirty in VS), we want to undo this change.
            const hideQueryResults = (provider?: QueryResultsProvider) => {
                this._triageView.getResultsGrid().setInitialSelectionSetting(originalInitialSelectionSetting);

                if (provider && provider instanceof QueryResultsProvider) {
                    // Ensure any modification to the query item is reset
                    provider.revertEditInfo();
                }

                workItemsNavigator.setProvider(null);
                replaceHistoryPointForWorkItem();
            };

            const errorCallback: IErrorCallback = (error: Error) => {
                hideQueryResults();
            };

            const successCallback = (provider: QueryResultsProvider) => {
                const id: number = parseInt(workItemId, 10);
                if (provider.getWorkItemIndicesById(id).length === 0) {
                    hideQueryResults(provider);
                } else {
                    this._triageView.getResultsGrid().setInitialSelectionSetting(originalInitialSelectionSetting);
                    this._triageView.getResultsGrid().setSelectedWorkItemId(id);

                    const queryPath: string = provider.queryDefinition.path();
                    document.title = getFileName(queryPath);
                    // when existing query - change to query action.
                    if (!Utils_String.isGuid(context)) {
                        this.context.navigationActionsCreator.navigateToView(ActionUrl.ACTION_QUERY, false, { id: provider.queryDefinition.id, newQuery: provider.queryDefinition.newQueryId }, true);
                    }

                    if (workItemPaneMode === WorkItemPaneMode.Off) {
                        // show the pane but do not persist the setting.
                        this._triageView.showWorkItemPane(WorkItemPaneMode.Right, false);
                    }
                }
            };

            // Prepare to run query
            this._triageView.getResultsGrid().setInitialSelectionSetting(false);

            if (Utils_String.isGuid(context)) {
                this._handleQueryContext(context).then(successCallback, errorCallback);
            } else if (Utils_String.isGuid(queryId)) {
                this._beginGetProvider(
                    null,
                    queryId,
                    null,
                    (provider: QueryResultsProvider, cancellable: Utils_Core.Cancelable) => {
                        this._runQueryWithProvider(
                            provider,
                            Resources.QueryingStatusText,
                            () => successCallback(provider),
                            errorCallback, null, true);
                    },
                    errorCallback);
            }
        } else {
            // no query context - open work item view.
            replaceHistoryPointForWorkItem();
        }
    }

    private _handleQueryContext(queryContextId: string): Q.Promise<QueryResultsProvider> {
        const maxAttempts: number = 4;
        const delayMultiplier: number = 3;
        let timeBetweenAttemptsInMs: number = 200;
        let attemptsMade: number = 0;

        const deferred: Q.Deferred<QueryResultsProvider> = Q.defer<QueryResultsProvider>();

        const errorCallback: IErrorCallback = (error: Error) => {
            deferred.reject(error);
            publishErrorToTelemetry({
                name: "FailedToRetrieveQueryContext",
                message: getErrorMessage(error)
            });
        };

        const successCallback = (provider: QueryResultsProvider, queryContext: IQueryContext) => {
            deferred.resolve(provider);
            provider.setDirty(queryContext.isDirty);
        };

        const httpClient = ProjectCollection.getConnection(this._tfsContext).getHttpClient<TemporaryDataHttpClient>(TemporaryDataHttpClient);
        const attemptRestoreQueryContext = () => {
            httpClient.beginGetTemporaryData(queryContextId).then(
                (response: ITemporaryDataResponse) => {
                    const queryContext: IQueryContext = response.value;

                    if (!Utils_String.isEmptyGuid(queryContext.queryId)) {
                        this._beginGetProvider(
                            null,
                            queryContext.queryId,
                            null,
                            (provider: QueryResultsProvider, cancellable: Utils_Core.Cancelable) => {
                                this._runQueryWithProvider(
                                    provider,
                                    Resources.QueryingStatusText,
                                    () => {
                                        successCallback(provider, queryContext);
                                        provider.originalQuery = provider.queryDefinition.queryText;
                                    },
                                    errorCallback,
                                    {
                                        wiql: queryContext.queryText
                                    },
                                    true);
                            },
                            errorCallback);
                    } else if (queryContext.isCustomWiqlQuery) {
                        const queryData = this._getCustomWiqlQueryData(queryContext.queryText, queryContext.queryName);

                        this._beginGetProvider(
                            null, QueryDefinition.CUSTOM_WIQL_QUERY_ID, queryData, (provider: QueryResultsProvider, cancellable: Utils_Core.Cancelable) => {
                                provider.queryDefinition.specialQuery = true;
                                provider.queryDefinition.customQuery = true;
                                this._runQueryWithProvider(
                                    provider, Resources.QueryingStatusText, () => successCallback(provider, queryContext), errorCallback, null, true);
                            }, errorCallback);
                    } else {
                        // New Query Scenario
                        const queryData = this._queryProviderCreator.getNewQueryData(queryContext.queryText);

                        this._beginGetProvider(
                            null, null, queryData, (provider: QueryResultsProvider, cancellable: Utils_Core.Cancelable) => {
                                this._runQueryWithProvider(provider, Resources.QueryingStatusText, () => {
                                    successCallback(provider, queryContext);
                                    provider.originalQuery = QueryDefinition.defaultNewQueryWiql();
                                }, errorCallback, null, true);
                            }, errorCallback);
                    }
                },
                (error: Error) => {
                    attemptsMade++;
                    if (attemptsMade < maxAttempts) {
                        Utils_Core.delay(this, timeBetweenAttemptsInMs, attemptRestoreQueryContext);
                        timeBetweenAttemptsInMs *= delayMultiplier;
                    } else {
                        errorCallback(error);
                    }
                });
        };
        attemptRestoreQueryContext();

        return deferred.promise;
    }
}
