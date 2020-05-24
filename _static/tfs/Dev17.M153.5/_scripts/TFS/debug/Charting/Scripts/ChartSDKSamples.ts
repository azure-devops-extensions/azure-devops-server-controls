
import Q = require("q");

import Core_Contracts = require("TFS/Core/Contracts");

import Controls = require("VSS/Controls");
import Locations = require("VSS/Locations");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import VSS_Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");

import Chart_Contracts = require("Charts/Contracts");
import Chart_Controls = require("Charts/Controls");

export class ChartSDKWidgetSettings {
    public mode: ConfigMode;
    
    /* string representation of the options payload.*/
    public payload: string;

    // Parses settings, or pre-populates common defaults for use by both config and widget
    public static parseOrDefault(settingsData: string): ChartSDKWidgetSettings {
        if (settingsData != null && settingsData != "") {

            var widgetSettings = <ChartSDKWidgetSettings>JSON.parse(settingsData);
            if (widgetSettings != null) {
                return widgetSettings;
            }
        }
        //If we failed to obtain a proper settings object, spin up with empty state as default (for now).
        return <ChartSDKWidgetSettings>{
            mode: null,
            payload: null
        };
    }

    /** Stringify an Options Object for run-time editing by human in client UI. */
    public static stringifyForEdit(options: any): string {
        return JSON.stringify(options, null, ' ');
    }

    /** Stringify options string to prune out unneccessary whitespace. 
        Note: A malformed options payload can cause Exceptions, which are responsability of caller to handle.*/
    public static stringifyForStorage(options: string): string {
        var settingsObject = JSON.parse(options);
        return JSON.stringify(settingsObject);
    }

    public static WIDTH: any = "@width";
    public static HEIGHT: any = "@height";
    /** Apply host-driven details which depend on runtime state. */
    public static rehydrateOptionsObject(options: string, width: number, height: number, isFirstLoad: boolean): any {

        //Perform macro-substitution on existing properties.
        options = options.replace(ChartSDKWidgetSettings.WIDTH, width.toString());
        options = options.replace(ChartSDKWidgetSettings.HEIGHT, height.toString());

        var optionsObject = <any>JSON.parse(options);
        
        //Apply host options object over the existing chart settings.
        ChartOptionsFactories.applyHostOptions(optionsObject, width, height, isFirstLoad);
        return optionsObject;
    }
}


export enum ConfigMode {
    CommonChart_TCMJson,

    CommonChart_CFD,

    CommonChart_DemoPie,
    CommonChart_DemoBar,
    CommonChart_DemoStackedBar,
    CommonChart_DemoColumn,
    CommonChart_DemoHistogram,
    CommonChart_PivotTable,
    
    CommonChart_DemoLine,
    CommonChart_DemoArea,
    CommonChart_DemoStackedArea,

    CommonChart_DemoStackedColumn, //Used by Test Results Charting
    CommonChart_DemoHybrid, //Used by Test Results Charting
    CommonChart_DemoHtmlTable, //Used for screen reader support

    CommonChart_Scatter,
    CommonChart_AreaRange,
    CommonChart_Funnel,
    CommonChart_DemoGroupedStackedColumn // Used by Velocity Widget
}


export interface ConfigModeMetadata {
    name: string
    value: ConfigMode;

    //Factory for generating option payloads, using the current widget size
    optionFactory: () => any; //Creates an options payload for instantiating a chart
}

export class SDKWidgetContentProvider {

    /** Construct an array identified by the different modes with supplemental metadata*/
    public static getModeMetadata(): ConfigModeMetadata[] {
        return [
            {
                name: "ComboChart: Cumulative Flow",
                value: ConfigMode.CommonChart_CFD,
                optionFactory: ChartOptionsFactories.generateCfdAsComboOptions
            },
            {
                name: "ComboChart: TCM Durations",
                value: ConfigMode.CommonChart_TCMJson,
                optionFactory: ChartOptionsFactories.generateTestDurationsAsComboOptions
            },
            {
                name: "ComboChart: Demo Pie Chart",
                value: ConfigMode.CommonChart_DemoPie,
                optionFactory: ChartOptionsFactories.generateDemoPie
            },
            {
                name: "ComboChart: Demo Bar",
                value: ConfigMode.CommonChart_DemoBar,
                optionFactory: ChartOptionsFactories.generateDemoBar
            },
            {
                name: "ComboChart: Demo Stacked Bar",
                value: ConfigMode.CommonChart_DemoStackedBar,
                optionFactory: ChartOptionsFactories.generateDemoStackedBar
            },
            {
                name: "ComboChart: Demo Column",
                value: ConfigMode.CommonChart_DemoColumn,
                optionFactory: ChartOptionsFactories.generateDemoColumn
            },
            {
                name: "ComboChart: Demo Stacked Column",
                value: ConfigMode.CommonChart_DemoStackedColumn,
                optionFactory: ChartOptionsFactories.generateDemoStackedColumn
            },
            {
                name: "ComboChart: Demo Histogram",
                value: ConfigMode.CommonChart_DemoHistogram,
                optionFactory: ChartOptionsFactories.generateDemoHistogram
            },
            {
                name: "ComboChart: Demo Pivot Table (heatmap)",
                value: ConfigMode.CommonChart_PivotTable,
                optionFactory: ChartOptionsFactories.generateDemoPivotTable
            },
            {
                name: "ComboChart: Demo Line",
                value: ConfigMode.CommonChart_DemoLine,
                optionFactory: ChartOptionsFactories.generateDemoLine
            },
            {
                name: "ComboChart: Demo Area",
                value: ConfigMode.CommonChart_DemoArea,
                optionFactory: ChartOptionsFactories.generateDemoArea
            },
            {
                name: "ComboChart: Demo StackedArea",
                value: ConfigMode.CommonChart_DemoStackedArea,
                optionFactory: ChartOptionsFactories.generateDemoStackedArea
            },
            {
                name: "ComboChart: Demo Scatter",
                value: ConfigMode.CommonChart_Scatter,
                optionFactory: ChartOptionsFactories.generateDemoScatter
            },
            {
                name: "ComboChart: Demo AreaRange",
                value: ConfigMode.CommonChart_AreaRange,
                optionFactory: ChartOptionsFactories.generateAreaRange
            },
            {
                name: "ComboChart: Demo Funnel",
                value: ConfigMode.CommonChart_Funnel,
                optionFactory: ChartOptionsFactories.generateDemoFunnel
            },
            {
                name: "ComboChart: Demo Hybrid Chart",
                value: ConfigMode.CommonChart_DemoHybrid,
                optionFactory: ChartOptionsFactories.generateHybridChart
            },
            {
                name: "HtmlTableImplementation: Backing Renderer for Accessibility",
                value: ConfigMode.CommonChart_DemoHtmlTable,
                optionFactory: ChartOptionsFactories.generateAccessibleTable //Note: Any chart data is accepted for rendering by the html table, this just illustrates the option to turn it on.
            },
            {
                name: "ComboChart: StackedColumn Chart with grouping",
                value: ConfigMode.CommonChart_DemoGroupedStackedColumn,
                optionFactory: ChartOptionsFactories.generateDemoGroupedStackedColumn 

            }
        ];
    }

    public static findModeMetadata(configMode: ConfigMode): ConfigModeMetadata {
        var modeOptions = SDKWidgetContentProvider.getModeMetadata();
        var matches = modeOptions.filter((element: ConfigModeMetadata, idx: number) => {
            return element.value == configMode;
        });
        if (matches.length == 0) {
            throw new Error("No match could be found for the requested config metadata");
        }
        return matches[0];
    }


    public static renderOption($target: JQuery, chartSettings: ChartSDKWidgetSettings, isFirstLoad: boolean) {

        var options: any;

        var width = $target.width();
        var height = $target.height();
        
        // Get metadata describing how we will construct this chart.
        var modeMetadata = this.findModeMetadata(chartSettings.mode);

        // Re-hydrate the saved option payload for this chart to an object, using available space.
        var chartOptions = ChartSDKWidgetSettings.rehydrateOptionsObject(chartSettings.payload, width, height, isFirstLoad);
        var chart = Chart_Controls.create($target, chartOptions);
    }
}

export class ChartOptionsFactories {
    
    /**Ensure:
        1-control options object contains chart host options with sizing settings. 
        2-Animation behavior is suppressed, when *re-configuring* a chart.
        Allow pre-existing hard-coded settings to pass through. */
    public static applyHostOptions(controlOptions: any, width: number, height: number, isFirstLoad: boolean) {
        var chartOptions = (<Chart_Contracts.ChartOptions>controlOptions);
        var hostOptions = (chartOptions).hostOptions;
        if (hostOptions == null) {
            hostOptions = <Chart_Contracts.ChartHostOptions>{};
        }
        hostOptions = $.extend(<Chart_Contracts.ChartHostOptions> { width: width, height: height, }, hostOptions);


        chartOptions.hostOptions = hostOptions;

        chartOptions.click = (click: Chart_Contracts.ClickEvent) => {
            Dialogs.MessageDialog.showMessageDialog($("<div/>").append(
                "A click was detected element on this chart." +
                "<br/> Label: " + click.labelName +
                "<br/> Series: " + click.seriesName +
                "<br/> Position in series: " + click.itemX +
                "<br/> Item name: " + click.itemName +
                "<br/> Value: " + click.itemY));
        };

        if (isFirstLoad === false) {
            chartOptions.suppressAnimation = true;
        }
    }
    

    /** Snapshot from existing CFD chart options.*/
    public static getCfdSamples(): any[] {
        return [
            //Note: Traditional serialized CFD payload uses 5K to serialize to widget settings. Trimming Ready and PR sections to economize.

            { "date": "2016-02-22T07:59:59.000Z", "name": "Design", "value": 0 },
            { "date": "2016-02-24T07:59:59.000Z", "name": "Design", "value": 0 },
            { "date": "2016-02-26T07:59:59.000Z", "name": "Design", "value": 5 },
            { "date": "2016-02-29T07:59:59.000Z", "name": "Design", "value": 6 },
            { "date": "2016-03-02T07:59:59.000Z", "name": "Design", "value": 1 },
            { "date": "2016-03-04T07:59:59.000Z", "name": "Design", "value": 0 },
            { "date": "2016-03-07T07:59:59.000Z", "name": "Design", "value": 2 },
            { "date": "2016-03-09T07:59:59.000Z", "name": "Design", "value": 1 },
            { "date": "2016-03-11T07:59:59.000Z", "name": "Design", "value": 1 },
            { "date": "2016-02-22T07:59:59.000Z", "name": "Development", "value": 0 },
            { "date": "2016-02-24T07:59:59.000Z", "name": "Development", "value": 0 },
            { "date": "2016-02-26T07:59:59.000Z", "name": "Development", "value": 4 },
            { "date": "2016-02-29T07:59:59.000Z", "name": "Development", "value": 4 },
            { "date": "2016-03-02T07:59:59.000Z", "name": "Development", "value": 4 },
            { "date": "2016-03-04T07:59:59.000Z", "name": "Development", "value": 1 },
            { "date": "2016-03-07T07:59:59.000Z", "name": "Development", "value": 1 },
            { "date": "2016-03-09T07:59:59.000Z", "name": "Development", "value": 1 },
            { "date": "2016-03-11T07:59:59.000Z", "name": "Development", "value": 1 },
            { "date": "2016-02-22T07:59:59.000Z", "name": "Verification", "value": 0 },
            { "date": "2016-02-24T07:59:59.000Z", "name": "Verification", "value": 0 },
            { "date": "2016-02-26T07:59:59.000Z", "name": "Verification", "value": 2 },
            { "date": "2016-02-29T07:59:59.000Z", "name": "Verification", "value": 2 },
            { "date": "2016-03-02T07:59:59.000Z", "name": "Verification", "value": 1 },
            { "date": "2016-03-04T07:59:59.000Z", "name": "Verification", "value": 5 },
            { "date": "2016-03-07T07:59:59.000Z", "name": "Verification", "value": 2 },
            { "date": "2016-03-09T07:59:59.000Z", "name": "Verification", "value": 3 },
            { "date": "2016-03-11T07:59:59.000Z", "name": "Verification", "value": 5 },
            { "date": "2016-02-22T07:59:59.000Z", "name": "Ready to Deploy", "value": 0 },
            { "date": "2016-02-24T07:59:59.000Z", "name": "Ready to Deploy", "value": 0 },
            { "date": "2016-02-26T07:59:59.000Z", "name": "Ready to Deploy", "value": 0 },
            { "date": "2016-02-29T07:59:59.000Z", "name": "Ready to Deploy", "value": 0 },
            { "date": "2016-03-02T07:59:59.000Z", "name": "Ready to Deploy", "value": 1 },
            { "date": "2016-03-04T07:59:59.000Z", "name": "Ready to Deploy", "value": 1 },
            { "date": "2016-03-07T07:59:59.000Z", "name": "Ready to Deploy", "value": 3 },
            { "date": "2016-03-09T07:59:59.000Z", "name": "Ready to Deploy", "value": 4 },
            { "date": "2016-03-11T07:59:59.000Z", "name": "Ready to Deploy", "value": 4 },
            { "date": "2016-02-22T07:59:59.000Z", "name": "Done", "value": 0 },
            { "date": "2016-02-24T07:59:59.000Z", "name": "Done", "value": 0 },
            { "date": "2016-02-26T07:59:59.000Z", "name": "Done", "value": 1 },
            { "date": "2016-02-29T07:59:59.000Z", "name": "Done", "value": 1 },
            { "date": "2016-03-02T07:59:59.000Z", "name": "Done", "value": 13 },
            { "date": "2016-03-04T07:59:59.000Z", "name": "Done", "value": 14 },
            { "date": "2016-03-07T07:59:59.000Z", "name": "Done", "value": 15 },
            { "date": "2016-03-09T07:59:59.000Z", "name": "Done", "value": 15 },
            { "date": "2016-03-11T07:59:59.000Z", "name": "Done", "value": 17 }];
    }

    /*This is a non-native lazy data conversion from purpose specific CFD render format, to a general trend form. */
    public static generateCfdAsComboOptions(): Chart_Contracts.CommonChartOptions {
        var data = ChartOptionsFactories.getCfdSamples();
        var palette = ["#9CC3B2", "#339947", "#207752", "#BFD8CD", "#00643A", "#7CAF9A", "#8DC54B", "#56987D", "#60AF49"];
        
        //Here, we take a 1D tuple data set, and express it as nested array of series elements
        var series = [];
        var row = <Chart_Contracts.DataSeries>{};
        var xAxis = <Chart_Contracts.AxisOptions>{
            labelValues: [],
            title: null,
            labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth
        };

        //Now the re-packing of data happens. In this case, we know array layout, which bypasses some logic to safely determine identify bounds.
        var j = 0;
        for (var i = 0; i < data.length; i++) {
            //Extract distinct dates for the label values
            if (i < 9) {

                var date = new Date(data[i].date);
                xAxis.labelValues[i] = date;
            }
            // Create a new series with each distinct set of values.
            if (i % 9 == 0) {
                j++;
                row = <Chart_Contracts.DataSeries>{};
                row.name = data[i].name;
                row.data = [];
                row.color = palette[j % 9];
                series.push(row);
            }
            var value : number = data[i].value;
            row.data.push(value);
        }

        return {
            chartType: Chart_Contracts.ChartTypesConstants.StackedArea,
            legend: {
                enabled: false //Override default stacked presentation, by hiding legend.
            },
            tooltip: {
                onlyShowFocusedSeries: true
            },
            xAxis: xAxis,
            yAxis: <Chart_Contracts.AxisOptions>{
                title: "Backlog items count"
            },
            series: series.reverse() //Reverse the order - Build the series from the bottom up.
        };
    }


    /*This chart is different, in that it uses both a bar chart, and a line chart. */
    public static generateTestDurationsAsComboOptions(): Chart_Contracts.CommonChartOptions {
        var series = [];

        var durationTitle = "Duration (ms)";
        var totalTitle = "Total tests";

        //Note: The line chart is supplied *after* content which renders on the secondary Axis. This is significant, because it affects render order.
        //It looks very awkward to have line chart content overlaid by column chart content.
        var durationRow = <Chart_Contracts.DataSeries>{
            name: durationTitle,
            data: [1938443, 656, 1623919, 576, 576, 720, 593, 626, 810, 686],
            color: "#5DA5DA"
        };
        series.push(durationRow);

        var testCountRow = <Chart_Contracts.DataSeries>{
            name: totalTitle,
            data: [513, 11, 524, 11, 11, 11, 11, 11, 11, 11],
            color: "#B276B2",
            useSecondaryAxis: true
        };
        series.push(testCountRow);

        return {
            chartType: Chart_Contracts.ChartTypesConstants.ColumnLine,
            xAxis: <Chart_Contracts.AxisOptions>{
                labelValues: ["VSO.TRA.Master.CI_20160309.3", "VSO.TRA.Master.CI_20160309.4", "VSO.TRA.Master.CI_20160309.5", "VSO.TRA.Master.CI_20160309.6", "VSO.TRA.Master.CI_20160309.7", "VSO.TRA.Master.CI_20160309.8", "VSO.TRA.Master.CI_20160309.9", "VSO.TRA.Master.CI_20160309.10", "VSO.TRA.Master.CI_20160309.11", "VSO.TRA.Master.CI_20160309.12"],
                labelsEnabled: false
            },
            yAxis: <Chart_Contracts.AxisOptions>{
                title: durationTitle
            },
            yAxisSecondary: <Chart_Contracts.AxisOptions>{
                title: totalTitle,
                min: 0 //This is needed on secondary axis, otherwise, the chart will use the negative value of max value.
            },
            series: series
        };
    }

    public static generateDemoPie(): Chart_Contracts.CommonChartOptions {
        return {
            chartType: Chart_Contracts.ChartTypesConstants.Pie,
            specializedOptions: {
                showLabels: true,
                "size": 200 as any,
                "center": [null, 90]
            },
            series: [{ data: [4,3,2, 1,123,12, 53,23,12 ] }],
            xAxis: {
                labelValues: ["Pineapple",
                    "Orange you excited to use charts?",
                    "Mushy banana",

                    "A mighty coconut",
                    "A modest plum",
                    "A grand tomato",

                    "A friendly banana",
                    "A luminous strawberry",
                    "A delicious peach"]
            },
            legend: {
                limitLabelSize:true
            }
        };
    }


    private static makeRandomNumberArray(length: number, baseline: number = 0): number[] {
        var elements = [];
        for (var i = 0; i < length; i++) {
            elements.push(Math.round(Math.random() * (i + 3)) + baseline);
        }
        return elements;
    }

    private static makeDateArray(length: number): string[] {
        var elements = [];
        for (var i = 0; i < length; i++) {
            var date = "1/" + (i + 1) + "/2016";
            elements.push(date);
        }
        return elements;
    }

    private static makeFruitArray(): string[] {
        return ["Pineapple", "Orange", "Banana", "Coconut"];
    }

    public static generateDemoBar(): Chart_Contracts.CommonChartOptions {

        return {
            chartType: Chart_Contracts.ChartTypesConstants.Bar,
            series: [{
                name: "Fruit Eaten Today",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            }],
            xAxis: {
                labelValues: ChartOptionsFactories.makeFruitArray()
            }
        };
    }

    public static generateDemoStackedBar(): Chart_Contracts.CommonChartOptions {

        return {
            chartType: Chart_Contracts.ChartTypesConstants.StackedBar,
            series: [{
                name: "Steve",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            },
            {
                name: "Jane",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            },
            {
                name: "Aaron",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            }],
            xAxis: {
                labelValues: ChartOptionsFactories.makeFruitArray()
            }
        };
    }

    public static generateDemoColumn(): Chart_Contracts.CommonChartOptions {
        return {
            chartType: Chart_Contracts.ChartTypesConstants.Column,
            series: [{
                name: "Fruit Eaten Today",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            }],
            xAxis: {
                labelValues: ChartOptionsFactories.makeFruitArray()
            }
        };
    }

    public static generateDemoStackedColumn(): Chart_Contracts.CommonChartOptions {

        return {
            chartType: Chart_Contracts.ChartTypesConstants.StackedColumn,
            series: [{
                name: "Steve",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            },
            {
                name: "Jane",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            },
            {
                name: "Aaron",
                data: ChartOptionsFactories.makeRandomNumberArray(4)
            }],
            xAxis: {
                labelValues: ChartOptionsFactories.makeFruitArray()
            }
        };
    }


    public static generateDemoGroupedStackedColumn(): Chart_Contracts.CommonChartOptions {
        let stackedColumn = ChartOptionsFactories.generateDemoStackedColumn();
        stackedColumn.series[0].stackGroup = "Left";
        stackedColumn.series[1].stackGroup = "Right";
        stackedColumn.series[2].stackGroup = "Right";
        return stackedColumn;        
    }


    public static generateDemoLine(): Chart_Contracts.CommonChartOptions {
        var options: Chart_Contracts.CommonChartOptions = {
            chartType: Chart_Contracts.ChartTypesConstants.Line,
            series: [],
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: ChartOptionsFactories.makeDateArray(10)
            }
        };

        var names = ChartOptionsFactories.makeFruitArray();
        for (var i = 0; i < names.length; i++) {
            options.series.push({
                name: names[i],
                data: ChartOptionsFactories.makeRandomNumberArray(10, i)
            });
        }
        return options;
    }

    public static generateDemoArea(): Chart_Contracts.CommonChartOptions {
        return {
            chartType: Chart_Contracts.ChartTypesConstants.Area,
            series: [{
                name: "Banana Consumption",
                data: ChartOptionsFactories.makeRandomNumberArray(10)
            }],
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: ChartOptionsFactories.makeDateArray(10)
            }
        };
    }

    public static generateDemoStackedArea(): Chart_Contracts.CommonChartOptions {
        var options: Chart_Contracts.CommonChartOptions = {
            chartType: Chart_Contracts.ChartTypesConstants.StackedArea,
            series: [],
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: ChartOptionsFactories.makeDateArray(10)
            }
        };

        var names = ChartOptionsFactories.makeFruitArray();
        for (var i = 0; i < names.length; i++) {
            options.series.push({
                name: names[i],
                data: ChartOptionsFactories.makeRandomNumberArray(10)
            });
        }

        return options;
    }

    public static generateAccessibleTable(): Chart_Contracts.CommonChartOptions {
        var options = ChartOptionsFactories.generateDemoStackedArea();
        options.showAccessibleForm = true;
        return options;
    }

    public static generateHybridChart(): Chart_Contracts.CommonChartOptions {
        var options: Chart_Contracts.CommonChartOptions = {
            chartType: Chart_Contracts.ChartTypesConstants.Hybrid,
            series: [],
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: ChartOptionsFactories.makeDateArray(10)
            },
            yAxis: {
                title: "Line & area Plot"
            },
            yAxisSecondary: {
                title: "Bar Plots",
                "min": 0
            },
            specializedOptions: {
                chartTypes: [
                    Chart_Contracts.ChartTypesConstants.Area,
                    Chart_Contracts.ChartTypesConstants.Line,
                    Chart_Contracts.ChartTypesConstants.Column,
                    Chart_Contracts.ChartTypesConstants.Column
                ],
                includeMarkers: true
            }
        };

        var names = ChartOptionsFactories.makeFruitArray();
        for (var i = 0; i < names.length; i++) {
            options.series.push({
                name: names[i],
                data: ChartOptionsFactories.makeRandomNumberArray(10)
            });
        }

        //Apply special settings to the last two series
        options.series[2].color = "green";
        options.series[2].useSecondaryAxis = true;
        options.series[3].color = "red";
        options.series[3].useSecondaryAxis = true;

        return options;
    }

    public static generateDemoHistogram(): Chart_Contracts.CommonChartOptions {
        var series = [];
        var columnValues = <Chart_Contracts.DataSeries>{
            data: [
                43,
                { y: 30, color: "green" },
                { y: 28, color: "green" },
                { y: 40, color: "orange", name: "Bad build #1" },
                { y: 15, color: "orange", name: "Bad build #2" },
                { y: 22, color: "green"},
                { y: 11, color: "red" },
                { y: 41, color: "green" },
                { y: 25, color: "green" },
                { y: 40, color: "green" }
            ],
            name: "Test Durations (m)"
        };
        series.push(columnValues);

        return {
            chartType: Chart_Contracts.ChartTypesConstants.Histogram,
            xAxis: <Chart_Contracts.AxisOptions>{
                labelsEnabled: false,
                markingsEnabled: false
            },
            yAxis: <Chart_Contracts.AxisOptions>{
                labelsEnabled: false,
                markingsEnabled: false
            },
            hostOptions: { /* These options are hard-code to intentionally demonstrate a fixed-size small histogram. */
                width: 80,
                height: 80
            },
            tooltip: { enabled: false },
            series: series
        };
    }

    public static generateDemoPivotTable(): Chart_Contracts.CommonChartOptions {
        var data = <Chart_Contracts.DataSeries[]>[{
            name: "Pineapple",
            data: <any>[
                [0, 0, 26], [0, 1, 2], [0, 2, 26], [0, 3, 2],
                [1, 0, 8], [1, 1, 0], [1, 2, 2], [1, 3, 1],
                [2, 0, 0], [2, 1, 1], [2, 2, 2], [2, 3, 1],
            ]
        }];

        return <Chart_Contracts.CommonChartOptions>{
            chartType: Chart_Contracts.ChartTypesConstants.Table,
            xAxis: <Chart_Contracts.AxisOptions>{
                labelValues: ["Pineapple", "Orange", "Coconuts","Total"]
            },
            yAxis: <Chart_Contracts.AxisOptions>{
                labelValues: ["P0", "P1", "P2", "Total"]
            },
            series: [{
                name: "Pineapple",
                data: <any>[
                    [0, 0, 1], [0, 1, 2], [0, 2, 3]
                ]
            },
                {
                    name: "Orange",
                    data: <any>[
                        [1, 0, 4.0203], [1, 1, 5], [1, 2, 6]
                    ]
                },
                {
                    name: "Coconuts",
                    data: <any>[
                        [2, 0, 7], [2, 1, 8], [2, 2, 9]
                    ]
                },
                {
                    name: "Total",
                    data: <any>[
                        [3, 0, 12.0400001], [3, 1, 15], [3, 2, 18],
                        [0, 3, 6], [1, 3, 15], [2, 3, 24], 
                        [3, 3, 10]
                    ],
                    color: Chart_Contracts.ChartColorizer.Transparent
                }
            ]
        };
    }

    public static generateDemoScatter(): Chart_Contracts.CommonChartOptions {
        var series = [];
        var data1 = <Chart_Contracts.DataSeries>{
            name: "pineapple",
            color: "#F58B1F",
            data: [[1,5.1], [3, 6.6], [4, 8.7], [7, 9.2], [5, 4.7], [5, 3.1], [7, 9.2], [6, 4.3],
                [1, 2.1], [3, 3.6], [2, 8.1], [7, 1.2], [6, 2.7], [5, 3.4], [8, 9.5], [6, 5.3]]
        };
        var data2 = <Chart_Contracts.DataSeries>{
            name: "apple",
            color: "#F00",
            data: [[5, 3.8], [2, 6.7], [1, 8.7], [4, 2.5], [2, 5.5], [3, 6.2], [2, 5.7], [2, 4.6],
                [5, 2.8], [2, 4.7], [2, 5.7], [1, 2.5], [0, 5.6], [2, 5.2], [5, 2.7], [9, 3.6]]
        };
        series.push(data1);
        series.push(data2);

        var options: Chart_Contracts.CommonChartOptions = {
            chartType: Chart_Contracts.ChartTypesConstants.Scatter,
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: ChartOptionsFactories.makeDateArray(10)
            },
            series: series,
        };

        return options;
    }

    public static generateAreaRange(): Chart_Contracts.CommonChartOptions {
        // Date from 1/1/2016 ~ 1/10/2016 in UTC format
        var ranges = [
            [14.3, 27.7],
            [14.5, 27.8],
            [15.5, 29.6],
            [16.7, 30.7],
            [16.5, 25.0],
            [17.8, 25.7],
            [13.5, 24.8],
            [10.5, 21.4],
            [9.2, 23.8],
            [11.6, 21.8]
        ];
        var options: Chart_Contracts.CommonChartOptions = {
            chartType: Chart_Contracts.ChartTypesConstants.AreaRange,
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: ChartOptionsFactories.makeDateArray(10)
            },
            series: [{
                name: "Range",
                data: ranges,
                color: "#D0D0D0",
            }],
            legend: {
                enabled: false
            }
        };
        
        return options;
    }

    public static generateDemoFunnel(): Chart_Contracts.CommonChartOptions {
        const data: Chart_Contracts.Datum[] = [5, 2, 3, 4, 1] as Chart_Contracts.Datum[];

        const options: Chart_Contracts.CommonChartOptions = {
            chartType: Chart_Contracts.ChartTypesConstants.Funnel,
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.Textual,
                labelValues: ["pen", "pineapple", "apple", "pen"]
            },
            series: [{
                name: "Funnel Data",
                data: data
            }],
            legend: {
                enabled: false
            },
            specializedOptions: {
                neckHeight: "10%",
                neckWidth: "15%",
                height: "50%",
                width: "50%"
            } as Chart_Contracts.FunnelChartOptions
        };
        
        return options;
    }
}