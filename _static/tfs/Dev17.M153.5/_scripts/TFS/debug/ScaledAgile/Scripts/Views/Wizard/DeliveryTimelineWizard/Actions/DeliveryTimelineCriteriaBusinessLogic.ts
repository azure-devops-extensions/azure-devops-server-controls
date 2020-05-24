import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { FilterClause } from "TFS/Work/Contracts";

import * as OMWiqlOperators from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { CoreFieldRefNames, FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { DeliveryTimelineCriteriaCache } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaCache";
import { IDeliveryTimelineCriteriaData, ICriteriaSettingData, FieldValueControlTypeEnum, FilterClauseConstants } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { IModelWithValidation, ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { ICriteriaProperties } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

export interface IDeliveryTimelineCriteriaBusinessLogic {
    /**
    * Validate criteria settings whether it is valid and no duplication.
    * @param {ICriteriaSettingData[]} settings - settings to be validate.
    * @return {IModelWithValidation} validation state.
    */
    validateSettings(settings: ICriteriaSettingData[]): IModelWithValidation;

    /**
    * Validate and update field for a specified setting.
    * The input will not be modified. Return the clone of input with the updated setting.
    * @param {ICriteriaSettingData[]} settings - existing settings.
    * @param {string} id - id of the setting to be validate and update.
    * @param {string} value - value to update.
    * @param {IFieldDefinition} fieldDefinition - field definition of the value. If null, validation state will be invalid.
    * @return Clone of input with the updated setting.
    */
    validateAndUpdateField(settings: ICriteriaSettingData[], id: string, value: string, fieldDefinition: IFieldDefinition): ICriteriaSettingData[];

    /**
    * Validate and update operator for a specified setting.
    * The input will not be modified. Return the clone of input with the updated setting.
    * @param {ICriteriaSettingData[]} settings - existing settings.
    * @param {string} id - id of the setting to be validate and update.
    * @param {string} value - value to update.
    * @return Clone of input with the updated setting.
    */
    validateAndUpdateOperator(settings: ICriteriaSettingData[], id: string, value: string): ICriteriaSettingData[];

    /**
    * Validate and update value for a specified setting.
    * The input will not be modified. Return the clone of input with the updated setting.
    * @param {ICriteriaSettingData[]} settings - existing settings.
    * @param {string} id - id of the setting to be validate and update.
    * @param {string} value - value to update.
    * @return Clone of input with the updated setting.
    */
    validateAndUpdateValue(settings: ICriteriaSettingData[], id: string, value: string): ICriteriaSettingData[];

    /**
    * Update list of allowed values for a specified setting.
    * The input will not be modified. Return the clone of input with the updated setting.
    * @param {ICriteriaSettingData[]} settings - existing settings.
    * @param {string} id - id of the setting to be validate and update.
    * @param {string} value - value to update.
    * @return Clone of input with the updated setting.
    */
    updateValues(settings: ICriteriaSettingData[], id: string, allowedValues: string[], fieldDefinition: IFieldDefinition): ICriteriaSettingData[];

    /**
    * Add criteria setting with a specify index. The input will not be modify.
    * The input will not be modified.Return the clone of input with the newly added setting at the end of the array.
    * @param {ICriteriaSettingData[]} settings - previous settings
    * @param {boolean} isLoading - flag indicate whether the new setting to be added should be in loading state or not. Default as false.
    * @return Clone of the criteria settings with the new setting added.
    */
    addCriteriaSetting(settings: ICriteriaSettingData[], isLoading: boolean): ICriteriaSettingData[];

    /**
    * Delete criteria setting with a specify index.
    * The input will not be modified. Return the clone of input that remove setting of the given index.
    * @param {ICriteriaSettingData[]} settings - previous settings
    * @param {string} id - id of the setting
    * @return Clone of the criteria settings that has removed setting of the given index.
    */
    deleteCriteriaSetting(settings: ICriteriaSettingData[], id: string): ICriteriaSettingData[];

    /**
    * Get field definition by field name. Return null if not found.
    * @param {string} value - field name
    * @return {IFieldDefinition} field definition
    */
    resolveFieldByName(value: string): IFieldDefinition;

    /**
    * Convert array of string to array of field shallow ref.
    * @param {string[]} input - input
    * @param {ValueState} valueState - the value state that the input should be set to. Default to ReadyAndValid.
    * @return {IFieldShallowReference} array of field shallow ref
    */
    convertToFieldShallowReference(input: string[], valueState?: ValueState): IFieldShallowReference[];

    /**
    * Convert array of localized operators to array of field shallow ref that have id as invariant string and name as localized string.
    * @param {string[]} localizedOperators - localized operators
    * @param {ValueState} valueState - the value state that the input should be set to. Default to ReadyAndValid.
    * @return {IFieldShallowReference} array of field shallow ref
    */
    convertLocalizedOperatorsToFieldShallowReference(localizedOperators: string[], valueState?: ValueState): IFieldShallowReference[];

    /**
    * Return default field reference. 
    * @return {IFieldShallowReference} array of field shallow ref
    */
    getDefaultFieldReference(): IFieldShallowReference;

    /**
    * Return default row of criteria setting.
    * @return {ICriteriaSettingData} 
    */
    getDefaultCriteria(): ICriteriaSettingData;

    /**
    * Return default delivery timeline criteria settings with loading state
    * @return {IDeliveryTimelineCriteriaData} 
    */
    getLoadingDeliveryTimelineCriteria(): IDeliveryTimelineCriteriaData;

    /**
    * Return criteria setting with loading state
    * @return {ICriteriaSettingData} 
    */
    getLoadingCriteria(): ICriteriaSettingData;

    /**
    * Return array of supported field in FieldShallowReference format.
    * @return {IFieldShallowReference[]} 
    */
    getSupportedFieldsReference(): IFieldShallowReference[];

    /**
    * Update any loading state in criteria settings to valid state. 
    * The input will not be modified. Return the modified settings as output.
    * @param {ICriteriaSettingData[]} settings 
    */
    updateCriteriaLoadingStateToValid(settings: ICriteriaSettingData[]): ICriteriaSettingData[];
}

export class DeliveryTimelineCriteriaBusinessLogic implements IDeliveryTimelineCriteriaBusinessLogic {
    public static loadingDummyField = { id: ScaledAgileResources.WizardLoadingLabel, name: ScaledAgileResources.WizardLoadingLabel, valueState: ValueState.IsLoading } as IFieldShallowReference;

    /**
    * Filter all the field definitions to the set of supported ones.
    * Filters based on supported field types, black listed fields, and whether the field definition is an extension.
    * @param {IFieldDefinition[]} allFieldDefinitions all the field definitions
    * @returns {IFieldDefinition[]} the filtered set of supported field definitions
    */
    public static getSupportedFieldDefinitions(allFieldDefinitions: IFieldDefinition[]): IFieldDefinition[] {
        const supportedFieldTypes = [
            FieldType.String,
            FieldType.Integer,
            FieldType.PlainText,
            FieldType.Double,
            FieldType.Guid,
            //FieldType.DateTime, // excluding DateTime for now
            //FieldType.TreePath, // excludeing tree path until we have a tree path control implemented in settings experience
            //FieldType.Boolean   // excluding boolean due to Bug 925223: Filter with BoardColumnDone field throw error
        ];
        const notSupportedFieldReferenceNames = [
            CoreFieldRefNames.Id.toLowerCase(),
            CoreFieldRefNames.Title.toLowerCase(),
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
            CoreFieldRefNames.LinkType.toLowerCase(),
        ];

        const supportedFieldDefinitions: IFieldDefinition[] = [];

        allFieldDefinitions.forEach(fieldDef => {
            if (supportedFieldTypes.indexOf(fieldDef.type) >= 0 &&
                notSupportedFieldReferenceNames.indexOf(fieldDef.referenceName.toLowerCase()) === -1 &&
                fieldDef.isQueryable() &&
                !fieldDef.isIdentity &&  // excluding identity field until we have identity picker control implemented in settings experience (User Story 888158: Render criteria value control by type)
                fieldDef.usages !== 8 /* FieldUsages.WorkItemTypeExtension */) {
                supportedFieldDefinitions.push(fieldDef);
            }
        });

        Utils_Array.uniqueSort<IFieldDefinition>(supportedFieldDefinitions, (a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
        return supportedFieldDefinitions;
    }

    /**
     * Return localized supported operators for the given field
     * @param field 
     */
    public static getLocalizedSupportedWiqlOperators(field: IFieldDefinition): string[] {
        if (field.isIdentity) {
            return DeliveryTimelineCriteriaConstants.equalityOperators;
        }
        switch (field.type) {
            case FieldType.String:
                return DeliveryTimelineCriteriaConstants.stringOperators;
            case FieldType.Integer:
            case FieldType.DateTime:
            case FieldType.Double:
                return DeliveryTimelineCriteriaConstants.comparisonOperators;
            case FieldType.PlainText:
                return field && field.supportsTextQuery() ? DeliveryTimelineCriteriaConstants.textWithTextSupportOperators : DeliveryTimelineCriteriaConstants.textOperators;
            case FieldType.TreePath:
                return DeliveryTimelineCriteriaConstants.treePathOperators;
            case FieldType.Boolean:
            case FieldType.Guid:
                return DeliveryTimelineCriteriaConstants.equalityOperators;
            default:
                throw new Error("The given field is not supported");
        }
    }

    private _cache: DeliveryTimelineCriteriaCache;

    public initializeCache(fields: IFieldDefinition[]) {
        if (!this._cache) {
            const supportedFields: IFieldDefinition[] = DeliveryTimelineCriteriaBusinessLogic.getSupportedFieldDefinitions(fields || []);
            this._cache = new DeliveryTimelineCriteriaCache(supportedFields);
        }
    }

    public isCacheInitialized(): boolean {
        return this._cache != null;
    }

    public getSupportedFieldsReference(): IFieldShallowReference[] {
        if (this._cache != null) {
            return this._cache.getSupportedFieldsReference();
        }
        return [];
    }

    /**
    * It converts the criteria settings to view properties
    * @param {string} settings - the current wizard settings
    */
    public toViewProperties(settings: ICriteriaSettingData[]): ICriteriaProperties {
        if (settings == null) {
            throw new Error("wizard settings cannot be null");
        }

        let filterClauses: FilterClause[] = [];
        for (let i = 0; i < settings.length; i++) {
            let setting = settings[i];
            filterClauses.push({
                index: i,
                fieldName: setting.field.id,
                logicalOperator: FilterClauseConstants.andOperator,
                operator: setting.operator.id,
                value: setting.value.id
            } as FilterClause);
        }
        return {
            filterClauses: filterClauses,
            validationState: this.validateSettings(settings)
        };
    }

    public validateSettings(settings: ICriteriaSettingData[]): IModelWithValidation {
        if (settings == null || settings.length === 0) {
            return { validationState: ValidationState.Success } as IModelWithValidation;
        }

        // Check for any invalid field, operator, or value.
        for (let i = 0, l = settings.length; i < l; i++) {
            const setting = settings[i];
            if (!setting.field || !setting.operator || !setting.value
                || !setting.field.name || !setting.operator.name) { // Note that empty value.name is valid
                return { validationState: ValidationState.Error } as IModelWithValidation;
            }

            // Empty string for initial Value combo is valid, but we want to make the entire state invalid
            const fieldDefinition = this.resolveFieldByName(setting.field.name);
            if (this._evaluateValueState(fieldDefinition, setting.value.name) === ValueState.ReadyButInvalid) {
                return { validationState: ValidationState.Error } as IModelWithValidation;
            }

            const isValid = setting.field.valueState === ValueState.ReadyAndValid
                && setting.operator.valueState === ValueState.ReadyAndValid
                && setting.value.valueState === ValueState.ReadyAndValid;
            if (!isValid) {
                return { validationState: ValidationState.Error } as IModelWithValidation;
            }
        }

        return this._validateUniqueFilterClause(settings);
    }

    /**
     * Validate if there is no duplicate clauses
     * @param {ICriteriaSettingData[]} settings - the current criteria settings
     * @return {IModelWithValidation} Success if unique, warning if the criteria settings are not unique
     */
    private _validateUniqueFilterClause(settings: ICriteriaSettingData[]): IModelWithValidation {
        let uniqueCriteriaSettings: IDictionaryStringTo<string[]> = {};
        for (let i = 0, len = settings.length; i < len; i++) {
            let setting = settings[i];
            if (!uniqueCriteriaSettings[setting.field.id]) {
                uniqueCriteriaSettings[setting.field.id] = [];
            }
            else if (setting.operator.id.length > 0 && uniqueCriteriaSettings[setting.field.id].indexOf(setting.operator.id + setting.value.id) >= 0) {
                return {
                    validationState: ValidationState.Warning
                } as IModelWithValidation;
            }
            uniqueCriteriaSettings[setting.field.id].push(setting.operator.id + setting.value.id);
        }

        return {
            validationState: ValidationState.Success
        } as IModelWithValidation;
    }

    public validateAndUpdateField(settings: ICriteriaSettingData[], id: string, value: string, fieldDefinition: IFieldDefinition): ICriteriaSettingData[] {
        const index = this._getCriteriaSettingIndex(settings, id);
        if (index == -1) {
            throw new Error("setting not found");
        }

        let cloneSettings = this._cloneCriteriaSettings(settings);
        let cloneSettingToUpdate = cloneSettings[index];
        if (fieldDefinition) {
            // if fieldDefinition is passed in, it means this is a valid field to update.
            // update the selected field
            cloneSettingToUpdate.field.id = fieldDefinition.referenceName;
            cloneSettingToUpdate.field.name = value;
            cloneSettingToUpdate.field.valueState = ValueState.ReadyAndValid;

            // update available operators
            const operators = DeliveryTimelineCriteriaBusinessLogic.getLocalizedSupportedWiqlOperators(fieldDefinition);
            const operatorsReferences = this.convertLocalizedOperatorsToFieldShallowReference(operators);
            cloneSettingToUpdate.availableOperators = operatorsReferences;
            cloneSettingToUpdate.operator = operatorsReferences[0];

            // re-evalutate state of the value 
            if (!cloneSettingToUpdate.value.name.trim()) {
                // we don't want to show error message for Value combo control
                cloneSettingToUpdate.value.valueState = ValueState.ReadyAndValid;
            }
            else {
                cloneSettingToUpdate.value.valueState = this._evaluateValueState(fieldDefinition, cloneSettingToUpdate.value.name);
            }
        }
        else {
            // otherwise this is an invalid field, update the field value and state as invalid.
            const valueRef = this.convertToFieldShallowReference([value], ValueState.ReadyButInvalid);
            cloneSettingToUpdate.field = valueRef[0];

            // set the state of value valid until field combo value is fixed
            cloneSettingToUpdate.value.valueState = ValueState.ReadyAndValid;
        }
        
        cloneSettingToUpdate.valueControlType = this._getValueControlType(fieldDefinition);
        return cloneSettings;
    }

    public validateAndUpdateOperator(settings: ICriteriaSettingData[], id: string, value: string): ICriteriaSettingData[] {
        const index = this._getCriteriaSettingIndex(settings, id);
        if (index == -1) {
            throw new Error("setting not found");
        }

        // validate if the current operator is valid (present in the list of available operators)
        const setting = settings[index];
        var availableOperators = setting.availableOperators;
        let valueStateToUpdate = ValueState.ReadyButInvalid;
        for (let i = 0, l = availableOperators.length; i < l; i++) {
            if (Utils_String.ignoreCaseComparer(availableOperators[i].name, value) == 0) {
                valueStateToUpdate = ValueState.ReadyAndValid;
                break;
            }
        }

        // update current operator value
        let cloneSettings = this._cloneCriteriaSettings(settings);
        const valueRef = this.convertLocalizedOperatorsToFieldShallowReference([value], valueStateToUpdate);
        cloneSettings[index].operator = valueRef[0];
        return cloneSettings;
    }

    public validateAndUpdateValue(settings: ICriteriaSettingData[], id: string, value: string): ICriteriaSettingData[] {
        let index = this._getCriteriaSettingIndex(settings, id);
        if (index == -1) {
            throw new Error("setting not found");
        }

        // update the current value to a given value. We currently do not have any validation for value.
        const cloneSettings = this._cloneCriteriaSettings(settings);
        const valueRef = this.convertToFieldShallowReference([value]);
        const currentSetting = cloneSettings[index];
        const fieldDefinition = this.resolveFieldByName(currentSetting.field.name);
        currentSetting.value = valueRef[0];
        currentSetting.value.valueState = this._evaluateValueState(fieldDefinition, value);
        return cloneSettings;
    }

    public _evaluateValueState(fieldDefinition: IFieldDefinition, value: string): ValueState {
        if (fieldDefinition) {
            switch (fieldDefinition.type) {
                case FieldType.PlainText:
                    if (!value.trim()) {
                        return ValueState.ReadyButInvalid;
                    }
                    break;

                case FieldType.Integer:
                    if (!/^-?[0-9]+?$/.test(value)) {
                        return ValueState.ReadyButInvalid;
                    }
                    break;

                case FieldType.Double:
                    if (isNaN(Number(value))) {
                        return ValueState.ReadyButInvalid;
                    }
                    break;
            }
        }

        return ValueState.ReadyAndValid;
    }

    public updateValues(settings: ICriteriaSettingData[], id: string, allowedValues: string[], fieldDefinition: IFieldDefinition): ICriteriaSettingData[] {
        const index = this._getCriteriaSettingIndex(settings, id);
        if (index == -1) {
            throw new Error("setting not found");
        }

        // update current available values and the value control type.
        const availableValues = this.convertToFieldShallowReference(allowedValues);
        const cloneSettings = this._cloneCriteriaSettings(settings);
        const currentSetting = cloneSettings[index];
        currentSetting.availableValues = availableValues;
        currentSetting.valueControlType = this._getValueControlType(fieldDefinition, allowedValues);

        return cloneSettings;
    }

    public convertToFieldShallowReference(input: string[], valueState?: ValueState): IFieldShallowReference[] {
        if (input instanceof Array && input.length > 0) {
            return input.map((value: string) => {
                return {
                    id: value,
                    name: value,
                    valueState: valueState != null ? valueState : ValueState.ReadyAndValid
                } as IFieldShallowReference;
            });
        }
        else {
            return [];
        }
    }

    public convertLocalizedOperatorsToFieldShallowReference(localizedOperators: string[], valueState?: ValueState): IFieldShallowReference[] {
        if (localizedOperators instanceof Array && localizedOperators.length > 0) {
            return localizedOperators.map((value: string) => {
                return {
                    id: OMWiqlOperators.getInvariantOperator(value),
                    name: value,
                    valueState: valueState != null ? valueState : ValueState.ReadyAndValid
                } as IFieldShallowReference;
            });
        }
        else {
            return [];
        }
    }

    public deleteCriteriaSetting(settings: ICriteriaSettingData[], id: string): ICriteriaSettingData[] {
        let cloneSettings: ICriteriaSettingData[] = this._cloneCriteriaSettings(settings);
        let index = this._getCriteriaSettingIndex(cloneSettings, id);
        if (index > -1) {
            cloneSettings.splice(index, 1);
        }
        return cloneSettings;
    }

    public addCriteriaSetting(settings: ICriteriaSettingData[], isLoading: boolean): ICriteriaSettingData[] {
        let cloneSettings: ICriteriaSettingData[] = this._cloneCriteriaSettings(settings);
        const setting = isLoading ? this.getLoadingCriteria() : this.getDefaultCriteria();
        cloneSettings.push(setting);
        return cloneSettings;
    }

    public resolveFieldByName(name: string): IFieldDefinition {
        if (this._cache) {
            var fieldMap = this._cache.getSupportedFieldsMap();
            const fieldName = name.toUpperCase();
            if (fieldMap.hasOwnProperty(fieldName)) {
                return fieldMap[fieldName];
            }
        }
        return null;
    }

    public getDefaultFieldReference(): IFieldShallowReference {
        return {
            id: "",
            name: "",
            valueState: ValueState.ReadyAndValid
        };
    }

    public getDefaultCriteria(): ICriteriaSettingData {
        return {
            availableOperators: [],
            availableValues: [],
            id: TFS_Core_Utils.GUIDUtils.newGuid(),
            field: this.getDefaultFieldReference(),
            operator: this.getDefaultFieldReference(),
            value: this.getDefaultFieldReference()
        } as ICriteriaSettingData;
    }

    public getLoadingDeliveryTimelineCriteria(): IDeliveryTimelineCriteriaData {
        let criteria: ICriteriaSettingData[] = [];
        criteria.push(this.getLoadingCriteria());
        var criteriaSettings: IDeliveryTimelineCriteriaData = {
            criteria: criteria,
            validationState: ValidationState.Success,
            availableFields: []
        };
        return criteriaSettings;
    }

    public getLoadingCriteria(): ICriteriaSettingData {
        return {
            availableOperators: [],
            availableValues: [],
            id: TFS_Core_Utils.GUIDUtils.newGuid(),
            field: DeliveryTimelineCriteriaBusinessLogic.loadingDummyField,
            operator: DeliveryTimelineCriteriaBusinessLogic.loadingDummyField,
            value: DeliveryTimelineCriteriaBusinessLogic.loadingDummyField
        } as ICriteriaSettingData;
    }

    public updateCriteriaLoadingStateToValid(settings: ICriteriaSettingData[]): ICriteriaSettingData[] {
        let cloneSettings: ICriteriaSettingData[] = this._cloneCriteriaSettings(settings);
        for (let i = 0, l = cloneSettings.length; i < l; i++) {
            if (cloneSettings[i].field.valueState === ValueState.IsLoading) {
                cloneSettings[i] = this.getDefaultCriteria();
            }
        }
        return cloneSettings;
    }

    private _cloneCriteriaSettings(settings: ICriteriaSettingData[]) {
        let cloneSettings: ICriteriaSettingData[] = [];
        settings.forEach((item) => {
            cloneSettings.push(this._cloneCriteriaSetting(item));
        });
        return cloneSettings;
    }

    private _cloneCriteriaSetting(setting: ICriteriaSettingData): ICriteriaSettingData {
        let field = this._cloneFieldRef(setting.field);
        let operator = this._cloneFieldRef(setting.operator);
        let value = this._cloneFieldRef(setting.value);
        let availableOperators = this._cloneFieldRefArray(setting.availableOperators);
        let availableValues = this._cloneFieldRefArray(setting.availableValues);
        let settingDeepCopy: ICriteriaSettingData = {
            id: setting.id,
            field: field,
            operator: operator,
            value: value,
            valueControlType: setting.valueControlType,
            availableOperators: availableOperators,
            availableValues: availableValues,
        } as ICriteriaSettingData;

        return settingDeepCopy;
    }

    private _cloneFieldRef(fieldRef: IFieldShallowReference): IFieldShallowReference {
        return $.extend({}, fieldRef) as IFieldShallowReference;
    }

    private _cloneFieldRefArray(fieldRefs: IFieldShallowReference[]): IFieldShallowReference[] {
        let clone: IFieldShallowReference[] = [];
        fieldRefs.forEach(x => {
            clone.push(this._cloneFieldRef(x));
        });

        return clone;
    }

    /**
    * Return index of criteria setting. Return -1 if not found.
    * @param {ICriteriaSettingData[]} settings - criteria settings
    * @param {string} id - id of the criteria setting
    */
    private _getCriteriaSettingIndex(settings: ICriteriaSettingData[], id: string): number {
        for (let i = 0, l = settings.length; i < l; i++) {
            if (settings[i].id === id) {
                return i;
            }
        }
        return -1;
    }

    private _getValueControlType(fieldDefinition: IFieldDefinition, allowedValues?: string[]): FieldValueControlTypeEnum {
        if (fieldDefinition == null) {
            return FieldValueControlTypeEnum.Default;
        }
        else if (fieldDefinition.isIdentity) {
            return FieldValueControlTypeEnum.Identity;
        }
        else if (fieldDefinition.type === FieldType.TreePath) {
            return FieldValueControlTypeEnum.TreePath;
        }
        else if (allowedValues && allowedValues.length > 0) {
            return FieldValueControlTypeEnum.Dropdown;
        }
        else {
            return FieldValueControlTypeEnum.Default;
        }
    }
}

export class DeliveryTimelineCriteriaConstants {
    public static stringOperators: string[] = OMWiqlOperators.getLocalizedOperatorList([OMWiqlOperators.WiqlOperators.OperatorEqualTo, OMWiqlOperators.WiqlOperators.OperatorNotEqualTo,
    OMWiqlOperators.WiqlOperators.OperatorContains, OMWiqlOperators.WiqlOperators.OperatorNotContains]);

    public static equalityOperators: string[] = OMWiqlOperators.getLocalizedOperatorList([OMWiqlOperators.WiqlOperators.OperatorEqualTo, OMWiqlOperators.WiqlOperators.OperatorNotEqualTo]);

    public static comparisonOperators: string[] = OMWiqlOperators.getLocalizedOperatorList([OMWiqlOperators.WiqlOperators.OperatorEqualTo, OMWiqlOperators.WiqlOperators.OperatorNotEqualTo,
    OMWiqlOperators.WiqlOperators.OperatorGreaterThan, OMWiqlOperators.WiqlOperators.OperatorLessThan,
    OMWiqlOperators.WiqlOperators.OperatorGreaterThanOrEqualTo, OMWiqlOperators.WiqlOperators.OperatorLessThanOrEqualTo]);

    public static treePathOperators: string[] = OMWiqlOperators.getLocalizedOperatorList([OMWiqlOperators.WiqlOperators.OperatorEqualTo, OMWiqlOperators.WiqlOperators.OperatorNotEqualTo,
    OMWiqlOperators.WiqlOperators.OperatorUnder, OMWiqlOperators.WiqlOperators.OperatorNotUnder]);

    public static textWithTextSupportOperators: string[] = OMWiqlOperators.getLocalizedOperatorList(OMWiqlOperators.TextWithTextSupportOperators);

    public static textOperators: string[] = OMWiqlOperators.getLocalizedOperatorList(OMWiqlOperators.TextOperators);
}
