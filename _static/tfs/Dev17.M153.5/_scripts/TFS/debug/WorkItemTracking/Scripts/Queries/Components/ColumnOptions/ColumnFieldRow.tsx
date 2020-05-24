import "VSS/LoaderPlugins/Css!Queries/Components/ColumnOptions/ColumnFieldRow";

import * as React from "react";

import { IColumnField } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/Constants";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import { IButton } from "OfficeFabric/Button";
import { ComboBox, IComboBoxOption, IComboBox, IComboBoxProps } from "OfficeFabric/ComboBox";
import { FocusZone, FocusZoneDirection, IFocusZone } from "OfficeFabric/FocusZone";
import { IconButton } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";

export interface IColumnFieldRowProps {
    id: string;
    index: number;
    field: IColumnField;

    /**
     * These are the field to show in the autocomplete dropdown
     */
    autoCompleteFields: IColumnField[];
    canDelete: boolean;
    canSort: boolean;
    onChanged: (value: string) => void;
    onSortChanged: (sortValue: boolean) => void;
    onDeleted: () => void;
    disabled: boolean;
    focusRowOnRender?: boolean;
    focusFieldOnRender?: boolean;
    focusDeleteOnRender?: boolean;
}

export class ColumnFieldRow extends React.Component<IColumnFieldRowProps> {
    public static COLUMN_FIELD_CLASS = "column-field-row";
    private _focusZone: IFocusZone;
    private _comboBox: IComboBox;
    private _deleteButton: IButton;

    constructor(props: IColumnFieldRowProps) {
        super(props);
    }

    public componentDidMount() {
      this._setFocus();
    }

    public componentDidUpdate() {
      this._setFocus();

      if (this.props.field.isInvalid && this.props.field.error) {
          announce(this.props.field.error);
      }
    }

    private _setFocus() {
      if (this.props.focusRowOnRender && this._focusZone) {
        this._focusZone.focus();
      } else if (this.props.focusFieldOnRender && this._comboBox) {
          this._comboBox.focus();
      } else if (this.props.focusDeleteOnRender) {
        this._deleteButton.focus();
      }
    }

    public render(): JSX.Element {
        const comboSource = this.props.autoCompleteFields.map((f, index) => { return { key: f.fieldRefName, text: f.name }; });
        const comboProps: IComboBoxProps = {
            className: "field-combo",
            ariaLabel: this.props.field.name || WITResources.PickAColumn,
            allowFreeform: true,
            autoComplete: "on",
            disabled: this.props.field.isRequired,
            options: comboSource,
            onChanged: this._onInputChange,
            onRenderList: this._onRenderCallout,
            componentRef: this._onComboBoxComponentRef,
            useComboBoxAsMenuWidth: true
        } as IComboBoxProps;

        // selectedKey and value props are mutually exclusive in Combo, so we have to set one or other
        if (this.props.field.fieldRefName && comboSource.some(s => Utils_String.equals(this.props.field.fieldRefName, s.key, true))) {
            comboProps.selectedKey = this.props.field.fieldRefName;
        } else {
            comboProps.text = this.props.field.name;
        }

        return <FocusZone
            id={this.props.id}
            componentRef={this._onFocusZoneComponentRef}
            allowFocusRoot={true}
            className={ColumnFieldRow.COLUMN_FIELD_CLASS}
            aria-label={this._getFocusZoneAriaLabel()}
            role="row"
            data-is-focusable={true}
            direction={FocusZoneDirection.horizontal}>

            <VssIcon
                className="resize-gripper"
                iconName="bowtie-resize-grip"
                iconType={VssIconType.bowtie} />

            <div className="dropdown">
                <ComboBox {...comboProps} />
                {this.props.field.isInvalid && <span className="input-error-tip">{this.props.field.error}</span>}
            </div>
            {this._getFieldRowActions()}
        </FocusZone>;
    }

    private _getFocusZoneAriaLabel(): string {
        const fieldAriaLabel = this.props.field.name !== "" ? this.props.field.name : WITResources.AdditionalFieldEmptyFocusZoneLabel;

        if (this.props.focusFieldOnRender) {
            return WITResources.AdditionalFieldEmptyFocusZoneLabel;
        } else if (this.props.field.isRequired) {
            if (!this.props.canDelete) {
                // Disabled inputs do not receive keydown events once focused
                // Notify the user of the tooltip message - that it cannot be removed
                return Utils_String.format(WITResources.FieldCannotBeEditedNorRemoved, fieldAriaLabel);
            } else {
                return Utils_String.format(WITResources.FieldCannotBeEdited, fieldAriaLabel);
            }
        } else if (!this.props.canSort) {
            return Utils_String.format(WITResources.AdditionalDisplayFieldFocusZoneLabel, fieldAriaLabel);
        } else {
            return Utils_String.format(WITResources.AdditionalSortFieldFocusZoneLabel, fieldAriaLabel, this._getSortLabel());
        }
    }

    private _onRenderCallout = (props?: IComboBoxProps, defaultRender?: (props?: IComboBoxProps) => JSX.Element): JSX.Element => {
        return <div className="column-field-callout-container">
            {defaultRender(props)}
        </div>;
    }

    private _onFocusZoneComponentRef = (focusZone: IFocusZone) => {
        this._focusZone = focusZone;
    }

    private _onComboBoxComponentRef = (comboBox: IComboBox) => {
        this._comboBox = comboBox;
    }

    private _onDeleteButtonComponentRef = (deleteButton: IButton) => {
        this._deleteButton = deleteButton;
    }

    private _onInputChange = (option?: IComboBoxOption, index?: number, value?: string) => {
        let selectedValue: string;
        if (option) {
            selectedValue = option.text;
        } else {
            const allowedFieldIndex = Utils_Array.findIndex(this.props.autoCompleteFields, (field) => {
                return value && Utils_String.startsWith(field.name, value, Utils_String.ignoreCaseComparer);
            });

            if (allowedFieldIndex >= 0) {
                selectedValue = this.props.autoCompleteFields[allowedFieldIndex].name;
            } else {
                selectedValue = value;
            }
        }

        this.props.onChanged(selectedValue);
    }

    private _getSortIcon(): string {
        return this.props.field.asc ? "SortUp" : "SortDown";
    }

    private _getSortLabel(): string {
        return this.props.field.asc ? WITResources.ColumnOptionsSortAscending : WITResources.ColumnOptionsSortDescending;
    }

    private _getFieldRowActions(): JSX.Element {
        return <div className="field-row-actions">
            {this.props.canSort &&
                <TooltipHost content={this._getSortLabel()}>
                    <IconButton
                        className="sort-icon-container"
                        ariaLabel={this._getSortLabel()}
                        aria-disabled={!!this.props.disabled}
                        onClick={this._onSortButtonHandler}
                        iconProps={{ iconName: this._getSortIcon() }}
                    />
                </TooltipHost>
            }

            {this.props.canDelete &&
                <TooltipHost content={WITResources.RemoveColumn}>
                    <IconButton
                        componentRef={this._onDeleteButtonComponentRef}
                        className="delete-icon-container"
                        ariaLabel={WITResources.RemoveColumn}
                        aria-disabled={!!this.props.disabled}
                        onClick={this._onDeleteButtonHandler}
                        iconProps={{ iconName: "Cancel" }}
                    />
                </TooltipHost>}

            {!this.props.canDelete &&
                <TooltipHost content={this.props.field.isRequired ? WITResources.FieldCannotBeRemoved : WITResources.ColumnOptionsAtLeastOneColumnIsRequired}>
                    <IconButton
                        componentRef={this._onDeleteButtonComponentRef}
                        className="info-icon-container"
                        ariaLabel={this.props.field.isRequired ? WITResources.FieldCannotBeRemoved : WITResources.ColumnOptionsAtLeastOneColumnIsRequired}
                        iconProps={{ iconName: "Info" }}
                    />
                </TooltipHost>}
        </div>;
    }

    private _onDeleteButtonHandler = () => {
        if (!this.props.disabled) {
            this.props.onDeleted();
        }
    }

    private _onSortButtonHandler = () => {
        this.props.onSortChanged(!this.props.field.asc);
    }
}
