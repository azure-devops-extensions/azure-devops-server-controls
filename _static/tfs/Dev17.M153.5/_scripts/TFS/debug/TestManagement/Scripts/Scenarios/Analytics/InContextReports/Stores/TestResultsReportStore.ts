import { AnalyticsExceptionParsing, AnalyticsExceptionType, ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { TestResultsReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Store } from "VSS/Flux/Store";

export interface ITestResultsReportState {
    testContext: CommonTypes.ITestContext;
    viewType: CommonTypes.ViewType;
    errorText?: string;
}

export class TestResultsReportStore extends Store {
    constructor(private _instanceId?: string) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string): TestResultsReportStore {
        return FluxFactory.instance().get(TestResultsReportStore, instanceId);
    }

    public static getKey(): string {
        return "TestResultsReportStore";
	}

    public getState(): ITestResultsReportState {
        return this._state;
    }

    public dispose(): void {
        this._actions.showTestInsightsViewAction.removeListener(this._onItemInvoked);
        this._actions.navigateBackToReportViewAction.removeListener(this._onNavigatingBackToReportView);
        this._actions.updateTestOutcomeMetricsAction.removeListener(this._onUpdateTestOutcomeMetrics);
        this._actions.onError.removeListener(this._onError);
        this._actions.updateConfigurationValuesAction.removeListener(this._onUpdateConfiguration);
    }

    private _initialize(): void {
        this._actions = TestResultsReportActions.getInstance(this._instanceId);

        this._state = {viewType: CommonTypes.ViewType.ReportView} as ITestResultsReportState;

        this._actions.showTestInsightsViewAction.addListener(this._onItemInvoked);
        this._actions.navigateBackToReportViewAction.addListener(this._onNavigatingBackToReportView);
        this._actions.updateTestOutcomeMetricsAction.addListener(this._onUpdateTestOutcomeMetrics);
        this._actions.onError.addListener(this._onError);
        this._actions.updateConfigurationValuesAction.addListener(this._onUpdateConfiguration);
    }

    private _onUpdateConfiguration = (confValues: CommonTypes.IReportConfiguration) => {
        this._state.viewType = CommonTypes.ViewType.ReportView;
        this.emitChanged();
    }

    private _onItemInvoked = (testContext: CommonTypes.ITestContext) => {
        this._state.viewType = CommonTypes.ViewType.TestInsightsReportView;
        this._state.testContext = testContext;
        this.emitChanged();
    }

    private _onNavigatingBackToReportView = () => {
        this._state.testContext = null;
        this._state.viewType = CommonTypes.ViewType.ReportView;
        this.emitChanged();
    }
    
    private _onUpdateTestOutcomeMetrics = (metricsData: CommonTypes.ICardMetricsData) => {
        //If total test count is zero, set viewType to NoDataView.
        if (metricsData.totalCount === 0)
        {
            this._state.viewType = CommonTypes.ViewType.NoTestDataView;
            this.emitChanged();
        }
    }

    private _onError = (error: Error) => {
        if (AnalyticsExceptionParsing.recognizeAnalyticsException(error) === AnalyticsExceptionType.DataNotReady) {
            this._state.viewType = CommonTypes.ViewType.DataNotReadyView;
        } else {
            this._state.viewType = CommonTypes.ViewType.ErrorView;
            this._state.errorText = ErrorParser.stringifyODataError(error);
        }

        this.emitChanged();
    }
    
    private _state: ITestResultsReportState;
    private _actions: TestResultsReportActions;
}