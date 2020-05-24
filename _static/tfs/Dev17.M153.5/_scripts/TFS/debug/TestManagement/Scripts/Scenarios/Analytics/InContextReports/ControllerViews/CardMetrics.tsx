/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/CardMetrics";

import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { CardMetricsStore, ICardMetricsState } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/CardMetricsStore";
import { TestReportColorPalette } from "TestManagement/Scripts/Scenarios/Common/Common";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import { WidgetDataForPinning } from "Dashboards/Scripts/Pinning.WidgetDataForPinning";
import { VisualHost } from "Dashboards/Components/Reports/VisualHost";
import { VisualHostMenuProps } from "Dashboards/Components/Reports/VisualHostMenu";
import { ExtendedPieChart, IExtendedPieChartProps, IExtendedPieChartDatum } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/ExtendedPieChart";
import { MetricsLabel } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/MetricsLabel";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import { TestVisualWidgetSettings, TestVisualWidgetSettingsSerializer } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettings";
import { TestVisualWidgetConstants } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetConstants";
import { TestResultsContextType } from "TFS/TestManagement/Contracts";

export interface ICardMetricsProps extends CommonTypes.IReportComponentProps {
    hidePassRateSection?: boolean;
    hideTopFailingTestsSection?: boolean;
    chartDiameter?: number;
    passRateCardTitle?: string;
    enableVisualHostMenu?: boolean;
}

export class CardMetrics extends ComponentBase.Component<ICardMetricsProps, ICardMetricsState> {

    public componentWillMount(): void {
        this._store = CardMetricsStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        const piechartProps = this._getPieChartProps();
        return (
            <div className={css("testresults-analytics-report-view-cardmetrics-area", this.props.cssClass || Utils_String.empty)}>
                <div className="testresults-analytics-report-view-cardmetrics-reports">
                    <div className="passrate-section">
                        {
                            this.props.hidePassRateSection !== true &&
                            <VisualHost disableMenu={!this.props.enableVisualHostMenu} menuProps={this.getMenuProps(piechartProps)} >
                                <ExtendedPieChart errorText={this.state.errorText} {...piechartProps} />
                            </VisualHost>
                        }
                    </div>
                    {
                        this.props.hideTopFailingTestsSection !== true &&
                        <VisualHost disableMenu={!this.props.enableVisualHostMenu}>
                            <div className="topfailingtests-section" tabIndex={0} aria-labelledby="failing-tests-label failing-tests-count" role="presentation">
                                <MetricsLabel text={Resources.FailingTestsText} id="failing-tests-label" />
                                
                                { 
                                    (!this.state.topFailingTestsMetricData  || !this.state.testOutcomeMetricsData) && 
                                    <Spinner className="testresults-analytics-report-view-loadingspinner" size={SpinnerSize.large} />
                                }

                                { this.state.topFailingTestsMetricData && this.state.testOutcomeMetricsData && this._renderUniqueFailingTestsSection() }
                            </div>
                        </VisualHost>
                    }
                </div>
            </div>
        );
    }

    protected _getPieChartProps(): IExtendedPieChartProps {
        const props: IExtendedPieChartProps = {
            title: this.props.passRateCardTitle || Resources.TestsInThePipelineText,
            // Passing chartDiameter as null because a default value of 120px is set in ExtendedPieChart component
            chartDiameter: this.props.chartDiameter
        };

        if (this.state.testOutcomeMetricsData) {
            props.chartData = this._getDonutChartData();
            props.scalarContent = this.state.testOutcomeMetricsData.passPercentage;
        }

        return props;
    }

    private _renderUniqueFailingTestsSection(): JSX.Element {
        const { totalFailingTestsCount } = this.state.topFailingTestsMetricData;
        const { failedCount } = this.state.testOutcomeMetricsData;
        let messagePostFix = Utils_String.empty;
        if (totalFailingTestsCount === 0) {
            messagePostFix = Resources.TestsAsPrefixText;
        }
        else {
            messagePostFix = Utils_String.localeFormat(
                Resources.TestsCausingFailedResultsFormat,
                totalFailingTestsCount === 1 ? Resources.TestAsPrefixSingularText : Resources.TestsAsPrefixText,
                failedCount,
                failedCount === 1 ? Resources.ResultSingularText : Resources.ResultsPluralText);
        }

        return (
            <div className="topfailingtests-section-data" id="failing-tests-count">
                <span className={css("topfailingtests-data-count", totalFailingTestsCount > 0 ? "failures-exist" : "")}>{ totalFailingTestsCount != null ? totalFailingTestsCount.toLocaleString() : Utils_String.empty }</span>
                <span className="topfailingtests-data-text">{messagePostFix}</span>
            </div>
        );
    }

    private getMenuProps(pieChartProps: IExtendedPieChartProps): VisualHostMenuProps {
        const props = {} as VisualHostMenuProps;
        if (FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ReportingBuildTestVisualExamples, false)) {
            props.getWidgetOptions = () => { return this._getVisualOptions(pieChartProps); };
        }
        return props;
    }

    protected _getVisualOptions(piechartProps: IExtendedPieChartProps): WidgetDataForPinning {
        const widgetSettings = {
            contextType: TestResultsContextType.Build,
            definitionId: parseInt(this.props.instanceId)
        } as TestVisualWidgetSettings;

        const widgetOptions: WidgetDataForPinning = {
            contributionId: TestVisualWidgetConstants.contributionName,
            name: piechartProps.title,
            settings: TestVisualWidgetSettingsSerializer.serialize(widgetSettings),
            settingsVersion: { major: 1, minor: 0, patch: 1 },
            size: { columnSpan: 3, rowSpan: 1 }
        };
        return widgetOptions;
    }

    protected _getDonutChartData(): IExtendedPieChartDatum[] {
        return [
            {
                name: Resources.PassedTestsText,
                legendLabel: Resources.TestOutcome_Passed,
                color: TestReportColorPalette.Passed,
                y: this.state.testOutcomeMetricsData.passedCount
            },
            {
                name: Resources.FailedTestsText,
                legendLabel: Resources.TestOutcome_Failed,
                color: TestReportColorPalette.Failed,
                y: this.state.testOutcomeMetricsData.failedCount
            },
            {
                name: Resources.TestOutcome_NotImpacted,
                legendLabel: Resources.TestOutcome_NotImpacted,
                color: TestReportColorPalette.NotImpacted,
                y: this.state.testOutcomeMetricsData.notImpactedCount
            },
            {
                name: Resources.TestOutcome_NotExecuted,
                legendLabel: Resources.TestOutcome_NotExecuted,
                color: TestReportColorPalette.OtherOutcome,
                y: this.state.testOutcomeMetricsData.notExecutedCount
            }
        ];
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _store: CardMetricsStore;
}

