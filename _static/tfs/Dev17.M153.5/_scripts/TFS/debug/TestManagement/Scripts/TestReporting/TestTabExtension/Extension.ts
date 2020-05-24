/// <amd-dependency path='VSS/LoaderPlugins/Css!Site' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import q = require("q");

import * as NavigationService from "VSS/Navigation/Services";

import RMContracts = require("ReleaseManagement/Core/Contracts");
import RMExtensionContracts = require("ReleaseManagement/Core/ExtensionContracts");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import EnvironmentSelectorControl = require("TestManagement/Scripts/TestReporting/TestTabExtension/EnvironmentSelectorControl");
import TcmUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import Views = require("TestManagement/Scripts/TestReporting/TestTabExtension/Extension.Views");
import DataProvider = require("TestManagement/Scripts/TestReporting/Common/Extension.DataProvider"); 

import BuildContracts = require("TFS/Build/Contracts");
import BuildExtensionContracts = require("TFS/Build/ExtensionContracts");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

let TelemetryService = TCMTelemetry.TelemetryService;

export interface IViewContextHandler {
    sourceCallback(data: any): void;
    onDisplayedCallBack(): void;
}

export interface IContributionBaseOptions {
    name: string;
}

export interface ITestResultsContributionToBuildOptions extends IContributionBaseOptions, BuildExtensionContracts.IBuildResultsViewExtensionConfig {
    onFullScreenToggle: (isFullScreen: boolean) => void;
}

export interface ITestResultsContributionToRMOptions extends IContributionBaseOptions, RMExtensionContracts.IReleaseViewExtensionConfig{
    onFullScreenToggle: (isFullScreen: boolean) => void;
}

/// <summary>
/// Base class for Test Results extensions
/// </summary>
export class TestResultsContributionBase extends Controls.Control<IContributionBaseOptions> {

    constructor(options: IContributionBaseOptions) {
        super(options);
        this._setViewContext(options);
    }

    public initialize(): void {
        super.initialize();
        this._viewModel = new ViewModel.ResultsViewModel();
    }

    protected getView(): Views.TestTabView {
        throw new Error("getView method should be defined in derived class");
    }

    /// <summary>
    /// sets the viewContext handler methods
    /// </summary>
    protected _setViewContextHandler(): void {
        let view = this.getView();
        switch (this.getViewContext()) {
            case CommonBase.ViewContext.Build:
                this._viewContextHandler = new BuildContextHandler(this._viewModel, view);
                Diag.logVerbose("[TestResultsContributionBase._setViewContextHandler]: new BuildContextHandler object created.");

                if ($.isFunction((<ITestResultsContributionToBuildOptions>this._options).onBuildChanged)) {
                    (<ITestResultsContributionToBuildOptions>this._options).onBuildChanged(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.sourceCallback));
                } else {
                    throw new Error("[TestResultsContributionBase._setViewContextHandler]: onBuildChanged is not a function.");
                }

                if ($.isFunction((<ITestResultsContributionToBuildOptions>this._options).onViewDisplayed)) {
                    (<ITestResultsContributionToBuildOptions>this._options).onViewDisplayed(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.onDisplayedCallBack));
                } else {
                    throw new Error("[TestResultsContributionBase._setViewContextHandler]: onViewDisplayed is not a function.");
                }
                break;
            case CommonBase.ViewContext.Release:
                this._viewContextHandler = new ReleaseContextHandler(this._viewModel, view, this._releaseEnvironmentSelector);
                Diag.logVerbose("[TestResultsContributionBase._setViewContextHandler]: new ReleaseContextHandler object created.");

                if ($.isFunction((<ITestResultsContributionToRMOptions>this._options).onReleaseChanged)) {
                    (<ITestResultsContributionToRMOptions>this._options).onReleaseChanged(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.sourceCallback));
                } else {
                    throw new Error("[TestResultsContributionBase._setViewContextHandler]: onReleaseChanged is not a function.");
                }

                if ($.isFunction((<ITestResultsContributionToRMOptions>this._options).onViewDisplayed)) {
                    (<ITestResultsContributionToRMOptions>this._options).onViewDisplayed(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.onDisplayedCallBack));
                } else {
                    throw new Error("[TestResultsContributionBase._setViewContextHandler]: onViewDisplayed is not a function.");
                }
                break;
            default:
                throw new Error(Utils_String.format("[TestResultsContributionBase._setViewContextHandler]: Invalid value of viewContext: {0}", this.getViewContext()));   // Invalid target, throw error.
        }
    }

    private _setViewContext(options: IContributionBaseOptions): void {
        Diag.logVerbose("[TestResultsContributionBase._setViewContext]: method called");

        if (!options) {
            throw new Error("Contribution host data is null, unable to identify the source");
        }

        switch (options.name) {
            case TestResultsSummaryContribution.s_buildResultsContribution:
                this._viewContext = CommonBase.ViewContext.Build;
                break;
            case TestResultsSummaryContribution.s_releaseManagementContribution:
                this._viewContext = CommonBase.ViewContext.Release;
                break;
            default:
            throw new Error(Utils_String.format("Unsupported contribution host data is received, unable to identify the source: {0}", options.name));
        }

        Diag.logInfo(Utils_String.format("[TestResultsContributionBase._setViewContext]: viewContext set to {0}", CommonBase.ViewContext[this._viewContext]));
    }

    public getViewContext(): CommonBase.ViewContext {
        return this._viewContext;
    }

    public getViewContextHandler(): IViewContextHandler {
        return this._viewContextHandler;
    }

    protected _viewModel: ViewModel.ResultsViewModel;
    protected _releaseEnvironmentSelector: EnvironmentSelectorControl.EnvironmentSelector;

    private _viewContext: CommonBase.ViewContext;
    private _viewContextHandler: IViewContextHandler;

    public static s_buildResultsContribution: string = "ms.vss-build-web.build-results-view";
    public static s_releaseManagementContribution: string = "ms.vss-releaseManagement-web.release-details-view";
}

/// <summary>
/// The class is a bridge between extension and build sub-system
/// </summary>
export class BuildContextHandler implements IViewContextHandler {
   
    constructor(viewModel: ViewModel.ResultsViewModel, view: Views.TestTabView) {
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
                    this._view.applySettings(CommonBase.ViewContext.Build);
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
        Performance.getScenarioManager().startScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
        TelemetryService.publishEvents(TelemetryService.featureTestTab_TestTabClicked[TelemetryService.buildContext], {
            [TelemetryService.totalTestsExists]: (this._view.getViewModel().getSummaryChartsViewModel().totalTests() > 0 ? "Yes" : "No"),
            [TelemetryService.failedTestsExists]: (this._view.getViewModel().getSummaryChartsViewModel().totalFailures() > 0 ? "Yes" : "No"),
            [TelemetryService.totalTests]: this._view.getViewModel().getSummaryChartsViewModel().totalTests(),
            [TelemetryService.failedTests]: this._view.getViewModel().getSummaryChartsViewModel().totalFailures(),
            [TelemetryService.passedTests]: this._view.getViewModel().getSummaryChartsViewModel().totalPassed()
        });   // Logging telemetry for Test tab clicked.
        this._resultsViewModel.handleOnDisplayed();
    }

    private _resultsViewModel: ViewModel.ResultsViewModel;
    private _view: Views.TestTabView;
}

/// <summary>
/// The class is a bridge between extension and release sub-system
/// </summary>
export class ReleaseContextHandler implements IViewContextHandler {
   
    constructor(viewModel: ViewModel.ResultsViewModel, view: Views.TestTabView, environmentSelector: EnvironmentSelectorControl.EnvironmentSelector) {
        this._resultsViewModel = viewModel;
        this._releaseEnvironmentSelector = environmentSelector;
        this._view = view;
    }


    /// <summary>
    /// This is a call back method and will be called from the release-subsystem in an event of state change.
    /// This event will typically mean that we re-fetch all the data from the test sub-system and re-populate the view
    /// </summary>
    /// <param>release reference object</param>
    public sourceCallback(release: RMContracts.Release);
    public sourceCallback(release: RMContracts.Release, selectedEnvironment?: RMContracts.ReleaseEnvironment);
    public sourceCallback(release: RMContracts.Release, selectedEnvironment?: RMContracts.ReleaseEnvironment): void {
        Diag.logVerbose(Utils_String.format("[ReleaseContextHandler.sourceCallback]: method called"));
        Diag.logInfo(Utils_String.format("[ReleaseContextHandler.sourceCallback]: Release callback triggered. ReleaseId: {0}", release.id));
        
        if (!selectedEnvironment) {
            // Update the Environment drop-down
            if (this._releaseEnvironmentSelector) {
                let environmentInfo: EnvironmentSelectorControl.IEnvironmentInfo[] = $.map(release.environments, (environment) => {
                    return <EnvironmentSelectorControl.IEnvironmentInfo>{
                        id: environment.id,
                        name: environment.name,
                        payload: {
                            release: release,
                            environment: environment
                        }
                    };
                });
                this._releaseEnvironmentSelector.updateEnvironments(environmentInfo);
                selectedEnvironment = this._releaseEnvironmentSelector.getSelectedEnvironmentInfo().payload.environment;
                if (selectedEnvironment && !selectedEnvironment.name) {
                    selectedEnvironment.name = this._releaseEnvironmentSelector.getSelectedEnvironmentInfo().name;
                }
            } else {
                selectedEnvironment = release.environments[0];
                if (selectedEnvironment && !selectedEnvironment.name) {
                    selectedEnvironment.name = release.environments[0].name;
                }
            }
        }

        let viewContextData: Common.IViewContextData = {
            viewContext: CommonBase.ViewContext.Release,
            data: {
                mainData: release,
                subData: { environment: selectedEnvironment }
            }
        };

        let testReportViewSettings: IPromise<string> = DataProvider.UserSettingsDataProvider.getDefaultUserSettings(CommonBase.ViewContext.Release);
        testReportViewSettings.then((successString) => {
            Diag.logVerbose(successString);
            if (this._view) {
                try {
                    this._view.applySettings(CommonBase.ViewContext.Release);
                } catch (e) {
                    Diag.logWarning(e);
                }
            }
            this._resultsViewModel.load(viewContextData);
        },
            (error) => {
                Diag.logWarning(Utils_String.format("Couldn't fetch User settings, loading with default layout, error: {0}", error));
                this._resultsViewModel.load(viewContextData);
        });
    }

    public onDisplayedCallBack(): void {
        Diag.logInfo(Utils_String.format("[ReleaseContextHandler.onDisplayedCallBack]: Test tab getting displayed"));
        TelemetryService.publishEvents(TelemetryService.featureTestTab_TestTabClicked[TelemetryService.releaseContext], {
            [TelemetryService.totalTestsExists]: (this._view.getViewModel().getSummaryChartsViewModel().totalTests() > 0 ? "Yes" : "No"),
            [TelemetryService.failedTestsExists]: (this._view.getViewModel().getSummaryChartsViewModel().totalFailures() > 0 ? "Yes" : "No"),
            [TelemetryService.totalTests]: this._view.getViewModel().getSummaryChartsViewModel().totalTests(),
            [TelemetryService.failedTests]: this._view.getViewModel().getSummaryChartsViewModel().totalFailures(),
            [TelemetryService.passedTests]: this._view.getViewModel().getSummaryChartsViewModel().totalPassed(),
            [TelemetryService.passPercentageReported]: this._view.getViewModel().getSummaryChartsViewModel().passPercentage()
        });   // Logging telemetry for Test tab clicked.

        this._resultsViewModel.handleOnDisplayed();

        let environmentId = this._getEnvironmentInfoFromUrl();

        if (environmentId) {
            this._releaseEnvironmentSelector.selectEnvironment(environmentId);
        }
    }

    private _getEnvironmentInfoFromUrl(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        return (state) ? state[CommonBase.Constants.SelectedEnvironmentIdUrlOption] : undefined;
    }

    private _resultsViewModel: ViewModel.ResultsViewModel;
    private _releaseEnvironmentSelector: EnvironmentSelectorControl.EnvironmentSelector;
    private _view: Views.TestTabView;
}


export interface ITestResultsContribution {
    createView(): void;
    getView(): Views.TestTabView;
}

/// <summary>
/// Entry class for the Test Results extension
/// </summary>
export class TestResultsContribution extends TestResultsContributionBase implements ITestResultsContribution {

    public initialize(): void {
        Performance.getScenarioManager().startScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsInGrid);      
        super.initialize();
        this.createView();
        this._setViewContextHandler();
    }

    public initializeOptions(options: IContributionBaseOptions) {
        super.initializeOptions($.extend({
            cssClass: "test-results-extension-view"
        }, options));
    }

    /// <summary>
    /// Creates the contribution view
    /// </summary>
    public createView(): void {
        Diag.logVerbose("[TestResultsContribution._createLayout]: method called.");

        switch (this.getViewContext()) {
            case CommonBase.ViewContext.Build:
                this._currentView = Controls.Control.create<Views.TestTabView, Views.ITestTabViewOptions>(Views.TestTabView,
                    this._element,
                    {
                        target: Common.TargetPage.Build_Summary_Test_Tab,
                        onFullScreenToggle: (<ITestResultsContributionToBuildOptions>this._options).onFullScreenToggle,
                        viewModel: new Views.TestTabViewModel(this._viewModel)
                    });
                break;
            case CommonBase.ViewContext.Release:
                let layout = $(`<div class='test-results-in-release-environment-selector' />
                                <div class='test-results-in-release-body' />`);
                this.getElement().append(layout);

                this._releaseEnvironmentSelector = <EnvironmentSelectorControl.EnvironmentSelector>Controls.BaseControl.enhance(EnvironmentSelectorControl.EnvironmentSelector,
                    this._element.find(".test-results-in-release-environment-selector"),
                    <EnvironmentSelectorControl.IEnvironmentSelectorOptions>{
                        onSelectedEnvironmentChanged: (release: RMContracts.Release, environment: RMContracts.ReleaseEnvironment) => {
                            (<ReleaseContextHandler>this.getViewContextHandler()).sourceCallback(release, environment);
                        }
                    });

                this._currentView = Controls.Control.create<Views.TestTabView, Views.ITestTabViewOptions>(Views.TestTabView,
                    this._element.find(".test-results-in-release-body"),
                    {
                        target: Common.TargetPage.Release_Summary_Test_Tab,
                        onFullScreenToggle: (<ITestResultsContributionToRMOptions>this._options).onFullScreenToggle,
                        viewModel: new Views.TestTabViewModel(this._viewModel)
                    });
                break;
            default:
                throw new Error(Utils_String.format("[TestResultsContribution._createLayout]: Invalid value of viewContext: {0}", this.getViewContext()));   // Invalid target, throw error.
        }
    }

    public getView(): Views.TestTabView {
        return this._currentView;
    }

    private _currentView: Views.TestTabView;
}

/// <summary>
/// Entry class for the Test Results Summary Charts extension
/// </summary>
export class TestResultsSummaryContribution extends TestResultsContributionBase implements ITestResultsContribution {

    public initialize() {
        // abort any ongoing scenario and start the perf counter for Test results summary view
        if (Performance.getScenarioManager().getScenarios(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_NoResultDetails)) {
            // this is required because of a bug in build code where the test-results-summary extension gets loaded multiple times
            Performance.getScenarioManager().abortScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_NoResultDetails);
        }
        Performance.getScenarioManager().startScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_NoResultDetails);

        super.initialize();
        this.createView();
        this._setViewContextHandler();
    }

    public initializeOptions(options: IContributionBaseOptions) {
        super.initializeOptions($.extend({
            cssClass: "test-results-summary-extension-view"
        }, options));
    }

    /// <summary>
    /// Creates the contribution view
    /// </summary>
    public createView(): void {
        Diag.logVerbose("[TestResultsExtension._createLayout]: method called.");

        switch (this.getViewContext()) {
            case CommonBase.ViewContext.Build:
                Controls.Control.create<Views.SummaryView, Views.ISummaryViewOptions>(Views.SummaryView,
                    this._element,
                    {
                        target: Common.TargetPage.Build_Summary_Default_Tab,
                        viewModel: new Views.SummaryViewModel(this._viewModel),
                        selectTab: (<ITestResultsContributionToBuildOptions>this._options).selectTab
                    });
                break;
            case CommonBase.ViewContext.Release:
            // To be used when requirement for Release Summary page comes in.
            // break;
            default:
                throw new Error(Utils_String.format("[TestResultsContribution._createLayout]: Invalid value of viewContext: {0}", this.getViewContext()));   // Invalid target, throw error.
        }
    }

    public getView(): Views.TestTabView {
        return null;
    }
}

// Registering "TestResultContribution" class with Extension host
SDK.registerContent("testResults.details", (context) => {
    return Controls.create<TestResultsContribution, IContributionBaseOptions>(TestResultsContribution, context.$container, context.options);
});
// Registering "TestResultsSummaryContribution" class with Extension host
SDK.registerContent("testResults.summary", (context) => {
    return Controls.create<TestResultsSummaryContribution, IContributionBaseOptions>(TestResultsSummaryContribution, context.$container, context.options);
});
// Registering "TestResultContribution" class with Extension host
SDK.registerContent("releaseManagement.testResults.details", (context) => {
    return Controls.create<TestResultsContributionBase, IContributionBaseOptions>(TestResultsContribution, context.$container, $.extend({
        name: "ms.vss-releaseManagement-web.release-details-view"
    }, context.options));
});
