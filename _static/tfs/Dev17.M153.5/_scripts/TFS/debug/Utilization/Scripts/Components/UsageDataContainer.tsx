/// <reference types="react" />

import React = require("react");

import { CheckboxVisibility, ConstrainMode, SelectionMode, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import Context = require("VSS/Context");
import Performance = require("VSS/Performance");
import CommonResources = require("VSS/Resources/VSS.Resources.Common");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import { IdentityRef } from "VSS/WebApi/Contracts";

import { VssDetailsList } from "VSSUI/VssDetailsList";
import { VssPersona } from "VSSUI/VssPersona";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { IdentityDetailsProvider } from "VSSPreview/Providers/IdentityDetailsProvider";

import Resources = require("Utilization/Scripts/Resources/TFS.Resources.Utilization");
import { CommandUsage, UtilizationColumn, UsageSummaryQueryCriteria } from "Utilization/Scripts/Generated/Contracts";
import { UsageData } from "Utilization/Scripts/Stores/UsageStore";
import { Columns, ColumnKeys, ColumnNames, getStringifiedEntry, getUtilizationColumnFromString } from "Utilization/Scripts/UrlStateHelper";
import Utils_Accessibility = require("VSS/Core/Util/Accessibility");

export interface UsageDataContainerProps extends IBaseProps {
    consumerId: string;
    useNormalizedColumns: boolean;
}

export interface UsageDataContainerState {
    data: CommandUsage[];
    queryCriteria: UsageSummaryQueryCriteria;
    sortColumn: IColumn;
    error: any;
}

export class UsageDataContainer extends BaseComponent<UsageDataContainerProps, UsageDataContainerState> {

    private _dataChangeDelegate: Function;
    private _allColumns: { [key: string]: IColumn };
    private _sortColumn: IColumn;

    constructor(props: UsageDataContainerProps) {
        super(props);

        this._allColumns = this._buildColumns();
        this.state = this._getState();

        this._dataChangeDelegate = Utils_Core.delegate(this, this._onDataChange);
    }

    public render(): JSX.Element {
        if (this.state.data) {
            var displayedRows: CommandUsage[];
            displayedRows = this.state.data;

            var comparer: (a: any, b: any) => number;
            switch (this.state.sortColumn.key) {
                case "user":
                case "userAgent":
                case "service":
                case "application":
                case "command":
                case "ipAddress":
                case "status":
                case "definition":
                case "instance":
                    comparer = Utils_String.ignoreCaseComparer;
                    break;

                case "startTime":
                    comparer = Utils_Date.defaultComparer;
                    break;

                case "usage":
                case "count":
                case "delay":
                    comparer = Utils_Number.defaultComparer;
                    break;
            }

            displayedRows = displayedRows.sort((a, b) => {
                if (this.state.sortColumn.isSortedDescending) {
                    return comparer(b[this.state.sortColumn.key], a[this.state.sortColumn.key]);
                }
                else {
                    return comparer(a[this.state.sortColumn.key], b[this.state.sortColumn.key]);
                }
            });

            let displayedColumns: IColumn[] = [];
            for (let i = 0; i < this.state.queryCriteria.columns.length; i++) {
                displayedColumns.push(this._allColumns[this.state.queryCriteria.columns[i]]);
            }
            displayedColumns.push(this._allColumns[UtilizationColumn.Count]);
            displayedColumns.push(this._allColumns[UtilizationColumn.Usage]);
            displayedColumns.push(this._allColumns[UtilizationColumn.Delay]);

            if (displayedRows.length > 0) {
                let numberOfRecordsString: string = displayedRows.length === 1 ? Resources.UsageDataContainer_NumberOfRecordsSingular : Resources.UsageDataContainer_NumberOfRecords;
                return (
                    <div>
                        {displayedRows.length === this.state.queryCriteria.recordLimit ?
                            <MessageBar messageBarType={MessageBarType.severeWarning}>
                                <FormatComponent format={Resources.Warning_MaximumRecordsReturned}>
                                    {this.state.queryCriteria.recordLimit}
                                </FormatComponent>
                            </MessageBar>
                            :
                            <div className="number-of-records">
                                <FormatComponent format={numberOfRecordsString}>
                                    {displayedRows.length}
                                </FormatComponent>
                            </div>
                        }
                        <VssDetailsList
                            columns={displayedColumns}
                            items={displayedRows}
                            checkboxVisibility={CheckboxVisibility.hidden}
                            selectionMode={SelectionMode.none}
                            constrainMode={ConstrainMode.unconstrained}
                            layoutMode={DetailsListLayoutMode.justified}
                            onColumnHeaderClick={this._onColumnClick.bind(this)}
                        />
                    </div>
                );
            }
            else {
                let queryIncludesTenMinutesAgo: boolean = this.state.queryCriteria.endTime > Utils_Date.addMinutes(new Date(), -10); // queryCriteria.endTime and new Date() are both in CLIENT time
                return <div className="no-list-item" key="no-extension">{queryIncludesTenMinutesAgo ? Resources.UsageDataContainer_NoItemsAndDataMayBeDelayed : Resources.UsageDataContainer_NoItems}</div>;
            }
        } else if (this.state.error) {
            // Error case
            return <MessageBar messageBarType={MessageBarType.error}>{this.state.error.message}</MessageBar>;
        }

        // Loading indicator
        return <Spinner className="loading-spinner" label={Resources.UsageDataContainer_Loading} />;
    }

    public componentDidMount(): void {
        UsageData.addChangedListener(this._dataChangeDelegate);
        Performance.getScenarioManager().recordPageLoadScenario("Utilization", "utilization.load");
    }

    private _announceTableUpdates(): void {
        if (typeof this.state.data !== "undefined" && this.state.data !== null) {
            let message: string;
            if (this.state.data.length > 0) {
                message = this.state.data.length === 1 ? Resources.UsageDataContainer_NumberOfRecordsSingular : Resources.UsageDataContainer_NumberOfRecords;
                message = Utils_String.format(message, this.state.data.length);
            } else {
                message = Resources.UsageDataContainer_NoItemsAndDataMayBeDelayed;
            }

            Utils_Accessibility.announce(message, true);
        }
    }

    public componentWillUnmount(): void {
        UsageData.removeChangedListener(this._dataChangeDelegate);
    }

    protected _onDataChange(): void {
        this.setState(this._getState());
        this._announceTableUpdates();
    }

    protected _getState(): UsageDataContainerState {

        return {
            sortColumn: this._sortColumn,
            data: UsageData.getData(),
            queryCriteria: UsageData.getQueryCriteria(),
            error: UsageData.getError(),
        };
    }

    private _buildColumns(): { [key: string]: IColumn } {
        let columns: { [key: string]: IColumn } = {};

        for (let i in Columns) {
            let col: UtilizationColumn = Columns[i];
            let columnKey: string = ColumnKeys[col];
            columns[col] = {
                key: columnKey,
                fieldName: columnKey,
                name: ColumnNames[col],
                minWidth: 100,
                maxWidth: 300,
                isResizable: true,
                onRender : (item: CommandUsage, index: number) => {
                    return <span>{getStringifiedEntry(item, this.state.queryCriteria, col)}</span>;
                }
            };
        }

        columns[UtilizationColumn.User].maxWidth = 200;
        columns[UtilizationColumn.User].onRender = (item: CommandUsage, index: number) => {
            let identityRef: IdentityRef = {
                id: item["vsid"],
                displayName: item[ColumnKeys[UtilizationColumn.User]],
            } as IdentityRef;

            return <span className="user-cell">
                <div className="persona-wrapper">
                    <VssPersona size="small"
                        identityDetailsProvider={new IdentityDetailsProvider(identityRef, this.props.consumerId)}
                    />
                </div>
                <div>{identityRef.displayName}</div>
            </span>;
        };

        columns[UtilizationColumn.UserAgent].maxWidth = this.props.useNormalizedColumns ? 150 : 450;

        columns[UtilizationColumn.IpAddress].maxWidth = 100;

        columns[UtilizationColumn.StartTime].fieldName = null;
        columns[UtilizationColumn.StartTime].minWidth = 200;
        columns[UtilizationColumn.StartTime].maxWidth = 220;

        columns[UtilizationColumn.Service].minWidth = 160;
        columns[UtilizationColumn.Service].maxWidth = 450;

        columns[UtilizationColumn.Command].minWidth = 160;

        columns[UtilizationColumn.Status].fieldName = null;
        columns[UtilizationColumn.Status].minWidth = 140;
        columns[UtilizationColumn.Status].maxWidth = 240;

        columns[UtilizationColumn.Count].minWidth = 80;
        columns[UtilizationColumn.Count].maxWidth = 100;

        columns[UtilizationColumn.Usage].maxWidth = 120;
        columns[UtilizationColumn.Usage].isSorted = true;
        columns[UtilizationColumn.Usage].isSortedDescending = true;

        columns[UtilizationColumn.Delay].minWidth = 80;
        columns[UtilizationColumn.Delay].maxWidth = 100;

        this._sortColumn = columns[UtilizationColumn.Usage];

        return columns;
    }

    private _onColumnClick(ev?: React.MouseEvent<HTMLElement>, column?: IColumn) {
        let sortOrderAnnouncment: string = Resources.UsageDataContainer_ColumnSortedAscendingAnnouncment;
        for (let colkey in this._allColumns) {
            let c: IColumn = this._allColumns[colkey];
            if (c.key === column.key) {
                if (c.isSorted) {
                    c.isSortedDescending = !c.isSortedDescending;
                    if (c.isSortedDescending) {
                        sortOrderAnnouncment = Resources.UsageDataContainer_ColumnSortedDescendingAnnouncment;
                    }
                } else {
                    c.isSorted = true;
                }
                this._sortColumn = c;
            }
            else {
                c.isSorted = false;
            }
        }

        sortOrderAnnouncment = Utils_String.format(sortOrderAnnouncment, column.name);
        Utils_Accessibility.announce(sortOrderAnnouncment, true);

        this.setState(this._getState());
    }
}



