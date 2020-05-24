import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

import { PickListDropdown } from "VSSUI/Components/PickList/PickListDropDown";
import { IItemPickerProvider, IPickListItem, IPickListAction, IPickListSelection } from "VSSUI/Components/PickList/PickList.Props";
import { ItemPickerDropdown } from "VSSUI/PickList";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";

import { GitVersionDescriptor, GitVersionType } from "TFS/VersionControl/Contracts";
import { WikiV2, WikiType } from "TFS/Wiki/Contracts";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/VersionPicker/VersionPicker";

export interface IVersionPickerProps {
    wiki: WikiV2;
    selectedItem: GitVersionDescriptor;
    onSelectionChange(item: GitVersionDescriptor): void;
    getActions?(): IPickListAction[];
    draftVersions?: GitVersionDescriptor[];
}

export interface IWikiVersionItem {
    id?: string;
    name: string;
    properties?: IDictionaryStringTo<object>;
}

export interface IWikiVersionPickerListItem extends IPickListItem {
    id?: string;
    properties?: IDictionaryStringTo<object>;
}

export class VersionPickerProvider implements IItemPickerProvider<IWikiVersionItem> {
    private _props: IVersionPickerProps;
    private _selectedItem: IWikiVersionPickerListItem;

    constructor(props: IVersionPickerProps) {
        this._props = props;
    }

    public get isSearchable(): boolean {
        return true;
    }

    public get searchTextPlaceholder(): string {
        return WikiResources.VersionPickerSearchTextPlaceholder;
    }

    @autobind
    public setSelectedItem(item: IWikiVersionItem): void {
        this._selectedItem = {
            id: item.id,
            key: item.id,
            name: item.name,
            properties: item.properties,
            iconProps: this._getIconProps(item.properties["version"] as GitVersionDescriptor),
        };
    }

    @autobind
    public getItems(): IWikiVersionPickerListItem[] {
        const items: IWikiVersionPickerListItem[] = [];

        this._props.wiki.versions.forEach((version: GitVersionDescriptor, index: number) => {
            items.push({
                id: version.version.toString(),
                key: version.version.toString(),
                name: version.version.toString(),
                properties: {
                    "version": version,
                },
                iconProps: this._getIconProps(version),
            });
        });

        if (this._props.draftVersions && this._props.draftVersions.length > 0) {
            items.push({
                key: WikiResources.VersionPickerDraftVersionText,
                name: WikiResources.VersionPickerDraftVersionText,
            })

            this._props.draftVersions.forEach((version: GitVersionDescriptor, index: number) => {
                items.push({
                    id: version.version,
                    key: version.version,
                    name: version.version,
                    properties: {
                        "version": version,
                    },
                    iconProps: this._getIconProps(version),
                });
            });
        }
        return items;
    }

    public get selectedItem(): IPickListItem {
        let selectedWikiVersionItem = this._selectedItem;
        if (!selectedWikiVersionItem) {
            const { selectedItem } = this._props;

            if (selectedItem) {
                selectedWikiVersionItem = {
                    key: selectedItem.version,
                    id: selectedItem.version,
                    name: selectedItem.version,
                    iconProps: this._getIconProps(selectedItem),
                    properties: {
                        "version": selectedItem,
                    }
                };
            }

            this._selectedItem = selectedWikiVersionItem;
        }

        return this._selectedItem;
    }

    public get noItemsText(): (string | JSX.Element) {
        return WikiResources.VersionPickerNoVersionsText;
    }

    public get actions(): IPickListAction[] {
        if (this._props.getActions) {
            return this._props.getActions();
        }

        return null;
    }

    @autobind
    public onSelectedItemChanged(selectedItem: IWikiVersionPickerListItem): void {
        this.setSelectedItem(selectedItem);
        this._props.onSelectionChange(selectedItem.properties["version"] as GitVersionDescriptor);
    }

    @autobind
    public getListItem(item: IWikiVersionPickerListItem): IPickListItem {
        return item;
    }

    @autobind
    public getTitleTextForItem(item: IWikiVersionPickerListItem): string {
        return item && item.name;
    }

    private _getIconProps(version: GitVersionDescriptor): IVssIconProps {
        const iconName = version && (version.versionType === GitVersionType.Branch || version.versionType === undefined)
            ? "bowtie-tfvc-branch"
            : "bowtie-tag";

        return {
            iconName: iconName,
            iconType: VssIconType.bowtie
        } as IVssIconProps;
    }
}

export interface VersionPickerState {}

export class VersionPicker extends React.Component<IVersionPickerProps, VersionPickerState> {
    private _versionPickerProvider: VersionPickerProvider;

    constructor(props: IVersionPickerProps) {
        super(props);

        this._versionPickerProvider = new VersionPickerProvider(props);
    }

    public render(): JSX.Element {
        return (
            <div className={"wiki-version-picker-container"}>
                <ItemPickerDropdown
                    className={"wiki-version-picker"}
                    pickListClassName={"wiki-version-picker-dropdown"}
                    provider={this._versionPickerProvider} />
            </div>);
    }
}
