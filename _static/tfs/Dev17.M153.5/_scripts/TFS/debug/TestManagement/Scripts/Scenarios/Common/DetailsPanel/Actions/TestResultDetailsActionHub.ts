import { ITestResultTreeData } from "TestManagement/Scripts/Scenarios/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Action } from "VSS/Flux/Action";

export class TestResultDetailsActionHub {
    public updateDetailsPane = new Action<ITestDetailsPanePayload>();
    public cleanDetailsPane = new Action();
    public openDetailsPane = new Action();
    public closeDetailsPane = new Action();
    public enterDetailsPaneFullScreen = new Action();
    public exitDetailsPaneFullScreen = new Action();
    public changeDetailsPivot = new Action<string>();
    public onResultsLoaded = new Action<ITestResultViewContextPayload>();
    public onError = new Action<string>();
}

export interface ITestDetailsPanePayload {
    storeTestCaseResultTreeData?: ITestResultTreeData;
    detailedTestResult?: TCMContracts.TestCaseResult;
    testRun?: TCMContracts.TestRun;
    openPane?: string;
}

export enum TestResultDetailsPanePivot {
    Debug = "debug",
    WorkItems = "work-items",
    Attachments = "attachments",
    History = "history"
}

export interface ITestResultViewContextPayload {
    context: Common.IViewContextData;
    errorMessage?: string;
    errorCode?: any;
}
