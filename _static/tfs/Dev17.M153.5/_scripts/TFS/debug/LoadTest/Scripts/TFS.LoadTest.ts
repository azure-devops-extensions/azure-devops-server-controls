/// <reference types="jquery" />

/* Define model classes for the  load test feature */



import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("LoadTest/Scripts/Resources/TFS.Resources.LoadTest");

// Define interfaces for all model classes. This is temporary till the time time we move to using
// REST based APIs for ELS.

export enum TestRunState {
    Pending,
    Queued,
    InProgress,
    Stopping,
    Completed,
    Aborted,
    Error
}

export enum ProcessorArchitecture {
    None,
    SIL,
    X86,
    IA64,
    Amd64,
    Arm
}

export enum TestRunSubState {
    None,
    ValidatingTestRun,
    AcquiringResources,
    ConfiguringAgents,
    ExecutingSetupScript,
    WarmingUp,
    RunningTest,
    ExecutingCleanupScript,
    CollectingResults,
    Success,
    PartialSuccess
}

export interface IDropAccessData {
    SaSkey: string;
    DropContainerUrl: string;
}

export interface ILoadTestCreationRequest {
    LoadTestName: string;
    RunDuration: number;
    ThinkTime: number;
    Urls: string[];
    BrowserMixs: IBrowserMix[];
    LoadGenerationGeoLocations: ILoadGenerationGeoLocation[];
    LoadPatternName: string;
    MaxVusers: number;
}

export interface ILoadGenerationGeoLocation {
    Location: string;
    Percentage: number;
}

export interface IBrowserMix {
    BrowserName: string;
    BrowserPercentage: number;
}

export interface ILoadTestRunDetails {
    Duration: number;
    WarmUpDuration: number;
    VirtualUserCount: number;
    CoreCount: number;
    SamplingInterval: number;
}

export interface IIdentityRef {
    DisplayName: string;
    Id: string;
    ImageUrl: string;
    IsContainer: string;
    ProfileUrl: string;
    UniqueName: string;
    Url: string;
}

export interface ILoadTestRunBasic {
    Id: string;
    Name: string;
    RunNumber: number;
    CreatedDate: Date;
    FinishedDate: Date;
    RunType: string;
    RunSpecificDetails: ILoadTestRunDetails;
    CreatedBy: IIdentityRef;
    State: TestRunState;
    Url: string;
    LoadGenerationGeoLocations: ILoadGenerationGeoLocation[];
}

export interface ILoadTestSettings {
    CleanupCommand: string;
    HostProcessPlatform: ProcessorArchitecture;
    SetupCommand: string;
}

export interface ILoadTestDropRef {
    Id: string;
    Url: string;
}

export interface ILoadTestDrop {
    Id: string;
    TestRunId: string;
    DropType: string;
    AccessData: IDropAccessData;
    CreatedDate: Date;
}

export interface ILoadTestRunMessage {
    Cause: string;
    Action: string;
    Source: string;
    LoggedDate: Date;
    Details: string;
}

export interface ILoadTestErrorDetails {
    Type: string;
    SubType: string;
    Occurrences: number;
    MessageText: string;
}

export interface ICounterSample {
    CounterInstanceId: string;
    IntervalNumber: number;
    IntervalEndDate: Date;
    RawValue: number;
    BaseValue: number;
    CounterFrequency: number;
    SystemFrequency: number;
    TimeStamp: number;
    CounterType: string;
    ComputedValue: number;
}

export interface ICounterInstanceSamples {
    CounterInstanceId: string;
    NextRefreshTime: Date;
    Count: number;
    Values: ICounterSample[];
}

export interface ICounterSamplesResult {
    TotalSamplesCount: number;
    MaxBatchSize: number;
    Count: number;
    Values: ICounterInstanceSamples[];
}

export interface ICounterInstance {
    CounterInstanceId: string;
    MachineName: string;
    CategoryName: string;
    CounterName: string;
    CounterUnits: string;
    InstanceName: string;
    UniqueName: string;
    Source: string;
    IsPreselectedCounter: string;
    PartOfCounterGroups: string[];
}

export interface ILoadTestRun extends ILoadTestRunBasic {
    Description: string;
    QueuedDate: Date;
    StartedDate: Date;
    WarmUpStartedDate: Date;
    ExecutionStartedDate: Date;
    ExecutionFinishedDate: Date;
    Chargeable: boolean;
    SubState: TestRunSubState;
    TestSettings: ILoadTestSettings;
    TestDrop: ILoadTestDropRef;
    StartedBy: IIdentityRef;
    StoppedBy: IIdentityRef;
    ResultUri: string;
    AbortMessage: ILoadTestRunMessage;
    AutInitializationError: boolean;
    LoadTestErrors: ILoadTestErrorDetails[];
    AverageResponseTime: string;
    TotalRequests: string;
    TotalFailedRequests: string;
    CloudLoadTestSolutionUrl: string;
}

export class LoadTestHelper {

    public static HasCompleted(loadTestRun: ILoadTestRun) {
        return (loadTestRun.State === TestRunState.Completed || loadTestRun.State === TestRunState.Aborted || loadTestRun.State === TestRunState.Error);
    }

    public static getStateString(state: TestRunState) {
        if (!LoadTestHelper._stateToStringMap) {
            LoadTestHelper._stateToStringMap = {};
            LoadTestHelper._stateToStringMap[<number>TestRunState.Aborted] = Resources.TestRunStateAborted;
            LoadTestHelper._stateToStringMap[<number>TestRunState.Completed] = Resources.TestRunStateCompleted;
            LoadTestHelper._stateToStringMap[<number>TestRunState.Error] = Resources.TestRunStateError;
            LoadTestHelper._stateToStringMap[<number>TestRunState.InProgress] = Resources.TestRunStateInProgress;
            LoadTestHelper._stateToStringMap[<number>TestRunState.Pending] = Resources.TestRunStatePending;
            LoadTestHelper._stateToStringMap[<number>TestRunState.Queued] = Resources.TestRunStateQueued;
            LoadTestHelper._stateToStringMap[<number>TestRunState.Stopping] = Resources.TestRunStateStopping;
        }

        return LoadTestHelper._stateToStringMap[<number>state];
    }

    public static getSubStateString(subState: TestRunSubState) {
        if (!LoadTestHelper._subStateToStringMap) {
            LoadTestHelper._subStateToStringMap = {};
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.AcquiringResources] = Resources.TestRunSubStateAcquiringResources;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.CollectingResults] = Resources.TestRunSubStateCollectingResults;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.ConfiguringAgents] = Resources.TestRunSubStateConfiguringAgents;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.ExecutingCleanupScript] = Resources.TestRunSubStateExecutingCleanupScript;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.ExecutingSetupScript] = Resources.TestRunSubStateExecutingSetupScript;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.PartialSuccess] = Resources.TestRunSubStatePartialSuccess;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.RunningTest] = Resources.TestRunSubStateRunningTest;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.Success] = Resources.TestRunSubStateSuccess;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.ValidatingTestRun] = Resources.TestRunSubStateValidatingTestRun;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.WarmingUp] = Resources.TestRunSubStateWarmingUp;
            LoadTestHelper._subStateToStringMap[<number>TestRunSubState.None] = "";
        }

        return LoadTestHelper._subStateToStringMap[<number>subState];
    }

    private static _stateToStringMap: { [state: number]: string };
    private static _subStateToStringMap: { [state: number]: string };
}

export class LoadTestManager extends TFS_Service.TfsService {

    public beginCreateLoadTest(loadTestCreationRequest: ILoadTestCreationRequest, callback: IResultCallback, errorCallback: IErrorCallback) {
        this._ajaxPost("CreateLoadTestRun",
            {
                loadTestCreationRequestModel: Utils_Core.stringifyMSJSON(loadTestCreationRequest)
            },
            callback,
            errorCallback);

    }

    public beginGetLoadTestRun(testRunId: string, showProgress: boolean, callback: IResultCallback, errorCallback: IErrorCallback) {

        this._ajaxJson("GetLoadTestRun", { testRunId: testRunId }, callback, errorCallback, { showGlobalProgressIndicator: showProgress } );
    }

    public beginGetCounterInstances(testRunId: string, showProgress: boolean, callback: IResultCallback, errorCallback: IErrorCallback) {

        this._ajaxJson("GetCounterInstances", { testRunId: testRunId }, callback, errorCallback, { showGlobalProgressIndicator: showProgress });
    }

    public beginGetCounterSamples(testRunId: string, counterInstances: ICounterInstance[], showProgress: boolean, callback: IResultCallback, errorCallback: IErrorCallback) {

        this._ajaxPost("GetCounterSamples",
            {
                testRunId: testRunId,
                counterInstances: Utils_Core.stringifyMSJSON(counterInstances)
            }, callback, errorCallback);
    }

    public static getInstance(): LoadTestManager {
        if (!LoadTestManager._loadTestManager) {
            LoadTestManager._loadTestManager = TFS_OM_Common.Application.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<LoadTestManager>(LoadTestManager);
        }

        return LoadTestManager._loadTestManager;
    }

    private getApiLocation(action?: string) {
        /// <summary>Gets the url for the action</summary>
        /// <param name="action" type="string" optional="true">the action to be invoked</param>
        return this.getTfsContext().getActionUrl(action || "", "loadtest", { area: "api" });
    }

    private _ajaxJson(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.postMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private static _loadTestManager: LoadTestManager;
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.LoadTest", exports);
