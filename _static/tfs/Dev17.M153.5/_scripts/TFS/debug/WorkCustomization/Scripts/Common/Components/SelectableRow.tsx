/// <reference types="react" />

import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/SelectableRow";

import * as React from "react";
import { assign, css, shallowCompare, EventGroup } from "OfficeFabric/Utilities";
import { ISelection, SelectionMode, SELECTION_CHANGE } from "OfficeFabric/utilities/selection/interfaces";

export interface ISelectableRowProps extends React.Props<SelectableRow> {
    item: any;
    itemIndex: number;
    selectionMode: SelectionMode;
    selection: ISelection;
    onRenderItemRow?: (item?: any, index?: number) => any;
    getRowAriaLabel?: (item: any) => string;
    onDidMount?: (component: SelectableRow) => void;
}

export interface ISelectableRowSelectionState {
    isSelected: boolean;
    anySelected: boolean;
}

export interface ISelectableRowState {
    selectionState?: ISelectableRowSelectionState;
}

export class SelectableRow extends React.Component<ISelectableRowProps, ISelectableRowState> {
    private _events: EventGroup;

    public refs: {
        root: HTMLElement,
    };

    constructor(props) {
        super(props);

        this.state = {
            selectionState: this._getSelectionState(props)
        };

        this._events = new EventGroup(this);
    }

    public componentDidMount() {
        this._events.on(this.props.selection, SELECTION_CHANGE, this._onSelectionChanged);

        if (this.props.onDidMount != null) {
            this.props.onDidMount(this);
        }
    }

    public componentWillUnmount() {
        this._events.dispose();
    }

    public componentWillReceiveProps(newProps: ISelectableRowProps) {
        this.setState({
            selectionState: this._getSelectionState(newProps)
        });
    }

    public render() {
        const {
            item,
            itemIndex,
            onRenderItemRow,
            selectionMode,
            getRowAriaLabel,
            selection
        } = this.props;
        const { selectionState: { isSelected, anySelected } } = this.state;
        const ariaLabel = getRowAriaLabel ? getRowAriaLabel(item) : null;
        const canSelect = selection.canSelectItem(item);

        return (
            <div
                ref='root'
                role='row'
                aria-label={ariaLabel}
                className={css('ms-SelectableRow ms-DetailsRow ms-fadeIn400', { 'is-selected': isSelected })}
                data-selection-index={itemIndex}
                data-item-index={itemIndex}
                data-automationid='SelectableRow'
                aria-selected={isSelected}>
                {item && onRenderItemRow(item, itemIndex)}
            </div>
        );
    }

    public focus() {
        if (this.refs && this.refs.root) {
            let root: HTMLElement = this.refs.root;
            let target: HTMLElement = root.querySelector("input");

            if (target == null) {
                root.tabIndex = 0;
                root.focus();
            } else {
                target.focus();
            }
        }
    }

    private _getSelectionState(props: ISelectableRowProps): ISelectableRowSelectionState {
        let { itemIndex, selection } = props;

        return {
            isSelected: selection.isIndexSelected(itemIndex),
            anySelected: selection.getSelectedCount() > 0
        };
    }

    private _onSelectionChanged() {
        let selectionState = this._getSelectionState(this.props);

        if (!shallowCompare(selectionState, this.state.selectionState)) {
            this.setState({ selectionState: selectionState });
        }
    }
}
