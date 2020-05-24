// PickListDropdown.tsx is deprecated now and should be removed after sprint 142. 
// File will be preserved till sprint 142 for compat handling.
// TODO: mdakbar

/// <reference types="react" />

import * as React from "react";

import * as Q from "q";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Common from "DistributedTaskControls/Common/Common";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import { css } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/Selection";

import * as VssPickListDropdown from "VSSUI/Components/PickList/PickListDropdown";
import { IPickListSelection } from "VSSUI/Components/PickList/PickList.Props";

export interface IPickListDropDownProps extends Base.IProps {
    properties: IDictionaryStringTo<string>;
    selectedValues: string;
    options: IDictionaryStringTo<string>;
    onChanged: (newOption: string) => void;
    ariaLabel: string;
    ariaDescribedBy?: string;
    showSelectAll?: boolean;
    getPickListItems: (options: IDictionaryStringTo<string>) => string[];
}

export class PickListDropdown extends Base.Component<IPickListDropDownProps, Base.IStateless> {

    public componentWillMount() {
        this._multiSelectType = PickListInputUtility.getMultiSelectType(this.props.properties);
    }

    public render(): JSX.Element {
        return this._getPickListComponent();
    }

    private _getPickListComponent(): JSX.Element {
        let component: JSX.Element;
        switch (this._multiSelectType) {
            case Common.PICKLIST_MULTI_SELECT_TREE_TYPE:
                component = this._getTreeViewPickList();
                break;
            case Common.PICKLIST_MULTI_SELECT_FLAT_LIST_TYPE:
                component = this._getPickListDropDown(SelectionMode.multiple);
                break;
            default:
                component = this._getPickListDropDown(SelectionMode.single);
                break;
        }

        return component;
    }

    private _getTreeViewPickList(): JSX.Element {
        return <ErrorComponent
            cssClass="tree-dropdown-not-implement"
            errorMessage={"Tree dropdown is not implemented yet."} />;
    }

    private _getPickListDropDown(mode: SelectionMode): JSX.Element {
        return (<VssPickListDropdown.PickListDropdown
            className={css("dtc-picklist-dropdown", this.props.cssClass)}
            selectionMode={mode}
            getPickListItems={this._getPickListDisplayOptions}
            selectedItems={this._getSelectedValues()}
            onSelectionChanged={this._onChanged}
            ariaLabelFormat={this.props.ariaLabel}
            ariaDescribedBy={this.props.ariaDescribedBy}
            showSelectAll={this.props.showSelectAll}
        />);
    }

    private _onChanged = (selection: IPickListSelection): void => {
        let selectedItems: string[] = selection.selectedItems;
        let selectedItemKeys: string[] = this._getSelectedItemsKeysFromValues(selectedItems);
        if (this.props.onChanged) {
            this.props.onChanged(selectedItemKeys.join(Common.CommaSeparator));
        }
    }

    private _getSelectedValues = (): string[] => {
        let selectedItemKeys: string[] = (this.props.selectedValues && this.props.selectedValues.split(Common.CommaSeparator)) || [];
        let selectedItemsValue: string[] = this._getSelectedItemValuesFromKeys(selectedItemKeys);

        if (selectedItemKeys.length !== selectedItemsValue.length) {
            // Some mismatch is there then dont change the value. Value will get automatically corrected when user changes the value from dropdown
            // We dont want to change value behind the scene until user explcitly does that
            selectedItemsValue = selectedItemKeys;
        }
        return selectedItemsValue;
    }

    private _getPickListDisplayOptions = (): string[] => {
        let options = this.props.options;
        if (this.props.getPickListItems) {
            return this.props.getPickListItems(options);
        } else {
            let data: string[] = [];
            for (let key in options) {
                if (options.hasOwnProperty(key)) {
                    data.push(options[key]);
                }
            }
            return data;
        }
    }

    private _getSelectedItemValuesFromKeys(selectedItemKeys: string[]): string[] {
        let selectedItemValues: string[] = [];
        let options = this.props.options;
        if (selectedItemKeys && options) {
            selectedItemKeys.forEach((key) => {
                const value = options[key];
                if (value !== null && value !== undefined) {
                    selectedItemValues.push(value);
                }
            });
        }
        return selectedItemValues;
    }

    private _getSelectedItemsKeysFromValues(selectedItemsValue: string[]): string[] {
        let selectedItemKeys: string[] = [];
        let options = this.props.options;

        if (selectedItemsValue && options) {
            selectedItemsValue.forEach((selectedItem) => {
                for (let key in options) {
                    const value = options[key];
                    if (value === selectedItem) {
                        selectedItemKeys.push(key);
                    }
                }
            });
        }
        return selectedItemKeys;
    }

    private _multiSelectType: string;
}