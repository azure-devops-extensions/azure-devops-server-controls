
import Store_Base = require("VSS/Flux/Store");

import { IDeliveryTimelineTeamSettingsData, ITeamSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimeLineTeamSettingsInterfaces";
import { DeliveryTimelineTeamSettingsActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsActions";
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

/**
 * Delivery Timeline TeamSettings Store
 */
export class DeliveryTimelineTeamSettingsStore extends Store_Base.Store {
    private _value: IDeliveryTimelineTeamSettingsData;
    private _actions: DeliveryTimelineTeamSettingsActions;
    constructor(actions: DeliveryTimelineTeamSettingsActions) {
        super();
        this._actions = actions;
        this._addActionListeners();
    }

    public getValue(): IDeliveryTimelineTeamSettingsData {
        return this._value;
    }

    private _addActionListeners() {
        this._actions.initialize.addListener(this._onChange, this);
        this._actions.settingChanged.addListener(this._onSettingsChanged, this);
    }

    private _onChange(data: IDeliveryTimelineTeamSettingsData) {
        this._value = data;
        this.emitChanged();
    }

    private _onSettingsChanged(data: { settings: ITeamSettingData[], validationResult: IModelWithValidation }) {
        let value = this.getValue();
        if (value) {
            value.settings = data.settings;
            value.validationState = data.validationResult.validationState;
            value.message = data.validationResult.message;
            this.emitChanged();
        }
    }
}

