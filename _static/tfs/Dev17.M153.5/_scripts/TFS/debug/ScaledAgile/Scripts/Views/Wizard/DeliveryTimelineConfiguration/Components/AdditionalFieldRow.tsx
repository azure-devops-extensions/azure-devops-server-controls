/// <reference types="react" />
/// <reference types="jqueryui" />

import * as React from "react";

import { IComboOptions } from "VSS/Controls/Combos";

import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { KeyCode } from "VSS/Utils/UI";
import { FilterDropdownCombo, IFilterDropdownComboProps } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/FilterDropdownCombo";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { IAdditionalField } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import Utils_UI = require("VSS/Utils/UI");
import { autobind } from "OfficeFabric/Utilities";
import ScaledAgileResources = require("ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile");


export interface IAdditionalFieldRowProps extends React.Props<void> {
    /**
     * id of additional field row
     */
    id: string;    
    /**
     * index this of this field row 
     */
    index: number;
    /**
     * additional field
     */
    field: IAdditionalField;
    /**
     * supported field values
     */
    allowedFields: IFieldDefinition[];
    onChanged: (value: string) => void;
    onDeleted: () => void;
    disabled: boolean;
    focusRowOnRender?: boolean;
    focusFieldOnRender?: boolean;
    focusDeleteOnRender?: boolean;
    onKeyboardReorder: (itemId: string, newIndex: number) => void;
}

export class AdditionalFieldRow extends React.Component<IAdditionalFieldRowProps, {}> {
    public static ADDITIONAL_FIELD_CLASS = "additional-setting-field";
    private _comboSource: IFieldShallowReference[];
    private _deleteButtonDom: HTMLDivElement;
    private _rowDom: HTMLDivElement;

    constructor(props: IAdditionalFieldRowProps) {
        super(props);

        this._comboSource = this.props.allowedFields.map((f, index) => { return { id: index + "", name: f.name, valueState: ValueState.ReadyAndValid } as IFieldShallowReference; });
        this._onInputChange = this._onInputChange.bind(this);
    }

    public componentDidMount() {
        if (this.props.focusDeleteOnRender) {
            this._deleteButtonDom.focus();
        }
        else if (this.props.focusRowOnRender) {
            this._rowDom.focus();
        }
    }

    public componentDidUpdate() {
        if (this.props.focusDeleteOnRender) {
            this._deleteButtonDom.focus();
        }
        else if (this.props.focusRowOnRender) {
            this._rowDom.focus();
        }
    }

    public render(): JSX.Element {
        const initialValue: IFieldShallowReference = { id: "", name: this._getFieldDisplayName(), valueState: this.props.field.isValid ? ValueState.ReadyAndValid : ValueState.ReadyButInvalid } as IFieldShallowReference;
        let defaultOptions: IComboOptions = {
            placeholderText: ScaledAgileResources.AdditionalFieldInputPlaceholder
        };

        return <div id={this.props.id} 
                tabIndex={0} 
                ref={(rowDom) => { this._rowDom = rowDom; } }
                onKeyDown={this._onKeyboardReorder}
                style={{width: "400px"}}
                aria-label={ScaledAgileResources.AdditionalFieldReorderLabel}
                className={AdditionalFieldRow.ADDITIONAL_FIELD_CLASS}>
            <div className="bowtie-icon bowtie-resize-grip"></div>
            <div className="dropdown">
                <FilterDropdownCombo
                    id={this.props.field.identifier}
                    ariaLabel={ScaledAgileResources.AdditionalFieldInputPlaceholder}
                    initialValue={initialValue}
                    onInputChange={this._onInputChange}
                    values={this._comboSource}
                    options={defaultOptions}
                    focusOnMount={this.props.focusFieldOnRender}
                    inputValidator={this._validateInput} />
            </div>
            <div className="delete-icon-container propagate-keydown-event"
                tabIndex={0}
                ref={(deleteButton) => { this._deleteButtonDom = deleteButton; } }
                role="button"
                aria-label={ScaledAgileResources.AdditionalFieldDeleteButtonTooltip}
                aria-disabled={!!this.props.disabled}
                onClick={(e) => { this._onDeleteButtonClick(e); } }
                onKeyDown={(e) => { this._onDeleteButtonKeyDown(e); } }>
                <i className="bowtie-icon bowtie-math-multiply" />
            </div>
        </div>;
    }

    @autobind
    private _onKeyboardReorder(e: React.KeyboardEvent<HTMLElement>) {   
        if (e.keyCode === Utils_UI.KeyCode.DOWN && (e.ctrlKey || e.metaKey)) {
             this.props.onKeyboardReorder(this.props.id, this.props.index + 1);
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP && (e.ctrlKey || e.metaKey)) {
             this.props.onKeyboardReorder(this.props.id, this.props.index - 1);
        }
    }

    private _onInputChange(value: string) {
        this.props.onChanged(value);
    }

    private _validateInput(nextProps: IFilterDropdownComboProps) {
        return nextProps.initialValue.valueState === ValueState.ReadyAndValid;
    }

    private _getFieldDisplayName(): string {
        const fields = this.props.allowedFields;
        for (let i = 0; i < fields.length; i++) {
            if (fields[i].referenceName === this.props.field.referenceName) {
                return fields[i].name;
            }
        }

        // if not found in the allowed fields, use the name user edited
        return this.props.field.name;
    }

    private _onDeleteButtonClick(e: React.MouseEvent<HTMLElement>) {
        this._onDeleteButtonHandler();
    }

    private _onDeleteButtonKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === KeyCode.ENTER) {
            this._onDeleteButtonHandler();
        }
        return false;
    }

    private _onDeleteButtonHandler() {
        if (!this.props.disabled) {
            this.props.onDeleted();
        }
    }
}
