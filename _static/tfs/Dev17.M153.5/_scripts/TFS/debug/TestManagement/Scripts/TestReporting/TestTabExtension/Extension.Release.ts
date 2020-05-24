/// <amd-dependency path='VSS/LoaderPlugins/Css!Site' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import RMContracts = require("ReleaseManagement/Core/Contracts");
import RMExtensionContracts = require("ReleaseManagement/Core/ExtensionContracts");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as EnvironmentSelectorControl from "TestManagement/Scripts/TestReporting/TestTabExtension/EnvironmentSelectorControl";
import * as ViewModel from "TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel";
import * as ExtensionBase from "TestManagement/Scripts/TestReporting/TestTabExtension/Extension.Base";
import * as DataProvider from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import { ReleaseDataProvider } from "TestManagement/Scripts/TestReporting/DataProviders/Release.DataProvider";
import { ITestTabViewOptions, TestTabView, TestTabViewModel } from "TestManagement/Scripts/TestReporting/TestTabExtension/Extension.Views";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";

import * as Controls from "VSS/Controls";
import * as Diag from "VSS/Diag";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as RMUtils from "ReleaseManagement/Core/Utils";
import VSS = require("VSS/VSS");

import * as SDK from "VSS/SDK/Shim";

/// <summary>
/// Interface for Test Results extensions viewContext handler for Release
/// </summary>
export interface IReleaseViewContextHandler extends ExtensionBase.IViewContextHandler {
    sourceCallback(data: any, selectedEnvironment?: RMContracts.ReleaseEnvironment): void;
}

/// <summary>
/// Interface for contribution for TestResults in RM options
/// </summary>
export interface ITestResultsContributionInReleaseSummaryOptions extends ExtensionBase.IContributionBaseOptions, RMExtensionContracts.IReleaseViewExtensionConfig {
    onFullScreenToggle: (isFullScreen: boolean) => void;
}

// <summary>
/// The class is a bridge between extension and release sub-system
/// </summary>
export class ReleaseContextHandler implements IReleaseViewContextHandler {

    constructor(viewModel: ViewModel.ResultsViewModel, view: TestTabView, environmentSelector: EnvironmentSelectorControl.EnvironmentSelector) {
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
            let environmentInUrl: RMContracts.ReleaseEnvironment = this._getSelectedEnvironmentFromUrl(release, this._getEnvironmentInfoFromUrl());
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
                selectedEnvironment = (environmentInUrl) ? environmentInUrl : this._releaseEnvironmentSelector.getSelectedEnvironmentInfo().payload.environment;
                if (selectedEnvironment && !selectedEnvironment.name) {
                    selectedEnvironment.name = this._releaseEnvironmentSelector.getSelectedEnvironmentInfo().name;
                }
                
                if (environmentInUrl) {
                    this._releaseEnvironmentSelector.selectEnvironment(environmentInUrl.id.toString());
                    return;
                }
            }
            else {
                selectedEnvironment = (environmentInUrl) ? environmentInUrl : release.environments[0];
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

    /// <summary>
    /// This is a call back method and will be called from the release-subsystem in an event of test tab getting visible.
    /// </summary>
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

    /// <summary>
    /// Fetches environment information from the URL.
    /// </summary>
    private _getEnvironmentInfoFromUrl(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        return (state) ? state[CommonBase.Constants.SelectedEnvironmentIdUrlOption] : undefined;
    }

    private _getSelectedEnvironmentFromUrl(release: RMContracts.Release, environmentInUrl: string): RMContracts.ReleaseEnvironment {
        let selectedEnvironmentInUrl: RMContracts.ReleaseEnvironment;
        release.environments.forEach((environemnt) => {
            if (parseInt(environmentInUrl) === environemnt.id) {
                selectedEnvironmentInUrl = environemnt;
            }
        });
        return selectedEnvironmentInUrl;
    }

    private _resultsViewModel: ViewModel.ResultsViewModel;
    private _releaseEnvironmentSelector: EnvironmentSelectorControl.EnvironmentSelector;
    private _view: TestTabView;
}

// <summary>
/// The class defines the contribution for Test Results in RM
/// </summary>
export class TestResultsTabContributionInReleaseSummary extends ExtensionBase.TestResultsContributionBase<ITestResultsContributionInReleaseSummaryOptions> implements ExtensionBase.ITestResultsContribution {

    public initialize(): void {
        super.initialize();
        this.createView();
        this._initializeDataProviders();
        this._initViewContextHandler();
    }

    public initializeOptions(options: ITestResultsContributionInReleaseSummaryOptions) {
        super.initializeOptions($.extend({
            cssClass: "test-results-extension-view"
        }, options));
    }

    /// <summary>
    /// Creates the contribution view
    /// </summary>
    public createView(): void {
        Diag.logVerbose("[TestResultsContribution._createLayout]: method called.");

        let layout = $(`<div class='test-results-in-release-environment-selector' />
                                <div class='test-results-in-release-body' />`);
        this.getElement().append(layout);

        this._releaseEnvironmentSelector = <EnvironmentSelectorControl.EnvironmentSelector>Controls.BaseControl.enhance(EnvironmentSelectorControl.EnvironmentSelector,
            this._element.find(".test-results-in-release-environment-selector"),
            <EnvironmentSelectorControl.IEnvironmentSelectorOptions>{
                onSelectedEnvironmentChanged: (release: RMContracts.Release, environment: RMContracts.ReleaseEnvironment) => {
                    this.getViewContextHandler().sourceCallback(release, environment);
                }
            });

        this._currentView = Controls.Control.create<TestTabView, ITestTabViewOptions>(TestTabView,
            this._element.find(".test-results-in-release-body"),
            <ITestTabViewOptions>{
                target: Common.TargetPage.Release_Summary_Test_Tab,
                onFullScreenToggle: this._options.onFullScreenToggle,
                viewModel: new TestTabViewModel(this._viewModel)
            });
    }

    /// <summary>
    /// returns contribution view
    /// </summary>
    public getView(): TestTabView {
        return this._currentView;
    }

    /// <summary>
    /// factory method for view context
    /// </summary>
    public getViewContext(): CommonBase.ViewContext {
        if (!this._viewContext) {
            this._viewContext = CommonBase.ViewContext.Release;
        }
        return this._viewContext;
    }

    /// <summary>
    /// factory method for view handler
    /// </summary>
    public getViewContextHandler(): IReleaseViewContextHandler {
        if (!this._viewContextHandler) {
            this._initViewContextHandler();
        }
        return this._viewContextHandler;
    }

    private _initViewContextHandler(): void {
        if (!this._viewContextHandler) {
            let view = this.getView();
            this._viewContextHandler = new ReleaseContextHandler(this._viewModel, view, this._releaseEnvironmentSelector);

            Diag.logVerbose("[TestResultsContributionBase._setViewContextHandler]: new ReleaseContextHandler object created.");

            if ($.isFunction(this._options.onReleaseChanged)) {
                this._options.onReleaseChanged(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.sourceCallback));
            } else {
                throw new Error("[TestResultsContributionBase._setViewContextHandler]: onReleaseChanged is not a function.");
            }

            if ($.isFunction(this._options.onViewDisplayed)) {
                this._options.onViewDisplayed(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.onDisplayedCallBack));
            } else {
                throw new Error("[TestResultsContributionBase._setViewContextHandler]: onViewDisplayed is not a function.");
            }
        }
    }

    private _initializeDataProviders(): void {
        if (!DataProvider.DataProvider.IsInitialized(CommonBase.ViewContext.Release)) {
            this._dataProvider = new ReleaseDataProvider();
            DataProvider.DataProvider.initializeDataProvider(CommonBase.ViewContext.Release, this._dataProvider);
        }
    }

    private static s_releaseManagementContribution: string = "ms.vss-releaseManagement-web.release-details-view";

    private _currentView: TestTabView;
    private _releaseEnvironmentSelector: EnvironmentSelectorControl.EnvironmentSelector;
}

// Registering "TestResultContribution" class with Extension host
SDK.registerContent("releaseManagement.testResults.details", (context) => {
    if (context && context.options && context.options.isReleaseV2) {
    // Do not show this extension in new release UI.
        return null;
    }
    return Controls.create<TestResultsTabContributionInReleaseSummary, ITestResultsContributionInReleaseSummaryOptions>(TestResultsTabContributionInReleaseSummary, context.$container, context.options);
});
