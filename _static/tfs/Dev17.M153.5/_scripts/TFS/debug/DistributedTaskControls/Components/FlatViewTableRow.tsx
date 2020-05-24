/// <reference types="react" />

import * as React from "react";

import { FlatViewTextInputCell } from "DistributedTaskControls/Components/FlatViewTextInput";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ICellIndex, IFlatViewTableRow, ContentType } from "DistributedTaskControls/Common/FlatViewTableTypes";

import { IColumn, IDetailsRowProps, DetailsRow } from "OfficeFabric/DetailsList";
import { EventGroup } from "OfficeFabric/Utilities";
import { SELECTION_CHANGE } from "OfficeFabric/utilities/selection/interfaces";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewTableRow";

export interface IFlatViewRowProps extends Base.IProps {
    rowProps: IDetailsRowProps;
    onCellValueChanged: (value: string | number, cellIndex: ICellIndex) => void;
    onRowSelected?: (index: number) => void;
    disabled?: boolean;
}

export interface IFlatViewRowState {
    /**
     * is Active takes care of whether the row has focus or is selected
     */
    isActive: boolean;

    /**
     * isRowSelected only deals with the row selection
     */
    isRowSelected: boolean;
}

export class FlatViewTableRow extends Base.Component<IFlatViewRowProps, IFlatViewRowState> {

    constructor(props: IFlatViewRowProps) {
        super(props);
        this.state = { isActive: false, isRowSelected: false };
        this._events = new EventGroup(this);
    }

    public componentDidMount() {
        this._events.on(this.props.rowProps.selection, SELECTION_CHANGE, this._onSelectionChanged);
    }

    public componentWillUnmount() {
        this._events.dispose();
    }

    private _onMouseOver() {

        this._isHovered = true;

        // If row is selected, onSelectionChanged would have already set it to active, ignore the event
        if (this.props.rowProps.selection.isIndexSelected(this.props.rowProps.itemIndex)) {
            return;
        }

        this.setState({ isActive: true });
    }

    private _onMouseLeave() {
        this._isHovered = false;
        this._setBlur();
    }

    private _setBlur() {

        // If row is selected, onSelectionChanged would have already set it to active, ignore the event
        if (this.props.rowProps.selection.isIndexSelected(this.props.rowProps.itemIndex) || this._isHovered === true) {
            return;
        }

        this.setState({ isActive: false });
    }

    private _onSelectionChanged() {

        // If row is selected, make it active else not active
        if (this.props.rowProps.selection.isIndexSelected(this.props.rowProps.itemIndex)) {

            if (this.props.onRowSelected) {
                this.props.onRowSelected(this.props.rowProps.itemIndex);
            }

            if (this.state.isActive !== true) {
                this.setState({ isActive: true, isRowSelected: true });
            }
        }
        else {
            if (this.state.isActive !== false) {
                this.setState({ isActive: false, isRowSelected: false });
            }
        }
    }

    private _renderCell = (item: IFlatViewTableRow, rowIndex: number, column: IColumn) => {
        let cellElement: JSX.Element = {} as JSX.Element;

        if (item && item.cells) {
            let cells = item.cells;

            let cell = cells[column.key];
            let cellContent = cell.content;
            let cellContentType = cell.contentType;

            switch (cellContentType) {
                case ContentType.SimpleText:
                case ContentType.PasswordText:
                    cellElement = (
                        <FlatViewTextInputCell
                            cssClass={cell.cssClass}
                            placeHolder={cell.placeHolder}
                            type={(cell.contentType === ContentType.PasswordText) ? "password" : "text"}
                            value={cell.content as string}
                            cellIndex={
                                { rowIndex: rowIndex, columnKey: column.key }
                            }
                            onValueChanged={this.props.onCellValueChanged}
                            rowHasErrors={cell.contentHasErrors}
                            rowHighLighted={!!this.state.isActive}
                            controlIconClassName={cell.controlIcon}
                            controlTitle={cell.controlTitle}
                            disabled={cell.isTextDisabled || this.props.disabled}
                            onControlClicked={
                                (cellIndex: ICellIndex) => {
                                    if (!!cell.controlClickCallback) {
                                        cell.controlClickCallback({
                                            rowIndex: cellIndex.rowIndex,
                                            columnKey: cellIndex.columnKey
                                        });
                                    }
                                }
                            }
                            ariaLabel={cell.ariaLabel || column.name}
                            ignoreParentHighlight={cell.ignoreParentHighlight} />
                    );
                    break;

                case ContentType.JsxElement:
                    cellElement = cellContent && React.cloneElement(cellContent as JSX.Element, { rowSelected: !!this.state.isActive, ariaLabel: cell.ariaLabel || column.name });
                    break;

                default:
                    break;
            }
        }

        return cellElement;
    }

    public render(): JSX.Element {

        return (
            <div
                className={this.state.isRowSelected ? "is-selected" : ""}
                onMouseOver={() => this._onMouseOver()}
                onBlur={() => this._setBlur()}
                onMouseLeave={() => this._onMouseLeave()}>
                <DetailsRow {...this.props.rowProps} onRenderItemColumn={this._renderCell} />
            </div>
        );
    }

    private _events: EventGroup;
    private _isHovered: boolean;
}