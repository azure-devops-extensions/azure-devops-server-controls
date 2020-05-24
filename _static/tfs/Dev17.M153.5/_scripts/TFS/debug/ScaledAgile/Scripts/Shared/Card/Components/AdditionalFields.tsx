/// <reference types="react" />

import * as React from "react";
import Utils_Core = require("VSS/Utils/Core");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Identity } from "Presentation/Scripts/TFS/Components/Identity";
import { IdentityPickerControlSize } from "VSS/Identities/Picker/Controls";
import { State } from "ScaledAgile/Scripts/Shared/Card/Components/State";
import { IItem, IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { CardComponentConstants } from "ScaledAgile/Scripts/Shared/Card/Models/CardConstants";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

/**
 * Additional field component props
 */
export interface IAdditionalFieldProps {
    /**
     * The item who's fields we need to render
     */
    item: IItem;
    /**
     * A set of field definitions for the additional fields
     */
    fields: IFieldDefinition[];
    /**
     * Function to get state color for the state field
     */
    getStateColor: (value: string) => string;
}

/**
 * Component for rendering additional fields 
 */
export class AdditionalFields extends React.Component<IAdditionalFieldProps, {}> {

    public render(): JSX.Element {
        let containerStyle: any = {
            marginTop: CardComponentConstants.fieldPadding
        };
        return <div style={containerStyle} className="additional-fields-container">
            {this._renderFields()}
        </div>;
    }

    /**
     * Render the field label and also the field value by invoking _renderFieldValue
     * @returns The jsx elements of the additional fields
     */
    private _renderFields(): JSX.Element[] {
        let result: JSX.Element[] = [];
        let firstFieldContainerStyle: any = {
            height: CardComponentConstants.additionalFieldHeight,
        };
        let fieldContainerStyle: any = {
            height: CardComponentConstants.additionalFieldHeight,
            marginTop: CardComponentConstants.additionalFieldPadding
        };

        for (let i = 0, len = this.props.fields.length; i < len; i++) {
            let style = (i === 0) ? firstFieldContainerStyle : fieldContainerStyle;
            let fieldDefinition = this.props.fields[i];
            let fieldDiv = <div key={i} style={style} className="additional-field-container">
                <div className="field-label">
                    <TooltipHost content={fieldDefinition.name} overflowMode={TooltipOverflowMode.Parent}>
                        {fieldDefinition.name}
                    </TooltipHost>
                </div>
                {this._renderFieldValue(fieldDefinition)}
            </div>;
            result.push(fieldDiv);
        }

        return result;
    }

    /**
     * Renders the field value
     */
    private _renderFieldValue(fieldDefinition: IFieldDefinition): JSX.Element {
        let value = this.props.item.getFieldValue(fieldDefinition.referenceName);
        let toolTip = value;

        if (fieldDefinition.isIdentity) {
            return <Identity value={value} size={IdentityPickerControlSize.Small} consumerId={CardComponentConstants.additionalFieldIdentityControlConsumerId} />;
        }
        else if (fieldDefinition.referenceName === CoreFieldRefNames.State) {
            return <State value={value} getStateColor={this.props.getStateColor} />;
        }
        else {

            if (fieldDefinition.type === WITConstants.FieldType.DateTime) {
                return this._renderFieldValueDate(value);
            }
            else if (fieldDefinition.type === WITConstants.FieldType.TreePath) {
                return this._renderFieldValueTreePath(value);
            }
            return this._renderFieldValueDefault(value, toolTip);

        }
    }

    private _renderFieldValueDate(value: any): JSX.Element {
        let formattedToolTip = "";
        let formattedValue = "";
        if (value) {
            const dateObject = new Date(value);
            formattedToolTip = Utils_Core.convertValueToDisplayString(dateObject);
            formattedValue = Utils_Core.convertValueToDisplayString(dateObject, "d");
        }
        return this._renderFieldValueDefault(formattedValue, formattedToolTip);
    }

    private _renderFieldValueTreePath(value: any): JSX.Element {
        let toolTip = value;
        let displayValue = value;
        let path = value as string;
        const lastIndex = path.lastIndexOf("\\");
        if (lastIndex > 0) {
            displayValue = path.substring(lastIndex + 1);
        }
        return this._renderFieldValueDefault(displayValue, toolTip);
    }

    private _renderFieldValueDefault(value: any, toolTip: string): JSX.Element {
        return <div className="field-value">
            <TooltipHost content={toolTip} overflowMode={TooltipOverflowMode.Parent}>
                {value}
            </TooltipHost>
        </div>;
    }
}
