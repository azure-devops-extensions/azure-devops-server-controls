import { ReleaseEnvironmentTestResultsActions } from "TestManagement/Scripts/Scenarios/ReleaseCanvas/Actions/ReleaseEnvironmentTestResultsActionsHub";
import { ReleaseEnvironmentTestResultsSource } from "TestManagement/Scripts/Scenarios/ReleaseCanvas/Sources/ReleaseEnvironmentTestResultsSource";

import * as TCMContracts from "TFS/TestManagement/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class ReleaseEnvironmentTestResultsActionsCreator {
    constructor(private _instanceId?: string) {
        this._actions = ReleaseEnvironmentTestResultsActions.getInstance(this._instanceId);
        this._source = new ReleaseEnvironmentTestResultsSource();
    }

    public static getInstance(instanceId?: string): ReleaseEnvironmentTestResultsActionsCreator {
        instanceId = instanceId || Utils_String.empty;
        if (!this._instanceMap[instanceId]) {
            this._instanceMap[instanceId] = new ReleaseEnvironmentTestResultsActionsCreator(instanceId);
        }
        return this._instanceMap[instanceId];
    }

    // Used by tests
    public getReleaseEnvironmentTestResultsSource(): ReleaseEnvironmentTestResultsSource {
        return this._source;
    }

    public loadTestSummaryForEnvironment(releaseId: number, releaseEnvId: number): IPromise<boolean> {
        if (releaseId && releaseEnvId) {
            return new Promise((resolve, reject) => {
                this._source.fetchTestResultSummaryForEnvironment(releaseId, releaseEnvId).then((testReport: TCMContracts.TestResultSummary) => {
                    let totalTests: number = 0;
                    let totalRuns: number = 0;
                    if (!!testReport &&
                        !!testReport.aggregatedResultsAnalysis &&
                        !!testReport.aggregatedResultsAnalysis.runSummaryByState) {

                        const runSummaryByState = testReport.aggregatedResultsAnalysis.runSummaryByState;

                        for (let state of Object.keys(runSummaryByState)) {
                            // Calculate total tests
                            const resultsByOutcome = runSummaryByState[state].resultsByOutcome;
                            if (resultsByOutcome) {
                                totalTests += this._getAggregatedCount(resultsByOutcome);
                            }

                            const runsCount = runSummaryByState[state].runsCount;
                            if (runsCount) {
                                totalRuns += runsCount;
                            }
                        }

                        this._actions.testSummaryFetched.invoke(testReport);
                    }

                    if (totalTests > 0 || totalRuns > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
                    (error) => {
                        reject(error);
                    });
            });
        } else {
            return new Promise((resolve, reject) => {
                resolve(false);
            });
        }
    }

    public updateEnvironmentStatus(isEnvironmentInProgress: boolean) {
        this._actions.isEnvironmentInProgress.invoke(isEnvironmentInProgress);
    }

    private _getAggregatedCount(resultsByOutcome: { [key: number]: TCMContracts.AggregatedResultsByOutcome }): number {
        let retVal: number = 0;
        if (resultsByOutcome) {
            for (const key of Object.keys(resultsByOutcome)) {
                retVal += resultsByOutcome[key].count;
            }
        }

        return retVal;
    }

    private static _instanceMap: IDictionaryStringTo<ReleaseEnvironmentTestResultsActionsCreator> = {};
    private _actions: ReleaseEnvironmentTestResultsActions;
    private _source: ReleaseEnvironmentTestResultsSource;
}