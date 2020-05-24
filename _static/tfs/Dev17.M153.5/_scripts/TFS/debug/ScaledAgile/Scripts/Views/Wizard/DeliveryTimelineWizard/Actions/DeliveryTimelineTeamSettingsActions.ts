import Action_Base = require("VSS/Flux/Action");
import {IDeliveryTimelineTeamSettingsData, ITeamSettingData} from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import {IModelWithValidation} from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

/**
 * DeliveryTimelineWizard specific actions
 */
export class DeliveryTimelineTeamSettingsActions {
    /**
    * Initialize the wizard
    * @type {IDeliveryTimelineWizardData} - Contains the index and project id
    */
    public initialize: Action_Base.Action<IDeliveryTimelineTeamSettingsData>;

    /**
    * Change the team settings
    */
    public settingChanged: Action_Base.Action<{ settings: ITeamSettingData[], validationResult: IModelWithValidation }>;
    
    constructor() {
        this.initialize = new Action_Base.Action<IDeliveryTimelineTeamSettingsData>();
        this.settingChanged = new Action_Base.Action<{ settings: ITeamSettingData[], validationResult: IModelWithValidation }>();
    }
}

