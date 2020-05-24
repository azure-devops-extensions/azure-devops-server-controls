import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { IViewOptionsValues } from "VSSUI/Utilities/ViewOptions";
import { ActionParameters, ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { promptMessageDialog } from "WorkItemTracking/Scripts/Dialogs/WITDialogs";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { ActionsCreator } from "WorkItemTracking/Scripts/Queries/Actions/ActionsCreator";
import { QueriesHubConstants, TriageViewPivotsKey } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueriesViewState } from "WorkItemTracking/Scripts/Queries/QueriesViewState";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { IQueryHierarchyItemDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import { IQueryResultsProviderDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryResultsProviderStore";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";

const tfsContext = TfsContext.getDefault();

export class NavigationActionsCreator {

    constructor(
        private _actionsCreator: ActionsCreator,
        private _queryHierarchyItemDataProvider: IQueryHierarchyItemDataProvider,
        private _queryResultsProviderDataProvider: IQueryResultsProviderDataProvider,
        private queryHubViewState: QueriesViewState) {
    }

    /**
     * Navigates to work item edit view.
     *
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @param parentId Parent folder to add the query to. Defaults to My Queries.
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    public navigateToWorkItem(workItemId: number, isTriage?: boolean): IPromise<boolean> {
        const state = {};
        state[ActionParameters.VIEW] = ActionUrl.ACTION_EDIT;
        state[ActionParameters.ID] = workItemId;
        state[ActionParameters.TRIAGE] = isTriage ? "true" : null;

        return this.navigate(state, false);
    }

    /**
     * Navigates to query editor for adding a new query.
     *
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @param parentId Parent folder to add the query to. Defaults to My Queries.
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    public async navigateToNewQuery(checkUnsavedItems: boolean, parentId?: string): Promise<boolean> {
        const state = {};
        state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY_EDIT;
        state[ActionParameters.NEW_QUERY] = true;

        if (!parentId) {
            try {
                const items = await this._actionsCreator.ensureRootQueryFolders();
                const queryHierarchyItem = this._queryHierarchyItemDataProvider.getMyQueriesFolderItem();
                state[ActionParameters.PARENTID] = queryHierarchyItem.id;
                return this.navigate(state, checkUnsavedItems);
            } catch (error) {
                this._actionsCreator.showErrorMessageForQueriesView(error.message);
            }
        } else {
            state[ActionParameters.PARENTID] = parentId;
            return this.navigate(state, checkUnsavedItems);
        }
    }

    /**
     * Navigates to query results view by preserving current supported states.
     *
     * @param queryId Query to navigate to
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    public navigateToQueryPreservingSupportedState(queryId: string, checkUnsavedItems: boolean): IPromise<boolean> {
        const currentView = QueryUtilities.isQueriesFolderPivot(this.queryHubViewState.selectedPivot.value) ? TriageViewPivotsKey.QueryResults : this.queryHubViewState.selectedPivot.value;
        const newState = {};
        newState[ActionParameters.VIEW] = Utils_String.equals(currentView, ActionUrl.ACTION_SEARCH, true) || Utils_String.equals(currentView, ActionUrl.ACTION_EDIT, true) ? ActionUrl.ACTION_QUERY : currentView;
        newState[ActionParameters.ID] = queryId;
        newState[QueriesHubConstants.WorkItemPaneViewOptionKey] = this.queryHubViewState.viewOptions.getViewOption(QueriesHubConstants.WorkItemPaneViewOptionKey);

        return this.navigate(newState, checkUnsavedItems);
    }

    /**
     * Navigates to query results view.
     *
     * @param queryId Query to edit
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    public navigateToRunQuery(queryId: string, checkUnsavedItems: boolean): IPromise<boolean> {
        const state = {};
        state[ActionParameters.ID] = queryId;
        state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY;
        return this.navigate(state, checkUnsavedItems);
    }

    /**
     * Navigates to query editor.
     *
     * @param queryId Query to edit
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    public navigateToEditQuery(queryId: string, checkUnsavedItems: boolean): IPromise<boolean> {
        const state = {};
        state[ActionParameters.ID] = queryId;
        state[ActionParameters.VIEW] = ActionUrl.ACTION_QUERY_EDIT;
        return this.navigate(state, checkUnsavedItems);
    }

    /**
     * Navigates to specific url view
     *
     * @param view The url view for navigation
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @param replaceEntryOnly Whether to replace the history state
     * @param suppressEvent Suppress view option change event
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    public navigateToView(view: string, checkUnsavedItems: boolean, state?: IDictionaryStringTo<string>, replaceEntryOnly?: boolean, suppressEvent?: boolean): Promise<boolean> {
        state = state || {};
        state[ActionParameters.VIEW] = view;
        return this.navigate(state, checkUnsavedItems, replaceEntryOnly, suppressEvent);
    }

    /**
     * Navigates to specific view in Queries hub
     *
     * @param view The view for navigation
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @param replaceEntryOnly Whether to replace the history state
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    public navigateToQueriesHub(view: string, checkUnsavedItems: boolean, replaceEntryOnly?: boolean): Promise<boolean> {
        if (view && !QueryUtilities.isQueriesHubPivot(view)) {
            throw new Error("Only 'all', 'favorites' or empty view can be the view value in queries hub");
        }

        return this.navigateToView(view, checkUnsavedItems, null, replaceEntryOnly);
    }

    /**
     * Checks unsaved items and performs navigation.
     *
     * @param state The url parameters for navigation
     * @param checkUnsavedItems Whether to check for unsaved items or not. Will perform navigation immediately if it is set to false.
     * @param replaceEntryOnly Whether to replace the history state
     * @param suppressEvent Suppress view option change event
     * @returns Boolean promise returns true meaning the navigation happened. Otherwise, the navigation was blocked by user's decision.
     */
    private navigate(state: IDictionaryStringTo<any>, checkUnsavedItems: boolean, replaceEntryOnly: boolean = false, suppressEvent?: boolean): Promise<boolean> {

        const promise = new Promise((resolve, reject) => {
            if (checkUnsavedItems) {
                this.checkAndPromptForUnsavedItems(
                    () => resolve(null),
                    () => {
                        const workItemStore = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
                        const workItemManager = WorkItemManager.get(workItemStore);
                        const queryResultsProvider = this._queryResultsProviderDataProvider.getValue();

                        Telemetry.publishEvent(
                            new Telemetry.TelemetryEventData(
                                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_LEAVE_DIRTY,
                                {
                                    "queryId": queryResultsProvider.queryDefinition.id,
                                    "tempQueryId": queryResultsProvider.queryDefinition.tempQueryId,
                                    "dirtyWorkItemCount": workItemManager.getDirtyWorkItems().length,
                                    "dirtyProviderCount": queryResultsProvider.isDirty()
                                }), true);

                        // Right now we will reset all registered entries when user choose to leave as that is the only scenario for now.
                        // In future (if necessay) we can change and let caller chain the promise to make their own decision of which resource to revert.
                        queryResultsProvider.revertEditInfo(false);
                        workItemManager.resetDirtyWorkItems();

                        resolve(null);
                    },
                    () => reject(null));
            } else {
                resolve(null);
            }
        });

        return promise.then(
            () => {
                if (this.queryHubViewState) {
                    // Preserve full screen state and workitem pane mode to make sure when we back to triage view, exact states are maintained
                    state[ActionParameters.FULLSCREEN] = this.queryHubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN);
                    state[QueriesHubConstants.WorkItemPaneViewOptionKey] = this.queryHubViewState.viewOptions.getViewOption(QueriesHubConstants.WorkItemPaneViewOptionKey);
                    this.updateNavigationState(state, replaceEntryOnly, suppressEvent);
                }
                return true;
            },
            () => !checkUnsavedItems || false);
    }

    public updateNavigationState(state: IViewOptionsValues, replaceState: boolean, suppressEvent?: boolean): void {
        this.queryHubViewState.updateNavigationState(replaceState ? HistoryBehavior.replace : HistoryBehavior.newEntry, () => {
            this.queryHubViewState.selectedPivot.value = state[ActionParameters.VIEW];
            this.queryHubViewState.viewOptions.setViewOptions(state, suppressEvent);
        });
    }

    /**
     * Navigates to last visited queries view pivot
     */
    public navigateToQueriesPage(checkUnsavedItems: boolean, replaceEntryOnly?: boolean): void {
        const mruAction = QueryUtilities.getQueryHubDefaultAction();
        this.navigateToQueriesHub(mruAction, checkUnsavedItems, replaceEntryOnly);
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_NAVIGATE_QUERIESPIVOT,
                {
                    "view": mruAction
                }), false);
    }

    public navigateToQueriesFolderPage(idOrPath: string, checkUnsavedItems: boolean, replaceEntryOnly?: boolean, suppressEvent?: boolean): IPromise<boolean> {
        let state;
        if (Utils_String.isGuid(idOrPath)) {
            state = {
                [ActionParameters.ID]: idOrPath
            };
        } else {
            state = {
                [ActionParameters.PATH]: idOrPath
            };
        }
        return this.navigateToView(QueriesHubConstants.QueryFoldersPageAction, checkUnsavedItems, state, replaceEntryOnly, suppressEvent);
    }

    // Replace url query path by query id without navigating
    public replaceUrlPathById(id: string): void {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();
        navHistoryService.replaceState({...state,
            [ActionParameters.ID]: id,
            [ActionParameters.PATH]: null
        });
    }

    public checkAndPromptForUnsavedItems(
        noUnsavedItemAction: () => void,
        promptAndProceedAction: () => void,
        promptAndRejectAction: () => void,
        postHandlingAction?: (hasUnsavedItems: boolean) => void,
        checkForWorkItemsOnly?: boolean,
        messageTitle?: string,
        messageContentText?: string,
        proceedButtonText?: string,
        rejectButtonText?: string): void {

        let unsavedItemsMessage: string = undefined;
        let dirtyItemTitles: string[] = [];
        const maxAllowedItemsInMessage = 6;
        const workItemStore = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
        const workItemManager = WorkItemManager.get(workItemStore);
        const queryResultsProvider = this._queryResultsProviderDataProvider.getValue();

        // Both data source has to be present before checking unsaved items
        if (queryResultsProvider && workItemManager) {
            // Get unsaved query items
            if (!checkForWorkItemsOnly && queryResultsProvider.isDirty()) {
                const queryTitle = Utils_String.format(Resources.QueryDirtyDocumentTitleFormat, queryResultsProvider.getTitle() || Resources.UntitledQuery);
                dirtyItemTitles.push(queryTitle);
            }

            // Get unsaved work items
            if (workItemManager.isDirty(true)) {
                dirtyItemTitles = dirtyItemTitles.concat(workItemManager.getDirtyWorkItemTitles(maxAllowedItemsInMessage));
            }

            // Compose prompt message
            if (dirtyItemTitles.length > 0) {
                unsavedItemsMessage = this._createPromptMessageWithDirtyItems(
                    messageContentText || Resources_Platform.UnsavedChangesWithNames,
                    dirtyItemTitles,
                    maxAllowedItemsInMessage);
            }
        }

        if (unsavedItemsMessage) {
            promptMessageDialog(
                unsavedItemsMessage,
                messageTitle || Resources_Platform.UnsavedChangesMessageTitle,
                [
                    { id: "leave", text: proceedButtonText || Resources_Platform.UnsavedChangesLeaveButton, reject: false } as IMessageDialogButton,
                    { id: "stay", text: rejectButtonText || Resources_Platform.UnsavedChangesStayButton, reject: true } as IMessageDialogButton
                ]).then(
                    (dialogResult: IMessageDialogResult) => {
                        if (promptAndProceedAction) {
                            promptAndProceedAction();
                        }
                    },
                    (rejectResult: IMessageDialogResult) => {
                        if (promptAndRejectAction) {
                            promptAndRejectAction();
                        }
                    });
        } else if (noUnsavedItemAction) {
            noUnsavedItemAction();
        }

        if (postHandlingAction) {
            postHandlingAction(!!unsavedItemsMessage);
        }
    }

    private _createPromptMessageWithDirtyItems(messageText: string, dirtyItemTitles: string[], maxAllowedItemsInMessage: number): string {
        const messages: string[] = [];
        for (let index = 0; index < dirtyItemTitles.length; index++) {
            if (messages.length === (maxAllowedItemsInMessage - 1)) {
                messages.push(Resources_Platform.UnsavedChangesMore);
                break;
            }

            let title = dirtyItemTitles[index];
            if (title.length > 55) {
                title = title.substr(0, 52) + "...";
            }
            messages.push(title);
        }

        return messages.length > 0 ? messageText + "\n" + messages.join("\n") : undefined;
    }
}
