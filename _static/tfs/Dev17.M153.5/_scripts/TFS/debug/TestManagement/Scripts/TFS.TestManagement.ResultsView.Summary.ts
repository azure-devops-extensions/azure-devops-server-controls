/// <reference types="jquery" />



import q = require("q");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";

import IterationsView = require("TestManagement/Scripts/TFS.TestManagement.ResultsView.Iterations");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TestResultsPreviewControls = require("TestManagement/Scripts/TestReporting/TestTabExtension/PreviewControls");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import TestReportingCommon = require("TestManagement/Scripts/TestReporting/Common/Common");
import ResultHistoryCommon = require("TestManagement/Scripts/TestReporting/TestResultHistory/Common");
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import PreviewAttachmentHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.PreviewAttachmentHelper");
import AttachmentsGridViewHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AttachmentsGridViewHelper");
import BugsGridViewHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.BugsGridViewHelper");
import RequirementsGridViewHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.RequirementsGridViewHelper");

import Navigation_Services = require("VSS/Navigation/Services");

import TCMContracts = require("TFS/TestManagement/Contracts");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import HistogramControl = require("VSS/Controls/Histogram");
import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";
import Menus = require("VSS/Controls/Menus");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Performance = require("VSS/Performance");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");


let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let WITUtils = TMUtils.WorkItemUtils;
let TelemetryService = TCMTelemetry.TelemetryService;
let TelemetryHelper = TCMTelemetry.TelemetryHelper;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let domElem = Utils_UI.domElem;

export interface IPreviewAttachmentsOptions {
    selectedAttachment: TestsOM.AttachmentInfo;
    runId: number;
    resultId: number;
}

export interface IDeleteRequirementsOption {
    e: any;
    testName: string;
    workItemId: string;
    $layoutTable: JQuery;
    noLinkedRequirements: JQuery;
    linkedRequirements: TCMContracts.TestToWorkItemLinks;
    $header: JQuery;
}

export interface IParam {
    parameter: string;
    value: string;
}

export interface IDeleteRequirementDialog extends Dialogs.IConfirmationDialogOptions {
    testResultSummaryView: TestResultSummaryView;
    deleteRequirementOptions: IDeleteRequirementsOption;
}

export class TestResultSummaryView extends Controls.BaseControl {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _currentRunTitle: string;
    private _currentResult: TCMContracts.TestCaseResult;
    private _currentRunId: number;
    private _currentResultId: number;
    private _buildUrl: string;
    private _buildDefinitionId: number;
    private _releaseDefinitionId: number;
    private _viewContext: CommonBase.ViewContext;
    private _fileViewer: any;
    private _previewAttachmentHelper: PreviewAttachmentHelper_LAZY_LOAD.PreviewAttachmentHelper;
    private _attachmentsGridViewHelper: AttachmentsGridViewHelper_LAZY_LOAD.AttachmentsGridViewHelper;
    private _bugsGridViewHelper: BugsGridViewHelper_LAZY_LOAD.BugsGridViewHelper;
    private _requirementsGridViewHelper: RequirementsGridViewHelper_LAZY_LOAD.RequirementsGridViewHelper;

    //array of result ids ordered based on result grid.
    private _currentResultOrder: string[];
    private _errorMessageContainer: any;
    private _resolutionStateIds: any[];
    private _resolutionStateNames: any[];
    private _failureTypeIds: any[];
    private _failureTypeNames: any[];
    private _markdownRenderer: MarkdownRenderer = null;
    private _resultFailureTypeIndex: any;
    private _resultResolutionStateIndex: any;
    private _resolutionStateIndexFlag: any;
    private _workItemSaved: boolean;
    private _toolbar: any;
    private _viewToNavigateBack: any;
    private _testSectionHeader: string = "test-section-header";
    private _$container: JQuery = $("<div class='result-summary-view-container' />");
    private _$iterationsContainer: JQuery;
    private _currentWebApiTestCaseResult: TestsOM.TestCaseResult;
    private _iterationsView: IterationsView.IterationsView;
    private _resultShortcutGroup: ResultShortcutGroup;

    private sharedStepWorkItems: { [id: number]: TestsOM.SharedStepWorkItem; } = {};

    constructor(options?) {
        super($.extend({
            cssClass: "query-results-view",
            showTitle: true,
            showToolbar: true,
            showSummary: true,
            showAnalysis: true,
            showShortcut: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._viewToNavigateBack = this._options.viewToNavigateBack;
        if (this._options.showShortcut !== false) {
            this._resultShortcutGroup = new ResultShortcutGroup(this);
        }
        this._markdownRenderer = new MarkdownRenderer(this._getDefaultMarkdownOptions());
    }

    public getTestRunId(): number {
        return this._currentRunId;
    }

    public getTestResultId(): number {
        return this._currentResult.id;
    }

    public getConsoleLogLinkSection(): JQuery {
        return this._consoleLogLink;
    }

    public getTestResultHistoryLink(): JQuery {
        return this._testResultHistoryLink;
    }

    public refresh() {
        let that = this;
        Diag.logVerbose("[TestResultSummaryView.refresh] - Called");
        this._$container = $("<div class='result-summary-view-container' />");
        this.setResult(parseInt(this._currentResult.testRun.id), this._currentResult.id, null, () => {
            Diag.logVerbose("[TestResultSummaryView.refresh] Refreshed - Exit");
        }, (error) => {
            that._statusUpdate(error);
        });
    }

    private _setResultWrapper(currentResultOrder: any, callback: Function, errorCallback: IErrorCallback) {
        if (this._currentResult && this._currentResult.build) {
            this.beginGetBuildUrl(() => {
                this._setResult(this._currentResult, currentResultOrder);
                if (typeof (callback) === typeof (Function)) {
                    callback(this._currentResult.testCaseTitle);
                }
            }, (error) => {
                this._setResult(this._currentResult, currentResultOrder);
                if (typeof (callback) === typeof (Function)) {
                    callback(this._currentResult.testCaseTitle);
                }
            });
        } else {
            this._setResult(this._currentResult, currentResultOrder);
            if (typeof (callback) === typeof (Function)) {
                callback(this._currentResult.testCaseTitle);
            }
        }

        this._addressUrlCommands();
    }


    /**
    *  <summary>This method has been added to address commands passed via URL.
    *  One of the requirement came from VSCS team to be able to launch create bug dialog via URL
    *  </summary>
    */
    private _addressUrlCommands(): void {
        let state = Navigation_Services.getHistoryService().getCurrentState();

        if (state.hasOwnProperty(TestResultSummaryView.URL_COMMAND_CREATE_BUG)) {
            let commandValue = state[TestResultSummaryView.URL_COMMAND_CREATE_BUG];
            if (Utils_String.equals(commandValue, "true", true)) {
                this._onCreateBugClicked();
                delete state[TestResultSummaryView.URL_COMMAND_CREATE_BUG];
                Navigation_Services.getHistoryService().updateHistoryEntry(state.action, state, true, false, Utils_String.empty, true);
            }
        }
    }


    public setResult(runId: number, resultId: number, currentResultOrder: any, callback: Function, errorCallback: IErrorCallback) {
        Diag.logVerbose("[TestResultSummaryView.setResult]: method called");

        this._currentRunId = runId;
        this._currentResultId = resultId;

        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.GetTestResultDetails);
        scenario.addData({ "resultId": resultId, "runId": runId });

        scenario.addSplitTiming(TMUtils.TRAPerfScenarios.Begin_GetTestResultDetailsFromServer);

        let restResultPromise: IPromise<TCMContracts.TestCaseResult> = this._beginGetTestResult();
       
        let iterationsViewPromise: IPromise<JQuery>;
        
        iterationsViewPromise = this.getIterationsContainer();
     
        q.all([restResultPromise, iterationsViewPromise])
            .then((response: any[]) => {

                scenario.addSplitTiming(TMUtils.TRAPerfScenarios.End_GetTestResultDetailsFromServer);

                let testCaseResult: TCMContracts.TestCaseResult = response[0];
                this._currentResult = testCaseResult;
                this._$iterationsContainer = response[1];
                this._setResultWrapper(currentResultOrder, callback, errorCallback);

                scenario.end();         
            })
            .fail((error) => {
                scenario.abort();
                Diag.logError("[TestResultSummaryView.setResult]: One of more of the promises out of restResultPromise and iterationsViewPromise have not been fulfilled or rejected");
                errorCallback(error);
            });
        Diag.logTracePoint("TestResultSummaryView.SetResult.Done");
    }

    private getIterationsContainer(): IPromise<JQuery> {
        let deferred: Q.Deferred<JQuery> = q.defer<JQuery>();

        // Fetch Test results in Web API model, since parse logic and everything exists.
        TMUtils.getTestResultManager().getTestCaseResults(this._currentRunId, [this._currentResultId], (testCaseResultWithActionResults: TestsOM.ITestCaseResultWithActionResultModel) => {
            let testCaseResult = TestsOM.TestCaseResult.createTestCaseResultObject(testCaseResultWithActionResults[0].testCaseResult, testCaseResultWithActionResults[0].testActionResultDetails);
            this._currentWebApiTestCaseResult = testCaseResult;
            let allAttachments: TestsOM.ITestResultAttachmentModel[] = testCaseResultWithActionResults[0].testActionResultDetails.attachments;
            let $iterationsContainer: JQuery = $("<div class='test-result-iterations-view-container hub-no-content-gutter' />");

            if (testCaseResult.testCaseId > 0) {
                // Fetch test steps into test case result.
                this._beginFetchTestCase(testCaseResult.testCaseId, testCaseResult, (testCase: TestsOM.TestCase) => {
                    let iterations = testCaseResult.iterations.getItems();
                    let iterationLength = iterations.length;
                    for (let iter = 0; iter < iterationLength; iter++) {
                        TMUtils.TestCaseResultUtils.prepareStepResults(testCaseResult, testCase, iter, this.sharedStepWorkItems);
                    }

                    //Display "No data available" when there is NO step information available.
                    if (testCaseResult.iterations.getItems().length > 0) {
                        this._iterationsView = <IterationsView.IterationsView>Controls.BaseControl.createIn(IterationsView.IterationsView, $iterationsContainer, {
                            iterations: testCaseResult.iterations,
                            attachments: allAttachments,
                            isParameterizedTestCase: testCaseResult.dataRowCount > 0 ? true : false
                        });

                        deferred.resolve($iterationsContainer);
                    }
                    else {
                        let $noStepData: JQuery = $("<span class='result-attachments-noitems'/>").text(Resources.TestStepDataNotAvailable);
                        $("<h2 />").addClass(this._testSectionHeader).text(Resources.DetailsText).appendTo($iterationsContainer);
                        $iterationsContainer.append($noStepData);
                        deferred.resolve($iterationsContainer);
                    }
                },
                    (error) => {
                        Diag.logError("[TestResultSummaryView.getIterationsContainer]: Error fetching Test case belongs to a TestResult");
                        deferred.reject(error);
                    });
            }
            else {
                deferred.resolve($iterationsContainer);
            }
        },
            () => {
                Diag.logError("[TestResultSummaryView.getIterationsContainer]: Error fetching TestCaseResult from Web API");
            });
        return deferred.promise;
    }

    /// <summary>
    /// Updates the automated test result from Build/Release Summary page
    /// </summary>
    public updateResult(testResult: TCMContracts.TestCaseResult, viewContext: CommonBase.ViewContext, histogram: HistogramControl.Histogram): void {
        this._histogram = histogram;
        this._currentResult = testResult;
        this._currentResultId = testResult.id;
        this._viewContext = viewContext;
        this._buildUrl = (testResult.build) ? TMUtils.UrlHelper.getBuildSummaryUrl(parseInt(testResult.build.id)) : Utils_String.empty;
        this._buildDefinitionId = (testResult.buildReference) ? testResult.buildReference.definitionId : 0;
        this._releaseDefinitionId = (testResult.releaseReference) ? testResult.releaseReference.definitionId : 0;
        this._setResult(this._currentResult, null);
        this._updateHistogram(this._currentResult);
        Diag.logTracePoint("TestResultSummaryView.UpdateResult.Done");
    }

    public unloadResult(section: JQuery)
    {
        section.find(".test-result-history-link").empty();
        section.find(".test-result-failed-on").empty();
        section.find(".test-result-console-log").empty();
        section.find(".test-result-failing-since").empty();
        this._$container.remove();
    }

    public updateHeaderSectionForBuild(section: JQuery): void {

        let histogramChart: JQuery,
            failedOn: JQuery,
            failingSince: JQuery;

        histogramChart = section.find(".test-result-histogram");

        if (!this._histogram) {
            this._populateHistogram(histogramChart);
        }

        if (this.getTestResultHistoryLink()) {
            this._testResultHistoryLink.empty();
        }

        this._testResultHistoryLink = section.find(".test-result-history-link");
        if (ValueMap.TestResultState.getStateToEnum(this._currentResult.state) === ValueMap.TestResultState.Completed) {
            this._populateTestResultHistoryLink();
        }

        failedOn = section.find(".test-result-failed-on");
        if (this._consoleLogLink) {
            this._consoleLogLink.empty();
        }
        this._consoleLogLink = section.find(".test-result-console-log");
        failingSince = section.find(".test-result-failing-since");

        // FailedOn
        let sb: Utils_String.StringBuilder = new Utils_String.StringBuilder();
        let result = this._currentResult;
        if (Utils_String.defaultComparer(result.state, "Completed") === 0) {
            sb.append(ValueMap.TestOutcome.getFriendlyName(ValueMap.TestOutcome.getOutcomeToEnum(result.outcome)));
        }
        else {
            if (ValueMap.TestResultState.getStateToEnum(result.state) === ValueMap.TestResultState.InProgress) {
                sb.append(Utils_String.format(Resources.InProgressTestRunString, Utils_String.empty));
            } else {
                sb.append(ValueMap.TestResultState.getFriendlyName(ValueMap.TestResultState.getStateToEnum(result.state)));
            }
        }

        if (result.computerName) {
            let computerName = Utils_String.format(Resources.ResultSummaryOnComputerFormat, result.computerName);
            sb.append(" " + computerName);
        }

        let text = sb.toString();
        failedOn.text(text);

        // failing since
        let timeDiff: number = Math.floor(result.durationInMs);
        let duration = Utils_String.format(Resources.ResultSummaryDurationFormat, TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(timeDiff ? timeDiff : 0));

        sb = new Utils_String.StringBuilder();
        sb.append(" ");
        sb.append(duration);
        sb.append(", ");

        if (Utils_String.defaultComparer(result.state, "Completed") === 0 && result.completedDate) {
            //date will be in client time zone. ago will compare date in client time zone.
            sb.append(Utils_Date.ago(result.completedDate));
        }
        else if (result.startedDate) {
            sb.append(" ");
            //date will be in client time zone. ago will compare date in client time zone.
            sb.append(Utils_Date.ago(result.startedDate));
        }
        text = sb.toString();
        failingSince.text(text);
    }

    public _handleToolbarItemClick(command: string) {
        switch (command) {
            case "refresh-query":
                this.refresh();
                break;

            case "next-text-result":
                this._navigateDown();
                break;

            case "navigate-back":
                this.navigateBack();
                break;

            case "prev-test-result":
                this._navigateUp();
                break;

            case "create-bug":
                this._onCreateBugClicked();
                break;

            case "add-to-existing-bug":
                this._onAddToExistingBugClicked();
                break;

            case "update-analysis":
                this._onUpdateAnalysisClicked();
                break;
            case "add-attachment":
                this._onAddAttachmentClicked();
                break;
        }
    }

    private _beginFetchTestCase(testCaseId: number, testCaseResult: TestsOM.TestCaseResult, callback: (testCase: TestsOM.TestCase) => void, errorCallback: IErrorCallback) {
        this._beginGetTestCase(testCaseId, testCaseResult.testCaseRevision, (testCase: TestsOM.TestCase) => {
            this._beginFetchSharedStepsInTestCase(testCase, testCaseResult, (testCase) => {
                callback(testCase);
            },
                (error) => {
                    Diag.logError("[TestResultSummaryView.setResult]: Error fetching _beginFetchSharedStepsInTestCase");
                    if (typeof (errorCallback) === typeof (Function)) {
                        errorCallback(error);
                    }
                });
        },
            (error) => {
                Diag.logError("[TestResultSummaryView.setResult]: Error fetching Test case belongs to a TestResult");
                errorCallback(error);
            });
    }

    private _beginGetTestCase(testCaseId: number, testCaseRevision: number, callback: (testCase: TestsOM.TestCase) => void, errorCallback: IErrorCallback) {
        let fields = TestsOM.TestBase.TestCaseCoreFields;
        fields.push(WITConstants.CoreFieldRefNames.AreaPath);
              
        WITUtils.getWorkItemStore().beginPageWorkItemsByIdRev([testCaseId], [testCaseRevision], fields, (pagedData) => {
            if (pagedData) {
                TMUtils.TestCaseUtils.beginParseTestCaseDataFromPayload(pagedData.rows, pagedData.columns, (testcases) => {
                    if (callback && testcases && testcases.length > 0) {
                        callback(testcases[0]);
                    }
                    else
                    {
                        Diag.logError(Utils_String.format("[TMUtils.TestCaseUtils.beginParseTestCaseDataFromPayload]: Testcase Data is not available"));
                        errorCallback(new Error(Utils_String.format(Resources.NoTestcaseDataAvailableFormat, Resources.NoTestcaseDataAvailable)));
                    }
                });
            }
            else
            {
                Diag.logError(Utils_String.format("[WITUtils.getWorkItemStore().beginPageWorkItemsByIdRev]: PagedData is not available"));
                errorCallback(new Error(Utils_String.format(Resources.NoTestcaseDataAvailableFormat, Resources.NoTestcaseDataAvailable)));
            }
        }, 
            (error) => {
                Diag.logError(Utils_String.format("[TestResultSummaryView._beginGetTestCase]: Unable to fetch Test case data"));
                errorCallback(error);
            });  
    }

    private _beginFetchSharedStepsInTestCase(testCase: TestsOM.TestCase, testCaseResult: TestsOM.TestCaseResult, callback: (testCase: TestsOM.TestCase) => any, errorCallback: IErrorCallback) {
        let rows,
            sharedStepIdAndRevs: TestsOM.IdAndRevision[],
            sharedStepIdAndRevsToFetch: TestsOM.IdAndRevision[],
            ids: number[],
            revs: number[];

        // Load all the shared steps that are in the test cases that are loaded.
        sharedStepIdAndRevs = TMUtils.TestCaseResultUtils.getSharedStepIdAndRevs(testCase, testCaseResult);

        if (sharedStepIdAndRevs.length > 0) {
            ids = TMUtils.getIdsFromIdAndRevs(sharedStepIdAndRevs);
            revs = TMUtils.getRevisionsFromIdAndRevs(sharedStepIdAndRevs);
            let fields = TestsOM.TestBase.TestCaseCoreFields;
            fields.push(WITConstants.CoreFieldRefNames.AreaPath);
            WITUtils.getWorkItemStore().beginPageWorkItemsByIdRev(ids, revs, fields, (pagedData) => {
                if (pagedData) {
                    let sharedSteps: TestsOM.SharedStepWorkItem[] = TMUtils.SharedStepUtils.parseSharedStepDataFromPayload(pagedData.rows, pagedData.columns);
                    let i: number, len: number;
                    let wits: TestsOM.SharedStepWorkItem[] = [];
                    let sharedStepsLength: number = sharedSteps.length;
                    for (i = 0, len = sharedStepsLength; i < len; i++) {
                        let k: number = 0;
                        for (k = 0, len = sharedStepsLength; k < len; k++) {
                            if (sharedStepIdAndRevs[i].id === sharedSteps[k].getId()) {
                                break;
                            }
                        }
                        wits[i] = sharedSteps[k];
                        this.sharedStepWorkItems[sharedStepIdAndRevs[i].id] = wits[i];
                    }

                    TMUtils.SharedStepUtils.mergeSharedStepParametersAndData(testCase, wits);
                    testCase.setSharedStepWorkItemInTestCase(this.sharedStepWorkItems);
                    if (callback) {
                        callback(testCase);
                    }
                }
                else
                {
                    Diag.logError(Utils_String.format("[WITUtils.getWorkItemStore().beginPageWorkItemsByIdRev]: PagedData is not available"));
                    errorCallback(new Error(Utils_String.format(Resources.NoTestcaseDataAvailableFormat, Resources.NoTestcaseDataAvailable)));
                }
            },
                (error) => {
                    Diag.logError(Utils_String.format("[TestResultSummaryView._beginFetchSharedStepsInTestCase]: Unable to fetch shared step belong to test case result"));
                    errorCallback(error);
                });
        }
        else {
            if (callback) {
                callback(testCase);
            }
        }
    }

    private _beginGetTestResult(): IPromise<TCMContracts.TestCaseResult> {
        Diag.logVerbose("[TestResultSummaryView.beginGetTestResult]: method called");
        return TcmService.ServiceManager.instance().testResultsService().getResultById(this._currentRunId, this._currentResultId, TCMContracts.ResultDetails.SubResults | TCMContracts.ResultDetails.Iterations);
    }

    private beginGetBuildUrl(successCallback: IResultCallback, errorCallback: IErrorCallback) {
        Diag.logVerbose("[TestResultSummaryView.beginGetBuildUrl]: method called");
        
        let buildService = TcmService.ServiceManager.instance().buildService();
        buildService.getBuild(parseInt(this._currentResult.build.id)).then(
            (buildObject) => {
                this._buildUrl = buildObject._links.web.href;
                Diag.logVerbose(Utils_String.format("BuildUrl: {0}", this._buildUrl));
                successCallback();
            },
            (error) => {
                Diag.logError(Utils_String.format("[TestResultSummaryView.beginGetBuildUrl]: Unable to fetch Build object for ResultId: {0}", this._currentResult.id));
                errorCallback(error);
            });
    }

    private _setResult(result: TCMContracts.TestCaseResult, resultOrder?: string) {
        Diag.logVerbose("[TestResultSummaryView.setResult] - Called");

        this._currentResult = result;
        this._currentRunTitle = result.testRun.name;
        this._currentRunId = parseInt(result.testRun.id);

        //_currentResultOrder will be null when we come to result summary from result grid. Set this to resultOrder passed.
        //In case of manual window refresh, resultOrder will be null. So, this._currentResultOrder will not be set and it will be null.
        if (!this._currentResultOrder) {
            this._currentResultOrder = resultOrder ? resultOrder.split(";") : null;
        }

        this._resolutionStateIds = [];
        this._resolutionStateNames = [];
        this._failureTypeIds = [];
        this._failureTypeNames = [];
        let that = this;

        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.GetTestFailureAndResolutionStates);
        scenario.addData({ "resultId": result.id, "runId": result.testRun.id });
        if (this._options.showAnalysis !== false) {
            scenario.addSplitTiming(TMUtils.TRAPerfScenarios.BeginGetTestFailureStates);
            TMUtils.getTestResultManager().getTestFailureStates(function (states) {
                scenario.addSplitTiming(TMUtils.TRAPerfScenarios.EndGetTestFailureStates);
                $.each(states, function (i, state) {
                    let index = parseInt(i);
                    that._failureTypeIds[index] = state.id;
                    that._failureTypeNames[index] = state.name;
                    if (that._currentResult && state.id === that._currentResult.failureType) {
                        that._resultFailureTypeIndex = index;
                    }
                });

                scenario.addSplitTiming(TMUtils.TRAPerfScenarios.BeginGetTestResolutionStates);
                TMUtils.getTestResultManager().getTestResolutionStates(function (states) {
                    that._resolutionStateIds[0] = 0;
                    that._resolutionStateNames[0] = Resources.ResolutionStateNone;
                    that._resolutionStateIndexFlag = false;

                    scenario.addSplitTiming(TMUtils.TRAPerfScenarios.EndGetTestResolutionStates);

                    $.each(states, function (i, state) {
                        let index = parseInt(i) + 1;
                        that._resolutionStateIds[index] = state.id;
                        that._resolutionStateNames[index] = state.name;
                        if (that._currentResult && state.id === that._currentResult.resolutionStateId) {
                            that._resultResolutionStateIndex = index;
                            that._resolutionStateIndexFlag = true;
                        }
                    });

                    scenario.end();

                    if (!that._resolutionStateIndexFlag) {
                        that._resultResolutionStateIndex = 0;
                    }

                    that.populate();
                },
                    (error) => {
                        scenario.abort();
                        that._statusUpdate(error);
                    });
            },
                (error) => {
                    scenario.abort();
                    that._statusUpdate(error);
                });
        }
        else {
            scenario.end();
            that.populate();
        }
    }

    public populate(testCaseresult?: TCMContracts.TestCaseResult) {
        let result: TCMContracts.TestCaseResult, $statusContainer: JQuery;

        result = (testCaseresult) ? testCaseresult : this._currentResult;
        this._element.empty();
        this._$container.empty();
        this._element.addClass("result-summary-view");

        if (!result) {
            return;
        }

        if (this._options.showTitle !== false) {
            this._populateTitleSection(result, $("<div class='test-result-view-title' />").appendTo(this._element));
        }

        if (this._options.showToolbar !== false) {
            this._toolbar = this._createToolbar(this._element);
        }

        this._$container.appendTo(this._element);

        if (this._options.showSummary !== false) {
            this._populateResultSummarySection(result, $("<div class='test-result-summary-section hub-no-content-gutter' />").appendTo(this._$container));
        }

        if (this._options.showAnalysis !== false) {
            this._populateAnalysisSection(result, $("<div class='test-result-analysis-section hub-no-content-gutter' />").appendTo(this._$container));
        }

        if (result.errorMessage) {
            this._populateErrorSection(result, $("<div class='error-info-section hub-no-content-gutter' />").appendTo(this._$container));
        }

        if ($.trim(result.stackTrace) !== Utils_String.empty) {
            this._populateStackTraceSection(result, $("<div class='stackTrace-info-section hub-no-content-gutter' />").appendTo(this._$container));
        }

        this.populateAttachmentsSection(result, $("<div class='attachments-section hub-no-content-gutter' />").appendTo(this._$container));
        this._populateBugsSection(result, $("<div class='bugs-section hub-no-content-gutter' />").appendTo(this._$container));
        this._populateLinkedRequirementsSection(result, $("<div class='linked-requirements-section hub-no-content-gutter' />").appendTo(this._$container));
        this._populateIterationsSection();
        Diag.logTracePoint("TestResultSummaryView.Populate.Completed");    
        Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.OpenTestResultDetails);
    }

    private _statusUpdate(error?: any) {
        this._fire("resultSummaryStatusUpdate", [error || this.getStatusText(), error ? true : false]);
    }

    private _getPositionOfCurrentResult() {
        Diag.logVerbose("[TestResultSummaryView._getPositionOfCurrentResult] - Called");
        if (!this._currentResultOrder) {
            return;
        }

        let resultLength = this._currentResultOrder.length;
        for (let i = 0; i < resultLength - 1; i++) {
            if (this._currentResultOrder[i] === this._currentResult.id.toString()) {
                return i + 1;
            }
        }
    }

    private getStatusText() {
        if (this._currentResultOrder) {
            return Utils_String.format(Resources.ResultSummaryStatusText, this._getPositionOfCurrentResult(), this._currentResultOrder.length - 1);
        }
    }

    private navigateBack() {
        let viewName = (this._viewToNavigateBack && this._viewToNavigateBack.name) ? this._viewToNavigateBack.name : ValueMap.RunExplorerViewTabs.ResultQuery;
        let runId = this._currentRunId;
        let resultId = this._currentResult.id;
        this._fire("navigationRequested", { state: { resultId: resultId, runId: runId }, viewName: viewName });
    }

    private _navigateUp() {
        let resultLength = this._currentResultOrder.length;
        for (let i = 1; i < resultLength; i++) {
            if (this._currentResultOrder[i] === this._currentResult.id.toString()) {
                let viewName = ValueMap.RunExplorerViewTabs.ResultSummary;
                let resultId = this._currentResultOrder[i - 1];
                this._fire("navigationRequested", { state: { runId: this._currentRunId, resultId: resultId }, viewName: viewName });
                this._statusUpdate();
            }
        }
    }

    private _navigateDown() {
        let resultLength = this._currentResultOrder.length;
        for (let i = 0; i < resultLength; i++) {
            if (this._currentResultOrder[i] === this._currentResult.id.toString()) {
                if (i < this._currentResultOrder.length - 1 && this._currentResultOrder[i + 1] !== "") {
                    let viewName = ValueMap.RunExplorerViewTabs.ResultSummary;
                    let resultId = this._currentResultOrder[i + 1];
                    this._fire("navigationRequested", { state: { runId: this._currentRunId, resultId: resultId }, viewName: viewName });
                }
            }
        }
    }

    private _createToolbar($container, options?) {
        let toolbarItems = this._createToolbarItems();
        let $toolbar = $("<div class='toolbar'></div>");
        $container.append($toolbar);

        let toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbar, {
            cssClass: "result-summary-view-toolbar",
            items: toolbarItems,
            executeAction: delegate(this, this._onToolbarItemClick),
            getCommandState: delegate(this, this._getToolbarItemCommandState)
        });
        
        return toolbar;
    }

    private _createToolbarItems() {
        let items = [];
        items.push({ id: "refresh-query", showText: false, title: Resources.Refresh, icon: "bowtie-icon bowtie-navigate-refresh" });

        items.push({ separator: true });

        if (LicenseAndFeatureFlagUtils.isAddToExistingBugInTestResultSummaryPageEnabled()) {
            items.push({
                id: "bug-menu-item", text: Resources.BugText, showText: true, icon: "bowtie-icon bowtie-file-bug", cssClass: "bug-menu-item",
                childItems: this._createAndAddBugSubMenu()
            });
        }
        else {
            let createBugText = Utils_String.format(Resources.CreateWorkItemText, Resources.BugCategoryRefName);

            items.push({
                id: "create-bug", text: createBugText, showText: true, icon: "bowtie-icon bowtie-file-bug"
            });
        }

        items.push({ separator: true });
        items.push({ id: "update-analysis", text: Resources.UpdateAnalysisMenuItem, showText: true, icon: "bowtie-icon bowtie-edit" });

        if (LicenseAndFeatureFlagUtils.isAddAttachmentToRunsOrResultsEnabled()) {
            items.push({ separator: true });
            items.push({ id: "add-attachment", text: Resources.AddAttachmentText, showText: true, icon: "bowtie-icon bowtie-attach" });
        }

        //If result order context is not there, this means page is manually refreshed. Don't show navigate up-down in such case.
        if (this._currentResultOrder) {
            items.push({ id: "next-text-result", showText: false, title: Resources.NextResultSummaryIconToolTip, icon: "bowtie-icon bowtie-arrow-down", cssClass: "right-section next-text-result" });
            items.push({ id: "prev-test-result", showText: false, title: Resources.PreviousResultSummaryIconToolTip, icon: "bowtie-icon bowtie-arrow-up", cssClass: "right-section prev-text-result" });
            items.push({ id: "navigate-back", showText: false, title: Resources.BackResultSummaryIconToolTip, icon: "bowtie-icon bowtie-view-list", cssClass: "right-section navigate-back" });
        }

        return items;
    }

    private _onToolbarItemClick(e?) {
        let command = e.get_commandName();
        this._handleToolbarItemClick(command);
    }

    private _getToolbarItemCommandState(command: string) {
        let currentPosition: number;
        switch (command) {
            case "next-text-result":
                let resultLength: number = this._currentResultOrder.length - 1;
                currentPosition = this._getPositionOfCurrentResult();
                if (currentPosition === resultLength) {
                    return Menus.MenuItemState.Disabled;
                }
                break;

            case "prev-test-result":
                currentPosition = this._getPositionOfCurrentResult();
                if (currentPosition === 1) {
                    return Menus.MenuItemState.Disabled;
                }
                break;
        }
    }

    private _createAndAddBugSubMenu() {
        let createBugText: string = Utils_String.format(Resources.CreateWorkItemText, Resources.BugCategoryRefName);
        let addBugText: string = Utils_String.format(Resources.AddToExistingBugText, Resources.BugCategoryRefName);

        return [
            {
                id: "create-bug", text: createBugText, showText: true, icon: "bowtie-icon bowtie-work-item"
            },
            {
                id: "add-to-existing-bug", text: addBugText, showText: true, icon: "bowtie-icon bowtie-link"
            }
        ];
    }

    private _populateTitleSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        Diag.logVerbose("[TestResultSummaryView._populateTitleSection] - Called");

        let params: TMUtils.IParam[] = [{
            parameter: ValueMap.RunExplorerParams.Param_runId,
            value: result.testRun.id
        }];

        let $runLink: JQuery = $("<a />").text(Utils_String.format(Resources.RunScopedQueryTitleFormat, this._currentRunId, this._currentRunTitle))
            .attr("href", TMUtils.UrlHelper.getRunsUrl(ValueMap.RunExplorerViewTabs.ResultQuery, params));

        let resultTitle: string = " / " + result.testCaseTitle;
        $container.append($("<span class='test-result-title' />").append($runLink));
        let $resultTitle = $("<span />").text(resultTitle);
        RichContentTooltip.add(Utils_String.format(Resources.ResultSummaryResultToolTip, result.testCaseTitle), $resultTitle);
        $container.append($resultTitle);
    }

    private _populateStatusSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        Diag.logVerbose("[TestResultSummaryView._populateStatusSection] - Called");
        let text: string, duration: string, computerName: string, $div: JQuery, $links: JQuery, $infoDiv: JQuery, $machineLink: JQuery;
        let sb: Utils_String.StringBuilder = new Utils_String.StringBuilder();
        $container.append($("<span class='result-summary-icon bowtie-icon' />").addClass(ValueMap.TestOutcome.getIconClassName(ValueMap.TestOutcome.getOutcomeToEnum(result.outcome))));

        if (Utils_String.defaultComparer(result.state, "Completed") === 0) {
            sb.append(ValueMap.TestOutcome.getFriendlyName(ValueMap.TestOutcome.getOutcomeToEnum(result.outcome)));
        }
        else {
            sb.append(ValueMap.TestResultState.getFriendlyName(ValueMap.TestResultState.getStateToEnum(result.state)));
        }

        if (result.computerName) {
            computerName = Utils_String.format(Resources.ResultSummaryOnComputerFormat, result.computerName);
            $machineLink = $("<span />").text(computerName);
            sb.append(" " + computerName);
        }

        text = sb.toString();
        $infoDiv = $("<span />").text(text).appendTo($container);

        //MilliSeconds. Duration in ticks. and 10000 ticks = 1 milisecond
        let timeDiff: number = Math.floor(result.durationInMs);
        duration = Utils_String.format(Resources.ResultSummaryDurationFormat, TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(timeDiff ? timeDiff : 0));

        sb = new Utils_String.StringBuilder();
        sb.append(" ");
        sb.append(duration);
        sb.append(", ");

        if (Utils_String.defaultComparer(result.state, "Completed") === 0 && result.completedDate) {
            //date will be in client time zone. ago will compare date in client time zone.
            sb.append(Utils_Date.ago(result.completedDate));
        }
        else if (result.startedDate) {
            sb.append(" ");
            //date will be in client time zone. ago will compare date in client time zone.
            sb.append(Utils_Date.ago(result.startedDate));
        }
        text = sb.toString();
        if (text) {
            $("<div class='test-result-summary-status-duration'/>").text(text);
        }
    }

    private _populateErrorSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        Diag.logVerbose("[TestResultSummaryView._populateErrorSection] - Called");
        let errorClassName: string = "error-message";

        $("<h2 />").addClass(this._testSectionHeader).text(Resources.ErrorMessageLabel).appendTo($container);
        this._errorMessageContainer = $("<div />").text(result.errorMessage).addClass(errorClassName).appendTo($container);
    }

    private _populateStackTraceSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        Diag.logVerbose("[TestResultSummaryView._populateStackTraceSection] - method called");
        $("<h2 />").addClass(this._testSectionHeader).text(Resources.StackTraceLabel).appendTo($container);
        $("<div />").text($.trim(result.stackTrace).replace(/\n\s+/g, "\n")).addClass("stack-trace").appendTo($container);
    }

    private _populateResultSummarySection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        Diag.logVerbose("[TestResultSummaryView._populateResultSummarySection] - Called");
        let that = this, $header: JQuery, $statusContainer: JQuery;

        $header = $("<h2 />").addClass(this._testSectionHeader).text(Resources.ResultSummaryLabel).appendTo($container);

        $statusContainer = $("<div class='test-result-view-status-container' />").appendTo($container);
        this._populateStatusSection(result, $("<div class='test-result-view-status' />").appendTo($statusContainer));

        this._populateResultSummaryContentSection(result, $container);
    }

    private _populateTestResultHistoryLink(): void {
        let link: JQuery = $("<a />");
        let url: string = Utils_String.empty;
        
        let selectedGroupBy = (this._viewContext == CommonBase.ViewContext.Release) ? 
                              ResultHistoryCommon.ResultHistoryCommands.GroupByEnvironment : ResultHistoryCommon.ResultHistoryCommands.GroupByBranch;

        let params: IParam[] = [
            {
                parameter: "runId",
                value: this.getTestRunId().toString()
            },
            {
                parameter: "resultId",
                value: this.getTestResultId().toString()
            },
            {
                parameter: "selectedGroupBy",
                value: selectedGroupBy
            }];

        url = TMUtils.UrlHelper.getTestResultHistoryUrl(params);
        
        link.appendTo(this.getTestResultHistoryLink())
            .text(Resources.ViewHistoryText)
            .attr("class", "test-history-link")
            .attr("href", url)
            .attr("target", "_blank")
            .attr("rel", "nofollow noopener noreferrer")
            .on("click", () => {
                this._addTelemetryForHistoryLinkClick();
            });
    }

    private _addTelemetryForHistoryLinkClick(): void {
        TelemetryService.publishEvents(TelemetryService.featureTestTabinBuildSummary_TestResultHistory, {
            [TelemetryService.sourceWorkFlow]: CommonBase.ViewContext[this._viewContext],
            "NumberPassedInLastTenRuns": this._getPassedCount(), 
            "NumberFailedInLastTenRuns": this._getFailedCount() 
        });
    }

    private _getPassedCount(): number {
        let numberOfPassedRuns = 0;
        let testResultIdentifier = new TestsOM.TestCaseResultIdentifier(parseInt(this._currentResult.testRun.id), this._currentResult.id);
        let testResultIdentifierString = testResultIdentifier.toString();
        for (let i = 0; i < this._resultToHistogramDataMap[testResultIdentifierString].length; ++i) {
            if (this._resultToHistogramDataMap[testResultIdentifierString][i].state === "succeeded") {
                numberOfPassedRuns++;
            }
        }
        return numberOfPassedRuns;
    }

    private _getFailedCount(): number {
        let numberOfPassedRuns = 0;
        let testResultIdentifier = new TestsOM.TestCaseResultIdentifier(parseInt(this._currentResult.testRun.id), this._currentResult.id);
        let testResultIdentifierString = testResultIdentifier.toString();
        for (let i = 0; i < this._resultToHistogramDataMap[testResultIdentifierString].length; ++i) {
            if (this._resultToHistogramDataMap[testResultIdentifierString][i].state === "failed") {
                numberOfPassedRuns++;
            }
        }
        return numberOfPassedRuns;
    }

    private _populateHistogram($container: JQuery): void {
        let barHeightInPx: number = 37;

        let histogramOptions: HistogramControl.IHistogramOptions = {
            renderDefaultBars: true,
            barCount: 10,
            barHeight: barHeightInPx,
            allowInteraction: false
        };

        this._histogram = <HistogramControl.Histogram>Controls.BaseControl.createIn(HistogramControl.Histogram, $container,
            $.extend({
                cssClass: "test-results-histogram definition-histogram"
            }, histogramOptions));

        if (this._currentResult) {
            this._updateHistogram(this._currentResult);
        }
    }

    private _updateHistogram(result: TCMContracts.TestCaseResult): void {
        let testResultIdentifier = new TestsOM.TestCaseResultIdentifier(parseInt(result.testRun.id), result.id);
        let testResultIdentifierString = testResultIdentifier.toString();

        if (this._histogram) {
            this._histogram._unbind("click");

            if (this._resultToHistogramDataMap[testResultIdentifierString]) {
                this._histogram.refresh(this._resultToHistogramDataMap[testResultIdentifierString]);
            }
            else {
                let contextType: TCMContracts.TestResultsContextType = this._viewContext === CommonBase.ViewContext.Release ?
                    TCMContracts.TestResultsContextType.Release : TCMContracts.TestResultsContextType.Build;

                let query: TCMContracts.TestResultsQuery = <TCMContracts.TestResultsQuery>{
                    resultsFilter: <TCMContracts.ResultsFilter>{
                        automatedTestName: result.automatedTestName,
                        testResultsContext: <TCMContracts.TestResultsContext>{ contextType: contextType, build: result.buildReference, release: result.releaseReference }
                    }
                };
                TcmService.ServiceManager.instance().testResultsService().getTestResultsByQuery(query).then((resultQuery: TCMContracts.TestResultsQuery) => {
                    this._resultToHistogramDataMap[testResultIdentifierString] = this._getHistogramDataFromResultTrend(resultQuery.results);
                    this._histogram.refresh(this._resultToHistogramDataMap[testResultIdentifierString]);
                }, (error) => {
                    Diag.logError(Utils_String.format("[TestResultSummaryView._updateHistogram]: Error fetching histogram trend report for test result (runId: {0}, resultId: {1}). Error: {3}", result.testRun.id, result.id, error.mesage));
                });
            }
        }
    }

    private _getHistogramDataFromResultTrend(resultTrend: TCMContracts.TestCaseResult[]): HistogramControl.HistogramBarData[] {
        let histogramData: HistogramControl.HistogramBarData[] = [];

        let maxValue: number = 1; // Max value should be atlead 1 or otherwise we will get divide by zero error
        for (let trend in resultTrend) {
            resultTrend[trend].durationInMs = (resultTrend[trend].durationInMs) ? resultTrend[trend].durationInMs : 1;
            maxValue = Math.max(maxValue, resultTrend[trend].durationInMs);
        }

        for (let trend in resultTrend) {
            let data: HistogramControl.HistogramBarData = {};

            data.value = Math.floor((resultTrend[trend].durationInMs * 100) / maxValue);
            let outcome: TCMContracts.TestOutcome = ValueMap.TestOutcome.getOutcomeToEnum(resultTrend[trend].outcome);
            switch (outcome) {
                case TCMContracts.TestOutcome.Passed:
                    data.state = "succeeded";
                    break;
                case TCMContracts.TestOutcome.Failed:
                    data.state = "failed";
                    break;
                case TCMContracts.TestOutcome.Aborted:
                    data.state = "canceled";
                    data.value = 1;
                    break;
                default:
                    data.state = "partiallysucceeded";
                    break;
            }
            histogramData.unshift(data);
        }

        return histogramData;
    }

    private _populateResultSummaryContentSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        Diag.logVerbose("[TestResultSummaryView._populateResultSummaryContentSection] - Called");

        let testPlanName = Utils_String.empty;
        let testPlanUrl = Utils_String.empty;

        TRACommonControls.TRAHelper.getRowValueForSummary(Resources.ResultSummaryRunByFormat, (result.runBy) ? result.runBy.displayName : Utils_String.empty, Resources.NotAvailableText).appendTo($container);
        TRACommonControls.TRAHelper.getRowValueWithLinkForSummary(Resources.TestedBuildText, result.build ? result.build.name : Utils_String.empty, Resources.NotAvailableText, this._buildUrl).appendTo($container);

        if (result.testPlan) {
            testPlanName = (result.testPlan.name) ? result.testPlan.name : result.testPlan.id.toString();
            testPlanUrl = TMUtils.UrlHelper.getPlanUrl(parseInt(result.testPlan.id));
            TRACommonControls.TRAHelper.getRowValueWithLinkForSummary(Resources.TestPlanText, testPlanName, Resources.NotAvailableText, testPlanUrl).appendTo($container);
            this._renderResultSummary(result, $container);
        }

        TRACommonControls.TRAHelper.getRowValueForSummary(Resources.ResultSummaryPriorityFormat, (result.priority != undefined && result.priority !== 255) ? result.priority.toString() : Utils_String.empty, Resources.NotAvailableText).appendTo($container);
    }

    private _renderResultSummary(result: TCMContracts.TestCaseResult, $container: JQuery): void {
        const planId = parseInt(result.testPlan.id);
        const pointId = parseInt(result.testPoint.id);
        const points = [pointId];
        const savedColumns: TestsOM.ITestPointGridDisplayColumn[] = [];

        let testSuiteName = Utils_String.empty;
        let testSuiteUrl = Utils_String.empty;
        let testCaseName = Utils_String.empty;
        let testCaseUrl = Utils_String.empty;

        const testPlanManager = TFS_OM_Common.ProjectCollection
            .getConnection(TFS_Host_TfsContext.TfsContext.getDefault())
            .getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);

        testPlanManager.fetchTestPoints(planId,
            points,
            savedColumns,
            (testPoints) => {
                if (testPoints && testPoints.length > 0) {
                    if (testPoints[0].suiteId && result.project) {
                        const suiteId = testPoints[0].suiteId;
                        testSuiteName = testPoints[0].suiteName;
                        testSuiteUrl = TMUtils.UrlHelper.getSuiteUrl(planId, suiteId, false, result.project.name);
                        TRACommonControls.TRAHelper.getRowValueWithLinkForSummary(Resources.TestSuiteText,
                            testSuiteName,
                            Resources.NotAvailableText,
                            testSuiteUrl).appendTo($container);
                        if (result.testCase && result.testCase.id) {
                            const testCaseId = parseInt(result.testCase.id);
                            testCaseName = result.testCase.name;
                            testCaseUrl = TMUtils.UrlHelper.getWorkItemUrlInTestPlanView(planId,
                                suiteId,
                                testCaseId,
                                false,
                                result.project.name);
                            TRACommonControls.TRAHelper.getRowValueWithLinkForSummary(Resources.TestCaseText,
                                testCaseName,
                                Resources.NotAvailableText,
                                testCaseUrl).appendTo($container);
                        }

                        TRACommonControls.TRAHelper.getRowValueForSummary(Resources.ResultSummaryConfigurationFormat,
                            testPoints[0].configurationName ? testPoints[0].configurationName : Utils_String.empty,
                            Resources.NotAvailableText).appendTo($container);
                    }
                    q.resolve();
                }
            },
            (error) => {
                Diag.logError(`Error while fetching point by query ${error}`);
            });
    }

    private _populateAnalysisSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        Diag.logVerbose("[TestResultSummaryView._populateAnalysisSection] - Called");
        let $header: JQuery;
        $header = $("<h2 />").addClass(this._testSectionHeader).text(Resources.ResultAnalysisLabel).appendTo($container);
        TRACommonControls.TRAHelper.getRowValueForSummary(Resources.Owner, (result.owner) ? result.owner.displayName : Utils_String.empty, Resources.NotAvailableText).appendTo($container);
        TRACommonControls.TRAHelper.getRowValueForSummary(Resources.ResultSummaryAnalysisFailureTypeFormat, result.failureType, Resources.NotAvailableText).appendTo($container);
        TRACommonControls.TRAHelper.getRowValueForSummary(Resources.ResultSummaryAnalysisResolutionFormat, this._getResolutionStateName(), Resources.NotAvailableText).appendTo($container);
        this._getSummaryCommentRow(Resources.ResultSummaryAnalysisCommentFormat, result.comment, Resources.NotAvailableText).appendTo($container);
    }

    private _getSummaryCommentRow(key: string, value: string, defaultValue: string): JQuery {
        let $row: JQuery;
        let $commentRow: JQuery;
        if (!Utils_String.equals(value, Utils_String.empty)) {
            if (LicenseAndFeatureFlagUtils.isRenderMarkDownCommentEnabled()) {
                $commentRow = $("<div class='test-result-summary-markdown-comment' />");
                let $markDownContainer = $("<div />").addClass(TestResultSummaryView.testManagementMarkdownClass);
                let renderedComment = this._markdownRenderer.renderHtml(value);
                $markDownContainer.append($(renderedComment));
                $("a", $markDownContainer).each(function () {
                    $(this).attr("rel", "noreferrer noopener");
                });
                $commentRow.append($markDownContainer);
            }
            else {
                $commentRow = $("<span class='test-result-summary-comment'/>").text(value);
            }

            $row = $("<div class='summary-item' />").append($("<label class='summary-item-label' />").text(key))
                .append($commentRow);
        }
        else {
            $row = $("<div class='summary-item' />").append($("<label class='summary-item-label' />").text(key))
                .append($("<span class='test-run-summary-no-content'/>").text(defaultValue));
        }
        return $row;
    }

    private _getResolutionStateName(): any {
        return this._resolutionStateNames[this._resultResolutionStateIndex];
    }
    
    public populateAttachmentsSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        let $header: JQuery,
            attachmentsSection: JQuery,
            $layoutTable: JQuery,
            noAttachments: JQuery,
            attachments: TestsOM.AttachmentInfo[],
            statusIndicator: StatusIndicator.StatusIndicator;

        if (LicenseAndFeatureFlagUtils.isGridViewOfRunsOrResultsAttachmentsEnabled()) {
            let latestSubResultId = this._getLatestSubResultId(result);
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.AttachmentsGridViewHelper"], (
                AttachmentsGridViewHelperModule: typeof AttachmentsGridViewHelper_LAZY_LOAD
            ) => {
                if (!this._attachmentsGridViewHelper) {
                    this._attachmentsGridViewHelper = new AttachmentsGridViewHelperModule.AttachmentsGridViewHelper();
                }
                let options: AttachmentsGridViewHelper_LAZY_LOAD.AttachmentsGridViewOptions = {
                    container: $container,
                    attachmentSource: TMUtils.AttachmentSource.testResult,
                    testRunId: this._currentRunId,
                    testResultId: this._currentResultId,
                    subResultId: latestSubResultId
                };
                this._attachmentsGridViewHelper.renderAttachmentsGrid(options);
            },
                (error) => {
                    Diag.logWarning(Resources.UnableToRenderGrid);
                }
            );
        } else {

            let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.PopulateAttachmentsSectionForResult);
            scenario.addData({ "resultId": result.id, "runId": result.testRun.id });

            attachmentsSection = $(
                `<div class='test-result-attachments-section' >
                    <div class='loading-visual' />
                    <table class='attachment-table result-attachment-table' />
                    <span class='result-attachments-noitems'/>
                </div>`);
            $layoutTable = attachmentsSection.find(".result-attachment-table");
            noAttachments = attachmentsSection.find(".result-attachments-noitems");
            attachments = [];

            $header = $("<h2 />").addClass(this._testSectionHeader)
                .text(Utils_String.format(Resources.AttachmentsLabel, attachments.length));

            noAttachments.text(Resources.ResultNoAttachments);
            statusIndicator = <StatusIndicator.StatusIndicator>Controls.Control.enhance(StatusIndicator.StatusIndicator,
                attachmentsSection.find(".loading-visual"),
                { imageClass: "big-status-progress", message: "loading" });
            $container.append($header);
            $container.append(attachmentsSection);

            $layoutTable.hide();
            noAttachments.hide();
            statusIndicator.start();

            TMUtils.getTestResultManager().getTestResultAttachments(parseInt(result.testRun.id), result.id, (testResultAttachment) => {

                for (let i: number = 0, len: number = testResultAttachment.length; i < len; i++) {
                    attachments.push(new TestsOM.AttachmentInfo(testResultAttachment[i].attachmentId, testResultAttachment[i].attachmentName, testResultAttachment[i].attachmentSize, testResultAttachment[i].attachmentComment, testResultAttachment[i].attachmentType));
                }
                this._updateAttachmentsSection(attachments, $layoutTable, noAttachments, $header, statusIndicator);
                scenario.end();
            }, (error) => {
                Diag.logWarning(Utils_String.format("[TestResultSummaryView._populateAttachmentsSection]: Unable to fetch attachments for TestResult (runId: {0}, resultId: {1})",
                    result.testRun.id, result.id));
                scenario.abort();
            });

        }
    }

    public deleteRequirementConfirmationClick(deleteRequirementOptions: IDeleteRequirementsOption) {
        TcmService.ServiceManager.instance().testResultsService().deleteTestMethodToWorkItemLink(deleteRequirementOptions.testName, parseInt(deleteRequirementOptions.workItemId)).then((requirementLinkDeleted) => {
            let updatedWorkItems: TCMContracts.WorkItemReference[] = [];
            deleteRequirementOptions.$layoutTable.empty();
            deleteRequirementOptions.linkedRequirements.workItems.forEach((workItem) => {
                if (!Utils_String.equals(workItem.id, deleteRequirementOptions.workItemId)) {
                    updatedWorkItems.push(workItem);
                }
            });
            deleteRequirementOptions.$header.text(Utils_String.format(Resources.RequirementsLabel, updatedWorkItems.length));

            deleteRequirementOptions.linkedRequirements.workItems = updatedWorkItems;

            this._updateLinkedRequirementsSection(deleteRequirementOptions.linkedRequirements, deleteRequirementOptions.$layoutTable, deleteRequirementOptions.noLinkedRequirements, deleteRequirementOptions.$header);

        }, (error) => {
            Diag.logWarning(Utils_String.format("[TestResultSummaryView._populateLinkedRequirementsSection]: Unable to delete linked requirements for TestResult (testName: {0}, workItemId: {1})",
                deleteRequirementOptions.testName, deleteRequirementOptions.workItemId));
        });
    }

    private _getLatestSubResultId(testResult: TCMContracts.TestCaseResult) : number {
        let maxId : number = 0;
        if(testResult.subResults && testResult.subResults.length > 0){
            for(let i=0; i<testResult.subResults.length; ++i){
                maxId = Math.max(testResult.subResults[i].id, maxId);
            }
        }
        return maxId;
    }

    private _updateAttachmentsSection(attachments: TestsOM.AttachmentInfo[], $layoutTable: JQuery, noAttachments: JQuery, $header: JQuery, statusIndicator: StatusIndicator.StatusIndicator) {
        let $headerRowWithColoumns: JQuery;
        let filter: string = "ConsoleLog";
        $headerRowWithColoumns = this._addAttachmentColoumnHeadersRow();
        statusIndicator.complete();     // Mark status indicator as complete

        //Empty the children of console log section
        if (this.getConsoleLogLinkSection()) {
            this.getConsoleLogLinkSection().empty();
        }

        if (attachments.length > 0) {
            $layoutTable.show();            // Show the attachments table layout
            noAttachments.hide();                  // Hide "No bugs" text

            $layoutTable.append($headerRowWithColoumns);    // Add the header
            $header.text(Utils_String.format(Resources.AttachmentsLabel, attachments.length));

            let firstConsoleLog: boolean = true;
            for (let i: number = 0, len: number = attachments.length; i < len; i++) {

                if (Utils_String.equals(attachments[i].getType(), filter) && firstConsoleLog) {
                    if (this.getConsoleLogLinkSection()) {
                        this.addConsoleLogLink(attachments[i], this.getConsoleLogLinkSection());
                        firstConsoleLog = false;
                    }
                }
                this._addAttachmentRow($layoutTable, attachments[i]);
            }

            Diag.logTracePoint("TestResultSummary.AttachmentsFetched");
        }
        else {
            noAttachments.show();  //  Show "No attachments" as number of attachments is ZERO
            Diag.logTracePoint("TestResultSummary.NoAttachmentsFetched");
        }
    }


    public addConsoleLogLink(attachment: TestsOM.AttachmentInfo, consoleLogSection: JQuery): void {
            let link: JQuery = $("<a />");
            let consoleLogAttachment: TestsOM.AttachmentInfo = attachment;
            link.appendTo(consoleLogSection)
                .text(Resources.ConsoleLog)
                .attr("class", "link")
                .attr("href", "#")
                .on("click", () => {                    
                    this._openPreview(consoleLogAttachment);
                    this._addTelemetryForPreviewStatus(consoleLogAttachment);
                });
            RichContentTooltip.add(consoleLogAttachment.getName(), link, { setAriaDescribedBy: true });
    }

    private _addTelemetryForPreviewStatus(attachment: TestsOM.AttachmentInfo) {
        let attachmentSize: number = attachment.getSize();
        let successful: string = "Successful";
        let failedLargeSize: string = "Failed-LargeSize";
        let status: string = (attachmentSize > TestResultsPreviewControls.PreviewAttachments.FILESIZELIMIT_BYTES) ? failedLargeSize : successful;
        
        TelemetryService.publishEvents(TelemetryService.featureTestTabinBuildSummary_PreviewTestAttachment,
            {
                "PreviewStatus": status,
                "AttachmentSize": attachmentSize
            });
    }

    private _addAttachmentRow($layoutTable: JQuery, attachment: TestsOM.AttachmentInfo) {
        let $layoutRow: JQuery = $("<tr/>");
        let id: number = attachment.getId();

        let params = {
            attachmentId: id
        };
        let fileName: string = attachment.getName();
        let fileNameExtension: string;
        if (fileName.indexOf(".") !== -1) {
            fileNameExtension = fileName.substring(fileName.lastIndexOf("."));
        }

        let url: string = TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params);
        let column: JQuery = $("<a />").appendTo($("<td />").appendTo($layoutRow)).text(attachment.getName());

        if (!LicenseAndFeatureFlagUtils.isPreviewAttachmentsOfRunsOrResultsEnabled() || !TMUtils.getTestResultManager().isAttachmentPreviewable(attachment.getName())) {
            column.attr("href", url).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
        }

        if (!Utils_String.equals(attachment.getComment(), Utils_String.empty)) {
            RichContentTooltip.add(attachment.getComment(), column, { setAriaDescribedBy: true });
        }

        let attachmentSizeString: string = Utils_String.format(Resources.AttachmentSizeValueInKB, Math.ceil(attachment.getSize() / 1024));
        $("<td />").appendTo($layoutRow).text(attachmentSizeString);

        $layoutTable.append($layoutRow);

        column.click(() => {
            if (TMUtils.getTestResultManager().isAttachmentPreviewable(attachment.getName())) {
                if (LicenseAndFeatureFlagUtils.isPreviewAttachmentsOfRunsOrResultsEnabled()) {
                    this._openPreviewAttachmentDialog(attachment);
                }
            } else {
                TelemetryHelper.logTelemetryForPreviewAttachments(TMUtils.AttachmentSource.testResult, TelemetryService.featureDownloadTestResultOrRunAttachment, fileNameExtension, attachment.getSize());
            }
        });
    }

    private _openPreview(selectedAttachment: TestsOM.AttachmentInfo): void {
        this._showPreviewOptions({
            selectedAttachment: selectedAttachment,
            runId: this._currentRunId,
            resultId: this._currentResultId
        });
    }

    private _showPreviewOptions(options?: IPreviewAttachmentsOptions): TestResultsPreviewControls.PreviewAttachments {
        return Dialogs.show(TestResultsPreviewControls.PreviewAttachments as any, $.extend(options, {
           width: "80%",
           height: 650,
           minHeight: 300,
           resizable: true,
           buttons: null
       })) as any;
   }


    private _populateIterationsSection(): void {
        if (this._$iterationsContainer) {
            this._$iterationsContainer.appendTo(this._$container);

            if (this._currentWebApiTestCaseResult.iterations.getItems().length > 0) {
                if (this._currentWebApiTestCaseResult.dataRowCount > 0) {
                    this._iterationsView.collapseAll();
                }
                else {
                    this._iterationsView.expandAll();
                }
            }
        }
    }

    private _populateLinkedRequirementsSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        let $header: JQuery,
            linkedRequirementsSection: JQuery,
            $layoutTable: JQuery,
            noLinkedRequirements: JQuery,
            linkedRequirements: TCMContracts.WorkItemReference[],
            statusIndicator: StatusIndicator.StatusIndicator,
            service: TcmService.ITestResultsService = TcmService.ServiceManager.instance().testResultsService();

        if (LicenseAndFeatureFlagUtils.isGridViewOfLinkedRequirementsEnabled()) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.RequirementsGridViewHelper"], (
                RequirementsGridViewHelperModule: typeof RequirementsGridViewHelper_LAZY_LOAD
            ) => {
                if (!this._requirementsGridViewHelper) {
                    this._requirementsGridViewHelper = new RequirementsGridViewHelperModule.RequirementsGridViewHelper();
                }
                let options: RequirementsGridViewHelper_LAZY_LOAD.RequirementsGridViewOptions = {
                    container: $container,
                    result: result
                };
                this._requirementsGridViewHelper.renderRequirementsGrid(options);
            },
                (error) => {
                    Diag.logWarning(Resources.UnableToRenderGrid);
                }
            );
        } else {
            let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.PopulateLinkedRequirementsSectionForResult);
            scenario.addData({ "resultId": result.id, "runId": result.testRun.id });

            linkedRequirementsSection = $(
                `<div class='test-result-linked-requirements-section' >
                    <div class='loading-visual' />
                    <table class='test-result-recent-linked-requirements-table' />
                    <span class='result-linked-requirements-noitems'/>
                </div>`);
            $layoutTable = linkedRequirementsSection.find(".test-result-recent-linked-requirements-table");
            noLinkedRequirements = linkedRequirementsSection.find(".result-linked-requirements-noitems");
            linkedRequirements = [];

            $header = $("<h2 />").addClass(this._testSectionHeader)
                .text(Utils_String.format(Resources.RequirementsLabel, linkedRequirements.length));

            noLinkedRequirements.text(Resources.ResultNoLinkedRequirements);
            statusIndicator = <StatusIndicator.StatusIndicator>Controls.Control.enhance(StatusIndicator.StatusIndicator,
                linkedRequirementsSection.find(".loading-visual"),
                { imageClass: "big-status-progress", message: "loading" });
            $container.append($header);
            $container.append(linkedRequirementsSection);

            $layoutTable.hide();
            noLinkedRequirements.hide();
            statusIndicator.start();

            if (result.automatedTestName) {
                let testToWorkItemLinks = service.getTestMethodLinkedWorkItems(result.automatedTestName).then((recentLinkedRequirements: TCMContracts.TestToWorkItemLinks) => {
                    this._updateLinkedRequirementsSection(recentLinkedRequirements, $layoutTable, noLinkedRequirements, $header, statusIndicator);
                    scenario.end();
                }, (error) => {
                    statusIndicator.complete();
                    noLinkedRequirements.show();
                    Diag.logWarning(Utils_String.format("[TestResultSummaryView._populateLinkedRequirementsSection]: Unable to fetch linked requirements for TestResult (runId: {0}, resultId: {1})",
                        result.testRun.id, result.id));
                    scenario.abort();
                });
            }
            else {
                this._addDefaultRequirementElements(statusIndicator);
                noLinkedRequirements.show();
                Diag.logTracePoint("TestResultSummary.NoLinkedRequirements");
                scenario.end();
            }
        }
    }

    private _addDefaultRequirementElements(statusIndicator?: StatusIndicator.StatusIndicator): JQuery {
        let $headerRowWithColoumns: JQuery;
        $headerRowWithColoumns = this._addRequirementsColoumnHeaderRow();
        if (statusIndicator) {
            statusIndicator.complete();     // Mark status indicator as complete
        }

        return $headerRowWithColoumns;
    }

    private _updateLinkedRequirementsSection(linkedRequirements: TCMContracts.TestToWorkItemLinks, $layoutTable: JQuery, noLinkedRequirements: JQuery, $header: JQuery, statusIndicator?: StatusIndicator.StatusIndicator): void {
        
        let $headerRowWithColoumns = this._addDefaultRequirementElements(statusIndicator);
        
        if (linkedRequirements && linkedRequirements.workItems.length > 0) {
            $layoutTable.show();            // Show the linked requirements table layout
            noLinkedRequirements.hide();                  // Hide "No linked requirements" text

            $layoutTable.append($headerRowWithColoumns);    // Add the header
       
            $header.text(Utils_String.format(Resources.RequirementsLabel, linkedRequirements.workItems.length));

            for (let i: number = 0, len: number = linkedRequirements.workItems.length; i < len; i++) {
                let linkedRequirementUrl = TMUtils.UrlHelper.getWorkItemUrl(parseInt(linkedRequirements.workItems[i].id));

                let $layoutRow: JQuery = $("<tr/>");

                let $link: JQuery = $("<a>").text(Utils_String.format(" {0} ", parseInt(linkedRequirements.workItems[i].id)))
                    .attr("href", linkedRequirementUrl)
                    .attr("target", "_blank")
                    .attr("rel", "nofollow noopener noreferrer");

                let $linkedRequirementIdColumn: JQuery = $("<td />");
                $linkedRequirementIdColumn.append($link);
                $layoutRow.append($linkedRequirementIdColumn);

                let $nameLink: JQuery = $("<a />").text(linkedRequirements.workItems[i].name)
                    .attr("href", linkedRequirementUrl)
                    .attr("target", "_blank")
                    .attr("rel", "nofollow noopener noreferrer");
                let $linkedRequirementNameColumn: JQuery = $("<td />");

                $linkedRequirementNameColumn.append($nameLink);
                $layoutRow.append($linkedRequirementNameColumn);

                let $deleteIconLink: JQuery = $("<span />").attr({
                    "class": "bowtie-icon bowtie-edit-delete test-results-delete-link",
                    "role": "button",
                    "tabindex": "0",
                    "aria-label": Resources.DeleteAssociation
                })
                    .click(delegate(this, this._requirementDeleteClick, [
                        linkedRequirements.test.name,
                        linkedRequirements.workItems[i].id,
                        $layoutTable,
                        noLinkedRequirements,
                        linkedRequirements,
                        $header
                    ]
                    )).keypress(delegate(this, this._requirementDeleteKeyDown, [
                        linkedRequirements.test.name,
                        linkedRequirements.workItems[i].id,
                        $layoutTable,
                        noLinkedRequirements,
                        linkedRequirements,
                        $header
                    ]
                    ));
                RichContentTooltip.add(Resources.DeleteAssociation, $deleteIconLink);

                let $linkedRequirementDeleteColumn: JQuery = $("<td />");
                $linkedRequirementDeleteColumn.append($deleteIconLink);
                $layoutRow.append($linkedRequirementDeleteColumn);

                $layoutTable.append($layoutRow);
            }
        }
        else {
            noLinkedRequirements.show();  //  Show "No linked requirements text" 
            Diag.logTracePoint("TestResultSummary.NoLinkedRequirements");
        }

    }

    private _populateBugsSection(result: TCMContracts.TestCaseResult, $container: JQuery) {
        let $header: JQuery,
            bugsSection: JQuery,
            $layoutTable: JQuery,
            noBugs: JQuery,
            bugs: TCMContracts.WorkItemReference[],
            statusIndicator: StatusIndicator.StatusIndicator;

        if (LicenseAndFeatureFlagUtils.isGridViewOfAssociatedBugsToTestResultsEnabled()) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.BugsGridViewHelper"], (
                BugsGridViewHelperModule: typeof BugsGridViewHelper_LAZY_LOAD
            ) => {
                if (!this._bugsGridViewHelper) {
                    this._bugsGridViewHelper = new BugsGridViewHelperModule.BugsGridViewHelper();
                }
                let options: BugsGridViewHelper_LAZY_LOAD.BugsGridViewOptions = {
                    container: $container,
                    result: result
                };
                this._bugsGridViewHelper.renderBugsGrid(options);
            },
                (error) => {
                    Diag.logWarning(Resources.UnableToRenderGrid);
                }
            );
        } else {

            let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.PopulateBugsSectionWithRecentBugsForResult);
            scenario.addData({ "resultId": result.id, "runId": result.testRun.id });
            bugsSection = $(
                `<div class='test-result-bugs-section' >
                    <div class='loading-visual' />
                    <table class='test-result-recent-bugs-table' />
                    <span class='result-bugs-noitems'/>
                </div>`);
            $layoutTable = bugsSection.find(".test-result-recent-bugs-table");
            noBugs = bugsSection.find(".result-bugs-noitems");
            bugs = [];

            $header = $("<h2 />").addClass(this._testSectionHeader)
                .text(Resources.BugsText);

            noBugs.text(Resources.ResultNoBugs);
            statusIndicator = <StatusIndicator.StatusIndicator>Controls.Control.enhance(StatusIndicator.StatusIndicator,
                bugsSection.find(".loading-visual"),
                { imageClass: "big-status-progress", message: "loading" });

            $container.append($header);
            $container.append(bugsSection);

            $layoutTable.hide();
            noBugs.hide();

            this._startFetchBugsInBugSection(statusIndicator, result, $header, $layoutTable, noBugs, scenario);
        }
    }

    private _startFetchBugsInBugSection(statusIndicator: StatusIndicator.StatusIndicator, result: TCMContracts.TestCaseResult, $header: JQuery, $layoutTable: JQuery, noBugs: JQuery, scenario: Performance.IScenarioDescriptor) {
        statusIndicator.start();
        let testCaseId: number = result.testCase.id ? parseInt(result.testCase.id) : 0;
        let service: TcmService.ITestResultsService = TcmService.ServiceManager.instance().testResultsService();
        service.getRecentBugs(result.automatedTestName, testCaseId).then((recentBugs: TCMContracts.WorkItemReference[]) => {
            this._updateBugsSection(recentBugs, $layoutTable, noBugs, $header, statusIndicator);
            scenario.end();
        }, (error) => {
            scenario.abort();
            Diag.logWarning(Utils_String.format("[TestResultSummaryView._populateBugsSection]: Unable to fetch recentBugs for TestResult (runId: {0}, resultId: {1}), showing bugs from Associated Bugs list instead.",
                result.testRun.id, result.id));
            this._getAndPopulateAssociatedBugs(result, $layoutTable, noBugs, $header, statusIndicator);
        });
    }

    private _getAndPopulateAssociatedBugs(result: TCMContracts.TestCaseResult, $layoutTable: JQuery, noBugs: JQuery, $header: JQuery, statusIndicator: StatusIndicator.StatusIndicator): void {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.GetAssociatedBugsForResult);
        let service: TcmService.ITestResultsService = TcmService.ServiceManager.instance().testResultsService();
        scenario.addData({ "resultId": result.id, "runId": result.testRun.id });
        service.getAssociatedBugs(parseInt(result.testRun.id), result.id).then((associatedBugs: TCMContracts.WorkItemReference[]) => {
            this._updateBugsSection(associatedBugs, $layoutTable, noBugs, $header, statusIndicator);
            scenario.end();
        }, (error) => {
            Diag.logWarning(Utils_String.format("[TestResultSummaryView._populateBugsSection]: Unable to fetch associatedBugs for TestResult (runId: {0}, resultId: {1}).",
                result.testRun.id, result.id));
                scenario.abort();
        });
    }

    private _updateBugsSection(bugs: TCMContracts.WorkItemReference[], $layoutTable: JQuery, noBugs: JQuery, $header: JQuery, statusIndicator: StatusIndicator.StatusIndicator): void {
        let $headerRowWithColoumns: JQuery;

        $headerRowWithColoumns = this._addBugsColoumnHeadersRow();
        statusIndicator.complete();     // Mark status indicator as complete

        if (bugs.length > 0) {
            $layoutTable.show();            // Show the bugs table layout
            noBugs.hide();                  // Hide "No bugs" text

            $layoutTable.append($headerRowWithColoumns);    // Add the header
            $header.text(Utils_String.format(Resources.BugsLabel, bugs.length));

            for (let i: number = 0, len: number = bugs.length; i < len; i++) {
                let bugUrl = TMUtils.UrlHelper.getWorkItemUrl(parseInt(bugs[i].id));

                let $layoutRow: JQuery = $("<tr/>");
                let $link: JQuery = $("<a>").text(Utils_String.format(" {0} ", parseInt(bugs[i].id)))
                    .attr("href", bugUrl)
                    .attr("target", "_blank")
                    .attr("rel", "nofollow noopener noreferrer")
                    .click(delegate(this, this._workItemLinkClick));

                let $bugIdColumn: JQuery = $("<td />");
                $bugIdColumn.append($link);
                $layoutRow.append($bugIdColumn);

                let $nameLink: JQuery = $("<a />").text(bugs[i].name)
                    .attr("href", bugUrl)
                    .attr("target", "_blank")
                    .attr("rel", "nofollow noopener noreferrer")
                    .click(delegate(this, this._workItemLinkClick));
                let $bugNameColumn: JQuery = $("<td />");

                $bugNameColumn.append($nameLink);
                $layoutRow.append($bugNameColumn);
                $layoutTable.append($layoutRow);
            }
            Diag.logTracePoint("TestResultSummary.BugCreated");
        }
        else {
            noBugs.show();  //  Show "No bugs text" as number of recentBugs is ZERO
            $header.text(Utils_String.format(Resources.BugsLabel, bugs.length));
            Diag.logTracePoint("TestResultSummary.NoBugCreated");
        }

    }

    private _addAttachmentColoumnHeadersRow() {
        let $headerRow: JQuery = $("<tr/>");

        let $coloumnHeader: JQuery = $("<th width='40%'></th>");
        $coloumnHeader.append(Resources.AttachmentName);

        $headerRow.append($coloumnHeader);

        $coloumnHeader = $("<th width='10%'></th>");
        $coloumnHeader.append(Resources.AttachmentSize);

        $headerRow.append($coloumnHeader);
        return $headerRow;
    }

    private _addBugsColoumnHeadersRow() {
        let $headerRow: JQuery = $("<tr/>");

        let $coloumnHeader: JQuery = $("<th width='10%'></th>");
        $coloumnHeader.append(Resources.TestPointGridColumnID);

        $headerRow.append($coloumnHeader);

        $coloumnHeader = $("<th width='40%'></th>");
        $coloumnHeader.append(Resources.TestPointGridColumnTitle);

        $headerRow.append($coloumnHeader);
        return $headerRow;
    }

    private _addRequirementsColoumnHeaderRow() {
        let $headerRow: JQuery = $("<tr/>"), $coloumnHeader: JQuery;

        $coloumnHeader = $("<th width='55px'></th>");
        $coloumnHeader.append(Resources.TestPointGridColumnID);

        $headerRow.append($coloumnHeader);

        $coloumnHeader = $("<th />");
        $coloumnHeader.append(Resources.TestPointGridColumnTitle);

        $headerRow.append($coloumnHeader);

        $coloumnHeader = $("<th />");
        $headerRow.append($coloumnHeader);

        return $headerRow;

    }

    private _requirementDeleteKeyDown(e: any, testName: string, workItemId: string, $layoutTable: JQuery, noLinkedRequirements: JQuery, linkedRequirements: TCMContracts.TestToWorkItemLinks, $header: JQuery) {
        if (e.which && e.which === Utils_UI.KeyCode.ENTER) {
            this._requirementDeleteClick(
                e,
                testName,
                workItemId,
                $layoutTable,
                noLinkedRequirements,
                linkedRequirements,
                $header);
        }
    }

    private _requirementDeleteClick(e: any, testName: string, workItemId: string, $layoutTable: JQuery, noLinkedRequirements: JQuery, linkedRequirements: TCMContracts.TestToWorkItemLinks, $header: JQuery) {

        let deleteRequirementOptions: IDeleteRequirementsOption = {
            e: e,
            testName: testName,
            workItemId: workItemId,
            $layoutTable: $layoutTable,
            noLinkedRequirements: noLinkedRequirements,
            linkedRequirements: linkedRequirements,
            $header: $header
        };
        Dialogs.show(DeleteRequirementDialog, {
            height: "auto",
            width: 400,
            okText: Resources.DeleteText,
            testResultSummaryView: this,
            deleteRequirementOptions: deleteRequirementOptions
        });
    }

    private _workItemLinkClick(e: any) {
        //Telemetry section
        TelemetryService.publishEvent(TelemetryService.featureTestResultViewBug, TelemetryService.eventBugLinkClicked, 1);
    }

    public getTitleContentHtml() {
        let content: JQuery = $("<div class='test-result-title-html' />");
        if (this._currentResult) {
            this._populateTitleSection(this._currentResult, content);
        }
        return $("<div />").append(content).html();
    }

    private _onUpdateAnalysisClicked() {
        let that = this;
        TRACommonControls.RunExplorerDialogs.updateResultAnalysis([new TestsOM.TestCaseResultIdentifier(parseInt(this._currentResult.testRun.id), this._currentResult.id)], this._resolutionStateNames, this._resolutionStateIds, this._failureTypeNames, this._failureTypeIds, {
            onOkClick: function () {
                that.refresh();
            }
        });
    }

    private _onCreateBugClicked() {
        let options = {
            save: () => {
                this._workItemSaved = true;
            },
            close: () => {
                if (this._workItemSaved) {
                    this.refresh(); // Refresh the bug section so as to load the new bug.
                    this._workItemSaved = false;

                    // Telemetry section - Logging telemetry event after bug is create and bug window is closed.
                    TelemetryService.publishEvent(TelemetryService.featureTestResultCreateBug, TelemetryService.eventBugCreated, 1);
                }
            }
        } as TRACommonControls.IWorkItemOption;

        TRACommonControls.BugWorkItemHelper.createAndShowWorkItem(null, [this._currentResult], options);
    }

    private _onAddToExistingBugClicked() {
        let options = {
            save: () => {
                this._workItemSaved = true;
            },
            close: () => {
                if (this._workItemSaved) {
                    this.refresh(); // Refresh the bug section so as to load the new bug.
                    this._workItemSaved = false; 

                    // Telemetry section - Logging telemetry event after bug is linked to existing bug.
                    TelemetryService.publishEvent(TelemetryService.featureTestResultAddToExistingBug, TelemetryService.eventBugAddedToExisting, 1);
                }
            }
        } as TRACommonControls.IWorkItemOption;

        TRACommonControls.BugWorkItemHelper.addToExistingBug([this._currentResult], options);
    }

    private _onAddAttachmentClicked(): void {
        let testCaseResultIdentifier: TestsOM.TestCaseResultIdentifier = new TestsOM.TestCaseResultIdentifier(this._currentRunId, this._currentResultId);
        TRACommonControls.RunExplorerDialogs.openAddResultsAttachmentDialog(testCaseResultIdentifier, () => {
            this.refresh();
        });
    }

    private _openPreviewAttachmentDialog(attachment: TestsOM.AttachmentInfo): void {
        
        let fileName: string = attachment.getName();
        let fileNameExtension: string;
        if (fileName.indexOf(".") !== -1) {
            fileNameExtension = fileName.substring(fileName.lastIndexOf("."));
        }

        VSS.using(["TestManagement/Scripts/TFS.TestManagement.PreviewAttachmentHelper"], (
            PreviewAttachmentHelperModule: typeof PreviewAttachmentHelper_LAZY_LOAD
        ) => {
            if (!this._previewAttachmentHelper) {
                this._previewAttachmentHelper = new PreviewAttachmentHelperModule.PreviewAttachmentHelper();
            }
            let options: PreviewAttachmentHelper_LAZY_LOAD.PreviewAttachmentDialogOptions = {
                attachmentSource: TMUtils.AttachmentSource.testResult,
                testRunId: this._currentRunId,
                testResultId: this._currentResultId,
                subResultId: 0,
                filename: fileName,
                selectedAttachmentId: attachment.getId()
            };
            this._previewAttachmentHelper.openPreviewAttachmentDialog(options);
            TelemetryHelper.logTelemetryForPreviewAttachments(TMUtils.AttachmentSource.testResult, TelemetryService.featurePreviewAttachment_DialogOpened, fileNameExtension, attachment.getSize());
        },
            (error) => {
                Diag.logWarning(Resources.FailedToOpenPreviewDialog);
                TelemetryHelper.logTelemetryForPreviewAttachments(TMUtils.AttachmentSource.testResult, TelemetryService.featurePreviewAttachment_DialogOpenFailed, fileNameExtension, attachment.getSize());
            }
        );
    }
    
    private _getDefaultMarkdownOptions(): MarkdownRendererOptions {
        let options: MarkdownRendererOptions;
        options = {
            validateLink: validateLinkProtocol
        };
        return options;
    }
    private _resultToHistogramDataMap: IDictionaryStringTo<HistogramControl.HistogramBarData[]> = {};
    private _consoleLogLink: JQuery;
    private _histogram: HistogramControl.Histogram;
    private _testResultHistoryLink: JQuery;

    private static URL_COMMAND_CREATE_BUG: string = "create-bug";
    private static testManagementMarkdownClass: string = "testmanagement-rendered-markdown";
}

VSS.initClassPrototype(TestResultSummaryView, {
    _tfsContext: null,
    _currentResult: null,
    _currentRunId: null,
    _errorMessageContainer: null,
    _resolutionStateIds: null,
    _resolutionStateNames: null,
    _failureTypeIds: null,
    _failureTypeNames: null,
    _resultFailureTypeIndex: null,
    _resultResolutionStateIndex: null,
    _viewToNavigateBack: null
});

export class ResultSummaryInfoBar extends Controls.BaseControl {

    private _navigationControl: any;
    private _$elementsContainer: any;
    private _statusIndicator: any;
    private _$titleElement: any;
    private _$statusElement: any;
    private _updateDelegate: any;

    constructor(options?) {
        super($.extend({
            coreCssClass: "query-result-grid-info"
        }, options));

        this._updateDelegate = delegate(this, this._update);
    }

    public initialize() {
        super.initialize();
    }

    public dispose() {
        this.unbind();
        super.dispose();
    }

    public bind(navigationControl, $titleElement) {
        let $parentContainer, $statusAndTitleCell;

        if (this._navigationControl) {
            this._navigationControl._unbind("resultSummaryStatusUpdate", this._updateDelegate);
        }

        this._navigationControl = navigationControl;
        this._navigationControl._bind("resultSummaryStatusUpdate", this._updateDelegate);
        let $heading: JQuery = TestReportingCommon.TestResultSummaryTitleView;

        let $queryTitle: JQuery = $heading.find(".query-title");
        let $queryStatus: JQuery = $heading.find(".query-status");
        $queryTitle.empty();
        $queryStatus.empty();

        $heading.appendTo(this._element);

        this._$elementsContainer = $heading.find(".title-row");

        this._$titleElement = $titleElement.appendTo($queryTitle);
        this._$statusElement = $("<span />").appendTo($queryStatus);

        this._update(this._navigationControl, this._navigationControl.getStatusText(), null);
    }

    public unbind() {
        if (this._navigationControl) {
            this._navigationControl._unbind("resultSummaryStatusUpdate", this._updateDelegate);
            this._navigationControl = null;
        }

        this._$statusElement.text("");
        this._element.toggleClass("invalid", false);
    }

    private _update(sender, status, statusIsError) {
        Diag.logVerbose("[ResultSummaryInfoBar._update] - Called");
        let messageText, message = status, name = null, $countElement, showTitle = true;

        this._element.toggleClass("invalid", statusIsError === true);

        if (statusIsError) {
            message = status instanceof Error ? VSS.getErrorMessage(status) : status;
            this._$titleElement.empty();
            showTitle = false;
        }

        this._$statusElement.text(message);
        this._$elementsContainer.toggleClass("no-title", !showTitle);
    }
}

VSS.initClassPrototype(ResultSummaryInfoBar, {
    _navigationControl: null,
    _$elementsContainer: null,
    _$titleElement: null,
    _$statusElement: null,
    _updateDelegate: null
}); 

export class ResultShortcutGroup extends ShortcutGroupDefinition {

    constructor(private view: TestResultSummaryView) {
        super(Resources.TestResultsShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.RunSummaryShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.TestRunsShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.TestResultsToolbarShortcutGroupName);
        this.registerShortcut(
            "a",
            {
                description: Resources.UpdateAnalysisMenuItem,
                action: () => this.view._handleToolbarItemClick(ResultShortcutGroup.updateAnalysisCommand),
            });
        this.registerShortcut(
            "f",
            {
                description: Resources.Refresh,
                action: () => this.view._handleToolbarItemClick(ResultShortcutGroup.refreshQueryCommand),
            });
        this.registerShortcut(
            "j",
            {
                description: Resources.MoveStepDown,
                action: () => this.view._handleToolbarItemClick(ResultShortcutGroup.nextResultCommand),
            });
        this.registerShortcut(
            "k",
            {
                description: Resources.MoveStepUp,
                action: () => this.view._handleToolbarItemClick(ResultShortcutGroup.prevResultCommand),
            });
        this.registerShortcut(
            "q",
            {
                description: Resources.NavigateBack,
                action: () => this.view._handleToolbarItemClick(ResultShortcutGroup.navigateBackCommand),
            });
        this.registerShortcut(
            "c b",
            {
                description: Resources.CreateBugShortcut,
                action: () => this.view._handleToolbarItemClick(ResultShortcutGroup.createBugCommand),
            });
    }
    private static refreshQueryCommand: string = "refresh-query";
    private static createBugCommand: string = "create-bug";
    private static updateAnalysisCommand: string = "update-analysis";
    private static nextResultCommand: string = "next-text-result";
    private static prevResultCommand: string = "prev-test-result";
    private static navigateBackCommand: string = "navigate-back";
}

export class DeleteRequirementDialog extends Dialogs.ConfirmationDialogO<IDeleteRequirementDialog>{
    constructor(options) {
        super(options);
    }

    public initialize() {
        super.initialize();
        // Setting the title of the dialog
        this.setTitle(Resources.DeleteAssociation);
        this._populateDialog();
    }

    public onOkClick() {
        this._options.testResultSummaryView.deleteRequirementConfirmationClick(this._options.deleteRequirementOptions);
        this.close();
    }

    private _populateDialog(): void{
        this.updateOkButton(true);
        this._createConfirmationContent();
        this._$deleteConfirmationContent.find(".test-results-delete-requirement-warning-text").text(Resources.DeleteRequirementConfirmationText);
    }

    private _createConfirmationContent() {
        this._$deleteConfirmationContent = $(
            `<div class='test-results-delete-requirement-confirmation-content' >
                   <table>
                     <td class='test-results-delete-requirement-warning-icon bowtie-icon bowtie-status-warning'\>
                     <td class='test-results-delete-requirement-warning-text'\>
                  </table>
            </div>`
            );
        this._$deleteConfirmationContent.appendTo(this._element);
    }

    private _$deleteConfirmationContent: JQuery;
}

// Inspect the provided urls for all protocols we want to prevent
// The markdown-it defaults are to allow the data protocol if it is an image but
// we don't want to allow embeded images that we'll have to scan for malicious content
const BAD_PROTOCOLS = /^(vbscript|javascript|file|data):/;
export function validateLinkProtocol(url) {
    var str = url.trim().toLowerCase();
    return !BAD_PROTOCOLS.test(str);
}
