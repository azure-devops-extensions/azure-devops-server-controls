import * as React from "react";

import { DefinitionSearchPickerActionHub, getDefinitionSearchPickerActionHub } from "Build/Scripts/Actions/DefinitionSearchPickerActions";
import { DefinitionSearchPickerActionCreator } from "Build/Scripts/Actions/DefinitionSearchPickerActionCreator";
import { ResourcePicker, IResourcePickerProps, IResourceSearchBoxProps, IResourcePickerOption } from "Build/Scripts/Components/ResourcePicker";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { DefinitionSearchPickerStore, getDefinitionSearchPickerStore, IDefinitionData } from "Build/Scripts/Stores/DefinitionSearchPicker";

import { DropdownMenuItemType } from "OfficeFabric/Dropdown";

import { BuildDefinitionReference, DefinitionQuality } from "TFS/Build/Contracts";

import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { getCollectionService } from "VSS/Service";
import { format } from "VSS/Utils/String";

export interface IDefinitionSearchPickerOption extends IResourcePickerOption {
    data?: BuildDefinitionReference;
}

export interface IDefinitionSearchPickerProps extends IBaseProps {
    selectedDefinitionId: number;
    definitionPickerOptionChanged: (option: IDefinitionSearchPickerOption, index: number) => void;
    onClear?: () => void;
}

export interface IDefinitionSearchPickerState {
    selectedDefinitionId: number;
    definitionData: IDefinitionData;
    searchText: string;
}

export interface IDefinitionSearchPickerData {
    store: DefinitionSearchPickerStore;
    actionCreator?: DefinitionSearchPickerActionCreator;
    actionHub?: DefinitionSearchPickerActionHub;
}

const SEARCH_INPUT_CHANGE_DELAY = 100;

export class DefinitionSearchPicker extends BaseComponent<IDefinitionSearchPickerProps, IDefinitionSearchPickerState> {
    private _actionCreator: DefinitionSearchPickerActionCreator;
    private _actionHub: DefinitionSearchPickerActionHub;
    private _store: DefinitionSearchPickerStore = null;
    private _resourcePicker: ResourcePicker = null;

    private _selectedDefinitionId = -1;

    constructor(props: IDefinitionSearchPickerProps, data?: IDefinitionSearchPickerData) {
        super(props, data);

        this._actionCreator = (data && data.actionCreator) ? data.actionCreator : getCollectionService(DefinitionSearchPickerActionCreator);
        this._actionHub = (data && data.actionHub) ? data.actionHub : getDefinitionSearchPickerActionHub();
        this._store = (data && data.store) ? data.store : getDefinitionSearchPickerStore();

        this._selectedDefinitionId = props.selectedDefinitionId || -1;

        this._onSearchInputChange = this._async.debounce(this._onSearchInputChange, SEARCH_INPUT_CHANGE_DELAY, {
            leading: false
        });

        this.state = this._getState();
    }

    public render(): JSX.Element {
        const options: IDefinitionSearchPickerOption[] = [];
        const favoriteDefinitions = this.state.definitionData.favDefinitions;
        const otherDefinitions = this.state.definitionData.definitions;

        if (favoriteDefinitions.length > 0) {
            options.push({
                key: "favorites_header",
                text: BuildResources.FavoritesText,
                itemType: DropdownMenuItemType.Header
            });
        }

        favoriteDefinitions.forEach((definition) => {
            options.push({
                key: definition.id,
                text: definition.name,
                data: definition,
                tooltip: getTooltip(definition)
            });
        });

        if (otherDefinitions.length > 0) {
            if (favoriteDefinitions.length > 0) {
                options.push({
                    key: "divider",
                    text: "-",
                    itemType: DropdownMenuItemType.Divider
                });
            }

            options.push({
                key: "others_header",
                text: BuildResources.OthersText,
                itemType: DropdownMenuItemType.Header
            });
        }

        otherDefinitions.forEach((definition) => {
            options.push({
                key: definition.id,
                text: definition.name,
                data: definition,
                tooltip: getTooltip(definition)
            });
        });

        const searchBoxProps: IResourceSearchBoxProps = {
            onChange: this._onSearchInputChange,
            labelText: BuildResources.BuildListViewSearchDefinitons,
            value: this.state.searchText
        };

        return <ResourcePicker
            ref={this._resolveRef('_resourcePicker')}
            options={options}
            searchBoxProps={searchBoxProps}
            onChanged={this._onOptionChanged}
            selectedKey={this.state.selectedDefinitionId}
            ariaLabel={BuildResources.BuildDefinitionSearchPickerAriaLabel}
            placeHolder={BuildResources.BuildDefinitionPickerPlaceHolderText}
            {...!!this.props.onClear ? {
                onClearProps: {
                    onClear: this._onClear,
                    ariaLabel: BuildResources.ClearDefinitionPickerAriaLabel
                }
            } : {}}
        />;
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoresUpdated);
    }

    public componentDidUpdate(): void {
        if (!this.state.searchText) {
            // when search isn't active
            // since indexes will change, we need to reselect the one that's already selected, when dropdown is changed, this gets appropriate Id as well
            this._resourcePicker && this._resourcePicker.setSelectedKey(this.state.selectedDefinitionId);
        }
        else {
            // else, reset selection, so that any existing selections won't interfere with new selections as indexes are changed
            this._resourcePicker && this._resourcePicker.resetSelection();
        }
    }

    public componentWillReceiveProps(nextProps: IDefinitionSearchPickerProps) {
        if (this.props.selectedDefinitionId != nextProps.selectedDefinitionId) {
            this._selectedDefinitionId = nextProps.selectedDefinitionId;
            this.setState(this._getState());
        }
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoresUpdated);
    }

    private _onOptionChanged = (option: IDefinitionSearchPickerOption, index: number) => {
        // when option is changed, clear the existing search so that when the dropdown is opened again, it shows default list with favorites
        // this also ensures that right selection appears in the dropdown, since when the search is active we reset selections
        this._actionCreator.clearSearch(this._actionHub)

        this.props.definitionPickerOptionChanged(option, index);
    }

    private _onClear = () => {
        this.props.onClear();
    }

    private _onSearchInputChange = (text: string) => {
        this._store.searchDefinitions(text);
    }

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    }

    private _getState(): IDefinitionSearchPickerState {
        return {
            selectedDefinitionId: this._selectedDefinitionId,
            definitionData: this._store.getDefinitionData(this._selectedDefinitionId),
            searchText: this._store.getSearchText()
        };
    }
}

function getTooltip(definition: BuildDefinitionReference) {
    let toolTip = null;

    if (definition.id > 0) {
        if (definition.quality === DefinitionQuality.Draft) {
            toolTip = BuildResources.DraftDefinitionToolTip;
        }

        if (definition.path == "\\") {
            return toolTip;
        }

        toolTip = (toolTip || "") + format(BuildResources.DefinitionFolderTooltip, definition.path);
    }

    return toolTip;
}