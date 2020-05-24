/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension.Release";

import { ISpinnerProps, SpinnerSize } from "OfficeFabric/Spinner";
import { ITestResultAnalyticsExtensionOptions, TestResultAnalyticsExtension } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { ITestReportContext } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import Navigation_Services = require("VSS/Navigation/Services");
import * as SDK from "VSS/SDK/Shim";


export class TestResultsAnalyticsReleaseExtension extends TestResultAnalyticsExtension<ITestResultAnalyticsExtensionOptions> {
    public initialize(){
        this.definitionId = this._getReleaseDefinitionId();
        this.contextType = TCMContracts.TestResultsContextType.Release;
        super.initialize();
    }
    
    public initializeOptions(options: ITestResultAnalyticsExtensionOptions) {
        super.initializeOptions($.extend({
            cssClass: "testresults-analytics-release-extension"
        }, options));
    }

    protected _createView(): void {
        // Add Telemetry
        TelemetryService.publishEvents(TelemetryService.featureTestAX_ReportClick, {
            [TestAnalyticsConstants.Report]: TestAnalyticsConstants.TestFailures,
            [TestAnalyticsConstants.WorkFlow]: TestAnalyticsConstants.Release,
            [TestAnalyticsConstants.ReleaseDefinitionId]: this.definitionId
        });

        const testReportContext = {
            contextType: TCMContracts.TestResultsContextType.Release,
            release: { definitionId: this.definitionId } as TCMContracts.ReleaseReference,
            definitionId: this.definitionId
        } as ITestReportContext;

        this._createReportView(testReportContext, this.definitionId.toString());
    }

    private _getReleaseDefinitionId(): number {
        return Navigation_Services.getHistoryService().getCurrentState().definitionId;
    }

    protected _getAnalyticsComponentsLoadingSpinnerProps(): ISpinnerProps {
        return {
            className: "analytics-loading-spinner",
            size: SpinnerSize.large
        } as ISpinnerProps;
    }
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("release-definition-test-analytics-view", (context) => {
    return Controls.Control.create<TestResultsAnalyticsReleaseExtension, {}>(TestResultsAnalyticsReleaseExtension, context.$container, {
    });
});

