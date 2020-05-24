import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Utils_String from "VSS/Utils/String";

export class ReportConfigurationDefinition {
    constructor() {
        this._outcomes = new OutcomeConfigurationProps();
        this._groupBy = new GroupByConfigurationProps();
        this._period = new PeriodConfigurationProps();
        this._chartMetrics = new ChartMetricProps();
    }

    public getDefaultConfigurationValues(contextType: TCMContracts.TestResultsContextType): CommonTypes.IReportConfiguration {
        return {
            groupBy: CommonTypes.GroupBy.None,
            trendBy: CommonTypes.TrendBy.Days,
            period: CommonTypes.Period.Days_14,
            outcomes: [CommonTypes.TestOutcome.Failed],
            configuredFilters: contextType === TCMContracts.TestResultsContextType.Build ?
                {
                    [CommonTypes.Filter.Workflow]: {
                        values: [new FilterValueItem(CommonTypes.Workflow.Build.toString(), (new WorkflowConfigurationProps).options[CommonTypes.Workflow.Build])]
                    }
                }
                : {}
        };
    }

    public get defaultChartMetricValue(): CommonTypes.Metric {
        return CommonTypes.Metric.ResultCountAndPassRate;
    }

    public get defaultDetailedTestListSortedColumn(): CommonTypes.IDetailedListColumn {
        return {
            column: CommonTypes.ColumnIndices.FailedCount,
            sortOrder: CommonTypes.SortOrder.Descending
        };
    }

    public getOutcomeConfigurationProps(): CommonTypes.IConfigurationProps {
        return this._outcomes;
    }

    public getGroupByConfigurationProps(): CommonTypes.IConfigurationProps {
        return this._groupBy;
    }

    public getPeriodConfigurationProps(): CommonTypes.IConfigurationProps {
        return this._period;
    }

    public getChartMetricsProps(): CommonTypes.IConfigurationProps {
        return this._chartMetrics;
    }

    private _outcomes: OutcomeConfigurationProps;
    private _groupBy: GroupByConfigurationProps;
    private _period: PeriodConfigurationProps;
    private _chartMetrics: ChartMetricProps;
}

export class TestInsightsConfigurationDefinition {
    constructor() {
        this._period = new PeriodConfigurationProps();
    }

    public defaultConfigurationValues(contextType: TCMContracts.TestResultsContextType): CommonTypes.IReportConfiguration {
        return {
            groupBy: null,
            trendBy: CommonTypes.TrendBy.Days,
            period: CommonTypes.Period.Days_14,
            outcomes: null,
            configuredFilters: null
        };
    }

    public getPeriodConfigurationProps(): CommonTypes.IConfigurationProps {
        return this._period;
    }
    
    private _period: PeriodConfigurationProps;
}

export abstract class ConfigurationProps implements CommonTypes.IConfigurationProps {
    constructor() {
        this._options = [];

        this._initializeOptions();
    }

    public get options() {
        return this._options;
    }

    protected abstract _initializeOptions();

    protected _options: IDictionaryNumberTo<string>;
}

export class WorkflowConfigurationProps extends ConfigurationProps {
    protected _initializeOptions() {
        this._options[CommonTypes.Workflow.Build] = Resources.BuildLabel;
        this._options[CommonTypes.Workflow.Release] = Resources.ReleaseText;
    }
}

export class OutcomeConfigurationProps extends ConfigurationProps {
    protected _initializeOptions() {
        this._options[CommonTypes.TestOutcome.Passed] = Resources.TestOutcome_Passed;
        this._options[CommonTypes.TestOutcome.Failed] = Resources.TestOutcome_Failed;
        this._options[CommonTypes.TestOutcome.Inconclusive] = Resources.TestOutcome_Inconclusive;
        this._options[CommonTypes.TestOutcome.Aborted] = Resources.TestOutcome_Aborted;
        this._options[CommonTypes.TestOutcome.NotExecuted] = Resources.TestOutcome_NotExecuted;
        this._options[CommonTypes.TestOutcome.Error] = Resources.TestOutcome_Error;
        this._options[CommonTypes.TestOutcome.NotImpacted] = Resources.TestOutcome_NotImpacted;
    }
}

export class GroupByConfigurationProps extends ConfigurationProps {
    protected _initializeOptions() {
        this._options[CommonTypes.GroupBy.None] = Resources.DisplayTextNone;
        this._options[CommonTypes.GroupBy.Container] = Resources.TestFileText;
        this._options[CommonTypes.GroupBy.Owner] = Resources.FilterByOwner;
        this._options[CommonTypes.GroupBy.Priority] = Resources.PriorityText;
        this._options[CommonTypes.GroupBy.Environment] = Resources.Stage;
        this._options[CommonTypes.GroupBy.Branch] = Resources.BranchText;
        this._options[CommonTypes.GroupBy.TestRun] = Resources.TestRunText;
    }
}

export class PeriodConfigurationProps extends ConfigurationProps {
    protected _initializeOptions() {
        this._options[CommonTypes.Period.Days_7] = Utils_String.format(Resources.NoOfDaysFormatString, Resources.SevenNumberText);
        this._options[CommonTypes.Period.Days_14] = Utils_String.format(Resources.NoOfDaysFormatString, Resources.FourteenNumberText);
        this._options[CommonTypes.Period.Days_30] = Utils_String.format(Resources.NoOfDaysFormatString, Resources.ThirtyDays);
    }
}

export class ChartMetricProps extends ConfigurationProps {
    protected _initializeOptions() {
        this._options[CommonTypes.Metric.ResultCountAndPassRate] = Resources.ResultCountAndPassRateText;
        this._options[CommonTypes.Metric.ResultCount] = Resources.ResultCountText;
        this._options[CommonTypes.Metric.AvgDuration] = Resources.AverageDurationText;
    }
}

export class TrendChartOptions {
    public static readonly width: number = 1000;       //Pixels
    public static readonly height: number = 360;       //Pixels

    public static readonly maxStackedSeriesCount: number = 10;
}

export class AnalyticsExtension{
    public static readonly PublisherName: string = "ms";
    public static readonly ExtensionName: string = "vss-analytics";
    public static readonly MarketPlaceUrlForExtension: string = "https://go.microsoft.com/fwlink/?linkid=872654";
    public static readonly ImageExtensionNotInstalled: string = "axextension-not-installed.svg";
    public static readonly ImageDataNotReady: string = "data-not-ready.svg";
    public static readonly ImageTestResultsNotFound: string = "testresults-not-found.svg";
    public static readonly ImageInitializingTestResults: string = "initializing-test-results.svg";
    public static readonly ImageServiceError: string = "ServiceError.svg";
}

export class CommonFilters {
    public static readonly filtersCommonWithTestInsights = [
        CommonTypes.Filter.Workflow, 
        CommonTypes.Filter.Branch, 
        CommonTypes.Filter.Environment, 
        CommonTypes.Filter.TestRun
    ];

    /** Used by tests */
    public static readonly filtersDifferentFromTestInsights = [
        CommonTypes.Filter.Container
    ];
}
