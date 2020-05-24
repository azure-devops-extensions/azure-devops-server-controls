/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { focusDetailsListRow } from "DistributedTaskControls/Common/ReactFocus";
import { FlatViewTable, IFlatViewTableProps } from "DistributedTaskControls/Components/FlatViewTable";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { CommandButton, IButton } from "OfficeFabric/Button";
import { autobind, Async } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

export interface IProps extends IFlatViewTableProps {
    containerClass?: string;
    flatViewContainerClass?: string;
    onAdd?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    addButtonClass?: string;
    addButtonDisplayValue?: string;
    addButtonDescription?: string;
    setFocusOnRender?: boolean;

    /**
     * component auto focuses on say 'add' button when there are no rows or next 
     * row when the current row is deleted, but there may be scenarios like 
     * filtering on top of rows where we may not want auto foucs to happen
     * 
     * @type {boolean}
     * @memberof IProps
     */
    stopAutoFocus?: boolean;

    focusSelectorOnAddRow?: string;
    disabled?: boolean;
}

export interface IState extends Base.IState {
    setFocusOnRow?: boolean;
    setKey?: string;
}

export class FlatViewTableWithAddButton extends Base.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this._async = new Async();
    }

    public componentWillMount() {
        this.setState({
            setFocusOnRow: this.props.setFocusOnRender,
            setKey: "flat-view-table-with-add-button"
        });
    }

    public componentWillUnmount() {
        this._async.dispose();
    }

    public componentDidUpdate() {

        if (!this.props.stopAutoFocus) {

            if (this._isRowDeleted) {
                if (this._numberOfRows > 0) {

                    // Last row is deleted, focus on add button
                    if (this._selectedRowIndex === this._numberOfRows) {
                        this._setFocusOnAddButton();
                    }

                    // Else focus on just next row
                    else if (this._selectedRowIndex < this._numberOfRows) {
                        focusDetailsListRow(this._table, this._selectedRowIndex);
                    }
                }

                // If all rows are deleted, focus on Add button
                else if (this._numberOfRows === 0) {
                    this._setFocusOnAddButton();
                }

                this._isRowDeleted = false;
            }

            if (this._isRowAdded) {
                if (this._numberOfRows > 0) {
                    this._flatViewTable.scrollToIndex(this.props.rows.length - 1);
                }

                if (this.props.focusSelectorOnAddRow) {
                    this._async.setTimeout(() => {

                        let node = ReactDOM.findDOMNode(this) as HTMLElement;
                        let elements = node.querySelectorAll(Utils_String.format(".ms-DetailsRow[data-item-index='{0}'] {1}", this.props.rows.length - 1, this.props.focusSelectorOnAddRow));
                        if (elements) {

                            let focusableElement = elements[0] as HTMLElement;
                            if (focusableElement) {
                                focusableElement.click();
                            }
                        }

                    }, 0);
                }

                this._isRowAdded = false;
            }

        }
    }

    @autobind
    private _onRowWillUnmount(item: any, index: number) {
        this._isRowDeleted = true;
    }

    public render(): JSX.Element {
        let initialFocusedIndex = this._setInitialFocus();
        this._numberOfRows = this.props.rows.length;

        return (
            <div className={this.props.containerClass}>
                <div
                    className={this.props.flatViewContainerClass}
                    ref={this._resolveRef("_table")}>
                    <FlatViewTable
                        ref={this._resolveRef("_flatViewTable")}
                        layoutMode={this.props.layoutMode}
                        setKey={this.state.setKey}
                        isHeaderVisible={this.props.isHeaderVisible}
                        headers={this.props.headers}
                        rows={this.props.rows}
                        onCellValueChanged={this.props.onCellValueChanged}
                        initialFocusedIndex={initialFocusedIndex}
                        ariaLabel={this.props.ariaLabel}
                        onRowWillUnmount={this._onRowWillUnmount}
                        onRowSelected={this._onRowSelected}
                        disabled={this.props.disabled} />
                </div>
                {!this.props.disabled &&
                    <CommandButton
                        className={this.props.addButtonClass}
                        componentRef={this._resolveRef("_addButton")}
                        iconProps={{ iconName: "Add" }}
                        ariaDescription={this.props.addButtonDescription ? this.props.addButtonDescription : Resources.Add}
                        ariaLabel={this.props.addButtonDisplayValue ? this.props.addButtonDisplayValue : Resources.Add}
                        onClick={this._onAdd}>
                        {this.props.addButtonDisplayValue ? this.props.addButtonDisplayValue : Resources.Add}
                    </CommandButton>
                }
            </div>
        );
    }

    @autobind
    private _onAdd(event: React.MouseEvent<HTMLButtonElement>): void {

        this._isRowAdded = true;

        this.setState({
            setFocusOnRow: true,
            setKey: Utils_String.generateUID()
        });

        if (this.props.onAdd) {
            this.props.onAdd(event);
        }
    }

    @autobind
    private _onRowSelected(rowIndex: number) {
        this._selectedRowIndex = rowIndex;
    }

    private _setInitialFocus(): number {

        // Default is to set focus, but if consumer don't require it on render don't set
        if (this.state.setFocusOnRow === false) {
            return -1;
        }

        let initialFocusedIndex = -1;
        if (this.props.rows && this.props.rows.length > 0) {
            initialFocusedIndex = this._isRowAdded ? this.props.rows.length - 1 : 0;
        }

        return initialFocusedIndex;
    }

    private _setFocusOnAddButton() {
        if (this._addButton) {
            this._addButton.focus();
        }
    }

    private _addButton: IButton;
    private _numberOfRows: number;
    private _table: HTMLElement;
    private _isRowDeleted: boolean = false;
    private _isRowAdded: boolean = false;
    private _selectedRowIndex: number;
    private _flatViewTable: FlatViewTable;

    private _async: Async;
}