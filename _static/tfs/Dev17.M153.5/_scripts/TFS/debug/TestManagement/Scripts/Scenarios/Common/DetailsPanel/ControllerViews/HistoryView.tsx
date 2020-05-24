/// <reference types="react" />
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/HistoryView";

import { Accordion } from "DistributedTaskControls/SharedControls/Accordion/Accordion";
import { CommandButton, IconButton } from "OfficeFabric/Button";
import { Icon } from "OfficeFabric/Icon";
import { List } from "OfficeFabric/List";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { SelectionMode } from "OfficeFabric/Selection";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import * as TCMConstants from "Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    HistoryViewActionsCreator,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsCreator";
import { IGroupedHistoryItem } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsHub";
import {
    HistoryViewStore,
    IHistoryViewState,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/HistoryViewStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TRACommonControls from "TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import Diag = require("VSS/Diag");
import { CommonActions, getService as getActionService } from "VSS/Events/Action";
import * as ComponentBase from "VSS/Flux/Component";
import { LocationService } from "VSS/Navigation/Location";
import * as Service from "VSS/Service";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { Component as Histogram, HistogramBarData } from "VSSPreview/Flux/Components/Histogram";
import { IPickListItem, IPickListSelection, PickListDropdown } from "VSSUI/PickList";

export interface IHistoryViewProps extends ComponentBase.Props {
    testCaseResult: TCMContracts.TestCaseResult;
    subResultId: number;
    store: HistoryViewStore;
    actionsCreator: HistoryViewActionsCreator;
    viewContext: Common.IViewContextData;
    isFullScreen: boolean;
}

export class HistoryView extends ComponentBase.Component<IHistoryViewProps, IHistoryViewState> {
    constructor(props: any) {
        super(props);
        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestHistory_HistoryPaneViewed, {
            "RunId": this.props.testCaseResult.testRun.id,
            "ResultId": this.props.testCaseResult.id,
            "SubresultId": this.props.subResultId,
            "TestResultOutcome": this.props.testCaseResult.outcome
        });
    }

    public componentWillMount(): void {
        this._handleStoreChange();
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public componentDidMount(): void {
        this.props.store.addChangedListener(this._handleStoreChange);
        if (this.props.isFullScreen) {
            this.props.actionsCreator.setMaxHistoryItemsToShow(100);
        }
        this.props.actionsCreator.getBranches(this.props.testCaseResult);
        this.props.actionsCreator.fetchHistoryForBuildOrRelease(this.props.viewContext, this.props.testCaseResult);
        this.props.actionsCreator.fetchHistoryForGroup(this.props.viewContext, this.props.testCaseResult);
    }

    public render(): JSX.Element {
        return (
            <div className="history-view-container">
                {
                    this.state.errorMessage && <div className="history-view-error-message">
                        <MessageBar
                            messageBarType={MessageBarType.error}
                            dismissButtonAriaLabel={Resources.ClearErrorMessage}
                            className="history-view-error-message-bar"
                            isMultiline={false}
                            onDismiss={this._onErrorMessageDismiss}>
                            {this.state.errorMessage.toString()}
                        </MessageBar>
                    </div>
                }

                <div className="history-filters">
                    <PickListDropdown
                        className="branches-picklist"
                        selectedItems={(this.state.selectedBranch == null) ? [] : [this.state.selectedBranch]}
                        getListItem={this._getListItem}
                        selectionMode={SelectionMode.single}
                        getPickListItems={this._getBrancheList}
                        isSearchable={true}
                        onSelectionChanged={this._onBranchSelected}
                        placeholder={Resources.BranchText}
                        searchTextPlaceholder={Resources.FilterByBranch}
                        ariaLabelFormat={Resources.FilterByBranch}
                    />
                    <div className="vss-FilterBar--action vss-FilterBar--action-clear clear-branch-filter">
                        <CommandButton
                            className="filter-clear-button"
                            disabled={this.state.selectedBranch == null}
                            onClick={this._onResetBranchFilter}
                            iconProps={{ iconName: "Clear" }}
                            ariaLabel={Resources.ClearAssociatedAutomation}>
                            {Resources.ClearAssociatedAutomation}
                        </CommandButton>
                    </div>
                </div>


                <div>
                    <Accordion
                        label={(this.props.viewContext.viewContext === CommonBase.ViewContext.Build) ? Resources.CurrentBuildDefinition : Resources.CurrentStage}
                        cssClass="current-build-accordion"
                        initiallyExpanded={true}
                        headingLevel={2} >
                        {
                            this.state.isHistoryForCurrentBuildOrEnvLoading &&
                            this._getLoadingHistoryView()
                        }
                        {
                            !this.state.isHistoryForCurrentBuildOrEnvLoading &&
                            <div>
                                <hr className="history-group-separator" />
                                <List
                                    items={this.state.currentBuildOrEnvHistory}
                                    onRenderCell={this._renderCurrentBuildOrEnvHistory}
                                />
                            </div>
                        }
                    </Accordion>

                    <Accordion
                        label={(this.props.viewContext.viewContext === CommonBase.ViewContext.Build) ? Resources.BranchesText : Resources.OtherStagesText}
                        cssClass="branch-accordion"
                        initiallyExpanded={true}
                        headingLevel={2}>
                        {
                            this.state.isHistoryForGroupsLoading &&
                            this._getLoadingHistoryView()
                        }
                        {
                            !this.state.isHistoryForGroupsLoading &&
                            <div className="branches-groups">
                                <hr className="history-group-separator" />
                                <List
                                    items={this.state.groupedHistoryItems}
                                    onRenderCell={this._renderHistory}
                                />
                            </div>
                        }
                    </Accordion>
                </div>

            </div>
        );
    }

    @autobind
    private _getBrancheList(): string[] {
        if(!this.state.branches){
            return [Resources.LoadingMessage]
        }
        if(this.state.branches.length === 0){
            return [Resources.NoBranchesFound]
        }

        return this.state.branches;
    }

    @autobind
    private _onResetBranchFilter(): void {
        this.props.actionsCreator.fetchHistoryForGroup(this.props.viewContext, this.props.testCaseResult);
        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestHistory_BranchFilterCleared, {
            "RunId": this.props.testCaseResult.testRun.id,
            "ResultId": this.props.testCaseResult.id,
            "SubresultId": this.props.subResultId
        });
    }

    private _getListItem(item: string): IPickListItem {
        let disabled: boolean = item === Resources.NoBranchesFound || item === Resources.LoadingMessage;

        return {
            key: item,
            name: item,
            disabled: disabled
        };
    }

    @autobind
    private _onBranchSelected(selection: IPickListSelection) {
        let branchSelected = selection.selectedItems[0];
        this.props.actionsCreator.fetchHistoryForGroup(this.props.viewContext, this.props.testCaseResult, branchSelected);

        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestHistory_BranchFilterUsed, {
            "RunId": this.props.testCaseResult.testRun.id,
            "ResultId": this.props.testCaseResult.id,
            "SubresultId": this.props.subResultId,
            "BranchSelected": branchSelected
        });
    }

    @autobind
    private _renderCurrentBuildOrEnvHistory(item: IGroupedHistoryItem): JSX.Element {
        let markerMargin: string;
        for (let i = item.leftIndex; i <= item.rightIndex; ++i) {
            if (item.historyForGroup.results[i].id === this.props.testCaseResult.id && item.historyForGroup.results[i].testRun.id === this.props.testCaseResult.testRun.id) {
                // Bar width is 6 and spacing is 1, so shift the marker by multiplying number of item with 8
                markerMargin = (8 * (this.state.maxHistoryItemsToShow - 1 - (i - item.leftIndex)) - 1).toString() + "px";
                break;
            }
        }
        return (
            <div className="current-build-or-env">
                <div className="history-information">
                    <div className="history-item-header">
                        <Icon iconName="Build" />
                        <div className="groupTitle"> {item.historyForGroup.displayName} </div>
                    </div>
                </div>
                <div className="history-chart">
                    <TooltipHost content={Resources.OlderResults}>
                        <IconButton
                            className="navigation-icon-container"
                            ariaLabel={Resources.OlderResults}
                            aria-disabled={item.prevButtonDisabled}
                            disabled={item.prevButtonDisabled}
                            onClick={() => this._leftArrowClicked(item)}
                            iconProps={{ iconName: "ChevronLeft" }}
                        />
                    </TooltipHost>
                    <div className="history-chart-and-info">
                        <div style={{ width: "10px", paddingLeft: markerMargin}}>
                            <TooltipHost content={Resources.CurrentResult}>
                                <Icon
                                    iconName="CaretSolidDown"
                                    ariaLabel="Current Testcase"
                                    style={{ fontSize: "8px", color: (markerMargin != null) ? "blue" : "transparent", display: "block" }}
                                    color="blue" />
                            </TooltipHost>
                        </div>
                        {this._getHistogram(item.historyForGroup.results.slice(item.leftIndex, item.rightIndex + 1))}
                        <div className="window-dates">
                            <span className="leftDate">{Utils_Date.format(item.historyForGroup.results[item.rightIndex].completedDate, "MM/dd/yyyy")}</span>
                            <span className="rightDate">{Utils_Date.format(item.historyForGroup.results[item.leftIndex].completedDate, "MM/dd/yyyy")}</span>
                        </div>
                    </div>
                    <TooltipHost content={Resources.NewerResults}>
                        <IconButton
                            className="navigation-icon-container"
                            disabled={item.nextButtonDisabled}
                            ariaLabel={Resources.NewerResults}
                            aria-disabled={item.nextButtonDisabled}
                            onClick={() => this._rightArrowClicked(item)}
                            iconProps={{ iconName: "ChevronRight" }}
                        />
                    </TooltipHost>
                </div>
            </div>);
    }

    @autobind
    private _renderHistory(item: IGroupedHistoryItem, index: number | undefined): JSX.Element {
        return (
            <div className="history-group-item">
                <div className="history-information">
                    <div className="history-item-header">
                        <Icon iconName={this._getIconNameForGroupedHistory()} />
                        <div className="groupTitle"> {item.historyForGroup.displayName} </div>
                    </div>
                </div>
                <div className="history-chart">
                    <TooltipHost content={Resources.OlderResults}>
                        <IconButton
                            className="navigation-icon-container"
                            ariaLabel={Resources.OlderResults}
                            aria-disabled={item.prevButtonDisabled}
                            disabled={item.prevButtonDisabled}
                            onClick={() => this._leftArrowClicked(item, index)}
                            iconProps={{ iconName: "ChevronLeft" }}
                        />
                    </TooltipHost>
                    <div className="history-chart-and-info">
                        {this._getHistogram(item.historyForGroup.results.slice(item.leftIndex, item.rightIndex + 1))}
                        <div className="window-dates">
                            <span className="leftDate">{Utils_Date.format(item.historyForGroup.results[item.rightIndex].completedDate, "MM/dd/yyyy")}</span>
                            <span className="rightDate">{Utils_Date.format(item.historyForGroup.results[item.leftIndex].completedDate, "MM/dd/yyyy")}</span>
                        </div>
                    </div>
                    <TooltipHost content={Resources.NewerResults}>
                        <IconButton
                            className="navigation-icon-container"
                            disabled={item.nextButtonDisabled}
                            ariaLabel={Resources.NewerResults}
                            aria-disabled={item.nextButtonDisabled}
                            onClick={() => this._rightArrowClicked(item, index)}
                            iconProps={{ iconName: "ChevronRight" }}
                        />
                    </TooltipHost>
                </div>
            </div>
        );
    }
    private _getLoadingHistoryView(): JSX.Element {
        return (
            <div className="history-view-pane-loading">
                <Spinner
                    ariaLabel={Resources.LoadingHistoryMessage}
                    className="history-view-loading-spinner test-result-loading-spinner-separator"
                    size={SpinnerSize.large}
                    label={Resources.LoadingHistoryMessage}
                />
            </div>
        );
    }

    private _getIconNameForGroupedHistory(): string {
        let iconName: string = (this.props.viewContext.viewContext === CommonBase.ViewContext.Build) ? "BranchMerge" : "Build";
        return iconName;
    }

    private _leftArrowClicked = (item: IGroupedHistoryItem, index?: number): any => {
        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestHistory_LeftOrRightArrowClicked, {
            "RunId": this.props.testCaseResult.testRun.id,
            "ResultId": this.props.testCaseResult.id,
            "SubresultId": this.props.subResultId,
            "Group": item.historyForGroup.displayName,
            "ButtonClicked": "Left"
        });
        if (item.rightIndex < item.historyForGroup.results.length - 1) {
            this.props.actionsCreator.getNextOrPreviousResults(this.props.viewContext, this.props.testCaseResult, item, true, false, this.state.selectedBranch, index);
        } else {
            this.props.actionsCreator.getNextOrPreviousResults(this.props.viewContext, this.props.testCaseResult, item, true, true, this.state.selectedBranch, index);
        }
    }

    private _rightArrowClicked = (item: IGroupedHistoryItem, index?: number): any => {
        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestHistory_LeftOrRightArrowClicked, {
            "RunId": this.props.testCaseResult.testRun.id,
            "ResultId": this.props.testCaseResult.id,
            "SubresultId": this.props.subResultId,
            "Group": item.historyForGroup.displayName,
            "ButtonClicked": "Right"
        });
        if (item.leftIndex > 0) {
            this.props.actionsCreator.getNextOrPreviousResults(this.props.viewContext, this.props.testCaseResult, item, false, false, this.state.selectedBranch, index);
        } else {
            this.props.actionsCreator.getNextOrPreviousResults(this.props.viewContext, this.props.testCaseResult, item, false, true, this.state.selectedBranch, index);
        }
    }

    private _getHistogram(results: TCMContracts.TestCaseResult[]): JSX.Element {
        let items: HistogramBarData[] = [];
        items = this._getHistogramItems(results);
        return <Histogram
            cssClass={"build-histogram definition-histogram"}
            barCount={this.state.maxHistoryItemsToShow}
            barWidth={6}
            barHeight={35}
            barSpacing={2}
            selectedState={"selected"}
            hoverState={"hover"}
            items={items} />;
    }

    private _getHistogramItems(results: TCMContracts.TestCaseResult[]): HistogramBarData[] {
        if (!results || results.length === 0) {
            return [];
        }

        let maxDuration = Number.MIN_VALUE;

        let items: HistogramBarData[] = results.reverse().map((result: TCMContracts.TestCaseResult) => {
            let duration: any = (result.durationInMs) ? result.durationInMs : 0;
            maxDuration = Math.max(maxDuration, duration);
            let title: string;
            if (result.releaseReference.id === 0) {
                title = Utils_String.format(Resources.ResultHistoryHistogramBarTitleText, result.outcome, Utils_Date.ago(result.completedDate), result.buildReference.number, TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(duration));
            } else {
                title = Utils_String.format(Resources.ResultHistoryHistogramBarTitleText, result.outcome, Utils_Date.ago(result.completedDate), result.releaseReference.name, TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(duration));
            }
            let redirectUrl = (result.releaseReference.id === 0)
                ? TMUtils.UrlHelper.getNewBuildSummaryTestResultUrl(result.buildReference.id, parseInt(result.testRun.id), result.id)
                : this._constructReleaseTestResultUrl(result);

            return {
                value: duration,
                state: this._getTextClassNameForTestResult(result),
                title: title,
                action: () => {
                    getActionService().performAction(CommonActions.ACTION_WINDOW_OPEN, {
                        url: redirectUrl
                    });
                },
                link: redirectUrl
            };
        });

        if (maxDuration === 0) {
            maxDuration = 1;
        }
        items.forEach((item) => {
            item.value = (item.value / maxDuration) * 90;
            item.value += 10;
        });

        return items;
    }

    private _constructReleaseTestResultUrl(result: TCMContracts.TestCaseResult): string {
        const locationService = Service.getLocalService(LocationService);
        let redirectUrl = Utils_String.empty;
        try {
            redirectUrl = locationService.routeUrl("ms.vss-releaseManagement-web.cd-release-progress-default-route", {
                project: TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name,
                releaseId: result.releaseReference.id.toString(),
                extensionId: "ms.vss-test-web.test-result-in-release-environment-editor-tab",
                _a: "release-environment-extension",
                environmentId: result.releaseReference.environmentId.toString(),
                runId: result.testRun.id,
                resultId: result.id.toString()
            });
        }
        catch (ex) {
            // History view is crashing due to release url dedirection bug: https://mseng.visualstudio.com/VSOnline/_workitems/edit/1303760 
            // We are stopping it from crashing till we root cause the issue and fix it.
            Diag.logWarning(ex);
        }
        return redirectUrl;
    }

    private _getTextClassNameForTestResult(result: TCMContracts.TestCaseResult) {
        if (TCMConstants.TestOutcome[result.outcome] === TCMConstants.TestOutcome.Failed) {
            return "failed";
        } else if (TCMConstants.TestOutcome[result.outcome] === TCMConstants.TestOutcome.Passed) {
            return "succeeded";
        } else if (TCMConstants.TestOutcome[result.outcome] === TCMConstants.TestOutcome.Inconclusive
            || TCMConstants.TestOutcome[result.outcome] === TCMConstants.TestOutcome.NotExecuted) {
            return "partiallysucceeded";
        } else {
            return "default";
        }
    }

    @autobind
    private _onErrorMessageDismiss(): void {
        this.props.actionsCreator.closeErrorMessage();
    }

    @autobind
    private _handleStoreChange(): void {
        this.setState(this.props.store.getState());
    }
}