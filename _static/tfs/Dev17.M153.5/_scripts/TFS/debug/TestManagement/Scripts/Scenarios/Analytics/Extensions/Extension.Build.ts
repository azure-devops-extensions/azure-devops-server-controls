import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension.Build";

import { TitleBarControllerView } from "Build/Scenarios/Definition/Components/TitleBarControllerView";
import * as ViewState from "Build/Scenarios/Definition/ViewState";
import { IDefinitionSearchPickerOption } from "Build/Scripts/Components/DefinitionSearchPicker";
import { WellKnownClassNames } from "Build/Scripts/Constants";
import { definitionChanged } from "Build/Scripts/HistoryHelper";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { ISpinnerProps, SpinnerSize } from "OfficeFabric/Spinner";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { ITestResultAnalyticsExtensionOptions, TestResultAnalyticsExtension } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { ITestReportContext } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_Core from "VSS/Utils/Core";


export class TestResultsAnalyticsBuildExtension extends TestResultAnalyticsExtension<ITestResultAnalyticsExtensionOptions> {
    public initialize(): void {
        this.definitionId = this._getBuildDefinitionIdFromBuildStore();
        this.contextType = TCMContracts.TestResultsContextType.Build;
        super.initialize();

        this._createTitlebar();
    }

    public initializeOptions(options: ITestResultAnalyticsExtensionOptions) {
        super.initializeOptions($.extend({
            cssClass: "testresults-analytics-build-extension"
        }, options));
    }    

    protected _createView(): void {
        this.definitionId = this._getBuildDefinitionIdFromBuildStore();

        // Telemetry
        TelemetryService.publishEvents(TelemetryService.featureTestAX_ReportClick, {
            [TestAnalyticsConstants.Report]: TestAnalyticsConstants.TestFailures,
            [TestAnalyticsConstants.WorkFlow]: TestAnalyticsConstants.Build,
            [TestAnalyticsConstants.BuildDefinitionId]: this.definitionId
        });

        const testReportContext = {
            contextType: TCMContracts.TestResultsContextType.Build,
            build: { definitionId: this.definitionId } as TCMContracts.BuildReference,
            definitionId: this.definitionId
        } as ITestReportContext;

        this._createReportView(testReportContext, this.definitionId.toString());
    }

    private _createTitlebar(): void {
        //Since extention point provider doesn't render build definition title bar so hardcoding to render that option.
        this._createBuildDefinitionTitlebar();
    }

    private _createBuildDefinitionTitlebar(): void {
        let titleElement = $(WellKnownClassNames.HubTitleContentSelector);
        ReactDOM.render(React.createElement(TitleBarControllerView, {
            title: BuildResources.BuildDefinitionsTitle,
            readonly: true,
            telemetrySource: null,
            definitionPickerOptionChanged: Utils_Core.delegate(this, this._onBuildDefinitionChanged)
        }), titleElement[0]);
    }

    private _getBuildDefinitionIdFromBuildStore(): number {
        return ViewState.getInstance().getDefinitionId();
    }

    private _onBuildDefinitionChanged(option: IDefinitionSearchPickerOption, index: number): void {
        //Call this method to update state in build code and change actions/URL
        definitionChanged(option.data);

        this._createView();
    }

    protected _getAnalyticsComponentsLoadingSpinnerProps(): ISpinnerProps {
        return {
            className: "analytics-loading-spinner",
            size: SpinnerSize.large
        } as ISpinnerProps;
    }
}

SDK_Shim.registerContent("test.analytics.build.definition.report.initialize", (context: SDK_Shim.InternalContentContextData) => {
    return Controls.create<TestResultsAnalyticsBuildExtension, ITestResultAnalyticsExtensionOptions>(TestResultsAnalyticsBuildExtension, context.$container, context.options);
});