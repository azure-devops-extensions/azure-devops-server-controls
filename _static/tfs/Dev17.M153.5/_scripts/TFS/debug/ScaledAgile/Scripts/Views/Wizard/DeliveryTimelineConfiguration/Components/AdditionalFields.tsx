/// <reference types="react" />
/// <reference types="jqueryui" />

import * as React from "react";

import { AdditionalFieldRow } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/AdditionalFieldRow";
import { AdditionalFieldsConfigurationBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/AdditionalFieldsConfigurationBusinessLogic";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { DragZone } from "Presentation/Scripts/TFS/Components/DragDropZone/DragZone";
import { DropZone, DropZoneTolerance } from "Presentation/Scripts/TFS/Components/DragDropZone/DropZone";
import { DragAndDropZoneEnclosure } from "Presentation/Scripts/TFS/Components/DragDropZone/DragAndDropZoneEnclosure";
import { IAdditionalField } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";
import { DragDropZoneEnclosureConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { autobind } from "OfficeFabric/Utilities";

export interface IAdditionalFieldsProps extends React.Props<void> {
    fields: IAdditionalField[];
    allowedFields: IFieldDefinition[];
    onChanged: (fields: IAdditionalField[]) => void;
    disabled: boolean;
    focusIndex?: number;
    isAdd?: boolean;
    deleteRow: (index: number) => void;
}

export class AdditionalFields extends React.Component<IAdditionalFieldsProps, {}> {    
    public static ADDITIONAL_FIELDS_CONTAINER_CLASS = "additional-fields-setting-container";
    public static DRAG_TYPE = "additional-field";
    private _focusRowIndex = -1;

    private _isAllowingDragDrop(): boolean {
        return this.props.fields instanceof Array && this.props.fields.length > 1;
    }

    public render(): JSX.Element {
        if (this._isAllowingDragDrop()) {
            return <DropZone
                idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_ADDITIONAL_FIELD_CONFIGURATION}
                zoneTypes={[AdditionalFields.DRAG_TYPE]}
                restraintToYAxis={true}
                tolerance={DropZoneTolerance.Pointer}
                isMovementAnimated={FeatureEnablement.isCardMovementAnimated()}
                onSortStart={() => { this._onSortStart(); }}
                onSortCompleted={(id: string, newIndex: number, dragData: any) => { this._onSortUpdate(id, newIndex); }}>
                {this._renderAdditionalFields()}
            </DropZone>;
        }
        else {
            return this._renderAdditionalFields();
        }
    }

    /**
     * What: When sort start we need to remove some Html from the placeholder
     * Why: We close the combo BUT JQuery UI is making a copy of the Dom to be dragged. The copy is done before
     *      the close occurs. We do not have an event to listen before the Placeholder creation, hence we need
     *      to alter the placeholder by removing the open section of the combo.
     */
    private _onSortStart(): void {
        $(".tab-content .combo-drop-popup").remove();
    }

    private _renderAdditionalFields(): JSX.Element {

        const fields = this.props.fields;
        let rows: JSX.Element[] = fields.map((value: IAdditionalField, index: number) => {
            if (this._isAllowingDragDrop()) {
                return <DragZone
                    idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_ADDITIONAL_FIELD_CONFIGURATION}
                    zoneTypes={[AdditionalFields.DRAG_TYPE]}
                    key={value.identifier}
                    id={value.identifier}
                    payload={value}
                    className={AdditionalFields.ADDITIONAL_FIELDS_CONTAINER_CLASS}
                >
                    {this._renderAdditionalField(value, index)}
                </DragZone>;
            } else {
                return this._renderAdditionalField(value, index);
            }
        });

        return <div className={AdditionalFields.ADDITIONAL_FIELDS_CONTAINER_CLASS}>{rows}</div>;
    }

    /**
     * Callback after sort event is done.
     */
    private _onSortUpdate(itemId: string, newIndex: number) {
        const newFields: IAdditionalField[] = this.props.fields.slice();
        if (AdditionalFieldsConfigurationBusinessLogic.moveAdditionalField(newFields, itemId, newIndex)) {
            this.props.onChanged(newFields);
        }
    }

    @autobind
    private _onKeyboardSortUpdate(itemId: string, newIndex: number) {
        if (newIndex >= 0 && newIndex < this.props.fields.length) {
            this._focusRowIndex = newIndex;
            this._onSortUpdate(itemId, newIndex);
        }
    }

    /**
     * Render a complete line that represent the additional field.
     * @param {IAdditionalField} field - The field 
     * @param {number} index - The row index
     */
    private _renderAdditionalField(field: IAdditionalField, index: number): JSX.Element {

        const focusActionNeeded = this.props.focusIndex === index;
        let focusOnRow = false;
        if (this._focusRowIndex === index) {
            focusOnRow = true;
            this._focusRowIndex = -1;
        }
        return <AdditionalFieldRow
            key={index}
            id={field.identifier}
            index={index}
            onKeyboardReorder={this._onKeyboardSortUpdate}
            field={field}
            allowedFields={this.props.allowedFields}
            onChanged={(value: string) => { this._onChanged(index, value); }}
            onDeleted={() => { this.props.deleteRow(index); }}
            focusRowOnRender={focusOnRow}
            focusFieldOnRender={focusActionNeeded && !!this.props.isAdd}
            focusDeleteOnRender={focusActionNeeded && !this.props.isAdd}
            disabled={this.props.disabled} />;
    }

    private _onChanged(index: number, fieldDisplayName: string): void {
        const newFields: IAdditionalField[] = this.props.fields.slice();
        if (AdditionalFieldsConfigurationBusinessLogic.changeAdditionalField(this.props.allowedFields, newFields, index, fieldDisplayName)) {
            this.props.onChanged(newFields);
        }
    }
}
