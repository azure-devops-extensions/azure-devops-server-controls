///<amd-dependency path="jQueryUI/tabs"/>
/// <reference types="jquery" />
///<reference path='TFS.LoadTest.Highcharts.d.ts' />



import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import UICommonControls = require("Presentation/Scripts/TFS/TFS.Host.UI.Controls")
import LoadTestOM = require("LoadTest/Scripts/TFS.LoadTest");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Diag = require("VSS/Diag");
import Resources = require("LoadTest/Scripts/Resources/TFS.Resources.LoadTest");
import Menus = require("VSS/Controls/Menus");
import Grids = require("VSS/Controls/Grids");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import AdminSendMail = require("Admin/Scripts/TFS.Admin.SendMail");
import Telemetry = require("VSS/Telemetry/Services");

var delegate = Utils_Core.delegate;

var domElem = Utils_UI.domElem;

// FW link for feedback
var FEEDBACK_FWLINK = "https://go.microsoft.com/fwlink/?LinkID=511487";

// FW Link for Application behind firewall
var APP_BEHIND_FIREWALL = "https://go.microsoft.com/fwlink/?LinkId=511205";

// FW Link for Download Visual Studio Ultimate Trial
var DOWNLOAD_VISUALSTUDIOULTIMATE_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=517407";

// Fw Link for CLT Video 
var CLT_VIDEO_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=517408";

// Fw Link for CLT Learn More
var CLT_LEARN_MORE_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=517509";

var CLT_INPROGRESS_LEARN_MORE_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=519042";

// Fw Link for CLT Sample Project
var CLT_SAMPLE_PROJECT_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=518971";

var CLT_MULTI_URL_LEARN_MORE_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=521627";

var CLT_VIDEO_POSTER_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=521629";

var CLT_VIDEO_FWLINK = "https://go.microsoft.com/fwlink/?LinkId=521628";

var CLT_APP_METRICS_LINK = "https://go.microsoft.com/fwlink/?LinkId=521866";

/******************* Begin - LoadTestView and ViewModel *******************************/

export class ErrorHelper {
    public static showError(error) {
        alert(VSS.getErrorMessage(error));
    }
}

export class Helper {
    public static isNullOrUndefined(obj) {
        return obj === null || obj === undefined;
    }
}

export class IconHelper {

    public static getIconClassForStateAndSubState(state: LoadTestOM.TestRunState, subState: LoadTestOM.TestRunSubState): string {
        if (state === LoadTestOM.TestRunState.Completed) {
            if (subState === LoadTestOM.TestRunSubState.Success) {
                return "icon-tfs-build-status-succeeded";
            }
            else if (subState === LoadTestOM.TestRunSubState.PartialSuccess) {
                return "icon-tfs-build-status-partiallysucceeded";
            }
        }
        else if (state === LoadTestOM.TestRunState.Aborted) {
            return "icon-tfs-build-status-stopped";
        }
        else if (state === LoadTestOM.TestRunState.Error) {
            return "icon-tfs-build-status-failed";
        }
        else if (state === LoadTestOM.TestRunState.InProgress ||
            state === LoadTestOM.TestRunState.Stopping) {
            return "icon-play";
        }
        else if (state === LoadTestOM.TestRunState.Queued) {
            return "icon-tfs-build-status-queued";
        }
        else if (state === LoadTestOM.TestRunState.Pending) {
            return "icon-tfs-tcm-test-no-outcome";
        }

        return "";
    }
}


export class LoadTestView extends Navigation.NavigationView {

    public constructor(options?) {
        super(options);
        this._readLoadTestProperties();
        this._loadTestViewModel = new LoadTestViewModel();
        this._loadTestViewModel.onCurrentViewModelChanged = (viewModel) => {
            this._showCurrentView(viewModel);;
        }
    }

    public initialize() {
        super.initialize();
        this._hideHubTitle();
    }

    public initializeOptions(options?) {
        $.extend(options, {
            attachNavigate: true
        });

        super.initializeOptions(options);
    }

    public onNavigate(state) {
        this._loadTestViewModel.beginIntialize(state.runId, $.noop,
            (error) => {
                ErrorHelper.showError(error);
            });
    }

    private _readLoadTestProperties() {
        var $loadTestProperties = $(".load-test-global-properties");
        if ($loadTestProperties.length > 0) {
            this._propertyCache = Utils_Core.parseMSJSON($loadTestProperties.eq(0).html(), false);
        }
    }

    private _showCurrentView(viewModel: any) {
        if (viewModel instanceof StartNewLoadTestViewModel) {
            this._createStartNewLoadTestView(<StartNewLoadTestViewModel>viewModel);
        }
        else if (viewModel instanceof LoadTestProgressViewModel) {
            this._createInProgressView(<LoadTestProgressViewModel>viewModel);
        }
        else if (viewModel instanceof LoadTestResultViewModel) {
            this._createLoadTestResultView(<LoadTestResultViewModel>viewModel);
        }
    }

    private _hideHubTitle(): void {
        $(".hub-title").hide();
        $(".hub-content").css("top", "0px");
    }

    private _createStartNewLoadTestView(viewModel: StartNewLoadTestViewModel): void {
        Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "TrialHomePage", 1));
        this._emptyTopLevelContainers();
        this._$startNewLoadTestContainer.show();
        this._startNewLoadTestView = <StartNewLoadTestView>Controls.BaseControl.createIn(StartNewLoadTestView, this._$startNewLoadTestContainer, { viewModel: viewModel, properties: this._propertyCache });
    }

    private _createInProgressView(viewModel: LoadTestProgressViewModel): void {
        var historySvc = Navigation_Services.getHistoryService();
        var state = historySvc.getCurrentState();
        if (!state.runId) {
            historySvc.addHistoryPoint(null, { runId: viewModel.getRunId() });
        }
        var cidata: { [key: string]: any } = { "RunId": viewModel.getRunId(), "State": viewModel.getStateString(), "TrialPageStatus": "InProgress" };
        Telemetry.publishEvent(new Telemetry.TelemetryEventData("CLT-VSO", "TrialExperience", cidata));
        this._emptyTopLevelContainers();
        this._$loadTestProgressViewContainer.show();
        this._loadTestProgressView = <LoadTestProgressView>Controls.BaseControl.createIn(LoadTestProgressView, this._$loadTestProgressViewContainer, { viewModel: viewModel, properties: this._propertyCache });

        this._$loadTestInProgressNextSectionContainer.show();
        this._loadTestInProgressNextSectionView = <LoadTestInProgressNextSectionView>Controls.BaseControl.createIn(LoadTestInProgressNextSectionView, this._$loadTestInProgressNextSectionContainer);
    }

    private _createLoadTestResultView(viewModel: LoadTestResultViewModel): void {
        var cidata: { [key: string]: any } = { "RunId": viewModel.getRunId(), "State": viewModel.getStateString(), "TrialPageStatus": "Results" };
        Telemetry.publishEvent(new Telemetry.TelemetryEventData("CLT-VSO", "TrialExperience", cidata));
        this._emptyTopLevelContainers();
        this._$loadTestResultViewContainer.show();
        this._loadTestResultView = <LoadTestResultView>Controls.BaseControl.createIn(LoadTestResultView, this._$loadTestResultViewContainer, { viewModel: viewModel, properties: this._propertyCache });

        this._$loadTestNextSectionContainer.show();
        this._loadTestNextSectionView = <LoadTestNextSectionView>Controls.BaseControl.createIn(LoadTestNextSectionView, this._$loadTestNextSectionContainer, { viewModel: viewModel });
    }

    private _emptyTopLevelContainers() {

        if (!this._$startNewLoadTestContainer) {
            this._$startNewLoadTestContainer = this.getElement().find(".start-new-load-test-view");
        }

        if (!this._$loadTestResultViewContainer) {
            this._$loadTestResultViewContainer = this.getElement().find(".load-test-result-view");
        }

        if (!this._$loadTestProgressViewContainer) {
            this._$loadTestProgressViewContainer = this.getElement().find(".load-test-progress-view");
        }

        if (!this._$loadTestNextSectionContainer) {
            this._$loadTestNextSectionContainer = this.getElement().find(".load-test-right-pane-result-view");
        }

        if (!this._$loadTestInProgressNextSectionContainer) {
            this._$loadTestInProgressNextSectionContainer = this.getElement().find(".load-test-right-pane-inprogress-view");
        }

        this._$startNewLoadTestContainer.empty();
        this._$startNewLoadTestContainer.hide();
        this._$loadTestResultViewContainer.empty();
        this._$loadTestResultViewContainer.hide();
        this._$loadTestNextSectionContainer.empty();
        this._$loadTestNextSectionContainer.hide();
        this._$loadTestProgressViewContainer.empty();
        this._$loadTestProgressViewContainer.hide();
        this._$loadTestInProgressNextSectionContainer.empty();
        this._$loadTestInProgressNextSectionContainer.hide();
    }

    private _$startNewLoadTestContainer: JQuery;
    private _$loadTestProgressViewContainer: JQuery;
    private _$loadTestResultViewContainer: JQuery;
    private _$loadTestInProgressNextSectionContainer: JQuery;
    private _$loadTestNextSectionContainer: JQuery;

    private _loadTestResultView: LoadTestResultView;
    private _startNewLoadTestView: StartNewLoadTestView;
    private _loadTestProgressView: LoadTestProgressView;
    private _loadTestInProgressNextSectionView: LoadTestInProgressNextSectionView;
    private _loadTestNextSectionView: LoadTestNextSectionView;

    private _loadTestViewModel: LoadTestViewModel;
    private _propertyCache = {};
}

// Top-level object that co-ordinates b/w different view models.
export class LoadTestViewModel {

    public beginIntialize(runId: string, callback: IResultCallback, errorCallback: IErrorCallback) {
        if (!runId) {
            this._showStartNewLoadTestViewModel();
            if (callback) {
                callback();
            }
        }
        else {
            this._beginGetLoadTestResult(runId, (loadTestResult: LoadTestOM.ILoadTestRun) => {
                if (!LoadTestOM.LoadTestHelper.HasCompleted(loadTestResult)) {
                    this._showLoadTestProgressViewModel(loadTestResult);
                }
                else {
                    this._showLoadTestResultViewModel(loadTestResult);
                }

                if (callback) {
                    callback();
                }
            },
                (error) => {
                    if (errorCallback) {
                        errorCallback(error);
                    }

                    this._showStartNewLoadTestViewModel();
                });
        }
    }

    public onCurrentViewModelChanged: (viewModel: any) => void;

    private _beginGetLoadTestResult(runId: string, callback: IResultCallback, errorCallback: IErrorCallback) {
        var loadTestManager = LoadTestOM.LoadTestManager.getInstance();
        loadTestManager.beginGetLoadTestRun(runId, true, callback, errorCallback);
    }

    private _onLoadTestStartedHandler(result: LoadTestOM.ILoadTestRun) {
        this._showLoadTestProgressViewModel(result);
    }

    private _onLoadTestCompletedHandler(result: LoadTestOM.ILoadTestRun) {
        this._showLoadTestResultViewModel(result);
    }

    private _showStartNewLoadTestViewModel() {
        this._stopMonitoringLoadTest();

        this._startNewLoadTestViewModel = new StartNewLoadTestViewModel();
        this._startNewLoadTestViewModel.onLoadTestStarted = (result) => {
            this._onLoadTestStartedHandler(result);
        }

        this._currentViewModel = this._startNewLoadTestViewModel;
        this.onCurrentViewModelChanged(this._startNewLoadTestViewModel);
    }

    private _showLoadTestResultViewModel(result: LoadTestOM.ILoadTestRun) {

        this._stopMonitoringLoadTest();

        this._loadTestResultViewModel = new LoadTestResultViewModel(result);

        if (!(this._currentViewModel instanceof LoadTestResultViewModel)) {
            this._currentViewModel = this._loadTestResultViewModel;
            this.onCurrentViewModelChanged(this._loadTestResultViewModel);
        }
    }

    private _showLoadTestProgressViewModel(result: LoadTestOM.ILoadTestRun) {
        this._loadTestProgressViewModel = new LoadTestProgressViewModel(result);
        this._loadTestProgressViewModel.onLoadTestCompleted = (result) => {
            this._onLoadTestCompletedHandler(result);
        }

        this._currentViewModel = this._loadTestProgressViewModel;
        this.onCurrentViewModelChanged(this._loadTestProgressViewModel);
        this._loadTestProgressViewModel.Monitor();
    }

    private _stopMonitoringLoadTest() {
        if (this._currentViewModel instanceof LoadTestProgressViewModel) {
            (<LoadTestProgressViewModel>this._currentViewModel).StopMonitoring();
        }
    }

    private _startNewLoadTestViewModel: StartNewLoadTestViewModel;

    // For now maintain a single instance of progress and result view model. When we start supporting multiple 
    // load test results, maintain a dictionary of resultId and view models. 
    private _loadTestProgressViewModel: LoadTestProgressViewModel;
    private _loadTestResultViewModel: LoadTestResultViewModel;
    private _currentViewModel: any;
    private _propertyCache: any;

}

/******************* End - LoadTestView and ViewModel *******************************/


/******************* Begin - LoadTestProgressView and ViewModel *******************************/

export interface IProgress {
    progressPercent: number;
    progressText: string;
}

export class LoadTestResultViewModelBase {

    constructor(loadTestResult: LoadTestOM.ILoadTestRun) {
        this._loadTestResult = loadTestResult;
    }

    public getRunId(): string {
        return this._loadTestResult.Id;
    }

    public getState(): LoadTestOM.TestRunState {
        return this._loadTestResult.State;
    }

    public getSubState(): LoadTestOM.TestRunSubState {
        return this._loadTestResult.SubState;
    }

    public getStateString(): string {
        return LoadTestOM.LoadTestHelper.getStateString(this._loadTestResult.State);
    }

    public getSubStateString(): string {
        return LoadTestOM.LoadTestHelper.getSubStateString(this._loadTestResult.SubState);
    }

    public getTitle(): string {
        return Utils_String.localeFormat(Resources.ResultTitleFormatText, this._loadTestResult.Name, this._loadTestResult.RunNumber.toString());
    }

    // This is made public to ensure that it is accessible from sub-classes. This should never be 
    // accessed from outside.
    public _getLoadtestResult(): LoadTestOM.ILoadTestRun {
        return this._loadTestResult;
    }

    // This is made public to ensure that it is accessible from sub-classes. This should never be 
    // accessed from outside.
    public _setLoadtestResult(loadTestResult: LoadTestOM.ILoadTestRun): void {
        this._loadTestResult = loadTestResult;
    }

    private _loadTestResult: LoadTestOM.ILoadTestRun;
}

// Handle monitoring of load test result and reporting progress of a load test that is in progress.
export class LoadTestProgressViewModel extends LoadTestResultViewModelBase {

    public Monitor() {
        // Monitor load test result and report progress.
        var loadTestResult = this._getLoadtestResult();
        var isTestInRunningSubState = false;
        if (!LoadTestOM.LoadTestHelper.HasCompleted(loadTestResult) && this._monitorLoadTest) {

            if (loadTestResult.State === LoadTestOM.TestRunState.InProgress && (loadTestResult.SubState >= LoadTestOM.TestRunSubState.RunningTest)) {
                isTestInRunningSubState = true;
            }
            this._reportProgress(isTestInRunningSubState);

            Utils_Core.delay(this, 5000, () => {

                this._beginGetResult((loadTestResult: LoadTestOM.ILoadTestRun) => {

                    this._setLoadtestResult(loadTestResult);

                    // Call monitor again.
                    this.Monitor();
                },
                    (error) => {
                        ErrorHelper.showError(error);
                    });
            });

        }
        else {
            if (this.onLoadTestCompleted) {
                return this.onLoadTestCompleted(this._getLoadtestResult());
            }
        }

    }

    public StopMonitoring(): void {
        this._monitorLoadTest = false;
    }

    public beginStop(callback: IResultCallback, errorCallback: IErrorCallback) {
        // Stop load test.
    }

    private _beginGetResult(callback: IResultCallback, errorCallback: IErrorCallback) {
        LoadTestOM.LoadTestManager.getInstance().beginGetLoadTestRun(this._getLoadtestResult().Id, false, callback, errorCallback);
    }

    private _reportProgress(isTestInRunningSubState: boolean) {

        if (this.onprogressChanged) {
            var startDate: Date;
            var runDuration: number = 0;

            var loadTestRun: LoadTestOM.ILoadTestRun = this._getLoadtestResult();
            if (loadTestRun) {
                if (this._getLoadtestResult().RunSpecificDetails) {
                    runDuration = this._getLoadtestResult().RunSpecificDetails.Duration;
                }

                if (this._getLoadtestResult().ExecutionStartedDate) {
                    startDate = this._getLoadtestResult().ExecutionStartedDate
                }
            }
            this.onprogressChanged(isTestInRunningSubState, startDate, runDuration);
        }
    }

    public getLoadTestSummary(): IKeyValuePair[] {

        var keyValuePairs: IKeyValuePair[] = [];
        var testResult = this._getLoadtestResult();
        var url = testResult.Url;

        var loadDuration = (Helper.isNullOrUndefined(testResult.RunSpecificDetails) ||
            Helper.isNullOrUndefined(testResult.RunSpecificDetails.Duration)) ? "" :
            testResult.RunSpecificDetails.Duration.toString() + Resources.SecondsText;

        var startTimeText = Helper.isNullOrUndefined(testResult.StartedDate) ? "" :
            (testResult.StartedDate).toLocaleString();

        var vUserCount = (Helper.isNullOrUndefined(testResult.RunSpecificDetails) ||
            Helper.isNullOrUndefined(testResult.RunSpecificDetails.VirtualUserCount)) ? "" :
            testResult.RunSpecificDetails.VirtualUserCount.toString();

        var testOriginLocation = (Helper.isNullOrUndefined(testResult.LoadGenerationGeoLocations) || testResult.LoadGenerationGeoLocations.length === 0) ? Resources.DefaultTestOrigin : testResult.LoadGenerationGeoLocations[0].Location;

        if (testOriginLocation === "Default") {
            testOriginLocation = "";
        }

        keyValuePairs.push(this._getKeyValuePair(Resources.UrlLabelText, url));
        keyValuePairs.push(this._getKeyValuePair(Resources.LoadDurationText, loadDuration));
        keyValuePairs.push(this._getKeyValuePair(Resources.UserLoadText, vUserCount));

        keyValuePairs.push(this._getKeyValuePair(Resources.TestOriginatedFromText, testOriginLocation));
        keyValuePairs.push(this._getKeyValuePair(Resources.StartTimeText, startTimeText));
        return keyValuePairs;
    }

    private _getKeyValuePair(key: string, value: string): IKeyValuePair {
        return { key: key, value: value };
    }

    public onLoadTestCompleted: (loadTestResult: any) => void;

    public onprogressChanged: (isTestInRunningState: boolean, startTime: Date, runDuration: number) => void;

    private _monitorLoadTest: boolean = true;
}

export class LoadTestProgressView extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        this._createView();
        this._populateLoadTestResult(this._loadTestProgressViewModel);
    }

    public initializeOptions(options?) {
        super.initializeOptions(options);
        this._loadTestProgressViewModel = options.viewModel;
        this._properties = options.properties;
        this._loadTestProgressViewModel.onprogressChanged = (isTestInRunningSubState: boolean, startTime: Date, runDuration: number) => {
            this._onProgressChangedHandler(isTestInRunningSubState, startTime, runDuration);
        }
    }

    private _populateLoadTestResult(testResult: any) {
        this._populateTitle(testResult);
        this._$progressBar.progressbar({
            value: 0
        });
    }

    private _onProgressChangedHandler(isTestInRunningSubState: boolean, startTime: Date, runDuration: number) {
        this._populateTitle(this._loadTestProgressViewModel);
        this._populateResultSummary();
        if (this._$isTimerStated == false && isTestInRunningSubState) {
            this._startProgressBarAndTimer(runDuration, startTime);
            this._$isTimerStated = true;
        }
        if (this._loadTestProgressViewModel.getSubState() === LoadTestOM.TestRunSubState.RunningTest) {
            this._hideStatusProgressIcon();
        }
        if (this._loadTestProgressViewModel.getSubState() === LoadTestOM.TestRunSubState.CollectingResults) {
            this._showStatusProgressIcon();
        }

        if (this._loadTestProgressViewModel.getState() === LoadTestOM.TestRunState.InProgress && (this._loadTestProgressViewModel.getSubState() === LoadTestOM.TestRunSubState.RunningTest) && !this._loadTestGraphView.boolStartPlot) {
            this._loadTestGraphView.startPlot();
        }
    }

    private _hideStatusProgressIcon(): void {
        $(".load-test-progress-icon").hide();
    }

    private _showStatusProgressIcon(): void {
        $(".load-test-progress-icon").show();
    }

    private _createView(): void {
        this._createTitle();
        this._createProgressBar();
        this._createProgressTimer();
        var propertyName = "LoadTest.IsMailEnabled";
        if (this._properties.hasOwnProperty(propertyName) && this._properties[propertyName] === true) {
            this._createToolbar();
        }
        this._createLoadTestResultSummaryTable();
        this._populateResultSummary();
        this._createGraphSectionHeader();
        this._createLoadTestGraphView();
    }

    private _createTitle(): void {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-progress-title")).appendTo($element);
        this._title = <LoadTestResultTitle>Controls.BaseControl.createIn(LoadTestResultTitle, $container);
    }

    private _populateTitle(viewModel: LoadTestProgressViewModel) {
        this._title.setData({
            state: viewModel.getState(),
            title: viewModel.getTitle(),
            subState: viewModel.getSubState(),
            statusString: viewModel.getSubStateString() || viewModel.getStateString()
        });
    }

    private _createProgressBar(): void {
        var $element = this.getElement();
        this._$progressBar = $(domElem("div", "load-test-progress-bar")).appendTo($element);
        this._$progressBar.progressbar({
            max: 100,
            value: 0
        });
    }

    private _createProgressTimer(): void {

        var $element = this.getElement();
        this._$progressTimer = $(domElem("div", "load-test-progress-timer")).appendTo($element);
        this._$currentTime = $(domElem("span", "current-timer")).appendTo(this._$progressTimer);
        $(domElem("span", "seperator")).appendTo(this._$progressTimer).text("/");
        this._$endTime = $(domElem("span", "end-timer")).appendTo(this._$progressTimer).text("00:00");
        this._$currentTime.text("00:00");

    }

    private _startProgressBarAndTimer(runDuration: number, startTime: Date): void {
        if (this._$intervalTimer != null) {
            return;
        }
        var timerObj = this;
        this._$endTime.text(this._convertToTimeFormat(runDuration));
        this._$start = startTime;
        this._$intervalTimer = setInterval(function () { timerObj._updateProgress(runDuration); }, 1000);
    }

    private _updateProgress(runDuration: number): void {
        var presentDate = new Date();
        var timeElapsed = presentDate.getTime() - this._$start.getTime();
        if (timeElapsed < 0) {
            timeElapsed = 0;
        }
        var secondsElapsed = Math.round(timeElapsed / 1000);
        if (secondsElapsed > runDuration) {
            this._stopProgress();
            this._$progressBar.progressbar({ value: 100 });
            this._$currentTime.text(this._convertToTimeFormat(runDuration));
        }
        else {
            this._$currentTime.text(this._convertToTimeFormat(secondsElapsed));
            var newValue = Math.floor((secondsElapsed / runDuration) * 100);
            this._$progressBar.progressbar({ value: newValue });
        }
    }

    private _createToolbar() {
        var $element = this.getElement();
        var $toolbarContainer = $(domElem("div"))
            .addClass("load-test-result-toolbar")
            .addClass("toolbar")
            .addClass("hub-pivot-toolbar")
            .addClass("align-proper")
            .appendTo($element);

        this._loadTestResultsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbarContainer, {
            items: this._createToolbarItems(),
            getCommandState: delegate(this, this._getToolbarItemCommandState)
        });
        this._loadTestResultsToolbar.getElement();
    }

    private _getToolbarItemCommandState(cmd) {
        return Menus.MenuItemState.Disabled;
    }

    private _createToolbarItems(): any[] {
        var items = [];
        items.push({
            id: ToolbarCommandIds.emailResultsId,
            text: Resources.EmailTestReportText,
            title: Resources.EmailTestReportText,
            showText: true,
            icon: "icon-envelope"
        });

        return items;
    }

    private _createLoadTestResultSummaryTable() {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-result-details")).appendTo($element);
        this._loadTestResultSummaryTable = <LoadTestResultSummaryTable>Controls.BaseControl.createIn(LoadTestResultSummaryTable, $container);
    }

    private _populateResultSummary() {
        this._loadTestResultSummaryTable.setData(this._loadTestProgressViewModel.getLoadTestSummary());

    }

    private _createGraphSectionHeader() {
        var $element = this.getElement();
        $(domElem("div")).addClass("load-test-graph-section-header").appendTo($element).text(Resources.ApplicationPerformanceTitleText);
    }

    private _createLoadTestGraphView() {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-graph-view")).appendTo($element);
        this._loadTestGraphView = <LoadTestGraphView>Controls.BaseControl.createIn(LoadTestGraphView, $container, { viewModel: this._loadTestProgressViewModel });
    }

    private _convertToTimeFormat(totalSeconds: number): string {
        var hours;
        var minutes;
        var seconds;
        hours = this.formatToTwoDigits(Math.floor(totalSeconds / 3600).toString());
        totalSeconds = totalSeconds % 3600;

        minutes = this.formatToTwoDigits(Math.floor(totalSeconds / 60).toString());
        totalSeconds = totalSeconds % 60;

        seconds = this.formatToTwoDigits(Math.floor(totalSeconds).toString());
        return (minutes + ':' + seconds);
    }

    private formatToTwoDigits(time: string): string {
        if (time.length < 2) {
            time = '0' + time;
        }
        return time;
    }

    private _stopProgress(): void {
        if (this._$intervalTimer != null) {
            clearInterval(this._$intervalTimer);
            this._$intervalTimer = null;
        }

    }

    /* TODO - add proper type here */
    private _$progressBar: any;
    private _$progressTimer: any;
    private _$currentTime: any;
    private _$endTime: any;
    private _title: LoadTestResultTitle;
    private _loadTestProgressViewModel: LoadTestProgressViewModel;
    private _properties: any;
    private _$intervalTimer: any = null;
    private _$start: any = null;
    private _$isTimerStated: boolean = false;
    private _loadTestResultsToolbar: Menus.MenuBar;
    private _loadTestResultSummaryTable: LoadTestResultSummaryTable;
    private _loadTestGraphView: LoadTestGraphView;
}

/******************* End - LoadTestProgressView and ViewModel *******************************/


/******************* Begin - LoadTestResultView and ViewModel *******************************/

// Handle conversion of load test result to a format that can be shown in the UI. All custom formatting code (if any should go here).

export class LoadTestResultViewModel extends LoadTestResultViewModelBase {

    public getLoadTestStatusString(): string {
        if (LoadTestOM.LoadTestHelper.HasCompleted(this._getLoadtestResult())) {
            var finishedDate = this._getLoadtestResult().FinishedDate;
            var stateString: string = LoadTestOM.LoadTestHelper.getStateString(this.getState());
            if (this.getState() === LoadTestOM.TestRunState.Error) {
                stateString = Resources.TestRunStateFailed;
            }

            return Utils_String.localeFormat(Resources.CompletedStatusText, stateString, Utils_Date.friendly(finishedDate), finishedDate.toLocaleString());
        }
        else {
            return "";
        }
    }

    public getLoadTestSummary(): IKeyValuePair[] {

        var keyValuePairs: IKeyValuePair[] = [];
        var testResult = this._getLoadtestResult();
        keyValuePairs.push(this._getKeyValuePair(Resources.UrlLabelText, testResult.Url));
        keyValuePairs.push(this._getKeyValuePair(Resources.LoadDurationText, testResult.RunSpecificDetails.Duration.toString() + Resources.SecondsText));
        keyValuePairs.push(this._getKeyValuePair(Resources.UserLoadText, testResult.RunSpecificDetails.VirtualUserCount.toString()));

        var testOriginLocation = (Helper.isNullOrUndefined(testResult.LoadGenerationGeoLocations) || testResult.LoadGenerationGeoLocations.length === 0) ? Resources.DefaultTestOrigin : testResult.LoadGenerationGeoLocations[0].Location;

        if (testOriginLocation === "Default") {
            testOriginLocation = "";
        }

        keyValuePairs.push(this._getKeyValuePair(Resources.TestOriginatedFromText, testOriginLocation));
        keyValuePairs.push(this._getKeyValuePair(Resources.StartTimeText, (testResult.StartedDate).toLocaleString()));
        return keyValuePairs;
    }

    public getPerformanceData(): IPerformanceData[] {

        var performanceDataList: IPerformanceData[] = [];
        var testResult = this._getLoadtestResult();

        var averageResponseTime = testResult.AverageResponseTime;
        var totalRequests = testResult.TotalRequests;
        var totalFailedRequests = testResult.TotalFailedRequests;

        if (Helper.isNullOrUndefined(averageResponseTime) || averageResponseTime.length === 0 || averageResponseTime === "-1") {
            averageResponseTime = "-";
        }
        else {
            averageResponseTime = averageResponseTime + Resources.SecText;
        }

        if (Helper.isNullOrUndefined(totalRequests) || totalRequests.length === 0) {
            totalRequests = "-";
        }

        if (Helper.isNullOrUndefined(totalFailedRequests) || totalFailedRequests.length === 0) {
            totalFailedRequests = "-";
        }

        performanceDataList.push(this._getPerformanceData(Resources.AverageResponseTimeLabel, averageResponseTime, Resources.ResponseTileText, true, this.AverageResponseTimeLowerThreshold, this.AverageResponseTimeHigherThreshold, Resources.AverageResponseTimeUnits));

        performanceDataList.push(this._getPerformanceData(Resources.TotalRequestsLabel, totalRequests, ""));

        performanceDataList.push(this._getPerformanceData(Resources.TotalFailedRequestsLabel, totalFailedRequests, "", true, this.TotalRequestFailedThreshold));

        return performanceDataList;
    }

    public getErrorData(): LoadTestOM.ILoadTestErrorDetails[] {
        var loadTestErrors: LoadTestOM.ILoadTestErrorDetails[] = [];
        var testResult = this._getLoadtestResult();
        var errors = testResult.LoadTestErrors;

        var len = errors.length;
        for (var i = 0; i < len; i++) {
            loadTestErrors.push(this._getErrorData(errors[i].Type, errors[i].SubType, errors[i].Occurrences, errors[i].MessageText));
        }
        return loadTestErrors;
    }

    public getErrorMessage(): string {
        var abortMessage = this._getLoadtestResult().AbortMessage;
        return (abortMessage === null || abortMessage === undefined) ? "" : abortMessage.Cause;
    }

    private _getKeyValuePair(key: string, value: string): IKeyValuePair {
        return { key: key, value: value };
    }

    private _getPerformanceData(title: string, measure: string, description: string, showThumbsImage?: boolean, lowerComparisonValue?: number, higherComparisonValue?: number, valueUnits?: string): IPerformanceData {
        return { title: title, measure: measure, description: description, showThumbsImage: showThumbsImage, lowerComparisonValue: lowerComparisonValue, higherComparisonValue: higherComparisonValue, valueUnits: valueUnits };
    }

    private _getErrorData(Type: string, SubType: string, Occurrences: number, MessageText: string) {
        return { Type: Type, SubType: SubType, Occurrences: Occurrences, MessageText: MessageText };
    }

    private AverageResponseTimeLowerThreshold: number = 0.6;
    private AverageResponseTimeHigherThreshold: number = 2;
    private TotalRequestFailedThreshold: number = 1;
}

export class ToolbarCommandIds {
    public static emailResultsId = "email-results";
}

export class LoadTestResultView extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        this._createView();
        this._populateLoadTestResult(this._loadTestResultViewModel);
        if (!Helper.isNullOrUndefined(this._loadTestGraphView)) {
            this._loadTestGraphView.startPlot();
        }
    }

    public initializeOptions(options?) {
        super.initializeOptions(options);
        this._loadTestResultViewModel = options.viewModel;
        this._properties = options.properties;
    }

    private _populateLoadTestResult(loadTestResultViewModel: LoadTestResultViewModel) {
        this._populateTitle(loadTestResultViewModel);
        this._populateLoadTestResultStatus(loadTestResultViewModel);

        if (loadTestResultViewModel.getState() === LoadTestOM.TestRunState.Completed) {
            this._populateResultSummary(loadTestResultViewModel);
            this._populateApplicationPerformance(loadTestResultViewModel);
            this._populateLoadTestErrors(loadTestResultViewModel);
        }
    }

    private _populateTitle(loadTestResultViewModel: LoadTestResultViewModel) {
        this._loadtTestResultTitle.setData({
            state: loadTestResultViewModel.getState(),
            subState: loadTestResultViewModel.getSubState(),
            title: loadTestResultViewModel.getTitle(),
            statusString: loadTestResultViewModel.getStateString()
        });
    }

    private _populateLoadTestResultStatus(loadTestResultViewModel: LoadTestResultViewModel) {
        this._$loadTestResultStatus.text(loadTestResultViewModel.getLoadTestStatusString());
    }

    private _populateResultSummary(loadTestResultViewModel: LoadTestResultViewModel) {
        this._loadTestResultSummaryTable.setData(loadTestResultViewModel.getLoadTestSummary());

    }

    private _populateApplicationPerformance(loadTestResultViewModel: LoadTestResultViewModel) {
        this._appPerformanceGrid.setData(loadTestResultViewModel.getPerformanceData());
    }

    private _populateLoadTestErrors(loadTestResultViewModel: LoadTestResultViewModel) {
        this._loadTestErrorsGrid.setData(loadTestResultViewModel.getErrorData());
    }

    private _createView(): void {
        this._createLoadTestResultTitle();
        this._createLoadTestResultStatus();
        if (this._loadTestResultViewModel.getState() === LoadTestOM.TestRunState.Completed) {
            var propertyName = "LoadTest.IsMailEnabled";
            if (this._properties.hasOwnProperty(propertyName) && this._properties[propertyName] === true) {
                this._createToolbar();
            }
            this._createLoadTestResultSummaryTable();
            this._createAppPerformanceTiles();
            this._createLearnMoreMetricsLink();
            this._createLoadTestGraphView();
            this._createErrorsGrid();
        }
        else {
            this._createLoadTestErrorDiv();
        }
    }

    private _createLoadTestErrorDiv() {
        var $element = this.getElement();
        $(domElem("div", "load-test-error-div")).appendTo($element).text(this._loadTestResultViewModel.getErrorMessage());
    }

    private _createLoadTestResultTitle() {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-result-hub-title")).appendTo($element);
        this._loadtTestResultTitle = <LoadTestResultTitle>Controls.BaseControl.createIn(LoadTestResultTitle, $container);
    }

    private _createLoadTestResultStatus() {
        var $element = this.getElement();
        this._$loadTestResultStatus = $(domElem("div", "load-test-result-status")).addClass("lt-title").appendTo($element);
    }

    private _createToolbar() {
        var $element = this.getElement();
        var $toolbarContainer = $(domElem("div"))
            .addClass("load-test-result-toolbar")
            .addClass("toolbar")
            .addClass("hub-pivot-toolbar")
            .appendTo($element);

        this._loadTestResultsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbarContainer, {
            items: this._createToolbarItems(),
            executeAction: delegate(this, this._onToolbarItemClick)
        });
        this._loadTestResultsToolbar.getElement();
    }

    private _createLoadTestResultSummaryTable() {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-result-details")).appendTo($element);
        this._loadTestResultSummaryTable = <LoadTestResultSummaryTable>Controls.BaseControl.createIn(LoadTestResultSummaryTable, $container);
    }

    private _createAppPerformanceTiles() {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-result-app-performance")).appendTo($element);
        this._appPerformanceGrid = <ApplicationPerformanceGrid>Controls.BaseControl.createIn(ApplicationPerformanceGrid, $container);
    }

    private _createLearnMoreMetricsLink() {
        var $element = this.getElement();
        var $metricsLinkDiv = $(domElem("div")).appendTo($element).addClass("load-test-result-metrics-link");

        var $learnMoreDiv = $(domElem('a')).appendTo($metricsLinkDiv).text(Resources.LearnMoreText).click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "LearnMoreAppMetricsLink", 1));
            window.open(CLT_APP_METRICS_LINK, "_blank");
        });

        $(domElem("span")).appendTo($metricsLinkDiv).text(Resources.AppMetricsLinkText);
    }

    private _createErrorsGrid() {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-result-errors")).appendTo($element);
        $(domElem("div", "load-test-errors-grid-title")).addClass("lt-title").text(Resources.ErrorsHeader).appendTo($container);
        this._loadTestErrorsGrid = <LoadTestErrorsGrid>Controls.BaseControl.createIn(LoadTestErrorsGrid, $container);
    }

    private _createLoadTestGraphView() {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-graph-view")).appendTo($element);
        this._loadTestGraphView = <LoadTestGraphView>Controls.BaseControl.createIn(LoadTestGraphView, $container, { viewModel: this._loadTestResultViewModel });
    }

    private _createToolbarItems(): any[] {
        var items = [];
        items.push({
            id: ToolbarCommandIds.emailResultsId,
            text: Resources.EmailTestReportText,
            title: Resources.EmailTestReportText,
            showText: true,
            icon: "icon-envelope"
        });

        return items;
    }

    private _onToolbarItemClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        var command = e.get_commandName();

        if (command === ToolbarCommandIds.emailResultsId) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "EmailResultClick", 1));
            this._composeEmail();
        }
    }

    private _composeEmail(): void {
        if (this._checkEmailSettings()) {
            var $element = this.getElement();
            var $clone = $element.clone();
            this._convertCssToInlineStyles($element, $clone);
            this._hideEmailControlInEmailView($clone);
            this._prepareEmail($clone[0].outerHTML);
        }
    }

    private _convertCssToInlineStyles($element: JQuery, $clone: JQuery): void {
        this._expandStylesToInline($element, $clone);
        var $cloneChildren = $clone.children();
        $element.children().each((index, elem) => {
            this._convertCssToInlineStyles($(elem), $($cloneChildren[index]));
        });
    }

    private _hideEmailControlInEmailView($element: JQuery): void {
        $element.find(".load-test-result-toolbar").css("display", "none");
    }

    private _expandStylesToInline($element: JQuery, $clone: JQuery): void {
        var len = this._cssElements.length;
        var inlineProperties = [];
        for (var i = 0; i < len; i++) {
            var propName = this._cssElements[i];
            var cssPropValue = $element.css(propName);
            if (cssPropValue) {
                inlineProperties.push(propName + ":" + cssPropValue);
            }
        }

        $clone.attr("style", inlineProperties.join(";"));
    }

    private _checkEmailSettings(): boolean {
        var mailSettings = TFS_Host_TfsContext.TfsContext.getDefault().configuration.getMailSettings();

        if (!mailSettings || !mailSettings.enabled) {
            alert(VSS_Resources_Common.SendMailNotEnabled);
            return false;
        }

        return true;
    }

    private _prepareEmail(bodyContent: string) {

        // TODO FIX ME
        // AdminSendMail.Dialogs.sendMail(new AdminSendMail.SendMailDialogModel({
        //     title: this._getEmailTitle(),
        //     subject: this._getEmailSubject(),
        //     body: bodyContent,
        //     useIdentityPickerForTo: true,
        // }), { cssClass: "load-test-results-email", height: 800 });
    }

    private _getEmailTitle(): string {
        return Resources.EmailTitle;
    }

    private _getEmailSubject(): string {
        return this._loadTestResultViewModel.getTitle() + ' - ' + this._loadTestResultViewModel.getStateString();
    }


    // Generated from http://www.w3schools.com/cssref/ 
    //Added extra border and background properties supported by IE from http://msdn.microsoft.com/en-in/library/ie/ms530744(v=vs.85).aspx
    private _cssElements = ["color", "opacity", "background-image", "background-color", "border-bottom", "border-color", "border-left", "border-right", "border-style", "border-top", "border-width", "bottom", "clear", "clip", "display", "float", "height", "left", "overflow", "overflow-x", "overflow-y", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "position", "right", "top", "visibility", "width", "vertical-align", "z-index", "display", "justify-content", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "max-height", "max-width", "min-height", "min-width", "letter-spacing", "line-break", "line-height", "overflow-wrap", "tab-size", "text-align", "text-align-last", "text-indent", "text-justify", "text-transform", "white-space", "word-break", "word-spacing", "word-wrap", "text-decoration", "text-decoration-color", "text-decoration-line", "text-decoration-style", "text-shadow", "text-underline-position", "font", "font-family", "font-size", "font-style", "font-variant", "font-weight", "border-collapse", "border-spacing", "caption-side", "empty-cells", "table-layout", "list-style", "box-sizing", "content", "background", "background-attachment", "background-clip", "background-origin", "background-position", "background-repeat", "background-size", "border", "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width", "border-collapse", "border-image", "border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width", "border-left-color", "border-left-style", "border-left-width", "border-radius", "border-right-color", "border-right-style", "border-right-width", "border-spacing", "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width", "background-position-x", "background-position-y"];

    private _loadtTestResultTitle: LoadTestResultTitle;
    private _$loadTestResultStatus: JQuery;
    private _loadTestResultsToolbar: Menus.MenuBar;
    private _appPerformanceGrid: ApplicationPerformanceGrid;
    private _loadTestErrorsGrid: LoadTestErrorsGrid;
    private _loadTestResultSummaryTable: LoadTestResultSummaryTable;
    private _loadTestGraphView: LoadTestGraphView;

    private _loadTestResultViewModel: LoadTestResultViewModel;
    private _properties: any;
}

export interface ILoadTestResulTitleData {
    state: LoadTestOM.TestRunState;
    title: string;
    subState: LoadTestOM.TestRunSubState;
    statusString: string;
}

export class LoadTestResultTitle extends Controls.BaseControl {

    public setData(data: ILoadTestResulTitleData) {
        var $element = this.getElement();
        $element.empty();

        var iconClassForState = IconHelper.getIconClassForStateAndSubState(data.state, data.subState);
        $(domElem("span", "icon")).addClass(iconClassForState).appendTo($element);

        $(domElem("span", "load-test-result-title")).addClass("lt-title").appendTo($element).text(data.title);
        $(domElem("span")).appendTo($element).text("-");
        var $statusDiv = $(domElem("span", "load-test-result-state")).addClass("lt-title").appendTo($element).text(data.statusString);
        $(domElem("span")).addClass("load-test-progress-icon").appendTo($statusDiv);

    }
}

export class LoadTestGraphView extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions();
        this._ViewModel = options.viewModel;
    }

    public startPlot() {
        if (!this.boolStartPlot) {
            this.boolStartPlot = true;
            this._boolFetchCounterInstances = true;
            this._boolFetchCounterSamples = true;
            this._fetchCounterInstances();
        }
    }

    public stopPlot() {
        this._boolFetchCounterInstances = false;
        this._boolFetchCounterSamples = false;
        this.boolStartPlot = false;
    }

    private _createView() {
        this._createLoadTestGraph();
    }

    private _createLoadTestGraph(): void {
        var $element = this.getElement();
        this._graphDiv = $(domElem("div")).appendTo($element);

        if (this._ViewModel instanceof LoadTestProgressViewModel) {
            this._graphDiv.attr("id", "load-test-graph-div-progress");
        }
        else if (this._ViewModel instanceof LoadTestResultViewModel) {
            this._graphDiv.attr("id", "load-test-graph-div-result");
        }

        this._plotData = [];
        this._counterInstances = [];
        this._computedValues = [];

        var graphOptions: HighchartsOptions = this._getGraphOptions(this._graphDiv);
        graphOptions.series.push({ data: [] });
        graphOptions.legend.enabled = false;
        this._plot = new Highcharts.Chart(graphOptions);
        this._plot.showLoading(Resources.WaintingForDataText);
    }

    private _buildAndCreateChart(): void {
        this._graphDiv.empty();
        this._plotData = [];
        var graphOptions: HighchartsOptions = this._getGraphOptions(this._graphDiv);
        this._plot = new Highcharts.Chart(graphOptions);
    }

    private _isCounterTypeNumberOfItems(counterType: string): boolean {
        return (counterType == "NumberOfItems32") || (counterType == "NumberOfItems64"); /*PerformanceCounterType.NumberOfItems32*/
    }

    private _isCounterTypeAverageTimer32(counterType: string): boolean {
        return (counterType == "AverageTimer32"); /*PerformanceCounterType.AverageTimer32*/
    }

    private _isCounterTypeRateOfCountsPerSecond64(counterType: string): boolean {
        return (counterType == "RateOfCountsPerSecond64"); /*PerformanceCounterType.RateOfCountsPerSecond64*/
    }

    private _computeValueFromSamples(currentSample: LoadTestOM.ICounterSample, previousSample): string {
        if (this._isCounterTypeRateOfCountsPerSecond64(currentSample.CounterType)) {
            if (currentSample.ComputedValue == 0 && currentSample.TimeStamp == previousSample.TimeStamp) {
                return "NaN";
            }
            return String(currentSample.ComputedValue);
        }

        if (this._isCounterTypeAverageTimer32(currentSample.CounterType)) {
            if (currentSample.ComputedValue == 0 && currentSample.BaseValue == previousSample.BaseValue) {
                return "NaN";
            }
            return String(currentSample.ComputedValue);
        }
        return String(currentSample.ComputedValue);
    }

    private _getGraphOptions($container: JQuery): HighchartsOptions {

        if (this._plotData.length === 0) {

            var counterInstances = this._getCounterInstances();

            for (var i = 0; i < counterInstances.length; i++) {
                this._plotData.push({ name: counterInstances[i].CounterName, data: [], marker: { enabled: true, radius: 2, symbol: 'circle' } } as HighchartsSeriesOptions);
                this._computedValues.push({ multiplier: 1 });
            }

        }

        var getTickSize = function (duration) {
            var requiredTickSize = 5;

            while ((duration / (requiredTickSize)) > 12) {
                requiredTickSize += 5;
            }

            return requiredTickSize;
        }

        function getTimeSpanString(val) {
            var duration: Date = new Date(val);
            var hours = (duration.getUTCHours() + (duration.getUTCDate() - 1) * 24);

            var hoursInString: string = hours.toString();
            if (hours < 10) {
                hoursInString = "0" + hoursInString;
            }

            var minutes: number = duration.getUTCMinutes();
            var minutesInString: string = minutes.toString();

            if (minutes < 10) {
                minutesInString = "0" + minutesInString;
            }
            var seconds: number = duration.getUTCSeconds();
            var secondInString: string = seconds.toString();

            if (seconds < 10) {
                secondInString = "0" + secondInString;
            }

            var formattedString = "";
            if (hoursInString != "00") {
                formattedString += hoursInString + ":";
            }

            formattedString += minutesInString + ":" + secondInString;

            return formattedString;
        }

        function ticksFormatterX(): string {
            return getTimeSpanString(this.value);
        }

        var duration: number = this._ViewModel._getLoadtestResult().RunSpecificDetails.Duration;

        var that: LoadTestGraphView = this;

        var graphOptions: HighchartsOptions = {

            chart: {
                type: 'line',
                height: 300,
                backgroundColor: null,
                animation: false,
                renderTo: $container.attr('id'),
                marginRight: 25
            },
            plotOptions: {
                series: { shadow: false, marker: { enabled: true, radius: 2, symbol: 'circle' }, stickyTracking: false, animation: false, connectNulls: true },
                line: { animation: false, point: { events: { mouseOut: function () { this.series.chart.tooltip.hide(); } } } }
            },
            yAxis: {
                tickInterval: 20, min: 0, max: 100, gridLineWidth: 1, title: { text: null }, labels: { useHTML: true },
                lineWidth: 0
            },
            loading: {
                labelStyle: {
                    top: '45%'
                }
            },
            xAxis: {
                type: 'datetime',
                tickInterval: getTickSize(duration) * 1000,
                labels: { formatter: ticksFormatterX },
                min: 0,
                max: duration * 1000,
                gridLineWidth: 1,
                lineWidth: 0,
            },
            tooltip: {
                animation: false,
                borderWidth: 0,
                borderRadius: 0,
                backgroundColor: "none",
                shadow: false,
                shared: false,
                hideDelay: 0,
                formatter: function () {

                    return "<div class='highcharts-tooltip-div'>" + this.series.name
                        + "<br\>" + Resources.HighChartsToolTipTimeText + getTimeSpanString(this.x)
                        + "<br\>" + Resources.HighChartsToolTipValueText + (this.y / that._computedValues[this.series.index].multiplier).toFixed(4) + "</div>";
                },
                useHTML: true
            } as HighchartsTooltipOptions,
            series: this._plotData,
            legend: {
                align: 'center',
                verticalAlign: 'bottom',
                borderWidth: 0
            },
            credits: { enabled: false },
            title: { text: null },
            colors: ['#8DC54B', '#F58B1F', '#7F1725', '#009BCC', '#68217A', '#077ACC', '#F2700F', '#147A7C', '#AE3CBA', '#00188F', '#9DBFE9', '#804097', '#525151', '#EC008C', '#339947', '#9FB1DB', '#748188', '#F9CCE8', '#DB552C', '#C3D84C', '#FAEF67', '#005F31', '#E31E26', '#FFCC05']
        } as HighchartsOptions;

        return graphOptions;
    }

    private _fetchCounterInstances(): void {
        var loadTestResult = this._ViewModel._getLoadtestResult();

        if (this._boolFetchCounterInstances && this._fetchCounterInstancesRetries > 0) {
            Utils_Core.delay(this, this._fetchCounterInstancesInterval, () => {

                this._beginGetCounterInstances((counterInstances: LoadTestOM.ICounterInstance[]) => {

                    this._fetchCounterInstancesInterval = 5000;

                    this._fetchCounterInstancesRetries--;

                    this._counterInstancesHelper(counterInstances);

                    this._buildAndCreateChart();

                    this._fetchCounterSamples();

                    if ((!LoadTestOM.LoadTestHelper.HasCompleted(loadTestResult)) && this._boolFetchCounterInstances) {
                        this._fetchCounterInstances();
                    }
                },
                    (error) => {
                        ErrorHelper.showError(error);
                    });
            });
        }
    }

    private _fetchCounterSamples(): void {
        var loadTestResult = this._ViewModel._getLoadtestResult();

        if (this._boolFetchCounterSamples) {
            Utils_Core.delay(this, this._fetchCounterSamplesInterval, () => {

                this._beginGetCounterSamples((counterSamplesResult: LoadTestOM.ICounterSamplesResult) => {

                    this._setcounterSamplesResult(counterSamplesResult);

                    this._counterSampleResultHelper();

                    this._fetchCounterSamplesInterval = loadTestResult.RunSpecificDetails.SamplingInterval * 1000;

                    if (!LoadTestOM.LoadTestHelper.HasCompleted(loadTestResult)) {
                        this._fetchCounterSamples();
                    }
                },
                    (error) => {
                        ErrorHelper.showError(error);
                    });
            });
        }
    }

    private _counterInstancesHelper(counterInstances: LoadTestOM.ICounterInstance[]): void {

        if (counterInstances == null || counterInstances.length === 0) {
            this._boolFetchCounterInstances = true;
            return;
        }

        // filter the counters to show on the graph
        var countersToShowOnGraph: string[] = this._countersToShowOnGraph();

        var filteredCounters: LoadTestOM.ICounterInstance[] = $.grep(counterInstances, function (counterInstance, index) {
            return ($.inArray(counterInstance.CounterName, countersToShowOnGraph) !== -1);
        });

        this._setCounterInstances(filteredCounters);

        // Check if CounterInstances Array contains CounterInstance With InstanceId eq. -1 
        this._boolFetchCounterInstances = this._continueFetchingCounters(filteredCounters);
    }

    private _continueFetchingCounters(counterInstances: LoadTestOM.ICounterInstance[]): boolean {

        var allCounterInstancesFound: boolean = true;
        var availableCounterInstances: LoadTestOM.ICounterInstance[] = this._getCounterInstances();
        var that: LoadTestGraphView = this;

        $.each(availableCounterInstances, function (index: number, availableCounterInstance: LoadTestOM.ICounterInstance) {

            if (that._isCounterInstanceAvailable(availableCounterInstance.CounterInstanceId)) {
                return;
            }

            $.each(counterInstances, function (index2: number, counterInstance: LoadTestOM.ICounterInstance) {

                if (counterInstance.CounterName === availableCounterInstance.CounterName
                    && counterInstance.InstanceName === availableCounterInstance.InstanceName) {
                    availableCounterInstance.CounterInstanceId = counterInstance.CounterInstanceId;
                    availableCounterInstance.MachineName = counterInstance.MachineName;
                }

            });

            if (!that._isCounterInstanceAvailable(availableCounterInstance.CounterInstanceId)) {
                allCounterInstancesFound = false;
            }

        });

        if (!allCounterInstancesFound) {
            return true;
        }

        return false;
    }

    private _counterSampleResultHelper(): void {

        var bucketizedCounterSamples = this._getcounterSamplesResult().Values;

        if (!Helper.isNullOrUndefined(bucketizedCounterSamples) && bucketizedCounterSamples.length > 0) {
            var counterInstances = this._getCounterInstances();

            var counterInstancesLength: number = counterInstances.length;
            for (var i = 0; i < counterInstancesLength; i++) {

                var allMatchingCounterSamples: LoadTestOM.ICounterInstanceSamples[] = $.grep(bucketizedCounterSamples, function (counterSamples, sampleIndex) {
                    return counterSamples.CounterInstanceId === counterInstances[i].CounterInstanceId;
                });

                if (allMatchingCounterSamples != null && allMatchingCounterSamples.length > 0 && allMatchingCounterSamples[0].Values != null && allMatchingCounterSamples[0].Values.length > 0) {
                    this._plotCounterSamplesHelper(i, allMatchingCounterSamples[0].Values);
                }
            }
        }
    }

    private _plotCounterSamplesHelper(counterIndex: number, counterSamples: LoadTestOM.ICounterSample[]): void {

        if (this._plot != null && counterSamples.length > 0) {

            var element: HighchartsSeriesOptions = this._plotData[counterIndex];

            var maxValue: number = 0;
            var multiplier: number = 1;
            var range: number = 100;
            var computedValues: number[] = [];
            var intervals: number[] = [];
            var prevSample: LoadTestOM.ICounterSample;
            var samplingInterval: number = this._ViewModel._getLoadtestResult().RunSpecificDetails.SamplingInterval;

            var counterSamplesLength: number = counterSamples.length

            for (var index = 0; index < counterSamplesLength; index++) {

                if (counterSamples[index].IntervalNumber != 0) {
                    var value = this._computeValueFromSamples(counterSamples[index], prevSample);
                    if (value != "NaN") {
                        intervals.push(counterSamples[index].IntervalNumber);
                        computedValues.push(+value);
                    }
                }

                prevSample = counterSamples[index];
            }

            $.each(computedValues, function (index: number, computedValue: number) {
                if (maxValue < computedValue) {
                    maxValue = computedValue;
                }
            });

            while (maxValue != 0 && maxValue <= 10) {
                multiplier *= 10;
                maxValue *= 10;
                range /= 10;
            }

            while (maxValue != 0 && maxValue > 100) {
                multiplier /= 10;
                maxValue /= 10;
                range *= 10;
            }

            this._computedValues[counterIndex].multiplier = multiplier;

            element.data = [];

            var computedValuesLength: number = computedValues.length;

            for (var i = 0; i < computedValuesLength; i++) {
                element.data.push([intervals[i] * samplingInterval * 1000, computedValues[i] * multiplier]);
            }

            if (this._plot && this._plot.series) {
                this._plot.series[counterIndex].setData(element.data, true);
            }
        }
    }

    private _getCounterInstances(): LoadTestOM.ICounterInstance[] {
        return this._counterInstances;
    }

    private _setCounterInstances(counterInstances: LoadTestOM.ICounterInstance[]): void {
        this._counterInstances = counterInstances;
    }

    private _getcounterSamplesResult(): LoadTestOM.ICounterSamplesResult {
        return this._counterSamplesResult;
    }

    private _setcounterSamplesResult(counterSamplesResult: LoadTestOM.ICounterSamplesResult): void {
        this._counterSamplesResult = counterSamplesResult;
    }

    private _beginGetCounterInstances(callback: IResultCallback, errorCallback: IErrorCallback) {
        LoadTestOM.LoadTestManager.getInstance().beginGetCounterInstances(this._ViewModel._getLoadtestResult().Id, false, callback, errorCallback);
    }

    private _beginGetCounterSamples(callback: IResultCallback, errorCallback: IErrorCallback) {

        var that: LoadTestGraphView = this;

        // Remove the ones with Instance Id Empty String
        var filteredCounters: LoadTestOM.ICounterInstance[] = $.grep(this._getCounterInstances(), function (counterInstance, index) {
            return (that._isCounterInstanceAvailable(counterInstance.CounterInstanceId));
        });

        LoadTestOM.LoadTestManager.getInstance().beginGetCounterSamples(this._ViewModel._getLoadtestResult().Id, filteredCounters, false, callback, errorCallback);
    }

    // ToDo: Remove this logic of checking for "-1" after this change goes into the TFS PROD Deployment and revert ELS changes are also in PROD
    private _isCounterInstanceAvailable(counterInstanceId: string): boolean {
        return (!Helper.isNullOrUndefined(counterInstanceId) && (counterInstanceId.length !== 0) && (counterInstanceId !== "-1"));
    }

    private _countersToShowOnGraph(): string[] {
        var countersToShowOnGraph: string[] = ["Avg. Response Time", "User Load", "Requests/Sec", "Failed Requests/Sec"];
        return countersToShowOnGraph;
    }

    public boolStartPlot: boolean = false;

    private _ViewModel: LoadTestResultViewModelBase;
    private _boolFetchCounterInstances: boolean = false;
    private _boolFetchCounterSamples: boolean = false;
    private _counterInstances: LoadTestOM.ICounterInstance[];
    private _counterSamplesResult: LoadTestOM.ICounterSamplesResult;
    private _plotData: HighchartsSeriesOptions[];
    private _plot: HighchartsChartObject;
    private _graphDiv: JQuery;
    private _computedValues: IComputedValue[];

    private _fetchCounterInstancesInterval: number = 0;
    private _fetchCounterSamplesInterval: number = 0;

    private _fetchCounterInstancesRetries: number = 20;
}

export interface IComputedValue {
    multiplier: number;
}

export interface IKeyValuePair {
    key: string;
    value: string;
}

export class LoadTestResultSummaryTable extends Controls.BaseControl {

    public setData(data: IKeyValuePair[]): void {
        // clear existing data.
        var $element: JQuery = this.getElement();
        $element.empty();
        var $table = $(domElem("table", "result-summary-table")).appendTo($element);
        var len = data.length;
        for (var i = 0; i < len; i++) {
            var $tr = $(domElem("tr", "result-summary-row")).appendTo($table);
            var $td = $(domElem("td", "result-summary-key")).appendTo($tr);
            $(domElem('span')).addClass("lt-title").appendTo($td).text(data[i].key);
            $td = $(domElem("td", "result-summary-value")).appendTo($tr);
            $(domElem('span')).addClass("lt-title").appendTo($td).text(data[i].value);
        }
    }

}

export class LoadTestErrorsGrid extends Grids.GridO<any> {

    public initializeOptions(options?) {
        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: false,
            keepSelection: false,
            toggle: false,
            cssClass: "load-test-errors-grid",
            columns: this._getColumns()
        }, options));
    }

    public setData(data: any[]) {
        var options = this._options;

        options.source = data;
        options.columns = this._columns;

        // Feeding the grid with the new source
        this.initializeDataSource();
    }

    private _getColumns(): Grids.IGridColumn[] {
        return [
            {
                index: "Type",
                text: Resources.ErrorTypeHeader,
                width: 100,
                canSortBy: false
            },
            {
                index: "SubType",
                text: Resources.ErrorSubTypeHeader,
                width: 100,
                canSortBy: false
            },
            {
                index: "Occurrences",
                text: Resources.ErrorCountHeader,
                width: 100,
                canSortBy: false
            },
            {
                index: "MessageText",
                text: Resources.LastMessageHeader,
                width: 500,
                canSortBy: false
            }
        ];
    }
}

export interface IPerformanceData {
    title: string;
    measure: string;
    description: string;
    showThumbsImage?: boolean;
    lowerComparisonValue?: number;
    higherComparisonValue?: number;
    valueUnits?: string;
}

export class ApplicationPerformanceTile extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public setData(data: IPerformanceData) {
        this._data = data;
        this._$titleDiv.text(data.title);
        this._$measureDiv.text(data.measure);
        this._$descriptionDiv.text(data.description);
        if (data.measure === "-") {
            return;
        }
        if (!Helper.isNullOrUndefined(data.showThumbsImage) && data.showThumbsImage === true) {
            this._showThumbsImage(data.title, data.measure, data.lowerComparisonValue, data.higherComparisonValue);
        }
    }

    private _showThumbsImage(title: string, measure: string, lowerComparisonValue: number, higherComparisonValue: number) {
        if (Helper.isNullOrUndefined(measure)) {
            return;
        }
        var positiveMessage: string;
        var negativeMessage: string;
        var normalMessage: string;
        if (title === Resources.AverageResponseTimeLabel) {
            positiveMessage = Resources.ThumbsUpMessage;
            negativeMessage = Resources.ThumbsDownMessage;
            normalMessage = Resources.ThumbsAverageMessage;
        }
        else if (title === Resources.TotalFailedRequestsLabel) {
            positiveMessage = Resources.ThumbsUpRequestFailedMessage;
            negativeMessage = Resources.ThumbsDownRequestFailedMessage;
            normalMessage = "";
        }
        var measureVal: number = parseFloat(measure);
        var $element = super.getElement();
        if (measureVal < lowerComparisonValue) {
            this._$container.addClass('thumbsup');
            this._$thumbsUpDiv.addClass("load-test-thumbs-up");
            this._$descriptionDiv.text(positiveMessage);
            return;
        }
        else if (!Helper.isNullOrUndefined(higherComparisonValue) && (measureVal >= lowerComparisonValue && measureVal < higherComparisonValue)) {
            this._$descriptionDiv.text(normalMessage);
            return;
        }
        this._$container.addClass('thumbsdown')
        this._$thumbsUpDiv.addClass("load-test-thumbs-down");
        this._$descriptionDiv.text(negativeMessage);
    }

    private _createView() {
        var $element = super.getElement();
        this._$container = $(domElem('div', 'perf-tile-container')).appendTo($element);
        this._$titleDiv = this._createDiv(this._$container, 'perf-tile-title').addClass("lt-title");
        this._$measureDiv = this._createDiv(this._$container, 'perf-tile-measure').addClass("lt-title");
        this._$thumbsUpDiv = this._createDiv(this._$container, 'perf-tile-img');
        this._$descriptionDiv = this._createDiv(this._$container, 'perf-tile-description').addClass("lt-title");
    }

    private _createDiv($container: JQuery, className: string): JQuery {
        return $(domElem('div', className)).appendTo($container);
    }

    private _data: IPerformanceData;

    private _$titleDiv: JQuery;
    private _$measureDiv: JQuery;
    private _$thumbsUpDiv: JQuery;
    private _$descriptionDiv: JQuery;
    private _$container: JQuery;
}

export class ApplicationPerformanceGrid extends UICommonControls.HorizontalGridControl {

    public initialize(): void {
        super.initialize();
        this.render();
    }


    public setData(data: IPerformanceData[]): void {
        if (data.length === this._tiles.length) {
            for (var i = 0; i < 3; i++) {
                this._tiles[i].setData(data[i]);
            }
        }
        else {
            //Diag.Debug.assert("Perf data count should match the number of tiles");
        }
    }

    public render(): void {
        super.render();
        this.addGridControlTitle(Resources.ApplicationPerformanceTitleText);
        this._tiles = [];
        for (var i = 0; i < 3; i++) {
            var $item = this.addGenericItem("perf-tile");
            this._tiles.push(<ApplicationPerformanceTile>Controls.BaseControl.createIn(ApplicationPerformanceTile, $item));
        }
    }

    private _tiles: ApplicationPerformanceTile[];
}

/******************* End - LoadTestResultView and ViewModel *******************************/


/******************* Begin - StartNewLoadTestView and ViewModel *******************************/

export enum UserLoadType {
    Constant,
    Stepped
}

export interface IResult {
    status: boolean;
    errorMessage: string;
}

export class StartNewLoadTestViewModel {

    public beginSetUrl(url: string, callback: IResultCallback, errorCallbak: IErrorCallback): void {
        this._url = url;
    }

    public setUrl(url: string): IResult {

        if (this._validate(this._urlValidator, url)) {
            this._url = url;

            // Handle validation.
            return {
                status: true,
                errorMessage: ""
            };
        }
        else {
            return {
                status: false,
                errorMessage: Resources.UrlFormatError
            };
        }

    }

    public getUrl(): string {
        return this._url;
    }

    public setTestName(testName: string): IResult {
        if (this._validate(this._nameValidator, testName) && testName.length < this._maxTestNameLength) {
            this._testName = testName;

            // Handle validation.
            return {
                status: true,
                errorMessage: ""
            };
        }
        else {
            return {
                status: false,
                errorMessage: Resources.NameFormatError
            };
        }

    }

    public getTestName(): string {
        return this._testName;
    }

    public setUserLoad(userLoad: number): IResult {
        this._userLoad = userLoad;

        // Handle validation.
        return {
            status: true,
            errorMessage: ""
        }
    }

    public getUserLoad(): number {
        return this._userLoad;
    }

    public setGeoLocation(geoLocation: string): IResult {
        this._geoLocation = geoLocation;

        // Handle validation.
        return {
            status: true,
            errorMessage: ""
        }
    }

    public getGeoLocation(): string {
        return this._geoLocation;
    }

    public setRunDuration(runDuration: number): IResult {
        this._runDuration = runDuration;

        // Handle validation.
        return {
            status: true,
            errorMessage: ""
        }
    }

    public getRunDuration(): number {
        return this._runDuration;
    }

    public setUserLoadType(userLoadType: UserLoadType): IResult {
        this._userLoadType = userLoadType;

        // Handle validation.
        return {
            status: true,
            errorMessage: ""
        }
    }

    public getUserLoadType(): UserLoadType {
        return this._userLoadType;
    }

    public setThinkTime(thinkTime: number): IResult {
        this._thinkTime = thinkTime;

        // Handle validation.
        return {
            status: true,
            errorMessage: ""
        }
    }

    public getThinkTime(): number {
        return this._thinkTime;
    }

    public setIeBrowserPercent(ieBrowserPercentage: number): IResult {
        this._ieBrowserPercentage = ieBrowserPercentage;

        // Handle validation.
        return {
            status: true,
            errorMessage: ""
        }
    }

    public getIeBrowserPercent(): number {
        return this._ieBrowserPercentage;
    }

    public onLoadTestStarted: (testResult) => void;

    public beginStartLoadTest(callback: IResultCallback, errorCallback: IErrorCallback) {
        var loadTestManager = LoadTestOM.LoadTestManager.getInstance();
        var loadGenerationGeoLocations: LoadTestOM.ILoadGenerationGeoLocation[] = [];
        if (this._geoLocation !== "") {
            loadGenerationGeoLocations = [
                {
                    Location: this._geoLocation,
                    Percentage: 100
                }
            ]
        }

        loadTestManager.beginCreateLoadTest({
            LoadTestName: this._testName,
            RunDuration: this._runDuration,
            ThinkTime: this._thinkTime,
            Urls: [this._url],
            LoadPatternName: "Constant",
            MaxVusers: this._userLoad,
            BrowserMixs: [
                {
                    BrowserName: "Internet Explorer 11.0",
                    BrowserPercentage: this._ieBrowserPercentage
                },
                {
                    BrowserName: "Chrome 2",
                    BrowserPercentage: 100 - this._ieBrowserPercentage
                }
            ],
            LoadGenerationGeoLocations: loadGenerationGeoLocations
        },
            (result) => {

                if (this.onLoadTestStarted) {
                    this.onLoadTestStarted(result);
                }

                if (callback) {
                    callback(result);
                }
            },
            (error) => {
                if (errorCallback) {
                    errorCallback(error);
                    Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "ErrorInQueuingRun", 1));
                }
            });
    }

    private _validate(validator: RegExp, testString: string) {
        return validator.test(testString);
    }

    private _url: string;
    private _testName: string;
    private _userLoad: number;
    private _userLoadType: UserLoadType;
    private _runDuration: number;
    private _thinkTime: number;
    private _ieBrowserPercentage: number;
    private _geoLocation: string;
    private _urlValidator: RegExp = /^(https?):\/\/[\w-]+(\.[\w-]+)+(:\d+)?(\/[^?=#\s\"]*)*$/i;
    private _nameValidator: RegExp = /^[a-zA-Z0-9][ a-zA-Z0-9]*$/;
    private _maxTestNameLength: number = 64;
}

export class StartNewLoadTestView extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions();
        if (options) {
            this._startNewLoadTestViewModel = options.viewModel;
            this._properties = options.properties;
        }
    }

    private _createView(): void {
        this._createLoadTestIntroTitle();
        this._createGettingStartedSection();
        this._createLoadTestSettingsSection();
    }

    private _createLoadTestIntroTitle(): void {
        var $element = this.getElement();
        $(domElem("div", "load-test-intro-title")).addClass("lt-title").text(Resources.GetStartedTitleText).appendTo($element);
    }

    private _createGettingStartedSection(): void {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-getting-started")).appendTo($element);
        <GettingStartedSection>Controls.BaseControl.createIn(GettingStartedSection, $container, { properties: this._properties });
    }

    private _createLoadTestSettingsSection(): void {
        var $element = this.getElement();
        var $container = $(domElem("div", "load-test-settings")).appendTo($element);
        <LoadTestSettingsSection>Controls.BaseControl.createIn(LoadTestSettingsSection, $container, { viewModel: this._startNewLoadTestViewModel, properties: this._properties });
    }

    private _startNewLoadTestViewModel: StartNewLoadTestViewModel;
    private _properties: any;

}

export class MultiUrlSection extends Controls.BaseControl {
    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions();
        this._properties = options.properties;
    }

    private _createView() {
        this._createVideoAndSimulatePart();
        this._createInsightsAndOthersPart();
    }

    private _createVideoAndSimulatePart() {
        var $element = this.getElement();
        var $container = $(domElem("div")).addClass("load-test-multi-url-video-section").appendTo($element);
        this._createVideoPart($container);
        this._createSimulatePart($container);
    }

    private _createInsightsAndOthersPart() {
        var $element = this.getElement();
        var $container = $(domElem("div")).addClass("load-test-multi-url-insights-section").appendTo($element);
        this._createOthersPart($container);
        this._createInsightsPart($container);
    }

    private _createVideoPart($container: JQuery) {
        var $element = $container;
        var video = $("<video>")
            .addClass('load-test-multi-url-video')
            .attr("controls", '')
            .attr("poster", CLT_VIDEO_POSTER_FWLINK);

        var videoSource = $("<source>")
            .attr("src", CLT_VIDEO_FWLINK)
            .attr("type", 'video/mp4');

        video.append(videoSource);
        video.on('play', function (e) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "MultiUrlVideoPlay", 1));
        });
        $element.append(video);
    }

    private _createSimulatePart($container: JQuery) {
        var $element = $container;
        var $simulateDiv = $(domElem("div")).addClass("load-test-multi-url-simulate-part").appendTo($element);
        $(domElem("div", "load-test-multi-url-simulate-title"))
            .addClass("lt-title")
            .text(Resources.SimulateScenario)
            .appendTo($simulateDiv);
        var $descriptionDiv = $(domElem('div')).text(Resources.SimulateScenarioLine1).appendTo($simulateDiv);
        var $list = $(domElem('ul')).appendTo($descriptionDiv);
        $(domElem('li')).appendTo($list).text(Resources.SimulateScenarioPoint1);
        $(domElem('li')).appendTo($list).text(Resources.SimulateScenarioPoint2);
        $(domElem('li')).appendTo($list).text(Resources.SimulateScenarioPoint3);
        $(domElem('li')).appendTo($list).text(Resources.SimulateScenarioPoint4);
        this._createGetStartedButton($descriptionDiv);
    }

    private _createGetStartedButton($container: JQuery): JQuery {
        var $button = $(domElem('button')).addClass('load-test-start-button')
            .addClass('submit-button')
            .attr('type', 'button')
            .appendTo($container);

        var textSpan = $(domElem('span')).addClass('load-test-start-button-text').text(Resources.GetStartedButtonText).appendTo($button);

        $button.click(delegate(this, () => {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "MultiUrlGetStarted", 1));
            window.open(CLT_MULTI_URL_LEARN_MORE_FWLINK, "_blank");
        }));
        return $button;
    }

    private _createInsightsPart($container: JQuery) {
        var $element = $container;
        var $insightsDivContainer = $(domElem("div")).addClass("load-test-multi-url-insights-section-subitems").appendTo($element);
        $(domElem("div", "load-test-multi-url-insights-image")).appendTo($insightsDivContainer);
        var $insightDescriptionDiv = $(domElem('div')).appendTo($insightsDivContainer);
        $(domElem('div')).addClass("load-test-multi-url-insights-section-subitems-titles").text(Resources.GetMeaningfulInsights).appendTo($insightDescriptionDiv);
        var $list = $(domElem('ul')).appendTo($insightDescriptionDiv);
        $(domElem('li')).appendTo($list).text(Resources.GetMeaningfulInsightsPoint1);
        $(domElem('li')).appendTo($list).text(Resources.GetMeaningfulInsightsPoint2);
        $(domElem('li')).appendTo($list).text(Resources.GetMeaningfulInsightsPoint3);
    }

    private _createOthersPart($container: JQuery) {
        var $element = $container;
        var $appTypesDivContainer = $(domElem("div")).addClass("load-test-multi-url-insights-section-subitems").appendTo($element);
        $(domElem("div", "load-test-multi-url-apptypes-image")).appendTo($appTypesDivContainer);
        var $appTypesDescriptionDiv = $(domElem('div')).appendTo($appTypesDivContainer);
        $(domElem('div')).addClass("load-test-multi-url-insights-section-subitems-titles").text(Resources.LoadTestAllYourAppType).appendTo($appTypesDescriptionDiv);
        var $list = $(domElem('ul')).appendTo($appTypesDescriptionDiv);
        $(domElem('li')).appendTo($list).text(Resources.LoadTestAllYourAppTypePoint1);
        $(domElem('li')).appendTo($list).text(Resources.LoadTestAllYourAppTypePoint2);
        $(domElem('li')).appendTo($list).text(Resources.LoadTestAllYourAppTypePoint3);
    }

    private _properties: any;
}

export class GettingStartedSection extends Controls.BaseControl {
    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions();
        this._properties = options.properties;
    }

    private _createView() {
        var $element = this.getElement();
        $(domElem('div')).appendTo($element).addClass("load-test-image");
        var $descriptionDiv = $(domElem('div')).text(Resources.GetStartedDescriptionSummary).appendTo($element).addClass("load-test-description").addClass("lt-title");
        var $list = $(domElem('ul')).appendTo($descriptionDiv);
        $(domElem('li')).appendTo($list).text(Resources.GetStartedLine1);
        $(domElem('li')).appendTo($list).text(Resources.GetStartedLine2);

        var propertyName = "LoadTest.UserMinutesPerMonth";
        $(domElem('li')).appendTo($list).text(Utils_String.localeFormat(Resources.GetStartedLine3, this._properties && this._properties.hasOwnProperty(propertyName) ? this._properties[propertyName] : ""));

        var $learnMoreDiv = $(domElem('a')).appendTo($descriptionDiv).text(Resources.LearnMoreText).click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "LearnMoreLink", 1));
            window.open(CLT_LEARN_MORE_FWLINK, "_blank");
        });
    }

    private _properties: any;
}

export class LoadTestInProgressNextSectionView extends Controls.BaseControl {
    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions();
    }

    private _createView() {
        var $element = this.getElement();
        $(domElem('div')).appendTo($element).addClass("load-test-in-progress-next-section-view-header").text(Resources.InProgressNextSectionHeaderText);

        var $table = $(domElem('table')).appendTo($element).addClass('load-test-in-progress-next-section-view-table');
        this._addRowNumberOne($table);
        this._addRowNumberTwo($table);
        this._addRowNumberThree($table);
        this._addLearnMoreLink($table);
    }

    private _addRowNumberOne($table: JQuery): void {
        var $tr: JQuery,
            $td: JQuery;

        $tr = $(domElem('tr')).appendTo($table);

        $td = $(domElem('td')).appendTo($tr).addClass('load-test-in-progress-next-section-view-table-first-column');
        var $imgDiv = $(domElem('div')).appendTo($td).addClass("load-test-in-progress-next-section-view-img-common load-test-in-progress-next-section-view-img-one");

        this._addListToTableRow($tr, Resources.InProgressNextSectionListOneHeaderText, Resources.InProgressNextSectionListOneText1, Resources.InProgressNextSectionListOneText2, Resources.InProgressNextSectionListOneText3);
    }

    private _addRowNumberTwo($table: JQuery): void {
        var $tr: JQuery,
            $td: JQuery;

        $tr = $(domElem('tr')).appendTo($table);

        $td = $(domElem('td')).appendTo($tr).addClass('load-test-in-progress-next-section-view-table-first-column');
        var $imgDiv = $(domElem('div')).appendTo($td).addClass("load-test-in-progress-next-section-view-img-common load-test-in-progress-next-section-view-img-two");

        this._addListToTableRow($tr, Resources.InProgressNextSectionListTwoHeaderText, Resources.InProgressNextSectionListTwoText1, Resources.InProgressNextSectionListTwoText2, Resources.InProgressNextSectionListTwoText3);
    }

    private _addRowNumberThree($table: JQuery): void {
        var $tr: JQuery,
            $td: JQuery;

        $tr = $(domElem('tr')).appendTo($table);

        $td = $(domElem('td')).appendTo($tr).addClass('load-test-in-progress-next-section-view-table-first-column');
        var $imgDiv = $(domElem('div')).appendTo($td).addClass("load-test-in-progress-next-section-view-img-common load-test-in-progress-next-section-view-img-three");

        this._addListToTableRow($tr, Resources.InProgressNextSectionListThreeHeaderText, Resources.InProgressNextSectionListThreeText1, Resources.InProgressNextSectionListThreeText2, Resources.InProgressNextSectionListThreeText3);
    }

    private _addLearnMoreLink($table: JQuery): void {
        var $tr: JQuery,
            $td: JQuery;

        $tr = $(domElem('tr')).appendTo($table);

        $td = $(domElem('td')).appendTo($tr);

        $td = $(domElem('td')).appendTo($tr);

        var $learnMoreDiv = $(domElem('a')).appendTo($td).text(Resources.LearnMoreText).click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "LearnMoreLinkOnInProgress", 1));
            window.open(CLT_INPROGRESS_LEARN_MORE_FWLINK, "_blank");
        });
    }

    private _addListToTableRow($tr: JQuery, listHeader: string, listPointOne: string, listPointTwo: string, listPointThree: string): void {

        var $td: JQuery = $(domElem('td')).appendTo($tr);

        var $listHeader = $(domElem('div')).appendTo($td).addClass("load-test-in-progress-next-section-view-list-header").text(listHeader);
        var $list = $(domElem('ul')).appendTo($td).addClass("load-test-in-progress-next-section-view-list");
        $(domElem('li')).appendTo($list).text(listPointOne);
        $(domElem('li')).appendTo($list).text(listPointTwo);
        $(domElem('li')).appendTo($list).text(listPointThree);

    }
}

export class LoadTestNextSectionView extends Controls.BaseControl {
    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions();
        this._loadTestResultViewModel = options.viewModel;
    }

    private _createView() {
        var $element = this.getElement();

        var testResult = this._loadTestResultViewModel._getLoadtestResult();

        // Run Another Test Section Start
        var urlToRedirect = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "LoadTest");

        var $runAnotherTestDiv = $(domElem('div')).addClass("load-test-next-section-run-another-test");

        var $runAnotherInnerTextLinkDiv = $(domElem('a')).addClass("load-test-next-section-run-another-test-title").appendTo($runAnotherTestDiv).click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "RunAnotherTestLink", 1));
            window.open(urlToRedirect, "_self");
        });

        var $runAnotherInnerTextDiv = $(domElem('div')).text(Resources.RunAnotherTest).appendTo($runAnotherInnerTextLinkDiv);

        var $rightArrowIconDiv = $(domElem('div')).appendTo($runAnotherTestDiv).addClass("load-test-next-section-run-another-test-arrow-icon").click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "RunAnotherTestLink", 1));
            window.open(urlToRedirect, "_self");
        });

        if (testResult.RunNumber < 3) {
            $($runAnotherTestDiv).appendTo($element);
        }

        // Run Another Test Section End

        var $informationDiv = $(domElem('div')).text(Resources.LoadTestNextSectionHeaderText).appendTo($element).addClass("load-test-next-section-title");

        var testResult = this._loadTestResultViewModel._getLoadtestResult();

        // Load test real life scenarios Section Start
        var $loadTestRealLifeScenariosDiv = $(domElem('div')).appendTo($element).addClass('load-test-next-section-customize-loadtest').click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "LoadTestStepByStepGuide", 1));
            window.open(CLT_SAMPLE_PROJECT_FWLINK, "_blank");
        });

        $(domElem('div')).appendTo($loadTestRealLifeScenariosDiv).addClass('load-test-next-section-customize-loadtest-icon')

        $(domElem('div')).text(Resources.LoadTestScenariosText).appendTo($loadTestRealLifeScenariosDiv);

        $(domElem('div')).text(Resources.LoadTestScenariosSubText).appendTo($loadTestRealLifeScenariosDiv);

        // Load test real life scenarios Section End

        // What's Next List Section Start
        var $listTitleDiv = $(domElem('div')).text(Resources.LoadTestNextSectionRecommendationListHeaderText).appendTo($element).addClass("load-test-next-section-list-title");

        var $list = $(domElem('ul')).appendTo($element).addClass("load-test-next-section-list");

        $(domElem('li')).appendTo($list).text(Resources.LoadTestNextSectionRecommendationListText1);
        $(domElem('li')).appendTo($list).text(Resources.LoadTestNextSectionRecommendationListText2);
        $(domElem('li')).appendTo($list).text(Resources.LoadTestNextSectionRecommendationListText3);

        // What's Next List Section End

        // Video Section Start
        var $cltVideoSectionDiv = $(domElem('div')).appendTo($element)

        var $videoSectionTitleDiv = $(domElem('div')).text(Resources.CLTVideoSectionText).appendTo($cltVideoSectionDiv).addClass("load-test-next-section-video-section-title");

        var $cltVideoDiv = $(domElem('div')).appendTo($cltVideoSectionDiv).addClass("load-test-next-section-video-section-div");

        $(domElem('a')).appendTo($cltVideoDiv).addClass('load-test-next-section-video-icon').click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "CLTVideo", 1));
            window.open(CLT_VIDEO_FWLINK, "_blank");
        });

        // Video Section End

        // Download Visual Studio Ultimate Section Start
        var $downloadVSUDiv = $(domElem('div')).appendTo($element).addClass('load-test-next-section-downloadvsu');

        $(domElem('a')).appendTo($downloadVSUDiv).addClass('load-test-next-section-downloadvsu-icon').click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "DownloadVSUTrial", 1));
            window.open(DOWNLOAD_VISUALSTUDIOULTIMATE_FWLINK, "_blank");
        });

        $(domElem('div')).text(Resources.DownloadVisualStudioUltimate).appendTo($downloadVSUDiv);

        $(domElem('a')).text(Resources.DownloadVisualStudioUltimateSubText).appendTo($downloadVSUDiv).click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "DownloadVSUTrial", 1));
            window.open(DOWNLOAD_VISUALSTUDIOULTIMATE_FWLINK, "_blank");
        });

        // Download Visual Studio Ultimate Section End

        // Feeback Section Start
        var $feedbackDiv = $(domElem('div')).appendTo($element).addClass('load-test-next-section-feedback');

        $(domElem('a')).appendTo($feedbackDiv).addClass('load-test-next-section-feedback-icon').click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "Feedback", 1));
            window.open(FEEDBACK_FWLINK, "_blank");
        });

        $(domElem('a')).text(Resources.FeedbackText).appendTo($feedbackDiv).click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "Feedback", 1));
            window.open(FEEDBACK_FWLINK, "_blank");
        });

        $(domElem('div')).text(Resources.FeedbackSubText).appendTo($feedbackDiv);

        // Feedback Section End

        if (testResult.RunNumber > 2) {
            ($feedbackDiv).addClass("load-test-next-section-feedback-with-bottom-border");
            ($runAnotherTestDiv).appendTo($element);
        }
    }

    private _loadTestResultViewModel: LoadTestResultViewModel;
}

export class LoadTestSettingsSection extends Controls.BaseControl {

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions(options);
        this._startNewLoadTestViewModel = options.viewModel;
        this._properties = options.properties;
    }

    public showError(error: string) {
        this._$errorInfoSection.addClass("load-test-error").text(error);
    }

    public showInfo(info: string) {
        this._$errorInfoSection.removeClass("load-test-info").text(info);
    }

    private _createView() {
        var $element = this.getElement();
        var $list = $(domElem('ul')).appendTo($element);

        var $singleUlrListItem = $(domElem('li')).appendTo($list);
        $(domElem('a')).attr("href", "#singleUrlTest").text(Resources.CreateSingleUrlTest).appendTo($singleUlrListItem);

        var $multiUlrListItem = $(domElem('li')).appendTo($list);
        $(domElem('a')).attr("href", "#multiUrlTest").text(Resources.CreateMultiUrlTest).appendTo($multiUlrListItem);

        $multiUlrListItem.on('click', function (e) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "MultiUrlTabClicked", 1));
        });

        $(domElem('div')).attr("id", "singleUrlTest").appendTo($element);
        $(domElem('div')).attr("id", "multiUrlTest").appendTo($element);

        this._createSingleUrlView($("#singleUrlTest"));
        this._createMultiUrlView($("#multiUrlTest"));

        $element.tabs({
        });
    }

    private _createMultiUrlView($element: JQuery) {
        var $container = $(domElem("div", "load-test-multi-url")).appendTo($element);
        <MultiUrlSection>Controls.BaseControl.createIn(MultiUrlSection, $container, {});
    }

    private _createSingleUrlView($element: JQuery) {
        var $container = this._createLoadTestInfoContainer($element);
        this._loadTestUrlAndTestInfoSection = this._createloadTestUrlAndTestInfo($container);
        this._loadTestSettingsGrid = this._createLoadTestSettingsGrid($container);
        this._$startLoadTestButton = this._createStartLoadTestButton($container);
        this._$spinnerAction = this._createSpinnerAction($container);
        this._$errorInfoSection = this._createErrorInfoSection($container);
    }

    private _createTitle(): JQuery {
        var $element = this.getElement();
        return $(domElem('div')).text(Resources.CreateNewLoadTestText).appendTo($element).addClass("create-new-load-test-title").addClass("lt-title");
    }

    private _createLoadTestInfoContainer($element: JQuery) {
        return $(domElem('div')).appendTo($element).addClass("load-test-info-container");
    }

    private _createloadTestUrlAndTestInfo($container: JQuery): LoadTestUrlAndTestInfoSection {
        return <LoadTestUrlAndTestInfoSection>Controls.BaseControl.createIn(LoadTestUrlAndTestInfoSection, $container, { viewModel: this._startNewLoadTestViewModel, properties: this._properties });
    }

    private _createLoadTestSettingsGrid($container: JQuery): LoadTestSettingsGrid {
        return <LoadTestSettingsGrid>Controls.BaseControl.createIn(LoadTestSettingsGrid, $container, { viewModel: this._startNewLoadTestViewModel });
    }

    private _createStartLoadTestButton($container: JQuery): JQuery {
        var $button = $(domElem('button')).addClass('load-test-start-button')
            .addClass('submit-button')
            .attr('type', 'button')
            .appendTo($container);

        var textSpan = $(domElem('span')).addClass('load-test-start-button-text').text(Resources.StartTestButtonText).appendTo($button);

        var imgSpan = $(domElem('span')).addClass('load-test-start-button-image').appendTo($button);

        $button.click(delegate(this, () => {
            this._onbuttonClick();
        }));
        return $button;
    }

    private _createSpinnerAction($container: JQuery): JQuery {
        var $spinner = $(domElem('div')).addClass('load-settings-spinner-section').appendTo($container).hide();;
        return $spinner;
    }

    private _createErrorInfoSection($container: JQuery): JQuery {
        var $errorInfoSection = $(domElem('div')).addClass('lt-title').addClass('load-settings-error-info-section').appendTo($container);
        return $errorInfoSection;
    }

    private _onbuttonClick() {

        // Clear all errors.
        this._loadTestUrlAndTestInfoSection.resetUrlAndTestNameErrors();
        this.showError("");
        this._$spinnerAction.show();

        // TODO: Currently we get the settings from control and set this on the view model.
        // The right way to do this is to ensure that the controls set the values on the view model
        // directly when the user changes the value in the UI. This allows more granular validation of
        // user settings. This method, should just delegate the call to start load test to the view model.
        var urlAndTestName = this._loadTestUrlAndTestInfoSection.getLoadTestUrlAndTestName();

        var result = this._startNewLoadTestViewModel.setUrl(urlAndTestName.url);
        if (result.status === false) {
            this._$spinnerAction.hide();
            this._loadTestUrlAndTestInfoSection.showUrlError(result.errorMessage);
            return;
        }

        result = this._startNewLoadTestViewModel.setTestName(urlAndTestName.testName);
        if (result.status === false) {
            this._$spinnerAction.hide();
            this._loadTestUrlAndTestInfoSection.showTestNameError(result.errorMessage);
            return;
        }

        var loadTestSettings = this._loadTestSettingsGrid.getLoadTestSettings();
        this._startNewLoadTestViewModel.setUserLoad(loadTestSettings.userLoad);
        this._startNewLoadTestViewModel.setThinkTime(loadTestSettings.thinkTime);
        this._startNewLoadTestViewModel.setRunDuration(loadTestSettings.runDuration);
        this._startNewLoadTestViewModel.setIeBrowserPercent(loadTestSettings.browserDistribution);

        this._startNewLoadTestViewModel.setGeoLocation(this._loadTestUrlAndTestInfoSection.getLoadTestGeoLocation());

        // Start the load test.
        this._setButtonState(this._$startLoadTestButton, false);
        this._startNewLoadTestViewModel.beginStartLoadTest((result) => {
            this._setButtonState(this._$startLoadTestButton, true);
        },
            (error) => {
                this._$spinnerAction.hide();
                this._setButtonState(this._$startLoadTestButton, true);
                this.showError(VSS.getErrorMessage(error));
            });
    }

    private _setButtonState($button: JQuery, enable: boolean) {
        if ($button) {
            if (!enable) {
                $button.attr("disabled", "disabled");
            }
            else {
                $button.removeAttr("disabled");
            }
        }
    }

    private _$startLoadTestButton: JQuery;
    private _loadTestUrlAndTestInfoSection: LoadTestUrlAndTestInfoSection;
    private _loadTestSettingsGrid: LoadTestSettingsGrid;
    private _startNewLoadTestViewModel: StartNewLoadTestViewModel;
    private _$spinnerAction: JQuery;
    private _$errorInfoSection: JQuery;
    private _properties: any;
}

export class LoadTestGeoLocationDropDown extends Controls.BaseControl {

    public initializeOptions(options?) {
        super.initializeOptions(options);
        this._source = options.source;
        this._selectedIndex = 0;
        if ("selectedIndex" in options) {
            this._selectedIndex = options.selectedIndex;
        }
        if ("sourceValue" in options) {
            this._selectedValue = options.sourceValue[this._selectedIndex];
            this._sourceValue = options.sourceValue;
        }
        else {
            this._selectedValue = this._source[this._selectedIndex];
            this._sourceValue = undefined;
        }
    }

    public initialize() {
        super.initialize();
        var $element = this.getElement();
        var $container = $(domElem('div')).appendTo($element).addClass("load-test-geo-location-drop-down");
        this._createSelectionControl($container);
    }

    public getSelectedValue(): any {
        return this._selectedValue;
    }

    public _createSelectionControl($container: JQuery): void {
        var combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $container, {
            source: this._source,
            allowEdit: false,
            indexChanged: (index) => {
                if (this._sourceValue != undefined) {
                    this._selectedValue = this._sourceValue[index];

                }
                else {
                    this._selectedValue = this._source[index];
                }
            }
        });

        combo.setSelectedIndex(this._selectedIndex, false);
    }

    private _source: any[];
    private _selectedValue: any;
    private _sourceValue: any[];
    private _selectedIndex: number;
}

export interface ILoadTestUrlAndTestInfo {
    url: string;
    testName: string;
}

export class LoadTestUrlAndTestInfoSection extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?) {
        super.initializeOptions(options);
        this._startNewLoadTestViewModel = options.viewModel;
        this._properties = options.properties;
    }

    private _createView(): JQuery {
        var $element = this.getElement();
        var $table = $(domElem('table')).appendTo($element).addClass('load-test-settings-table');
        var $row = this._addRow(Resources.WebSiteUrlLabel, $table);
        this._$urlTextbox = $row.find("input").first();
        Utils_UI.Watermark(this._$urlTextbox, { watermarkText: Resources.UrlWatermarkText });
        this._$urlTextbox.focus(delegate(this, function () {
            if (!this._$urlTextbox.val()) {
                this._$urlTextbox.val("http://");
            }
        }));
        this._$urlErrorSpan = this._addEmptyRow("load-test-error", $table);
        this._$urlAppBehindFirewallMessageSpan = this._addEmptyRow("load-test-url-app-behind-firewall-message", $table).text(Resources.AppBehindFireWallTextFirstPart);
        this._appendHyperlinkText(this._$urlAppBehindFirewallMessageSpan);
        $(domElem('span')).text(Resources.AppBehindFireWallTextSecondPart).appendTo(this._$urlAppBehindFirewallMessageSpan);

        this._addEmptyRow("margin-row", $table).text(" ");

        $row = this._addRow(Resources.TestNameLabel, $table);
        this._$testNameTextBox = $row.find("input").first();
        Utils_UI.Watermark(this._$testNameTextBox, { watermarkText: Resources.LoadTestNameWatermarkText });
        this._$testNameTextBox.val(Resources.DefaultLoadTestName);
        this._$testNameErrorSpan = this._addEmptyRow("load-test-error", $table);

        var propertyName = "LoadTest.IsGeoEnabled";
        if (this._properties.hasOwnProperty(propertyName) && this._properties[propertyName] === true) {
            this._addEmptyRow("margin-row", $table).text(" ");
            var $tr: JQuery = $(domElem('tr')).appendTo($table);
            var $td: JQuery = $(domElem('td')).appendTo($tr);
            $(domElem('span')).appendTo($td).text(Resources.GeoLocationTitle).addClass("lt-title").addClass("load-test-label");
            this._$geoLocationDropDown = this._createLoadTestGeoDropDown($tr);
        }

        return $table;
    }

    private _appendHyperlinkText($hyperLinkMessage: JQuery) {
        $(domElem('a')).text(Resources.AppBehindFireWallHyperLinkText).appendTo($hyperLinkMessage).click(function () {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("CLT-VSO", "TrialExperience", "AppBehindFireWall", 1));
            window.open(APP_BEHIND_FIREWALL, "_blank");
        });
    }

    private _createLoadTestGeoDropDown($container: JQuery): LoadTestGeoLocationDropDown {
        var propertyName = "LoadTest.ValidGeoLocations";
        var source: string[];
        var sourceValue: string[];

        if (this._properties.hasOwnProperty(propertyName)) {
            source = (this._properties[propertyName]).split(";");
            sourceValue = (this._properties[propertyName]).split(";");
        }
        var $td: JQuery = $(domElem('td')).appendTo($container);
        return <LoadTestGeoLocationDropDown>Controls.BaseControl.createIn(LoadTestGeoLocationDropDown, $td, {
            source: source,
            sourceValue: sourceValue
        });
    }

    private _addRow(label: string, $table: JQuery): JQuery {
        var $tr: JQuery,
            $td: JQuery;

        $tr = $(domElem('tr')).appendTo($table);
        $td = $(domElem('td')).appendTo($tr);
        $(domElem('span')).appendTo($td).text(label).addClass("lt-title").addClass("load-test-label");
        $td = $(domElem('td')).appendTo($tr).addClass('load-test-settings-textbox-container');
        $("<input type='text' />").appendTo($td).addClass("load-test-settings-textbox");

        return $tr;
    }

    private _addEmptyRow(className: string, $table: JQuery): JQuery {
        var $tr: JQuery,
            $td: JQuery;

        $tr = $(domElem('tr')).appendTo($table);
        $td = $(domElem('td')).appendTo($tr);
        $td = $(domElem('td')).appendTo($tr);
        return $(domElem('span')).addClass("lt-title").addClass(className).appendTo($td);
    }

    public getLoadTestUrlAndTestName(): ILoadTestUrlAndTestInfo {
        return {
            url: this._$urlTextbox.val().trim(),
            testName: this._$testNameTextBox.val().trim()
        }
    }

    public getLoadTestGeoLocation(): string {
        var propertyName = "LoadTest.IsGeoEnabled";
        if (this._properties.hasOwnProperty(propertyName) && this._properties[propertyName] === true) {
            return this._$geoLocationDropDown.getSelectedValue();
        }
        return "";
    }

    public showUrlError(error: string) {
        this._$urlTextbox.addClass("validation-error");
        this._$urlErrorSpan.text(error);
    }

    public showTestNameError(error: string) {
        this._$testNameTextBox.addClass("validation-error");
        this._$testNameErrorSpan.text(error);
    }

    public resetUrlAndTestNameErrors() {
        this._$urlTextbox.removeClass("validation-error");
        this._$urlErrorSpan.text("");
        this._$testNameTextBox.removeClass("validation-error");
        this._$testNameErrorSpan.text("");

    }
    private _$urlTextbox: JQuery;
    private _$testNameTextBox: JQuery;
    private _startNewLoadTestViewModel: StartNewLoadTestViewModel;

    private _$urlErrorSpan: JQuery;
    private _$urlAppBehindFirewallMessageSpan: JQuery;
    private _$testNameErrorSpan: JQuery;

    private _$geoLocationDiv: JQuery;
    private _$geoLocationDropDown: LoadTestGeoLocationDropDown;
    private _properties: any;
}

export class LoadTestSettingsTile extends Controls.BaseControl {

    public initializeOptions(options?) {
        super.initializeOptions(options);
        this._title = options.title;
        this._description = options.description;
        this._source = options.source;
        this._selectedIndex = 0;
        if ("selectedIndex" in options) {
            this._selectedIndex = options.selectedIndex;
        }
        if ("sourceValue" in options) {
            this._selectedValue = options.sourceValue[this._selectedIndex];
            this._sourceValue = options.sourceValue;
        }
        else {
            this._selectedValue = this._source[this._selectedIndex];
            this._sourceValue = undefined;
        }
    }

    public initialize() {
        super.initialize();
        var $element = this.getElement();
        var $container = $(domElem('div')).appendTo($element).addClass("tile-container");
        this._createTitle(this._title, $container);
        this._createDescription(this._description, $container);
        this._createSelectionControl($container);
    }

    public getSelectedValue(): any {
        return this._selectedValue;
    }

    public _createTitle(title: string, $container: JQuery): JQuery {
        return $(domElem('div')).text(title).appendTo($container).addClass("tile-title").addClass("lt-title");
    }

    public _createDescription(description: string, $container: JQuery): JQuery {
        return $(domElem('div')).text(description).appendTo($container).addClass("tile-description").addClass("lt-title");
    }

    public _createSelectionControl($container: JQuery): void {
        var combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $container, {
            source: this._source,
            allowEdit: false,
            indexChanged: (index) => {
                if (this._sourceValue != undefined) {
                    this._selectedValue = this._sourceValue[index];

                }
                else {
                    this._selectedValue = this._source[index];
                }
            }
        });

        combo.setSelectedIndex(this._selectedIndex, false);
    }

    private _title: string;
    private _description: string;
    private _source: any[];
    private _selectedValue: any;
    private _sourceValue: any[];
    private _selectedIndex: number;
}

export interface ILoadTestSettings {
    userLoad: number;
    runDuration: number;
    thinkTime: number;
    browserDistribution: number;
}

export class LoadTestSettingsGrid extends UICommonControls.HorizontalGridControl {

    public initialize(): void {
        super.initialize();
        this.render();
    }

    public initializeOptions(options?) {
        super.initializeOptions(options);
        this._startNewLoadTestViewModel = options.viewModel;
    }

    public render(): void {
        super.render();

        this.addGridControlTitle(Resources.TestSettingsHeaderText);

        var $item = this.addGenericItem("load-settings-tile");
        this._userLoadTile = <LoadTestSettingsTile>Controls.BaseControl.createIn(LoadTestSettingsTile, $item, {
            title: Resources.UserLoadTileTitle,
            description: Resources.UserLoadTileDescription,
            source: ["25 users", "50 users", "100 users", "200 users"],
            sourceValue: [25, 50, 100, 200]
        });


        var $item = this.addGenericItem("load-settings-tile");
        this._runDurationTile = <LoadTestSettingsTile>Controls.BaseControl.createIn(LoadTestSettingsTile, $item, {
            title: Resources.RunDurationTileTitle,
            description: Resources.RunDurationTileDescription,
            source: ["1 minute", "2 minutes", "3 minutes", "4 minutes", "5 minutes"],
            sourceValue: [1, 2, 3, 4, 5]

        });


        var $item = this.addGenericItem("load-settings-tile");
        this._thinkTimeTile = <LoadTestSettingsTile>Controls.BaseControl.createIn(LoadTestSettingsTile, $item, {
            title: Resources.ThinkTimeTileTitle,
            description: Resources.ThinkTimeTileDescription,
            source: ["1 second", "5 seconds"],
            sourceValue: [1, 5]
        });

        var $item = this.addGenericItem("load-settings-tile");
        this._browserDistributionTile = <LoadTestSettingsTile>Controls.BaseControl.createIn(LoadTestSettingsTile, $item, {
            title: Resources.BrowserDistributionTileTitle,
            description: Resources.BrowserDistributionTileDescription,
            source: ["IE-100%, Chrome-0%", "IE-80%, Chrome-20%", "IE-60%, Chrome-40%", "IE-40%, Chrome-60%", "IE-20%, Chrome-80%"],
            sourceValue: [100, 80, 60, 40, 20],
            selectedIndex: 2
        });
    }


    public getLoadTestSettings(): ILoadTestSettings {
        return {
            userLoad: this._userLoadTile.getSelectedValue(),
            runDuration: this._runDurationTile.getSelectedValue(),
            thinkTime: this._thinkTimeTile.getSelectedValue(),
            browserDistribution: this._browserDistributionTile.getSelectedValue()
        };
    }

    private _userLoadTile: LoadTestSettingsTile;
    private _runDurationTile: LoadTestSettingsTile;
    private _thinkTimeTile: LoadTestSettingsTile;
    private _browserDistributionTile: LoadTestSettingsTile;
    private _startNewLoadTestViewModel: StartNewLoadTestViewModel;
}

/******************* End - StartNewLoadTestView and ViewModel *******************************/

Controls.Enhancement.registerEnhancement(LoadTestView, ".load-test-view")

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.LoadTestView", exports);
