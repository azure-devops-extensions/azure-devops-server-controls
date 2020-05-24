/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/TrendChart";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { ChartStore, ITrendChartState } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/ChartStore";
import { LabelledContextualMenu } from "TestManagement/Scripts/Scenarios/Common/Components/LabelledContextualMenu";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import { ChartComponent } from "WidgetComponents/ChartComponent";


export class TrendChart extends ComponentBase.Component<CommonTypes.IReportComponentProps, ITrendChartState> {
    public componentWillMount(): void {
        this._store = ChartStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {

        let chartMetrics: IContextualMenuItem[] = [
            { key: Resources.ResultCountText, name: Resources.ResultCountText } as IContextualMenuItem
        ];

        return (
            <div className={css("testinsights-analytics-report-view-chartsarea", this.props.cssClass || Utils_String.empty)}>

                <TooltipHost content={Resources.TrendChartLabel}>
                    <LabelledContextualMenu
                        contextualMenuClassName="testinsights-metric-selector"
                        optionsCssClassName="testinsights-metric-options-selector"
                        options={chartMetrics}
                        selectedOptionsText={Resources.ResultCountText}
                        contextualMenuAriaLabel={Utils_String.format(Resources.TestHistoryChartMetricSelectedAriaLabel, Resources.ResultCountText)} 
                    />
                </TooltipHost>

                {!(this.state.chartOptions) &&
                    <Spinner className="testresults-analytics-report-view-loadingspinner" size={SpinnerSize.large} />
                }

                {this.state.chartOptions &&
                    <ChartComponent chartOptions={this.state.chartOptions} />
                }

            </div>
        );
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _store: ChartStore;
}