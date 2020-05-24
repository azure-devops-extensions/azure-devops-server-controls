/// <reference types="react" />

import { DatePicker } from "OfficeFabric/DatePicker";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";
import { SelectableOptionMenuItemType } from "OfficeFabric/utilities/selectableOption/SelectableOption.types";
import { IdentityPickerProps, IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";
import * as React from "react";
import { FieldType, WorkItemField } from "TFS/WorkItemTracking/Contracts";
import { Component, Props } from "VSS/Flux/Component";
import * as IdentitiesPickerRestClient from "VSS/Identities/Picker/RestClient";
import StringUtils = require("VSS/Utils/String");
import { AllowedValuesDropdown } from "WorkCustomization/Scripts/Common/Components/Inputs/AllowedValuesDropdown";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { CollectionFieldsStore, getCollectionFieldsStore } from "WorkCustomization/Scripts/Stores/CollectionFieldsStore";
import Utils_Date = require("VSS/Utils/Date");
import * as IdentityPicker from "VSS/Identities/Picker/Controls";

export interface IDynamicInputProps extends Props {
    fieldRefNameOrName: string;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    requireValue?: boolean;
    maxValueLength?: number;
}

export interface IDynamicInputState {
    field: WorkItemField;
    fieldType: string;
    allowedValues: string[];
}

export class DynamicInput extends Component<IDynamicInputProps, IDynamicInputState>{

    private _errorMessage: string;
    private _focusIdentityPicker = false;

    public render(): JSX.Element {

        if (!this.props.fieldRefNameOrName || !this.state.fieldType) {
            return <TextField key="disabled" disabled={true} className={this.props.cssClass} />;
        }

        if (this.state.allowedValues && this.state.allowedValues.length > 0) {
            return <AllowedValuesDropdown
                allowedValues={this.state.allowedValues}
                cssClass={this.props.cssClass}
                disabled={this.props.disabled}
                field={this.state.field}
                initialValue={this.props.value}
                onValueChange={this.props.onValueChange} />
        }

        //typescript bug: for switch statements typescript converts enum to strings
        switch (this.state.fieldType) {
            case FieldType[FieldType.Boolean].toLowerCase():
                let selectedKey: string = this.props.value ? this.props.value : undefined;
                return <Dropdown
                    className={this.props.cssClass}
                    onChanged={this._dropDownChanged}
                    options={[
                        { key: "true", text: "true", itemType: SelectableOptionMenuItemType.Normal },
                        { key: "false", text: "false", itemType: SelectableOptionMenuItemType.Normal }
                    ]}
                    selectedKey={selectedKey}
                    disabled={this.props.disabled} />;

            case FieldType[FieldType.DateTime].toLowerCase():
                return <DatePicker
                    onSelectDate={this._onDateSelected}
                    className={this.props.cssClass}
                    value={this.props.value ? new Date(this.props.value) : null} />;

            case FieldType[FieldType.Identity].toLowerCase():
                let focusIdentity = false;
                if (this._focusIdentityPicker) {
                    focusIdentity = true;
                }

                this._focusIdentityPicker = false;
                let identityPickerProps: IdentityPickerProps = {
                    consumerId: "ebcf1b5d-db67-440c-b4c5-a7506ecfdb55",
                    focusOnLoad: focusIdentity,
                    multiIdentitySearch: false,
                    inlineSelectedEntities: true,
                    includeGroups: false,
                    showTemporaryDisplayName: true,
                    defaultEntities: this.props.value ? [this.props.value] : undefined,
                    identitySelected: this._onIdentitySelected,
                    controlSize: IdentityPicker.IdentityPickerControlSize.Large,
                    preDropdownRender: this._preDropdownRender,
                    className: "rules-identity-search",
                    identitiesUpdated: this._onIdentitiesUpdated,
                    readOnly: this.props.disabled
                };
              
                return <div><IdentityPickerSearch key={this.props.value} {...identityPickerProps} />
                    <div aria-live="assertive" className="input-error-tip" hidden={!this._errorMessage}>{this._errorMessage}</div>
                </div>;

            case FieldType[FieldType.Double].toLowerCase():
            case FieldType[FieldType.Integer].toLowerCase():
            case FieldType[FieldType.Html].toLowerCase():
            case FieldType[FieldType.PlainText].toLowerCase():
            case FieldType[FieldType.String].toLowerCase():
            default:
                return <TextField className={this.props.cssClass}
                    required={true}
                    placeholder={Resources.DynamicInputTextPlaceholder}
                    onChanged={this._onChange}
                    key={this.props.fieldRefNameOrName}
                    value={this.props.value}
                    onGetErrorMessage={this._getErrorMessage}
                    disabled={this.props.disabled}
                    validateOnLoad={false}
                    validateOnFocusOut />
        }
    }

    public componentWillUpdate(nextProps: IDynamicInputProps, nextState: IDynamicInputState) {
        if (!(this.state && this.state.field && nextState && nextState.field) || this.state.field.referenceName !== nextState.field.referenceName) {
            this._errorMessage = "";
        }
    }

    protected getStore(): CollectionFieldsStore {
        return getCollectionFieldsStore();
    }

    protected getState(): IDynamicInputState {
        return this._getState(this.props);
    }

    private _getState(props: IDynamicInputProps): IDynamicInputState {
        let field: WorkItemField = this.getStore().getFieldByReferenceNameOrName(props.fieldRefNameOrName);
        let fieldType: string;

        if (field && field.type != null) {
            fieldType = field.isIdentity ? FieldType[FieldType.Identity].toLowerCase() : field.type.toString().toLowerCase();
        }

        let allowedValues: string[] = field && field.referenceName && this.getStore().getFieldAllowedValues(field.referenceName);

        return {
            field: field,
            fieldType: fieldType,
            allowedValues: allowedValues
        };
    }

    public componentWillReceiveProps(nextProps: IDynamicInputProps): void {
        this.setState(this._getState(nextProps));
    }

    @autobind
    private _onIdentitySelected(entity: IdentitiesPickerRestClient.IEntity): void {
        this._errorMessage = "";
        if (this.props.onValueChange) {
            this._focusIdentityPicker = true;
            this.props.onValueChange(entity.localId);
        }
    }

    @autobind
    private _preDropdownRender(identities: IdentitiesPickerRestClient.IEntity[]): IdentitiesPickerRestClient.IEntity[] {
        return identities.filter(identity => { return !!identity.localId });
    }

    @autobind
    private _onIdentitiesUpdated(identities: IdentitiesPickerRestClient.IEntity[]): void {
        if (identities.length === 0) {
            this._errorMessage = Resources.RulesInvalidIdentity;
            this._focusIdentityPicker = true;
            this.props.onValueChange("");
        }
    }

    @autobind
    private _onDateSelected(date: Date): void {
        if (this.props.onValueChange) {
            this.props.onValueChange(Utils_Date.localeFormat(date, "d"));
        }
    }

    @autobind
    private _getErrorMessage(value: string): string {
        return getErrorMessage(value, this.state.field && this.state.field.type && this.state.field.type.toString(), this.props.requireValue, this.props.maxValueLength);
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

export const getErrorMessage = (value: string, fieldType?: string, requireValue?: boolean, maxValueLength?: number): string => {
    if (requireValue && !value) {
        return Resources.DynamicInputEmptyValidationError;
    }

    if (fieldType) {
        switch (fieldType.toLowerCase()) {
            case FieldType[FieldType.Double].toLowerCase():
                if (isNaN(Number(value))) {
                    return Resources.DynamicInputNotDecimalError;
                }
                break;
            case FieldType[FieldType.Integer].toLowerCase():
                if (value !== parseInt(value, 10).toString()) {
                    return Resources.DynamicInputNotIntegerError;
                }
                break;
        }
    }

    if (maxValueLength && value.length > maxValueLength) {
        return StringUtils.format(Resources.DynamicInputValueTooLongError, maxValueLength);
    }

    return '';
}
