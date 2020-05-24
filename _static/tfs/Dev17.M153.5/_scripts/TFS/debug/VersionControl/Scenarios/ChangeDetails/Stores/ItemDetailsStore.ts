import * as Diag from "VSS/Diag";
import * as VSSStore from  "VSS/Flux/Store";
import {
    ActionsHub,
    IChangeListItemDetailsPayload,
    IChangeListItemDetailsSelectedPayload,
    ItemDetails } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";

/**
 * Store for item details
 */
export class ItemDetailsStore extends VSSStore.RemoteStore {
    private _itemDetailsDictionary: { [id: string]: ItemDetails };
    private _currentItemKey: string;

    constructor(private _actionsHub: ActionsHub) {
        super();

        this._itemDetailsDictionary = {};
        this._actionsHub.changeListItemDetailsLoaded.addListener(this._onItemDetailsLoaded);
        this._actionsHub.changeListItemDetailsSelected.addListener(this._onChangeListItemSelected);
    }

    /**
     * Returns current selected item details
     */
    public get currentItemDetails(): ItemDetails {
        const itemDetails = this._itemDetailsDictionary[this._currentItemKey];
        if (itemDetails) {
            // Recreate internal item to enable fileviewer re-renders it properly
            itemDetails.item = { ...itemDetails.item };
            return itemDetails;
        }

        return null;
    }

    /**
     * Returns true if the item details for the given itemPath and itemVersion is loaded
     */
    public isItemDetailsLoaded(itemPath: string, itemVersion: string): boolean {
        const key = this._getKey(itemPath, itemVersion);
        const itemDetails = this._itemDetailsDictionary[key];

        return itemDetails && itemDetails.item && itemDetails.item.serverItem === itemPath && itemDetails.itemVersion === itemVersion;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.changeListItemDetailsLoaded.removeListener(this._onItemDetailsLoaded);
            this._actionsHub.changeListItemDetailsSelected.removeListener(this._onChangeListItemSelected);

            this._actionsHub = null;
        }

        this._itemDetailsDictionary = {};
        this._currentItemKey = null;
    }

    private _onChangeListItemSelected = (payload: IChangeListItemDetailsSelectedPayload): void => {
        const key = this._getKey(payload.path, payload.itemVersion);

        if (this._currentItemKey !== key) {
            Diag.Debug.assertIsObject(this._itemDetailsDictionary[key], "Selecting ItemDetails which is not yet loaded");

            this._currentItemKey = key;
            this.emitChanged();
        }
    }

    private _onItemDetailsLoaded = (payload: IChangeListItemDetailsPayload): void => {
        const key = this._getKey(payload.itemDetails.item.serverItem, payload.itemDetails.itemVersion);

        if (!this._itemDetailsDictionary[key]) {
            this._itemDetailsDictionary[key] = payload.itemDetails;
            this._currentItemKey = key;

            this._loading = false;
            this.emitChanged();
        }
    }

    private _getKey(itemPath: string, itemVersion: string): string {
        return itemPath + ":" + itemVersion;
    }
}
