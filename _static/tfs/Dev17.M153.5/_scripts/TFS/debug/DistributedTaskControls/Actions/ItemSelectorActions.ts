/// <reference types="react" />

import { ActionsHubBase, IActionPayload, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";
import { Item } from "DistributedTaskControls/Common/Item";

import { Action } from "VSS/Flux/Action";

export interface ItemInformation extends IActionPayload {
    data: Item;
    canParticipateInMultiSelect?: boolean;
}

export const CNTRL_KEY = "ctrl-key";
export const SHIFT_KEY = "shift-key";

export interface IKeyDownState extends IActionPayload {
    key: string;
    state: boolean;
}

/**
 *  @brief Action(s) invoked to indicate selection of an item an instance of a two panel selector. 
 */
export class Actions extends ActionsHubBase {

    public initialize() {
        this._selectItem = new Action<ItemInformation>();
        this._deselectItem = new Action<ItemInformation>();
        this._multiSelectItem = new Action<ItemInformation>();
        this._updateSelection = new Action<ItemInformation[]>();
        this._updateKeyDownState = new Action<IKeyDownState>();
        this._clearSelection = new Action<IEmptyActionPayload>();
        this._updateItem = new Action<Item>();
        this._updateItemList = new Action<Item[]>();
        this._setFocusOnLastSelectedItem = new Action<boolean>();
    }

    public static getKey(): string {
        return ActionsKeys.ItemSelectorActions;
    }

    public get selectItem(): Action<ItemInformation> {
        return this._selectItem;
    }

    public get deselectItem(): Action<ItemInformation> {
        return this._deselectItem;
    }

    public get multiSelectItem(): Action<ItemInformation> {
        return this._multiSelectItem;
    }

    public get updateSelection(): Action<ItemInformation[]> {
        return this._updateSelection;
    }

    public get updateKeyDownState(): Action<IKeyDownState> {
        return this._updateKeyDownState;
    }

    public get updateItem(): Action<Item> {
        return this._updateItem;
    }

    public get updateItemList(): Action<Item[]> {
        return this._updateItemList;
    }

    public get clearSelection(): Action<IEmptyActionPayload> {
        return this._clearSelection;
    }

    public get setFocusOnLastSelectedItem(): Action<boolean> {
        return this._setFocusOnLastSelectedItem;
    }

    private _updateItem: Action<Item>;
    private _updateItemList: Action<Item[]>;
    private _selectItem: Action<ItemInformation>;
    private _deselectItem: Action<ItemInformation>;
    private _multiSelectItem: Action<ItemInformation>;
    private _updateSelection: Action<ItemInformation[]>;
    private _updateKeyDownState: Action<IKeyDownState>;
    private _clearSelection: Action<IEmptyActionPayload>;
    private _setFocusOnLastSelectedItem: Action<boolean>;
}


