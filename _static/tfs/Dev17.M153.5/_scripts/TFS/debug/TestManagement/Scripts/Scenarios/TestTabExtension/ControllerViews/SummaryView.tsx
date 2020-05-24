/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/SummaryView";

import { Accordion, IAccordionProps } from "DistributedTaskControls/SharedControls/Accordion/Accordion";
import { Icon } from "OfficeFabric/Icon";
import { IRenderFunction } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { DonutChartLegendComponent, IDonutChartLegendProps } from "TestManagement/Scripts/Scenarios/Common/Components/DonutChartLegend";
import { IPieChartData, IPieChartProps, PieChartComponent } from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/PieChart";
import { PieChartLegendComponent } from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/PieChartLegend";
import { ResultSummaryColoredNumberChartComponent } from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/ResultSummaryColoredNumberChart";
import { DataType, ResultSummaryNumberChartComponent, ValueType } from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/ResultSummaryDetailsChart";
import { ISummaryViewState, SummaryViewStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/SummaryViewStore";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import LWP = require("VSS/LWP");
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";

export interface ISummaryViewProps extends ComponentBase.Props {
    store: SummaryViewStore;
    onRenderHeader?: IRenderFunction<IAccordionProps>;
    onHeaderClicked?: (boolean) => void;
    collapseOnInitialize?: boolean;
    onClickHandlerForSummary?: (e) => void;
}

export interface IChartViewProps extends ComponentBase.Props {
    chartState: ISummaryViewState;
    onClickHandlerForSummary?: (e) => void;
}

export class ChartViewComponent extends ComponentBase.Component<IChartViewProps, {}> {

    public render(): JSX.Element{

        this._currentState = this.props.chartState;

        return this._currentState ? 
          (this.props.chartState.isInProgressView ?
            this._getInProgressSummaryViewBody() :
            this._getCompletedSummaryViewBody()
          )
          : null;
    }

    private _getInProgressSummaryViewBody(): JSX.Element {
        return (
            <div className="summary-view-container-parent" onClick={this.props.onClickHandlerForSummary}>
                <div className="summary-view-container-left">
                    <div className="summary-view-bar-left">
                        <div className="summary-view-bar-icon-run-count">
                            <div className="summary-view-test-icon">
                                <Icon iconName={"TestBeaker"} />
                            </div>
                            <div className="run-count-details">
                                <span className="run-count-details-count">{this._currentState.aggregatedRunsCount.totalRuns}</span>
                                <span className="run-count-details-name">{Resources.Runs}</span>
                            </div>
                        </div>
                        <div className="separator-in-bar" />
                    </div>
                    <div className="inprogress-summary-view-body margin-left-side">
                        {
                            <ResultSummaryNumberChartComponent
                                title={Resources.TotalTestsText}
                                value={this._currentState.aggregatedTestsCount.totalTests}
                                difference={null}
                                dataType={DataType.String}
                                isVerticalAlignWithDifferencePresent={false}
                            />
                        }
                        {
                            <div className="separator" />
                        }
                    </div>
                </div>
                <div className="summary-view-container-right">
                    <div className="summary-view-bar-right">
                        {
                            <div className="inprogress-run-details">
                                <span className="inprogress-run-details-count">{this._currentState.aggregatedRunsCount.inProgressRuns}</span>
                                <span className="inprogress-run-details-name">{Resources.ResultStateInProgress}</span>
                            </div>
                        }
                        {
                            !!this._currentState.aggregatedRunsCount.completedRuns &&
                            <div className="completed-run-details">
                                <span className="comma">{Resources.CommaSeparator}</span>
                                <span className="completed-run-details-count">{this._currentState.aggregatedRunsCount.completedRuns}</span>
                                <span className="completed-run-details-name">{Resources.TestRunStateCompleted}</span>
                            </div>
                        }
                        {
                            !!this._currentState.aggregatedRunsCount.abortedRuns &&
                            <div className="aborted-run-details">
                                <span className="comma">{Resources.CommaSeparator}</span>
                                <span className="aborted-run-details-count" style={{ color: Common.TestReportColorPalette.Failed }}>
                                    {this._currentState.aggregatedRunsCount.abortedRuns}
                                </span>
                                <span className="aborted-run-details-name">{Resources.TestRunStateAborted}</span>
                            </div>
                        }
                    </div>
                    <div className="inprogress-summary-view-body">
                        {
                            <ResultSummaryColoredNumberChartComponent
                                title={Resources.TestOutcome_Passed}
                                value={this._currentState.aggregatedTestsCount.passedTests}
                                color={Common.TestReportColorPalette.Passed}
                            />
                        }
                        {
                            <ResultSummaryColoredNumberChartComponent
                                title={Resources.TestOutcome_Failed}
                                value={this._currentState.aggregatedTestsCount.failedTests}
                                color={Common.TestReportColorPalette.Failed}
                            />
                        }
                        {
                            !!this._currentState.aggregatedTestsCount.abortedTests &&
                            <ResultSummaryColoredNumberChartComponent
                                title={Resources.TestOutcome_Aborted}
                                value={this._currentState.aggregatedTestsCount.abortedTests}
                                color={Common.TestReportColorPalette.Aborted}
                            />
                        }
                        {
                            <div className="donut-chart-legend-container">
                                {this._getDonutChartLegends()}
                            </div>
                        }
                    </div>
                </div>
            </div>
        );
    }

    private _getDonutChartLegends(): JSX.Element {

        let donutChartLegendProps: IDonutChartLegendProps = {
            legend: []
        } as IDonutChartLegendProps;

        donutChartLegendProps.legend.push({
            count: this._currentState.aggregatedTestsCount.notExecutedTests,
            label: Resources.TestOutcome_NotExecuted,
            color: Common.TestReportColorPalette.NotExecuted
        });

        if (!!this._currentState.aggregatedTestsCount.notImpactedTests) {
            donutChartLegendProps.legend.push({
                count: this._currentState.aggregatedTestsCount.notImpactedTests,
                label: Resources.ResultStateNotImpacted,
                color: Common.TestReportColorPalette.NotImpacted
            });
        }

        donutChartLegendProps.legend.push({
            count: this._currentState.aggregatedTestsCount.otherTests,
            label: Resources.OthersText,
            color: Common.TestReportColorPalette.OtherOutcome
        });

        return <DonutChartLegendComponent {...donutChartLegendProps} />;
    }

    private _getCompletedSummaryViewBody(): JSX.Element {
        const isReportCustomizationFeatureEnabled: boolean = LicenseAndFeatureFlagUtils.isReportCustomizationFeatureEnabled();
        const isAnyDifferenceValuePresentInNumberCharts: boolean = this._isAnyDifferenceValuePresentInNumberCharts();

        return (
	         <div className="summary-view-parent" onClick={this.props.onClickHandlerForSummary}>
                {
                    this._currentState &&
                    this._currentState.aggregatedRunsCount &&
                    this._currentState.aggregatedRunsCount.completedRuns > 0 &&
                    <div className="summary-view-container">
                        {
                            this._currentState.aggregatedRunsCount &&
                            this._currentState.aggregatedRunsCount.completedRuns > 0 &&
                            this._currentState.aggregatedRunsOutcomeCount && 
                            <div className="summary-view-runs-info-bar">
                                <div className="summary-view-completed-runs">
                                    {
                                        Utils_String.localeFormat(Resources.RunsSummaryStatus,
                                        this._currentState.aggregatedRunsCount.completedRuns,
                                        this._currentState.aggregatedRunsOutcomeCount.passed,
                                        this._currentState.aggregatedRunsOutcomeCount.failed,
                                        this._currentState.aggregatedRunsOutcomeCount.notImpacted,
                                        this._currentState.aggregatedRunsOutcomeCount.others)
                                    }
                                </div>
                            </div>
                        }
                        <div className="summary-view-body">
                            {
                                this._currentState &&
                                <ResultSummaryNumberChartComponent
                                    { ...this._currentState.totalTestsNumberChartProps }
                                    isVerticalAlignWithDifferencePresent={isAnyDifferenceValuePresentInNumberCharts}
                                />
                            }
                            {
                                this._currentState &&
                                <div className="separator" />
                            }
                            {
                                this._currentState && this._currentState.totalTestsChartProps &&
                                this._getTotalTestsChart()
                            }
                            {
                                this._currentState && this._currentState.testFailuresChartProps && (this._currentState.testFailuresChartProps.totalFailures > 0) &&
                                this._getFailedTestsChart()
                            }
                            {
                                this._currentState &&
                                <ResultSummaryNumberChartComponent
                                    { ...this._currentState.passPercentageNumberChartProps }
                                    isVerticalAlignWithDifferencePresent={isAnyDifferenceValuePresentInNumberCharts}
                                />
                            }
                            {
                                this._currentState &&
                                <ResultSummaryNumberChartComponent
                                    { ...this._currentState.runDurationNumberChartProps }
                                    isVerticalAlignWithDifferencePresent={isAnyDifferenceValuePresentInNumberCharts}
                                />
                            }
                            {
                                isReportCustomizationFeatureEnabled && this._currentState &&
                                <ResultSummaryNumberChartComponent
                                    { ...this._currentState.notReportedNumberChartProps }
                                    isVerticalAlignWithDifferencePresent={isAnyDifferenceValuePresentInNumberCharts}
                                />
                            }
                        </div>
                    </div>
                }
                {this._currentState &&
                    this._currentState.aggregatedRunsCount &&
                    this._currentState.aggregatedRunsCount.abortedRuns > 0 &&
                    <div className="aborted-summary-container">
                        <div className="aborted-view-bar">
                            {this._currentState &&
                                this._currentState.aggregatedRunsCount &&
                                this._currentState.aggregatedRunsCount.completedRuns > 0 &&
                                <div className="aborted-runs-separator-in-bar" />
                            }
                            {
                                <div className="aborted-runs">
                                    <span className="aborted-runs-value"> {this._currentState.aggregatedRunsCount.abortedRuns.toLocaleString()} </span>
                                    {Resources.RunsAborted}
                                </div>
                            }
                        </div>
                        <div className="aborted-view-body">
                            {
                                this._currentState &&
                                this._currentState.aggregatedRunsCount &&
                                this._currentState.aggregatedRunsCount.completedRuns > 0 &&
                                <div className="aborted-runs-separator" />
                            }
                            {
                                this._currentState && this._currentState.totalAbortedTestsNumberChartProps &&
                                <ResultSummaryNumberChartComponent
                                    { ...this._currentState.totalAbortedTestsNumberChartProps }
                                    isVerticalAlignWithDifferencePresent={isAnyDifferenceValuePresentInNumberCharts}
                                />
                            }
                            {
                                this._currentState &&
                                this._currentState.abortedTestsChartProps &&
                                this._currentState.abortedTestsChartProps.totalTests > 0 &&
                                this._getAbortedTestsChart()
                            }
                        </div>
                    </div>
                }
            </div>
        );
    }

    private _isAnyDifferenceValuePresentInNumberCharts(): boolean {
        // If any of the number charts (run duration, total tests, pass percentage etc.) contains a difference value, we have to align all other independent components accordingly
        // To achieve this, we are first checking if any of the component has difference value present, then we pass this information to all other components in props to align accordingly
        const isDifferenceValuePresentInAnyNumberChart: boolean = 
            (this._currentState.totalTestsNumberChartProps && this._currentState.totalTestsNumberChartProps.difference && this._currentState.totalTestsNumberChartProps.difference.valueType !== ValueType.Unchanged)
            || (this._currentState.passPercentageNumberChartProps && this._currentState.passPercentageNumberChartProps.difference && this._currentState.passPercentageNumberChartProps.difference.valueType !== ValueType.Unchanged)
            || (this._currentState.runDurationNumberChartProps && this._currentState.runDurationNumberChartProps.difference && this._currentState.runDurationNumberChartProps.difference.valueType !== ValueType.Unchanged)
            || (this._currentState.totalAbortedTestsNumberChartProps && this._currentState.totalAbortedTestsNumberChartProps.difference && this._currentState.totalAbortedTestsNumberChartProps.difference.valueType !== ValueType.Unchanged)
            || (this._currentState.notReportedNumberChartProps && this._currentState.notReportedNumberChartProps.difference && this._currentState.notReportedNumberChartProps.difference.valueType !== ValueType.Unchanged);

        return isDifferenceValuePresentInAnyNumberChart;
    }

    private _getTotalTestsChart(): JSX.Element {
        const props: IPieChartProps = this._getTotalTestsChartProps();

        return <div className="summary-view-totaltests-chart">
            <PieChartComponent { ...props } />
            <PieChartLegendComponent { ...props } />
        </div>;
    }

    private _getFailedTestsChart(): JSX.Element {
        const props: IPieChartProps = this._getFailedTestsChartProps();

        return <div className="summary-view-failedtests-chart">
            <PieChartComponent { ...props } />
            <div className="failure-chart-legend-area">
                {this._getFailureChartLabelDiv(props)}
                <PieChartLegendComponent { ...props } />
            </div>
        </div>;
    }

    private _getAbortedTestsChart(): JSX.Element {
        const props: IPieChartProps = this._getAbortedTestsChartProps();

        return <div className="summary-view-abortedtests-chart">
            <PieChartLegendComponent { ...props } />
        </div>;
    }

    private _getFailureChartLabelDiv(props: IPieChartProps): JSX.Element {
        let failuresIncrementString: string;
        let failuresIncrementClassName: string;
        const increaseInFailures: number = this._currentState.testFailuresChartProps.increaseInFailures;

        if (increaseInFailures > 0) {
            failuresIncrementClassName = "failures-increased";
            failuresIncrementString = Utils_String.format("(+{0})", increaseInFailures.toLocaleString());
        } else if (increaseInFailures < 0) {
            failuresIncrementClassName = "failures-decreased";
            failuresIncrementString = Utils_String.format("({0})", increaseInFailures.toLocaleString());
        } else {
            failuresIncrementClassName = "failures-unchanged";
            failuresIncrementString = Utils_String.empty;
        }

        return <div className="failure-chart-label-div">
            <div className="failed-chart-total-count">{ props.totalCount.toLocaleString() }</div>
            <div className="failed-chart-title">{props.title}</div>
            <div className={`${failuresIncrementClassName} failed-chart-test-increment`}>{failuresIncrementString}</div>
        </div>;
    }

    private _getTotalTestsChartProps(): IPieChartProps {
        const totalTestsPieChartProps: IPieChartProps = {} as IPieChartProps;
        totalTestsPieChartProps.title = Resources.TotalTestsHeading;
        totalTestsPieChartProps.totalCount = this._currentState.totalTestsChartProps.aggregatedtotalTests;
        totalTestsPieChartProps.data = [] as IPieChartData[];
        totalTestsPieChartProps.data.push({
            dataValue: Resources.PassedText,
            dataCount: this._currentState.totalTestsChartProps.totalPassed,
            dataColor: Common.TestReportColorPalette.Passed,
            dataSubText: this._currentState.totalTestsChartProps.totalPassedOnRerun > 0 ? Utils_String.format(Resources.PassedOnRerunLegendText, this._currentState.totalTestsChartProps.totalPassedOnRerun) : null
        });
        totalTestsPieChartProps.data.push({
            dataValue: Resources.FailedTests,
            dataCount: this._currentState.totalTestsChartProps.totalFailures,
            dataColor: Common.TestReportColorPalette.Failed
        });
        totalTestsPieChartProps.data.push({
            dataValue: Resources.OthersText,
            dataCount: this._currentState.totalTestsChartProps.otherTests,
            dataColor: Common.TestReportColorPalette.OtherOutcome
        });
        if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy() && this._currentState.totalTestsChartProps.totalNotImpactedTests > 0) {
            totalTestsPieChartProps.data.push({
                dataValue: Resources.NotImpactedLegendText,
                dataCount: this._currentState.totalTestsChartProps.totalNotImpactedTests,
                dataColor: Common.TestReportColorPalette.NotImpacted
            });
        }

        return totalTestsPieChartProps;
    }

    private _getFailedTestsChartProps(): IPieChartProps {
        const failedTestsPieChartProps: IPieChartProps = {} as IPieChartProps;
        failedTestsPieChartProps.title = Resources.FailedTestsHeading;
        failedTestsPieChartProps.totalCount = this._currentState.testFailuresChartProps.totalFailures;
        failedTestsPieChartProps.data = [] as IPieChartData[];
        failedTestsPieChartProps.data.push({
            dataValue: Resources.NewFailuresLegendText,
            dataCount: this._currentState.testFailuresChartProps.newFailures,
            dataColor: Common.TestReportColorPalette.Failed
        });
        failedTestsPieChartProps.data.push({
            dataValue: Resources.ExistingFailuresLegendText,
            dataCount: this._currentState.testFailuresChartProps.existingFailures,
            dataColor: Common.TestReportColorPalette.ExisitingFailures
        });

        return failedTestsPieChartProps;
    }

    private _getAbortedTestsChartProps(): IPieChartProps {
        const abortedTestsPieChartProps: IPieChartProps = {} as IPieChartProps;
        abortedTestsPieChartProps.data = [] as IPieChartData[];
        abortedTestsPieChartProps.data.push({
            dataValue: Resources.PassedText,
            dataCount: this._currentState.abortedTestsChartProps.totalPassed,
            dataColor: Common.TestReportColorPalette.Passed,
            dataSubText: this._currentState.abortedTestsChartProps.totalPassedOnRerun > 0 ? Utils_String.format(Resources.PassedOnRerunLegendText, this._currentState.totalTestsChartProps.totalPassedOnRerun) : null
        });
        abortedTestsPieChartProps.data.push({
            dataValue: Resources.FailedTests,
            dataCount: this._currentState.abortedTestsChartProps.totalFailures,
            dataColor: Common.TestReportColorPalette.Failed
        });
        abortedTestsPieChartProps.data.push({
            dataValue: Resources.TestOutcome_Aborted,
            dataCount: this._currentState.abortedTestsChartProps.totalAborted,
            dataColor: Common.TestReportColorPalette.AbortedForLegend
        });
        abortedTestsPieChartProps.data.push({
            dataValue: Resources.OthersText,
            dataCount: this._currentState.abortedTestsChartProps.otherTests,
            dataColor: Common.TestReportColorPalette.OtherOutcome
        });
        if (this._currentState.abortedTestsChartProps.totalNotImpactedTests > 0) {
            abortedTestsPieChartProps.data.push({
                dataValue: Resources.NotImpactedLegendText,
                dataCount: this._currentState.abortedTestsChartProps.totalNotImpactedTests,
                dataColor: Common.TestReportColorPalette.NotImpacted
            });
        }
        return abortedTestsPieChartProps;
    }

    private _currentState: ISummaryViewState;
}

export class SummaryView extends ComponentBase.Component<ISummaryViewProps, ISummaryViewState> {
    public componentWillMount(): void {
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
        SummaryView._closeOrUpdateTheScenario(this.state.aggregatedRunsCount.totalRuns > 0);
    }

    public componentDidUpdate(): void {
        SummaryView._closeOrUpdateTheScenario(this.state.aggregatedRunsCount.totalRuns > 0);
    }

    private static _closeOrUpdateTheScenario(anyRuns: boolean): void {
        if (anyRuns) {
            PerformanceUtils.endScenario(TMUtils.TRAPerfScenarios.TestResultsInBuildTimeLine_SummaryDetails);
            PerformanceUtils.addSplitTiming(TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails, TMUtils.TRAPerfScenarios.TestResultSummary_SummaryUpdateEnded);
        }
        else {
            PerformanceUtils.abortScenario(TMUtils.TRAPerfScenarios.TestResultsInBuildTimeLine_SummaryDetails);
        }
    }

    public render(): JSX.Element {
        return (
            <div className="test-summary-view">
            {
                this.state.shouldShowSummary &&
                <Accordion
                    label={Resources.ResultSummaryLabel}
                    cssClass="summary-view-accordion"
                    initiallyExpanded={ this.props.collapseOnInitialize ? false : true }
                    headingLevel={1}
                    onRenderHeader={ this.props.onRenderHeader }
                    onHeaderClick={this.props.onHeaderClicked ? this.props.onHeaderClicked : this._handleAccordionClick}
                    addSeparator={false} >
                    <div> {
                        <ChartViewComponent 
                        chartState={this.props.store.getState()}
                        onClickHandlerForSummary={this.props.onClickHandlerForSummary}
                        />
                    }
                    </div>              
                </Accordion>
            }
            </div>
        );
    }


    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    private _handleAccordionClick = (isExpanded: boolean): void => {
        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_SummaryExpandCollapseClicked, {"State": isExpanded});
    }
}

LWP.registerLWPComponent("testResportingSummaryViewForCharts", ChartViewComponent);
