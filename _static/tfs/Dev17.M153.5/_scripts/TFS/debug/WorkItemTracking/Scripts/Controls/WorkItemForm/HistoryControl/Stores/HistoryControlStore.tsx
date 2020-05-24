import Diag = require("VSS/Diag");
import TFS_React = require("Presentation/Scripts/TFS/TFS.React");
import {
    IHistoryItem, IHistoryItemGroup, ISelectableHistoryItem, IResolvedLink, HistoryGroupId, ItemType, ItemFocusState
} from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { HistoryUtils } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";
import { HistoryActionSet } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryActionSet";
import { HistoryControlActionSet } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActions";
import { WorkItemHistory } from "WorkItemTracking/Scripts/OM/History/WorkItemHistory"
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_Array from "VSS/Utils/Array";

export class HistoryControlStore extends TFS_React.Store {
    private _historyItems: IHistoryItem[];
    private _selectableHistoryItems: ISelectableHistoryItem[];
    private _visibleItems: ISelectableHistoryItem[];
    private _updateError: any;
    private _historyItemGroups: IHistoryItemGroup[];

    private _selectedIndex: number;
    private _loadedItemCount: number;
    private _lastUpdated: Date;
    private _isHistoryReloaded: boolean;
    private _isLoading: boolean;

    constructor(
        historyActionSet: HistoryActionSet,
        historyControlActionSet: HistoryControlActionSet,
        changedEvent?: string,
        options?: TFS_React.IStoreOptions
    ) {
        super(changedEvent, options);
        this._reset();

        historyActionSet.workItemHistoryUpdateCompleted().addListener((payload) => this._onHistoryUpdateCompleted(payload.history));
        historyActionSet.workItemHistoryUpdateFailed().addListener((payload) => this._onHistoryUpdateFailed(payload.error));
        historyActionSet.workItemHistoryUpdateStarted().addListener(() => this._onHistoryUpdateStarted());
        historyActionSet.workItemHistoryClear().addListener(() => this._onHistoryClear());
        historyControlActionSet.toggleGroup().addListener((payload) => this._onToggleGroup(payload.groupIndex, payload.isCollapsed));
        historyControlActionSet.historyItemSelected().addListener((selectedItem) => this._onHistoryItemSelected(selectedItem));
        historyControlActionSet.selectPreviousItem().addListener((offset) => this._onSelectPreviousItem(offset));
        historyControlActionSet.selectNextItem().addListener((offset) => this._onSelectNextItem(offset));
        historyControlActionSet.selectFirstItem().addListener(() => this._onSelectFirstItem());
        historyControlActionSet.selectLastItem().addListener(() => this._onSelectLastItem());
        historyControlActionSet.forceFocusSelectedItem().addListener(() => this._onForceFocusSelectedItem());
        historyControlActionSet.resolveLinks().addListener((payload) => this._updateLinks(payload.item, payload.resolvedLinks));
    }

    public getTotalItemCount(): number {
        return this._historyItems.length;
    }

    public getVisibleHistoryItems(): ISelectableHistoryItem[] {
        return this._visibleItems;
    }

    public getSelectedItem(): ISelectableHistoryItem {
        if (!this._visibleItems || this._visibleItems.length === 0) {
            return null;
        }
        Diag.Debug.assert(this._selectedIndex < this._visibleItems.length, "Selected index must exist in visible items");
        return this._visibleItems[this._selectedIndex];
    }

    public getHistoryItem(itemId: number): ISelectableHistoryItem {
        return Utils_Array.first(this._selectableHistoryItems, (val) => {
            return itemId === val.itemId;
        })
    }

    public getHistoryItems(): IHistoryItem[] {
        return this._historyItems;
    }

    public getHistoryItemGroups(): IHistoryItemGroup[] {
        return this._historyItemGroups;
    }

    public getGroup(groupId: HistoryGroupId): IHistoryItemGroup {
        return Utils_Array.first(this._selectableHistoryItems, (val) => {
            return val.itemType === ItemType.Group && groupId === val.groupId;
        }) as IHistoryItemGroup;
    }

    public getError(): any {
        return this._updateError;
    }

    public isHistoryReloaded(): boolean {
        return this._isHistoryReloaded;
    }

    public resetHistoryReloaded() {
        this._isHistoryReloaded = false;
    }

    public isLoading(): boolean {
        return this._isLoading;
    }

    private _reset() {
        this._isLoading = false;
        this._historyItems = [];
        this._selectableHistoryItems = [];
        this._updateError = null;
        this._historyItemGroups = [];
        this._selectedIndex = 0;
        this._loadedItemCount = 0;
        this._lastUpdated = null;
        this._isHistoryReloaded = false;
    }

    private _onHistoryUpdateStarted() {
        this._isLoading = true;
        this.emitChanged();
    }

    private _onHistoryUpdateCompleted(history: WorkItemHistory) {
        this._reset();
        this._lastUpdated = Utils_Date.convertClientTimeToUserTimeZone(new Date(), true);

        this._historyItems = history.getNonEmptyActions().map((editActionSet, i) => {
            return {
                workItem: history.getWorkItem(),
                editActionSet: editActionSet,
                isSelected: false,
                isCollapsed: false,
                itemType: ItemType.HistoryItem,
                focusState: ItemFocusState.Unset,
                groupId: null, // This is updated when it is assigned to a group.
                itemId: i
            };
        });

        this._loadHistoryItems(this._historyItems);

        this._isHistoryReloaded = true;

        if (this._selectableHistoryItems.length > 1) {
            this._selectItemByIndex(1, ItemFocusState.Unset);
        }
        else {
            this.emitChanged();
        }
    }

    private _onHistoryUpdateFailed(error) {
        this._reset();
        this._updateError = error;
        this.emitChanged();
    }

    private _onHistoryClear() {
        this._reset();
        this.emitChanged();
    }

    private _onHistoryItemSelected(selectedItemId: number) {
        this._selectItemById(selectedItemId);
    }

    private _onSelectFirstItem() {
        this._selectItemByIndex(0);
    }

    private _onSelectLastItem() {
        const visibleItems = this.getVisibleHistoryItems();
        this._selectItemByIndex(visibleItems.length - 1);
    }

    private _selectItemByIndex(ind: number, focusState: ItemFocusState = ItemFocusState.Set) {
        if (!this.getSelectedItem()) {
            return;
        }

        this._clearSelection();

        if (ind < 0) {
            ind = 0;
        }

        const items = this.getVisibleHistoryItems();

        const selected = ind < items.length ? ind : items.length - 1;
        this._selectedIndex = selected;
        const item = this.getVisibleHistoryItems()[this._selectedIndex];
        item.isSelected = true;
        item.focusState = focusState;

        this.emitChanged();
    }

    private _onSelectPreviousItem(offset: number = 1) {
        this._selectItemByIndex(this._selectedIndex - offset);
    }

    private _onSelectNextItem(offset: number = 1) {
        this._selectItemByIndex(this._selectedIndex + offset);
    }

    private _selectItemById(itemId: number, focusState: ItemFocusState = ItemFocusState.Set) {
        const ind = Utils_Array.findIndex(this._visibleItems, (val) => {
            return itemId === val.itemId;
        })

        Diag.Debug.assert(ind >= 0, "Item must exist and be visible");
        this._selectItemByIndex(ind);
    }

    private _onToggleGroup(groupId: HistoryGroupId, isCollapsed: boolean) {
        if (groupId === null) {
            const selectedItem = this.getSelectedItem();
            if (selectedItem) {
                groupId = selectedItem.groupId;
            }
        }

        Diag.Debug.assert(Utils_Array.findIndex(this._historyItemGroups, (item) => item.groupId === groupId) >= 0,
            "Group with this id does not exist");

        this._clearSelection();
        let hasItems = false;
        this._visibleItems = [];
        this._selectableHistoryItems.forEach((item) => {
            if (item.groupId === groupId) {
                item.isCollapsed = isCollapsed;
                if (item.itemType === ItemType.Group) {
                    item.isSelected = true;
                    item.focusState = ItemFocusState.Set;
                    this._selectedIndex = this._visibleItems.length;
                }
            }

            if (!(item.isCollapsed && item.itemType === ItemType.HistoryItem)) {
                this._visibleItems.push(item);
            }
        });

        this.emitChanged();
    }

    private _clearSelection() {
        const item = this.getSelectedItem();
        if (item) {
            item.isSelected = false;
            item.focusState = ItemFocusState.Unset;
            this._selectedIndex = 0;
        }
    }

    private _onForceFocusSelectedItem() {
        const item = this.getSelectedItem();
        if (item) {
            item.focusState = ItemFocusState.ForceSet;
            this.emitChanged();
        }
    }

    private _loadHistoryItems(historyItems: IHistoryItem[]) {
        let groupItemId: number = historyItems.length;
        this._visibleItems = [];
        for (let item of historyItems) {
            var groupId = this._getHistoryItemGroupKey(item);
            var groupName = HistoryUtils.getHistoryGroupText(groupId);
            if (Utils_Array.findIndex(this._historyItemGroups, (item) => {
                return item.itemType === ItemType.Group && (item as IHistoryItemGroup).groupId === groupId;
            }) === -1) {
                const group: IHistoryItemGroup = {
                    isCollapsed: false,
                    groupName: groupName,
                    groupId: groupId,
                    isSelected: false,
                    focusState: ItemFocusState.Unset,
                    itemId: groupItemId++,
                    itemType: ItemType.Group
                };
                this._historyItemGroups.push(group);
                this._selectableHistoryItems.push(group);
                this._visibleItems.push(group);
            }
            item.groupId = groupId;
            this._selectableHistoryItems.push(item);
            this._visibleItems.push(item);
        }
    }

    private _getHistoryItemGroupKey(item: IHistoryItem): HistoryGroupId {
        var localRevisionDate = Utils_Date.convertClientTimeToUserTimeZone(item.editActionSet.getChangedDate(), true);
        var key = HistoryUtils.getHistoryGroupId(localRevisionDate, this._lastUpdated);
        return key;
    }

    private _updateLinks(item: IHistoryItem, resolvedLinks: IResolvedLink[]) {
        let linkChanges = HistoryUtils.getLinkChanges(item.workItem, resolvedLinks);
        item.resolvedLinkChanges = linkChanges;
        this.emitChanged();
    }
}
