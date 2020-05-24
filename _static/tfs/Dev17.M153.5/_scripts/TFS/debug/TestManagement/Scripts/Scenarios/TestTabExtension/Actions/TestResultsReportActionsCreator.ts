import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestResultDetailsActionHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import { TestResultsReportActionsHub } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsReportActionsHub";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";

export class TestResultsReportActionsCreator {
    constructor(private _actionHub: TestResultsReportActionsHub, private _resultsActionHub: TestResultDetailsActionHub) {
        this._source = TestResultSource.getInstance();
    }

    public initialize(artifact: Common.IViewContextData, invokedviaSignalR: boolean = false) {
        PerformanceUtils.addSplitTiming(TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails, TMUtils.TRAPerfScenarios.TestResultSummary_SummaryUpdateStarted);        

        this._source.getTestReport(artifact).then((testReport: TCMContracts.TestResultSummary) => {
            this._resultsActionHub.onResultsLoaded.invoke({ context: artifact });
            this._actionHub.initializeTestResultSummary.invoke({ summaryData: testReport, viewContextStatus: artifact.status, invokedviaSignalR: invokedviaSignalR });
        }, (error) => {
            if (error && error.message) {
                this._resultsActionHub.onResultsLoaded.invoke({ context: artifact, errorMessage: error.message, errorCode: error.errorCode });
            } else if (error && error.info) {
                this._resultsActionHub.onResultsLoaded.invoke({ context: artifact, errorMessage: error.info, errorCode: error.errorCode });
            } else {
                this._resultsActionHub.onResultsLoaded.invoke({ context: artifact, errorMessage: Resources.ErrorFetchingResults });
            }
        });
    }

    private _source: TestResultSource;
}
