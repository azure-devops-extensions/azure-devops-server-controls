import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/TestHistoryList";

import { CheckboxVisibility, ConstrainMode, DetailsListLayoutMode, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { Icon } from "OfficeFabric/Icon";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { ClickableLabel } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/ClickableLabel";
import { ITestHistoryListState, TestHistoryListStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/TestHistoryListStore";
import { IconDetails, TestOutcomeIcon, TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import * as Common from "TestManagement/Scripts/Scenarios/Common/Common";
import { TreeListView } from "TestManagement/Scripts/Scenarios/Common/Components/TreeListView";
import { TestResultDetailsActionCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionCreator";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";

export interface ITestHistoryListProps extends ComponentBase.Props {
    onActiveItemChanged?: (groupItem: CommonTypes.ITestHistoryListItem) => void;
    instanceId: string;
    testContext: CommonTypes.ITestContext;
    testResultsContext: TCMContracts.TestResultsContext;
    testResultDetailsActionCreator: TestResultDetailsActionCreator;
    onShowMoreTestHistoryList?: (nextPageToken: CommonTypes.INextDataPageToken) => void;
}

export class TestHistoryList extends ComponentBase.Component<ITestHistoryListProps, ITestHistoryListState> {

    public componentWillMount(): void {
        this._store = TestHistoryListStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        return (
            <div className="ie11-wrapper">
                <div className="testinsights-analytics-report-view-testhistory-container">            
                    <div className="testinsights-analytics-report-view-testhistory">
                        {!this.state.items &&
                            <Spinner className="testresults-analytics-report-view-loadingspinner" size={SpinnerSize.large} />
                        }
                        {this.state.items &&
                            <TreeListView
                                className={css(this.props.cssClass, "testhistorylist-view")}
                                columns={this._getColumns()}
                                usePresentationStyles={true}
                                layoutMode={DetailsListLayoutMode.fixedColumns}
                                items={this.state.items}
                                checkboxVisibility={CheckboxVisibility.hidden}
                                selectionMode={SelectionMode.single}
                                constrainMode={ConstrainMode.unconstrained}
                                compact={true}
                                onActiveItemChanged={this._onActiveItemChanged}
                            />
                        }
                    </div>
                </div>
            </div>            
        );
    }

    @autobind
    private _onActiveItemChanged(item: CommonTypes.ITestHistoryListItem) {
        if (item.nodeType !== TreeNodeType.showMore) {
            if (this.props.onActiveItemChanged) {
                this.props.onActiveItemChanged(item);
            }

            let treeData: Common.ITestResultTreeData = {
                runId: item.itemkey.testRunId,
                resultId: item.itemkey.testResultId,
                nodeType: TreeNodeType.leaf,
                test: this.props.testContext.testName,
                outcome: Common.TestOutcomeIcon.mapTestOutcomeStringToEnum(item.outcome),
                duration: item.duration as string,
                owner: "Microsoft",
                isTestCaseRow: true
            } as Common.ITestResultTreeData;
            this.props.testResultDetailsActionCreator.openDetailsPane(treeData);
        }        
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [
            {
                fieldName: Resources.OutcomeText,
                key: CommonTypes.TestHistoryColumnIndices.Outcome.toString(),
                name: Resources.OutcomeText,
                ariaLabel: Resources.OutcomeText,
                minWidth: 200,
                isResizable: true,
                onRender: this._onRenderOutcomeColumnItem
            },
            {
                fieldName: Resources.DateText,
                key: CommonTypes.TestHistoryColumnIndices.Date.toString(),
                name: Resources.DateText,
                ariaLabel: Resources.DateText,
                minWidth: 200,
                isResizable: true,
                onRender: (item?: CommonTypes.ITestHistoryListItem, index?: number, column?: IColumn) => {
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.date}</span> : null;
                }
            },
            {
                fieldName: Resources.DurationText,
                key: CommonTypes.TestHistoryColumnIndices.Duration.toString(),
                name: Resources.DurationText,
                ariaLabel: Resources.DurationText,
                minWidth: 200,
                isResizable: true,
                onRender: (item?: CommonTypes.ITestHistoryListItem, index?: number, column?: IColumn) => {
                    return item.nodeType !== TreeNodeType.showMore ? <span aria-label={item.durationAriaLabel}>{item.duration}</span> : null;
                }
            },
            {
                fieldName: Resources.BranchText,
                key: CommonTypes.TestHistoryColumnIndices.Branch.toString(),
                name: Resources.BranchText,
                ariaLabel: Resources.BranchText,
                minWidth: 300,
                isResizable: true,
                onRender: (item?: CommonTypes.ITestHistoryListItem, index?: number, column?: IColumn) => {
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.branch}</span> : null;
                }
            }
        ];

        if (this.props.testResultsContext && this.props.testResultsContext.contextType === TCMContracts.TestResultsContextType.Release) {
            columns.push(
                {
                    fieldName: Resources.Stage,
                    key: CommonTypes.TestHistoryColumnIndices.Environment.toString(),
                    name: Resources.Stage,
                    ariaLabel: Resources.Stage,
                    minWidth: 300,
                    isResizable: true,
                    onRender: (item?: CommonTypes.ITestHistoryListItem, index?: number, column?: IColumn) => {
                        return item.nodeType !== TreeNodeType.showMore ? <span>{item.environmentRef.name}</span> : null;
                    }
                });
        }
        return columns;
    }

    @autobind
    private _onRenderOutcomeColumnItem(item: CommonTypes.ITestHistoryListItem, index: number, column?: IColumn): JSX.Element {
        if (item.nodeType === TreeNodeType.showMore) {
            return (
                <ClickableLabel
                    value={item.itemName}
                    onClick={() => { this.props.onShowMoreTestHistoryList(this._store.getNextPageToken()); }}
                    showLoadingOnClick={true}
                />
            );
        } else {
            return (
                <div className="test-results-cell">
                    {this._getOutcomeIconElement(item)}
                    <span>{item.outcome}</span>
                </div>
            );
        }        
    }

    private _getOutcomeIconElement(resultData: CommonTypes.ITestHistoryListItem): JSX.Element {
        let iconDetails: IconDetails = TestOutcomeIcon.getIconDetails(TestOutcomeIcon.mapTestOutcomeStringToEnum(resultData.outcome));
        return (
            <div className="testresult-outcome-icon">
                <Icon className={iconDetails.className}
                    iconName={iconDetails.iconName}
                />
            </div>
        );
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _store: TestHistoryListStore;
}