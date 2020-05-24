import * as React from "react";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { IDefinitionData } from "Build/Scripts/Stores/DefinitionSearchPicker";

import { PickListFilterBarItem, IPickListItem } from "VSSUI/PickList";
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from 'VSSUI/FilterBarItem';

import { SelectionMode } from "OfficeFabric/Selection";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { BuildStatus } from "TFS/Build/Contracts";
import { IPickListDropdown } from "VSSUI/Components/PickList";
import { DefinitionPickListItem, DefinitionPickerStore } from "../Stores/Filters/DefinitionPicker";

export interface IDefinitionFilterBarItemState extends IFilterBarItemState<any> {
    definitionList: DefinitionPickListItem[];
}

export interface IDefinitionFilterBarItemProps extends IFilterBarItemProps {
    definitionPickerStore: DefinitionPickerStore;
}

export class DefinitionFilterBarItem extends FilterBarItem<any[], IDefinitionFilterBarItemProps, IDefinitionFilterBarItemState> {
    private _pickList: PickListFilterBarItem;
    private _definitionPickerStore: DefinitionPickerStore;

    constructor(props: IDefinitionFilterBarItemProps) {
        super(props);
        this._definitionPickerStore = props.definitionPickerStore;
        this.state = this._getState();

        this._definitionPickerStore.addChangedListener(this._onStoreUpdated)
    }

    private _onStoreUpdated = () => {
        this.setState(this._getState());
    };

    public focus(): void {
        this._pickList.focus();
    }

    //need to override search to search ALL not just 25
    public render(): JSX.Element {
        return <PickListFilterBarItem
                    ref={(pickList) => this._pickList = pickList}
                    filter={this.props.filter}
                    key={this.props.filterItemKey}
                    filterItemKey={this.props.filterItemKey}
                    selectionMode={SelectionMode.single}
                    getPickListItems={() =>  {return this.state.definitionList}}
                    getListItem={(item: DefinitionPickListItem) => {
                        if(item.isFavorite) {
                            return {
                                name: item.name,
                                key: item.id.toString(),
                                iconProps: {
                                    iconName: "FavoriteStarFill"
                                }
                            }
                        }
                        return {
                        name: item.name,
                        key: item.id.toString()
                        }
                    }}
                    selectedItems={[]}
                    placeholder={BuildResources.BuildDefinition}
                    noItemsText={"tmp"}
                    isSearchable={true}
        />
    }

    private _getState(): IDefinitionFilterBarItemState {
        return {
            definitionList: this._definitionPickerStore.getDefinitionPickListItems()
        };
    }

}