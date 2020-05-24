import * as Chart_Contracts from "Charts/Contracts";
import { ChartOptionFactoryBase } from "Widgets/Scripts/ModernWidgetTypes/ChartOptionFactoryBase";
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';

export interface MonteCarloChartClickInfo {
    completeDate: string;
    numIterations: number;
}

export interface MonteCarloChartInputs {
    /** Whether the chart should animate or not */
    suppressAnimations?: boolean;
    /**
     * The dates of the aggregation of the simulaton results.
     * The array is ordered by the dates from earliest to latest.
     */
    sampleDates: string[];
    /** 
     * Aggregation of the number of iterations resulting in each day
     */
    simulationCounts: number[];
    /**
     *  Data points for the statistical probabilities line: the probabilities
     *  that the tasks will be done by the end of this day
     */
    probabilityOfCompletion: number[];
    /**
     *  Whether the statistical probabilities line should be rendered
     */
    showStatisticalProbabilities: boolean;
    /**
     * The handler for clicking the chart.
     */
    onClick: (clickInfo: MonteCarloChartClickInfo) => void;
    /**
     * Boolean flag indicting if the parent dashboard is currently embedded
     */
    allowChartClicks: boolean;
}

export class MonteCarloChartOptionFactory extends ChartOptionFactoryBase<MonteCarloChartInputs> {

    public createChartOptions(featureChartData: MonteCarloChartInputs): Chart_Contracts.CommonChartOptions {
        let options = {
            chartType: Chart_Contracts.ChartTypesConstants.ColumnLine,
            series: [],
            xAxis: { 
                labelValues: featureChartData.sampleDates,
            },
            yAxis: { 
                endOnTick: true, 
                title: WidgetResources.MonteCarloWidget_SimulationLabel },
            specializedOptions: { chartTypes: [] },
            legend: {enabled: false },
            suppressAnimation: featureChartData.suppressAnimations
        } as Chart_Contracts.CommonChartOptions;

        if (featureChartData.allowChartClicks) {
            options.click = (clickEvent: Chart_Contracts.ClickEvent) => this._handleClick(clickEvent, featureChartData);
        }

        let columnSeries: Chart_Contracts.DataSeries[] = [];
        columnSeries.push(
            {name: WidgetResources.MonteCarloWidget_SimulationLabel, data: featureChartData.simulationCounts},
        );

        if (featureChartData.showStatisticalProbabilities) {
            columnSeries.push(
                {name: WidgetResources.MonteCarloWidget_yAxis2Label, 
                data: featureChartData.probabilityOfCompletion, 
                useSecondaryAxis: true});

            options.yAxisSecondary = {
                title: WidgetResources.MonteCarloWidget_yAxis2Label, 
                max: 100
            }
        }

        options.series.push(...columnSeries);

        return options;
    }

    /***
     * Interprets the chart click event details into semantically relevant format.
     * Note: this is made public for UT
     */
    public _handleClick(clickEvent: Chart_Contracts.ClickEvent, chartInputs: MonteCarloChartInputs): void {
        chartInputs.onClick({
            completeDate: clickEvent.labelName,
            numIterations: clickEvent.itemY 
        });
    }
}