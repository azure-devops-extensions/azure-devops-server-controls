/// <reference types="react" />

import * as React from "react";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { autobind } from "OfficeFabric/Utilities";
import { DynamicInput } from "WorkCustomization/Scripts/Common/Components/Inputs/DynamicInput";
import { FieldDropdown, IFieldDropdownProps } from "WorkCustomization/Scripts/Common/Components/Inputs/FieldDropdown";
import { StatesDropdown } from "WorkCustomization/Scripts/Common/Components/Inputs/StatesDropdown";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { RuleFieldGroupings } from "WorkCustomization/Scripts/Utils/RuleUtils";
import { FieldType } from "TFS/WorkItemTracking/ProcessContracts";
import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import ArrayUtils = require("VSS/Utils/Array");

export interface IMultiValueInputProps {
    onValueChanged?: (value1: string, value2: string) => void;
    value1?: string;
    value2?: string;
    valuesForField?: string;
    middleString?: string;
    disabled?: boolean;
}

export interface IFieldMultiValueInputProps extends IMultiValueInputProps {
    processId: string;
    witRefName: string;
    requireValue?: boolean;
    maxValueLength?: number;
    hideSystemFields?: boolean;
    hiddenFieldTypes?: FieldType[];
    explicitShowState?: boolean;
    restrictToFieldsOnForm?: boolean;
    key?: string;
}

export interface ITwoFieldInputProps extends IFieldMultiValueInputProps {
    value1FieldType: FieldType;
}

export class FieldOnlyInput extends React.Component<IFieldMultiValueInputProps, {}>{
    public render(): JSX.Element {
        return <div className={"rule-form-editor-two-input-container"}>
            <div className={"rule-form-editor-input"}>
                <FieldDropdown
                    onValueChange={this._fieldSelectionChanged}
                    value={this.props.value1}
                    hiddenFieldTypes={this.props.hiddenFieldTypes}
                    hideSystemFields={this.props.hideSystemFields}
                    processId={this.props.processId}
                    witRefName={this.props.witRefName}
                    disabled={this.props.disabled}
                    explicitShowState={this.props.explicitShowState}
                    explicitlyDeniedFieldReferenceNames={RuleFieldGroupings.getExplicitlyDeniedSystemFields()}
                    restrictToFieldsOnForm={this.props.restrictToFieldsOnForm} />
            </div>
        </div>;
    }

    @autobind
    private _fieldSelectionChanged(newValue: string): void {
        if (this.props.onValueChanged) {
            this.props.onValueChanged(newValue, "");
        }
    }
}

export class FieldAndValueInput extends React.Component<IFieldMultiValueInputProps, {}>{

    public static readonly valueInputClassName = "value-input";

    private _field: string;
    private _value: string;
    public render(): JSX.Element {
        return <div className={"rule-form-editor-two-input-container"}>
            <div className={"rule-form-editor-input"}>
                <FieldDropdown
                    onValueChange={this._fieldSelectionChanged}
                    value={this.props.value1}
                    hiddenFieldTypes={this.props.hiddenFieldTypes}
                    hideSystemFields={this.props.hideSystemFields}
                    processId={this.props.processId}
                    witRefName={this.props.witRefName}
                    disabled={this.props.disabled}
                    explicitShowState={this.props.explicitShowState}
                    explicitlyDeniedFieldReferenceNames={RuleFieldGroupings.getExplicitlyDeniedSystemFields()} />
            </div>
            <label className="rules-form-input-label rules-form-middle-string">{this.props.middleString}</label>
            <div className={"rule-form-editor-input"}>
                <DynamicInput
                    onValueChange={this._valueChanged}
                    fieldRefNameOrName={this._field}
                    value={this.props.value2}
                    disabled={this.props.disabled}
                    cssClass={FieldAndValueInput.valueInputClassName}
                    requireValue={this.props.requireValue}
                    maxValueLength={this.props.maxValueLength} />
            </div>
        </div>;
    }

    public componentWillMount(): void {
        this._field = this.props.value1;
        this._value = this.props.value2;
    }

    @autobind
    private _fieldSelectionChanged(newValue: string): void {
        this._field = newValue;
        if (this.props.onValueChanged) {
            this.props.onValueChanged(this._field, "");
        }
    }

    @autobind
    private _valueChanged(newValue: string): void {
        this._value = newValue;
        if (this.props.onValueChanged) {
            this.props.onValueChanged(this._field, this._value);
        }
    }
}

export class TwoFieldsInput extends React.Component<ITwoFieldInputProps, {}>{
    private _value1: string;
    private _value2: string;

    public render(): JSX.Element {

        let value2HiddenFieldTypes = getIncompatibleFieldTypesForValueFieldType(this.props.value1FieldType);

        return <div className={"rule-form-editor-two-input-container"}>
            <div className={"rule-form-editor-input"}>
                <FieldDropdown
                    onValueChange={this._value1Changed}
                    value={this.props.value1}
                    processId={this.props.processId}
                    witRefName={this.props.witRefName}
                    disabled={this.props.disabled}
                    explicitShowState={this.props.explicitShowState}
                    hideSystemFields={this.props.hideSystemFields}
                    explicitlyDeniedFieldReferenceNames={RuleFieldGroupings.getExplicitlyDeniedSystemFields()} />
            </div>
            <label className="rules-form-input-label rules-form-middle-string">{Resources.ToText}</label>
            <div className={"rule-form-editor-input"}>
                <FieldDropdown
                    onValueChange={this._value2Changed}
                    value={this.props.value2}
                    processId={this.props.processId}
                    witRefName={this.props.witRefName}
                    hiddenFieldTypes={value2HiddenFieldTypes}
                    hideSystemFields={this.props.hideSystemFields}
                    disabled={this.props.disabled}
                    explicitShowState={this.props.explicitShowState}
                    explicitlyDeniedFieldReferenceNames={RuleFieldGroupings.getExplicitlyDeniedSystemFields()} />
            </div>
        </div>;
    }

    public componentWillMount(): void {
        this._value1 = this.props.value1;
        this._value2 = this.props.value2;
    }

    @autobind
    private _value1Changed(newValue: string): void {
        this._value1 = newValue;
        if (this.props.onValueChanged) {
            this.props.onValueChanged(this._value1, "");
        }
    }

    @autobind
    private _value2Changed(newValue: string): void {
        this._value2 = newValue;
        if (this.props.onValueChanged) {
            this.props.onValueChanged(this._value1, this._value2);
        }
    }
}

export class StateValueInput extends React.Component<IFieldMultiValueInputProps, {}> {
    public render(): JSX.Element {
        return <div className={"rule-form-editor-two-input-container"}>
            <div className={"rule-form-editor-input"}>

                <StatesDropdown onValueChange={this._value2Changed}
                    key={this.props.key}
                    value={this.props.value2}
                    processId={this.props.processId}
                    witRefName={this.props.witRefName}
                    disabled={this.props.disabled} />
            </div>
        </div>;
    }

    @autobind
    private _value2Changed(newValue: string): void {
        if (this.props.onValueChanged) {
            this.props.onValueChanged(this.props.value1, newValue);
        }
    }
}

export class StateTransitionInput extends React.Component<IFieldMultiValueInputProps, {}> {
    public render(): JSX.Element {
        return <div className={"rule-form-editor-two-input-container"}>
            <div className={"rule-form-editor-input"}>
                <StatesDropdown onValueChange={this._value1Changed}
                    value={this.props.value1}
                    key={this.props.key}
                    processId={this.props.processId}
                    witRefName={this.props.witRefName}
                    disabled={this.props.disabled} />
            </div>
            <label className="rules-form-input-label rules-form-middle-string">{Resources.DropDownSeparatorTo}</label>
            <div className={"rule-form-editor-input"}>
                <StatesDropdown onValueChange={this._value2Changed}
                    value={this.props.value2}
                    key={this.props.key}
                    processId={this.props.processId}
                    witRefName={this.props.witRefName}
                    disabled={this.props.disabled} />
            </div>
        </div>;
    }

    @autobind
    private _value1Changed(newValue: string): void {
        if (this.props.onValueChanged) {
            this.props.onValueChanged(CoreFieldRefNames.State, newValue + "." + this.props.value2);
        }
    }

    @autobind
    private _value2Changed(newValue: string): void {
        if (this.props.onValueChanged) {
            this.props.onValueChanged(CoreFieldRefNames.State, this.props.value1 + "." + newValue);
        }
    }
}

export const getIncompatibleFieldTypesForValueFieldType = (valueType: FieldType): FieldType[] => {
    let allFieldTypes = CommonUtils.getFieldTypeEnumAsArray();
    let allowedFieldTypes = allFieldTypes;
    switch (valueType) {
        case FieldType.String:
            allowedFieldTypes = [FieldType.String, FieldType.PicklistString, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.Integer:
            allowedFieldTypes = [FieldType.String, FieldType.Integer, FieldType.Double, FieldType.PicklistString, FieldType.PicklistInteger, FieldType.PicklistDouble, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.DateTime:
            allowedFieldTypes = [FieldType.String, FieldType.DateTime, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.PlainText:
            allowedFieldTypes = [FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.Html:
            allowedFieldTypes = [FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.TreePath:
            allowedFieldTypes = [FieldType.String, FieldType.TreePath, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.History:
            allowedFieldTypes = [FieldType.History, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.Double:
            allowedFieldTypes = [FieldType.String, FieldType.Integer, FieldType.Double, FieldType.PicklistString, FieldType.PicklistInteger, FieldType.PicklistDouble, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.Guid:
            allowedFieldTypes = [FieldType.String, FieldType.Guid, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.Boolean:
            allowedFieldTypes = [FieldType.String, FieldType.Boolean, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.Identity:
            allowedFieldTypes = [FieldType.String, FieldType.Identity, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.PicklistInteger:
            allowedFieldTypes = [FieldType.String, FieldType.Integer, FieldType.Double, FieldType.PicklistString, FieldType.PicklistInteger, FieldType.PicklistDouble, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.PicklistString:
            allowedFieldTypes = [FieldType.String, FieldType.PicklistString, FieldType.PlainText, FieldType.Html];
            break;
        case FieldType.PicklistDouble:
            allowedFieldTypes = [FieldType.String, FieldType.Integer, FieldType.Double, FieldType.PicklistString, FieldType.PicklistInteger, FieldType.PicklistDouble, FieldType.PlainText, FieldType.Html];
            break;
    }

    return allFieldTypes.filter(t => { return !ArrayUtils.arrayContains(t, allowedFieldTypes, (t, aft) => { return t === aft; }) });
}