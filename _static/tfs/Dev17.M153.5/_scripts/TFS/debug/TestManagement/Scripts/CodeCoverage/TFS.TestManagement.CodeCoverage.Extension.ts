/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />
import { LegacyComponent } from "Presentation/Scripts/TFS/Components/LegacyComponent";
import CodeCoverageViews = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.Extension.Views");
import TMUtils = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.Utils");
import * as TCMCommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as DataProvider from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import { BuildDataProvider } from "TestManagement/Scripts/TestReporting/DataProviders/Build.DataProvider";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import TCMCommon = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import BuildContracts = require("TFS/Build/Contracts");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import { registerLWPComponent } from "VSS/LWP";
import Performance = require("VSS/Performance");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");


let TelemetryService = TCMTelemetry.TelemetryService;

export interface IViewContextHandler {

    sourceCallback(data: any): void;
    onDisplayedCallBack(): void;
}

export class CodeCoverageBaseExtension extends Controls.BaseControl {

    public initialize(): void {
        super.initialize();
        this._viewModel = new ViewModel.ResultsViewModel();
        this._initializeDataProviders();
        this._createView(this);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "code-coverage-extension-view"
        }, options));
    }

    protected _createView(extension: any): void {

        Diag.logInfo("[CodeCoverageBaseExtension: _createView]: entered _createView");

        if (extension instanceof CodeCoverageExtension) {
            Controls.Control.create<CodeCoverageViews.CodeCoverageView, CodeCoverageViews.ICodeCoverageViewOptions>(CodeCoverageViews.CodeCoverageView,
                this._element, { viewModel: new CodeCoverageViews.CodeCoverageViewModel(this._viewModel) });
        }

        else if (extension instanceof CodeCoverageSummaryExtension) {
            Controls.Control.create<CodeCoverageViews.CodeCoverageSummaryView, CodeCoverageViews.CodeCoverageSummaryViewModel>(CodeCoverageViews.CodeCoverageSummaryView,
                this._element, new CodeCoverageViews.CodeCoverageSummaryViewModel(this._viewModel));
        }

        // Register callback from Build
        this._viewContextHandler = new BuildContextHandler(this._viewModel);

        if ($.isFunction(this._options.onBuildChanged)) {
            this._options.onBuildChanged(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.sourceCallback));
        }
        else {
            Diag.logError("[CodeCoverageBaseExtension: _createView]: onBuildChanged is not a function.");
        }

        if ($.isFunction(this._options.onViewDisplayed)) {
            this._options.onViewDisplayed(Utils_Core.delegate(this._viewContextHandler, this._viewContextHandler.onDisplayedCallBack));
        }
        else {
            Diag.logError("[CodeCoverageBaseExtension: _createView]: onViewDisplayed is not a function.");
        }

    }


    private _initializeDataProviders(): void {
        if (!DataProvider.DataProvider.IsInitialized(TCMCommonBase.ViewContext.Build)) {
            this._dataProvider = new BuildDataProvider();
            DataProvider.DataProvider.initializeDataProvider(TCMCommonBase.ViewContext.Build, this._dataProvider);
        }
    }

    protected _viewModel: ViewModel.ResultsViewModel;
    protected _viewContextHandler: IViewContextHandler;
    protected _dataProvider: DataProviderCommon.IDataProvider;
}
/// <summary>
/// Entry class for the Code Coverage extension
/// </summary>
export class CodeCoverageExtension extends CodeCoverageBaseExtension { }

/// <summary>
/// Entry class for the Code Coverage Summary extension
/// </summary>
export class CodeCoverageSummaryExtension extends CodeCoverageBaseExtension { }

export class BuildContextHandler implements IViewContextHandler {

    constructor(viewModel: ViewModel.ResultsViewModel) {
        this._resultsViewModel = viewModel;
    }

    public sourceCallback(build: BuildContracts.Build) {

        Diag.logInfo("[CodeCoverage : BuildContextHandler.sourceCallback]: Received a sourceCallback from build");

        let viewContextData: TCMCommon.IViewContextData = {
            viewContext: TCMCommonBase.ViewContext.Build,
            data: {
                mainData: build
            }
        };

        this._resultsViewModel.load(viewContextData);
    }

    public onDisplayedCallBack(): void {

        Diag.logInfo("[CodeCoverage : BuildContextHandler.onDisplayedCallBack]: Received a onDisplayedCallBack from build");
        Diag.logInfo("[CodeCoverage : BuildContextHandler.onDisplayedCallBack]: Publishing telemetry point");
        Performance.getScenarioManager().startScenario(TMUtils.CCPerfScenarios.Area, TMUtils.CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails);        
        TelemetryService.publishEvent(TelemetryService.featureCodeCoverageTabInBuildSummary_CodeCoverageTabClicked, TelemetryService.eventClicked, 1);
        this._resultsViewModel.handleOnDisplayed();
    }

    private _resultsViewModel: ViewModel.ResultsViewModel;
}

// Extension host requires the class to be registered.
SDK.registerContent("codeCoverage.extension", (context) => {
    return Controls.create(CodeCoverageExtension, context.$container, context.options);
});

// Extension host requires the class to be registered.
SDK.registerContent("codeCoverageSummary.extension", (context) => {
    return Controls.create(CodeCoverageSummaryExtension, context.$container, context.options);
});

export class LegacyCodeCoverageExtension extends LegacyComponent<CodeCoverageExtension, any, {}> {

    public createControl(element: HTMLElement): CodeCoverageExtension {
        return Controls.BaseControl.createIn(
            CodeCoverageExtension,
            element,
            this.props.options) as CodeCoverageExtension;
    }
}

const legacyCodeCoverageExtensionName: string = "legacy-codecoverage-extension";

registerLWPComponent(legacyCodeCoverageExtensionName, LegacyCodeCoverageExtension);