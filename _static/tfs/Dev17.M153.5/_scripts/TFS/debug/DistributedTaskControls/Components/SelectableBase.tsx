/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

export interface ISelectableBaseState {
    isSelected?: boolean;
}

export abstract class SelectableBase<P extends ComponentBase.IProps, S extends ISelectableBaseState> extends ComponentBase.Component<P, S> {

    public componentWillMount() {
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, this.props.instanceId);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, this.props.instanceId);

        this.setState({
            isSelected: this._itemSelectionStore.isItemInSelectedGroup(this.getItem())
        } as S);
    }

    public componentDidMount() {
        this._itemSelectionStore.addChangedListener(this._onchange);

        // Focus the item that got selected in the last
        // Calling it here as well since componentDidUpdate doesn't gets called
        // on first mount.
        this._focusLastSelectedItem();
    }

    public componentWillUnmount() {
        this._itemSelectionStore.removeChangedListener(this._onchange);
    }

    public componentDidUpdate() {
        if (this._trySetFocus) {
            // Focus the item that got selected in the last
            this._focusLastSelectedItem();
            this._trySetFocus = false;
        }
    }

    public abstract render(): JSX.Element;

    protected abstract getItem(): Item;

    protected abstract getElement(): HTMLElement;

    protected getItemSelectionStore(): ItemSelectionStore {
        return this._itemSelectionStore;
    }

    protected getItemSelectorActions(): ItemSelectorActions {
        return this._itemSelectorActions;
    }

    private _focusLastSelectedItem(): void {
        if (!this._itemSelectionStore.getState().setFocusOnLastSelectedItem) {
            return;
        }

        let selectedItems = this._itemSelectionStore.getState().selectedItems;

        if (!selectedItems || selectedItems.length === 0) {
            return;
        }

        if (!!(selectedItems[selectedItems.length - 1].data) &&
            selectedItems[selectedItems.length - 1].data.getKey() === this.getItem().getKey()) {
            this._setFocus();
        }
    }

    private _setFocus() {

        if (document.activeElement !== this.getElement() && !!this.getElement() && this.state.isSelected) {

            // Set tab index on the element so that it can receive focus.
            this.getElement().setAttribute("tabindex", "-1");

            setTimeout(() => {
                if (!!this.getElement()) {
                    this.getElement().focus();
                }
            }, 10);
        }
    }

    private _onchange = () => {

        // The overview needs to re-render only if it was previously selected (to remove the selection attribute) or it is currently selected (to add the selection attribute)
        // or in response to clear selection
        let item = this.getItem();
        let isSelected = this._itemSelectionStore.isItemInSelectedGroup(item);
        if (isSelected || this._itemSelectionStore.isItemInPreviouslySelectedGroup(item)) {
            this._trySetFocus = true;
            this.setState({
                isSelected: isSelected
            } as S);
        }
        else if (this._itemSelectionStore.shouldClearSelection()){
            this.setState({
                isSelected: false
            } as S);
        }
    }

    private _itemSelectionStore: ItemSelectionStore;
    private _itemSelectorActions: ItemSelectorActions;
    private _trySetFocus: boolean;
}
