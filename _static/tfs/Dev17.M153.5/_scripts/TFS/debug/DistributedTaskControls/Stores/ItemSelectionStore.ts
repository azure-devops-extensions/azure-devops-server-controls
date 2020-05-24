/// <reference types="react" />

import * as React from "react";

import { Actions, IKeyDownState, ItemInformation } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { CNTRL_KEY, SHIFT_KEY } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";

import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";

export interface IOptions {

    /**
     * Selected items.
     */
    defaultSelection: ItemInformation[];

    /**
     * Set focus on last selected Item
     */
    setFocusOnLastSelectedItem?: boolean;
}

/** 
 * Selection state for a two panel selector.
 */
export interface IState extends ComponentBase.IState {

    /**
     * Currently selected item.
     */
    selectedItems: ItemInformation[];

    /**
     * Previously selected item.
     */
    previouslySelectedItems: ItemInformation[];

    /**
     * Set focus on last selected Item
     */
    setFocusOnLastSelectedItem: boolean;
}

/**
 * Encapsulates the store to handle selection for the two panel selector. 
 */
export class Store extends StoreCommonBase.StoreBase {

    constructor(options: IOptions) {
        super();

        this._multiSelectKeysState[CNTRL_KEY] = false;
        this._multiSelectKeysState[SHIFT_KEY] = false;

        this._defaultSelection = options.defaultSelection || [];
        this._state = {
            selectedItems: this._defaultSelection,
            previouslySelectedItems: [],
            setFocusOnLastSelectedItem: options.setFocusOnLastSelectedItem
        };
    }

    public initialize(instanceId?: string) {
        /**
         * Please make sure to add removeListener for actions added in here in the dispose method.
         */
        this._actions = ActionsHubManager.GetActionsHub<Actions>(Actions, instanceId);
        this._actions.selectItem.addListener(this._handleSelectItem);
        this._actions.deselectItem.addListener(this._handleDeselectItem);
        this._actions.updateSelection.addListener(this._updateSelection);
        this._actions.multiSelectItem.addListener(this._handleMultiSelectItem);
        this._actions.updateKeyDownState.addListener(this._updateKeyDownState);
        this._actions.updateItem.addListener(this._updateItem);
        this._actions.updateItemList.addListener(this._updateItemList);
        this._actions.clearSelection.addListener(this._clearSelection);
        this._actions.setFocusOnLastSelectedItem.addListener(this._setFocusOnLastSelectedItem);
    }

    protected disposeInternal(): void {
        this._actions.selectItem.removeListener(this._handleSelectItem);
        this._actions.deselectItem.removeListener(this._handleDeselectItem);
        this._actions.updateSelection.removeListener(this._updateSelection);
        this._actions.multiSelectItem.removeListener(this._handleMultiSelectItem);
        this._actions.updateKeyDownState.removeListener(this._updateKeyDownState);
        this._actions.updateItem.removeListener(this._updateItem);
        this._actions.updateItemList.removeListener(this._updateItemList);
        this._actions.clearSelection.removeListener(this._clearSelection);
        this._actions.setFocusOnLastSelectedItem.removeListener(this._setFocusOnLastSelectedItem);
    }

    public static getKey(): string {
        return "Common.ItemSelectionStore";
    }

    public getState(): IState {
        return this._state;
    }

    public getSelectedItem(): Item {
        return this._getLastItem(this.getState().selectedItems);
    }

    public getPreviouslySelectedItem(): Item {
        return this._getLastItem(this.getState().previouslySelectedItems);
    }

    public isItemInSelectedGroup(item: Item): boolean {
        if (item) {
            return (!!this._state.selectedItems) &&
                (this._state.selectedItems.length > 0) &&
                this._state.selectedItems.some((selectedItem: ItemInformation) => {
                    return (!!selectedItem.data && selectedItem.data.getKey() === item.getKey());
                });
        }
        else {
            return false;
        }
    }

    public isItemInPreviouslySelectedGroup(item: Item): boolean {
        if (item) {
            return (!!this._state.previouslySelectedItems) &&
                (this._state.previouslySelectedItems.length > 0) &&
                this._state.previouslySelectedItems.some((previouslySelectedItem: ItemInformation) => {
                    return (!!previouslySelectedItem.data && previouslySelectedItem.data.getKey() === item.getKey());
                });
        }
        return false;
    }

    public getKeyDownState(key: string): boolean {
        return this._multiSelectKeysState[key];
    }

    public shouldClearSelection(): boolean {
        return (this._state.selectedItems && this._state.selectedItems.length === 0 && this._state.previouslySelectedItems && this._state.previouslySelectedItems.length === 0);
    }

    private _getLastItem(items: ItemInformation[]): Item {
        if (!items || items.length === 0) {
            return null;
        }

        return items[0].data;
    }

    private _handleSelectItem = (selectedItemInformation: ItemInformation) => {
        if (selectedItemInformation.data) {
            Diag.logInfo("[ItemSelectionStore._handleSelectItem]: Selecting a new item. ItemKey - " +
                selectedItemInformation.data.getKey());
        }

        this._singleSelectItem(selectedItemInformation);

        this.emitChanged();
    }

    private _updateSelection = (selectedItems: ItemInformation[]) => {
        this._state.previouslySelectedItems = [];
        this._state.previouslySelectedItems.push.apply(this._state.previouslySelectedItems, this._state.selectedItems);

        this._state.selectedItems = [];

        if (selectedItems && selectedItems.length > 0) {
            this._state.selectedItems.push.apply(this._state.selectedItems, selectedItems);
        } else if (this._defaultSelection && this._defaultSelection.length > 0) {
            this._state.selectedItems.push(this._defaultSelection[0]);
        }

        this.emitChanged();
    }

    private _handleDeselectItem = (deselectedItemInformation: ItemInformation) => {

        if (this.isItemInSelectedGroup(deselectedItemInformation.data)) {
            Diag.logInfo("[ItemSelectionStore._handleDeselectItem]: Deselecting an item. ItemKey - " +
                deselectedItemInformation.data.getKey());

            this._state.previouslySelectedItems.push(deselectedItemInformation);
            this._state.selectedItems = this._state.selectedItems.filter((item: ItemInformation) => {
                return (item.data.getKey() !== deselectedItemInformation.data.getKey());
            });

            // EmitChanged is done inside if condition since nothing has changed otherwise.
            this.emitChanged();
        } else {
            Diag.logWarning("[ItemSelectionStore._handleDeselectItem]: Atempt to deselect and item which is not part of selected item group. ItemKey - " +
                deselectedItemInformation.data.getKey());
        }
    }

    private _isFirstSelectedItemMultiSelectable(selectedItemInformation: ItemInformation): boolean {
        // If we have selection and first item supports multi-select then return true.
        return (this._state.selectedItems && this._state.selectedItems[0]
            && !!this._state.selectedItems[0].canParticipateInMultiSelect
            && !!selectedItemInformation.canParticipateInMultiSelect);
    }

    private _handleMultiSelectItem = (selectedItemInformation: ItemInformation) => {
        if (this._isFirstSelectedItemMultiSelectable(selectedItemInformation)) {
            if (this._items.length > 0 && this._multiSelectKeysState[SHIFT_KEY]) {

                let selectedItems: ItemInformation[] = [];
                let newSelectionItems: Item[] = [];
                this._state.previouslySelectedItems = [];

                // Multiselect - add all items between first selected item and current item to selection.
                let currentItemIndex = Utils_Array.findIndex(this._items, (item: Item) => {
                    return (item.getKey() === selectedItemInformation.data.getKey());
                });

                let firstSelectedItemIndex = Utils_Array.findIndex(this._items, (item: Item) => {
                    return (item.getKey() === this._state.selectedItems[0].data.getKey());
                });

                if (firstSelectedItemIndex > currentItemIndex) {
                    newSelectionItems = this._items.slice(currentItemIndex, firstSelectedItemIndex + 1);
                    newSelectionItems.reverse();
                }
                else {
                    newSelectionItems = this._items.slice(firstSelectedItemIndex, currentItemIndex + 1);
                }

                newSelectionItems.map((item: Item) => {
                    selectedItems.push({ data: item, canParticipateInMultiSelect: true });
                });

                this._updateSelection(selectedItems);
            }
            else {
                // Multiselect with no shift key, add current item to selection.
                if (this.isItemInSelectedGroup(selectedItemInformation.data)) {
                    // If item is already selected, de-select it.
                    this._handleDeselectItem(selectedItemInformation);
                }
                else {
                    this._state.selectedItems.push(selectedItemInformation);
                }
            }
        } else {
            // Selection does not exist or multi-select not supported, do single-selection.
            this._singleSelectItem(selectedItemInformation);
        }

        this.emitChanged();
    }

    private _singleSelectItem(selectedItemInformation: ItemInformation): void {
        if (!selectedItemInformation.data) {
            this._state.selectedItems = [];
            return;
        }

        if (this._state.selectedItems &&
            this._state.selectedItems.length === 1 &&
            this._state.selectedItems[0].data.getKey() === selectedItemInformation.data.getKey()) {
            return;
        }

        this._state.previouslySelectedItems = [];
        this._state.previouslySelectedItems.push.apply(this._state.previouslySelectedItems, this._state.selectedItems);

        this._state.selectedItems = [];
        this._state.selectedItems.push(selectedItemInformation);
    }

    private _updateKeyDownState = (keyDownState: IKeyDownState) => {
        this._multiSelectKeysState[keyDownState.key] = keyDownState.state;
        // No emitChanged required here since there no UI change is expected to happen
    }

    private _updateItemList = (itemList: Item[]) => {
        // List of all selectable items, this should be set for bulk selection to work.
        this._items = itemList;
    }

    private _updateItem = (item: Item) => {
        const selectedItemChanged = this._updateSelectedItems(this._state.selectedItems, item);
        const itemsChanged = this._updateItems(this._items, item);
        if (selectedItemChanged || itemsChanged) {
            this.emitChanged();
        }
    }

    private _clearSelection = () => {
        this._state.selectedItems = [];
        this._state.previouslySelectedItems = [];
        this.emitChanged();
    }

    private _setFocusOnLastSelectedItem = (value: boolean) => {
        this._state.setFocusOnLastSelectedItem = value;
    }

    private _updateItems(items: Item[], item: Item): boolean {
        let existingIndex = -1;
        let existingItems = items.filter((selectedItem, index) => {
            const found = selectedItem.getKey() === item.getKey();
            if (found) {
                existingIndex = index;
            }

            return found;
        });

        if (existingIndex > -1) {
            items[existingIndex] = item;
            return true;
        }

        return false;
    }

    private _updateSelectedItems(items: ItemInformation[], item: Item): boolean {
        let existingIndex = -1;
        let existingItems = items.filter((selectedItem, index) => {
            const found = selectedItem.data && selectedItem.data.getKey() === item.getKey();
            if (found) {
                existingIndex = index;
            }

            return found;
        });

        if (existingIndex > -1) {
            items[existingIndex] = { data: item };
            return true;
        }

        return false;
    }

    private _items: Item[] = [];
    private _defaultSelection: ItemInformation[];
    private _actions: Actions;
    private _multiSelectKeysState: IDictionaryStringTo<boolean> = {};
    private _state: IState = {} as IState;
}
