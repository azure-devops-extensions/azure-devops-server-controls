/// <reference types="jquery" />
/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ICellIndex, IFlatViewColumn, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewTableRow } from "DistributedTaskControls/Components/FlatViewTableRow";

import { CheckboxVisibility, ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, IDetailsRowProps } from "OfficeFabric/DetailsList";
import { SelectionMode } from "OfficeFabric/Selection";

import * as Utils_String from "VSS/Utils/String";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewTable";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IFlatViewTableProps extends Base.IProps {
    headers: IFlatViewColumn[];
    rows: IFlatViewTableRow[];
    onCellValueChanged: (value: string | number, cellIndex: ICellIndex) => void;
    onRowWillUnmount?: (item: any, index: number) => void;
    isHeaderVisible?: boolean;
    initialFocusedIndex?: number;
    ariaLabel?: string;
    setKey?: string;
    onRowSelected?: (index: number) => void;
    layoutMode?: DetailsListLayoutMode;
    disabled?: boolean;
}

export class FlatViewTable extends Base.Component<IFlatViewTableProps, Base.IStateless> {

    public render(): JSX.Element {

        let className = FlatViewTable._flatViewContainerTableClassName + ((!!this.props.cssClass) ? " " + this.props.cssClass : "");

        return (
            <div className={className} ref={FlatViewTable._flatViewContainerTableClassName}>
                <VssDetailsList
                    ref={this._resolveRef("_detailsList")}
                    compact={true}
                    selectionMode={SelectionMode.single}
                    setKey={this.props.setKey}
                    className="flat-view-table"
                    items={this.props.rows}
                    initialFocusedIndex={this.props.initialFocusedIndex >= 0 ? this.props.initialFocusedIndex : -1}
                    columns={this._getColumnList()}
                    layoutMode={this._getLayoutMode()}
                    checkboxVisibility={CheckboxVisibility.hidden}
                    isHeaderVisible={this.props.isHeaderVisible}
                    constrainMode={ConstrainMode.unconstrained}
                    onRenderRow={this._onRenderRow}
                    getRowAriaLabel={this._getRowAriaLabel}
                    onRowWillUnmount={this.props.onRowWillUnmount}
                    ariaLabelForGrid={this.props.ariaLabel} />
            </div>
        );
    }

    public scrollToIndex(index: number): void {
        if (this._detailsList) {

            if (this._detailsList.scrollToIndex) {
                this._detailsList.scrollToIndex(index);
            }
        }
    }

    private _getRowAriaLabel = (item: IFlatViewTableRow): string => {
        return item.rowAriaLabel || Utils_String.empty;
    }

    private _getLayoutMode(): DetailsListLayoutMode {
        let layoutMode = this.props.layoutMode;

        if (layoutMode === undefined || layoutMode === null) {
            layoutMode = DetailsListLayoutMode.justified;
        }

        return layoutMode;
    }

    private _getColumnList(): IColumn[] {
        let columns: IColumn[] = [];

        for (const column of this.props.headers) {

            columns.push({
                key: column.key,
                name: column.name,
                fieldName: column.name,
                minWidth: (typeof column.minWidth === "number") ? column.minWidth : 100,
                maxWidth: (typeof column.maxWidth === "number") ? column.maxWidth : 400,
                isResizable: column.isFixedColumn ? !column.isFixedColumn : true,
                className: FlatViewTable._flatViewTableCellClassName,
                isIconOnly: column.isIconOnly,
                iconClassName: column.iconClassName,
                iconName: column.iconName,
                onColumnClick: column.onColumnClick,
                isSorted: column.isSorted,
                columnActionsMode: column.columnActionsMode,
                isSortedDescending: column.isSortedDescending,
                headerClassName: column.headerClassName,
                isMultiline: column.isMultiline,
                ariaLabel: column.ariaLabel || column.name
            });
        }

        return columns;
    }

    private _onRenderRow = (props: IDetailsRowProps) => {
        let rowId = "flatViewRow-" + props.itemIndex;
        return (
            <div className="fabric-style-overrides">
                <div className="flat-view-row" key={rowId} >
                    <FlatViewTableRow
                        rowProps={props}
                        onCellValueChanged={this.props.onCellValueChanged}
                        onRowSelected={this.props.onRowSelected}
                        disabled={this.props.disabled} />
                </div>
            </div>
        );
    }

    private static _flatViewTableCellClassName: string = "flat-view-table-cell";
    private static _flatViewContainerTableClassName: string = "flat-view-table-container";

    private _detailsList: DetailsList;
}
