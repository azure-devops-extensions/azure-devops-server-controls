import { ReleaseEnvironmentTestResultsActions } from "TestManagement/Scripts/Scenarios/ReleaseCanvas/Actions/ReleaseEnvironmentTestResultsActionsHub";
import { AggregatedResultsByOutcome, TestResultSummary, TestRunState, TestOutcome } from "TFS/TestManagement/Contracts";

import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";

export interface ITestResultsSummary {
    totalTests: number;
    failedTests: number;
    passedTests: number;
    abortedRuns: number;
}

export interface IReleaseEnvironmentTestResultsState {
    testResultsSummary: ITestResultsSummary;
    isEnvironmentInProgress: boolean;
}

export class ReleaseEnvironmentTestResultsStore extends Store {
    constructor(private _instanceId?: string) {
        super();

        this._actions = ReleaseEnvironmentTestResultsActions.getInstance(this._instanceId);
        this._initialize();
    }

    public static getInstance(instanceId?: string): ReleaseEnvironmentTestResultsStore {
        instanceId = instanceId || Utils_String.empty;
        if (!this._instanceMap[instanceId]) {
            this._instanceMap[instanceId] = new ReleaseEnvironmentTestResultsStore(instanceId);
        }
        return this._instanceMap[instanceId];
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
        this._actions.testSummaryFetched.addListener(this._updateTestSummary);
        this._actions.isEnvironmentInProgress.addListener(this._updateEnvironmentStatus);
    }

    public getState(): IReleaseEnvironmentTestResultsState {
        return this._state;
    }

    private _updateTestSummary = (testReport: TestResultSummary): void => {
        let totalTests: number = 0, passedCount = 0, failedCount = 0, abortedRunsCount = 0;

        if (!!testReport &&
            !!testReport.aggregatedResultsAnalysis &&
            !!testReport.aggregatedResultsAnalysis.runSummaryByState) {

            const runSummaryByState = testReport.aggregatedResultsAnalysis.runSummaryByState;
            // Calculate runsCount
            abortedRunsCount = runSummaryByState[TestRunState.Aborted]
                ? runSummaryByState[TestRunState.Aborted].runsCount
                : 0;

            if (this._state.isEnvironmentInProgress) {
                for (let state of Object.keys(runSummaryByState)) {
                    // Calculate outcome counts
                    const resultsByOutcome = runSummaryByState[state].resultsByOutcome;
                    if (resultsByOutcome) {
                        totalTests += this._getAggregatedCount(resultsByOutcome);
                        passedCount += resultsByOutcome[TestOutcome.Passed]
                            ? resultsByOutcome[TestOutcome.Passed].count
                            : 0;
                        failedCount += resultsByOutcome[TestOutcome.Failed]
                            ? resultsByOutcome[TestOutcome.Failed].count
                            : 0;
                    }
                }
            } else {
                const resultsByOutcome = testReport.aggregatedResultsAnalysis.resultsByOutcome;
                totalTests = testReport.aggregatedResultsAnalysis.totalTests;

                // Failed tests count
                if (resultsByOutcome && resultsByOutcome[TestOutcome.Failed]) {
                    failedCount = resultsByOutcome[TestOutcome.Failed].count;
                }

                // Passed tests count
                if (resultsByOutcome && resultsByOutcome[TestOutcome.Passed]) {
                    passedCount = resultsByOutcome[TestOutcome.Passed].count;
                }
            }
        }

        this._state.testResultsSummary = {
            totalTests: totalTests,
            passedTests: passedCount,
            failedTests: failedCount,
            abortedRuns: abortedRunsCount
        };

        this.emitChanged();
    }

    private _updateEnvironmentStatus = (isEnvironmentInProgress: boolean): void => {
        this._state.isEnvironmentInProgress = isEnvironmentInProgress;
        this.emitChanged();
    }

    private _getDefaultState(): IReleaseEnvironmentTestResultsState {
        const testResultsSummary: ITestResultsSummary = {
            totalTests: 0,
            failedTests: 0,
            passedTests: 0,
            abortedRuns: 0,
        };

        return {
            testResultsSummary: testResultsSummary,
            isEnvironmentInProgress: true
        } as IReleaseEnvironmentTestResultsState;
    }

    private _getAggregatedCount(resultsByOutcome: { [key: number]: AggregatedResultsByOutcome }): number {
        let retVal: number = 0;
        if (resultsByOutcome) {
            for (const key of Object.keys(resultsByOutcome)) {
                retVal += resultsByOutcome[key].count;
            }
        }

        return retVal;
    }

    private _state: IReleaseEnvironmentTestResultsState;
    private _actions: ReleaseEnvironmentTestResultsActions;
    private static _instanceMap: IDictionaryStringTo < ReleaseEnvironmentTestResultsStore > = { };
}