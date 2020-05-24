/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/DetailedTestList";

import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { AnalyticsUnavailableMessage } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsUnavailableMessage";
import { ClickableLabel } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/ClickableLabel";
import { DetailedTestListStore, IDetailedTestListState } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/DetailedTestListStore";
import { TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import { TreeListView } from "TestManagement/Scripts/Scenarios/Common/Components/TreeListView";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

export interface IDetailedTestListProps extends CommonTypes.IReportComponentProps {
    onGroupExpanded?: (groupItem: CommonTypes.IDetailedListItem) => void;
    onGroupCollapsed?: (groupItem: CommonTypes.IDetailedListItem) => void;
    onItemInvoked?: (groupItem: CommonTypes.IDetailedListItem) => void;
    onColumnOrderChanged?: (orderedColumn: CommonTypes.IDetailedListColumn) => void;
    onDetailedListShowMore?: (item: CommonTypes.IDetailedListItem) => void;
}

export class DetailedTestList extends ComponentBase.Component<IDetailedTestListProps, IDetailedTestListState> {

    public componentWillMount(): void {
        this._store = DetailedTestListStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        return (
            <div className="ie11-wrapper">
                <div className="testresults-analytics-report-view-detailedtestlist-container">            
                    <div className="testresults-analytics-report-view-detailedtestlist">
                        {this.state.gridViewDisplayType === CommonTypes.GridViewDisplayType.Loading && <Spinner className="testresults-analytics-report-view-detailedtestlist-loadingspinner" size={SpinnerSize.large} />}
                        {this.state.gridViewDisplayType === CommonTypes.GridViewDisplayType.Initializing &&
                            <AnalyticsUnavailableMessage
                                imageName={Definitions.AnalyticsExtension.ImageInitializingTestResults}
                                message={this.state.totalTestResults ? Utils_String.format(Resources.AnalyticsInitializingTestResultMessage, Utils_Number.formatAbbreviatedNumber(this.state.totalTestResults))
                                            : Resources.AnalyticsInitializingTestResultGenericMessage}
                                cssClass={"detailedtestlist-initializing-message-div"}
                            />
                        }
                        {this.state.gridViewDisplayType === CommonTypes.GridViewDisplayType.Initialized &&
                            <TreeListView
                                className={css(this.props.cssClass, "detailedtestlist-view")}
                                usePresentationStyles={true}
                                columns={this._getColumns()}
                                layoutMode={DetailsListLayoutMode.fixedColumns}
                                items={this.state.items}
                                checkboxVisibility={CheckboxVisibility.hidden}
                                selectionMode={SelectionMode.single}
                                constrainMode={ConstrainMode.unconstrained}
                                compact={true}
                                onGroupCollapsed={this.props.onGroupCollapsed}
                                onGroupExpanded={this.props.onGroupExpanded}
                                onItemInvoked={this.props.onItemInvoked}
                            />
                        }                
                    </div>
                </div>
            </div>            
        );
    } 

    private _getColumns(): IColumn[] {
        // Initializing first (Test Name Column)
        let chartColumns : IColumn[] = [
            {
                fieldName: Resources.ResultGridTitle_Test,
                key: CommonTypes.ColumnIndices.Test.toString(),
                name: Resources.ResultGridTitle_Test,
                ariaLabel: Resources.ResultGridTitle_Test,
                minWidth: 500,
                isResizable: true,                
                columnActionsMode: ColumnActionsMode.disabled,
                isSorted: false,
                onRender: (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    let onClickMethod;
                    switch (item.nodeType) {
                        case TreeNodeType.leaf:
                            onClickMethod = (event: React.MouseEvent<HTMLSpanElement>) => { this.props.onItemInvoked(item); };
                            break;
                        case TreeNodeType.showMore:
                            onClickMethod = (event: React.MouseEvent<HTMLSpanElement>) => { this.props.onDetailedListShowMore(item); };
                            break;
                        default:
                            onClickMethod = null;
                    }
                    return <ClickableLabel
                        value={item.itemName}
                        onClick={onClickMethod}
                        showLoadingOnClick={item.nodeType === TreeNodeType.showMore}
                    />;
                }
            }];
        
        // Pushing chosen outcome columns
        let confValue = this._store.getConfValue();
        if (confValue && confValue.outcomes && confValue.outcomes.length > 0) {
            for (let outcome of confValue.outcomes.sort()) {
                chartColumns.push(this._getColumnPropsForAnOutcome(outcome));
            }
        }

        // Concatenating fixed columns
        return chartColumns.concat([
            {
                fieldName: Resources.PassRate,
                key: CommonTypes.ColumnIndices.Passrate.toString(),
                name: Resources.PassRate,
                ariaLabel: Resources.PassRate,
                minWidth: 100,
                isResizable: true,
                isSorted: this.state.sortedColumn.column === CommonTypes.ColumnIndices.Passrate,
                isSortedDescending: this.state.sortedColumn.sortOrder === CommonTypes.SortOrder.Descending,
                onColumnClick: this._onColumnClicked,
                onRender: (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => {
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.passPercentage}</span> : null;
                }
            },
            {
                
                fieldName: Resources.TotalCountText,
                key: CommonTypes.ColumnIndices.TotalCount.toString(),
                name: Resources.TotalCountText,
                ariaLabel: Resources.TotalCountText,
                minWidth: 100,
                isResizable: true,
                isSorted: this.state.sortedColumn.column === CommonTypes.ColumnIndices.TotalCount,
                isSortedDescending: this.state.sortedColumn.sortOrder === CommonTypes.SortOrder.Descending,
                onColumnClick: this._onColumnClicked,
                onRender: (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => {
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.totalCount}</span> : null;
                }
            },
            {
                fieldName: Resources.AverageDurationText,
                key: CommonTypes.ColumnIndices.AvgDuration.toString(),
                name: Resources.AverageDurationText,
                ariaLabel: Resources.AverageDurationText,
                minWidth: 100,
                isResizable: true,
                isSorted: this.state.sortedColumn.column === CommonTypes.ColumnIndices.AvgDuration,
                isSortedDescending: this.state.sortedColumn.sortOrder === CommonTypes.SortOrder.Descending,
                onColumnClick: this._onColumnClicked,
                onRender: (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => {
                    return item.nodeType !== TreeNodeType.showMore ? <span aria-label={item.avgDurationAriaLabel}>{item.avgDuration}</span> : null;
                }
            }
        ]);
    }

    private _onColumnClicked = (ev?: React.MouseEvent<HTMLElement>, column?: IColumn) => {
        let orderedColumn: CommonTypes.IDetailedListColumn = {} as CommonTypes.IDetailedListColumn;
        if (column) {
            if (column.key === this.state.sortedColumn.column.toString()) {
                orderedColumn.column = this.state.sortedColumn.column;
                orderedColumn.sortOrder = this.state.sortedColumn.sortOrder === CommonTypes.SortOrder.Ascending ? CommonTypes.SortOrder.Descending : CommonTypes.SortOrder.Ascending;
            }
            else {
                orderedColumn.column = Number(column.key);
                orderedColumn.sortOrder = CommonTypes.SortOrder.Descending;     //Default we are keeping as descending.
            }
        }

        if (this.props.onColumnOrderChanged && orderedColumn.column && orderedColumn.sortOrder) {
            this.props.onColumnOrderChanged(orderedColumn);
        }
    }

    private _getColumnPropsForAnOutcome(outcome: CommonTypes.TestOutcome): IColumn {
        let fieldName: string;
        let index: CommonTypes.ColumnIndices;
        let onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => {};

        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                fieldName = Resources.TestOutcome_Failed;
                index = CommonTypes.ColumnIndices.FailedCount;
                onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.failedCount}</span> : null; 
                };
                break;

            case CommonTypes.TestOutcome.Passed:
                fieldName = Resources.TestOutcome_Passed;
                index = CommonTypes.ColumnIndices.PassedCount;
                onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.passedCount}</span> : null; 
                };
                break;

            case CommonTypes.TestOutcome.Inconclusive: 
                fieldName = Resources.TestOutcome_Inconclusive;
                index = CommonTypes.ColumnIndices.InconclusiveCount;
                onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.inconclusiveCount}</span> : null; 
                };
                break;
                
            case CommonTypes.TestOutcome.Aborted:
                fieldName = Resources.TestOutcome_Aborted;
                index = CommonTypes.ColumnIndices.AbortedCount;
                onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.abortedCount}</span> : null; 
                };
                break;

            case CommonTypes.TestOutcome.NotExecuted: 
                fieldName = Resources.TestOutcome_NotExecuted;
                index = CommonTypes.ColumnIndices.NotExecutedCount;
                onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.notExecutedCount}</span> : null; 
                };
                break;

            case CommonTypes.TestOutcome.Error:
                fieldName = Resources.TestOutcome_Error;
                index = CommonTypes.ColumnIndices.ErrorCount;
                onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.errorCount}</span> : null; 
                };
                break;
                
            case CommonTypes.TestOutcome.NotImpacted:
                fieldName = Resources.TestOutcome_NotImpacted;
                index = CommonTypes.ColumnIndices.NotImpactedCount;
                onRender = (item?: CommonTypes.IDetailedListItem, index?: number, column?: IColumn) => { 
                    return item.nodeType !== TreeNodeType.showMore ? <span>{item.notImpactedCount}</span> : null; 
                };
                break; 
        }

        return {
            fieldName: fieldName,
            key: index.toString(),
            name: fieldName,
            ariaLabel: fieldName,
            minWidth: 100,
            isResizable: true,
            isSorted: this.state.sortedColumn.column === index,
            isSortedDescending: this.state.sortedColumn.sortOrder === CommonTypes.SortOrder.Descending,
            onColumnClick: this._onColumnClicked,
            onRender: onRender
        } as IColumn;
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _store: DetailedTestListStore;
}