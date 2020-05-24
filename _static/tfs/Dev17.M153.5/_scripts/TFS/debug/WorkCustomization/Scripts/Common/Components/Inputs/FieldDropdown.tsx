/// <reference types="react" />

import * as React from "react";
import { TypeAheadDropDown, ITypeAheadDropDownProps } from "WorkCustomization/Scripts/Common/Components/TypeAheadDropDown";
import { getFieldsStore, FieldsStore } from "WorkCustomization/Scripts/Stores/WorkItemType/FieldsStore";
import { Component, Props, State } from "VSS/Flux/Component";
import { FieldModel, FieldType } from "TFS/WorkItemTracking/ProcessContracts";
import StringUtils = require("VSS/Utils/String");
import { FieldUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { IValueIdPair } from "Presentation/Scripts/TFS/Components/LegacyCombo";
import { autobind } from "OfficeFabric/Utilities";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import * as DropdownUtils from "WorkCustomization/Scripts/Utils/DropdownUtils";
import ArrayUtils = require("VSS/Utils/Array");
import * as TFSCoreUtils from "Presentation/Scripts/TFS/TFS.Core.Utils"; 

export interface IFieldDropdownProps extends Props {
    processId: string;
    witRefName: string;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    hideSystemFields?: boolean;
    hiddenFieldTypes?: FieldType[];
    explicitShowState?: boolean;
    explicitlyDeniedFieldReferenceNames?: string[];
    restrictToFieldsOnForm?: boolean;
}

export interface IFieldDropdownState extends State {
    fields: FieldModel[];
    nameToFieldDictionary: IDictionaryStringTo<FieldModel>;
}

export class FieldDropdown extends Component<IFieldDropdownProps, IFieldDropdownState>{
    public static readonly fieldDropDownClassName = "field-drop-down";

    private _errorMessage: string;
    private _errorMessageId: string;

    public render(): JSX.Element {
        let dropdownProps: ITypeAheadDropDownProps = this._getDropdownProps();
        return <div>
            <TypeAheadDropDown {...dropdownProps} />
            <div aria-live="assertive" aria-labelledby={this._errorMessageId} hidden={!this._errorMessage}>
                <div id={this._errorMessageId} className="input-error-tip">{this._errorMessage}</div>
            </div>
        </div>;
    }

    protected getState(): IFieldDropdownState {
        let store: FieldsStore = this.getStore();
        return {
            fields: store.getAllFields(this.props.processId, this.props.witRefName),
            nameToFieldDictionary: store.getNameToFieldDictionary(this.props.processId, this.props.witRefName)
        };
    }

    protected getStore(): FieldsStore {
        return getFieldsStore();
    }

    private _getDropdownProps(): ITypeAheadDropDownProps {
        let filteredFields = filterFields(this.state.fields, this.props, (fieldReferenceName: string) => { return this.getStore().isFieldVisibleOnForm(this.props.processId, this.props.witRefName, fieldReferenceName); });

        let valueIdPairs: IValueIdPair[] = getFieldValueIdPairs(filteredFields);

        let dropdownProps: ITypeAheadDropDownProps = {
            values: valueIdPairs,
            key: this.props.disabled + "",
            initialValue: DropdownUtils.getTypeAheadDropdownInitialValue(valueIdPairs, this.props.value),
            className: FieldDropdown.fieldDropDownClassName,
            placeholderText: Resources.FieldDropdownPlaceholder,
            ariaLabel: Resources.FieldDropdownPlaceholder,
            disabled: this.props.disabled,
            onInputChange: this._onChange
        }

        return dropdownProps;
    }

    @autobind
    private _onChange(value: string, isValid: boolean): void {
        if (isValid) {
            // value is the field name, we need to convert to field refname
            value = this.state.nameToFieldDictionary[value].id;
            this._errorMessage = null;
            this._errorMessageId = null;
        }
        else {
            this._errorMessage = StringUtils.format(Resources.FieldDropdownFieldNotValid, value);
            this._errorMessageId = "rule-error-" + TFSCoreUtils.GUIDUtils.newGuid();
        }

        if (this.props.onValueChange) {
            this.props.onValueChange(value);
        }
    }
}

export const getFieldValueIdPairs = (fields: FieldModel[]): IValueIdPair[] => {
    return fields.map(field => {
        return {
            id: field.id,
            name: field.name
        };
    });
}

export const filterFields = (fields: FieldModel[], props: IFieldDropdownProps, isVisibleOnFormPredicate: (fieldReferenceName: string) => boolean): FieldModel[] => {

    return fields.filter((f: FieldModel) => {
        let hiddenFieldTypes = props.hiddenFieldTypes || [];
        if (ArrayUtils.contains(hiddenFieldTypes, f.type) || (f.isIdentity && ArrayUtils.contains(hiddenFieldTypes, FieldType.Identity))) {
            return false;
        }

        // explicitly disallowed fields
        if (ArrayUtils.contains(props.explicitlyDeniedFieldReferenceNames || [], f.id)) {
            return false;
        }

        if (FieldUtils.isWorkItemTypeField(f.id)) {
            return false;
        }
        // in process customization state is given special treatment and is not used as a field
        // removing state field always this from this dropdown
        if (FieldUtils.isStateField(f.id) && !props.explicitShowState) {
            return false;
        }


        if (props.restrictToFieldsOnForm) {
            if (!isVisibleOnFormPredicate(f.id)) {
                return false;
            }
        }

        if (props.hideSystemFields) {
            return !FieldUtils.isSystemField(f.id);
        }

        return true;
    });
}
