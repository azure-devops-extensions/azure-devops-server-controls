import Action_Base = require("VSS/Flux/Action");
import { IDeliveryTimelineConfigurationRootData, IDeliveryTimelineConfigurationDetail, IDeliveryTimelineConfigurationTeams, IDeliveryTimelineConfigurationFields, IDeliveryTimelineConfigurationAdditionalData, IDeliveryTimelineConfigurationCriteria, IDeliveryTimelineConfigurationMarkers }
    from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

/**
 * What:
 * All actions used during the configuration experience of the delivery timeline
 *
 * Why:
 * Simplify the code by having all the configuration's action in the same class.
 */
export class DeliveryTimelineConfigurationActions {
    /**
     * What:
     * Initialize the store with default value which are the values already saved for a Delivery Timeline plan
     *
     * Why:
     * Need to get data on the UI when we start the configuration experience.
     * @type {IDeliveryTimelineConfigurationRootData} - The root of all the data for the configuration. Contains all tabs.
     */
    public initialize: Action_Base.Action<IDeliveryTimelineConfigurationRootData>;

    /**
     * What:
     * Change the name of the plan. Occur when the user erase a character, add a character, etc to the name of the delivery timeline plan.
     *
     * Why:
     * Need to update the UI from what the user just type
     */
    public titleChanged: Action_Base.Action<IDeliveryTimelineConfigurationDetail>;

    /**
     * What:
     * Change the description of the plan. Occur when the user erase a character, add a character, etc to the description of the delivery timeline plan.
     *
     * Why:
     * Need to update the UI from what the user just type
     */
    public descriptionChanged: Action_Base.Action<IDeliveryTimelineConfigurationDetail>;

    /**
     * What:
     * Teams' tab data
     *
     * Why:
     * The data of this tab is changing depending of what the user select. Every modification need to trigger this action
     * to have the UI updated accordingly.
     */
    public teamsChanged: Action_Base.Action<IDeliveryTimelineConfigurationTeams>;

    /**
    * What:
    * Field criteria' tab data
    *
    * Why:
    * The data of this tab is changing depending of what the user select. Every modification need to trigger this action
    * to have the UI updated accordingly.
    */
    public criteriaChanged: Action_Base.Action<IDeliveryTimelineConfigurationCriteria>;

    /**
     * What:
     * Fields' tab data
     *
     * Why:
     * The data of this tab is changing depending of what the user select. Every modification need to trigger this action
     * to have the UI updated accordingly.
     */
    public fieldsChanged: Action_Base.Action<IDeliveryTimelineConfigurationFields>;

    /**
     * What:
     * Markers tab data
     *
     * Why:
     * The data of this tab changes depending on what the user selects. Every modification needs to trigger this action
     * to have the UI update accordingly.
     */
    public markersChanged: Action_Base.Action<IDeliveryTimelineConfigurationMarkers>;

    /**
     * What:
     * Additional data needed that is to be used by tab (allowed values, etc.)
     *
     * Why:
     * We need to be able to supply/lazy load some of the settings experiences with
     * supplemental data that is not persisted for the plan.
     */
    public additionalDataChanged: Action_Base.Action<IDeliveryTimelineConfigurationAdditionalData>;

    /**
     * What: Begin a save operation
     * Why: Allow to have the UI to know that save has started
     */
    public beingSave: Action_Base.Action<any>;

    /**
     * What: End a save operation. This is called once we have the response from the server
     * Why: Allow to stop the progress experience and close the configuration, or display error message on failure
     */
    public endSave: Action_Base.Action<IModelWithValidation>;

    /**
     * Initialize all actions
     */
    constructor() {
        this.initialize = new Action_Base.Action<IDeliveryTimelineConfigurationRootData>();
        this.titleChanged = new Action_Base.Action<IDeliveryTimelineConfigurationDetail>();
        this.descriptionChanged = new Action_Base.Action<IDeliveryTimelineConfigurationDetail>();
        this.teamsChanged = new Action_Base.Action<IDeliveryTimelineConfigurationTeams>();
        this.criteriaChanged = new Action_Base.Action<IDeliveryTimelineConfigurationCriteria>();
        this.markersChanged = new Action_Base.Action<IDeliveryTimelineConfigurationMarkers>(); 
        this.beingSave = new Action_Base.Action<void>();
        this.endSave = new Action_Base.Action<IModelWithValidation>();
        this.fieldsChanged = new Action_Base.Action<IDeliveryTimelineConfigurationFields>();
        this.additionalDataChanged = new Action_Base.Action<IDeliveryTimelineConfigurationAdditionalData>();
    }
}