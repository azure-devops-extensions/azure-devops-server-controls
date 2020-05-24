import React = require("react");
import Utils_Core = require("VSS/Utils/Core");

import { autobind } from "OfficeFabric/Utilities";
import { HistoryControlStore } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Stores/HistoryControlStore";
import { ISelectableHistoryItem } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { HistoryItemGroup } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryItemGroup";
import { HistoryItemSummary } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryItemSummary";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";

export interface IHistoryControlBaseProps {
    store: HistoryControlStore;
    actionCreator: HistoryControlActionsCreator;
    onComponentMount?: () => void;
}

export interface IHistoryControlBaseState {
    historyItems: ISelectableHistoryItem[];
    error: any;
    totalItemCount: number;
    selectedItem: ISelectableHistoryItem;
}

export class HistoryControlBase<TProps extends IHistoryControlBaseProps, TState extends IHistoryControlBaseState> extends React.Component<TProps, TState> {
    protected _revisionListPanel: HTMLElement;

    private _changedDelegate: Function;

    constructor(props: TProps, context?: any) {
        super(props, context);

        this.state = this._getState();
    }

    public componentDidMount(): void {
        if (this.props.onComponentMount) {
            this.props.onComponentMount();
        }
    }

    public componentWillMount(): void {
        this._changedDelegate = Utils_Core.delegate(this, this._onStoreChanged);
        this.props.store.addChangedListener(this._changedDelegate);
    }

    public componentWillUnmount(): void {
        if (this._changedDelegate) {
            this.props.store.removeChangedListener(this._changedDelegate);
            this._changedDelegate = null;
        }
    }

    public render(): JSX.Element {
        return null;
    }

    protected _getItem(val, showSelectedItem: boolean = true) {
        return <HistoryItemSummary
            key={val.editActionSet.getChangedDate().getTime()}
            item={val}
            itemId={val.itemId}
            onItemSelected={this._onItemSelected}
            actionCreator={this.props.actionCreator}
            focusState={val.focusState}
            showSelection={showSelectedItem}
            store={this.props.store}>
        </HistoryItemSummary>;
    }

    protected _getGroup(val, showSelectedItem: boolean = true) {
        return <HistoryItemGroup
            key={val.itemId}
            group={val}
            onItemSelected={this._onItemSelected}
            actionCreator={this.props.actionCreator}
            showSelection={showSelectedItem}
            store={this.props.store}>
        </HistoryItemGroup>;
    }

    @autobind
    protected _onItemSelected(itemId: number): void {
        this.props.actionCreator.selectHistoryItem(itemId);
    }

    @autobind
    protected _getListPanelItem(item: HTMLElement): void {
        this._revisionListPanel = item;
    }

    protected _onStoreChanged() {
        this.setState(this._getState());
    }

    protected _getState(): TState {
        return {
            error: this.props.store.getError(),
            historyItems: this.props.store.getVisibleHistoryItems(),
            totalItemCount: this.props.store.getTotalItemCount(),
            selectedItem: this.props.store.getSelectedItem(),
        } as TState;
    }
}

