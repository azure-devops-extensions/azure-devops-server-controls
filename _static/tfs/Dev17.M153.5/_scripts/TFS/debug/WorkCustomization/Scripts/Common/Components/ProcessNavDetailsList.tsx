/// <reference types="react" />

import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/ProcessNavDetailsList";

import * as React from "react";
import { autobind, css, IRenderFunction } from "OfficeFabric/Utilities";
import { Selection, ISelectionOptions } from "OfficeFabric/utilities/selection/Selection";
import { IObjectWithKey } from "OfficeFabric/utilities/selection/interfaces";
import { IViewport } from "OfficeFabric/utilities/decorators/withViewport";
import { ConstrainMode, DetailsListLayoutMode, DetailsList, IColumn, SelectionMode, CheckboxVisibility, IDetailsRowProps } from "OfficeFabric/DetailsList";

export interface IProcessesNavDetailsListRow extends IObjectWithKey {
    rowInvokeUrl?: string;
}

export interface IProcessNavDetailsListProps {
    ariaLabelForGrid: string;
    className?: string;
    containerClassName?: string;
    columns?: IColumn[];
    onRenderRow?: IRenderFunction<IDetailsRowProps>;
    initialFocusedIndex?: number;
    items: IProcessesNavDetailsListRow[];
    isHeaderVisible?: boolean;
    selectionPreservedOnEmptyClick?: boolean;
    onRowDidMount?: (item?: any, index?: number) => void;
    onRowWillUnmount?: (item?: any, index?: number) => void;
    onItemContextMenu?: (item?: any, index?: number, ev?: Event) => void;
    onActiveItemChanged?: (item?: any, index?: number, ev?: React.FocusEvent<HTMLElement>) => void;
    setKey?: string;
}

export class ProcessNavDetailsList extends React.Component<IProcessNavDetailsListProps, {}>
{
    public refs: {
        root: HTMLElement
    };

    private _selection: Selection = new Selection();
    private _selectedKeys: string[] = [];
    private _initialFocusedIndex?: number;
    private _lastInitialFocusedIndex?: number;

    constructor(props: IProcessNavDetailsListProps) {
        super(props);

        this._initialFocusedIndex = props.initialFocusedIndex;
        this._lastInitialFocusedIndex = props.initialFocusedIndex;
        if (props.initialFocusedIndex != null && props.initialFocusedIndex > -1) {
            this._selection.setItems(props.items, false);
            this._selection.setIndexSelected(props.initialFocusedIndex, true, true);
        }
    }

    render(): JSX.Element {
        let initialIndex = this._initialFocusedIndex;

        if (this._initialFocusedIndex != null && this._initialFocusedIndex > -1 &&
            this.props.items != null && this.props.items.length > initialIndex) {
            this._selectedKeys = ["" + this.props.items[initialIndex].key];
            this._initialFocusedIndex = null;
        }

        this._selectedKeys.forEach((key) => {
            this._selection.setKeySelected(key, true, true);
        });

        return <div className={this.props.containerClassName} data-is-scrollable={true} >
            <DetailsList
                componentRef={this._onRef}
                items={this.props.items}
                columns={this.props.columns}
                onRenderRow={this.props.onRenderRow}
                onRowDidMount={this.props.onRowDidMount}
                onRowWillUnmount={this.props.onRowWillUnmount}
                constrainMode={ConstrainMode.unconstrained}
                selectionMode={SelectionMode.single}
                selection={this._selection}
                checkboxVisibility={CheckboxVisibility.hidden}
                isHeaderVisible={this.props.isHeaderVisible}
                setKey={this.props.setKey}
                selectionPreservedOnEmptyClick={this.props.selectionPreservedOnEmptyClick}
                className={css("process-nav-details-list", this.props.className)}
                onItemInvoked={this._onItemInvoked}
                onActiveItemChanged={this.props.onActiveItemChanged}
                initialFocusedIndex={initialIndex}
                onItemContextMenu={this.props.onItemContextMenu}
                ariaLabelForGrid={this.props.ariaLabelForGrid}
            />
        </div>;
    }

    public getState() {
        return {};
    }

    public componentWillReceiveProps(newProps: IProcessNavDetailsListProps) {

        if (!newProps.items) {
            return;
        }

        let prevLength = this.props.items ? this.props.items.length : -1;
        if (newProps.initialFocusedIndex !== null &&
            (newProps.initialFocusedIndex !== this._lastInitialFocusedIndex ||
                newProps.items.length !== prevLength ||
                this.props.setKey !== newProps.setKey)) {
            this._initialFocusedIndex = newProps.initialFocusedIndex;
            this._lastInitialFocusedIndex = newProps.initialFocusedIndex;
        }
    }

    public componentWillUpdate(nextProps: IProcessNavDetailsListProps) {
        this._selectedKeys = [];
        if (this._selection.getSelectedCount() > 0) {
            this._selection.getSelection().forEach((item) => {
                this._selectedKeys.push("" + item.key);
            });
        }
        this._selection.setItems(nextProps.items, true);
    }

    public componentDidUpdate(prevProps: IProcessNavDetailsListProps, prevState) {
        if (prevProps.setKey === "rules-grid-delete") {
            this._selection.setKeySelected("" + this.props.items[this.props.initialFocusedIndex].key, true, true);
        }
    }

    @autobind
    private _onRef(ref: DetailsList) {
        if (ref != null) {
            this.refs = { root: ref["_root"].value as HTMLElement };
        }
    }

    @autobind
    private _onItemInvoked(row: IProcessesNavDetailsListRow, index: number) {

        if (row == null || !row.rowInvokeUrl) {
            return;
        }

        window.location.href = row.rowInvokeUrl;
    }
}