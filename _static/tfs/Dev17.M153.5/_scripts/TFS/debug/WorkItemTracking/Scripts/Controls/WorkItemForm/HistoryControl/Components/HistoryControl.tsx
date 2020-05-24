import React = require("react");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

import { autobind } from "OfficeFabric/Utilities";
import { List } from "OfficeFabric/List";
import { KeyCodes } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";
import { HistoryControlBase, IHistoryControlBaseProps, IHistoryControlBaseState } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryControlBase";
import { IHistoryItem, ItemType, ISelectableHistoryItem } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { HistoryItemViewer } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryItemViewer";
import { Fabric } from "OfficeFabric/components/Fabric/Fabric"
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";

// We need to keep this in sync with the .scss file, we need the height to correctly calculate scroll position.
const HistoryGroupHeightInPixel = 40;
const HistoryItemHeightInPixel = 57;
const MinHistoryHeight = 120;

export interface IHistoryControlState extends IHistoryControlBaseState {
    height: number;
}

export class HistoryControl extends HistoryControlBase<IHistoryControlBaseProps, IHistoryControlState> {
    private static PAGE_OFFSET = 10;

    private _listElement: HTMLElement;
    private _list: List;

    public componentDidUpdate(): void {
        if (this._revisionListPanel && this.props.store.isHistoryReloaded()) {
            $(this._revisionListPanel).scrollTop(0);
            this.props.store.resetHistoryReloaded();
        }
    }

    public render(): JSX.Element {
        if (this.state.error) {
            const errorMessage = this.state.error.message ? this.state.error.message : WorkItemTrackingResources.GenericHistoryRetrievalError;

            return (<div className="error">{errorMessage}</div>);
        }

        if (this.state.totalItemCount === 0) {
            return null;
        }

        const style: React.CSSProperties = {
            height: this.state.height
        };

        return (
            <Fabric>
                <div className="workitem-history-control">
                    <div className="history-revision-list"
                        tabIndex={0}
                        role="tree"
                        aria-label={WorkItemTrackingResources.HistoryControlTreeAriaLabel}
                        onFocus={this._onLeftPanelFocus}
                        onBlur={this._onLeftPaneBlur}
                        onKeyDown={this._onLeftPanelKeyDown}
                        style={style}
                        ref={this._getListPanelItem}>
                        <FocusZone direction={FocusZoneDirection.vertical}>
                            <div
                                className="history-item-list"
                                ref={this._resolveListElement}
                                onFocus={this._onListFocus}
                                onBlur={this._onListBlur}>
                                <List
                                    items={this.state.historyItems}
                                    getPageHeight={this._getListPageHeight}
                                    getItemCountForPage={this._getListPageCount}
                                    onRenderCell={this._onRenderCell}
                                    ref={this._resolveList} />
                            </div>
                        </FocusZone>
                        <div />
                    </div>

                    <div id="history-splitter" style={style}></div>

                    <div className="history-details-panel" style={style}>
                        <HistoryItemViewer
                            item={this.state.selectedItem && this.state.selectedItem.itemType === ItemType.HistoryItem ? this.state.selectedItem as IHistoryItem : null}
                            actionCreator={this.props.actionCreator} />
                    </div>
                </div>
            </Fabric>
        );
    }

    public updateHeight(height: number): void {
        this._updateState({ height: height } as IHistoryControlState);
    }

    @autobind
    private _getListPageCount(itemIndex?: number) {
        if (itemIndex != null) {
            const historyItems = this.state.historyItems;
            let pageHeight = 0;
            let itemCount = 0;

            while (pageHeight < this.state.height && itemIndex < historyItems.length) {
                const item = historyItems[itemIndex++];
                pageHeight += this._getItemHeight(item);

                if (pageHeight < this.state.height) {
                    itemCount++;
                }
                else {
                    break;
                }
            }

            return itemCount;
        }

        return Math.floor(this.state.height / HistoryItemHeightInPixel);
    }

    @autobind
    private _getListPageHeight(itemIndex?: number): number {
        if (itemIndex != null) {
            const pageItems = this.state.historyItems.slice(itemIndex, itemIndex + this._getListPageCount(itemIndex));

            const pageHeight = pageItems.reduce((height, item): number => {
                return height + this._getItemHeight(item);
            }, 0);

            return pageHeight;
        }

        // The initial page will contain a group and a number of items
        return HistoryGroupHeightInPixel + Math.min(this._getListPageCount(), this.state.historyItems.length) * HistoryItemHeightInPixel;
    }

    private _getItemHeight(item: ISelectableHistoryItem): number {
        if (item.itemType === ItemType.Group) {
            return HistoryGroupHeightInPixel;
        } else {
            return HistoryItemHeightInPixel;
        }
    }

    private _getItemHeightByIndex(index: number): number {
        index = Math.min(Math.max(0, index), this.state.historyItems.length - 1);
        const item = this.state.historyItems[index];
        return this._getItemHeight(item);
    }

    @autobind
    protected _onRenderCell(item: ISelectableHistoryItem): JSX.Element {
        return item.itemType === ItemType.Group ? this._getGroup(item) : this._getItem(item);
    };

    protected _onStoreChanged() {
        const state = this._getState();

        this._updateState(state);
    }

    protected _getState(): IHistoryControlState {
        let state = super._getState();
        state.height = this.state ? this.state.height : MinHistoryHeight;

        return state as IHistoryControlState;
    }

    private _updateState(state: IHistoryControlState) {
        this.setState(state, () => {
            if (this._list) {
                state = this._getState();
                const selectedIndex = state.historyItems.indexOf(state.selectedItem);
                if (selectedIndex >= 0) {
                    this._list.scrollToIndex(selectedIndex, (itemIndex: number) => this._getItemHeightByIndex(itemIndex));
                }
            }
        });
    }

    @autobind
    private _onLeftPanelFocus(e: React.FocusEvent<HTMLElement>) {
        if (e.target === this._revisionListPanel) {
            if (!e.relatedTarget) {
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.forceFocusSelectedItem();
                return;
            }
        }
        this._onListFocus(e);
    }

    @autobind
    private _onLeftPaneBlur(e: React.FocusEvent<HTMLElement>) {
        this._onListBlur(e);
    }

    @autobind
    private _resolveListElement(item: HTMLElement) {
        this._listElement = item;
    }

    @autobind
    private _resolveList(list: List) {
        this._list = list;
    }

    @autobind
    private _onListFocus(e: React.FocusEvent<HTMLElement>) {
        $(this._listElement).toggleClass("focused", true);
    }

    @autobind
    private _onListBlur(e: React.FocusEvent<HTMLElement>) {
        $(this._listElement).toggleClass("focused", false);
    }

    @autobind
    private _onLeftPanelKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (!this._listContainsFocus() &&
            !$(this._revisionListPanel).is(":focus")) {
            // Use default processing if the list is not the focused element (ie: showmore is focused)
            return;
        }

        switch (e.keyCode) {
            case KeyCodes.UP:
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.selectPreviousItem();
                break;
            case KeyCodes.DOWN:
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.selectNextItem();
                break;
            case KeyCodes.PAGE_UP:
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.selectPreviousItem(HistoryControl.PAGE_OFFSET);
                break;
            case KeyCodes.PAGE_DOWN:
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.selectNextItem(HistoryControl.PAGE_OFFSET);
                break;
            case KeyCodes.HOME:
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.selectFirstItem();
                this._listElement.scrollTop = 0;
                break;
            case KeyCodes.END:
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.selectLastItem();
                this._listElement.scrollTop = this._listElement.clientHeight;
                break;
            case KeyCodes.LEFT:
                e.stopPropagation();
                e.preventDefault();
                this.props.actionCreator.toggleGroup(null, true);
                break;
            case KeyCodes.RIGHT:
                e.stopPropagation();
                e.preventDefault();

                // Only toggle the group on 'right' arrow if the group is selected, don't do this
                // when on a list item.
                let selectedItem = this.state.selectedItem;
                if (selectedItem && selectedItem.itemType == ItemType.Group) {
                    this.props.actionCreator.toggleGroup(null, false);
                }
                break;
            default:
                break;
        }
    }

    private _listContainsFocus(): boolean {
        return $(":focus", this._listElement).length > 0;
    }
}