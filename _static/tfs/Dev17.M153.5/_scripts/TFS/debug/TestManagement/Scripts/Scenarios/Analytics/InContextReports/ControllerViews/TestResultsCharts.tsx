/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestResultsCharts";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { ITestResultsChartsState, TestResultsChartsStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestResultsChartsStore";
import { LabelledContextualMenu } from "TestManagement/Scripts/Scenarios/Common/Components/LabelledContextualMenu";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import { ChartComponent } from "WidgetComponents/ChartComponent";
import { VisualHost } from "Dashboards/Components/Reports/VisualHost";


export interface ITestResultsChartsProps extends CommonTypes.IReportComponentProps {
    onTrendChartMetricChanged?: (chartMetric: CommonTypes.Metric) => void;
}

export class TestResultsCharts extends ComponentBase.Component<ITestResultsChartsProps, ITestResultsChartsState> {

    public componentWillMount(): void {
        this._store = TestResultsChartsStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        return (
            <div className="testresults-analytics-report-view-chartsarea-container">
                <VisualHost>
                    <div className={css("testresults-analytics-report-view-chartsarea", this.props.cssClass || Utils_String.empty)}>
                    <TooltipHost content={Resources.TrendChartLabel}>
                        <LabelledContextualMenu
                            contextualMenuClassName="metric-selector"
                            optionsCssClassName="metric-options-selector"
                            options={this._convertToContextualMenuItemArray(this.state.metricsOptions)}
                            selectedOptionsText={this.state.metricsOptions[this.state.metricSelected]}
                            contextualMenuAriaLabel={Utils_String.format(Resources.TrendChartMetricSelectedAriaLabel, this.state.metricsOptions[this.state.metricSelected])}
                            onChange={this._onMetricChanged}
                        />
                    </TooltipHost>

                        {!(this.state.chartOptions) && <Spinner className="testresults-analytics-report-view-loadingspinner" size={SpinnerSize.large} />}
                        {this.state.chartOptions && <ChartComponent chartOptions={this.state.chartOptions} />}
                    </div>
                </VisualHost>
            </div>
        );
    }

    private _convertToContextualMenuItemArray(options: IDictionaryNumberTo<string>): IContextualMenuItem[] {
        return Object.keys(options).map(k => ({ key: k, name: options[k] } as IContextualMenuItem));
    }

    private _onMetricChanged = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        if (this.props.onTrendChartMetricChanged) {
            this.props.onTrendChartMetricChanged(Number(item.key));
        }
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _store: TestResultsChartsStore;
}