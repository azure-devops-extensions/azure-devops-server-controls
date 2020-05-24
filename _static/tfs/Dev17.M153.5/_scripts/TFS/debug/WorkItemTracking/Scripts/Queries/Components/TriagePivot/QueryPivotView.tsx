import { css } from "OfficeFabric/Utilities";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as React from "react";
import "VSS/LoaderPlugins/Css!Queries/Components/TriagePivot/QueryPivotView";
import * as Utils_Core from "VSS/Utils/Core";
import { getErrorMessage } from "VSS/VSS";
import * as QueryResultGrid_NOREQUIRE from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import { QueryResultsProvider, WorkItemsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IQueryData } from "WorkItemTracking/Scripts/OM/TriageViewInterfaces";
import { IQueriesHubContext, QueriesHubContextPropTypes } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { executeAction } from "WorkItemTracking/Scripts/Queries/QueryActions";
import { QueryProviderCreator } from "WorkItemTracking/Scripts/Queries/QueryProviderCreator";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WITControlsCharts_NOREQUIRE from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Charts";

export interface IQueryPivotViewProps {
    isSelected: boolean;
    queryId?: string;
    wiql?: string;
    path?: string;
    searchText?: string;
    tempQueryId?: string;
    parentId?: string;
    newQuery?: boolean;
    queryProvider?: QueryResultsProvider;
}

export interface INavigationState {
    view: string;
    id: string;
    newQuery: boolean;
}

export abstract class QueryPivotView<TProps extends IQueryPivotViewProps, TCommandArgs> extends React.Component<TProps, {}> {
    static contextTypes = QueriesHubContextPropTypes;
    public context: IQueriesHubContext;
    protected _queryProviderCreator: QueryProviderCreator;
    protected _tfsContext: TfsContext = TfsContext.getDefault();
    protected _currentProvider: WorkItemsProvider;
    protected _lastQueryState: INavigationState;
    protected _projectId: string;
    protected _store: WorkItemStore;
    protected _contentContainerClass: string;

    constructor(props: TProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);
        this._projectId = this._tfsContext.navigation.projectId;
        this._store = ProjectCollection.getConnection(this._tfsContext).getService<WorkItemStore>(WorkItemStore);
        this._queryProviderCreator = new QueryProviderCreator({
            projectId: this._projectId,
            store: this._store,
            queriesHubContext: this.context
        });
    }

    public componentDidMount() {
        this.context.triageViewActions.OnCommandExecute.addListener(this._onCommandExecute);
    }

    public componentWillUnmount() {
        this.context.triageViewActions.OnCommandExecute.removeListener(this._onCommandExecute);
    }

    public shouldComponentUpdate(): boolean {
        // We don't need to rerender these components since they only provide
        // a skeleton for our older query controls 
        return false;
    }

    public render(): JSX.Element {
        return <div className="query-results-view explorer work-items-view new-queries-view body-font">
            <div className={css("queries-view-content", this._contentContainerClass)}>
                {this.getQueriesViewContent()}
            </div>
        </div>;
    }

    public componentWillReceiveProps(nextProps: TProps) {
        const isPivotSelectionChanged = this.isPivotSelectionChanged(nextProps);
        const isQueryChanged = this.isQueryChanged(nextProps);

        if (isPivotSelectionChanged) {
            if (nextProps.isSelected) {
                this.onPivotSelected(nextProps);
            } else {
                this.onPivotDeselected(nextProps);
            }
        } else if (nextProps.isSelected && isQueryChanged) {
            this.onQueryChanged(nextProps);
        }

        this.onReceiveNewProps(nextProps);
    }

    protected isQueryChanged(nextProps: IQueryPivotViewProps): boolean {
        return nextProps.newQuery !== this.props.newQuery
            || nextProps.parentId !== this.props.parentId
            || nextProps.path !== this.props.path
            || nextProps.queryId !== this.props.queryId
            || nextProps.searchText !== this.props.searchText
            || nextProps.tempQueryId !== this.props.tempQueryId
            || nextProps.wiql !== this.props.wiql
            || nextProps.queryProvider !== this.props.queryProvider;
    }

    protected isPivotSelectionChanged(nextProps: IQueryPivotViewProps): boolean {
        return nextProps.isSelected !== this.props.isSelected;
    }

    protected abstract onPivotSelected(props: IQueryPivotViewProps): void;

    protected abstract onPivotDeselected(props: IQueryPivotViewProps): void;

    protected abstract onQueryChanged(props: IQueryPivotViewProps): void;

    protected onReceiveNewProps(props: IQueryPivotViewProps): void { }

    protected onQueryStatusChanged = (sender: QueryResultGrid_NOREQUIRE.QueryResultGrid | WITControlsCharts_NOREQUIRE.QueryChartsView,
        status: string | Error, statusIsError?: boolean, primaryStatus?: string, secondaryStatus?: string) => {
        // making this a delay since the query status changes as the result of an action, and this also
        // invokes an action which is not supported.
        Utils_Core.delay(this, 0, () => {
            if (statusIsError) {
                this.context.actionsCreator.showErrorMessageForTriageView(getErrorMessage(status as Error));
                // When there is an error dont show any status message
                this.context.triageViewActionCreator.onQueryStatusChanged("", "");
            } else {
                this.context.actionsCreator.dismissErrorMessageForTriageView();
                // for nqe, we always want the status text to be lower case
                primaryStatus = primaryStatus ? primaryStatus.toLocaleLowerCase() : status as string;
                secondaryStatus = (secondaryStatus || "").toLocaleLowerCase();
                this.context.triageViewActionCreator.onQueryStatusChanged(primaryStatus, secondaryStatus);
            }
        });
    }

    protected getQueriesViewContent(): JSX.Element {
        return null;
    }

    protected _getContentContainerElement(): JQuery {
        return $(`.queries-view-content.${this._contentContainerClass}`);
    }

    protected _onCommandExecute = (actionName: string) => {
        if (!this.props.isSelected) {
            // Do nothing if the pivot is not currently active
            return;
        }

        // making it async to avoid errors like "Cannot invoke another action from an action"
        Utils_Core.delay(this, 0, () => {
            executeAction(actionName, this.getCommandArgs());
        });
    }

    protected executeDelayableAction(action: Function, delay?: boolean): void {
        if (delay) {
            Utils_Core.delay(this, 0, action);
        } else {
            action();
        }
    }

    protected _beginGetProvider(path?: string, queryId?: string, queryItemData?: IQueryData,
        callback?: IFunctionPPR<QueryResultsProvider, Utils_Core.Cancelable, void>,
        errorCallback?: IErrorCallback,
        parentId?: string): void {
        this._queryProviderCreator.beginGetProvider(path, queryId, queryItemData, callback, parentId);
    }

    protected _getCustomWiqlQueryData(wiql: string, name?: string): IQueryData {
        name = name || Resources.AdhocQueryDefaultName;

        // this._currentPath = name;
        // this._viewModes._currentTitle = name;

        return {
            hasChildren: false,
            id: QueryDefinition.CUSTOM_WIQL_QUERY_ID,
            isFolder: false,
            isPublic: false,
            name: name,
            path: null,
            wiql: wiql
        } as IQueryData;
    }

    protected getCommandArgs(): TCommandArgs {
        return {} as TCommandArgs;
    }
}
