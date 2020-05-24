import "VSS/LoaderPlugins/Css!Queries/Components/ColumnOptions/ColumnFields";

import * as React from "react";

import { ColumnFieldRow } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnFieldRow";
import { ColumnOptionConstants, IColumnField } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/Constants";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { DragZone } from "Presentation/Scripts/TFS/Components/DragDropZone/DragZone";
import { DropZone, DropZoneTolerance } from "Presentation/Scripts/TFS/Components/DragDropZone/DropZone";
import { DragAndDropZoneEnclosure } from "Presentation/Scripts/TFS/Components/DragDropZone/DragAndDropZoneEnclosure";

import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { KeyCodes, getRTLSafeKeyCode, autobind } from "OfficeFabric/Utilities";

export interface IColumnFieldsProps {
    selectedFields: IColumnField[];
    availableFields: IColumnField[];
    onChanged: (fields: IColumnField[]) => void;
    disabled: boolean;
    dragDropContextId: string;
    focusIndex?: number;
    isAdd?: boolean;
    isSortable?: boolean;
    getField: (fieldReference: string) => IColumnField;
    deleteRow: (index: number) => void;
}

export class ColumnFields extends React.Component<IColumnFieldsProps> {
    public static COLUMN_FIELDS_CONTAINER_CLASS = "column-field-row-container";
    private _focusRowIndex = -1;

    private _isAllowingDragDrop(): boolean {
        return this.props.selectedFields instanceof Array && this.props.selectedFields.length > 1;
    }

    public render(): JSX.Element {
        if (this._isAllowingDragDrop()) {
            return <DropZone
                idContext={this.props.dragDropContextId}
                restraintToYAxis={true}
                isMovementAnimated={false}
                tolerance={DropZoneTolerance.Pointer}
                zoneTypes={[ColumnOptionConstants.DRAG_TYPE]}
                onSortStart={this._onSortStart}
                onSortCompleted={this._onSortUpdate}>
                {this._renderColumnFields()}
            </DropZone>;
        } else {
            return this._renderColumnFields();
        }
    }

    private _renderColumnFields(): JSX.Element {
        const fields = this.props.selectedFields;
        const rows: JSX.Element[] = fields.map((field: IColumnField, index: number) => {
            if (this._isAllowingDragDrop()) {
                return <DragZone
                    idContext={this.props.dragDropContextId}
                    zoneTypes={[ColumnOptionConstants.DRAG_TYPE]}
                    key={field.identifier}
                    id={field.identifier}
                    payload={field}
                    className={ColumnFields.COLUMN_FIELDS_CONTAINER_CLASS}
                >
                    {this._renderColumnField(field, index, true)}
                </DragZone>;
            } else {
                // even when you only have one row, you can delete it if it's sortable
                return this._renderColumnField(field, index, Boolean(this.props.isSortable));
            }
        });

        return <div ref="dropDom">
            <div className={"columns-container"}>
                <FocusZone
                    direction={FocusZoneDirection.vertical}
                    onKeyDown={this._onKeyboardReorder}
                    isInnerZoneKeystroke={this._isInnerZoneKeystroke}>
                    {rows}
                </FocusZone>
            </div>
        </div>;
    }

    @autobind
    private _onKeyboardReorder(e: React.KeyboardEvent<HTMLElement>) {
        if ((e.keyCode === KeyCodes.down || e.keyCode === KeyCodes.up) && (e.ctrlKey || e.metaKey)) {
            // working around a bug in the typings declaration which not type target correctly
            const fieldId = e.target && (e.target as HTMLElement).id;
            if (fieldId) {
                const index = this._getFieldIndex(this.props.selectedFields, fieldId);
                if (index >= 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    const newIndex = e.keyCode === KeyCodes.down ? index + 1 : index - 1;
                    this._onKeyboardSortUpdate(fieldId, newIndex);
                }
            }
        }
    }

    @autobind
    private _isInnerZoneKeystroke(ev: React.KeyboardEvent<HTMLElement>): boolean {
        return ev.which === getRTLSafeKeyCode(KeyCodes.right);
    }

    private _renderColumnField(field: IColumnField, index: number, canDelete: boolean): JSX.Element {
        const focusActionNeeded = this.props.focusIndex === index;
        let focusOnRow = false;
        if (this._focusRowIndex === index) {
            focusOnRow = true;
            this._focusRowIndex = -1;
        }
        const autoCompleteFields = this.getAutoCompleteColumnFields(field, this.props.availableFields, this.props.selectedFields);

        return <ColumnFieldRow
            key={index}
            id={field.identifier}
            index={index}
            canDelete={canDelete && !field.isRequired}
            canSort={this.props.isSortable}
            field={field}
            autoCompleteFields={autoCompleteFields}
            onChanged={(value: string) => { this._onChanged(autoCompleteFields, index, value); }}
            onSortChanged={(sortValue: boolean) => { this._onSortChanged(index, sortValue); }}
            onDeleted={() => { this.props.deleteRow(index); }}
            focusRowOnRender={focusOnRow}
            focusFieldOnRender={focusActionNeeded && !!this.props.isAdd}
            focusDeleteOnRender={focusActionNeeded && !this.props.isAdd}
            disabled={this.props.disabled} />;
    }

    public getAutoCompleteColumnFields(field: IColumnField, allowedFields: IColumnField[], selectedFields: IColumnField[]): IColumnField[] {
        return allowedFields.filter((f) => {
            const index = Utils_Array.findIndex(selectedFields, (nf) => {
                return Utils_String.equals(f.fieldRefName, nf.fieldRefName, true);
            });

            // if this is a field that is selected, exclude it from the available fields
            // UNLESS it is the field that is selected.  Otherwise the combobox will be unhappy.
            if (index >= 0) {
                return Utils_String.equals(f.fieldRefName, field.fieldRefName, true);
            } else {
                return !f.isHidden;
            }
        });
    }

    @autobind
    private _onSortStart(): void {
        $(this.refs.dropDom)
            .closest("." + DragAndDropZoneEnclosure.getUniqueClassName(this.props.dragDropContextId))
            .find(".combo-drop-popup")
            .remove();
    }

    @autobind
    private _onSortUpdate(identifier: string, newIndex: number) {
        const newFields = [...this.props.selectedFields];
        if (this._reorderFields(newFields, identifier, newIndex)) {
            this.props.onChanged(newFields);
        }
    }

    @autobind
    private _onKeyboardSortUpdate(itemId: string, newIndex: number) {
        if (newIndex >= 0 && newIndex < this.props.selectedFields.length) {
            this._focusRowIndex = newIndex;
            this._onSortUpdate(itemId, newIndex);
        }
    }

    private _reorderFields(fields: IColumnField[], identifier: string, newIndex: number): boolean {
        if (newIndex >= 0 && newIndex < fields.length) {
            const oldIndex = this._getFieldIndex(fields, identifier);
            if (oldIndex > -1 && newIndex !== oldIndex) {
                fields.splice(newIndex, 0, fields.splice(oldIndex, 1)[0]);
                return true;
            }
        }

        return false;
    }

    private _getFieldIndex(fields: IColumnField[], identifier: string): number {
        for (let i = 0; i < fields.length; i++) {
            if (Utils_String.equals(fields[i].identifier, identifier, true)) {
                return i;
            }
        }

        return -1;
    }

    private _cloneFields(): IColumnField[] {
        return this.props.selectedFields.map(f => {
            return { ...f };
        });
    }

    private _onChanged(allowedFields: IColumnField[], index: number, fieldDisplayName: string): void {
        const fields: IColumnField[] = this._cloneFields();
        if (this._changeColumnField(allowedFields, fields, index, fieldDisplayName)) {
            this.props.onChanged(fields);
        }
    }

    private _onSortChanged(index: number, sortValue: boolean): void {
        const fields: IColumnField[] = this._cloneFields();
        if (index > -1 && fields[index].asc !== sortValue) {
            fields[index].asc = sortValue;

            this.props.onChanged(fields);
        }
    }

    private _changeColumnField(allowedFields: IColumnField[], selectedFields: IColumnField[], index: number, newValue: string): boolean {
        // only run validation if we actually change the field
        // this can happen because we delay the text input
        if (index > -1 && (selectedFields[index].name !== newValue)) {
            if (newValue === null || newValue.trim() === "") {
                selectedFields[index].isInvalid = true;
                selectedFields[index].error = WITResources.FieldCannotBeEmpty;
                selectedFields[index].name = "";
                selectedFields[index].fieldRefName = "";
                selectedFields[index].fieldId = null;
            } else {
                let columnField = this._getColumnFieldByDisplayName(allowedFields, newValue);

                // If we don't find the field, the user may be choosing a field
                // that we do not auto-complete so find that field since this is a 
                // power user decision to use these more seldomly used fields.
                if (!columnField) {
                    columnField = this.props.getField(newValue);
                    if (columnField) {
                        allowedFields.push(columnField);
                    }
                }

                if (columnField) {
                    selectedFields[index].name = columnField.name;
                    selectedFields[index].fieldRefName = columnField.fieldRefName;
                    selectedFields[index].fieldId = columnField.fieldId;
                    selectedFields[index].isInvalid = false;
                    selectedFields[index].error = "";
                } else {
                    // check to see if we already added this field
                    const error = this._getColumnFieldByDisplayName(selectedFields, newValue) ? WITResources.FieldAlreadyAdded : WITResources.FieldDoesNotExist;

                    selectedFields[index].name = newValue;
                    selectedFields[index].fieldRefName = "";
                    selectedFields[index].fieldId = null;
                    selectedFields[index].isInvalid = true;
                    selectedFields[index].error = error;
                }
            }

            return true;
        }

        return false;
    }

    private _getColumnFieldByDisplayName(allowedFields: IColumnField[], displayName: string): IColumnField {
        const match = allowedFields.filter(f => f.name.toUpperCase() === displayName.toUpperCase());
        if (match && match.length > 0) {
            return match[0];
        }
        return null;
    }
}
