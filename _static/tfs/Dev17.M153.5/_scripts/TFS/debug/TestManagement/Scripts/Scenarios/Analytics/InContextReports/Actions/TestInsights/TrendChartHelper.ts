import * as Charts_Contracts from "Charts/Contracts";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { ChartsReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestInsights/ChartsReportSource";
import * as ChartSeries from "TestManagement/Scripts/Scenarios/Common/Charts/ChartSeries";
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";

import * as TCMContracts from "TFS/TestManagement/Contracts";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

export class TrendChartHelper {
    constructor(private _confValues: CommonTypes.IReportConfiguration) {
    }

    public updateChartData(data: CommonTypes.ITrendChartData) {
        this._chartData = data;
    }

    public getChartOptions(): Charts_Contracts.CommonChartOptions {
        if (!this._chartData) {
            return null;
        }

        //Fill in default values for period range which doesn't have data.
        this._adjustDataForEveryPeriod();

        return Object.assign(this._getChartOptions(), this._getOutcomeStackedChartOptions());
    }

    public getChartData(): CommonTypes.ITrendChartData  {
        return this._chartData;
    }

    private _adjustDataForEveryPeriod(): void {
        this._chartData.primaryChartData = this._adjustDataForAllStackBySeries(this._chartData.primaryChartData);
        this._chartData.secondaryChartData = this._adjustDataForAllStackBySeries({ [Utils_String.empty]: this._chartData.secondaryChartData })[Utils_String.empty];
    }

    private _adjustDataForAllStackBySeries(stackByToAggrMap: IDictionaryStringTo<CommonTypes.ITrendChartAggregateData[]>): IDictionaryStringTo<CommonTypes.ITrendChartAggregateData[]> {
        if (!stackByToAggrMap) {
            return stackByToAggrMap;
        }

        Object.keys(stackByToAggrMap).forEach(stackBy => {
            stackByToAggrMap[stackBy] = this._adjustDataForAllPeriod(stackByToAggrMap[stackBy]);
        });

        return stackByToAggrMap;
    }

    private _adjustDataForAllPeriod(data: CommonTypes.ITrendChartAggregateData[]): CommonTypes.ITrendChartAggregateData[] {
        if (!data || data.length <= 0) {
            return data;
        }

        //Creating dictionary of trend date
        let dataDayToAggrMap: IDictionaryStringTo<number> = {};
        data.forEach(d => {
            if (!dataDayToAggrMap[d.date]) {
                dataDayToAggrMap[d.date] = d.aggrValue;
            }
        });

        let periodDays: number = 0, dateDiff: number;
        switch (this._confValues.period) {
            case CommonTypes.Period.Days_7:
                periodDays = 7;
                break;
            case CommonTypes.Period.Days_14:
                periodDays = 14;
                break;
            case CommonTypes.Period.Days_30:
                periodDays = 30;
                break;
        }

        let dateStart: Date;
        switch (this._confValues.trendBy) {
            case CommonTypes.TrendBy.Days:
                dateDiff = 1;
                dateStart = Utils_Date.addDays(Utils_Date.shiftToUTC(new Date()), dateDiff * (-periodDays + 1), true);
                break;
            case CommonTypes.TrendBy.Weeks:
                dateDiff = 7;       //For weeks trendBy, period is # of weeks.
                dateStart = CommonUtils.TestReportDataParser.getWeekStartingDate(Utils_Date.addDays(Utils_Date.shiftToUTC(new Date()), dateDiff * (-periodDays + 1), true));
                break;
        }

        let adjustedData: CommonTypes.ITrendChartAggregateData[] = [];

        for (let eachDay = 1; eachDay <= periodDays; eachDay++) {
            let displayDate: string = Utils_Date.format(dateStart, "yyyy-MM-dd");       //Expect data by API to be coming in this format.
            if (dataDayToAggrMap.hasOwnProperty(displayDate)) {
                adjustedData.push({ date: displayDate, aggrValue: dataDayToAggrMap[displayDate] });
            }
            else {
                adjustedData.push({ date: displayDate, aggrValue: 0 });
            }

            //Increment day by one/seven depending upon trendBy.
            dateStart = Utils_Date.addDays(dateStart, dateDiff);
        }

        return adjustedData;
    }

    private _getChartOptions(): Charts_Contracts.ChartOptions {
        return {
            legend: { stackVertically: true },
            suppressAnimation: true
        } as Charts_Contracts.ChartOptions;
    }

    private _getOutcomeStackedChartOptions(): Charts_Contracts.CommonChartOptions {
        let primaryChartSeries: ChartSeries.ChartSeries = this._getPrimaryChartSeries([], null);
        let xAxisLabelValues: string[] = [];

        let dataSeries: Charts_Contracts.DataSeries[] = [];
        Object.keys(this._chartData.primaryChartData).forEach(stackBy => {
            primaryChartSeries = this._getPrimaryChartSeries(this._chartData.primaryChartData[stackBy].map(d => d.aggrValue), this._getOutcomeFromStackByValue(stackBy));

            dataSeries.push({ name: stackBy, color: primaryChartSeries.color, data: primaryChartSeries.values });                     

            //Getting any stackValue's data here
            if (xAxisLabelValues.length === 0) {
                xAxisLabelValues = this._chartData.primaryChartData[stackBy].map(d => d.date);
            }
        });

        return {
            chartType: Charts_Contracts.ChartTypesConstants.StackedColumn,
            xAxis: {
                labelFormatMode: Charts_Contracts.LabelFormatModes.Textual,
                labelsEnabled: true,
                labelValues: xAxisLabelValues
            },
            yAxis: {
                allowDecimals: primaryChartSeries.allowDecimal,
                labelFormatMode: Charts_Contracts.LabelFormatModes.Linear,
                labelsEnabled: true,
                markingsEnabled: false,
                title: Resources.ResultCountText,
                min: primaryChartSeries.minValue,
                max: primaryChartSeries.maxValue
            },
            yAxisSecondary: null,
            series: dataSeries
        } as Charts_Contracts.CommonChartOptions;
    }

    private _getPrimaryChartSeries(seriesData: number[], outcome: CommonTypes.TestOutcome): ChartSeries.ChartSeries {
        
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return new ChartSeries.FailedTestsSeries(seriesData);
            case CommonTypes.TestOutcome.Passed:
                return new ChartSeries.PassedTestsSeries(seriesData);
            case CommonTypes.TestOutcome.Inconclusive:
                return new ChartSeries.InconclusiveTestsSeries(seriesData);
            case CommonTypes.TestOutcome.Aborted:
                return new ChartSeries.AbortedTestsSeries(seriesData);
            case CommonTypes.TestOutcome.NotExecuted:
                return new ChartSeries.NotExecutedTestsSeries(seriesData);
            case CommonTypes.TestOutcome.NotImpacted:
                return new ChartSeries.NotImpactedTestsSeries(seriesData);
            case CommonTypes.TestOutcome.Error:
                return new ChartSeries.ErrorTestsSeries(seriesData);
            default:
                return new ChartSeries.OtherOutcomeTestsSeries(seriesData);
        }
    }

    private _getOutcomeFromStackByValue(stackBy: string): CommonTypes.TestOutcome {
        switch (stackBy) {
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Failed]:
                return CommonTypes.TestOutcome.Failed;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Passed]:
                return CommonTypes.TestOutcome.Passed;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Inconclusive]:
                return CommonTypes.TestOutcome.Inconclusive;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Aborted]:
                return CommonTypes.TestOutcome.Aborted;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.NotExecuted]:
                return CommonTypes.TestOutcome.NotExecuted;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.NotImpacted]:
                return CommonTypes.TestOutcome.NotImpacted;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Error]:
                return CommonTypes.TestOutcome.Error;
        }
        return null;
    }

    private _chartData: CommonTypes.ITrendChartData;
}