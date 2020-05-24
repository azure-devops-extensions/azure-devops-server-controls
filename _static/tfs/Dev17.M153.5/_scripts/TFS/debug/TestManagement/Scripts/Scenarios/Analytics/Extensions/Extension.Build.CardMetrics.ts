import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension.Build.CardMetrics";

import { ISpinnerProps, SpinnerSize } from "OfficeFabric/Spinner";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestResultAnalyticsExtension } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestResultsReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActionsCreator";
import { NavigationConstants, TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { HeroMetrics, IHeroMetricsProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/HeroMetrics";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { BuildDefinition } from "TFS/Build/Contracts";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import { HubsService } from "VSS/Navigation/HubsService";
import * as SDK from "VSS/SDK/Shim";
import { getLocalService } from "VSS/Service";

export interface ITestResultsAnalyticsBuildCardMetricsExtension {
    onDefinitionChanged: (handler: (definition: BuildDefinition | undefined) => void) => void;
}

export class TestResultsAnalyticsBuildCardMetricsExtension extends TestResultAnalyticsExtension<ITestResultsAnalyticsBuildCardMetricsExtension> {
    
    public initializeOptions(options: ITestResultsAnalyticsBuildCardMetricsExtension) {
        super.initializeOptions($.extend({
            cssClass: "testresults-analytics-build-cardmetrics-extension"
        }, options));

        this.contextType = TCMContracts.TestResultsContextType.Build;
    }

    private _setDefinitionId(buildDefinition: BuildDefinition): void {
        this.definitionId = !!buildDefinition ? buildDefinition.id : 0;
    }

    private _onDefinitionChanged = (buildDefinition: BuildDefinition) => {
        if (!this.isDisposed()) {
            this._setDefinitionId(buildDefinition);
            if (this.definitionId) {
                const testReportContext = {
                    contextType: this.contextType,
                    build: { definitionId: this.definitionId } as TCMContracts.BuildReference,
                    definitionId: this.definitionId
                } as CommonTypes.ITestReportContext;

                this._createReportView(testReportContext, this.definitionId.toString());
            } else {
                let container: HTMLElement = this._element.get(0);
                //Unmount any component inside container.
                ReactDOM.unmountComponentAtNode(container);
            }
        }
    }

    protected _createView(): void {
        this._options.onDefinitionChanged(this._onDefinitionChanged);
    }

    protected _createReportView(testReportContext: CommonTypes.ITestReportContext, instanceId: string): void {
        if (this._element) {
            let container: HTMLElement = this._element.get(0);

            let reportConfDef = new Definitions.ReportConfigurationDefinition();
            let defaultConfValues = reportConfDef.getDefaultConfigurationValues(TCMContracts.TestResultsContextType.Build);

            //Unmount any component inside container.
            if (container.childElementCount > 0) {
                ReactDOM.unmountComponentAtNode(container);
            }

            //Render report component inside container with initially default props/state with store.
            ReactDOM.render(React.createElement(
                HeroMetrics,
                {
                    instanceId: instanceId,
                    footerText: Resources.AnalyticsBuildHeroMetricsFooterText,
                    onCardClick: this._onCardClick
                } as IHeroMetricsProps),
                container);

            //Avoid making calls to re-render report for a build definition already once selected. If re-rendering then avoid rendering with default configuration values.
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
                (buildDefinition: BuildDefinition) => {this._setDefinitionId(buildDefinition); }
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
                [TestAnalyticsConstants.WorkFlow]: TestAnalyticsConstants.Build,
                [TestAnalyticsConstants.BuildDefinitionId]: definitionId
            });

            const url = UrlHelper.getBuildAnalyticsUrl(definitionId);
            const hubsService = getLocalService(HubsService);
            hubsService.navigateToHub(NavigationConstants.BuildAnalyticsHub, url);
        }
    }

    protected _getAnalyticsComponentsLoadingSpinnerProps() {
        return {
            className: "analytics-loading-spinner",
            size: SpinnerSize.large
        } as ISpinnerProps;
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
SDK.registerContent("build-definition-test-analytics-view-cardmetrics", (context) => {
    FluxFactory.instance().dispose();
    return Controls.Control.create<TestResultsAnalyticsBuildCardMetricsExtension, ITestResultsAnalyticsBuildCardMetricsExtension>(
        TestResultsAnalyticsBuildCardMetricsExtension,
        context.$container,
        context.options
    );
});
