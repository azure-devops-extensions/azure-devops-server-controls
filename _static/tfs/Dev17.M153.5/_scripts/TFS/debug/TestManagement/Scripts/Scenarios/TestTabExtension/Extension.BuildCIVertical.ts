/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/Extension.TestTabExtension";

import * as React from "react";
import * as ReactDOM from "react-dom";
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
import * as BuildContracts from "TFS/Build/Contracts";
import * as BuildExtensionContracts from "TFS/Build/ExtensionContracts";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { NavigationView } from "VSS/Controls/Navigation";
import * as Diag from "VSS/Diag";
import { EventService, getService as getEventService } from "VSS/Events/Services";

export interface ITestResultExtensionInBuildCIVertical extends BuildExtensionContracts.IBuildResultsViewExtensionConfig {
}

export class TestResultExtensionInBuildCIVertical extends NavigationView {
    private _gridActionCreator: TestResultsListViewActionCreator;
    private _resultDetailsActionCreator: TestResultDetailsActionCreator;
    private _summaryActionCreator: TestResultsReportActionsCreator;
    private _build: BuildContracts.Build;
    private _testResultIdentifier: TCMContracts.TestCaseResultIdentifier;
    private _testResultDetailsPivot: string;
    private _testResultsStore: TestResultsStore;
    private _refreshGridForFirstSignal: boolean;

    public initialize(): void {
        super.initialize();
        this._eventManager = getEventService();
        this._refreshGridForFirstSignal = true;
        PerformanceUtils.onBuildExtensionRenderComplete = this._options.onExtensionRenderComplete;
        PerformanceUtils.startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
        this._options.onBuildChanged((build: BuildContracts.Build) => {
            if (!this._build) {
                this._createView(build);
                this._handleBuildSignalREvents(build);
            }
            else if (!this._equals(this._build, build)) {
                this._updateView(build);
                this._handleBuildSignalREvents(build);
            }
        });
    }

    public initializeOptions(options: ITestResultExtensionInBuildCIVertical) {
        super.initializeOptions($.extend(
            {
                cssClass: "testresults-build-ci-vertical-extension",
                attachNavigate: true
            },
            options
        ));
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
        this._eventManager.detachEvent(RealTimeTestHub.RealTimeTestEvents.BUILD_TESTRUN_STATS_CHANGED, this._onBuildTestRunStatsChanged);
        if (this._testHubConnectionManager) {
            this._testHubConnectionManager.unsubscribeToBuild(this._build.id).then(() => {
                this._testHubConnectionManager.stop();
            });
        }
    }

    private _equals(oldBuild: BuildContracts.Build, newBuild: BuildContracts.Build): boolean {
        if (!oldBuild || !newBuild) {
            return false;
        }
        if (oldBuild.id !== newBuild.id) {
            return false;
        }
        if (oldBuild.status !== newBuild.status) {
            return false;
        }

        return true;
    }

    private _updateView(build: BuildContracts.Build): void {
        this._build = build;
        const artifactData: Common.IViewContextData = this._getArtifactData(build);

        if (!!this._summaryActionCreator) {
            this._summaryActionCreator.initialize(artifactData);
        }

        if (!!this._gridActionCreator) {
            this._gridActionCreator.initialize(artifactData);
        }
    }

    private _createView(build: BuildContracts.Build): void {
        this._build = build;
        const artifactData: Common.IViewContextData = this._getArtifactData(build);

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

        const renderingSpace = this._element.get(0);
        const leftViewProps: ITestResultLeftViewProps = {
            testResultsListActionHub: resultsGridActionsHub,
            testResultsListViewActionCreator: this._gridActionCreator,
            testResultDetailsActionCreator: this._resultDetailsActionCreator,
            treeStore: this._testResultsStore,
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
                linkedStackTrace: true,
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

        this._eventManager.attachEvent(RealTimeTestHub.RealTimeTestEvents.BUILD_TESTRUN_STATS_CHANGED, this._onBuildTestRunStatsChanged);
    }

    private _getArtifactData(build: BuildContracts.Build): Common.IViewContextData {
        const data: Common.IData = {
            mainData: build
        };
        const status: Common.ViewContextStatus = this._getBuildStatus(build);
        const artifactData: Common.IViewContextData = {
            viewContext: CommonBase.ViewContext.Build,
            data: data,
            status: status
        };

        return artifactData;
    }

    private _handleBuildSignalREvents(build: BuildContracts.Build): void {
        try {
            if (!TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isTriSignalRIntegrationEnabled()) {
                return;
            }

            if (build.status === BuildContracts.BuildStatus.InProgress) {
                this._signalRPromise = RealTimeTestHub.TestHubProxy.load();

                this._signalRPromise.then(() => {
                    this._testHubConnectionManager = TestHubConnectionManager.TestHubConnectionManager.getInstance();
                    this._testHubConnectionManager.subscribeToBuild(build.id).then(() => {
                        Diag.logVerbose(`TestHub connected to build ${build.id}`);
                    }, (reason: any) => {
                        console.error(`TestHub unable to connect to build ${build.id} because of ${reason}`);
                    });
                }, (reason: any) => {
                    console.error(`Unable to load the signalR scripts for testHub: ${reason}`);
                });
            }
            else {
                if (this._signalRPromise && this._testHubConnectionManager) {
                    this._signalRPromise.then(() => {
                        this._testHubConnectionManager.unsubscribeToBuild(build.id).then(() => {
                            this._testHubConnectionManager.stop();
                        }, (reason: any) => {
                            console.error(`TestHub unable to disconnect from build ${build.id} because of ${reason}`);
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

    private _onBuildTestRunStatsChanged = (sender: any, args: any) => {
        const artifactData: Common.IViewContextData = this._getArtifactData(this._build);
        Diag.logInfo(`testHub : Handling test run changed event for build:${this._build.id}`);
        this._summaryActionCreator.initialize(artifactData, true);
        if (this._refreshGridForFirstSignal) {
            this._gridActionCreator.initialize(artifactData);
            this._refreshGridForFirstSignal = false;
        }
        this._gridActionCreator.enableReloadButton();

        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_SignalRRefreshed, {});
    }

    private _getBuildStatus(build: BuildContracts.Build): Common.ViewContextStatus {
        if (build.status === BuildContracts.BuildStatus.InProgress) {
            return Common.ViewContextStatus.InProgress;
        } else if (build.status === BuildContracts.BuildStatus.Completed) {
            return Common.ViewContextStatus.Completed;
        } else {
            return Common.ViewContextStatus.Others;
        }
    }

    private _eventManager: EventService;
    private _signalRPromise: IPromise<boolean>;
    private _testHubConnectionManager: TestHubConnectionManager.TestHubConnectionManager;
}
