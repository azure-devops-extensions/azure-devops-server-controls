import * as Q from "q";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";
import { getHistoryService, HistoryService } from "VSS/Navigation/Services";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionUrl, ActionParameters } from "WorkItemTracking/Scripts/ActionUrls";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { IContributionHubViewStateRouterRequestHandler } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { QueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { promptMessageDialog } from "WorkItemTracking/Scripts/Dialogs/WITDialogs";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { DataProviderConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import * as Utils_Array from "VSS/Utils/Array";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { IViewOptions, IViewOptionsValues } from "VSSUI/Utilities/ViewOptions";
import { QueriesViewState } from "WorkItemTracking/Scripts/Queries/QueriesViewState";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";
import { getDefaultWebContext } from "VSS/Context";
import { QueriesConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export class QueriesHubRequestHandler implements IContributionHubViewStateRouterRequestHandler {
    private _viewOptions: IViewOptions;
    private _processingUnloadMessage: IPromise<void>;
    private _projectId: string;

    constructor(
        private readonly _queriesHubViewState: QueriesViewState,
        private readonly tfsContext: TfsContext) {
        this._viewOptions = this._queriesHubViewState.viewOptions;
        this._projectId = getDefaultWebContext().project.id;
    }

    public onHubDispose(): void {
        QueryResultsProvider.invalidateQueryResults();
        QueriesHubContext.dispose();
    }

    public onPreRequestExecute(): void {
        // In the case of an old url with hash fragements, we need to
        // read them and replace the state so that the action is correctly
        // understood.  Hash fragements ALWAYS win over other route values.
        const historyService = getHistoryService();
        const fragment = historyService.getCurrentHashString();
        if (fragment) {
            const state = HistoryService.deserializeState(fragment);
            this.replaceState(state);
        }

        const state = this._viewOptions.getViewOptions();
        state[ActionParameters.VIEW] = this._queriesHubViewState.selectedPivot.value;

        const ciState = { ...state };
        if (ciState[ActionParameters.WIQL]) {
            ciState[ActionParameters.WIQL] = "WIQL"; // We cannot send wiql in CI due to GDPR
        }

        if (ciState[ActionParameters.NAME]) {
            ciState[ActionParameters.NAME] = "NAME"; // Name may contain EUII
        }

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
            WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_NAVIGATE_PIVOT,
            {
                "state": ciState
            }));

        const needReplaceActionReplaceState = this.replaceActionWithViewInState(state);

        if (this.handleUnsavedChanges(state)) {
            return;
        }

        if (this.handleVsOpenRedirection(state)) {
            return;
        }

        if (this.handleQueryDirectoryPivotsRedirection(state)) {
            return;
        }

        if (this.handleQueryFolderPivotsRedirection(state)) {
            return;
        }

        if (this.handleTempQueryIdRedirection(state)) {
            return;
        }

        if (this.handleNoActionRedirection(state)) {
            return;
        }

        if (this.handleCreateWorkItemRedirection(state) ||
            this.handleQueryResultsRedirection(state)) {
            return;
        }

        if (this.handleQueryLastVisitedQuery(state)) {
            return;
        }

        if (this.handleEmptyIdRedirection(state)) {
            return;
        }

        if (this.handleAdhocQueriesRedirection(state)) {
            return;
        }

        // If we converted _a to view and we didn't pass
        // any other steps, redirect to correct place
        if (needReplaceActionReplaceState) {
            this.replaceState(state);
        }
    }

    private replaceActionWithViewInState(state: IViewOptionsValues): boolean {
        const action = state && state[ActionParameters.ACTION];
        if (action) {
            state[ActionParameters.VIEW] = action;
            delete state[ActionParameters.ACTION];
            return true;
        }
        return false;

    }

    private handleQueryDirectoryPivotsRedirection(state: IViewOptionsValues): boolean {
        return state && QueryUtilities.isQueriesHubPivot(state[ActionParameters.VIEW]);
    }

    private handleQueryFolderPivotsRedirection(state: IViewOptionsValues): boolean {
        return state && state[ActionParameters.VIEW] === QueriesHubConstants.QueryFoldersPageAction;
    }

    private handleAdhocQueriesRedirection(state: IViewOptionsValues): boolean {
        if (!state || !state[ActionParameters.VIEW]) {
            return false;
        }

        const action = state[ActionParameters.VIEW];
        if (this._isQueryAction(action)) {
            const queryId = this._tryMapAdhocQueryId(state[ActionParameters.ID] || state[ActionParameters.PATH]);

            if (queryId) {
                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        CIConstants.WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                        CIConstants.WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_ADHOCQUERY_REDIRECTION,
                        {
                            "originalId": state[ActionParameters.ID],
                            "originalPath": state[ActionParameters.PATH],
                            "redirectedId": queryId
                        }));

                delete state[ActionParameters.PATH];
                state[ActionParameters.ID] = queryId;
                this.replaceState(state);
                return true;
            } else if (state[ActionParameters.PATH] && Utils_String.isGuid(state[ActionParameters.PATH])) {
                // opening a query from VS uses path={guid}&_a=query
                state[ActionParameters.ID] = state[ActionParameters.PATH];
                delete state[ActionParameters.PATH];
                this.replaceState(state);
                return true;
            }
        }
    }

    private _tryMapAdhocQueryId(queryIdOrPath: string): string | null {
        if (queryIdOrPath) {
            // Try map adhoc query path to id
            if (Utils_String.localeIgnoreCaseComparer(queryIdOrPath, Resources.AssignedToMeQuery) === 0) {
                queryIdOrPath = QueryDefinition.ASSIGNED_TO_ME_ID;
            } else if (Utils_String.localeIgnoreCaseComparer(queryIdOrPath, Resources.FollowedWorkItemsQuery) === 0) {
                queryIdOrPath = QueryDefinition.FOLLOWED_WORKITEMS_ID;
            }

            // Resolve the input to valid query id
            const adhocQueryIds = [QueryDefinition.ASSIGNED_TO_ME_ID, QueryDefinition.FOLLOWED_WORKITEMS_ID];
            if (Utils_Array.arrayContains(
                queryIdOrPath, adhocQueryIds,
                (source, target) => Utils_String.equals(source, target, true))) {

                const pageDataService = getService(WebPageDataService);
                const migrateAdhocQueries = pageDataService.getPageData<IDictionaryStringTo<string>>(DataProviderConstants.AdhocQueriesDataProviderId);

                const migratedQueryId = migrateAdhocQueries ? migrateAdhocQueries[queryIdOrPath.toLowerCase()] : undefined;
                if (migratedQueryId && !Utils_String.isEmptyGuid(migratedQueryId)) {
                    return migratedQueryId;
                }
            }
        }

        return null;
    }

    private _isQueryAction(action: string): boolean {
        return action === ActionUrl.ACTION_QUERY
            || action === ActionUrl.ACTION_QUERY_EDIT
            || action === ActionUrl.ACTION_QUERY_CHARTS;
    }

    private handleUnsavedChanges(state: IViewOptionsValues): boolean {
        const unsavedItemsMessage = QueriesHubContext.getInstance().actionsCreator.getUnsavedItemsMessage();
        // Try process the unload message if it exists and it is not already being processed
        if (unsavedItemsMessage && !this._processingUnloadMessage) {
            const workItemStore = ProjectCollection.getConnection(this.tfsContext).getService<WorkItemStore>(WorkItemStore);
            const workItemManager = WorkItemManager.get(workItemStore);
            const queryResultsProvider = QueriesHubContext.getInstance().stores.queryResultsProviderStore.getValue();

            if (!queryResultsProvider || !queryResultsProvider.queryDefinition) {
                // If url action as well as query results provider are not available, do nothing
                return false;
            }

            const queryParameters = QueryUtilities.getQueryParametersFromViewOptions(this._queriesHubViewState);
            if (QueryUtilities.isTriageViewPivot(queryParameters)) {
                // Do not handle anything for triage view hub
                return false;
            }

            // Will process the unload message
            const deferred = Q.defer<void>();
            this._processingUnloadMessage = deferred.promise;

            Q(promptMessageDialog(
                unsavedItemsMessage,
                Resources_Platform.UnsavedChangesMessageTitle,
                [
                    { id: "leave", text: Resources_Platform.UnsavedChangesLeaveButton, reject: false } as IMessageDialogButton,
                    { id: "stay", text: Resources_Platform.UnsavedChangesStayButton, reject: true } as IMessageDialogButton
                ])).done(
                    (dialogResult: IMessageDialogResult) => {
                        Telemetry.publishEvent(
                            new Telemetry.TelemetryEventData(
                                CIConstants.WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                                CIConstants.WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_LEAVE_DIRTY,
                                {
                                    "queryId": queryResultsProvider.queryDefinition.id,
                                    "tempQueryId": queryResultsProvider.queryDefinition.tempQueryId,
                                    "dirtyWorkItemCount": workItemManager.getDirtyWorkItems().length,
                                    "dirtyProviderCount": queryResultsProvider.isDirty()
                                }));

                        // Revert all changes when user choose to leave the page
                        queryResultsProvider.revertEditInfo(false);
                        workItemManager.resetDirtyWorkItems();

                        deferred.resolve(null);
                    },
                    (rejectResult: IMessageDialogResult) => {
                        deferred.reject(null);
                    });

            // Make sure user stays on the dirty query
            const previousState = QueryUtilities.getViewStateFromQueryResultsProvider(
                QueriesHubContext.getInstance(), this._queriesHubViewState);
            this.replaceState(previousState);

            Q(deferred.promise).done(
                () => {
                    this._processingUnloadMessage = null;
                    this.replaceState(state, false);
                },
                () => this._processingUnloadMessage = null);

            return true;
        }

        return false;
    }

    private handleNoActionRedirection(state: IViewOptionsValues): boolean {
        // If the url has an id param but no action param - like "_workitems?id=xxx", route it to a default action
        if (state && state[ActionParameters.ID] && !state[ActionParameters.VIEW]) {
            if (Utils_String.isGuid(state[ActionParameters.ID])) {
                // if id is a guid, redirect to query page (_workItems?id=xxx&_a=query)
                state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY;
                this.replaceState(state);
            } else {
                // if it is a number, redirect to work item edit page (_workItems?id=xxx&_a=edit)
                state[ActionParameters.VIEW] = ActionUrl.ACTION_EDIT;
                this.replaceState(state);
            }

            return true;
        }

        // If url has a path param and no view param, route it to query
        if (state && state[ActionParameters.PATH] && !state[ActionParameters.VIEW]) {
            state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY;
            this.replaceState(state);
            return true;
        }

        return false;
    }

    private handleVsOpenRedirection(state: IViewOptionsValues): boolean {
        if (state && state[ActionParameters.VIEW] === ActionUrl.ACTION_VSOPEN) {
            state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY;
            state[ActionParameters.WORKITEMID] = state.id;
            state[ActionParameters.ID] = state.queryId;
            state[ActionParameters.ISVSOPEN] = true;
            delete state[ActionParameters.QUERYID];
            this.replaceState(state);
            return true;
        }

        return false;
    }

    /**
     * Sets the last visited query
     * @param parameters
     * @param state
     */
    private handleQueryLastVisitedQuery(state: IViewOptionsValues): boolean {
        const serverSettingService = getSettingsService();
        if ((state && state[ActionParameters.ID] && this._isQueryAction(state[ActionParameters.VIEW])) ||
            (state[ActionParameters.VIEW] && Utils_String.equals(state[ActionParameters.VIEW], ActionUrl.ACTION_QUERYRESULTSBYID, true) && Utils_String.isGuid(state[ActionParameters.ID]))) {
            serverSettingService.setEntries({
                [QueriesConstants.LastVisitedQueryMruKey]: state[ActionParameters.ID]
            }, SettingsUserScope.Me, TfsSettingsScopeNames.Project, this._projectId);
            // Updating the favorite group with the last visited query item
            QueriesHubContext.getInstance().actionsCreator.setLastVisitedQueryItem(state[ActionParameters.ID]);
        }

        return false;
    }

    /**
     * for url like _workitems/create/bug the currentParameters will look like create/bug. Route this url to ?_a=new&witd=bug
     */
    private handleCreateWorkItemRedirection(state: IViewOptionsValues): boolean {
        if (Utils_String.equals(state[ActionParameters.VIEW], ActionUrl.ACTION_CREATE, true)) {

            state[ActionParameters.WITD] = state[ActionParameters.ID];
            delete state[ActionParameters.ID];
            state[ActionParameters.VIEW] = ActionUrl.ACTION_NEW;
            this.replaceState(state);
            return true;
        }

        return false;
    }

    /**
     * Route _workitems/resultsById/<guid> to ?_a=query&id=<guid>
     * Route _workitems/results/<path> to ?_a=query&path=<path>
     * Route _workitems/adhocquery?wiql=<wiql>&name=<name> to ?_a=query&wiql=<path>&name=<name>
     */
    private handleQueryResultsRedirection(state: IViewOptionsValues): boolean {
        if (state[ActionParameters.VIEW]) {
            if (state[ActionParameters.ID] && Utils_String.equals(state[ActionParameters.VIEW], ActionUrl.ACTION_QUERYRESULTSBYPATH, true)) {
                // this is no longer supported because no one has used this endpoint,
                // so we just redirect to the all page
                delete state[ActionParameters.VIEW];
                delete state[ActionParameters.ID];
                this.replaceState(state);

                return true;
            }
            else if (state[ActionParameters.WIQL] && Utils_String.equals(state[ActionParameters.VIEW], ActionUrl.ACTION_ADHOCQUERY, true)) {
                state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY;
                this.replaceState(state);
                return true;
            } else if (state[ActionParameters.ID] && Utils_String.equals(state[ActionParameters.VIEW], ActionUrl.ACTION_QUERYRESULTSBYID, true)) {
                state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY;
                this.replaceState(state);
                return true;
            } else {
                // if we have any of these actions without path/id/wiql, we will 
                // reroute in handleEmptyIdRedirection
                return false;
            }
        }
        return false;
    }

    /**
     * tempQueryId url format is _workitems?tempQueryId=f4dc41f8-b9d2-42f1-80ee-12f70185d98f
     * and we need to inject the query action so it'll be executed.
     */
    private handleTempQueryIdRedirection(state: IViewOptionsValues): boolean {
        if (state[ActionParameters.TEMPQUERYID] &&
            !state[ActionParameters.VIEW]) {

            state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY;
            this.replaceState(state);

            return true;
        }

        return false;
    }

    /**
     * if we have a query action but no id or path or wiql or tempQueryId, reset to queries directory page.
     */
    private handleEmptyIdRedirection(state: IViewOptionsValues): boolean {
        if (!state[ActionParameters.ID] && !state[ActionParameters.NEW_QUERY] && !state[ActionParameters.TEMPQUERYID] && !state[ActionParameters.PATH] && !state[ActionParameters.WIQL] && !state[ActionParameters.SEARCHTEXT]) {
            const action = state[ActionParameters.VIEW];
            if (Utils_String.equals(ActionUrl.ACTION_QUERY, action, true) ||
                Utils_String.equals(ActionUrl.ACTION_QUERY_EDIT, action, true) ||
                Utils_String.equals(ActionUrl.ACTION_QUERY_CHARTS, action, true) ||
                Utils_String.equals(ActionUrl.ACTION_QUERYRESULTSBYID, action, true) ||
                Utils_String.equals(ActionUrl.ACTION_QUERYRESULTSBYPATH, action, true) ||
                Utils_String.equals(ActionUrl.ACTION_ADHOCQUERY, action, true)
            ) {
                state[ActionParameters.VIEW] = QueryUtilities.getQueryHubDefaultAction();
                this.replaceState(state);

                return true;
            }
        }

        return false;
    }

    private replaceState(state: IViewOptionsValues, suppressEvent: boolean = true) {
        this._queriesHubViewState.updateNavigationState(HistoryBehavior.replace, () => {
            this._queriesHubViewState.selectedPivot.value = state[ActionParameters.VIEW];
            delete state[ActionParameters.VIEW];
            this._queriesHubViewState.viewOptions.setViewOptions(state, suppressEvent);
        });
    }
}
