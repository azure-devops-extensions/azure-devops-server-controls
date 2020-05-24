import "VSS/LoaderPlugins/Css!Queries/Components/TriagePivot/EditorView";

import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { BaseControl } from "VSS/Controls";
import { QueryEditor } from "WorkItemTracking/Scripts/Controls/Query/QueryEditor";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { QueryPivotView, IQueryPivotViewProps } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/QueryPivotView";
import { getLocalService } from "VSS/Service";
import { EventService } from "VSS/Events/Services";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { QueryResultGrid } from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { WorkItemsNavigator } from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { IDeleteEventArguments } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import { autobind } from "OfficeFabric/Utilities";

export interface IQueryEditorViewCommandArgs {
    editor: QueryEditor;
    queryResultsGrid: QueryResultGrid;
    queryDefinition: QueryDefinition;
    queriesHubContext: IQueriesHubContext;
}

export interface IQueryEditorViewProps extends IQueryPivotViewProps {
    workItemsNavigator: WorkItemsNavigator;
}

export class EditorView extends QueryPivotView<IQueryEditorViewProps, IQueryEditorViewCommandArgs> {
    private _queryEditor: QueryEditor;

    constructor(props: IQueryEditorViewProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);

        this._contentContainerClass = "query-editor-view-container";
    }

    public componentDidMount() {
        super.componentDidMount();

        // Workaround for react 16.x where nested ReactDOM.render performs async rendering
        // This should be revisted if the UI completedly overhauled with react
        setTimeout(() => {
            this._queryEditor = BaseControl.createIn(QueryEditor, this._getContentContainerElement(), {
                infoBar: false,
                tfsContext: this._tfsContext,
                workItemsNavigator: this.props.workItemsNavigator,
                queriesHubContext: this.context,
                initialSelectedWorkItemId: this.props.workItemsNavigator.getSelectedWorkItemId()
            }) as QueryEditor;
            this._queryEditor.getElement().find(".splitter .leftPane").attr("role", "main").attr("aria-label", Resources.QueryEditorRoleTitle);
            this._queryEditor.getElement().find(".splitter .rightPane").attr("role", "contentinfo").attr("aria-label", Resources.QueryResultsGridRoleTitle);

            this._attachEvents();
            this._refreshView(this.props);
        }, 0);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();   

        if (this._queryEditor) {
            this._detachEvents();
            this._queryEditor.dispose();
            this._queryEditor = null;
        }
    }

    protected onPivotSelected(props: IQueryEditorViewProps): void {
        this._attachEvents();
        this._refreshView(props, true);
    }

    protected onPivotDeselected(props: IQueryEditorViewProps): void {
        this._detachEvents();
    }

    protected onQueryChanged(props: IQueryEditorViewProps): void {
        this._refreshView(props, true);
    }

    private _attachEvents(): void {
        // Query editor
        if (this._queryEditor) {
            this._queryEditor.attachNavigatorEvents();
            this._queryEditor.getResultsGrid()._bind("dirty-status-changed", this._onGridDirtyStatusChanged);
            this._queryEditor.getResultsGrid()._bind("selectedWorkItemChanged", this._onGridSelectedWorkItemChanged);
            this._queryEditor.getResultsGrid()._bind("statusUpdate", this.onQueryStatusChanged);
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
        // Query editor
        if (this._queryEditor) {
            this._queryEditor.detachNavigatorEvents();
            this._queryEditor.getResultsGrid()._unbind("dirty-status-changed", this._onGridDirtyStatusChanged);
            this._queryEditor.getResultsGrid()._unbind("selectedWorkItemChanged", this._onGridSelectedWorkItemChanged);
            this._queryEditor.getResultsGrid()._unbind("statusUpdate", this.onQueryStatusChanged);
        }

        // Recycle bins        
        const eventService = getLocalService(EventService);
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED_TEXT_ONLY, this._deleteItemEventErrorDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemSuccessEventDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemEventStartDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_RESTORE_STARTED, this._deleteItemEventStartDelegate);
        eventService.detachEvent(RecycleBinConstants.EVENT_DESTROY_STARTED, this._deleteItemEventStartDelegate);
    }

    protected getCommandArgs(): IQueryEditorViewCommandArgs {
        return {
            editor: this._queryEditor,
            queryResultsGrid: this._queryEditor ? this._queryEditor.getResultsGrid() : null,
            queryDefinition: this.props.queryProvider && this.props.queryProvider.queryDefinition,
            queriesHubContext: this.context
        };
    }

    private _deleteItemEventErrorDelegate = (message: string) => {
        this.context.actionsCreator.showErrorMessageForTriageView(message);
    }

    private _deleteItemEventStartDelegate = (startedArguments: IDeleteEventArguments) => {
        if (startedArguments) {
            const workItemIds = startedArguments.workItemIds;
            // If we have valid work items to delete, and the delete operation has not come from the WIT Form, immediately update the view
            if ((workItemIds && workItemIds.length > 0) && !startedArguments.deleteFromForm && this._queryEditor && this._queryEditor.getResultsGrid()) {
                this._queryEditor.getResultsGrid().removeWorkItems(workItemIds);
            }
        }
    }

    private _deleteItemSuccessEventDelegate = (sender?: any, succeededArguments?: IDeleteEventArguments) => {
        if (succeededArguments) {
            const workItemIds = succeededArguments.workItemIds;
            // If we have a valid work item to delete, and there is only one because the delete operation must come from the WIT Form, update the view on success
            if ((workItemIds && workItemIds.length === 1) && succeededArguments.deleteFromForm && this._queryEditor && this._queryEditor.getResultsGrid()) {
                this._queryEditor.getResultsGrid().removeWorkItems(workItemIds);
            }
        }
    }

    private _refreshView(props: IQueryEditorViewProps, delay?: boolean): void {
        const action = () => {
            // since this is called via a delay, it's possible it was already disposed
            if (this._queryEditor) {
                this._queryEditor.showElement();

                if (props.queryProvider) {
                    this._runQueryWithProvider(props.queryProvider, !props.newQuery, this._focusWorkItemQueryResultGrid);
                }
            }
        };

        this.executeDelayableAction(action, delay);
    }

    private _onGridSelectedWorkItemChanged = () => {
        this.context.triageViewActionCreator.onSelectedWorkItemsChange(this._queryEditor.getResultsGrid().getSelectedWorkItemIds());
    }

    private _onGridDirtyStatusChanged = () => {
        const isAnyWorkItemDirty = (this._queryEditor && this._queryEditor.getResultsGrid()) ? this._queryEditor.getResultsGrid().isDirty(true) : false;
        this.context.triageViewActionCreator.onWorkItemDirtyStatusChanged(isAnyWorkItemDirty);
    }

    private _runQueryWithProvider(provider: QueryResultsProvider, runQuery: boolean, successCallback?: Function, errorCallback?: Function) {
        this._queryEditor.setProvider(provider, () => {
            if ($.isFunction(successCallback)) {
                successCallback();
            }
        }, (error) => {
            if ($.isFunction(errorCallback)) {
                errorCallback();
            }
            // Error here happens only when the wiql is totally invalid like wiql=foo for all other scenarios we will have queryresultmodel
            // in this case we cannot render anything in Editor view, so redirecting to  directory page
            this.context.navigationActionsCreator.navigateToQueriesPage(false, true);
            this.context.actionsCreator.showErrorMessageForQueriesView((error.serverError || error).message);
        }, { runQuery: runQuery, keepSelection: true });
    }

    @autobind
    private _focusWorkItemQueryResultGrid() {
        this.executeDelayableAction(() => {
            if (this._queryEditor && this._queryEditor.getElement().is(":visible")) {
                this._queryEditor.getResultsGrid().focus();
            }
        }, true);
    }
}
