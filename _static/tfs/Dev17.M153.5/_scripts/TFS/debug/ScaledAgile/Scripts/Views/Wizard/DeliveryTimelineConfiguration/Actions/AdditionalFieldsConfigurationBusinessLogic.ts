import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { CoreFieldRefNames, FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IModelWithValidation, ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IAdditionalField } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";

export class AdditionalFieldsConfigurationBusinessLogic {

    /**
     * Filter all the field definitions to the set of supported ones.
     * Filters based on supported field types, black listed fields, and whether the
     * field definition is an extension.
     * @param {IFieldDefinition[]} allFieldDefinitions all the field definitions
     * @returns {IFieldDefinition[]} the filtered set of supported field definitions
     */
    public static getSupportedFieldDefinitions(allFieldDefinitions: IFieldDefinition[]): IFieldDefinition[] {
        const supportedFieldTypes = [
            FieldType.String,
            FieldType.Integer,
            FieldType.DateTime,
            FieldType.PlainText,
            FieldType.TreePath,
            FieldType.Double,
            FieldType.Guid,
            FieldType.Boolean
        ];
        const notSupportedFieldReferenceNames = [
            CoreFieldRefNames.Id.toLowerCase(),
            CoreFieldRefNames.Title.toLowerCase(),
            CoreFieldRefNames.AssignedTo.toLowerCase(),
            CoreFieldRefNames.State.toLowerCase(),
            CoreFieldRefNames.Tags.toLowerCase(),
            CoreFieldRefNames.AreaId.toLowerCase(),
            CoreFieldRefNames.IterationId.toLowerCase(),
            CoreFieldRefNames.Rev.toLowerCase(),
            CoreFieldRefNames.RevisedDate.toLowerCase(),
            CoreFieldRefNames.NodeName.toLowerCase(),
            CoreFieldRefNames.TeamProject.toLowerCase(),
            CoreFieldRefNames.Watermark.toLowerCase(),
            CoreFieldRefNames.ExternalLinkCount.toLowerCase(),
            CoreFieldRefNames.HyperLinkCount.toLowerCase(),
            CoreFieldRefNames.RelatedLinkCount.toLowerCase(),
            CoreFieldRefNames.AttachedFileCount.toLowerCase(),
            CoreFieldRefNames.AuthorizedAs.toLowerCase(),
            CoreFieldRefNames.AuthorizedDate.toLowerCase(),
        ];

        const supportedFieldDefinitions: IFieldDefinition[] = [];

        allFieldDefinitions.forEach(fieldDef => {
            if (supportedFieldTypes.indexOf(fieldDef.type) >= 0 &&
                notSupportedFieldReferenceNames.indexOf(fieldDef.referenceName.toLowerCase()) === -1 &&
                fieldDef.isQueryable() &&
                fieldDef.usages !== 8 /* FieldUsages.WorkItemTypeExtension */) {
                supportedFieldDefinitions.push(fieldDef);
            }
        });

        Utils_Array.uniqueSort<IFieldDefinition>(supportedFieldDefinitions, (a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
        return supportedFieldDefinitions;
    }

    /**
     * Validate the additional fields are valid or not
     * @param {IAdditionalField[]} fields the current set of fields
     * @return {IModelWithValidation} Success if valid, warning if the fields are not unique, error if the fields are not valid.
     */
    public static validateAdditionalFields(fields: IAdditionalField[]): IModelWithValidation {
        const result = {
            validationState: ValidationState.Success
        } as IModelWithValidation;

        if (!fields || fields.length === 0) {
            return result;
        }

        const uniqueFields: IDictionaryStringTo<boolean> = {};
        for (let i = 0, length = fields.length; i < length; i++) {
            let field = fields[i].referenceName;
            if (!field || !fields[i].isValid) {
                result.validationState = ValidationState.Error;
                break;
            }
            else if (uniqueFields[field]) {
                result.validationState = ValidationState.Warning;
                break;
            }
            else {
                uniqueFields[field] = true;
            }
        }

        return result;
    }

    /**
     * Delete a field with the specified index.
     * @param {IAdditionalField[]} fields the fields array to be modified
     * @param {string} index the index of the field to be deleted
     * @returns {boolean} flag to indicate if the delete was successful
     */
    public static deleteAdditionalField(fields: IAdditionalField[], index: number): boolean {
        if (index > -1) {
            fields.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Change an existing field value within the fields array.
     * @param {IFieldDefinition[]} allowedFields array of supported field definitions
     * @param {IAdditionalField[]} fields the fields array to be modified
     * @param {number} index the original value
     * @param {string} newValue the new value
     * @returns {boolean} flag to indicate if the change was successful
     */
    public static changeAdditionalField(allowedFields: IFieldDefinition[], fields: IAdditionalField[], index: number, newValue: string): boolean {
        if (index > -1) {
            const referenceName = this._getFieldReferenceNameByDisplayName(allowedFields, newValue);
            fields[index].name = newValue;
            fields[index].referenceName = referenceName;

            if (referenceName) {
                fields[index].isValid = true;
            }
            else {
                fields[index].isValid = false;
            }

            return true;
        }

        return false;
    }

    /**
     * Move a specified field to the new index within the fields array.
     * @param {IAdditionalField[]} fields the fields array to be modified
     * @param {string} fieldIdentifier the field identifier that is to be moved
     * @param {number} newIndex the new index of the field
     * @returns {boolean} flag to indicate if the move was successful
     */
    public static moveAdditionalField(fields: IAdditionalField[], fieldIdentifier: string, newIndex: number): boolean {
        if (newIndex >= 0 && newIndex < fields.length) {
            const oldIndex = this._getFieldIndex(fields, fieldIdentifier);
            if (oldIndex > -1 && newIndex !== oldIndex) {
                fields.splice(newIndex, 0, fields.splice(oldIndex, 1)[0]);
                return true;
            }
        }

        return false;
    }

    /**
     * Get the index of the field in the fields array.
     * @param {IAdditionalField[]} fields the fields array to be scanned
     * @param {string} fieldIdentifier the field identifier to be scanned
     * @return {number} index of the field associated with the given identifer in the fields array, -1 otherwise
     */
    private static _getFieldIndex(fields: IAdditionalField[], fieldIdentifier: string): number {
        for (let i = 0, l = fields.length; i < l; i++) {
            if (fields[i].identifier === fieldIdentifier) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Get field reference name by display name
     * @param {IFieldDefinition[]} allowedFields array of supported field definitions
     * @param {string} displayName field display name
     * @return {string} field reference name if found in the allowedFields. returns null otherwise
     */
    private static _getFieldReferenceNameByDisplayName(allowedFields: IFieldDefinition[], displayName: string): string {
        let match = allowedFields.filter(f => f.name.toUpperCase() === displayName.toUpperCase());
        if (match && match.length > 0) {
            return match[0].referenceName;
        }
        return null;
    }
}
