/// <reference types="jquery" />
import { autobind } from "OfficeFabric/Utilities";
import {
    ITestDetailsPanePayload,
    TestResultDetailsActionHub,
    TestResultDetailsPanePivot,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import { Constants } from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import { TestCaseResult, TestOutcome, TestRun, TestSubResult } from "TFS/TestManagement/Contracts";
import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";

export enum TestMode {
    TestResult,
    TestRun
}

export interface ITestResultDetails {
    test: string;
    outcome: TestOutcome;
    duration: string;
    startedDate: Date;
    completedDate: Date;
    state: string;
    failingContextName?: string;
    isCurrentArtifact?: boolean;
    failingContextId?: number;
    owner?: string;
    errorMessage?: string;
    comment?: string;
    stackTrace?: string;
    computerName: string;
    result: TestCaseResult;
    runId?: number;
    subResultId?: number;
}

export interface ITestRunDetails {
    name: string;
    duration: string;
    runId: number;
    errorMessage?: string;
    comment?: string;
    state?: string;
    startedDate: Date;
    completedDate: Date;
}

export interface ITestResultDetailsViewState {
    isLoading: boolean;
    loadingErrorMessage: string;
    testResults?: ITestResultDetails;
    testRun?: ITestRunDetails;
    testMode: TestMode;
    selectedPivot: string;
}

export class TestResultDetailsViewStore extends Store {

    constructor(private _actionsHub: TestResultDetailsActionHub) {
        super();
        this._initialize();
        this._actionsHub.updateDetailsPane.addListener(this._updateDetailPane);
        this._actionsHub.cleanDetailsPane.addListener(this._cleanDetailPane);
        this._actionsHub.changeDetailsPivot.addListener(this._changeDetailPivot);
        this._actionsHub.onError.addListener(this._onErrorListener);
    }

    private _initialize(): void {
        this._state = this._getTestResultDetailsDefaultState();
    }

    public getState(): ITestResultDetailsViewState {
        return this._state;
    }

    @autobind
    private _cleanDetailPane() {
        this._state = this._getTestResultDetailsDefaultState();
        this.emitChanged();
    }

    @autobind
    private _updateDetailPane(data: ITestDetailsPanePayload) {
        if (!data.storeTestCaseResultTreeData.isTestCaseRow) {
            this._editStateForTestRun(data);
        } else {
            this._editStateForTestResult(data);
        }
        this._state.isLoading = false;
        this._state.loadingErrorMessage = null;

        this._state.selectedPivot = TestResultDetailsPanePivot.Debug;
        for (let key in TestResultDetailsPanePivot){
            if (Utils_String.equals(data.openPane, TestResultDetailsPanePivot[key], true)){
                this._state.selectedPivot = data.openPane;
                break;
            }
        }

        this.emitChanged();
    }

    private _editStateForTestResult(data: ITestDetailsPanePayload): void {
        const treeNodeData = data.storeTestCaseResultTreeData;
        const detailedData: TestCaseResult | TestSubResult = (treeNodeData.subResultId)
            ? this._getSubResultById(data.detailedTestResult.subResults, treeNodeData.subResultId, 1)
            : data.detailedTestResult;

        this._state.testMode = TestMode.TestResult;
        this._state.testResults = {
            test: treeNodeData.test,
            outcome: treeNodeData.outcome,
            duration: treeNodeData.duration,
            failingContextName: treeNodeData.failingContextName,
            failingContextId: treeNodeData.failingContextId,
            isCurrentArtifact: treeNodeData.isCurrentArtifact,
            owner: treeNodeData.owner,
            runId: treeNodeData.runId,
            subResultId: (treeNodeData.subResultId) ? treeNodeData.subResultId : 0,

            state: data.detailedTestResult.state,
            startedDate: detailedData.startedDate,
            completedDate: detailedData.completedDate,
            errorMessage: detailedData.errorMessage ? detailedData.errorMessage : Utils_String.empty,
            comment: detailedData.comment ? detailedData.comment : Utils_String.empty,
            stackTrace: detailedData.stackTrace ? detailedData.stackTrace : Utils_String.empty,
            computerName: detailedData.computerName ? detailedData.computerName : Utils_String.empty,
            result: data.detailedTestResult
        };
    }

    private _editStateForTestRun(data: ITestDetailsPanePayload): void {
        const testRun: TestRun = data.testRun;
        const treeNodeData = data.storeTestCaseResultTreeData;

        this._state.testMode = TestMode.TestRun;
        this._state.testRun = {
            name: testRun.name,
            duration: treeNodeData.duration,
            runId: testRun.id,
            errorMessage: testRun.errorMessage ? testRun.errorMessage : Utils_String.empty,
            comment: testRun.comment ? testRun.comment : Utils_String.empty,
            state: testRun.state,
            startedDate: testRun.startedDate,
            completedDate: testRun.completedDate
        };

        if (testRun.comment) {
            // Send telemetry that test run comment exists
            TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_TestRunComment, {"count": 1});
        }
    }

    private _getSubResultById(subResults: TestSubResult[], id: number, depth: number): TestSubResult {
        let subResult: TestSubResult;
        if (depth > Constants.maxDepthAllowed) {
            return;
        }
        let index: number;
        for (let i = 0; i < subResults.length; ++i) {
            if (subResults[i].id === id) {
                index = i;
            }
        }
        if (index >= 0) {
            subResult = subResults[index];
        } else {
            for (let i = 0; i < subResults.length; ++i) {
                if (subResults[i].subResults) {
                    subResult = this._getSubResultById(subResults[i].subResults, id, depth + 1);
                    if (subResult) {
                        break;
                    }
                }
            }
        }
        return subResult;
    }

    @autobind
    private _onErrorListener(errorMessage: string): void {
        this._state.loadingErrorMessage = errorMessage;
        this._state.isLoading = false;

        this.emitChanged();
    }

    @autobind
    private _changeDetailPivot(pivotKey: string): void {
        this._state.selectedPivot = pivotKey;

        this.emitChanged();
    }

    private _getTestResultDetailsDefaultState(): ITestResultDetailsViewState {
        return {
            isLoading: true,
            loadingErrorMessage: null,
            testResults: null,
            testRun: null,
            testMode: TestMode.TestResult,
            selectedPivot: TestResultDetailsPanePivot.Debug
        } as ITestResultDetailsViewState;
    }

    private _state: ITestResultDetailsViewState;
}