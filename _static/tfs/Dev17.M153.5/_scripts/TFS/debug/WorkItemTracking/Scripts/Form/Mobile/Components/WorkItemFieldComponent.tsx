import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Mobile/Components/WorkItemFieldComponent";

import * as Q from "q";
import * as React from "react";

import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

import { caseInsensitiveContains } from "VSS/Utils/String";
import { delay } from "VSS/Utils/Core";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemControlComponent, IWorkItemControlProps } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";
import { IDataSource, IItem, PickerMode, Picker, PickerValidationResult } from "WorkItemTracking/Scripts/Form/React/Components/Picker";
import { IWorkItemFormComponentContext } from "WorkItemTracking/Scripts/Form/React/FormContext";

export interface IFieldValueItem extends IItem {
}

export class WorkItemFieldDataSource implements IDataSource<IFieldValueItem> {
    private _filter: string;

    constructor(private field: WITOM.Field) {
    }

    public getItems(): IFieldValueItem[] {
        return this.field.getAllowedValues()
            .filter(value => !this._filter || caseInsensitiveContains(value, this._filter))
            .map(value => ({
                key: value,
                value
            }));
    }

    public setFilter(text: string): void {
        this._filter = text;
    }

    public getFilter(): string {
        return this._filter;
    }

    public clearFilter(): void {
        this._filter = null;
    }
}

export interface IWorkItemFieldComponentProps extends IWorkItemControlProps {
    /** Callback once a value is selected */
    onValueSelected?: Function;

    /** Optional override for rendering the item */
    onRenderItem?: (item: IFieldValueItem, filter?: string) => JSX.Element;
}

export interface IWorkItemFieldComponentState {
    pickerMode?: PickerMode;
}

type WorkItemFieldPicker = new () => Picker<IFieldValueItem, WorkItemFieldDataSource>;
const WorkItemFieldPicker = Picker as WorkItemFieldPicker;

export class WorkItemFieldComponent extends WorkItemControlComponent<IWorkItemFieldComponentProps, IWorkItemFieldComponentState> {
    private _resolvePicker = (picker: Picker<IFieldValueItem, WorkItemFieldDataSource>) => this._picker = picker;
    private _picker: Picker<IFieldValueItem, WorkItemFieldDataSource>;

    private _dataSource: WorkItemFieldDataSource;

    constructor(props: IWorkItemFieldComponentProps, context: IWorkItemFormComponentContext) {
        super(props, context);

        this.state = {
            pickerMode: null
        };
    }

    public render(): JSX.Element {
        const { onRenderItem } = this.props;

        if (this.state.pickerMode != null) {
            const field = this._getField();
            const fieldValue = field.getValue();

            let separatorText = "";
            if (field.hasList() && !field.isLimitedToAllowedValues()) {
                separatorText = WorkItemTrackingResources.Heading_SuggestedValues;
            }

            return <WorkItemFieldPicker
                inputAriaLabel={this.props.controlOptions.ariaLabel}
                dataSource={this._dataSource}
                value={fieldValue}
                selectedValue={fieldValue}
                onSelect={this._onSelect}
                pickerMode={this.state.pickerMode}
                allowEmptyInput={!field.isRequired() && field.isLimitedToAllowedValues()}
                onChange={this._onChange}
                inputType={this._getInputType(field)}
                className="field-control-picker"
                inputClassName="field-control-input"
                separatorText={separatorText}
                separatorClassName="field-control-separator"
                itemClassName="field-control-item"
                itemHeight={45}
                onRenderItem={onRenderItem}
                ref={this._resolvePicker}
            />;
        }

        return <div />;
    }

    private _getField(): WITOM.Field {
        return this._formContext.workItem.getField(this.props.controlOptions.fieldName);
    }

    private _getInputType(field: WITOM.Field): string {
        let inputType = "text";

        const fieldType = field.fieldDefinition.type;
        if (WITOM.Field.isNumericField(fieldType)) {
            inputType = "number";
        }

        return inputType;
    }

    private _onSelect = (item: IFieldValueItem) => {
        this._formContext.workItem.setFieldValue(this.props.controlOptions.fieldName, item.value);

        this.forceUpdate(() => {
            if (this.state.pickerMode === PickerMode.Input) {
                if (this._picker) {
                    this._picker.focusInput();
                }
            }
        });

        if (this.state.pickerMode === PickerMode.Filter) {
            if (this.props.onValueSelected) {
                // Wait for animation to finish, then call callback
                delay(null, 450, () => this.props.onValueSelected());
            }
        }
    }

    private _onChange = (value: string): PickerValidationResult => {
        const field = this._getField();
        field.setValue(value);

        // Re-render control to update selection
        this.forceUpdate();

        if (field.isValid()) {
            return true;
        }

        return field.getErrorText();
    }

    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        // Create data source
        const field = this._getField();
        this._dataSource = new WorkItemFieldDataSource(field);

        // Determine picker mode
        const limitedToAllowedValues = field.isLimitedToAllowedValues();
        let newPickerMode: PickerMode;
        if (limitedToAllowedValues) {
            newPickerMode = PickerMode.Filter;
        } else {
            newPickerMode = PickerMode.Input;
        }

        this.setState({
            pickerMode: newPickerMode
        }, () => {
            const field = this._getField();
            if (field && this._picker) {
                if (!field.hasList()) {
                    // Field has neither allowed nor suggested values, focus the input
                    this._picker.focusInput();
                }
            }
        });
    }
}
