import * as Charts_Contracts from "Charts/Contracts";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestResultsReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActions";
import { TrendChartHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TrendChartHelper";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { DurationNormalizer } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/DurationUtility";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { MetadataStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/MetadataStore";
import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";

export interface ITestResultsChartsState {
    metricsOptions: IDictionaryNumberTo<string>;
    metricSelected: CommonTypes.Metric;
    chartOptions: Charts_Contracts.CommonChartOptions;
}

export class TestResultsChartsStore extends Store {

    constructor(private _instanceId?: string) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string): TestResultsChartsStore {
        return FluxFactory.instance().get(TestResultsChartsStore, instanceId);
    }

    public static getKey(): string {
        return "TestResultsChartsStore";
	}

    public getState(): ITestResultsChartsState {
        return this._state;
    }

    public dispose(): void {
        this._actions.updateReportsWithConfigurationAction.removeListener(this._onUpdateConfiguration);
        this._actions.updateTrendChartMetricAction.removeListener(this._onUpdateTrendChartMetric);
        this._actions.updateTrendChartAction.removeListener(this._onUpdateTrendChart);
    }

    private _initialize(): void {
        this._actions = TestResultsReportActions.getInstance(this._instanceId);

        this._reportConfigurationDef = new Definitions.ReportConfigurationDefinition();
        this._state = {
            metricsOptions: this._reportConfigurationDef.getChartMetricsProps().options,
            metricSelected: this._reportConfigurationDef.defaultChartMetricValue
        } as ITestResultsChartsState;

        this._actions.updateReportsWithConfigurationAction.addListener(this._onUpdateConfiguration);
        this._actions.updateTrendChartMetricAction.addListener(this._onUpdateTrendChartMetric);
        this._actions.updateTrendChartAction.addListener(this._onUpdateTrendChart);
    }    

    private _onUpdateConfiguration = (confValues: CommonTypes.IReportConfiguration) => {
        this._state.chartOptions = null;        //This is done since after config change it will take time for data to come and component can show loading experience till then.
        this._confValues = Object.assign({}, confValues);

        //Based on group by update metric for chart. With groupBy not None: Result count and pass rate not supported.
        switch (this._confValues.groupBy) {
            case CommonTypes.GroupBy.None:
                this._state.metricsOptions = this._reportConfigurationDef.getChartMetricsProps().options;
                break;
            case CommonTypes.GroupBy.Container:
            case CommonTypes.GroupBy.Owner:
            case CommonTypes.GroupBy.Priority:
            case CommonTypes.GroupBy.Environment:
            case CommonTypes.GroupBy.Branch:
            case CommonTypes.GroupBy.TestRun:
                let metricOptions: IDictionaryNumberTo<string> = {};
                let allMetricOptions = this._reportConfigurationDef.getChartMetricsProps().options;
                Object.keys(allMetricOptions).forEach(k => {
                    if (k !== CommonTypes.Metric.ResultCountAndPassRate.toString()) {
                        metricOptions[Number(k)] = allMetricOptions[k];
                    }
                });

                this._state.metricsOptions = metricOptions;

                //Update selected metric if it is not supported with groupBy
                if (this._state.metricSelected === CommonTypes.Metric.ResultCountAndPassRate) {
                    this._state.metricSelected = CommonTypes.Metric.ResultCount;
                }
                break;
        }

        this.emitChanged();
    }

    private _onUpdateTrendChartMetric = (selectedMetric: CommonTypes.Metric) => {
        this._state.chartOptions = null;
        this._state.metricSelected = selectedMetric;
        this.emitChanged();
    }

    private _onUpdateTrendChart = (trendChartHelper: TrendChartHelper) => {
        let chartData: CommonTypes.ITrendChartData = trendChartHelper.getChartData();

        if (this._confValues && !(Utility.areConfValuesEqual(this._confValues, chartData.confValues) &&
            chartData.metricSelected === this._state.metricSelected)) {
            // Do not update store as the configuration has changed.
            return;
        }

        if (this._confValues && this._confValues.groupBy && this._confValues.groupBy === CommonTypes.GroupBy.Environment) {
            let releaseEnvironmentDefinitionIdToNameMap = MetadataStore.getInstance().getReleaseEnvironmentDefinitionIdToNameMap();
            let primaryChartData: IDictionaryStringTo<CommonTypes.ITrendChartAggregateData[]> = chartData.primaryChartData;            
            let updatedChartData: IDictionaryStringTo<CommonTypes.ITrendChartAggregateData[]> = {};
            Object.keys(primaryChartData).forEach(k => {
                let key: string = k && releaseEnvironmentDefinitionIdToNameMap && releaseEnvironmentDefinitionIdToNameMap[k] ? 
                                    releaseEnvironmentDefinitionIdToNameMap[k] : Utility.getDeletedEnvironmentDefIdDisplayString(k);
                updatedChartData[key] = primaryChartData[k];
            });

            chartData.primaryChartData = updatedChartData;
            trendChartHelper.updateChartData(chartData);
        }

        let normalizedDuration: CommonTypes.INormalizedDuration;
        if (this._state.metricSelected === CommonTypes.Metric.AvgDuration) {
            normalizedDuration = this._updateAvgDurationChartData(trendChartHelper);
        }

        this._state.chartOptions = trendChartHelper.getChartOptions();        
        
        //Update chartOption: Primary Y - Axis Label after updating chart with data
        if (normalizedDuration) { 
            this._state.chartOptions.yAxis.title = this._getAvgDurationChartTitle(normalizedDuration.durationUnitString);

            //Update chartOptions: GroupBy None should reflect selected duration unit
            if (this._confValues && (this._confValues.groupBy === CommonTypes.GroupBy.None)) {
                this._state.chartOptions.series[0].name = normalizedDuration.durationUnitString ? 
                    this._getAvgDurationChartTitle(normalizedDuration.durationUnitString) : Utils_String.empty;
            }
        }
        
        this.emitChanged();
    }

    private _getAvgDurationChartTitle(durationUnitString: string): string {
        return Utils_String.localeFormat(Resources.DurationSeriesLabel, durationUnitString);
    }

    private _updateAvgDurationChartData(trendChartHelper: TrendChartHelper): CommonTypes.INormalizedDuration {
        let chartData: CommonTypes.ITrendChartData = trendChartHelper.getChartData();
        let updatedChartData: IDictionaryStringTo<CommonTypes.ITrendChartAggregateData[]> = {};    

        let durationNormalizationHelper = new  DurationNormalizer();
        let normalizedDuration: CommonTypes.INormalizedDuration;            
        let durationList: number[][] = [];
        
        let stackByToIndex: IDictionaryStringTo<number> = {};                
        let indexCount = 0;    
        
        Object.keys(chartData.primaryChartData).forEach(k => {
            stackByToIndex[k] = indexCount ++;
            durationList.push(chartData.primaryChartData[k].map(d => d.aggrValue));
            updatedChartData[k] = chartData.primaryChartData[k];
        });
        //Consider data flattening if groupBy is none (no stacking)
        let considerFlattened: boolean = (this._confValues.groupBy === CommonTypes.GroupBy.None);
        
        normalizedDuration = durationNormalizationHelper.normalizeDurations(durationList, considerFlattened);            
        
        if (normalizedDuration) {
            Object.keys(chartData.primaryChartData).forEach(k => {
                let updatedValues: number[] = normalizedDuration.durationValues[stackByToIndex[k]];
                for (let i = 0; i < updatedChartData[k].length; i++) {
                    updatedChartData[k][i].aggrValue = updatedValues[i];
                }
            });
        }
        chartData.primaryChartData = updatedChartData;
        trendChartHelper.updateChartData(chartData);

        return normalizedDuration;
    }
    
    private _actions: TestResultsReportActions;
    private _state: ITestResultsChartsState;
    private _confValues: CommonTypes.IReportConfiguration;
    private _reportConfigurationDef: Definitions.ReportConfigurationDefinition;
}