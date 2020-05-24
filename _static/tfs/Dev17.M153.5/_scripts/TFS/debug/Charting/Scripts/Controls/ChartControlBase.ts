/// <reference types="jquery" />
import * as Highcharts from "highcharts";

import Charting_Contracts = require("Charting/Scripts/Contracts");

import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");

 /** ATTENTION: Everything in this file is obsolete, and awaiting removal of downstream internal consumers for removal. Use New platform vss-charts. */

export class ChartControlBase<T extends Charting_Contracts.ChartOptions> extends Controls.Control<T> {
    /** Strongly typed Base for VSO Chart Controls. Replaces ChartBase,
        * providing for a clean eventing contract, and implementation agnostic support.
        */

    //Arbitrary: These defaults are relevant to Widget sizing.
    private static _defaultWidth: number = 312;
    private static _defaultHeight: number = 286;

    constructor(options: T) {
        super(options);
    }

    public initializeOptions(options: T) {
        super.initializeOptions($.extend({
            width: ChartControlBase._defaultWidth,
            height: ChartControlBase._defaultHeight
        }, options));
    }
}

/** Base class to encapsulate common functionality for the highcharts based controls */
// Once we move to Typescript 1.6, this should be made abstract.
export class HighChartsControlBase<T extends Charting_Contracts.ChartOptions> extends ChartControlBase<T>  {

    public initialize() {
        var optionsConverter = this.getChartOptionsConverter();
        var options = optionsConverter.convert();

        var $layoutContainer = $("<div />")
            .addClass("layout-container")
            .appendTo(this._element)
            .css("height", this._options.height)
            .css("width", this._options.width);

        options.chart.renderTo = $layoutContainer[0];
        this._chart = new Highcharts.Chart(options);
    }

    protected getChartObject(): Highcharts.ChartObject {
        return this._chart;
    }

    protected getChartOptionsConverter(): OptionsConverter {
        throw new Error("getChartOptionsConverted: Function should be over-ridden in the derived classes")
    }

    private _chart: Highcharts.ChartObject;
}

/** Encapsulates class that converts charting contracts to highchart options */
export class OptionsConverter {

    constructor(options: Charting_Contracts.ChartOptions) {
        this._options = options;
    }

    public convert(): Highcharts.Options {
        var highchartsOptions = <Highcharts.Options>{};
        highchartsOptions.title = { text: Utils_String.empty };
        highchartsOptions.credits = { enabled: false };
        highchartsOptions.exporting = <Highcharts.ExportingOptions>{ enabled: false };
        highchartsOptions.legend = this._getLegendOptions();
        highchartsOptions.chart = this.getChartElementOptions();
        this._initializeChartEvents(highchartsOptions.chart);
        return highchartsOptions;
    }

    protected getChartElementOptions(): Highcharts.ChartOptions {
        return <Highcharts.ChartOptions>{
            /** Since we wish to support HighContrast as well in VSTS, we are setting the background color
                value to null.
                If later, we find that more options are required to be exposed for 'chart' element, we can 
                add appropriate information in ChartOptions interface
                */
             backgroundColor: null
        };
    }

    protected initializePlotEvents(plotOptionsContainer: any) {
        plotOptionsContainer.events = <Highcharts.PlotEvents>{
            click: (event: Event) => {
                this._onClick(event, this);
            }
        };
    }

    private _initializeChartEvents(highChartOptions: Highcharts.ChartOptions) {
        highChartOptions.events = <Highcharts.ChartEvents>{
            click: (event: Event) => {
                this._onClick(event);
            }
        };
    }

    private _onClick(event: Event): void;
    private _onClick(event: any, source?: any): void;

    // We have defined event as "any" type because customData in event.point is not defined in the d.ts files and hence will get compilation error
    private _onClick(event: any, source?: any): void {
        if (source) {
            if ($.isFunction(this._options.onDataClick)) {
                this._options.onDataClick(<Charting_Contracts.ChartClickEventArgs>{
                    target: (event.currentTarget) ? event.currentTarget.name : undefined,
                    value: (event.point) ? event.point.y : undefined,
                    customData: (event.point) ? event.point.customData : undefined
                });
            }
        }
        else {
            /** Mediates click events for Feature scenario consumption.*/
            if ($.isFunction(this._options.onBodyClick)) {
                this._options.onBodyClick();
            }
        }
    }

    private _getLegendOptions(): Highcharts.LegendOptions {
        return <Highcharts.LegendOptions>{
            layout: (this._options.dataLabelOptions && this._options.dataLabelOptions.layout) ? this._options.dataLabelOptions.layout : 'horizontal',
            borderRadius: 0,
            borderWidth: 0
        };
    }

    private _options: Charting_Contracts.ChartOptions;
}
