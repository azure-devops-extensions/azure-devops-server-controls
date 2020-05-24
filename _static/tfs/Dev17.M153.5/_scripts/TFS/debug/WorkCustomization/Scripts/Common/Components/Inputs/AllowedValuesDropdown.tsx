/// <reference types="react" />

import * as React from "react";
import { Dropdown, IDropdownOption, IDropdownProps } from "OfficeFabric/Dropdown";
import { autobind } from "OfficeFabric/Utilities";
import { SelectableOptionMenuItemType } from "OfficeFabric/utilities/selectableOption/SelectableOption.types";
import { IValueIdPair } from "Presentation/Scripts/TFS/Components/LegacyCombo";
import { WorkItemField } from "TFS/WorkItemTracking/Contracts";
import { getDropdownSelectedKey } from "WorkCustomization/Scripts/Utils/DropdownUtils";
import { Props } from "VSS/Flux/Component";
import StringUtils = require("VSS/Utils/String");
import { TypeAheadDropDown } from "WorkCustomization/Scripts/Common/Components/TypeAheadDropDown";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export interface IAllowedValuesDropdownProps extends Props {
    field: WorkItemField;
    allowedValues: string[];
    initialValue: string;
    disabled: boolean;
    onValueChange?: (value: string) => void;
}

export class AllowedValuesDropdown extends React.Component<IAllowedValuesDropdownProps, {}>{
    public render(): JSX.Element {
        if (this.props.field.isPicklistSuggested) {
            let typeAheadDropdownValues: IValueIdPair[] = this.props.allowedValues.map(value => {
                return {
                    id: value,
                    name: value
                }
            });

            let initialValue = {
                id: this.props.initialValue,
                name: this.props.initialValue
            };

            return <TypeAheadDropDown values={typeAheadDropdownValues}
                key={this.props.disabled + "_" + this.props.field.referenceName}
                onInputChange={this._onChange}
                initialValue={initialValue}
                isAlwaysValid={true}
                className={this.props.cssClass}
                placeholderText={Resources.DynamicInputTextPlaceholder}
                disabled={this.props.disabled} />;
        }

        let dropdownOptions: IDropdownOption[] = this.props.allowedValues.map(value => {
            return {
                key: value,
                text: value,
                itemType: SelectableOptionMenuItemType.Normal
            }
        });

        return <Dropdown className={this.props.cssClass}
            onChanged={this._dropDownChanged}
            options={dropdownOptions}
            selectedKey={getDropdownSelectedKey(dropdownOptions, this.props.initialValue)}
            placeHolder={Resources.DynamicInputTextPlaceholder}
            disabled={this.props.disabled} />;
    }

    @autobind
    private _dropDownChanged(option: IDropdownOption): void {
        this._onChange(option.key.toString());
    }

    @autobind
    private _onChange(newValue: string): void {
        if (this.props.onValueChange) {
            this.props.onValueChange(newValue);
        }
    }
}