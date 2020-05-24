/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import * as React from "react";
import { CommandButton } from "OfficeFabric/Button";
import { Dropdown, IDropdownOption, IDropdownProps } from "OfficeFabric/Dropdown";
import { autobind } from "OfficeFabric/Utilities";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Component, State, Props } from "VSS/Flux/Component";
import { ClientOnlyRuleConditionTypes, RuleConditionTypes } from "WorkCustomization/Scripts/Constants";
import { RulesViewActionCreator, RulesViewActions } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesViewActions";
import { ConditionParametersEditor, IConditionParameterEditorProps } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ConditionParameterEditor";
import { ConditionTypeDropdown, IConditionTypeDropdownProps } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ConditionTypeDropdown";
import { RulesViewStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesViewStore";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { ClientOnlyRuleActionTypes, RuleValidationConstants } from "WorkCustomization/Scripts/Constants";
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import { getActionIcon } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/RuleIcons";
import { FieldAndValueInput, FieldOnlyInput, TwoFieldsInput, getIncompatibleFieldTypesForValueFieldType } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/RuleInputs";
import { SelectableOptionMenuItemType } from "OfficeFabric/utilities/selectableOption/SelectableOption.types";
import { FieldType } from "TFS/WorkItemTracking/ProcessContracts";
import { WorkItemField, FieldType as WorkItemTypeFieldType } from "TFS/WorkItemTracking/Contracts";

export interface IActionEditorProps extends Props  {
    index: number
    store: RulesViewStore;
    processId: string;
    workItemTypeRefName: string;
    actionsCreator: RulesViewActionCreator;
    removeAction: (index: number) => void;
    placeFocusOnMountOrUpdate?: boolean;
    isDisabled?: boolean;
}

export class ActionEditor extends Component<IActionEditorProps, State>{
    public static readonly actionTypeDropdownClassName: string = "action-editor-dropdown";
    public static readonly removeActionButtonClassName: string = "remove-condition-button";

    private _actionTypeDropdownRef: HTMLDivElement;

    public render(): JSX.Element {

        let allActions = actions;
        if (this.props.store.getRule().customizationType == ProcessContracts.CustomizationType.System) {
            allActions = allActions.concat([Resources.RulesActionsSetDefaultValue, Resources.RulesActionMakeReadOnly]);
        }

        let options: IDropdownOption[] = allActions.map(c => { return { key: c, text: c, itemType: SelectableOptionMenuItemType.Normal } });
        let dropdownProps: IDropdownProps = {
            options: options,
            onChanged: this._dropDownChanged,
            required: true,
            selectedKey: "",
            placeHolder: Resources.SelectAnActionLabel,
            ariaLabel: Resources.SelectAnActionLabel,
            onRenderTitle: (items: IDropdownOption[]) => {
                if (items !== null && items.length > 0) {
                    return <span><i className={getActionIcon(items[0].key.toString())}></i>{items[0].text}</span>;
                }
                return null;
            },
            onRenderOption: (item: IDropdownOption) => {
                return <span><i className={getActionIcon(item.key.toString())}></i><span className={"fabric-dropdown-optionText"}>{item.text}</span></span>
            },
            className: ActionEditor.actionTypeDropdownClassName,
            disabled: this.props.isDisabled
        }

        if (this._getActionType()) {
            dropdownProps.selectedKey = this._getActionType();
        }

        // we don't want to show the delete button if there is only one action row
        let deleteButton: JSX.Element = null;
        let hideRemoveActionButton = this.props.store.getRule().actions.length === 1;
        if (!hideRemoveActionButton) {
            deleteButton = <div className={"rule-form-editor-remove-row"}>
                <CommandButton disabled={this.props.isDisabled} iconProps={{ className: "bowtie-icon bowtie-edit-remove" }} onClick={this._removeAction} className={ActionEditor.removeActionButtonClassName} ariaLabel={Resources.RemoveActionLabel} />
            </div>;
        }

        let firstActionText = this.props.store.getRule().conditions.length === 0 ? Resources.AlwaysText : Resources.ThenText;

        return <div className={"rule-form-editor-row"}>
            <label className="rules-form-input-label">{this.props.index === 0 ? firstActionText : Resources.AndText}</label>
            <div className={"rule-form-editor-input"}>
                <Dropdown {...dropdownProps} componentRef={(ref: HTMLDivElement) => { this._actionTypeDropdownRef = ref; }} />
            </div>
            {this._getValueInputs()}
            {deleteButton}
        </div>;
    }

    public componentDidMount() {
        if (this.props.placeFocusOnMountOrUpdate) {
            this._actionTypeDropdownRef.focus();
        }
    }

    public componentDidUpdate() {
        if (this.props.placeFocusOnMountOrUpdate) {
            this._actionTypeDropdownRef.focus();
        }
    }

    private _getValueInputs(): JSX.Element {
        switch (this._getActionType()) {
            case Resources.RulesActionClear:

                return <FieldOnlyInput value1={this._getAction().targetField}
                    onValueChanged={this._actionParamsChanged}
                    hiddenFieldTypes={[FieldType.Boolean]}
                    processId={this.props.processId}
                    witRefName={this.props.workItemTypeRefName}
                    disabled={this.props.isDisabled} />

            case Resources.RulesActionMakeReadOnly:
                return <FieldOnlyInput value1={this._getAction().targetField}
                    onValueChanged={this._actionParamsChanged}
                    processId={this.props.processId}
                    witRefName={this.props.workItemTypeRefName}
                    disabled={this.props.isDisabled}/>

            case Resources.RulesActionMakeRequired:
                return <FieldOnlyInput value1={this._getAction().targetField}
                    onValueChanged={this._actionParamsChanged}
                    processId={this.props.processId}
                    witRefName={this.props.workItemTypeRefName}
                    disabled={this.props.isDisabled} />

            case Resources.RulesActionsCurrentUser:
                return <FieldOnlyInput value1={this._getAction().targetField}
                    onValueChanged={this._actionParamsChanged}
                    processId={this.props.processId}
                    hiddenFieldTypes={getIncompatibleFieldTypesForValueFieldType(FieldType.Identity)}
                    witRefName={this.props.workItemTypeRefName}
                    disabled={this.props.isDisabled} />

            case Resources.RulesActionsSetCurrentTime:

                return <FieldOnlyInput value1={this._getAction().targetField}
                    onValueChanged={this._actionParamsChanged}
                    processId={this.props.processId}
                    hiddenFieldTypes={getIncompatibleFieldTypesForValueFieldType(FieldType.DateTime)}
                    witRefName={this.props.workItemTypeRefName}
                    disabled={this.props.isDisabled} />

            case Resources.RulesActionsSetValueOf:
            case Resources.RulesActionsSetDefaultValue:

                return <FieldAndValueInput middleString={Resources.DropDownSeparatorTo}
                    value1={this._getAction().targetField}
                    value2={this._getAction().value}
                    onValueChanged={this._actionParamsChanged}
                    requireValue={true}
                    maxValueLength={RuleValidationConstants.MaxFieldValueLength}
                    processId={this.props.processId}
                    witRefName={this.props.workItemTypeRefName}
                    disabled={this.props.isDisabled} />

            case Resources.RulesActionCopyTo:
                let value1 = this._getAction().value;
                let value1FieldType: FieldType = null;
                if (value1) {
                    let value1Field: WorkItemField = this.props.store.getFieldByReferenceNameOrName(this._getAction().value)
                    if (value1Field) {
                        let valueFieldType: string = value1Field.type.toString();
                        // when we to string the enum, it gives out with the first letter dropped to lower case... so we have to bring it back up to upper case to use as a key. \
                        // we have to use the string field type name as these enums for some reason have different values... coool... 
                        valueFieldType = valueFieldType.charAt(0).toUpperCase() + valueFieldType.slice(1);
                        value1FieldType = value1Field.isIdentity ? FieldType.Identity : FieldType[valueFieldType];
                    }
                } 

                return <TwoFieldsInput value1={value1}
                    value1FieldType={value1FieldType}
                    value2={this._getAction().targetField}
                    onValueChanged={this._actionParamsChangedSwapped}
                    processId={this.props.processId}
                    witRefName={this.props.workItemTypeRefName}
                    disabled={this.props.isDisabled} />

            default:
                return null;
        }
    }

    @autobind
    private _dropDownChanged(option: IDropdownOption): void {
        this.props.actionsCreator.changeActionType(this.props.store.getRule(), this.props.index, option.key.toString());
    }

    @autobind
    private _actionParamsChanged(value1: string, value2: string): void {
        this.props.actionsCreator.changeActionParameters(this.props.store.getRule(), this.props.index, value1, value2);
    }

    @autobind
    private _actionParamsChangedSwapped(value1: string, value2: string): void {
        this.props.actionsCreator.changeActionParameters(this.props.store.getRule(), this.props.index, value2, value1);
    }

    @autobind
    private _removeAction() {
        this.props.removeAction(this.props.index);
    }

    private _getAction(): ProcessContracts.RuleAction {
        return this.props.store.getRule().actions[this.props.index];
    }

    private _getActionType(): string {
        return this.props.store.getActionType(this.props.index);
    }
}

export const actions: string[] = ([
    Resources.RulesActionClear,
    Resources.RulesActionCopyTo,
    Resources.RulesActionMakeRequired,
    Resources.RulesActionMakeReadOnly,
    Resources.RulesActionsSetValueOf,
    Resources.RulesActionsSetCurrentTime,
    Resources.RulesActionsCurrentUser
]).sort((a: string, b: string) => {
        return a.localeCompare(b);
});

export const getDefaultField = (type: string) => {
    switch (type) {
        case Resources.RulesConditionsStateIs:
        case Resources.RulesConditionsStateIsNot:
        case Resources.RulesConditionsStateChangedTo:
        case Resources.RulesConditionsStateChangedFromAndTo:
        case Resources.RulesConditionsWorkItemIsCreated:
        case Resources.RulesConditionsStateNotChanged:
            return CoreFieldRefNames.State;
        default:
            return "";
    }
}

export const getDefaultValue = (type: string, initialState?: ProcessContracts.WorkItemStateResultModel) => {
    switch (type) {
        case Resources.RulesConditionsValueDefined:
        case Resources.RulesConditionsValueNotDefined:
        case Resources.RulesActionClear:
            return "";
        case Resources.RulesConditionsWorkItemIsCreated:
            return "." + initialState.name;
        default:
            return "";
    }
}
