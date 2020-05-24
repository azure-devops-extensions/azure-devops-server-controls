/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/Components/TestResultsGrid";

import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { Icon } from "OfficeFabric/Icon";
import { Image } from "OfficeFabric/Image";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ITestResultTreeData, TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import { TreeListView } from "TestManagement/Scripts/Scenarios/Common/Components/TreeListView";
import { areFilterStatesEqual } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { TestResultDetailsActionCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionCreator";
import { TestResultsListViewActionCreator } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListViewActionCreator";
import { FilterHelper, IconDetails, TestOutcome, RunOutcome } from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { ITestResultsState, TestResultsStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsGridTreeStore";
import { ViewContext } from "TestManagement/Scripts/TestReporting/Common/Common";
import { ColumnIndices } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import * as ValueMap from "TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as ComponentBase from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import { Loading } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export interface ITestResultsListProps extends ComponentBase.Props {
    testResultsListViewActionCreator: TestResultsListViewActionCreator;
    testResultDetailsActionCreator: TestResultDetailsActionCreator;
    treeStore: TestResultsStore;
}

export class TestResultsList extends ComponentBase.Component<ITestResultsListProps, ITestResultsState> {

    public componentWillMount(): void {
        this._handleStoreChange();
    }

    public componentDidMount(): void {
        this.props.treeStore.addChangedListener(this._handleStoreChange);
        TestResultsList._closeThePerfScenario(this.state.endPerfMarker, this.state.viewContext);
    }

    public componentDidUpdate(): void {
        TestResultsList._closeThePerfScenario(this.state.endPerfMarker, this.state.viewContext);
    }

    public componentWillUnmount(): void {
        this.props.treeStore.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        if (this.state.loading) {
            return this._getLoadingSpinner();
        }

        if (this.state.errorMessage && this.state.errorMessage !== Utils_String.empty) {
            return (
                <MessageBar
                    className="test-results-grid-error-message-bar"
                    messageBarType={MessageBarType.error}
                >
                    {this.state.errorMessage}
                </MessageBar>
            );
        }

        if (this.state.results.length === 0) {
            const isInitialFilterState: boolean = areFilterStatesEqual(this.state.filterState, FilterHelper.getInitialFilterState())
                && this.state.fetchedResultsCount === 0;

            return (
                <div>
                    {
                        this.state.showingResultsCount > 0
                        && this.state.showingResultsCount < this.state.totalResultsCount
                        && this._getFilterMessageBar()
                    }
                    {
                        !isInitialFilterState
                        && this._getNoResultsFoundImage()
                    }
                    {
                        isInitialFilterState
                        && this._getNoFailedResultsImage()
                    }
                </div>);
        }

        return (
            <div>
                {this.state.showingResultsCount > 0
                    && this.state.showingResultsCount < this.state.totalResultsCount
                    && this._getFilterMessageBar()
                }
                <TreeListView
                    columns={this._getColumns(this.state.columnToRender, true)}
                    className={"test-results-grid"}
                    onItemInvoked={this._onItemInvoked}
                    layoutMode={DetailsListLayoutMode.fixedColumns}
                    items={this.state ? this.state.results : []}
                    checkboxVisibility={CheckboxVisibility.onHover}
                    selectionMode={SelectionMode.multiple}
                    constrainMode={ConstrainMode.unconstrained}
                    compact={true}
                    selection={this.state.selection}
                    onActiveItemChanged={this._onActiveItemChanged}
                    onGroupCollapsed={this._collapseTestResults}
                    onGroupExpanded={this._expandTestResults}
                    ariaLabelForSelectionColumn={Resources.SelectAll}
                    ariaLabelForGrid={Resources.TestResultsTreeView}
                    onLoadMore={this._onLoadMore}
                    initialFocusedIndex={this.state.needFocusOnSelectedElement ? this.state.lastSelectedIndex : null}
                    groupHeaderIconClassName={this.dontOpenDetailsPaneCssClass}>
                </TreeListView>
            </div>
        );
    }

    // this method is not called when we click explicitly on the checkbox for selecting or deselecting the row. 
    // Thus, onSelectionChanged has been used in TestResultsGridTreeStore. This method is invoked irrespective of where on row we click
    // In new web platform this bug is overridden by the fact that we maintain a list of selected items in the grid and that list is being used elsewhere
    @autobind
    private _onActiveItemChanged(data: ITestResultTreeData, index?: number, ev?: React.FocusEvent<HTMLElement>) {

        // We took this fix because bug in office fabric (https://github.com/OfficeDev/office-ui-fabric-react/issues/2863)
        if (index === this.state.lastSelectedIndex || (ev.target && ev.target.classList.contains(this.dontOpenDetailsPaneCssClass))) {
            return;
        }

        if (data.subResultId) {
            TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureResultsListView_SelectionOfHierarchicalResults, {
                "RunId": data.runId,
                "ResultId": (data.resultId) ? data.resultId : 0
            });
        }
        PerformanceUtils.startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);
        PerformanceUtils.addDataToScenario(TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails, { "context": ViewContext[this.state.viewContext] });
        this.props.testResultDetailsActionCreator.openDetailsPane(data);
        this.props.testResultsListViewActionCreator.onTestResultSelectionChanged(data, index);
    }

    // Gets called when user clicks on the enter key.
    @autobind
    private _onItemInvoked(item: ITestResultTreeData, index?: number, ev?: Event) {
        this.props.testResultDetailsActionCreator.enterDetailsPaneFullScreen();
    }

    @autobind
    private _onLoadMoreClick(event: __React.MouseEvent<HTMLElement>) {
        if (event) {
            event.preventDefault();
        }

        this.props.testResultsListViewActionCreator.onLoadMoreClick();
    }

    private static _closeThePerfScenario(closeIt: boolean, context: ViewContext) {
        if (closeIt) {
            PerformanceUtils.addSplitTiming(TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails, TMUtils.TRAPerfScenarios.TestResultGrid_GridUpdateEnded);
            PerformanceUtils.addDataToScenario(TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails, { "context": ViewContext[context] });
            PerformanceUtils.endScenario(TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
        }
    }

    private _getLoadMoreMessage(showingResultsCount: number, totalResultsCount: number): string {
        const isFilterCleared: boolean = Object.keys(this.state.filterState).length === 0;
        return (
            Utils_String.format(
                isFilterCleared
                    ? Resources.TestResultsFilterClearedMessage
                    : Resources.LoadMoreMessage, showingResultsCount.toLocaleString(), totalResultsCount.toLocaleString()
            )
        );
    }

    private _getNextFilterMessage(): string {
        const isFilterCleared: boolean = Object.keys(this.state.filterState).length === 0;

        return (isFilterCleared ? Resources.ShowMoreTestResults : Resources.FilterMoreTestResults);
    }

    private _getNoResultsFoundImage(): JSX.Element {
        let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let resourceFileName = TfsContext.configuration.getResourcesFile("no-results-image.png");
        const noResultsFoundMessage: string = (this.state.fetchedResultsCount < this.state.totalResultsCount)
            ? Resources.NoResultsForCurrentSetMessage
            : Resources.NoResultsMessage;
        const noResultsFoundSuggestionMessage: string = (this.state.fetchedResultsCount < this.state.totalResultsCount)
            ? Resources.NoResultsForCurrentSetSuggestionMessage
            : Resources.NoResultsSuggestionMessage;


        announce(noResultsFoundMessage);

        return (
            <div className={"no-results-div"}>
                <Image className={"no-results-image"} src={resourceFileName} alt={Utils_String.empty} />
                <span className={"no-results-message"}>{noResultsFoundMessage}</span>
                <span className={"no-results-suggestion"}>{noResultsFoundSuggestionMessage}</span>
            </div>);
    }

    private _getNoFailedResultsImage(): JSX.Element {
        const TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const resourceFileName = TfsContext.configuration.getResourcesFile("no-failed-tests.svg");

        announce(Resources.NoFailedResultsMessage);

        return (
            <div className={"no-results-div"}>
                <Image className={"no-failed-tests-image"} src={resourceFileName} alt={Utils_String.empty} />
                <span className={"no-results-message"}>{Resources.NoFailedResultsMessage}</span>
                <span className={"no-results-suggestion"}>{Resources.NoFailedResultsSuggestionMessage}</span>
            </div>);
    }

    private _getFilterMessageBar(): JSX.Element {
        return <MessageBar className="load-more-tests-info">
            {this._getLoadMoreMessage(this.state.showingResultsCount, this.state.totalResultsCount)}
            <Link role="button"
                className="load-more-click"
                onClick={this._onLoadMoreClick}
                href="#"
            >
                {this._getNextFilterMessage()}
            </Link>
        </MessageBar>;
    }

    private _getLoadingSpinner(): JSX.Element {
        return <Spinner
            ariaLabel={Resources.LoadingTestResultDetailsLabel}
            className="testresults-loading-spinner test-result-loading-spinner-separator"
            size={SpinnerSize.large}
            label={Resources.LoadingTestResultDetailsLabel} />;
    }

    @autobind
    private _onLoadMore(item: ITestResultTreeData) {
        const resultsToBeFetched = this.props.treeStore.getNextResultsToBeFetched(item.groupId);
        const uniqueId: number = this.props.treeStore.getUniqueRedrawGridId();
        this.props.testResultsListViewActionCreator.loadMoreData(item.groupId, resultsToBeFetched, uniqueId);
    }

    @autobind
    private _collapseTestResults(item: ITestResultTreeData) {
        this.props.testResultsListViewActionCreator.collapseTestResults(item.groupId);
    }

    @autobind
    private _expandTestResults(item: ITestResultTreeData) {
        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureResultDetails_ExpandButtonClicked, {
            "Depth": item.depth + 1,
            "RunId": item.runId,
            "ResultId": (item.resultId) ? item.resultId : 0
        });
        const resultsToBeFetched = this.props.treeStore.getNextResultsToBeFetched(item.groupId);

        this.props.testResultsListViewActionCreator.expandTestResults(item, resultsToBeFetched);
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.treeStore.getState());
    }

    private _getColumns(columnsKeys: string[], getDefaultColumn: boolean = false): IColumn[] {
        const columns: IColumn[] = [];

        if (getDefaultColumn) {
            columns.push(this._columnEntry(ColumnIndices.Test));
        }

        columnsKeys.map(key => {
            columns.push(this._columnEntry(key));
        });
        return columns;
    }

    private _columnEntry(key: string): IColumn {
        let column: IColumn;

        switch (key) {
            case ColumnIndices.Test:
                column = {
                    fieldName: Resources.ResultGridTitle_Test,
                    key: ColumnIndices.Test,
                    name: Resources.ResultGridTitle_Test,
                    minWidth: 180,
                    maxWidth: 700,
                    isResizable: true,
                    headerClassName: "testresults-column-header testresults-test",
                    className: "testresults-column-cell testresults-test",
                    columnActionsMode: ColumnActionsMode.disabled,
                    onRender: this._onRenderTestColumn
                };
                break;
            case ColumnIndices.Duration:
                column = this._getDurationColumn();
                break;
            case ColumnIndices.FailingRelease:
                column = {
                    fieldName: Resources.ResultGridHeader_FailingRelease,
                    key: ColumnIndices.FailingRelease,
                    name: Resources.ResultGridHeader_FailingRelease,
                    minWidth: 100,
                    isResizable: true,
                    headerClassName: "testresults-column-header testresults-failingContext",
                    className: "testresults-column-cell testresults-failingContext",
                    columnActionsMode: ColumnActionsMode.disabled,
                    onRender: this._onRenderFailingArtifactColumn
                };
                break;
            case ColumnIndices.FailingBuild:
                column = {
                    fieldName: Resources.ResultGridHeader_FailingBuild,
                    key: ColumnIndices.FailingBuild,
                    name: Resources.ResultGridHeader_FailingBuild,
                    minWidth: 100,
                    isResizable: true,
                    headerClassName: "testresults-column-header testresults-failingContext",
                    className: "testresults-column-cell testresults-failingContext",
                    columnActionsMode: ColumnActionsMode.disabled,
                    onRender: this._onRenderFailingArtifactColumn
                };
                break;
            case ColumnIndices.FailingSince:
                column = {
                    fieldName: Resources.ResultGridHeader_FailingSince,
                    key: ColumnIndices.FailingSince,
                    name: Resources.ResultGridHeader_FailingSince,
                    minWidth: 90,
                    maxWidth: 280,
                    isResizable: true,
                    headerClassName: "testresults-column-header testresults-failingSince",
                    className: "testresults-column-cell testresults-failingSince",
                    columnActionsMode: ColumnActionsMode.disabled,
                    onRender: (item?: ITestResultTreeData, index?: number, column?: IColumn) => { return this._getElementWithTooltip(item.failingSince); }
                };
                break;
            case ColumnIndices.Owner:
                column = {
                    fieldName: Resources.ResultGridHeader_Owner,
                    key: ColumnIndices.Owner,
                    name: Resources.ResultGridHeader_Owner,
                    minWidth: 120,
                    isResizable: true,
                    headerClassName: "testresults-column-header testresults-owner",
                    className: "testresults-column-cell testresults-owner",
                    columnActionsMode: ColumnActionsMode.disabled,
                    onRender: (item?: ITestResultTreeData, index?: number, column?: IColumn) => { return this._getElementWithTooltip(item.owner); }
                };
                break;
            case ColumnIndices.DateStarted:
                column = {
                    fieldName: Resources.ResultGridHeader_DateStarted,
                    key: ColumnIndices.DateStarted,
                    name: Resources.ResultGridHeader_DateStarted,
                    minWidth: 150,
                    isResizable: true,
                    headerClassName: "testresults-column-header testresults-date-started",
                    className: "testresults-column-cell testresults-date-started",
                    columnActionsMode: ColumnActionsMode.disabled,
                    onRender: (item?: ITestResultTreeData, index?: number, column?: IColumn) => { return this._getElementWithTooltip(item.dateStarted); }
                };
                break;
            case ColumnIndices.DateCompleted:
                column = {
                    fieldName: Resources.ResultGridHeader_DateCompleted,
                    key: ColumnIndices.DateCompleted,
                    name: Resources.ResultGridHeader_DateCompleted,
                    minWidth: 150,
                    isResizable: true,
                    headerClassName: "testresults-column-header testresults-date-completed",
                    className: "testresults-column-cell testresults-date-completed",
                    columnActionsMode: ColumnActionsMode.disabled,
                    onRender: (item?: ITestResultTreeData, index?: number, column?: IColumn) => { return this._getElementWithTooltip(item.dateCompleted); }
                };
                break;
        }

        return column;
    }

    private _getDurationColumn() {
        let column: IColumn;
        column = {
            fieldName: Resources.QueryColumnNameDuration,
            key: ColumnIndices.Duration,
            name: Resources.QueryColumnNameDuration,
            minWidth: 80,
            maxWidth: 200,
            isResizable: true,
            headerClassName: "testresults-column-header testresults-duration",
            className: "testresults-column-cell testresults-duration",
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (item?: ITestResultTreeData, index?: number, column?: IColumn) => { return this._getElementWithTooltip(item.duration); }
        };

        //If sorting is allowed (feature flag in on), make duration column sortable
        if (LicenseAndFeatureFlagUtils.isShouldSendDurationInAPIEnabled()) {
            column.isSorted = true;
            column.isSortedDescending = this.state.isSortedDescending;
            column.columnActionsMode = this.state.loading ? ColumnActionsMode.disabled : ColumnActionsMode.clickable;
            column.onColumnClick = (ev) => { this._sortColumn(ev, column); };
        }
        return column;
    }

    private _sortColumn(ev: React.MouseEvent<HTMLElement>, column: IColumn) {
        this.props.testResultsListViewActionCreator.toggleSort();
        if (column.isSortedDescending) {
            announce(Utils_String.localeFormat(Resources.DetailedListSortedAsc, Resources.ResultGridHeader_Duration));
        }
        else {
            announce(Utils_String.localeFormat(Resources.DetailedListSortedDesc, Resources.ResultGridHeader_Duration));
        }
    }

    private _getElementWithTooltip(text: string): JSX.Element {
        return (
            <TooltipHost content={text}>
                <span> {text} </span>
            </TooltipHost>
        );
    }

    @autobind
    private _onRenderFailingArtifactColumn(item: ITestResultTreeData, index: number, column?: IColumn): JSX.Element {
        if (!item.failingContextName) {
            return null;
        }

        let telemetryEvent: string = "";
        let failingUrl: string = "";
        if (this.state.viewContext === ViewContext.Build) {
            telemetryEvent = TestTabTelemetryService.featureTestTab_BuildLinkClicked;
            failingUrl = TMUtils.UrlHelper.getBuildSummaryTestTabUrl(item.failingContextId);
        }
        else if (this.state.viewContext === ViewContext.Release) {
            telemetryEvent = TestTabTelemetryService.featureTestTab_ReleaseLinkClicked;
            failingUrl = TMUtils.UrlHelper.getNewReleaseSummaryTestTabUrl(item.failingContextId);
        }

        return (
            <span className="failing-context-cell">
                <TooltipHost content={item.failingContextName}>
                    {
                        item.isCurrentArtifact ? item.failingContextName : this._getFailingArtifactLink(failingUrl, item.failingContextName, telemetryEvent)
                    }
                </TooltipHost>
            </span>);
    }

    private _getFailingArtifactLink(failingUrl: string, failingContextName, telemetryEvent: string): JSX.Element {
        return <Link href={failingUrl}
            target={"_blank"}
            className={"artifact-url " + this.dontOpenDetailsPaneCssClass}
            onClick={(e) => {
                TestTabTelemetryService.getInstance().publishEvent(telemetryEvent, TestTabTelemetryService.eventClicked, 1);
            }}
            rel={"nofollow noopener noreferrer"} >
            { failingContextName }
        </Link>
    }

    @autobind
    private _onRenderTestColumn(item: ITestResultTreeData, index: number, column?: IColumn): JSX.Element {
        const outcomeIconDiv = this._getOutcomeIconElement(item);
        const outcomeConfidenceDiv = this._getOutcomeConfidenceElement(item);
        const countDiv = this._getCountElement(item);
        const content = item.isTestCaseRow ? ValueMap.TestOutcome.getFriendlyName(item.outcome) : RunOutcome.getFriendlyName(item.runOutcome);
        if (item.nodeType === TreeNodeType.showMore) {
            return (
                <Spinner size={SpinnerSize.small} ariaLabel={Resources.LoadingMessage} />
            );
        }
        return (
            <div className="test-results-cell">
                {
                    outcomeIconDiv &&
                    <TooltipHost content={content}>
                        {outcomeIconDiv}
                    </TooltipHost>
                }
                <span className="test-results-test-name">
                    <TooltipHost content={item.test}>
                        {item.test}
                    </TooltipHost>
                </span>
                {outcomeConfidenceDiv}
                {countDiv}
            </div>
        );
    }

    private _getOutcomeIconElement(resultData: ITestResultTreeData): JSX.Element {
        if (resultData.runOutcome === -1 && !resultData.isTestCaseRow) {
            return null;
        }

        const iconDetails: IconDetails = resultData.isTestCaseRow ? TestOutcome.getIconDetails(resultData.outcome) : RunOutcome.getIconDetails(resultData.runOutcome);
        const ariaLabel = resultData.isTestCaseRow ? ValueMap.TestOutcome.getFriendlyName(resultData.outcome) : RunOutcome.getFriendlyName(resultData.runOutcome);
        return <Link role="tooltip"
            target={"_blank"}
            className={"outcome-icon"}>
            <div className="testresult-outcome-icon"><Icon iconName={iconDetails.iconName} ariaLabel={ariaLabel} className={iconDetails.className} /></div>
        </Link>;
    }

    private _getCountElement(resultData: ITestResultTreeData): JSX.Element {
        if (resultData.isTestCaseRow) {
            return null;
        }

        if (resultData.filteredTestsCount && resultData.totalTestsCount) {
            const countString : string = Utils_String.format("({0}/{1})", resultData.filteredTestsCount.toLocaleString(), resultData.totalTestsCount.toLocaleString());
            return (<span className="testresult-group-count"> {countString} </span>);
        } 

        return null;
    }

    private _getOutcomeConfidenceElement(resultData: ITestResultTreeData): JSX.Element {

        if (resultData.isTestCaseRow && (resultData.isNewFailure || resultData.isUnreliable)) {
            return (
                <div className="outcome-confidence">
                    {
                        resultData.isNewFailure &&
                        <span className="new-failure-indicator">
                            {Resources.NewFailureIndicator}
                        </span>
                    }
                    {
                        resultData.isNewFailure && resultData.isUnreliable &&
                        <span className="result-indicator-separator">
                            {Resources.TestIndicatorSeparator}
                        </span>
                    }
                    {
                        resultData.isUnreliable &&
                        <span className="flaky-result-indicator">
                            {Resources.FlakyResultIndicator}
                        </span>
                    }
                </div>
            );
        }
        else {
            return null;
        }
    }

    private dontOpenDetailsPaneCssClass: string = "dont-open-detail-pane";
}
