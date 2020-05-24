/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import * as React from "react";
import { Dropdown, IDropdownOption, IDropdownProps } from "OfficeFabric/Dropdown";
import { autobind } from "OfficeFabric/Utilities";
import { SelectableOptionMenuItemType } from "OfficeFabric/utilities/selectableOption/SelectableOption.types";
import { getConditionIcon } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/RuleIcons";
import Diag = require("VSS/Diag");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");


export interface IConditionTypeDropdownProps {
    isDisabled: boolean;
    selectedKey: string;
    currentConditionTypes: string[];
    index: number;
    onChanged: (option: IDropdownOption, index?: number) => void;
    placeFocusOnMountOrUpdate?: boolean;
}

export class ConditionTypeDropdown extends React.Component<IConditionTypeDropdownProps, {}>{
    private _conditionTypeDropdownRef: HTMLDivElement;

    public render(): JSX.Element {
        let dropdownProps: IDropdownProps = this._getDropdownOptions();
        return <div className={"rule-form-editor-input"}>
            <Dropdown {...dropdownProps} componentRef={(ref: HTMLDivElement) => { this._conditionTypeDropdownRef = ref; }} />
        </div>;
    }

    public componentDidMount() {

        if (this.props.placeFocusOnMountOrUpdate) {
            this._conditionTypeDropdownRef.focus();
        }
    }

    public componentDidUpdate() {

        if (this.props.placeFocusOnMountOrUpdate) {
            this._conditionTypeDropdownRef.focus();
        }
    }

    private _getDropdownOptions(): IDropdownProps {
        let options: IDropdownOption[] = getAllowedConditionTypes(this.props.isDisabled, this.props.currentConditionTypes, this.props.index)
            .map(c => {
                return {
                    key: c,
                    text: c,
                    itemType: SelectableOptionMenuItemType.Normal
                };
            });

        return {
            options: options,
            onChanged: this.props.onChanged,
            required: true,
            selectedKey: this.props.selectedKey,
            placeHolder: Resources.SelectCondition,
            ariaLabel: Resources.SelectCondition,
            onRenderTitle: this._onRenderTitle,
            onRenderOption: this._onRenderOption,
            disabled: this.props.isDisabled,
            className: "condition-editor-dropdown"
        }
    }

    @autobind
    private _onRenderTitle(items: IDropdownOption[]): JSX.Element {

        if (items !== null && items.length > 0) {
            return <span>
                <i className={getConditionIcon(items[0].key.toString())}></i>
                {items[0].text}
            </span>;

        }
        return null;
    }

    @autobind
    private _onRenderOption(item: IDropdownOption): JSX.Element {
        return <span>
            <i className={getConditionIcon(item.key.toString())}></i>
            <span className={"fabric-dropdown-optionText"}>
                {item.text}
            </span>
        </span>;
    }
}

export const stateConditions: string[] = [
    Resources.RulesConditionsWorkItemIsCreated,
    Resources.RulesConditionsStateChangedTo,
    Resources.RulesConditionsStateNotChanged,
    Resources.RulesConditionsStateChangedFromAndTo,
    Resources.RulesConditionsStateIs,
    Resources.RulesConditionsStateIsNot
];

export const fieldConditions: string[] = [
    Resources.RulesConditionsValueEquals,
    Resources.RulesConditionsValueNotEquals,
    Resources.RulesConditionsValueDefined,
    Resources.RulesConditionsValueNotDefined,
    Resources.RulesConditionsFieldChanged,
    Resources.RulesConditionsFieldNotChanged
];

export const getAllowedConditionTypes = (isDisabled: boolean, currentConditionTypes: string[], index: number): string[] => {
    Diag.Debug.assertIsArray(currentConditionTypes, "cannot have empty conditions", true);

    let showAll: boolean = isDisabled || (currentConditionTypes ? currentConditionTypes.length === 1 : true);
    if (showAll) {
        return stateConditions.concat(fieldConditions);
    }

    for (let i = 0; i < currentConditionTypes.length; i++) {
        if (i != index) {
            let conditionType = currentConditionTypes[i];
            if (conditionType) {
                if (stateConditions.indexOf(conditionType) >= 0) {
                    return fieldConditions;
                }
                else {
                    return stateConditions.filter((condition) => { return condition != Resources.RulesConditionsStateChangedTo });
                }
            }
        }
    }

    return stateConditions.concat(fieldConditions);
}