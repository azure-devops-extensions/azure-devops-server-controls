import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/ReportView";

import { CommandButton } from "OfficeFabric/Button";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/ReportActionsCreator";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { AnalyticsUnavailableMessage } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsUnavailableMessage";
import { AggregateReport } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/TestInsights/AggregateReport";
import { ConfigurationToolbar } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/ConfigurationToolbar";
import { TestHistoryList } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/TestHistoryList";
import { AnnouncementStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/AnnouncementStore";
import { ConfigurationToolbarStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/ConfigurationToolbarStore";
import { IReportViewState, ReportStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/ReportStore";
import { TestResultDetailsActionCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionCreator";
import { TestResultDetailsActionHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import { TestResultDetailsView } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/TestResultDetailsView";
import { TestResultDetailsViewStore } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/TestResultDetailsViewStore";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import { Splitter } from "VSSPreview/Flux/Components/Splitter";


export interface IReportViewProps extends CommonTypes.IReportComponentProps {
    onBackNavigation?: () => void;
    testContext: CommonTypes.ITestContext;
    testResultsContext: TCMContracts.TestResultsContext;
    expandFilterBar: boolean;
}

export class ReportView extends ComponentBase.Component<IReportViewProps, IReportViewState> {

    public componentWillMount(): void {
        this._viewContextData = this.props.testResultsContext.contextType === TCMContracts.TestResultsContextType.Release
                                ? {viewContext : CommonBase.ViewContext.Release} as IViewContextData
                                : {viewContext : CommonBase.ViewContext.Build} as IViewContextData;
        this._actionsCreator = ReportActionsCreator.getInstance(this.props.instanceId);

        this._testResultDetailsActionHub = new TestResultDetailsActionHub();
        this._resultDetailsStore = new TestResultDetailsViewStore(this._testResultDetailsActionHub);
        this._testResultDetailsActionCreator = new TestResultDetailsActionCreator(this._testResultDetailsActionHub, TestResultSource.getInstance(), this._viewContextData, true);        
        let reportConfigurationDefinition = new Definitions.ReportConfigurationDefinition();
        this._configToolbarStore = ConfigurationToolbarStore.getInstance(reportConfigurationDefinition.getDefaultConfigurationValues(this.props.testResultsContext.contextType), this.props.instanceId);
        
        this._store = ReportStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);
        this.setState(this._store.getState());
        
        this._expandFilterBar();

        this._announcementStore = AnnouncementStore.getInstance(this.props.instanceId);
        this._announcementStore.addChangedListener(this._onAnnouncementUpdate);
    }

    public componentDidMount(): void {
        this._toggleSplitter();
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public componentDidUpdate() {
        this._toggleSplitter();
    }

    public render(): JSX.Element {
        let areFiltersApplied = Utility.areFiltersApplied(this._configToolbarStore.getState().reportConfigurationValues.configuredFilters);
        if (!!this.state.errorMessage || this.state.viewType === CommonTypes.ViewType.NoTestDataView) {
            return <div className="testinsights-analytics-report-view-section">
                <ConfigurationToolbar
                    instanceId={this.props.instanceId}
                    onBackNavigation={this._onBackNavigation}
                    testContext={this.props.testContext}
                    onConfigurationChange={this._onConfigurationToolbarChanged}
                    testResultsContext={this.props.testResultsContext}
                    onToggleFilter={this._onToggleFilter}
                />
                {this.state.errorMessage &&
                    <AnalyticsUnavailableMessage
                        imageName={Definitions.AnalyticsExtension.ImageServiceError}
                        message={Resources.AnalyticsErrorMessage}
                        suggestion={this.state.errorMessage}
                        cssClass={"testresults-error-message-div"}
                    />
                }
                {this.state.viewType === CommonTypes.ViewType.NoTestDataView &&
                    <AnalyticsUnavailableMessage
                        imageName={Definitions.AnalyticsExtension.ImageTestResultsNotFound}
                        message={areFiltersApplied ? Resources.NoResultsMessage : Resources.AnalyticsTestResultsNotFoundMessage}
                        suggestion={areFiltersApplied ? Resources.NoResultsSuggestionMessage : Resources.AnalyticsTestResultsNotFoundSuggestion}
                        cssClass={"testresults-error-message-div"}
                    />
                }
            </div>;
        } else {
            let left: JSX.Element = (
                <div className="testinsights-analytics-report-view">
                    <AggregateReport
                        instanceId={this.props.instanceId}
                    />

                    <TestHistoryList
                        testContext={this.props.testContext}
                        testResultsContext={this.props.testResultsContext}
                        onActiveItemChanged={this._onTestHistoryActiveItemChanged}
                        testResultDetailsActionCreator={this._testResultDetailsActionCreator}
                        instanceId={this.props.instanceId}
                        onShowMoreTestHistoryList={this._onShowMoreTestHistoryList}
                    />
                </div>
            );

            let right: JSX.Element = null;
            if (this._showDetailsPanel()) {
                right = (
                    <div className="overlay-right-section">
                        <CommandButton
                            className="overlay-panel-close-button"
                            ariaLabel={Resources.CloseText}
                            iconProps={{ iconName: "Cancel" }}
                            onClick={this._closeDetailsPanel}
                            ariaDescription={Resources.CloseOverlayPanel}>
                        </CommandButton>
                        
                        {this.state.detailsPanelErrorMessage &&
                            <AnalyticsUnavailableMessage
                            imageName={Definitions.AnalyticsExtension.ImageServiceError}
                            message={Resources.AnalyticsErrorMessage}
                            suggestion={this.state.detailsPanelErrorMessage}
                            cssClass={"testresults-error-message-div"}
                        />
                        }

                        {!this.state.detailsPanelErrorMessage &&
                            <TestResultDetailsView
                                resultDetailsStore={this._resultDetailsStore}
                                resultDetailActionCreator={this._testResultDetailsActionCreator}
                                viewContext={this._viewContextData}
                                isFullScreen={false}
                                showHistory={false}
                                showHeader={true}
                                hideTestCaseTitle={true}
                                showBugAndLink={true}
                                linkedStackTrace={false}
                            />
                        }                        
                    </div>
                );        
            }

            return (
                <div className="testinsights-analytics-report-view-section">
                    <ConfigurationToolbar
                        instanceId={this.props.instanceId}
                        onBackNavigation={this._onBackNavigation}
                        testContext={this.props.testContext}
                        onConfigurationChange={this._onConfigurationToolbarChanged}
                        testResultsContext={this.props.testResultsContext}
                        onToggleFilter={this._onToggleFilter}
                    />
                    <div className="testinsights-analytics-report-view-splitter" >
                        <Splitter
                            ref={this._resolveRef("_splitterComponent")}
                            left={left}
                            right={right}
                            fixedSide="right"
                            className="horizontal hub-splitter testinsights-analytics-overlay-panel-component right-fix"
                            leftClassName="overview-panel scrollable-container"
                            rightClassName="details-panel"
                            initialSize={this._getInitialWidth()}
                            minWidth={this._rightPanelMinWidth}
                            maxWidth={this._getMaxWidth()}>
                        </Splitter>
                    </div>
                </div>
            );
        }
    }

    private _onConfigurationToolbarChanged = (changedConfValues: CommonTypes.IReportConfiguration) => {
        //Close detailes pane as configuration values are updated.
        this._closeDetailsPanel();

        //Update configuration values in configuration toolbar store.
        this._actionsCreator.updateConfigurationValues(changedConfValues);

        //Invoke redering trend chart with updated configurations values.
        this._actionsCreator.updateTrendChart(this.props.testResultsContext, this.props.testContext, changedConfValues);

        //Invoke rendering test history list with updated configuration values.
        this._actionsCreator.updateTestHistory(this.props.testResultsContext, this.props.testContext, changedConfValues);
    }

    private _onBackNavigation = () => {
        this._closeDetailsPanel();
        this.props.onBackNavigation();
    }

    private _onToggleFilter = () => {
        this._actionsCreator.toggleFilter();
    }

    private _closeDetailsPanel = () => {
        this._actionsCreator.closeDetailsPanel();
    }

    private _showDetailsPanel(): boolean {
        return this.state.showDetails;
    }

    private _expandFilterBar = () => {
        this._actionsCreator.expandFilterBar(this.props.expandFilterBar);
    }

    private _resolveRef(refName: string) {
        if (!this._resolves) {
            this._resolves = {};
        }
        if (!this._resolves[refName]) {
            this._resolves[refName] = (ref) => {
                return this[refName] = ref;
            };
        }

        return this._resolves[refName];
    }

    private _getInitialWidth(): number {
        return Math.max(this._rightPanelMinWidth, window.outerWidth * this._initialWidthPercent / 100);
    }

    private _getMaxWidth(): number {
        return Math.max(this._rightPanelMinWidth, window.outerWidth * this._rightPanelMaxWidthPercentage / 100);
    }

    private _onTestHistoryActiveItemChanged = (item: CommonTypes.ITestHistoryListItem) => {
        // -- Invoke action to broadcast item invoked event.
        this._actionsCreator.openDetailsPanel(item, this._viewContextData, this.props.testResultsContext);
    }

    private _onShowMoreTestHistoryList = (nextPageToken: CommonTypes.INextDataPageToken) => {
        let confValues = this._configToolbarStore.getState().reportConfigurationValues;
        this._actionsCreator.showMoreTestHistoryItems(this.props.testResultsContext, this.props.testContext, confValues, nextPageToken);
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _onAnnouncementUpdate = () => {
        announce(this._announcementStore.getState().announcementText);
    }

    private _toggleSplitter(): void {
        if (this._splitterComponent) {
            if (this._showDetailsPanel()) {
                this._splitterComponent.expand();
            }
            else {
                this._splitterComponent.collapse();
            }
        }
    }

    private _actionsCreator: ReportActionsCreator;
    private _splitterComponent: Splitter;
    private _store: ReportStore;
    private _resolves: { [name: string]: (ref: any) => any };
    private _resultDetailsStore : TestResultDetailsViewStore;
    private _testResultDetailsActionHub: TestResultDetailsActionHub;
    private _testResultDetailsActionCreator: TestResultDetailsActionCreator;
    private _configToolbarStore: ConfigurationToolbarStore;
    private _announcementStore: AnnouncementStore;

    private _initialWidthPercent = 40;
    private _rightPanelMinWidth = 600;
    private _rightPanelMaxWidthPercentage = 80;
    private _viewContextData : IViewContextData;
}