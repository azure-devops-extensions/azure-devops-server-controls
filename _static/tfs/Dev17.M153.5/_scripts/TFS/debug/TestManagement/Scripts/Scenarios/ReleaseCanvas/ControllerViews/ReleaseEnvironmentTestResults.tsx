/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/ReleaseCanvas/ControllerViews/ReleaseEnvironmentTestResults";

import { Link, LinkBase } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    ReleaseEnvironmentTestResultsActionsCreator,
} from "TestManagement/Scripts/Scenarios/ReleaseCanvas/Actions/ReleaseEnvironmentTestResultsActionsCreator";
import {
    IReleaseEnvironmentTestResultsState,
    ReleaseEnvironmentTestResultsStore,
} from "TestManagement/Scripts/Scenarios/ReleaseCanvas/Stores/ReleaseEnvironmentTestResultsStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as RealTimeTestHub from "TestManagement/Scripts/TFS.TestManagement.RealTimeTestHub";
import * as TestHubConnectionManager from "TestManagement/Scripts/TFS.TestManagement.TestHub.ConnectionManager";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as Diag from "VSS/Diag";
import { getService } from "VSS/Events/Services";
import * as ComponentBase from "VSS/Flux/Component";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

export interface IReleaseEnvironmentDetails {
    releaseId: number;
    releaseEnvironmentId: number;
    environmentStatus: number;
}

export interface IReleaseEnvironmentTestResultsProps extends ComponentBase.Props {
    releaseEnvironmentDetails: IReleaseEnvironmentDetails;
    hostEventUpdateId: string;
    setVisibility: (state: boolean) => void;
}

export class ReleaseEnvironmentTestResults extends ComponentBase.Component<IReleaseEnvironmentTestResultsProps,
    IReleaseEnvironmentTestResultsState> {
    public constructor(props: IReleaseEnvironmentTestResultsProps) {
        super(props);
        this._store = ReleaseEnvironmentTestResultsStore.getInstance(props.releaseEnvironmentDetails.releaseEnvironmentId.toString());
        this._actionsCreator = ReleaseEnvironmentTestResultsActionsCreator.getInstance(props.releaseEnvironmentDetails.releaseEnvironmentId.toString());
        this._previousEnvironmentStatus = this.props.releaseEnvironmentDetails.environmentStatus;

        this._isVisibilitySet = false;
    }

    public componentWillMount(): void {
        this._handleStoreChange();
        this._store.addChangedListener(this._handleStoreChange);
        this._actionsCreator.updateEnvironmentStatus(this.props.releaseEnvironmentDetails.environmentStatus === RMContracts.EnvironmentStatus.InProgress);

        getService().attachEvent(RealTimeTestHub.RealTimeTestEvents.RELEASE_TESTRUN_STATS_CHANGED, this._onReleaseTestRunStatsChanged);
        getService().attachEvent(this.props.hostEventUpdateId, this._environmentStatusHandler);
        this._handleReleaseSignalREvents(this.props.releaseEnvironmentDetails.environmentStatus === RMContracts.EnvironmentStatus.InProgress);
    }

    public componentDidMount(): void {
        this._updateSummaryLoading(this.props.releaseEnvironmentDetails.releaseId,
            this.props.releaseEnvironmentDetails.releaseEnvironmentId);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);

        getService().detachEvent(RealTimeTestHub.RealTimeTestEvents.RELEASE_TESTRUN_STATS_CHANGED, this._onReleaseTestRunStatsChanged);
        getService().detachEvent(this.props.hostEventUpdateId, this._environmentStatusHandler);

        // As Unmount is called multiple times during the inprogress, don't want to unsubscribe during inprogress.
        if (this.props.releaseEnvironmentDetails.environmentStatus !== RMContracts.EnvironmentStatus.InProgress && this._testHubConnectionManager) {
            this._testHubConnectionManager.unsubscribeToRelease(this.props.releaseEnvironmentDetails.releaseId,
                this.props.releaseEnvironmentDetails.releaseEnvironmentId).then(() => {
                    Diag.logVerbose(`Unsubscribed from release ${this.props.releaseEnvironmentDetails.releaseId} and  environment id ${this.props.releaseEnvironmentDetails.releaseEnvironmentId}`);
                });
        }
    }

    public render(): JSX.Element {
        if (this.state.testResultsSummary.totalTests > 0 || this.state.testResultsSummary.abortedRuns > 0) {

            let ariaLabelAndTootTipText = this._getAriaLebelAndToolTipText();
            return (
                <TooltipHost hostClassName="cd-test-results-container" content={ariaLabelAndTootTipText.toolTiptext}>
                    <Link
                        className="cd-test-results"
                        onClick={this._handleClickOnTestResultsCanvas}
                        aria-label={Resources.TestResults}
                        onKeyDown={this._handleKeyPressDownOnTestResultsCanvas}>
                        {
                            this.state.testResultsSummary.totalTests > 0 &&
                            this._getTestResultBlock("total-tests",
                                ariaLabelAndTootTipText.bowtieIconForTotalTest,
                                ariaLabelAndTootTipText.totalTestText,
                                ariaLabelAndTootTipText.totalTestAriaLabelText)
                        }
                        {
                            this.state.testResultsSummary.failedTests > 0 &&
                            this._getTestResultBlock("failed-tests",
                                "bowtie-math-multiply-light",
                                Utils_Number.formatAbbreviatedNumber(this.state.testResultsSummary.failedTests),
                                ariaLabelAndTootTipText.failedTestAriaLabelText)
                        }
                        {
                            this.state.testResultsSummary.abortedRuns > 0 &&
                            this._getTestResultBlock("aborted-test-runs",
                                "bowtie-status-stop-outline",
                                Utils_Number.formatAbbreviatedNumber(this.state.testResultsSummary.abortedRuns),
                                ariaLabelAndTootTipText.abortedTestAriaLabelText)
                        }
                    </Link>
                </TooltipHost>);
        }

        return null;
    }

    @autobind
    private _handleStoreChange(): void {
        this.setState(this._store.getState());
    }

    @autobind
    private _handleClickOnTestResultsCanvas(e: React.SyntheticEvent<HTMLElement | LinkBase>) {
        this._navigateExtension(e);
    }

    @autobind
    private _handleKeyPressDownOnTestResultsCanvas(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._navigateExtension(e);
        }
    }

    @autobind
    private _environmentStatusHandler(sender: number, environmentStatus: number): void {
        if (environmentStatus !== this._previousEnvironmentStatus) {
            this._previousEnvironmentStatus = environmentStatus;
            const isEnvironmentInProgress = environmentStatus === RMContracts.EnvironmentStatus.InProgress;
            this._handleReleaseSignalREvents(isEnvironmentInProgress);

            this._actionsCreator.updateEnvironmentStatus(isEnvironmentInProgress);
            this._updateSummaryLoading(this.props.releaseEnvironmentDetails.releaseId,
                this.props.releaseEnvironmentDetails.releaseEnvironmentId);
        }
    }

    @autobind
    private _onReleaseTestRunStatsChanged(sender: any, releaseEventArgs: RealTimeTestHub.ReleaseEventArgs): void {
        if (releaseEventArgs.releaseId === this.props.releaseEnvironmentDetails.releaseId &&
            releaseEventArgs.environmentId === this.props.releaseEnvironmentDetails.releaseEnvironmentId) {
            this._updateSummaryLoading(this.props.releaseEnvironmentDetails.releaseId,
                this.props.releaseEnvironmentDetails.releaseEnvironmentId);
        }
    }

    @autobind
    private _handleReleaseSignalREvents(isEnvironmentInProgress: boolean) {
        try {
            if (!TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isTriSignalRIntegrationEnabled()) {
                return;
            }

            if (isEnvironmentInProgress) {
                this._signalRPromise = RealTimeTestHub.TestHubProxy.load();
                this._signalRPromise.then(() => {
                    this._testHubConnectionManager = TestHubConnectionManager.TestHubConnectionManager.getInstance();
                    this._testHubConnectionManager.subscribeToRelease(this.props.releaseEnvironmentDetails.releaseId, this.props.releaseEnvironmentDetails.releaseEnvironmentId);
                }, (reason: any) => {
                    console.error(`Unable to load the signalR scripts for testHub: ${reason}`);
                });
            }
            else {
                if (this._signalRPromise && this._testHubConnectionManager) {
                    this._signalRPromise.then(() => {
                        this._testHubConnectionManager.unsubscribeToRelease(this.props.releaseEnvironmentDetails.releaseId, this.props.releaseEnvironmentDetails.releaseEnvironmentId).then(() => {
                            Diag.logVerbose(`Unsubscribed from release ${this.props.releaseEnvironmentDetails.releaseId} and  environment id ${this.props.releaseEnvironmentDetails.releaseEnvironmentId}`);
                        });
                    }, (reason: any) => {
                        console.error(`Unable to load the signalR scripts for testHub: ${reason}`);
                    });
                }
            }
        } catch (error) {
            // Not throwing exceptions while handling signals.
            Diag.logError(`Error occurred while subscribing to signals : ${error}`);
            TestTabTelemetryService.getInstance().publishEvent(TestTabTelemetryService.featureTestTabSignalR, TestTabTelemetryService.errorOccurredDuringSignalRConnection, error);
        }
    }

    private _getAriaLebelAndToolTipText(): any {
        let toolTiptext = Utils_String.empty;
        let totalTestText: string = Utils_String.empty;
        let totalTestAriaLabelText: string = Utils_String.empty;
        let bowtieIconForTotalTest: string = Utils_String.empty;
        let failedTestAriaLabelText: string = Utils_String.empty;
        let abortedTestAriaLabelText: string = Utils_String.empty;

        if (this.state.testResultsSummary.totalTests > 0) {
            if (this.state.isEnvironmentInProgress) {
                totalTestText = this._getTotalTestsText(this.state.testResultsSummary.totalTests, this.state.testResultsSummary.failedTests, this.state.testResultsSummary.abortedRuns);
                totalTestAriaLabelText = Utils_String.localeFormat(Resources.TestsInProgressTextCount, this.state.testResultsSummary.totalTests);
                bowtieIconForTotalTest = "in-progress-icon bowtie-test";
            }
            else {
                let passPercentage = this._getPassPercentage(this.state.testResultsSummary.passedTests, this.state.testResultsSummary.totalTests);
                totalTestText = Utils_String.localeFormat(Resources.PassPercentageLongFormat, passPercentage);
                totalTestAriaLabelText = Utils_String.localeFormat(Resources.PassPercentageText, totalTestText);
                bowtieIconForTotalTest = "bowtie-test-fill";
            }

            toolTiptext = totalTestAriaLabelText;
        }

        if (this.state.testResultsSummary.failedTests > 0) {
            failedTestAriaLabelText = Utils_String.localeFormat(Resources.FailedTestCount, this.state.testResultsSummary.failedTests);

            if (toolTiptext === Utils_String.empty) {
                toolTiptext = failedTestAriaLabelText;
            }
            else {
                toolTiptext = Utils_String.localeFormat(Resources.CommaSeparatedStrings, toolTiptext, failedTestAriaLabelText);
            }
        }

        if (this.state.testResultsSummary.abortedRuns > 0) {
            abortedTestAriaLabelText = Utils_String.localeFormat(Resources.AbortedRunsCount, this.state.testResultsSummary.abortedRuns);

            if (toolTiptext === Utils_String.empty) {
                toolTiptext = abortedTestAriaLabelText;
            }
            else {
                toolTiptext = Utils_String.localeFormat(Resources.CommaSeparatedStrings, toolTiptext, abortedTestAriaLabelText);
            }
        }

        return {
            toolTiptext,
            totalTestText,
            totalTestAriaLabelText,
            bowtieIconForTotalTest,
            failedTestAriaLabelText,
            abortedTestAriaLabelText
        };
    }

    private _navigateExtension(e: any): void {
        const releaseEnvironmentId = this.props.releaseEnvironmentDetails.releaseEnvironmentId;
        const releaseEnvironmentEditorTabExtensionId = "ms.vss-test-web.test-result-in-release-environment-editor-tab";

        this._logTelemetryOnNavigatingToTestTab();
        NavigationService.getHistoryService().addHistoryPoint("release-environment-extension", { environmentId: releaseEnvironmentId, extensionId: releaseEnvironmentEditorTabExtensionId }, null, false, true);

        e.stopPropagation();
        e.preventDefault();
    }

	private _logTelemetryOnNavigatingToTestTab() {
		TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureCanvasInRelease, {
			[TestTabTelemetryService.inProgress]: this.state.isEnvironmentInProgress,
			[TestTabTelemetryService.failedTestsExists]: this.state.testResultsSummary.failedTests > 0 || this.state.testResultsSummary.abortedRuns
        });
    }

    private _getTotalTestResultBlock(): JSX.Element {
        if (this.state.isEnvironmentInProgress) {
            let totalText = this._getTotalTestsText(this.state.testResultsSummary.totalTests,
                this.state.testResultsSummary.failedTests,
                this.state.testResultsSummary.abortedRuns);
            return this._getTestResultBlock("total-tests", "in-progress-icon bowtie-test", totalText, Utils_String.localeFormat(Resources.TestsInProgressTextCount, this.state.testResultsSummary.totalTests));
        }
        else {
            let passPercentageText = this._getPassPercentage(this.state.testResultsSummary.passedTests, this.state.testResultsSummary.totalTests);
            return this._getTestResultBlock("total-tests",
                "bowtie-test-fill",
                Utils_String.localeFormat(Resources.PassPercentageLongFormat, passPercentageText),
                Utils_String.localeFormat(Resources.PassPercentageText, passPercentageText));
        }
    }

    private _getTestResultBlock(containerClass: string, iconClass: string, text: string, ariaLabel: string): JSX.Element {
        let containerClasses = css("cd-test-results-point", containerClass);
        let iconClasses = css("tr-icon", "bowtie-icon", iconClass);
        return (
            <span className={containerClasses} aria-label={ariaLabel}>
                <span className={iconClasses} />
                <span className="tr-text"> {text} </span>
            </span>);
    }

    private _getPassPercentage(passedTests: number, totalTests: number): number {
        return Math.floor(passedTests * 100 / totalTests);
    }

    private _getTotalTestsText(totalTests: number, failedTests: number, abortedRuns: number): string {
        if (failedTests === 0 || abortedRuns === 0) {
            return Utils_String.localeFormat(Resources.TotalTestsLongFormat, totalTests);
        } else {
            return Utils_Number.formatAbbreviatedNumber(totalTests);
        }
    }

    private _updateSummaryLoading(releaseId: number, releaseEnvId: number) {
        this._actionsCreator.loadTestSummaryForEnvironment(releaseId, releaseEnvId).then((shouldUpdateVisisbilty) => {
            if (shouldUpdateVisisbilty !== this._isVisibilitySet) {
                this._isVisibilitySet = shouldUpdateVisisbilty;
                this.props.setVisibility(shouldUpdateVisisbilty);
            }
        }, (error) => {
            Diag.logError(`Error occurred while loading summary for relase canvas: ${error}`);
        });
    }

    private _testHubConnectionManager: TestHubConnectionManager.TestHubConnectionManager;
    private _previousEnvironmentStatus: number;
    private _isVisibilitySet: boolean;
    private _store: ReleaseEnvironmentTestResultsStore;
    private _actionsCreator: ReleaseEnvironmentTestResultsActionsCreator;
    private _signalRPromise: IPromise<boolean>;
}