import { Action } from "VSS/Flux/Action";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { ViewContextStatus } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";

export class TestResultsReportActionsHub {
    public initializeTestResultSummary = new Action<SummaryInitializationData>();
}

export class SummaryInitializationData {
    public summaryData: TCMContracts.TestResultSummary;
    public viewContextStatus: ViewContextStatus;
    public invokedviaSignalR: boolean;
}
