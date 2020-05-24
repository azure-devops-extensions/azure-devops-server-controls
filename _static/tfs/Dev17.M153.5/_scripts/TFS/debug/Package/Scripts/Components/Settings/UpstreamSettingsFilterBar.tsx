import * as React from "react";

import { SelectionMode } from "OfficeFabric/Selection";

import { Component, Props } from "VSS/Flux/Component";

import { FilterBar, IFilterBar } from "VSSUI/FilterBar";
import { TextFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IPickListItem, PickListFilterBarItem } from "VSSUI/PickList";
import { Filter } from "VSSUI/Utilities/Filter";

import { UpstreamSettingsListFilterKeys } from "Package/Scripts/Helpers/FilterHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/UpstreamSettingsFilterBar";

export interface IUpstreamSettingsFilterBarProps extends Props {
    /**
     * The Filter to associate with the FilterBar
     */
    filter?: Filter;

    /**
     * Values for the protocol filter
     */
    protocolFilterValues: IPackageProtocol[];
}

export class UpstreamSettingsFilterBar extends Component<IUpstreamSettingsFilterBarProps, {}> implements IFilterBar {
    private _filterBar: IFilterBar;

    public render(): JSX.Element {
        return (
            <div className="upstream-settings-filterbar">
                <FilterBar
                    filter={this.props.filter}
                    componentRef={(filterBar: IFilterBar) => (this._filterBar = filterBar)}
                >
                    <PickListFilterBarItem
                        placeholder={PackageResources.UpstreamSettingsFilterBar_ProtocolPlaceholder}
                        filterItemKey={UpstreamSettingsListFilterKeys.protocol}
                        selectionMode={SelectionMode.single}                       
                        getPickListItems={() => this.props.protocolFilterValues}
                        getListItem={(item: IPackageProtocol) => {
                            return {
                                key: item.name,
                                name: item.name,
                                iconProps: item.vssIconProps
                            } as IPickListItem;
                        }}
                    />
                </FilterBar>
            </div>
        );
    }

    public focus(): void {
        this._filterBar.focus();
    }

    public forceUpdate(): void {
        this._filterBar.forceUpdate();
    }
}
