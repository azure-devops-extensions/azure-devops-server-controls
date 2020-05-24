/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/Extension.TestTabExtension";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as RMExtensionContracts from "ReleaseManagement/Core/ExtensionContracts";
import { ReleaseEnvironmentStatusHelper } from "ReleaseManagement/Core/Utils";
import {
    TestResultDetailsActionCreator,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionCreator";
import {
    TestResultDetailsActionHub,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import {
    TestResultDetailsViewStore,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/TestResultDetailsViewStore";
import {
    TestResultsGridActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsGridActionsHub";
import {
    TestResultsListViewActionCreator,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListViewActionCreator";
import {
    TestResultsReportActionsCreator,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsReportActionsCreator";
import {
    TestResultsReportActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsReportActionsHub";
import {
    ITestResultLeftViewProps,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/TestResultLeftView";
import * as TestResultsView from "TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/TestResultsView";
import { NavigationStateUtils } from "TestManagement/Scripts/Scenarios/TestTabExtension/NavigationStateUtils";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import { SummaryViewStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/SummaryViewStore";
import { TestResultsStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsGridTreeStore";
import { TestResultsViewStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsViewStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import * as RealTimeTestHub from "TestManagement/Scripts/TFS.TestManagement.RealTimeTestHub";
import * as TestHubConnectionManager from "TestManagement/Scripts/TFS.TestManagement.TestHub.ConnectionManager";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import { NavigationView } from "VSS/Controls/Navigation";
import * as Diag from "VSS/Diag";
import { EventService, getService as getEventService } from "VSS/Events/Services";
import * as SDK from "VSS/SDK/Shim";

export interface ITestResultsReleaseEnvironmentExtension extends RMExtensionContracts.IReleaseEnvironmentExtensionContext {
}

export class TestResultsReleaseEnvironmentExtension extends NavigationView {
    private _gridActionCreator: TestResultsListViewActionCreator;
    private _resultDetailsActionCreator: TestResultDetailsActionCreator;
    private _summaryActionCreator: TestResultsReportActionsCreator;

    private _prevReleaseEnvironmentObject: RMContracts.ReleaseEnvironment;
    private _testResultIdentifier: TCMContracts.TestCaseResultIdentifier;
    private _testResultDetailsPivot: string;
    private _testResultsStore: TestResultsStore;
    private _refreshGridForFirstSignal: boolean;

    public initialize(): void {
        super.initialize();
        this._eventManager = getEventService();
        this._refreshGridForFirstSignal = true;
        PerformanceUtils.startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
        this._createView(this._options.releaseEnvironment);
        this._prevReleaseEnvironmentObject = this._options.releaseEnvironment;
        this._handleReleaseSignalREvents(this._prevReleaseEnvironmentObject);
    }

    public initializeOptions(options: ITestResultsReleaseEnvironmentExtension) {
        super.initializeOptions($.extend({
            cssClass: "testresults-release-environment-extension",
            attachNavigate: true
        }, options));
    }

    public onNavigate(state: any) {
        if (state) {
            const resultId = NavigationStateUtils.getResultId();
            const runId = NavigationStateUtils.getRunId();
            const pane = NavigationStateUtils.getPaneView();
            if (resultId && runId) {
                this._testResultIdentifier = { testRunId: runId, testResultId: resultId };
            } else {
                this._testResultIdentifier = null;
            }
            if (pane) {
                this._testResultDetailsPivot = pane;
            }
        }
    }

    public dispose() {
        super.dispose();
        this._eventManager.detachEvent(RealTimeTestHub.RealTimeTestEvents.RELEASE_TESTRUN_STATS_CHANGED, this._onReleaseTestRunStatsChanged);
        if (this._testHubConnectionManager) {
            this._testHubConnectionManager.unsubscribeToRelease(this._prevReleaseEnvironmentObject.release.id, this._prevReleaseEnvironmentObject.id).then(() => {
                this._testHubConnectionManager.stop();
            });
        }
    }

    public updateReleaseEnvironment(releaseEnvironment: RMContracts.ReleaseEnvironment) {
        // TODO: RM bug will fix this
        if (!this._equals(this._prevReleaseEnvironmentObject, releaseEnvironment)) {
            this._prevReleaseEnvironmentObject = releaseEnvironment;
            this._handleReleaseSignalREvents(releaseEnvironment);
            const artifactData = this._getArtifactData(releaseEnvironment);
            if (this._summaryActionCreator) {
                this._summaryActionCreator.initialize(artifactData);
            }

            if (this._gridActionCreator) {
                this._gridActionCreator.initialize(artifactData);
            }
        }
    }

    private _equals(oldReleaseEnvironment: RMContracts.ReleaseEnvironment, newReleaseEnvironment: RMContracts.ReleaseEnvironment): boolean {
        if (!oldReleaseEnvironment || !newReleaseEnvironment) {
            return false;
        }
        if (oldReleaseEnvironment.id !== newReleaseEnvironment.id) {
            return false;
        }
        if (oldReleaseEnvironment.status !== newReleaseEnvironment.status) {
            return false;
        }

        return true;
    }

    private _createView(releaseEnvironment: RMContracts.ReleaseEnvironment): void {

        const artifactData = this._getArtifactData(releaseEnvironment);

        const testReportActionsHub = new TestResultsReportActionsHub();
        const resultsGridActionsHub = new TestResultsGridActionsHub();
        const resultDetailsActionHub = new TestResultDetailsActionHub();

        const summaryViewStore: SummaryViewStore = new SummaryViewStore(testReportActionsHub);
        this._testResultsStore = new TestResultsStore(resultsGridActionsHub, resultDetailsActionHub, artifactData.viewContext);
        const resultDetailsStore: TestResultDetailsViewStore = new TestResultDetailsViewStore(resultDetailsActionHub);
        const testResultsViewStore: TestResultsViewStore = new TestResultsViewStore(resultDetailsActionHub);

        this._gridActionCreator = new TestResultsListViewActionCreator(resultsGridActionsHub, this._testResultsStore);
        this._summaryActionCreator = new TestResultsReportActionsCreator(testReportActionsHub, resultDetailsActionHub);
        this._resultDetailsActionCreator = new TestResultDetailsActionCreator(resultDetailsActionHub, TestResultSource.getInstance(), artifactData);

        // initialising telemetry service with required parameter
        let telemetryData = new TestTabTelemetryService(artifactData);

        let renderingSpace = this._element.get(0);
        const leftViewProps: ITestResultLeftViewProps = {
            testResultsListActionHub: resultsGridActionsHub,
            testResultsListViewActionCreator: this._gridActionCreator,
            testResultDetailsActionCreator: this._resultDetailsActionCreator,
            treeStore: this._testResultsStore,
            context: artifactData,
            element: renderingSpace
        } as ITestResultLeftViewProps;

        const testResultsBaseProps: TestResultsView.ITestResultsBaseProps = {
            summaryViewProps: {
                store: summaryViewStore
            },
            leftViewProps: leftViewProps,
            testResultsViewStore: testResultsViewStore,
            resultDetailsProps: {
                resultDetailsStore: resultDetailsStore,
                resultDetailActionCreator: this._resultDetailsActionCreator,
                viewContext: artifactData,
                isFullScreen: false,
                showHistory: true,
                showHeader: true,
                linkedStackTrace: false,
            }
        };

        ReactDOM.render(
            React.createElement(
                TestResultsView.TestResultsView,
                testResultsBaseProps
            ),
            renderingSpace
        );

        if (this._testResultIdentifier) {
            if (this._testResultDetailsPivot) {
                this._resultDetailsActionCreator.openDetailsPaneInFullScreenMode(this._testResultIdentifier.testRunId, this._testResultIdentifier.testResultId, this._testResultDetailsPivot);
            } else {
                this._resultDetailsActionCreator.openDetailsPaneInFullScreenMode(this._testResultIdentifier.testRunId, this._testResultIdentifier.testResultId);
            }
        }

        this._summaryActionCreator.initialize(artifactData);
        this._gridActionCreator.initialize(artifactData);

        this._eventManager.attachEvent(RealTimeTestHub.RealTimeTestEvents.RELEASE_TESTRUN_STATS_CHANGED, this._onReleaseTestRunStatsChanged);
    }

    private _getArtifactData(releaseEnvironment: RMContracts.ReleaseEnvironment) {
        const data: Common.IData = {
            mainData: releaseEnvironment.release,
            subData: { environment: releaseEnvironment }
        };
        const status: Common.ViewContextStatus = this._getEnvironmentStatus(releaseEnvironment);

        const viewContext: Common.IViewContextData = {
            viewContext: CommonBase.ViewContext.Release,
            data: data,
            status: status
        };

        return viewContext;
    }

    private _handleReleaseSignalREvents(releaseEnvironment: RMContracts.ReleaseEnvironment) {
        try {
            if (!TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isTriSignalRIntegrationEnabled()) {
                return;
            }

            if (releaseEnvironment.status === RMContracts.EnvironmentStatus.InProgress) {
                this._signalRPromise = RealTimeTestHub.TestHubProxy.load();
                this._signalRPromise.then(() => {
                    this._testHubConnectionManager = TestHubConnectionManager.TestHubConnectionManager.getInstance();
                    this._testHubConnectionManager.subscribeToRelease(releaseEnvironment.release.id, releaseEnvironment.id).then(() => {
                        Diag.logInfo(`TestHub connected to release  ${releaseEnvironment.release.id} & environment id ${releaseEnvironment.id}`);
                    }, (reason: any) => {
                        console.error(`TestHub unable to connect to release  ${releaseEnvironment.release.id} & environment id ${releaseEnvironment.id} because of ${reason}`);
                    });
                }, (reason: any) => {
                    console.error(`Unable to load the signalR scripts for testHub: ${reason}`);
                });
            }
            else {
                if (this._signalRPromise && this._testHubConnectionManager) {
                    this._signalRPromise.then(() => {
                        this._testHubConnectionManager.unsubscribeToRelease(releaseEnvironment.release.id, releaseEnvironment.id).then(() => {
                            Diag.logInfo(`TestHub disconnected from release  ${releaseEnvironment.release.id} & environment id ${releaseEnvironment.id}`);
                        }, (reason: any) => {
                            console.error(`TestHub unable to disconnect from release  ${releaseEnvironment.release.id} & environment id ${releaseEnvironment.id} because of ${reason}`);
                        });
                    }, (reason: any) => {
                        console.error(`Unable to load the signalR scripts for testHub: ${reason}`);
                    });
                }
            }
        }
        catch (error) {
            // Not throwing exceptions while handling signals.
            console.error(`Error occurred while subscribing to signals : ${error}`);
            TestTabTelemetryService.getInstance().publishEvent(TestTabTelemetryService.featureTestTabSignalR, TestTabTelemetryService.errorOccurredDuringSignalRConnection, error);
        }
    }

    private _onReleaseTestRunStatsChanged = (sender: any, args: any) => {
        const artifactData = this._getArtifactData(this._prevReleaseEnvironmentObject);
        Diag.logInfo(`testHub : Handling test run changed event for release - environment:${this._prevReleaseEnvironmentObject.release.id}-${this._prevReleaseEnvironmentObject.id}`);
        this._summaryActionCreator.initialize(artifactData, true);
        if (this._refreshGridForFirstSignal) {
            this._gridActionCreator.initialize(artifactData);
            this._refreshGridForFirstSignal = false;
        }
        this._gridActionCreator.enableReloadButton();

        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_SignalRRefreshed, {});
    }

    private _getEnvironmentStatus(releaseEnvironment: RMContracts.ReleaseEnvironment): Common.ViewContextStatus {
        if (releaseEnvironment.status === RMContracts.EnvironmentStatus.InProgress) {
            return Common.ViewContextStatus.InProgress;
        } else if (ReleaseEnvironmentStatusHelper.isEnvironmentCompleted(releaseEnvironment)) {
            return Common.ViewContextStatus.Completed;
        } else {
            return Common.ViewContextStatus.Others;
        }
    }

    private _eventManager: EventService;
    private _signalRPromise: IPromise<boolean>;
    private _testHubConnectionManager: TestHubConnectionManager.TestHubConnectionManager;
}

SDK.registerContent("releaseEnvironment.testResults.details.initialize", (context) => {
    baseControl = Controls.create<TestResultsReleaseEnvironmentExtension, ITestResultsReleaseEnvironmentExtension>(
        TestResultsReleaseEnvironmentExtension, context.$container, context.options);
    return baseControl;
});

SDK.VSS.register("releaseEnvironment",
    () => {
        return {
            updateContext: (releaseEnvironment) => {
                // raise Action
                if (baseControl) {
                    baseControl.updateReleaseEnvironment(releaseEnvironment.releaseEnvironment);
                }
            }
        };
    });

let baseControl: TestResultsReleaseEnvironmentExtension = null;
