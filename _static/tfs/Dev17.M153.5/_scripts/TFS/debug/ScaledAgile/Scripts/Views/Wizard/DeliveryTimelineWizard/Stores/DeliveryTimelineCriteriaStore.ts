
import Store_Base = require("VSS/Flux/Store");

import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { IDeliveryTimelineCriteriaData, ICriteriaSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { DeliveryTimelineCriteriaActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaActions";

/**
 * Delivery Timeline Criteria Store
 */
export class DeliveryTimelineCriteriaStore extends Store_Base.Store {
    private _value: IDeliveryTimelineCriteriaData;
    private _actions: DeliveryTimelineCriteriaActions;

    constructor(actions: DeliveryTimelineCriteriaActions) {
        super();
        this._actions = actions;
        this._addActionListeners();
    }

    private _addActionListeners() {
        this._actions.initialize.addListener(this._onChange, this);
        this._actions.settingChanged.addListener(this._onSettingsChanged, this);
    }

    public getValue(): IDeliveryTimelineCriteriaData {
        return this._value;
    }

    private _onChange(data: IDeliveryTimelineCriteriaData) {
        this._value = data;
        this.emitChanged();
    }

    private _onSettingsChanged(data: { criteria: ICriteriaSettingData[], validationResult: IModelWithValidation }) {
        if (this._value) {
            this._value.criteria = data.criteria;
            this._value.validationState = data.validationResult.validationState;
            this._value.message = data.validationResult.message;
            this.emitChanged();
        }
    }

    public dispose(): void {
        this._actions.initialize.removeListener(this._onChange);
        this._actions.settingChanged.removeListener(this._onSettingsChanged);
    }
}

