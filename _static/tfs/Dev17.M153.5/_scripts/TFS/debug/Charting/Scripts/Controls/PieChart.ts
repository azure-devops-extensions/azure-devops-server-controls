/// <reference types="jquery" />
import * as Highcharts from "highcharts";

import Base_Controls = require("Charting/Scripts/Controls/ChartControlBase");
import Charting_Contracts = require("Charting/Scripts/Contracts");

/** ATTENTION: Everything in this file is obsolete, and awaiting removal of downstream internal consumers for removal. Use New platform vss-charts. */

export class PieChartOptionsConverter extends Base_Controls.OptionsConverter {

    constructor(options: Charting_Contracts.PieChartOptions) {
        super(options);
        this._chartOptions = options;
    }

    public convert(): Highcharts.Options {

        var options = super.convert();

        options.chart = this.getChartElementOptions();

        options.plotOptions = <Highcharts.PlotOptions>{
            pie: <Highcharts.PieChart>{
                dataLabels: this._chartOptions.dataLabelOptions || { enabled: true },
                innerSize: this._chartOptions.innerSizePercentage,
                size: this._chartOptions.size || '100%',
                animation: false,
                states: {
                    hover: {
                        enabled: this._chartOptions.enableHover !== false
                    }
                }
            }
        };

        options.series = <Highcharts.IndividualSeriesOptions[]>[{
            data: this.convertData(this._chartOptions.data),
        }];

        options.tooltip = <Highcharts.TooltipOptions>this._chartOptions.tooltipOptions || { enabled: true };

        super.initializePlotEvents(options.plotOptions.pie);
        return options;
    }
    
    public convertData(data: Charting_Contracts.PieChartDataPoint[]): Highcharts.DataPoint[] {
        return <Highcharts.DataPoint[]>$.map(data, (datum: Charting_Contracts.PieChartDataPoint) => {
            return <Highcharts.DataPoint>{
                name: datum.name,
                color: datum.color,
                y: datum.value
            };
        });
    }

    protected getChartElementOptions(): Highcharts.ChartOptions {
        let options = super.getChartElementOptions();
        return $.extend(options, <Highcharts.ChartOptions>{
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false,
            type: 'pie',
            animation: false,
            spacing: this._chartOptions.spacing || [0, 0, 0, 0],
            margin: this._chartOptions.margin || [0, 0, 0, 0]
        });
    }

    private _chartOptions: Charting_Contracts.PieChartOptions;
}


/** Highcharts based implementation of PieCharts */
export class PieChart extends Base_Controls.HighChartsControlBase<Charting_Contracts.PieChartOptions> {

    constructor(options: Charting_Contracts.PieChartOptions){
        super(options);
        this._optionsConverter = new PieChartOptionsConverter(options)
    }
    
    public update(data: Charting_Contracts.PieChartDataPoint[]) {
        super.getChartObject().series[0].setData(this._optionsConverter.convertData(data), true, true);
    }
    
    protected getChartOptionsConverter(): PieChartOptionsConverter {
        return this._optionsConverter;
    }

    private _optionsConverter: PieChartOptionsConverter;
}
