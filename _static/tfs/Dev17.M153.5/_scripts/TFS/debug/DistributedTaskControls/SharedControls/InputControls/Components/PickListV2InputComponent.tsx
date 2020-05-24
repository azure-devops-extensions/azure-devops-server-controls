// Adding V2 version of PickListInputComponent which will take items as an array instead of a delimiter separated string.
// NewPicklistDropdown consumers should use this component instead of PickListInputComponent.

import * as React from "react";

import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";

import { SelectionMode } from "OfficeFabric/Selection";
import { css } from "OfficeFabric/Utilities";

import { IPickListItem, IPickListSelection, PickListDropdown } from "VSSUI/Components/PickList";
import * as Diag from "VSS/Diag";

export interface IPickListV2InputProps extends IInputControlPropsBase<IPickListItem[]> {
    selectionMode: SelectionMode;
    options: IPickListItem[];
    pickListInputClassName?: string;
    showSelectAll?: boolean;
    getPickListItems?: (options: IPickListItem[]) => IPickListItem[];
}

export class PickListV2InputComponent extends InputBase<IPickListItem[], IPickListV2InputProps, IInputControlStateBase<IPickListItem[]>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_PICK_LIST_V2;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[PickListV2InputComponent.getControl]: Method called.");

        return (
            <div className="input-control-dropdown input-field-picklist">
                {this._getPickListDropDown()}
            </div >
        );
    }

    private _getPickListDropDown(): JSX.Element {
        return (
            <PickListDropdown
                selectedItems={this.state.value}
                getPickListItems={this._getPickListItems}
                getListItem={this._getListItem}
                onSelectionChanged={this._onChanged}
                selectionMode={this.props.selectionMode}
                showSelectAll={this.props.showSelectAll}
                className={css("dtc-picklist-dropdown", this.props.pickListInputClassName)}
                ariaLabelFormat={this.props.ariaLabel}
                ariaDescribedBy={this.props.ariaDescribedBy}
        />);
    }

    private _getListItem = (item: IPickListItem): IPickListItem =>  {
        return (
            {
                key: item.key,
                name: item.name
            }
        );
    }

    private _onChanged = (selection: IPickListSelection): void => {
        if (!!selection) {
            this.props.onValueChanged(selection.selectedItems || []);
        }
    }

    private _getPickListItems = (): IPickListItem[] => {
        let options: IPickListItem[] = this.props.options || [];

        if (this.props.getPickListItems) {
            return this.props.getPickListItems(options);
        }
        else {
            return options;
        }
    }
}