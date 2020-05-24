import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Common from "TestManagement/Scripts/Scenarios/Common/Common";
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import * as Utils_String from "VSS/Utils/String";

export abstract class ChartSeries {
    constructor(protected _data: number[], protected _additionalData?: { data1: string, data2: string } /* Additional data type is fixed which may not be true with all series implementor. */) {       
    }

    public abstract get name(): string;

    public abstract get values(): number[];

    public abstract get color(): string;

    public get minValue(): number {
        return 0;
    }

    public get maxValue(): number {
        return null;
    }

    public get allowDecimal(): boolean {
        return false;
    }
}

export class PassPercentSeries extends ChartSeries {
    public get maxValue(): number {
        return 100;
    }

    public get allowDecimal(): boolean {
        return true;
    }

    public get name(): string {
        return Resources.PassRate;
    }

    public get color(): string {
        return Common.TestReportColorPalette.Passed;
    }

    public get values(): number[] {
        return this._data.map(d => {
            return CommonUtils.TestReportDataParser.getCustomizedDecimalValue(d as number, 2);
        });        
    }
}

export class PassedTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.TestOutcome_Passed);
    }

    public get color(): string {
        return Common.TestReportColorPalette.Passed;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class FailedTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.TestOutcome_Failed);
    }

    public get color(): string {
        return Common.TestReportColorPalette.Failed;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class InconclusiveTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.TestOutcome_Inconclusive);
    }

    public get color(): string {
        return Common.TestReportColorPalette.OtherOutcome;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class AbortedTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.TestOutcome_Aborted);
    }

    public get color(): string {
        return Common.TestReportColorPalette.Failed;        //Keeping same as failed
    }

    public get values(): number[] {
        return this._data;
    }
}

export class NotExecutedTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.TestOutcome_NotExecuted);
    }

    public get color(): string {
        return Common.TestReportColorPalette.OtherOutcome;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class ErrorTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.TestOutcome_Error);
    }

    public get color(): string {
        return Common.TestReportColorPalette.Failed;        //Keeping same as failed
    }

    public get values(): number[] {
        return this._data;
    }
}

export class NotImpactedTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.TestOutcome_NotImpacted);
    }

    public get color(): string {
        return Common.TestReportColorPalette.NotImpacted;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class OtherOutcomeTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.OthersText);
    }

    public get color(): string {
        return Common.TestReportColorPalette.OtherOutcome;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class MultipleOutcomeTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Utils_String.format(Resources.MultipleOptionsSelectedText, this._additionalData.data1, this._additionalData.data2));
    }

    public get color(): string {
        return Common.TestReportColorPalette.TotalTests;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class TotalTestsSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.format(Resources.OutcomeResultCountText, Resources.AllText);
    }

    public get color(): string {
        return Common.TestReportColorPalette.TotalTests;
    }

    public get values(): number[] {
        return this._data;
    }
}

export class DurationSeries extends ChartSeries {
    public get name(): string {
        return Utils_String.localeFormat(Resources.DurationSeriesLabel, Resources.UnitInSeconds);
    }

    public get color(): string {
        return Common.TestReportColorPalette.Duration;
    }

    public get allowDecimal(): boolean {
        return true;
    }

    public get values(): number[] {
        return this._data.map(d => {
            return CommonUtils.TestReportDataParser.getCustomizedDecimalValue(d as number, 2);
        }); 
    }
}