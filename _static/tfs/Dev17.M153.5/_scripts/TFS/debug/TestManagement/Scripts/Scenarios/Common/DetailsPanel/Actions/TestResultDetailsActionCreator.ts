/// <reference types="react" />
import { ITestResultTreeData } from "TestManagement/Scripts/Scenarios/Common/Common";
import { TestResultDetailsActionHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import { ContractConversionUtils } from "TestManagement/Scripts/Scenarios/TestTabExtension/ConvertUtils";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { TestCaseResult, TestRun } from "TFS/TestManagement/Contracts";
import { ViewContext } from "TestManagement/Scripts/TestReporting/Common/Common";

export class TestResultDetailsActionCreator {
    constructor(private _resultDetailsActionHub: TestResultDetailsActionHub, private _source: TestResultSource, private _viewContextData: Common.IViewContextData, private _updateFailingSinceDataAndOwner?: boolean) {
    }

    public openDetailsPane(testResultTreeData: ITestResultTreeData) {
        if (testResultTreeData.isTestCaseRow) {
            this._resultDetailsActionHub.openDetailsPane.invoke(null);

            // show spinner while fetching TestCase result details from server
            this._resultDetailsActionHub.cleanDetailsPane.invoke(null);
            this._source.getSelectedTestCaseResult(this._viewContextData, testResultTreeData.runId, testResultTreeData.resultId).then((testResultDetails: TestCaseResult) => {

                if (this._updateFailingSinceDataAndOwner && testResultDetails) {
                    if (testResultDetails.failingSince && this._viewContextData) {
                        const failingSince = testResultDetails.failingSince;
                        if (this._viewContextData.viewContext === ViewContext.Build) {
                            testResultTreeData.failingContextId = failingSince.build ? failingSince.build.id : 0;
                            testResultTreeData.failingContextName = failingSince.build ? failingSince.build.number : "";
                        } else if (this._viewContextData.viewContext === ViewContext.Release) {
                            testResultTreeData.failingContextId = failingSince.release ? failingSince.release.id : 0;
                            testResultTreeData.failingContextName = failingSince.release ? failingSince.release.name : "";
                        }
                    }
                    testResultTreeData.owner = (testResultDetails.owner) ? testResultDetails.owner.displayName : "";
                }
                this._resultDetailsActionHub.updateDetailsPane.invoke(
                    {
                        storeTestCaseResultTreeData: testResultTreeData,
                        detailedTestResult: testResultDetails,
                        testRun: null
                    }
                );
                TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_TestRowVisited, { "TestResultOutcome": TCMContracts.TestOutcome[testResultTreeData.outcome] });
            }).then(undefined, error => {
                this._resultDetailsActionHub.onError.invoke(error);
            });
        } else if (testResultTreeData.runId > 0) {
            // Show details pane for groups only when Group by value is TestRun
            this._resultDetailsActionHub.openDetailsPane.invoke(null);

            // show spinner while fetching TestCase result details from server
            this._resultDetailsActionHub.cleanDetailsPane.invoke(null);
            this._source.getTestRunById(testResultTreeData.runId).then((testRun: TestRun) => {
                this._resultDetailsActionHub.updateDetailsPane.invoke(
                    {
                        testRun: testRun,
                        storeTestCaseResultTreeData: testResultTreeData,
                        detailedTestResult: null
                    }
                );
            });
        }
    }

    public openDetailsPaneInFullScreenMode(runId: number, resultId: number, paneView?: string) {
        this._resultDetailsActionHub.enterDetailsPaneFullScreen.invoke(null);
        this._source.getSelectedTestCaseResult(this._viewContextData, runId, resultId).then((testResultDetails: TCMContracts.TestCaseResult) => {
            let testResultTreeData = ContractConversionUtils.getResultViewModelFromTestResult(testResultDetails, this._viewContextData, "-1");
            this._resultDetailsActionHub.updateDetailsPane.invoke({
                storeTestCaseResultTreeData: testResultTreeData,
                detailedTestResult: testResultDetails,
                openPane: paneView
            });
        }).then(undefined, error => {
            this._resultDetailsActionHub.onError.invoke(error);
        });
    }

    public pivotSelected(pivot: string) {
        this._resultDetailsActionHub.changeDetailsPivot.invoke(pivot);
    }

    public closeDetailsPane() {
        this._resultDetailsActionHub.closeDetailsPane.invoke(null);
        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_DetailsPanelClosed, {});
    }

    public enterDetailsPaneFullScreen() {
        this._resultDetailsActionHub.enterDetailsPaneFullScreen.invoke(null);
        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_DetailsPanelFullView, {});
    }

    public exitDetailsPaneFullScreen() {
        this._resultDetailsActionHub.exitDetailsPaneFullScreen.invoke(null);
    }
}