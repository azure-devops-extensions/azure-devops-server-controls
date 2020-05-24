import * as Q from "q";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { MessageBarType } from "OfficeFabric/MessageBar";

import { Message, StateChangeParams } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { WizardSettingActions } from "ScaledAgile/Scripts/Views/Wizard/Actions/WizardActions";
import { DeliveryTimelineCriteriaBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaBusinessLogic";
import { DeliveryTimelineCriteriaActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaActions";
import { IDeliveryTimelineCriteriaDataProviders } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/DataProviders/DeliveryTimelineCriteriaDataProviders";
import { IDeliveryTimelineCriteriaData, ICriteriaSettingData, ICriteriaSelectedSettingData} from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { WizardMappers } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardMappers";
import { IFieldShallowReference } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

export interface IDeliveryTimelineCriteriaActionsCreator {
    /**
     * Initialize the delivery timeline criteria experience
     * @param {ICriteriaSelectedSettingData[]>} initial setting, can be null.
     */
    initializeStore(initialSettings: ICriteriaSelectedSettingData[]): void;

    /**
     * Add criteria setting
     * @param {ICriteriaSettingData[]} settings - existing settting
     */
    addCriteria(criteria: ICriteriaSettingData[]): void;

    /**
     * Delete criteria setting
     * @param {ICriteriaSettingData[]} settings - existing settting
     * @param {string} id - id of the setting to be deleted
     */
    deleteCriteria(settings: ICriteriaSettingData[], id: string): void;

    /**
     * Change field selection
     * @param {ICriteriaSettingData[]} settings - existing settings
     * @param {string} id - id of the setting
     * @param {string} value - field value
     */
    changeField(settings: ICriteriaSettingData[], id: string, value: string): void;

    /**
     * Change operator selection
     * @param {ICriteriaSettingData[]} settings - existing settings
     * @param {string} id - id of the setting
     * @param {string} value - operator value
     */
    changeOperator(settings: ICriteriaSettingData[], id: string, value: string): void;

    /**
     * Change value selection
     * @param {ICriteriaSettingData[]} settings - existing settings
     * @param {string} id - id of the setting
     * @param {string} value - value of the value control
     */
    changeValue(settings: ICriteriaSettingData[], id: string, value: string): void;
}

export class DeliveryTimelineCriteriaActionsCreator implements IDeliveryTimelineCriteriaActionsCreator {
    private _pageActions: PageActions;
    private _dataProvider: IDeliveryTimelineCriteriaDataProviders;
    private _actions: DeliveryTimelineCriteriaActions;

    protected _logic: DeliveryTimelineCriteriaBusinessLogic;

    constructor(dataProvider: IDeliveryTimelineCriteriaDataProviders, actions: DeliveryTimelineCriteriaActions, pageActions: PageActions) {
        this._pageActions = pageActions;
        this._actions = actions;
        this._logic = new DeliveryTimelineCriteriaBusinessLogic();
        this._dataProvider = dataProvider;
    }

    /**
     * Initialize the delivery timeline criteria experience
     * @param {ICriteriaSelectedSettingData[]>} initial setting, can be null.
     */
    public initializeStore(initialSettings: ICriteriaSelectedSettingData[]): void {
        if (initialSettings instanceof Array && initialSettings.length > 0) {
            Q(this._dataProvider.getFieldsAsync()).done(
                (fields: IFieldDefinition[]) => {
                    this._logic.initializeCache(fields);
                    const availableFields = this._logic.getSupportedFieldsReference();
                    const criteriaSettings: IDeliveryTimelineCriteriaData = {
                        criteria: [],
                        validationState: ValidationState.Success,
                        availableFields: availableFields
                    };

                    Q(this._getInitialCriteriaSetting(initialSettings)).done(
                        (initialSettingsData: ICriteriaSettingData[]) => {
                            criteriaSettings.criteria = initialSettingsData;
                            criteriaSettings.validationState = this._logic.validateSettings(initialSettingsData).validationState;
                            this._actions.initialize.invoke(criteriaSettings);
                        },
                        (error: TfsError) => {
                            // Failed to fetch allowed values
                            // If there was an invalid field name, validation result will be false
                            // Otherwise, validation status should be success 
                            const settings = WizardMappers.toCriteriaSettingData(initialSettings);
                            const validationResult = this._logic.validateSettings(settings).validationState;
                            this._onAjaxCallFail(settings, availableFields, validationResult);
                        }
                    );
                },
                (error: TfsError) => {
                    // Failed to get fields. Hence field combo is empty since display name cannot be resolved
                    this._onAjaxCallFail(WizardMappers.toCriteriaSettingData(initialSettings));
                });
        }
        else {
            // invoke with empty data.
            const criteriaSettings: IDeliveryTimelineCriteriaData = {
                criteria: [],
                validationState: ValidationState.Success,
                availableFields: []
            };
            this._actions.initialize.invoke(criteriaSettings);
        }
    }

    /**
     * Add criteria setting
     * @param {ICriteriaSettingData[]} settings - existing settting
     */
    public addCriteria(settings: ICriteriaSettingData[]): void {
        if (!this._logic.isCacheInitialized()) {
            // if the cache has never been initialized, then invoke with loading data.
            const cloneSettings = this._logic.addCriteriaSetting(settings, true);
            this._fireSettingChanged(cloneSettings);

            Q(this._dataProvider.getFieldsAsync()).done(
                (fields: IFieldDefinition[]) => {
                    this._logic.initializeCache(fields);
                    const updatedCloneSetting = this._logic.updateCriteriaLoadingStateToValid(cloneSettings);

                    const criteriaSettings: IDeliveryTimelineCriteriaData = {
                        criteria: updatedCloneSetting,
                        validationState: ValidationState.Error,
                        availableFields: this._logic.getSupportedFieldsReference()
                    };
                    // after retrieved field from server, then invoke with real data.
                    this._actions.initialize.invoke(criteriaSettings);
                },
                (error: TfsError) => {
                    this._onAjaxCallFail(cloneSettings);
                }
            );
        }
        else {
            // otherwise, invoke with an empty criteria setting row.
            const cloneSettings = this._logic.addCriteriaSetting(settings, false);
            this._fireSettingChanged(cloneSettings);
        }
    }

     /**
     * Delete criteria setting
     * @param {ICriteriaSettingData[]} settings - existing settting
     * @param {string} id - id of the setting to be deleted
     */
    public deleteCriteria(settings: ICriteriaSettingData[], id: string): void {
        const cloneCriteriaSetting = this._logic.deleteCriteriaSetting(settings, id);
        this._fireSettingChanged(cloneCriteriaSetting);
    }

    /**
     * Change field selection
     * @param {ICriteriaSettingData[]} settings - existing settings
     * @param {string} id - id of the setting
     * @param {string} value - field value
     */
    public changeField(settings: ICriteriaSettingData[], id: string, value: string): void {
        const fieldDefinition = this._logic.resolveFieldByName(value);
        const cloneSettings = this._logic.validateAndUpdateField(settings, id, value, fieldDefinition);
        this._fireSettingChanged(cloneSettings);
        if (fieldDefinition) {
            Q(this._dataProvider.getAllowedValuesAsync(fieldDefinition.type, fieldDefinition.id)).done(
                (alllowedValues: string[]) => {
                    const updatedSettings = this._logic.updateValues(cloneSettings, id, alllowedValues, fieldDefinition);
                    this._fireSettingChanged(updatedSettings);
                },
                (error: TfsError) => {
                    // No-op if allowed values call failed
                }
            );
        }
    }

    /**
     * Change operator selection
     * @param {ICriteriaSettingData[]} settings - existing settings
     * @param {string} id - id of the setting
     * @param {string} value - operator value
     */
    public changeOperator(settings: ICriteriaSettingData[], id: string, value: string): void {
        const cloneSettings = this._logic.validateAndUpdateOperator(settings, id, value);
        this._fireSettingChanged(cloneSettings);
    }

     /**
     * Change value selection
     * @param {ICriteriaSettingData[]} settings - existing settings
     * @param {string} id - id of the setting
     * @param {string} value - value of the value control
     */
    public changeValue(settings: ICriteriaSettingData[], id: string, value: string): void {
        const cloneSettings = this._logic.validateAndUpdateValue(settings, id, value);
        this._fireSettingChanged(cloneSettings);
    }

    private _getInitialCriteriaSetting(initialSettings: ICriteriaSelectedSettingData[]): IPromise<ICriteriaSettingData[]> {
        const deferred = Q.defer<ICriteriaSettingData[]>();

         // Populate display name & allowed values for each row
        const allPromises: Q.IPromise<ICriteriaSettingData>[] = initialSettings.map((setting: ICriteriaSettingData) => this._populateCriteriaSettingsData(setting));

        // Resolve when all rows are populated
        Q.all(allPromises).done(deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    private _populateCriteriaSettingsData(setting: ICriteriaSettingData): IPromise<ICriteriaSettingData> {
        let fieldDefinition = this._logic.resolveFieldByName(setting.field.id);
        if (fieldDefinition) {
            setting.field.name = fieldDefinition.name;  // set field display name 
            const locallizedOperators = DeliveryTimelineCriteriaBusinessLogic.getLocalizedSupportedWiqlOperators(fieldDefinition);
            const operatorsReferences = this._logic.convertLocalizedOperatorsToFieldShallowReference(locallizedOperators);

            return this._dataProvider.getAllowedValuesAsync(fieldDefinition.type, fieldDefinition.id).then(
                (allowedValues: string[]) => {
                    const availableValues = this._logic.convertToFieldShallowReference(allowedValues);
                    const criteriaSetting = {
                        availableOperators: operatorsReferences,
                        availableValues: availableValues,
                        id: setting.id,
                        field: setting.field,
                        operator: setting.operator,
                        value: setting.value
                    } as ICriteriaSettingData;

                    return criteriaSetting;
                });
        }
        else {
            // field is not valid anymore
            // field name will be empty as display name cannot be resolved. 
            const criteriaSetting = {
                availableOperators: [],
                availableValues: [],
                id: setting.id,
                field: setting.field,
                operator: setting.operator,
                value: setting.value
                
            } as ICriteriaSettingData;

            return Q(criteriaSetting);
        }
    }

    private _fireSettingChanged(settings: ICriteriaSettingData[]) {
        const criteriaProperties = this._logic.toViewProperties(settings);
        this._actions.settingChanged.invoke({ criteria: settings, validationResult: criteriaProperties.validationState });
        WizardSettingActions.WizardCriteriaSettingChanged.invoke(criteriaProperties);
    }

    private _onAjaxCallFail(settingsData: ICriteriaSettingData[], availableFields: IFieldShallowReference[] = [], validationState: ValidationState = ValidationState.Error): void {
        if (this._pageActions) {
            this._pageActions.setPageLoadingStateWithMessage.invoke(new StateChangeParams(PageLoadingState.Fail, new Message(MessageBarType.error, ScaledAgileResources.ErrorInitializingNewPlanTeamSettings, false)));
        }

        const criteriaSettings: IDeliveryTimelineCriteriaData = {
            criteria: settingsData,
            validationState: validationState,
            availableFields: availableFields
            
        };
        this._actions.initialize.invoke(criteriaSettings);
    }
}

