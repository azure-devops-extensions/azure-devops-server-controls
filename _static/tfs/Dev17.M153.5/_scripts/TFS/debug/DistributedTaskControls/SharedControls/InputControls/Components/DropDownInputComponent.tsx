/// <reference types="react" />

import * as React from "react";

import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";

import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";

import * as Utils_String from "VSS/Utils/String";

export interface IDropDownItem {
    index: number;
    option: IDropdownOption;
}

export interface IDropDownInputControlProps extends IInputControlPropsBase<IDropDownItem> {
    selectedKey?: string | number;
    required?: boolean;
    options: IDropdownOption[];
    errorMessage?: string;
    dropdownWidth?: number;
    calloutClassName?: string;
}

/**
 * @brief Implements DropDown input control
 */
export class DropDownInputControl extends InputBase<IDropDownItem, IDropDownInputControlProps, IInputControlStateBase<IDropDownItem>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_DROPDOWN;
    }

    protected getControl(): JSX.Element {
        return (
            <Dropdown
                ref={(element) => { this._dropdown = element; }}
                id={this.getInputFieldControlElementId()}
                className={css("input-control-drop-down", this.props.cssClass)}
                label={Utils_String.empty}
                ariaLabel={this.props.ariaLabel || this.props.label}
                options={this.props.options}
                selectedKey={this.props.selectedKey}
                onChanged={this._onChanged}
                aria-disabled={this.props.disabled}
                aria-describedby={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                required={this.props.required}
                disabled={this.props.disabled}
                errorMessage={this.props.errorMessage}
                dropdownWidth={this.props.dropdownWidth}
                calloutProps={
                    {
                        className: this.props.calloutClassName
                    }
                }
            />
        );
    }

    public setFocus(): void {
        if (this._dropdown) {
            this._dropdown.focus();
        }
    }

    private _onChanged = (option: IDropdownOption, index?: number) => {
        this.onValueChanged({
            index: index,
            option: option
        } as IDropDownItem);
    }

    private _dropdown: Dropdown;
}
