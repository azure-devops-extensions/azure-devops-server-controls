import React = require("react");
import Utils_Core = require("VSS/Utils/Core");

import { autobind } from "OfficeFabric/Utilities";
import { IHistoryItemGroup } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";
import { HistoryControlStore } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Stores/HistoryControlStore";
import { KeyCodes } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";

export interface IHistoryItemGroupProps {
    group: IHistoryItemGroup;
    actionCreator: HistoryControlActionsCreator;
    onItemSelected: (itemId: number) => void;
    showSelection: boolean;
    store: HistoryControlStore;
}

export interface IHistoryItemGroupState {
    isSelected: boolean;
    isCollapsed: boolean;
}

export class HistoryItemGroup extends React.Component<IHistoryItemGroupProps, IHistoryItemGroupState> {
    static CSS_HEADER_SELECTED = " header header-selected";
    static CSS_HEADER_UNSELECTED = "header";
    static CSS_GROUP_COLLAPSED = "icon bowtie-icon bowtie-chevron-right";
    static CSS_GROUP_EXPANDED = "icon bowtie-icon bowtie-chevron-down";

    private _groupHeader: HTMLElement;
    private _changedDelegate: Function;

    constructor(props: IHistoryItemGroupProps, context?: any) {
        super(props, context);

        this.state = this._getState();
    }

    public componentDidMount() {
        this._setFocus();
    }

    public componentDidUpdate() {
        this._setFocus();
    }

    public shouldComponentUpdate(newProps: IHistoryItemGroupProps, newState: IHistoryItemGroupState): boolean {
        if (newState
            && (newState.isSelected !== this.state.isSelected
                || newState.isCollapsed !== this.state.isCollapsed)) {
            return true;
        }

        return false;
    }

    public render(): JSX.Element {
        var collapseIconClass = this.state.isCollapsed ?
            HistoryItemGroup.CSS_GROUP_COLLAPSED
            : HistoryItemGroup.CSS_GROUP_EXPANDED;

        let className = this.state.isSelected && this.props.showSelection ? HistoryItemGroup.CSS_HEADER_SELECTED
            : HistoryItemGroup.CSS_HEADER_UNSELECTED;

        let uid = "group-" + this.props.group.groupId;

        return (
            <div className="history-group">
                <div
                    className={className}
                    onClick={this._onClick}
                    onKeyDown={this._onKeyDown}
                    ref={this._getGroupElement}
                    role="treeitem"
                    aria-labelledby={uid}
                    aria-expanded={!this.state.isCollapsed}
                    tabIndex={-1}>
                    <span className={collapseIconClass} />
                    <span className="group-title" id={uid}>{this.props.group.groupName}</span>
                </div>
            </div>
        );
    }

    public componentWillMount() {
        this._changedDelegate = Utils_Core.delegate(this, this._onStoreChanged);
        this.props.store.addChangedListener(this._changedDelegate);
    }

    public componentWillUnmount(): void {
        if (this._changedDelegate) {
            this.props.store.removeChangedListener(this._changedDelegate);
            this._changedDelegate = null;
        }
    }

    private _onStoreChanged(data?: any) {
        this.setState(this._getState());
    }

    private _getState(): IHistoryItemGroupState {
        return {
            isSelected: this.props.group.isSelected,
            isCollapsed: this.props.group.isCollapsed
        };
    }

    private _setFocus() {
        if (this.props.group.isSelected) {
            this._groupHeader.focus();
        }
    }

    @autobind
    private _onClick(e: React.MouseEvent<HTMLElement>) {
        this.props.onItemSelected(this.props.group.itemId);
        this.props.actionCreator.toggleGroup(this.props.group.groupId, !this.state.isCollapsed);
    }

    @autobind
    private _onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        switch (e.keyCode) {
            case KeyCodes.LEFT:
                this.props.actionCreator.toggleGroup(this.props.group.groupId, true);
                break;
            case KeyCodes.RIGHT:
                this.props.actionCreator.toggleGroup(this.props.group.groupId, false);
                break;
            default:
                break;
        }
    }

    @autobind
    private _getGroupElement(item: HTMLElement): void {
        this._groupHeader = item;
    }
}

