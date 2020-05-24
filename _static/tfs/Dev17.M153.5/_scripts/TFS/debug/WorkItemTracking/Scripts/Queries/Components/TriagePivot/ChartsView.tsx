import "VSS/LoaderPlugins/Css!Queries/Components/TriagePivot/ChartsView";

import { BaseControl } from "VSS/Controls";
import { QueryChartsView } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Charts";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { QueryPivotView, IQueryPivotViewProps } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/QueryPivotView";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import * as Utils_Core from "VSS/Utils/Core";

export interface IQueryChartViewCommandArgs {
    chartsView: QueryChartsView;
}

export class ChartsView extends QueryPivotView<IQueryPivotViewProps, IQueryChartViewCommandArgs> {
    private _chartsView: QueryChartsView;

    constructor(props: IQueryPivotViewProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);

        this._contentContainerClass = "query-charts-view-container";
    }

    public componentDidMount() {
        super.componentDidMount();

        this._chartsView = BaseControl.createIn(QueryChartsView, this._getContentContainerElement(), {
            tfsContext: this._tfsContext,
            queriesHubContext: this.context
        }) as QueryChartsView;

        this._attachEvents();
        this._refreshView(this.props);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        this._detachEvents();

        this._chartsView.dispose();
        this._chartsView = null;
    }

    protected onPivotSelected(props: IQueryPivotViewProps): void {
        this._attachEvents();
        this._refreshView(props, true);
    }

    protected onPivotDeselected(props: IQueryPivotViewProps): void {
        this._detachEvents();
    }

    protected onQueryChanged(props: IQueryPivotViewProps): void {
        this._refreshView(props, true);
    }

    private _attachEvents(): void {
        if (this._chartsView) {
            this._chartsView._bind("statusUpdate", this.onQueryStatusChanged);
        }
    }

    private _detachEvents(): void {
        if (this._chartsView) {
            this._chartsView._unbind("statusUpdate", this.onQueryStatusChanged);
        }
    }

    protected getCommandArgs(): IQueryChartViewCommandArgs {
        return {
            chartsView: this._chartsView
        };
    }

    private _refreshView(props: IQueryPivotViewProps, delay?: boolean): void {
        const action = () => {
            // since this is called via a delay, it's possible it was already disposed
            if (this._chartsView) {
                this._chartsView.showElement();

                if (props.queryProvider) {
                    this._runQueryWithProvider(props.queryProvider);
                }
            }
        };

        this.executeDelayableAction(action, delay);
    }

    private _runQueryWithProvider(provider: QueryResultsProvider) {
        this._chartsView.setProvider(provider);
    }
}
