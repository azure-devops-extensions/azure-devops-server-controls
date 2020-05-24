
import Store_Base = require("VSS/Flux/Store");
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { IDeliveryTimelineMarkersData, IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";
import { DeliveryTimelineMarkersActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineMarkersActions";

/**
 * Delivery Timeline Markers Store
 */
export class DeliveryTimelineMarkersStore extends Store_Base.Store {
    private _value: IDeliveryTimelineMarkersData;
    private _actions: DeliveryTimelineMarkersActions;

    constructor(actions: DeliveryTimelineMarkersActions) {
        super();
        this._actions = actions;
        this._addActionListeners();
    }

    private _addActionListeners() {
        this._actions.initialize.addListener(this._onInitialize, this);
        this._actions.settingChanged.addListener(this._onSettingsChanged, this);
    }

    public getValue(): IDeliveryTimelineMarkersData {
        return this._value;
    }

    private _onInitialize(data: IDeliveryTimelineMarkersData) {
        this._value = data;
        this.emitChanged();
    }

    private _onSettingsChanged(data: { markers: IMarkersSettingData[], validationResult: IModelWithValidation }) {
        if (this._value) {
            this._value.markers = data.markers;
            this._value.validationState = data.validationResult.validationState;
            this._value.message = data.validationResult.message;
            this.emitChanged();
        }
        else {
            throw new Error("Marker value must be defined in the DeliveryTimelineMarkersStore");
        }
    }

    public dispose(): void {
        this._actions.initialize.removeListener(this._onInitialize);
        this._actions.settingChanged.removeListener(this._onSettingsChanged);
    }
}