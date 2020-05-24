import Action_Base = require("VSS/Flux/Action");
import { IDeliveryTimelineMarkersData, IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

export class DeliveryTimelineMarkersActions
{
    /**
    * Initialize the markers setting    
    */
    public initialize: Action_Base.Action<IDeliveryTimelineMarkersData>;

    /**
    * Change markers settings
    */
    public settingChanged: Action_Base.Action<{ markers: IMarkersSettingData[], validationResult: IModelWithValidation }>;

    constructor() {
        this.initialize = new Action_Base.Action<IDeliveryTimelineMarkersData>();
        this.settingChanged = new Action_Base.Action<{ markers: IMarkersSettingData[], validationResult: IModelWithValidation }>();
    }
}
