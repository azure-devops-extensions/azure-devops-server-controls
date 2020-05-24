/// <reference types="jqueryui" />

import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Utils_String from "VSS/Utils/String";

import { autobind } from "OfficeFabric/Utilities";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { AdditionalFields } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/AdditionalFields";
import { AdditionalFieldsConfigurationBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/AdditionalFieldsConfigurationBusinessLogic";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IconButton } from "ScaledAgile/Scripts/Shared/Components/IconButton";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { IAdditionalField } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { DragDropZoneEnclosureConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { DragAndDropZoneEnclosure } from "Presentation/Scripts/TFS/Components/DragDropZone/DragAndDropZoneEnclosure";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

export interface IAdditionalFieldsSettingsProps extends React.Props<void> {
    allowedFields: IFieldDefinition[];
    className: string;
    fields: IAdditionalField[];
    onChanged: (fields: IAdditionalField[]) => void;
    disabled: boolean;
}

export class AdditionalFieldsConfiguration extends React.Component<IAdditionalFieldsSettingsProps, {}> {    
    // This constant matches the "c_maxAdditionalFieldsCount" value defined in ScaledAgileCardSettingsValidator.cs
    private static c_maxAdditionalFieldsDefault = 10;

    private _focusIndex = -2;  // store the index we want to place focus on in the next render 
    private _isAdd = false;  // indicates if a configuration change was an add, if false it is an assumed delete

    public render(): JSX.Element {
        return <div className={this.props.className}>
            <label className="section-header">
                {ScaledAgileResources.ConfigurationFields_AdditionalFieldsSectionHeader}
            </label>
            <div className="section-description">
                {Utils_String.format(ScaledAgileResources.ConfigurationFields_AdditionalFieldsSectionDescription, AdditionalFieldsConfiguration.c_maxAdditionalFieldsDefault)}
            </div>
            {this._renderAddtionalFields()}
        </div>;
    }

    private _renderAddtionalFields(): JSX.Element {
        var focusIndex = this._focusIndex;
        if (focusIndex === this.props.fields.length) {
            focusIndex--;
        }
        const shouldFocusOnAddButton = focusIndex === -1;
        const isAdd = this._isAdd;
        this._isAdd = false;
        this._focusIndex = -2;
        if (this.props.allowedFields) {
            return (<DragAndDropZoneEnclosure
                idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_ADDITIONAL_FIELD_CONFIGURATION}
                showPossibleDropOnDragStart={false}
                showPlaceHolderOnHover={true}
                disabled={this.props.disabled}
            >
                <IconButton
                    focus={shouldFocusOnAddButton}
                    action={() => this._onAdd()}
                    text={ScaledAgileResources.AddFieldButton}
                    icon="bowtie-icon bowtie-math-plus"
                    className="wizard-add-button-container"
                    disabled={this._hasAdditionalFieldLimitReached() || this.props.disabled} />
                <AdditionalFields
                    deleteRow={this._onDeleted}
                    allowedFields={this.props.allowedFields}
                    fields={this.props.fields}
                    disabled={this.props.disabled}
                    focusIndex={focusIndex}
                    isAdd={isAdd}
                    onChanged={this.props.onChanged} />
                {this._renderMaxRowsMessage()}
                {this._renderDuplicateFieldMessage()}
            </DragAndDropZoneEnclosure>);
        }
        else {
            return (<div style={{ paddingTop: 10, width: 50 }}>
                <Spinner className="plans-loading-spinner" type={SpinnerType.normal} label={ScaledAgileResources.LoadingSpinner} />
            </div>);
        }
    }

    private _onAdd() {
        const newFields = this.props.fields.slice();
        this._focusIndex = newFields.length;
        this._isAdd = true;
        // make the empty additional field valid until user makes changes
        newFields.push({ identifier: GUIDUtils.newGuid(), referenceName: "", name: "", isValid: true } as IAdditionalField);
        this.props.onChanged(newFields);
    }

    @autobind
    private _onDeleted(index: number): void {
        this._focusIndex = index; // focus on the row above
        const newFields: IAdditionalField[] = this.props.fields.slice();
        if (AdditionalFieldsConfigurationBusinessLogic.deleteAdditionalField(newFields, index)) {
            this.props.onChanged(newFields);
        }
    }

    private _hasAdditionalFieldLimitReached(): boolean {
        return this.props.fields && this.props.fields.length >= AdditionalFieldsConfiguration.c_maxAdditionalFieldsDefault;
    }

    private _renderMaxRowsMessage(): JSX.Element {
        if (this._hasAdditionalFieldLimitReached()) {
            return <div aria-live="assertive" className="message-area">
                <i className="bowtie-icon bowtie-status-info" />
                <span>{Utils_String.format(ScaledAgileResources.ConfigurationAdditionalFieldsLimitMessage, AdditionalFieldsConfiguration.c_maxAdditionalFieldsDefault)}</span>
            </div>;
        }
        return null;
    }

    private _renderDuplicateFieldMessage(): JSX.Element {
        let validationResult = AdditionalFieldsConfigurationBusinessLogic.validateAdditionalFields(this.props.fields);
        if (validationResult.validationState === ValidationState.Warning) {
            return <div aria-live="assertive" className="message-area">
                <i className="bowtie-icon bowtie-status-error" />
                <span>{ScaledAgileResources.ConfigurationNonUniqueAdditionalFieldMessage}</span>
            </div>;
        }
        return null;
    }
}
