import Action_Base = require("VSS/Flux/Action");
import { IWizardData, ITeamBacklogMappingsProperties, ICriteriaProperties } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

/**
 * Wizard specific actions
 */
export class WizardActions {
    /**
     * Initialize the wizard
     * @type {IWizardData} - Contains the name, type, viewProperties as well as the isValid indicator
     */
    public initialize: Action_Base.Action<IWizardData>;

    /**
     * The name changed by the wizard
     * @type {string} - The new name
     */
    public nameChanged: Action_Base.Action<string>;

    /**
     * The description changed by the wizard
     * @type {string} - The new description
     */
    public descriptionChanged: Action_Base.Action<string>;

    /**
     * Save operation beginning.
     */
    public onBeginSave: Action_Base.Action<null>;

    /**
     * Save operation completed.
     */
    public onEndSave: Action_Base.Action<null>;

    constructor() {
        this.initialize = new Action_Base.Action<IWizardData>();
        this.nameChanged = new Action_Base.Action<string>();
        this.descriptionChanged = new Action_Base.Action<string>();
        this.onBeginSave = new Action_Base.Action<null>();
        this.onEndSave = new Action_Base.Action<null>();
    }
}

/**
 * Wizard settng changed actions: It will be invoked by view specific action creator, and listened by generic wizard store.
 */
export namespace WizardSettingActions {
    // Fire WizardSettingChanging when setting is changing, this action is listened by the wizard store.
    // the wizard store will disable the create button.
    export var WizardTeamSettingChanging = new Action_Base.Action<void>();

    // Fire WizardSettingChanged when setting is changed, this action is listened by the wizard store.
    // the wizard store will enable the create button if setting is valid.
    export var WizardTeamSettingChanged = new Action_Base.Action<ITeamBacklogMappingsProperties>();

    // Fire WizardSettingChanged when criteria setting is changed, this action is listened by the wizard store.
    // the wizard store will enable the create button if setting is valid.
    export var WizardCriteriaSettingChanged = new Action_Base.Action<ICriteriaProperties>();
}
