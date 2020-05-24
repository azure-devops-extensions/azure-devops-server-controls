/// <reference types="jquery" />
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestResultsReportActionsHub, SummaryInitializationData } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsReportActionsHub";
import { DataType, DifferenceType, IDifference, ISummaryNumberChartProps, ValueType } from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/ResultSummaryDetailsChart";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import { ViewContextStatus } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";


export interface IAggregatedTestsCount {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    notImpactedTests: number;
    notExecutedTests: number;
    abortedTests: number;
    otherTests: number;
}

export interface IAggregatedRunsOutcomeCount {
    passed: number;
    failed: number;
    notImpacted: number;
    others: number;
}

export interface IAggregatedRunsCount {
    totalRuns: number;
    inProgressRuns: number;
    completedRuns: number;
    abortedRuns: number;
}

export interface ITotalTestsChartProps {
    aggregatedtotalTests: number;
    totalPassed: number;
    totalPassedOnRerun: number;
    totalFailures: number;
    totalNotImpactedTests: number;
    otherTests: number;
}

export interface IAbortedTestsChartProps {
    totalTests: number;
    totalPassedOnRerun: number;
    totalPassed: number;
    totalFailures: number;
    totalAborted: number;
    totalNotImpactedTests: number;
    otherTests: number;
}

export interface ITestFailuresChartProps {
    totalFailures: number;
    newFailures: number;
    existingFailures: number;
    increaseInFailures: number;
}

export interface ISummaryViewState {
    errorMessage: string;
    isInProgressView: boolean;
    shouldShowSummary: boolean;
    aggregatedTestsCount: IAggregatedTestsCount;
    aggregatedRunsCount: IAggregatedRunsCount;
    aggregatedRunsOutcomeCount: IAggregatedRunsOutcomeCount;
    totalTestsNumberChartProps: ISummaryNumberChartProps;
    totalAbortedTestsNumberChartProps: ISummaryNumberChartProps;
    totalTestsChartProps: ITotalTestsChartProps;
    testFailuresChartProps: ITestFailuresChartProps;
    abortedTestsChartProps: IAbortedTestsChartProps;
    passPercentageNumberChartProps: ISummaryNumberChartProps;
    runDurationNumberChartProps: ISummaryNumberChartProps;
    notReportedNumberChartProps: ISummaryNumberChartProps;
}

export class SummaryViewStore extends Store {
    constructor(private _actionsHub: TestResultsReportActionsHub) {
        super();
        this._initialize();
        this._actionsHub.initializeTestResultSummary.addListener(this._initializeTestResultSummary.bind(this));
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
    }

    public getState(): ISummaryViewState {
        return this._state;
    }

    private _getDefaultState(): ISummaryViewState {
        return {
            shouldShowSummary: false,
            totalTestsNumberChartProps: null,
            totalAbortedTestsNumberChartProps: null,
            totalTestsChartProps: null,
            testFailuresChartProps: null,
            abortedTestsChartProps: null,
            passPercentageNumberChartProps: null,
            runDurationNumberChartProps: null,
            notReportedNumberChartProps: null,
        } as ISummaryViewState;
    }

    private _initializeTestResultSummary(summaryInitializationData: SummaryInitializationData) {
        this._state.isInProgressView = summaryInitializationData.viewContextStatus === ViewContextStatus.InProgress;
        let contextDetails = summaryInitializationData.summaryData && summaryInitializationData.summaryData.testResultsContext ? summaryInitializationData.summaryData.testResultsContext.contextType : 0;

        if (this._state.isInProgressView) {
            this._initializeTestResultSummaryForInProgressView(summaryInitializationData.summaryData);

            if (!summaryInitializationData.invokedviaSignalR) {
                TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_TestTabClicked, {
                    [TestTabTelemetryService.inProgress]: true,
                    [TestTabTelemetryService.totalTestsExists]: (this._state.aggregatedTestsCount.totalTests > 0 ? "Yes" : "No"),
                    [TestTabTelemetryService.failedTestsExists]: (this._state.aggregatedTestsCount.failedTests > 0 ? "Yes" : "No"),
                    [TestTabTelemetryService.totalTests]: this._state.aggregatedTestsCount.totalTests,
                    [TestTabTelemetryService.failedTests]: this._state.aggregatedTestsCount.failedTests,
                    [TestTabTelemetryService.passedTests]: this._state.aggregatedTestsCount.passedTests
                });
            }
        } else {
            this._initializeTestResultSummaryForCompletedView(summaryInitializationData.summaryData);

            if (!summaryInitializationData.invokedviaSignalR) {
                TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_TestTabClicked, {
                    [TestTabTelemetryService.totalTestsExists]: false,
                    [TestTabTelemetryService.totalTestsExists]: (this._state.totalTestsChartProps.aggregatedtotalTests > 0 ? "Yes" : "No"),
                    [TestTabTelemetryService.failedTestsExists]: (this._state.totalTestsChartProps.totalFailures > 0 ? "Yes" : "No"),
                    [TestTabTelemetryService.totalTests]: this._state.totalTestsChartProps.aggregatedtotalTests,
                    [TestTabTelemetryService.failedTests]: this._state.totalTestsChartProps.totalFailures,
                    [TestTabTelemetryService.passedTests]: this._state.totalTestsChartProps.totalPassed
                });
            }
        }

        this.emitChanged();
    }

    private _initializeTestResultSummaryForInProgressView(testReport: TCMContracts.TestResultSummary) {
        let totalTests: number = 0;
        let passedTests: number = 0;
        let failedTests: number = 0;
        let notImpactedTests: number = 0;
        let notExecutedTests: number = 0;
        let abortedTests: number = 0;
        let otherTests: number = 0;

        let totalRuns: number = 0;
        let inProgressRuns: number = 0;
        let completedRuns: number = 0;
        let needsInvestigationRuns: number = 0;
        let abortedRuns: number = 0;

        if (!!testReport && !!testReport.aggregatedResultsAnalysis && !!testReport.aggregatedResultsAnalysis.runSummaryByState) {

            // Always showing summary in in-progress view
            this._state.shouldShowSummary = true;

            const runSummaryByState = testReport.aggregatedResultsAnalysis.runSummaryByState;
            // Calculate runsCount
            inProgressRuns = runSummaryByState[TCMContracts.TestRunState.InProgress] ? runSummaryByState[TCMContracts.TestRunState.InProgress].runsCount : 0;
            completedRuns = runSummaryByState[TCMContracts.TestRunState.Completed] ? runSummaryByState[TCMContracts.TestRunState.Completed].runsCount : 0;
            needsInvestigationRuns = runSummaryByState[TCMContracts.TestRunState.NeedsInvestigation] ? runSummaryByState[TCMContracts.TestRunState.NeedsInvestigation].runsCount : 0;
            abortedRuns = runSummaryByState[TCMContracts.TestRunState.Aborted] ? runSummaryByState[TCMContracts.TestRunState.Aborted].runsCount : 0;

            for (let state of Object.keys(runSummaryByState)) {
                totalRuns += runSummaryByState[state].runsCount;

                // Calculate outcome counts
                const resultsByOutcome = runSummaryByState[state].resultsByOutcome;
                if (resultsByOutcome) {
                    totalTests += this._getAggregatedCount(resultsByOutcome);
                    passedTests += resultsByOutcome[TCMContracts.TestOutcome.Passed] ? resultsByOutcome[TCMContracts.TestOutcome.Passed].count : 0;
                    failedTests += resultsByOutcome[TCMContracts.TestOutcome.Failed] ? resultsByOutcome[TCMContracts.TestOutcome.Failed].count : 0;
                    notImpactedTests += resultsByOutcome[TCMContracts.TestOutcome.NotImpacted] ? resultsByOutcome[TCMContracts.TestOutcome.NotImpacted].count : 0;
                    notExecutedTests += resultsByOutcome[TCMContracts.TestOutcome.NotExecuted] ? resultsByOutcome[TCMContracts.TestOutcome.NotExecuted].count : 0;
                    abortedTests += resultsByOutcome[TCMContracts.TestOutcome.Aborted] ? resultsByOutcome[TCMContracts.TestOutcome.Aborted].count : 0;
                }
            }

            otherTests = totalTests - passedTests - failedTests - notImpactedTests - notExecutedTests - abortedTests;
        }

        this._state.aggregatedRunsCount = {
            totalRuns: totalRuns,
            inProgressRuns: inProgressRuns,
            completedRuns: completedRuns + needsInvestigationRuns,
            abortedRuns: abortedRuns
        };

        this._state.aggregatedTestsCount = {
            totalTests: totalTests,
            passedTests: passedTests,
            failedTests: failedTests,
            notImpactedTests: notImpactedTests,
            notExecutedTests: notExecutedTests,
            abortedTests: abortedTests,
            otherTests: otherTests
        };
    }

    private _initializeTestResultSummaryForCompletedView(testReport: TCMContracts.TestResultSummary) {
        let abortedRuns: number = 0;
        let aggregatedTotalTests: number = 0;
        let completedRuns: number = 0;
        let existingFailures: number = 0;
        let increaseInPassPercentage: number = 0;
        let increaseInRunDuration: string = Utils_String.empty;
        let increaseInTotalFailures: number = 0;
        let increaseInTotalTests: number = 0;
        let newFailures: number = 0;
        let notReportedTests: number = 0;
        let otherTests: number = 0;
        let passedOnRerun: number = 0;
        let passPercentage: number = 0;
        let runDuration: string = Utils_String.empty;
        let totalFailures: number = 0;
        let totalNotImpactedTests: number = 0;
        let totalPassed: number = 0;
        let totalTests: number = 0;
        let passedRunsCount: number = 0;
        let failedRunsCount: number = 0;
        let notImpactedRunsCount: number = 0;
        let othersRunsCount: number = 0;

        if (!!testReport && !!testReport.aggregatedResultsAnalysis) {

            const resultsByOutcome = testReport.aggregatedResultsAnalysis.resultsByOutcome;

            if (Object.keys(resultsByOutcome).length > 0) {
                this._state.shouldShowSummary = true;
            }

            // Total test count
            aggregatedTotalTests = this._getAggregatedCount(resultsByOutcome);
            totalTests = testReport.aggregatedResultsAnalysis.totalTests;

            // Not reported tests count
            notReportedTests = this._getAggregatedCount(testReport.aggregatedResultsAnalysis.notReportedResultsByOutcome);

            // Aborted runs count
            if (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled() &&
                !!testReport.aggregatedResultsAnalysis.runSummaryByState &&
                !!testReport.aggregatedResultsAnalysis.runSummaryByState[TCMContracts.TestRunState.Aborted]) {
                this._state.shouldShowSummary = true;
                abortedRuns = testReport.aggregatedResultsAnalysis
                    .runSummaryByState[TCMContracts.TestRunState.Aborted].runsCount;
            }

            // Failed tests count
            if (resultsByOutcome && resultsByOutcome[TCMContracts.TestOutcome.Failed]) {
                totalFailures = resultsByOutcome[TCMContracts.TestOutcome.Failed].count;
            }
            // This is defined for newer builds and undefined for older builds (older builds are those which are created before
            // we started calculating run summary and insights for runs of build.This can be 'XAML' or 'VNext' build)
            if (!!testReport.testFailures) {
                const testFailures = CommonUtils.TestReportDataParser.parseFailureData(testReport.testFailures);
                newFailures = testFailures.newFailures;
                existingFailures = testFailures.existingFailures;
            } else {
                existingFailures = totalFailures;
            }

            // Passed tests count
            if (resultsByOutcome && resultsByOutcome[TCMContracts.TestOutcome.Passed]) {
                totalPassed = resultsByOutcome[TCMContracts.TestOutcome.Passed].count;
                if (resultsByOutcome[TCMContracts.TestOutcome.Passed].rerunResultCount) {
                    passedOnRerun = resultsByOutcome[TCMContracts.TestOutcome.Passed].rerunResultCount;
                }
            }

            // Pass percentage
            if (totalTests) {
                passPercentage = (totalPassed / totalTests) * 100;
            }

            // Not impacted tests
            if (!!testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.NotImpacted]) {
                totalNotImpactedTests = testReport.aggregatedResultsAnalysis
                    .resultsByOutcome[TCMContracts.TestOutcome.NotImpacted].count;
            }

            // Other tests
            otherTests = aggregatedTotalTests - (totalPassed + totalFailures);
            if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy()) {
                otherTests = otherTests - totalNotImpactedTests;
            }

            // Run duration and increase in run duration
            runDuration = testReport.aggregatedResultsAnalysis.duration;

            // Calculate Difference
            if (testReport.aggregatedResultsAnalysis.resultsDifference) {
                const resultsDifference = testReport.aggregatedResultsAnalysis.resultsDifference;

                // Increase in total tests
                increaseInTotalTests = resultsDifference.increaseInOtherTests +
                    resultsDifference.increaseInFailures + resultsDifference.increaseInPassedTests;

                // Increase in run duration
                increaseInRunDuration = resultsDifference.increaseInDuration;

                // Increase in failures
                increaseInTotalFailures = resultsDifference.increaseInFailures;

                // Populate pass percentage difference
                if (!!testReport.testFailures) {
                    increaseInPassPercentage = this._getIncreaseInPassPercentageDifference(
                        totalPassed,
                        passPercentage,
                        testReport.aggregatedResultsAnalysis
                    );
                }
            }

            // Calculate completed runs count
            if (!!testReport.aggregatedResultsAnalysis.runSummaryByState) {
                const runSummaryByState = testReport.aggregatedResultsAnalysis.runSummaryByState;
                completedRuns = runSummaryByState[TCMContracts.TestRunState.Completed] ? runSummaryByState[TCMContracts.TestRunState.Completed].runsCount : 0;
            }

            // Calculate runs outcome for completed runs
            if (!!testReport.aggregatedResultsAnalysis.runSummaryByOutcome) {
                const runSummaryByOutcome = testReport.aggregatedResultsAnalysis.runSummaryByOutcome;
                passedRunsCount = runSummaryByOutcome[TCMContracts.TestRunOutcome.Passed] ? runSummaryByOutcome[TCMContracts.TestRunOutcome.Passed].runsCount : 0;
                failedRunsCount = runSummaryByOutcome[TCMContracts.TestRunOutcome.Failed] ? runSummaryByOutcome[TCMContracts.TestRunOutcome.Failed].runsCount : 0;
                notImpactedRunsCount = runSummaryByOutcome[TCMContracts.TestRunOutcome.NotImpacted] ? runSummaryByOutcome[TCMContracts.TestRunOutcome.NotImpacted].runsCount : 0;
                othersRunsCount = runSummaryByOutcome[TCMContracts.TestRunOutcome.Others] ? runSummaryByOutcome[TCMContracts.TestRunOutcome.Others].runsCount : 0;
            }
        }

        // Populate state object

        const showDifference: boolean = !!testReport.aggregatedResultsAnalysis.resultsDifference;

        // Total tests number chart props
        this._state.totalTestsNumberChartProps = this._getTotalTestsNumberChartProps(aggregatedTotalTests, increaseInTotalTests, showDifference);

        // Pass percentage number chart props
        this._state.passPercentageNumberChartProps = this._getPassPercentageNumberChartProps(passPercentage, increaseInPassPercentage, showDifference);

        // Run duration number chart props
        const parsedRunDuration: string = CommonUtils.TestReportDataParser.parseDuration(runDuration);
        this._state.runDurationNumberChartProps = {
            title: Resources.RunDurationHeading,
            value: parsedRunDuration,
            difference: showDifference ? this._getDurationDifference(increaseInRunDuration) : null,
            infoMessage: Resources.RunDurationInfoMessage
        };

        // Not reported tests number chart props
        this._state.notReportedNumberChartProps = {
            title: Resources.TestsNotReportedHeading,
            value: notReportedTests.toLocaleString(),
            difference: this._getNullDifference()
        };

        // Test Run Outcome
        this._state.aggregatedRunsOutcomeCount = {
            passed: passedRunsCount,
            failed: failedRunsCount,
            notImpacted: notImpactedRunsCount,
            others: othersRunsCount
        };

        // Total tests pie chart data
        this._state.totalTestsChartProps = {
            aggregatedtotalTests: aggregatedTotalTests,
            totalPassed: totalPassed,
            totalPassedOnRerun: passedOnRerun,
            totalFailures: totalFailures,
            totalNotImpactedTests: totalNotImpactedTests,
            otherTests: otherTests
        };

        // Test failures pie chart data
        const shouldShowFailuresChart: boolean = !!testReport.testFailures;
        this._state.testFailuresChartProps =
            shouldShowFailuresChart
                ? {
                    totalFailures: totalFailures,
                    newFailures: newFailures,
                    existingFailures: existingFailures,
                    increaseInFailures: increaseInTotalFailures
                }
                : null;

        // Populate Runs information
        this._state.aggregatedRunsCount = {
            totalRuns: 0,
            inProgressRuns: 0,
            completedRuns: completedRuns,
            abortedRuns: abortedRuns
        };

        // Populate Aborted Runs information
        if (abortedRuns > 0) {
            this._populateAbortedRunsInformation(testReport);
        }
    }

    private _populateAbortedRunsInformation(testReport: TCMContracts.TestResultSummary) {
        let totalTestsInAbortedRuns: number = 0;
        let passedTests: number = 0;
        let failedTests: number = 0;
        let notImpactedTests: number = 0;
        let abortedTests: number = 0;
        let otherTests: number = 0;
        let passedOnRerun: number = 0;

        //// Calculate outcome counts
        const resultsByOutcome = testReport.aggregatedResultsAnalysis
            .runSummaryByState[TCMContracts.TestRunState.Aborted].resultsByOutcome;

        if (resultsByOutcome) {
            totalTestsInAbortedRuns = this._getAggregatedCount(resultsByOutcome);

            if (resultsByOutcome[TCMContracts.TestOutcome.Passed]) {
                passedTests = resultsByOutcome[TCMContracts.TestOutcome.Passed].count;
                if (resultsByOutcome[TCMContracts.TestOutcome.Passed].rerunResultCount) {
                    passedOnRerun = resultsByOutcome[TCMContracts.TestOutcome.Passed].rerunResultCount;
                }
            }

            failedTests = resultsByOutcome[TCMContracts.TestOutcome.Failed]
                ? resultsByOutcome[TCMContracts.TestOutcome.Failed].count
                : 0;
            abortedTests = resultsByOutcome[TCMContracts.TestOutcome.Aborted]
                ? resultsByOutcome[TCMContracts.TestOutcome.Aborted].count
                : 0;
            notImpactedTests = resultsByOutcome[TCMContracts.TestOutcome.NotImpacted]
                ? resultsByOutcome[TCMContracts.TestOutcome.NotImpacted].count
                : 0;

            otherTests = totalTestsInAbortedRuns -
                passedTests -
                failedTests -
                notImpactedTests -
                abortedTests;
        }

        // Total Aborted tests chart props
        this._state.totalAbortedTestsNumberChartProps =
            this._getTotalAbortedTestsNumberChartProps(totalTestsInAbortedRuns);

        this._state.abortedTestsChartProps = {
            totalTests: totalTestsInAbortedRuns,
            totalPassedOnRerun: passedOnRerun,
            totalPassed: passedTests,
            totalFailures: failedTests,
            totalAborted: abortedTests,
            totalNotImpactedTests: notImpactedTests,
            otherTests: otherTests
        };
    }

    private _getTotalTestsNumberChartProps(aggregatedTotalTests: number, increaseInTotalTests: number, shouldShowDifference: boolean): ISummaryNumberChartProps {
        return {
            title: Resources.TotalTestsText,
            value: aggregatedTotalTests.toLocaleString(),
            difference: shouldShowDifference ? this._getTotalTestsDifference(increaseInTotalTests) : null,
            dataType: DataType.String
        };
    }

    private _getTotalAbortedTestsNumberChartProps(aggregatedTotalTests: number): ISummaryNumberChartProps {
        return {
            title: Resources.TotalTestsText,
            value: aggregatedTotalTests.toLocaleString(),
            difference: null,
            dataType: DataType.String
        };
    }

    private _getTotalTestsDifference(increaseInTotalTests: number): IDifference {
        let value: string;
        let valueType: ValueType;

        if (increaseInTotalTests < 0) {
            value = Utils_String.localeFormat("{0}", increaseInTotalTests.toLocaleString());
            valueType = ValueType.Decreased;
        } else if (increaseInTotalTests > 0) {
            value = Utils_String.localeFormat("+{0}", increaseInTotalTests.toLocaleString());
            valueType = ValueType.Increased;
        } else {
            value = Utils_String.localeFormat("+{0}", increaseInTotalTests.toLocaleString());
            valueType = ValueType.Unchanged;
        }

        const difference: IDifference = {
            diffType: DifferenceType.Unchanged,
            shouldShowIcon: false,
            value: value,
            valueType: valueType
        };

        return difference;
    }

    private _getPassPercentageNumberChartProps(passPercentage: number, increaseInPassPercentage: number, shouldShowDifference: boolean): ISummaryNumberChartProps {
        const passPercentageValue: string = (passPercentage === Math.round(passPercentage))
            ? passPercentage.toString()
            : CommonUtils.TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(passPercentage, 2);

        const passPercentageDifference: IDifference = this._getPassPercentageDifference(increaseInPassPercentage);

        const passPercentageNumberChartProps: ISummaryNumberChartProps = {
            title: Resources.PassPercentHeading,
            value: passPercentageValue,
            difference: shouldShowDifference ? this._getPassPercentageDifference(increaseInPassPercentage) : null,
            dataType: DataType.Percentage
        };

        return passPercentageNumberChartProps;
    }

    private _getPassPercentageDifference(increaseInPassPercentage: number): IDifference {
        let valueType: ValueType;
        let diffType: DifferenceType;

        const absoluteIncreaseInPassPercentage: number = Math.abs(increaseInPassPercentage);
        const diffValue: string = (absoluteIncreaseInPassPercentage === Math.round(absoluteIncreaseInPassPercentage))
            ? absoluteIncreaseInPassPercentage.toString()
            : CommonUtils.TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(absoluteIncreaseInPassPercentage, 1);
        const value: string = Utils_String.localeFormat("{0}{1}", diffValue, "%");

        if (increaseInPassPercentage < 0) {
            valueType = ValueType.Decreased;
            diffType = DifferenceType.Worsened;
        } else if (increaseInPassPercentage > 0) {
            valueType = ValueType.Increased;
            diffType = DifferenceType.Improved;
        } else {
            valueType = ValueType.Unchanged;
            diffType = DifferenceType.Unchanged;
        }

        const difference: IDifference = {
            diffType: diffType,
            shouldShowIcon: true,
            value: value,
            valueType: valueType
        };

        return difference;
    }

    private _getDurationDifference(durationDifference: string): IDifference {

        let difference: IDifference;
        if (CommonUtils.TestReportDataParser.isZeroDuration(durationDifference)) {
            difference = {
                value: Utils_String.localeFormat("{0}", 0),
                diffType: DifferenceType.Unchanged,
                valueType: ValueType.Unchanged,
                shouldShowIcon: true
            };
        } else if (Utils_String.startsWith(durationDifference, "-")) {
            difference = {
                value: Utils_String.localeFormat("{0}", CommonUtils.TestReportDataParser.parseDuration(durationDifference)),
                diffType: DifferenceType.Improved,
                valueType: ValueType.Decreased,
                shouldShowIcon: true
            };
        } else {
            difference = {
                value: Utils_String.localeFormat("+{0}", CommonUtils.TestReportDataParser.parseDuration(durationDifference)),
                diffType: DifferenceType.Worsened,
                valueType: ValueType.Increased,
                shouldShowIcon: true
            };
        }

        return difference;
    }

    private _getIncreaseInPassPercentageDifference(totalPassed: number,
        currentPassPercent: number,
        aggregatedResults: TCMContracts.AggregatedResultsAnalysis): number {

        const prevTotalTests = aggregatedResults.totalTests - aggregatedResults.resultsDifference.increaseInTotalTests;
        const prevPassedTests = totalPassed - aggregatedResults.resultsDifference.increaseInPassedTests;

        let prevPassPercentage: number = 0;
        if (prevTotalTests !== 0) {
            prevPassPercentage = (prevPassedTests / prevTotalTests) * 100;
        }

        return (currentPassPercent - prevPassPercentage);
    }

    private _getNullDifference(): IDifference {
        const nullDifference: IDifference = {
            value: Utils_String.empty,
            diffType: DifferenceType.Unchanged,
            valueType: ValueType.Unchanged,
            shouldShowIcon: false
        };

        return nullDifference;
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

    private _state: ISummaryViewState;
}
