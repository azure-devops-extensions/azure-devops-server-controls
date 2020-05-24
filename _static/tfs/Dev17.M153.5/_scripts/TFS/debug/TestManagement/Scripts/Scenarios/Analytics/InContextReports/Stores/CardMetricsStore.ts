import { AnalyticsExceptionParsing, AnalyticsExceptionType, ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestResultsReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { TestReportDataParser } from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import { Store } from "VSS/Flux/Store";

export interface ICardMetricsState {
    testOutcomeMetricsData: CommonTypes.ICardMetricsData;
    topFailingTestsMetricData: CommonTypes.ICardMetricsData;
    errorText?: string;
}

export class CardMetricsStore extends Store {

    constructor(private _instanceId?: string) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string): CardMetricsStore {
        return FluxFactory.instance().get(CardMetricsStore, instanceId);
    }

    public static getKey(): string {
        return "CardMetricsStore";
	}

    public getState(): ICardMetricsState {
        return this._state;
    }

    public dispose(): void {
        this._actions.updateReportsWithConfigurationAction.removeListener(this._onUpdateConfiguration);
        this._actions.updateTestOutcomeMetricsAction.removeListener(this._onUpdateTestOutcomeMetrics);
        this._actions.updateTopFailingTestsMetricAction.removeListener(this._onUpdateTopFailingTestsMetric);
        this._actions.onError.removeListener(this._onError);
    }

    private _initialize(): void {
        this._actions = TestResultsReportActions.getInstance(this._instanceId);
        this._state = {} as ICardMetricsState;

        this._actions.updateReportsWithConfigurationAction.addListener(this._onUpdateConfiguration);
        this._actions.updateTestOutcomeMetricsAction.addListener(this._onUpdateTestOutcomeMetrics);
        this._actions.updateTopFailingTestsMetricAction.addListener(this._onUpdateTopFailingTestsMetric);
        this._actions.onError.addListener(this._onError);
    }  

    private _onUpdateConfiguration = (confValues: CommonTypes.IReportConfiguration) => {
        this._state.testOutcomeMetricsData = null;        //This is done since after config change it will take time for data to come and component can show loading experience till then.
        this._state.topFailingTestsMetricData = null;
        this._state.errorText = null;
        this._confValues = Object.assign({}, confValues);

        this.emitChanged();
    }

    private _onUpdateTestOutcomeMetrics = (metricsData: CommonTypes.ICardMetricsData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, metricsData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._state.testOutcomeMetricsData = Object.assign({}, metricsData);
        //Convert percentage to display form
        this._state.testOutcomeMetricsData.passPercentage = TestReportDataParser.getPercentageInDisplayFormat(this._state.testOutcomeMetricsData.passPercentage as number);
        if (metricsData.totalCount === 0) {
            this._state.errorText = Resources.AnalyticsCardTestsNotFoundMessage;
        }

        this.emitChanged();
    }

    private _onUpdateTopFailingTestsMetric = (metricsData: CommonTypes.ICardMetricsData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, metricsData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._state.topFailingTestsMetricData = Object.assign({}, metricsData);

        this.emitChanged();
    }

    private _onError = (error: Error) => {
        this._state.errorText = ErrorParser.stringifyODataError(error);
        if (AnalyticsExceptionParsing.recognizeAnalyticsException(error) === AnalyticsExceptionType.DataNotReady) {
            this._state.errorText = Resources.AnalyticsUnavailableCardMetricsSuggestion;
        } else {
            this._state.errorText = ErrorParser.stringifyODataError(error);
        }
        this.emitChanged();
    }

    private _actions: TestResultsReportActions;
    private _state: ICardMetricsState;
    private _confValues: CommonTypes.IReportConfiguration;
}