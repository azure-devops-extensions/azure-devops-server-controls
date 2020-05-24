/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/HeroMetrics";

import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { ExtendedPieChart, IExtendedPieChartDatum, IExtendedPieChartProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/ExtendedPieChart";
import { AnnouncementStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/AnnouncementStore";
import { CardMetricsStore, ICardMetricsState } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/CardMetricsStore";
import { TestReportColorPalette } from "TestManagement/Scripts/Scenarios/Common/Common";
import * as ComponentBase from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

export interface IHeroMetricsProps extends CommonTypes.IReportComponentProps {
    footerText: string;
    errorText?: string;
    onCardClick: Function;
}

export class HeroMetrics extends ComponentBase.Component<IHeroMetricsProps, ICardMetricsState> {

    public componentWillMount(): void {
        this._store = CardMetricsStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this._announcementStore = AnnouncementStore.getInstance(this.props.instanceId);
        this._announcementStore.addChangedListener(this._onAnnouncementUpdate);

        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        const piechartProps = this._getPieChartProps();
        let errorText: string = this.props.errorText || this.state.errorText;
        let ariaLabel: string = errorText ? errorText : this._getCardAriaLabel();

        return (
            <div className={css("testresults-analytics-report-view-herometrics-area", this.props.cssClass || Utils_String.empty)}>
                <div className={css("testresults-analytics-report-view-herometrics-reports", "focusable")}>
                    {
                        this.props.onCardClick ?
                            <div className="card-container" aria-label={ariaLabel} onClick={this._onCardClick} onKeyDown={this._onCardKeyDown} tabIndex={0} role="link">
                                <ExtendedPieChart cssClass="testresults-analytics-report-extended-pie-chart-focusable" errorText={errorText} {...piechartProps} />
                            </div> :
                            <div className="card-container" aria-label={ariaLabel} tabIndex={0}>
                                <ExtendedPieChart cssClass="testresults-analytics-report-extended-pie-chart-not-focusable" errorText={errorText} {...piechartProps} />
                            </div>
                    }
                </div>
            </div>
        );
    }

    @autobind
    private _onCardClick(event?: React.MouseEvent<HTMLDivElement>): void {
        if (this.props.onCardClick) {
            this.props.onCardClick();
        }
    }

    @autobind
    private _onCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        if (event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.SPACE) {
            this._onCardClick();
        }
    }

    private _getCardAriaLabel(): string {
        return this.state.testOutcomeMetricsData && this.state.testOutcomeMetricsData.passPercentage != null ?
            Utils_String.localeFormat(Resources.HeroMetricsAriaLabel, Resources.AnalyticsHeroMetricsHeaderText, this.state.testOutcomeMetricsData.passPercentage, this.props.footerText) : 
            Resources.AnalyticsHeroMetricsHeaderText;
    }

    private _getPieChartProps(): IExtendedPieChartProps {
        const props: IExtendedPieChartProps = {
            title: Resources.AnalyticsHeroMetricsHeaderText,
            footerText: this.props.footerText,
            scalarLabel: Resources.PassRate,
            chartDiameter: HeroMetrics._chartDiameter
        };

        if (this.state.testOutcomeMetricsData) {
            props.chartData = this._getDonutChartData();
            props.scalarContent = this.state.testOutcomeMetricsData.passPercentage;
        }

        return props;
    }

    private _getDonutChartData(): IExtendedPieChartDatum[] {
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

    private _onAnnouncementUpdate = () => {
        announce(this._announcementStore.getState().announcementText);
    }

    private _store: CardMetricsStore;
    private _announcementStore: AnnouncementStore;
    private static readonly _chartDiameter = 120;
}