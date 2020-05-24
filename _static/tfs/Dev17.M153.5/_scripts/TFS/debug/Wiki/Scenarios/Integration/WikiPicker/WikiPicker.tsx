import * as React from "react";

import { autobind, EventGroup } from "OfficeFabric/Utilities";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { IPickListItem, IPickListIndicator, IPickListAction, IPickListSelection } from "VSSUI/Components/PickList/PickList.Props";
import { IItem, IItemIndicatorProps, IItemState, Item } from "VSSUI/ItemIndicator";
import { IItemPickerProvider, PICKER_CHANGE_EVENT } from "VSSUI/PickList";
import { IVssIconProps, VssIconType, VssIcon } from "VSSUI/VssIcon";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { WikiPickerActionsHub } from "Wiki/Scenarios/Integration/WikiPicker/WikiPickerActionsHub";
import { WikiPickerDataStore, WikiPickerData } from "Wiki/Scenarios/Integration/WikiPicker/WikiPickerDataStore";
import { WikiPickerSource } from "Wiki/Scenarios/Integration/WikiPicker/WikiPickerSource";
import { WikiPickerActionCreator } from "Wiki/Scenarios/Integration/WikiPicker/WikiPickerActionCreator";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/WikiPicker/WikiPicker";

export interface IWikiItem {
    id?: string;
    name: string;
}

export interface IWikiPickListItem extends IPickListItem {
    id?: string;
}

export interface IWikiPickerProps {
    projectId: string;
    selectedItem: WikiV2;
    onWikiSelectionChange(item: IWikiItem): void;
    getActions?(): IPickListAction[];
}

export class WikiPicker implements IItemPickerProvider<IWikiItem>, IDisposable {
    private _props: IWikiPickerProps;
    private _actionsHub: WikiPickerActionsHub;
    private _actionCreator: WikiPickerActionCreator;
    private _store: WikiPickerDataStore;
    private _source: WikiPickerSource;
    private _selectedItem: IWikiPickListItem;
    
    constructor(props: IWikiPickerProps) {

        this._actionsHub = new WikiPickerActionsHub();
        this._source = new WikiPickerSource(props.projectId);
        this._store = new WikiPickerDataStore(this._actionsHub);
        this._actionCreator = new WikiPickerActionCreator(
            this._actionsHub,
            {
                wikiPickerSource: this._source,
            });

        this._store.addChangedListener(this._onDataStoreChanged);

        // Make the call to fetch the wikis
        this._actionCreator.fetchAllWikis();
        
        this._props = props;
    }

    // Required methods and members from IItemPickerProvider.

    /**
     * Member to denote if the picker is searchable. The picker will be searchable when it has more than 8 items.
     */
    public get isSearchable(): boolean {
        return true;
    }

    /**
     * Placeholder text used in the search TextField.
     */
    public get searchTextPlaceholder(): string {
        return WikiResources.WikiPickerSearchTextPlaceholder;
    }

    /**
     * Method to set the selected item in the picker.
     * @param item
     */
    @autobind
    public setSelectedItem(item: IWikiItem): void {
        this._selectedItem = {
            id: item.id,
            key: item.id,
            name: item.name,
        }
    }

    /**
     * Method which returns all the items to be shown in the picker.
     */
    @autobind
    public getItems(): IWikiPickListItem[] {
        const pickerData: WikiPickerData = this._store.state;

        if (pickerData.isLoaded) {
            const pickListItems: IWikiPickListItem[] = [];

            pickerData.wikis.forEach((wiki) => {
                pickListItems.push({
                    id: wiki.id,
                    key: wiki.id,
                    name: wiki.name,
                    iconProps: {
                        iconName: "bowtie-icon bowtie-log",
                        iconType: VssIconType.bowtie,
                    } as IVssIconProps,
                });
            });

            return pickListItems;
        }

        return null;
    }

    /**
     * Returns currently selected item in the picker.
     */
    public get selectedItem(): IPickListItem {
        let selectedWikiItem = this._selectedItem;
        if (!selectedWikiItem) {
            const { selectedItem } = this._props;

            if (selectedItem) {
                selectedWikiItem = {
                    key: selectedItem.id,
                    id: selectedItem.id,
                    name: selectedItem.name,
                };
            }

            this._selectedItem = selectedWikiItem;
        }

        return selectedWikiItem;
    }

    /**
     * Element or message string to show when items are being fetched or there are no items.
     */
    public get noItemsText(): (string | JSX.Element) {
        if (this._store.state.isLoaded) {
            let noWikisMessage: string | JSX.Element;

            noWikisMessage = (
                <MessageBar
                    className={"wiki-picker-no-items-message"}
                    messageBarType={MessageBarType.info}>
                    {WikiResources.WikiPickerNoWikisText}
                </MessageBar>
            );

            return noWikisMessage;
        } else if (this._store.state.error) {
            let errorMessage: string | JSX.Element;
            
            errorMessage = (
                <MessageBar
                    className={"wiki-picker-error-message"}
                    messageBarType={MessageBarType.error}>
                    {this._store.state.error.message}
                </MessageBar>
            );

            return errorMessage;
        } else {
            return (
                <span className={"wiki-picker-no-items-message"}>
                    {WikiResources.WikiPickerLoadingWikisText}
                </span>
            );
        }
    }

    /**
     * Optional list of actions to render after all items and groups
     */
    public get actions(): IPickListAction[] {
        if (this._props.getActions) {
            return this._props.getActions();
        }

        return null;
    }

    /**
     * Handler for picker item change.
     * @param item
     */
    @autobind
    public onSelectedItemChanged(item: IWikiPickListItem): void {
        this._props.onWikiSelectionChange({
            id: item.id,
            name: item.name,
        });
    }

    /**
     * Returns a PickListItem for the specified item
     */
    @autobind
    public getListItem(item: IWikiPickListItem): IPickListItem {
        return item;
    }

    @autobind
    private _onDataStoreChanged(): void {
        // Reload picker if wikis are loaded
        EventGroup.raise(this, PICKER_CHANGE_EVENT);
    }

    public dispose(): void {
        if (this._store) {
            this._store.removeChangedListener(this._onDataStoreChanged);
            this._store.dispose();
            this._store = null;
        }
    }
}
