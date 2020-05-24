import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension.Release.CardMetrics";

import { ISpinnerProps, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ITestResultAnalyticsExtensionOptions, TestResultAnalyticsExtension } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestResultsReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActionsCreator";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { HeroMetrics, IHeroMetricsProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/HeroMetrics";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as SDK from "VSS/SDK/Shim";
import { delay } from "VSS/Utils/Core";

export interface ITestResultsAnalyticsReleaseCardMetricsExtensionOptions extends ITestResultAnalyticsExtensionOptions {
    setOnDefinitionChangedHandler: (handler: (definitionId: number | undefined) => void) => void;
}

export class TestResultsAnalyticsReleaseCardMetricsExtension extends TestResultAnalyticsExtension<ITestResultsAnalyticsReleaseCardMetricsExtensionOptions>  {

    public initializeOptions(options: ITestResultsAnalyticsReleaseCardMetricsExtensionOptions) {
        super.initializeOptions($.extend({
            cssClass: "testresults-analytics-release-cardmetrics-extension"
        }, options));

        if (this._options.setOnDefinitionChangedHandler) {
            this._options.setOnDefinitionChangedHandler(this._handleDefinitionChanged);
        }

        this.definitionId = this._getReleaseDefinitionId();
        this.contextType = TCMContracts.TestResultsContextType.Release;
    }

    protected _createView(): void {
        const testReportContext = {
            contextType: this.contextType,
            release: { definitionId: this.definitionId } as TCMContracts.ReleaseReference,
            definitionId: this.definitionId
        } as CommonTypes.ITestReportContext;
        
        this._createReportView(testReportContext, this.definitionId.toString());
    }    

    protected _createReportView(testReportContext: CommonTypes.ITestReportContext, instanceId: string): void {
        
        let container: HTMLElement = this.getElement().get(0);
        let reportConfDef = new Definitions.ReportConfigurationDefinition();
        let defaultConfValues = reportConfDef.getDefaultConfigurationValues(this.contextType);

        //Unmount any component inside container.
        if (container.childElementCount > 0) {
            ReactDOM.unmountComponentAtNode(container);
        }

        ReactDOM.render(
            <HeroMetrics
                instanceId={instanceId}
                footerText={Resources.AnalyticsReleaseHeroMetricsFooterText}
                onCardClick={this._onCardClick} />, container);
            
        //Avoid making calls to re-render report for a release definition already once selected. If re-rendering then avoid rendering with default configuration values.
        if (!this._instanceIdToReportRenderedMap[instanceId]) {
            this._instanceIdToReportRenderedMap[instanceId] = true;
            
            //Invoke actions to start filling in data.
            TestResultsReportActionsCreator.getInstance(instanceId).updatePassRateMetrics(testReportContext, defaultConfValues);
        }
    }

    protected _getAnalyticsComponentsLoadingSpinnerProps(): ISpinnerProps {
        return {
            className: "analytics-loading-spinner",
            size: SpinnerSize.small
        } as ISpinnerProps;
    }

    /**
     * Gets analytics unavailable message for card metrics
     */
    protected _renderAnalyticsUnavailableComponent(): void {
        if (this._element) {
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

    protected _getExtensionDisabledComponent(): void {
        this._renderAnalyticsUnavailableComponent();
    }

    protected _getExtensionNotInstalledComponent(): void {
        this._renderAnalyticsUnavailableComponent();
    }

    @autobind
    private _onCardClick() {
        const definitionId = this._getReleaseDefinitionId();
        if (definitionId) {
            TelemetryService.publishEvents(TelemetryService.featureTestAX_ReportClick, {
                [TestAnalyticsConstants.Report]: TestAnalyticsConstants.TestFailures,
                [TestAnalyticsConstants.WorkFlow]: TestAnalyticsConstants.Release,
                [TestAnalyticsConstants.ReleaseDefinitionId]: definitionId
            });
        }
    }

    @autobind
    private _handleDefinitionChanged(id: number | undefined): void {
        if (!this.isDisposed()) {
            // This is needed because if componentUnmountAtNode is called
            // in the same execution context as a react life cycle call, then
            // the unmount does not happen. 
            delay(this, 10, () => {
                this.definitionId = id;
                this._createMainView();
            });
        }
    }

    private _getReleaseDefinitionId(): number {
        return this.definitionId || parseInt(Navigation_Services.getHistoryService().getCurrentState().definitionId);
    }
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("release-definition-test-analytics-view-cardmetrics", (context) => {
    FluxFactory.instance().dispose();
    return Controls.Control.create<TestResultsAnalyticsReleaseCardMetricsExtension, ITestResultsAnalyticsReleaseCardMetricsExtensionOptions>(TestResultsAnalyticsReleaseCardMetricsExtension, context.$container, {
        setOnDefinitionChangedHandler: context.options.onDefinitionChanged
    });
});
