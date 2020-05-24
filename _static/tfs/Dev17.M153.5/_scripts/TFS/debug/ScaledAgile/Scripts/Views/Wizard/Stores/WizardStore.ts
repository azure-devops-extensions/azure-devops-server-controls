import Store_Base = require("VSS/Flux/Store");
import { IWizardData, ITeamBacklogMappingsProperties, ICriteriaProperties } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { WizardActions, WizardSettingActions } from "ScaledAgile/Scripts/Views/Wizard/Actions/WizardActions";
import { PlanType } from "TFS/Work/Contracts";
import { WizardBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardBusinessLogic";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

/**
 * Wizard Store
 */
export class WizardStore extends Store_Base.Store {

    private _value: IWizardData;
    private _actions: WizardActions;

    constructor(actions: WizardActions) {
        super();
        this._value = {
            name: { value: "", isDirty: false, isValid: false },
            description: { value: "", isDirty: false, isValid: true },
            viewType: PlanType.DeliveryTimelineView,
            teamBacklogMappings: {},
            criteria: {
                filterClauses: [],
                validationState: {
                    validationState: ValidationState.Success
                }
            },
            isValid: false,
            isSaving: false
        } as IWizardData;
        this._actions = actions;
        this._addActionListeners();
    }

    public getValue(): IWizardData {
        return this._value;
    }

    private _addActionListeners() {
        this._actions.initialize.addListener(this.onChange, this);
        this._actions.nameChanged.addListener(this._onNameChanged, this);
        this._actions.descriptionChanged.addListener(this._onDescriptionChanged, this);
        this._actions.onBeginSave.addListener(this._onBeginSave, this);
        this._actions.onEndSave.addListener(this._onEndSave, this);

        WizardSettingActions.WizardTeamSettingChanging.addListener(this._onSettingChanging, this);
        WizardSettingActions.WizardTeamSettingChanged.addListener(this._onSettingChanged, this);
        WizardSettingActions.WizardCriteriaSettingChanged.addListener(this._onCriteriaSettingChanged, this);
    }

    private onChange(payload: IWizardData) {
        this._value = payload;
        this.emitChanged();
    }

    private _onBeginSave() {
        this._value.isSaving = true;
        this.emitChanged();
    }

    private _onEndSave() {
        this._value.isSaving = false;
        this.emitChanged();
    }

    private _onNameChanged(name: string) {
        const data = this.getValue();
        data.name.isDirty = true;
        data.name.value = name;

        const validationResults = WizardBusinessLogic.validatePlanName(name); // That doesn't belong there: Store do not do logic.
        data.name.message = validationResults.message;
        data.name.isValid = validationResults.validationState === ValidationState.Success;
        data.isValid = this._validateWizardData(data);
        this.emitChanged();
    }

    private _onDescriptionChanged(description: string) {
        const data = this.getValue();
        data.description.isDirty = true;
        data.description.value = description;

        const validationResults = WizardBusinessLogic.validatePlanDescription(description); // That doesn't belong there: Store do not do logic.
        data.description.message = validationResults.message;
        data.description.isValid = validationResults.validationState === ValidationState.Success;
        data.isValid = this._validateWizardData(data);
        this.emitChanged();
    }

    private _onSettingChanged(settingProperties: ITeamBacklogMappingsProperties) {
        const data = this.getValue();
        data.teamBacklogMappings = settingProperties;
        data.isValid = this._validateWizardData(data);
        this.emitChanged();
    }

    private _onSettingChanging() {
        const data = this.getValue();
        data.isValid = false;
        this.emitChanged();
    }

    private _onCriteriaSettingChanged(criteriaProperties: ICriteriaProperties) {
        const data = this.getValue();
        data.criteria = criteriaProperties;
        data.isValid = this._validateWizardData(data);
        this.emitChanged();
    }

    private _validateWizardData(data: IWizardData): boolean {
        return data.name.isValid &&
            data.description.isValid &&
            (data.teamBacklogMappings.validationState && (data.teamBacklogMappings.validationState.validationState === ValidationState.Success)) &&
            (data.criteria.validationState && (data.criteria.validationState.validationState === ValidationState.Success));
    }

    /**
     * What: Delete references to all listeners
     * Why: Clean for Single Page Application and unit tests
     */
    public dispose(): void {
        this._actions.initialize.removeListener(this.onChange);
        this._actions.nameChanged.removeListener(this._onNameChanged);
        this._actions.descriptionChanged.removeListener(this._onDescriptionChanged);
        this._actions.onBeginSave.removeListener(this._onBeginSave);
        this._actions.onEndSave.removeListener(this._onEndSave);

        WizardSettingActions.WizardTeamSettingChanging.removeListener(this._onSettingChanging);
        WizardSettingActions.WizardTeamSettingChanged.removeListener(this._onSettingChanged);
        WizardSettingActions.WizardCriteriaSettingChanged.removeListener(this._onCriteriaSettingChanged);
    }
}
