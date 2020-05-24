import { IItem, IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { ICardSettings, ICardRenderingOptions, IdentityPickerRenderingOption } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { CardUtils } from "ScaledAgile/Scripts/Shared/Card/Utils/CardUtils";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export class CardRenderingOptions implements ICardRenderingOptions {
    private _showEmptyFields?: boolean;
    private _showAssignedTo?: boolean;
    private _showState?: boolean;
    private _additionalFieldReferenceNames?: string[];

    private _fieldRefNameToDefMap: IDictionaryStringTo<IFieldDefinition> = {};

    /**
    * Indicates if the ID should be displayed on the card
    */
    showId?: boolean;
    /**
     * get AssignedTo rendering option
     */
    assignedToRenderingOption?: IdentityPickerRenderingOption;
    /**
     * Indicates if the Tags control should be displayed on the card
     */
    showTags?: boolean;

    constructor(cardSettings: ICardSettings, fields?: IFieldDefinition[]) {
        this._showEmptyFields = cardSettings.showEmptyFields;
        this._showAssignedTo = cardSettings.showAssignedTo;
        this._showState = cardSettings.showState;

        let fieldReferenceNames: string[] = [];
        if (cardSettings.additionalFields instanceof Array) {
            fieldReferenceNames = cardSettings.additionalFields.map(f => f.referenceName);
        }

        this._additionalFieldReferenceNames = fieldReferenceNames;

        this.showId = cardSettings.showId;
        this.showTags = cardSettings.showTags;
        this.assignedToRenderingOption = cardSettings.assignedToRenderingOption;
        if (fields && fields.length > 0) {
            this._setFields(fields);
        }
    }

    /**
     * Indicates if assignedTo field should be shown or not
     * The behavior here is:
     * 1. If showAssignedTo is false, we wouldn't render AssignedTo field at all.
     * 2. Else we would render AssignedTo if either showEmptyFields has been set as true or the AssignedTo field has been set
     */
    public showAssignedTo(item: IItem): boolean {
        if (!this._showAssignedTo) {
            return false;
        }

        return this._shouldShow(item, CoreFieldRefNames.AssignedTo);
    }

    /**
     * An array of additional card fields to be displayed on the card (in order)
     */
    public getAdditionalFields(item: IItem): IFieldDefinition[] {

        let fieldsToRender: IFieldDefinition[] = [];

        // State field rendering will be out of AdditionalFields component. Until then, use AdditionalFields component to render State field
        if (this._showState) {
            if (this._shouldShow(item, CoreFieldRefNames.State)
                && this._fieldRefNameToDefMap.hasOwnProperty(CoreFieldRefNames.State)) {
                fieldsToRender.push(this._fieldRefNameToDefMap[CoreFieldRefNames.State]);
            }
        }

        if (this._additionalFieldReferenceNames instanceof Array) {
            this._additionalFieldReferenceNames.forEach((fieldReferenceName: string) => {
                if (this._shouldShow(item, fieldReferenceName)
                    && this._fieldRefNameToDefMap.hasOwnProperty(fieldReferenceName)) {
                    fieldsToRender.push(this._fieldRefNameToDefMap[fieldReferenceName]);
                }
            });
        }

        return fieldsToRender;
    }

    /**
     * Populates the field reference name to fieldDefinition map.
     * This would be used to get the display name and type of additional fields.
     * Note: Unless this has been set, the additional fields and state would not show up on cards,
     *       regardless of the settings.
     * @param {FieldDefinition[]} fields Field definitions of the fields in the given collection
     */
    private _setFields(fields: IFieldDefinition[]): void {
        if (fields instanceof Array) {
            fields.forEach((field: IFieldDefinition) => {
                this._fieldRefNameToDefMap[field.referenceName] = field;
            });
        }
    }

    private _shouldShow(item: IItem, fieldReferenceName: string): boolean {
        return this._showEmptyFields || !CardUtils.isNullOrEmpty(item.getFieldValue(fieldReferenceName));
    }
}
