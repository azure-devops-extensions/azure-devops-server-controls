import Action_Base = require("VSS/Flux/Action");
import { IDeliveryTimelineCriteriaData, ICriteriaSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

export class DeliveryTimelineCriteriaActions
{
    /**
    * Initialize the criteria setting
    * @type {IDeliveryTimelineCriteriaData} - Contains criteria data
    */
    public initialize: Action_Base.Action<IDeliveryTimelineCriteriaData>;

    /**
    * Change criteria settings
    */
    public settingChanged: Action_Base.Action<{ criteria: ICriteriaSettingData[], validationResult: IModelWithValidation }>;

    constructor() {
        this.initialize = new Action_Base.Action<IDeliveryTimelineCriteriaData>();
        this.settingChanged = new Action_Base.Action<{ criteria: ICriteriaSettingData[], validationResult: IModelWithValidation }>();
    }
}
