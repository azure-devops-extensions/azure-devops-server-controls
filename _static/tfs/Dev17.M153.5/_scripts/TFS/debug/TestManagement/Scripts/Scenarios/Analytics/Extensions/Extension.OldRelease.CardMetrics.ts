import * as React from "react";
import * as ReactDOM from "react-dom";
import { ReleaseDefinition, Release } from "ReleaseManagement/Core/Contracts";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestResultAnalyticsExtension } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestResultsReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActionsCreator";
import { TestAnalyticsConstants, NavigationConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { HeroMetrics, IHeroMetricsProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/HeroMetrics";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import { HubsService } from "VSS/Navigation/HubsService";
import * as SDK from "VSS/SDK/Shim";
import { getLocalService } from "VSS/Service";

export interface ITestResultsAnalyticsReleaseCardMetricsExtension {
    onDefinitionChanged: (handler: (definition: ReleaseDefinition | undefined) => void) => void;
}

export class TestResultsAnalyticsReleaseCardMetricsExtension extends TestResultAnalyticsExtension<ITestResultsAnalyticsReleaseCardMetricsExtension> {

    public initializeOptions(options: ITestResultsAnalyticsReleaseCardMetricsExtension) {
        super.initializeOptions($.extend({
            cssClass: "testresults-analytics-release-cardmetrics-extension"
        }, options));

        this.contextType = TCMContracts.TestResultsContextType.Release;
    }

    private _setDefinitionId(releaseDefinition: ReleaseDefinition): void {
        this.definitionId = !!releaseDefinition ? releaseDefinition.id : 0;
    }

    private _onDefinitionChanged = (releaseDefinition: ReleaseDefinition) => {
        if (!this.isDisposed()) {
            this._setDefinitionId(releaseDefinition);
            if (this.definitionId) {
                const testReportContext = {
                    contextType: this.contextType,
                    release: { definitionId: this.definitionId } as TCMContracts.ReleaseReference,
                    definitionId: this.definitionId
                } as CommonTypes.ITestReportContext;
                this._createReportView(testReportContext, this.definitionId.toString());
            } else {
                let container: HTMLElement = this._element.get(0);
                ReactDOM.unmountComponentAtNode(container);
                //Unmount any component inside container.
                ReactDOM.render(React.createElement(HeroMetrics, {
                    errorText: Resources.SelectAReleaseDefinitionText,
                    instanceId: this.definitionId.toString()
                } as IHeroMetricsProps), container);
            }
        }
    }

    protected _createView(): void {
        //Trigger onDefChanged delegate to render report.
        this._options.onDefinitionChanged(this._onDefinitionChanged);
    }

    protected _createReportView(testReportContext: CommonTypes.ITestReportContext, instanceId: string): void {

        if (this._element) {
            let container: HTMLElement = this._element.get(0);

            let reportConfDef = new Definitions.ReportConfigurationDefinition();
            let defaultConfValues = reportConfDef.getDefaultConfigurationValues(TCMContracts.TestResultsContextType.Release);

            //Unmount any component inside container.
            if (container.childElementCount > 0) {
                ReactDOM.unmountComponentAtNode(container);
            }

            //Render report component inside container with initially default props/state with store.
            ReactDOM.render(React.createElement(
                HeroMetrics,
                {
                    instanceId: instanceId,
                    footerText: Resources.AnalyticsReleaseHeroMetricsFooterText,
                    onCardClick: this._onCardClick
                } as IHeroMetricsProps),
                container);

            //Avoid making calls to re-render report for a Release definition already once selected. If re-rendering then avoid rendering with default configuration values.
            if (!this._instanceIdToReportRenderedMap[instanceId]) {
                this._instanceIdToReportRenderedMap[instanceId] = true;

                //Invoke actions to start filling in data.
                TestResultsReportActionsCreator.getInstance(instanceId).updatePassRateMetrics(testReportContext, defaultConfValues);
            }
        }
    }

    /**
     * Gets analytics unavailable message for card metrics
     */
    private _renderAnalyticsUnavailableComponent(): void {
        if (this._element) {
            this._options.onDefinitionChanged(
                (releaseDefinition: ReleaseDefinition) => {this._setDefinitionId(releaseDefinition); }
            );

            let container: HTMLElement = this._element.get(0);
            //Unmount any component inside container.
            ReactDOM.unmountComponentAtNode(container);

            ReactDOM.render(React.createElement(HeroMetrics, {
                footerText: null,
                errorText: Resources.AnalyticsExtensionUnavailableCardMetricsSuggestion,
                instanceId: this.definitionId ? this.definitionId.toString() : 0,
                onCardClick: this._onCardClick
            } as IHeroMetricsProps), container);
        }
    }

    private _onCardClick = () => {
        const definitionId: number = this.definitionId;
        if (definitionId) {
            TelemetryService.publishEvents(TelemetryService.featureTestAX_ReportClick, {
                [TestAnalyticsConstants.Report]: TestAnalyticsConstants.TestFailures,
                [TestAnalyticsConstants.WorkFlow]: TestAnalyticsConstants.Release,
                [TestAnalyticsConstants.ReleaseDefinitionId]: definitionId
            });

            const url = UrlHelper.getReleaseAnalyticsUrl(definitionId);
            const hubsService = getLocalService(HubsService);
            hubsService.navigateToHub(NavigationConstants.ReleaseAnalyticsHub, url);
        }
    }

    protected _getExtensionDisabledComponent(): void {
        this._renderAnalyticsUnavailableComponent();
    }

    protected _getExtensionNotInstalledComponent(): void {
        this._renderAnalyticsUnavailableComponent();
    }
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("old-release-definition-test-analytics-view-cardmetrics", (context) => {
    return Controls.Control.create<TestResultsAnalyticsReleaseCardMetricsExtension, ITestResultsAnalyticsReleaseCardMetricsExtension>(
        TestResultsAnalyticsReleaseCardMetricsExtension,
        context.$container,
        context.options
    );
});
