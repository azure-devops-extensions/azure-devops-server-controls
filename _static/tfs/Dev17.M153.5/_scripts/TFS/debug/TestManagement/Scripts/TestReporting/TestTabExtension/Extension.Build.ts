/// <amd-dependency path='VSS/LoaderPlugins/Css!Site' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import * as BuildContracts from "TFS/Build/Contracts";
import * as BuildExtensionContracts from "TFS/Build/ExtensionContracts";

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as ViewModel from "TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel";
import * as ExtensionBase from "TestManagement/Scripts/TestReporting/TestTabExtension/Extension.Base";
import * as ExtensionViews from "TestManagement/Scripts/TestReporting/TestTabExtension/Extension.Views";
import * as DataProvider from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import { BuildDataProvider } from "TestManagement/Scripts/TestReporting/DataProviders/Build.DataProvider";
import { TestResultExtensionInBuildCIVertical, ITestResultExtensionInBuildCIVertical } from "TestManagement/Scripts/Scenarios/TestTabExtension/Extension.BuildCIVertical";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TRAPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { getService } from "VSS/Service";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as Controls from "VSS/Controls";
import * as Diag from "VSS/Diag";
import * as NavigationService from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export interface ITestResultsTabContributionInBuildSummaryOptions extends ExtensionBase.IContributionBaseOptions, BuildExtensionContracts.IBuildResultsViewExtensionConfig {
    onFullScreenToggle: (isFullScreen: boolean) => void;
}

/// <summary>
/// The class is a bridge between extension and build sub-system
/// </summary>
export class BuildContextHandler implements ExtensionBase.IViewContextHandler {

    constructor(viewModel: ViewModel.ResultsViewModel, view: ExtensionViews.TestTabView | ExtensionViews.SummaryView) {
        this._resultsViewModel = viewModel;
        this._view = view;
    }

    /// <summary>
    /// This is a call back method and will be called from the Build-subsystem in an event of state change.
    /// This event will typically mean that we re-fetch all the data from the test sub-system and re-populate the view
    /// </summary>
    /// <param>build reference object</param>
    public sourceCallback(build: BuildContracts.Build): void {
        Diag.logVerbose(Utils_String.format("[BuildContextHandler.sourceCallback]: method called"));
        Diag.logInfo(Utils_String.format("[BuildContextHandler.sourceCallback]: Build callback triggered. BuildId: {0}", build.id));

        let viewContextData: Common.IViewContextData = {
            viewContext: CommonBase.ViewContext.Build,
            data: {
                mainData: build
            }
        };

        if (this._view) {
            let testReportViewSettings: IPromise<string> = DataProvider.UserSettingsDataProvider.getDefaultUserSettings(CommonBase.ViewContext.Build);
            testReportViewSettings.then((successString) => {
                Diag.logVerbose(successString);

                try {
                    (<ExtensionViews.TestTabView>this._view).applySettings(CommonBase.ViewContext.Build);
                } catch (e) {
                    Diag.logWarning(e);
                }
                this._resultsViewModel.load(viewContextData);
            },
                (error) => {
                    Diag.logWarning(Utils_String.format("Couldn't fetch User settings, loading with default layout, error: {0}", error));
                    this._resultsViewModel.load(viewContextData);
                });
        }
        else {
            this._resultsViewModel.load(viewContextData);
        }
    }

    public onDisplayedCallBack(): void {
        Diag.logInfo(Utils_String.format("[BuildContextHandler.onDisplayedCallBack]: Test tab getting displayed"));
        Performance.getScenarioManager().startScenario(TRAPerfScenarios.Area, TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
        TelemetryService.publishEvents(TelemetryService.featureTestTab_TestTabClicked[TelemetryService.buildContext], {
            [TelemetryService.totalTestsExists]: (this._view.getViewModel().getSummaryChartsViewModel().totalTests() > 0 ? "Yes" : "No"),
            [TelemetryService.failedTestsExists]: (this._view.getViewModel().getSummaryChartsViewModel().totalFailures() > 0 ? "Yes" : "No"),
            [TelemetryService.totalTests]: this._view.getViewModel().getSummaryChartsViewModel().totalTests(),
            [TelemetryService.failedTests]: this._view.getViewModel().getSummaryChartsViewModel().totalFailures(),
            [TelemetryService.passedTests]: this._view.getViewModel().getSummaryChartsViewModel().totalPassed(),
            [TelemetryService.passPercentageReported]: this._view.getViewModel().getSummaryChartsViewModel().passPercentage()
        });   // Logging telemetry for Test tab clicked.
        this._resultsViewModel.handleOnDisplayed();
    }

    private _resultsViewModel: ViewModel.ResultsViewModel;
    private _view: ExtensionViews.TestTabView | ExtensionViews.SummaryView;
}

// <summary>
/// The class defines the contribution for Test Results in RM
/// </summary>
export class TestResultsTabContributionInBuildSummary extends ExtensionBase.TestResultsContributionBase<ITestResultsTabContributionInBuildSummaryOptions> implements ExtensionBase.ITestResultsContribution {

    public initialize(): void {
        super.initialize();
        this.createView();
        this._initializeDataProviders();
        this._initViewContextHandler();
    }

    public initializeOptions(options: ITestResultsTabContributionInBuildSummaryOptions) {
        super.initializeOptions($.extend({
            cssClass: "test-results-extension-view"
        }, options));
    }

    /// <summary>
    /// Creates the contribution view
    /// </summary>
    public createView(): void {
        this._currentView = Controls.Control.create<ExtensionViews.TestTabView, ExtensionViews.ITestTabViewOptions>(ExtensionViews.TestTabView,
            this._element,
            <ExtensionViews.ITestTabViewOptions>{
                target: Common.TargetPage.Build_Summary_Test_Tab,
                onFullScreenToggle: this._options.onFullScreenToggle,
                viewModel: new ExtensionViews.TestTabViewModel(this._viewModel)
            });
    }

    /// <summary>
    /// returns contribution view
    /// </summary>
    public getView(): ExtensionViews.TestTabView {
        return this._currentView;
    }

    /// <summary>
    /// factory method for view context
    /// </summary>
    public getViewContext(): CommonBase.ViewContext {
        if (!this._viewContext) {
            this._viewContext = CommonBase.ViewContext.Build;
        }
        return this._viewContext;
    }

    /// <summary>
    /// factory method for view handler
    /// </summary>
    public getViewContextHandler(): ExtensionBase.IViewContextHandler {
        if (!this._viewContextHandler) {
            this._initViewContextHandler();
        }
        return this._viewContextHandler;
    }

    private _initViewContextHandler(): void {
        if (!this._viewContextHandler) {
            let view = this.getView();
            this._viewContextHandler = new BuildContextHandler(this._viewModel, view);

            Diag.logVerbose("[TestResultsContributionBase._setViewContextHandler]: new BuildContextHandler object created.");

            if ($.isFunction(this._options.onBuildChanged)) {
                this._options.onBuildChanged(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.sourceCallback));
            } else {
                throw new Error("[TestResultsContributionBase._setViewContextHandler]: onBuildChanged is not a function.");
            }

            if ($.isFunction(this._options.onViewDisplayed)) {
                this._options.onViewDisplayed(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.onDisplayedCallBack));
            } else {
                throw new Error("[TestResultsContributionBase._setViewContextHandler]: onViewDisplayed is not a function.");
            }
        }
    }

    private _initializeDataProviders(): void {
        if (!DataProvider.DataProvider.IsInitialized(CommonBase.ViewContext.Build)) {
            this._dataProvider = new BuildDataProvider();
            DataProvider.DataProvider.initializeDataProvider(CommonBase.ViewContext.Build, this._dataProvider);
        }
    }

    private static s_buildResultsContribution: string = "ms.vss-build-web.build-results-view";
    private _currentView: ExtensionViews.TestTabView;
}

export interface ITestResultsSummaryContributionInBuildSummaryOptions extends ExtensionBase.IContributionBaseOptions, BuildExtensionContracts.IBuildResultsViewExtensionConfig {
}

/// <summary>
/// Entry class for the Test Results Summary Charts extension
/// </summary>
export class TestResultsSummaryContributionInBuildSummary extends ExtensionBase.TestResultsContributionBase<ITestResultsSummaryContributionInBuildSummaryOptions> implements ExtensionBase.ITestResultsContribution {

    public initialize() {
        // abort any ongoing scenario and start the performance counter for Test results summary view
        if (Performance.getScenarioManager().getScenarios(TRAPerfScenarios.Area, TRAPerfScenarios.TestResultsInBuild_NoResultDetails)) {
            // this is required because of a bug in build code where the test-results-summary extension gets loaded multiple times
            Performance.getScenarioManager().abortScenario(TRAPerfScenarios.Area, TRAPerfScenarios.TestResultsInBuild_NoResultDetails);
        }
        Performance.getScenarioManager().startScenario(TRAPerfScenarios.Area, TRAPerfScenarios.TestResultsInBuild_NoResultDetails);

        super.initialize();
        this.createView();
        this._initializeDataProviders();
        this._initViewContextHandler();
    }

    public initializeOptions(options: ExtensionBase.IContributionBaseOptions) {
        super.initializeOptions($.extend({
            cssClass: "test-results-summary-extension-view"
        }, options));
    }

    /// <summary>
    /// Creates the contribution view
    /// </summary>
    public createView(): void {
        Diag.logVerbose("[TestResultsExtension._createLayout]: method called.");

        this._currentView = Controls.Control.create<ExtensionViews.SummaryView, ExtensionViews.ISummaryViewOptions>(ExtensionViews.SummaryView,
            this._element,
            {
                target: Common.TargetPage.Build_Summary_Default_Tab,
                viewModel: new ExtensionViews.SummaryViewModel(this._viewModel),
                selectTab: this._options.selectTab
            });
    }

    public getView(): ExtensionViews.SummaryView {
        return null; // returning null helps in differentiating between test tab and test summary contributions
    }

    /// <summary>
    /// factory method for view context
    /// </summary>
    public getViewContext(): CommonBase.ViewContext {
        if (!this._viewContext) {
            this._viewContext = CommonBase.ViewContext.Build;
        }
        return this._viewContext;
    }

    /// <summary>
    /// factory method for view handler
    /// </summary>
    public getViewContextHandler(): ExtensionBase.IViewContextHandler {
        if (!this._viewContextHandler) {
            this._initViewContextHandler();
        }
        return this._viewContextHandler;
    }

    private _initViewContextHandler(): void {
        if (!this._viewContextHandler) {
            let view = this.getView();
            this._viewContextHandler = new BuildContextHandler(this._viewModel, view);

            Diag.logVerbose("[TestResultsContributionBase._setViewContextHandler]: new BuildContextHandler object created.");

            if ($.isFunction(this._options.onBuildChanged)) {
                this._options.onBuildChanged(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.sourceCallback));
            } else {
                throw new Error("[TestResultsContributionBase._setViewContextHandler]: onBuildChanged is not a function.");
            }

            if ($.isFunction(this._options.onViewDisplayed)) {
                this._options.onViewDisplayed(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.onDisplayedCallBack));
            } else {
                throw new Error("[TestResultsContributionBase._setViewContextHandler]: onViewDisplayed is not a function.");
            }
        }
     }

    private _initializeDataProviders(): void {
        if (!DataProvider.DataProvider.IsInitialized(CommonBase.ViewContext.Build)) {
            this._dataProvider = new BuildDataProvider();
            DataProvider.DataProvider.initializeDataProvider(CommonBase.ViewContext.Build, this._dataProvider);
        }
    }

    private _currentView: ExtensionViews.SummaryView;
}

// Registering "TestResultsTabContributionInBuildSummary" class with Extension host
SDK.registerContent("testResults.details", (context) => {
    const buildCIResultContributedFeatureId = "ms.vss-build-web.ci-result";
    const isBuildCIResultEnabled = getService(FeatureManagementService).isFeatureEnabled(buildCIResultContributedFeatureId);
    if (isBuildCIResultEnabled || LicenseAndFeatureFlagUtils.isNewTestTabEnabledInOldBuild()) {
        return Controls.create<TestResultExtensionInBuildCIVertical, ITestResultExtensionInBuildCIVertical>(
            TestResultExtensionInBuildCIVertical, context.$container, context.options
        );
    } else {
        return Controls.create<TestResultsTabContributionInBuildSummary, ITestResultsTabContributionInBuildSummaryOptions>(
            TestResultsTabContributionInBuildSummary, context.$container, context.options
        );
    }
});

// Registering "TestResultsSummaryContributionInBuildSummary" class with Extension host
SDK.registerContent("testResults.summary", (context) => {
    return Controls.create<TestResultsSummaryContributionInBuildSummary, ExtensionBase.IContributionBaseOptions>(TestResultsSummaryContributionInBuildSummary, context.$container, context.options);
});