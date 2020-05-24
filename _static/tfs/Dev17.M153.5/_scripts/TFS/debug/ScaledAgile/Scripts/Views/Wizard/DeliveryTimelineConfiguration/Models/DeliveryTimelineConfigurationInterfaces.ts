
import { PlanType } from "TFS/Work/Contracts";
import { ICardSettings } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IDeliveryTimeLineStoreData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IDeliveryTimelineConfigurationActionsCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineConfigurationActionsCreator";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { ITeamSelectedSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { ICriteriaSelectedSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";

/**
 * What: Give the status of the saving
 * Why: We need to have a more detailed response than just true/false. It allows us to handle cases where we are in the process
 *      of saving, and to do different behavior if the save is successful or a failure.
 */
export enum SavingState {
    /**
     * Initial state, nothing is doing on.
     */
    NotSaved = 0,
    /**
     * The request to be saved is sent to the backend. We are waiting a response.
     */
    Saving = 1,
    /**
     * Response is successful which mean we can close the configuration dialog
     */
    SavedSuccess = 2,
    /**
     * Response is a failure, we must keep the configuration open and display the message
     */
    SavedFailed = 3
}
/**
 * What: An interface that allow to read only value from the store
 * Why: Allow the ActionsCreator to have a read only access to the store which allow to reduce the number of data pass by props
 */
export interface IDeliveryTimelineStoreState {
    /**
     * What: Current value of the delivery Timeline
     * Why: Allow to UI to display the active configuration
     */
    getValue(): IDeliveryTimelineConfigurationRootData;

    /**
     * What: Give the value when the store was initialized
     * Why: Can compare with getValue to know what changed (know if it's dirty)
     */
    getInitialValue(): IDeliveryTimelineConfigurationRootData;

    /**
     * What: Give the additional value when the store was initialized
     * Why: Retrieve additional data to be used to help make the settings experience (eg. allowed values lists).
     */
    getAdditionalData(): IDeliveryTimelineConfigurationAdditionalData;
}

/**
 * What: Gives a way to subscribe and unsubscribe to the configuration store
 * Why: Need to have the configuration dialog to know when something change from the store to update its UI
 */
export interface IDeliveryTimelineConfigurationStore extends IDeliveryTimelineStoreState {
    /**
     * What: Default change listener.
     * Why: It's there by convention: not used. We use specific events to have proper tab to get updated
     */
    addChangedListener(handler: IEventHandler): void;

    /**
     * What: Allow to attach to the title change event
     * Why: Used to update the title and description tab
     */
    addTitleChangedListener(handler: IEventHandler): void;

    /**
     * What: Allow to attach to the description change event
     * Why: Used to update the title and description tab
     */
    addDescriptionChangedListener(handler: IEventHandler): void;

    /**
     * What: Allow to attach to the team change event
     * Why: Used to update the team's tab
     */
    addTeamsChangedListener(handler: IEventHandler): void;

    /**
    * What: Allow to attach to the criteria change event
    * Why: Used to update the field criteria's tab
    */
    addCriteriaChangedListener(handler: IEventHandler): void;

    /**
     * What: Allow to attach to the card fields change event
     * Why: Used to update the fields' tab
     */
    addCardFieldsChangedListener(handler: IEventHandler): void;

    /**
     * What: Allow to attach to the markers change event
     * Why: Used to update the marker tab
     */
    addMarkersChangedListener(handler: IEventHandler): void;

    /**
     * What: Allow to attach to the beginning of the save event
     * Why: Indicate that a request is sent to the server
     */
    addBeginSaveListener(handler: IEventHandler): void;

    /**
     * What: Allow to attach to the end of the save event
     * Why: Indicate to the configuration dialog to close or not depending of the result
     */
    addEndSaveListener(handler: IEventHandler): void;

    removeChangedListener(handler: IEventHandler): void;
    removeTitleChangedListener(handler: IEventHandler): void;
    removeDescriptionChangedListener(handler: IEventHandler): void;
    removeTeamsChangedListener(handler: IEventHandler): void;
    removeCriteriaChangedListener(handler: IEventHandler): void;
    removeCardFieldsChangedListener(handler: IEventHandler): void;
    removeMarkersChangedListener(handler: IEventHandler): void;
    removeBeginSaveListener(handler: IEventHandler): void;
    removeEndSaveListener(handler: IEventHandler): void;
}

/**
 * What:
 * Model contract for the whole configuration. This interface contains all sub-configuration which represent tabs.
 *
 * Why:
 * Convenient way to have all the configuration grouped together. Allow to have cross sub-configuration relashionship for cross-validation if required.
 */
export interface IDeliveryTimelineConfigurationRootData {
    /**
    * The id of the plan we are configuring. This represent the Delivery Timeline plan ID.
    */
    id: string;

    /**
     * Current revision of the plan. This field should be considered read-only; the server sets this.
     */
    revision: number;

    /**
     * The view type
     */
    type: PlanType;

    /**
     * What: Indicate what is the saving state of the store root data
     * Why: Need to know when the data got saved
     */
    savingState: SavingState;

    /**
     * Whether the configurations edit experience is disabled
     */
    editDisabled: boolean;

    /**
     * What: All the general tab's data should be under general
     * Why: We separate the model to be close to the UI to simplify the mental representation of the data-ui
     */
    general: IDeliveryTimelineConfigurationGeneral;

    /**
     * What: All the cards tab's data should be under cards
     * Why: We separate the model to be close to the UI to simplify the mental representation of the data-ui
     */
    cards: IDeliveryTimelineConfigurationCards;

    /**
     * What: Additional data that is to be used by tab (allowed values, etc.)
     * Why: We need to be able to supply some of the settings experiences with
     * supplemental data that is not persisted for the plan.
     */
    additionalData?: IDeliveryTimelineConfigurationAdditionalData;
}

/**
 * What:  Contains 1 property per tab
 *
 * Why: 1 model interface per tab which allow to have validation per tab easily without having to be overwhelm with other configuration
 */
export interface IDeliveryTimelineConfigurationGeneral {
    title: IDeliveryTimelineConfigurationDetail;
    description: IDeliveryTimelineConfigurationDetail;
    teams: IDeliveryTimelineConfigurationTeams;
    criteria: IDeliveryTimelineConfigurationCriteria;
    markers: IDeliveryTimelineConfigurationMarkers;
}

/**
 * What:  Contains 1 property per tab
 *
 * Why: 1 model interface per tab which allow to have validation per tab easily without having to be overwhelm with other configuration
 */
export interface IDeliveryTimelineConfigurationCards {
    fields: IDeliveryTimelineConfigurationFields;
}

/**
 * What: Additional readonly data that can be used by tabs (can be extended as needed).
 * Why: Additional data is needed for the settings experience to allow for dynamic selection.
 */
export interface IDeliveryTimelineConfigurationAdditionalData {
    supportedFieldDefinitions: IFieldDefinition[];
}

/**
 * What: Give default field that every model objects must have to comply with tab
 * Why: The isValid and IsDirty is used for the legacy tab model and we need to pass this information
 */
export interface IModelForTab {
    /**
     * What: indicate if the model for the tab is validation
     * Why: We need to have all tab valid to save
     */
    isValid: boolean;

    /**
     * What: indicate if the tab has been touched by the user
     * Why: Need to display something special on the UI next to the tab and to enable the save button
     */
    isDirty: boolean;
}

/**
 * What: The tab where we configure the name/description of the plan
 * Why: Simplify the validation and the comprehension of the code.
 */
export interface IDeliveryTimelineConfigurationDetail extends IModelWithValidation, IModelForTab {

    /**
     * The name of the view
     */
    value: string;
}

/**
 * What: The team configuration.
 *
 * Why: 1 tab, 1 interface. Simplify the validation and the comprehension of the code.
 * It uses the ITeamSelectedSettingData to avoid duplication with the Wizard. At some point, this code should be moved
 * out of the Wizard folder and have a shared place between configuration and creation.
 */
export interface IDeliveryTimelineConfigurationTeams extends IModelWithValidation, IModelForTab {
    /**
     * We use the same type of the existing wizard for avoiding repeating
     */
    teamsSettings: ITeamSelectedSettingData[];
}

/**
 * What: The tab where we configure plan criteria
 * Why: 1 tab, 1 interface. Simplify the validation and the comprehension of the code.
 */
export interface IDeliveryTimelineConfigurationCriteria extends IModelWithValidation, IModelForTab {

    /**
     * The filter criteria
     */
    criteriaSettings: ICriteriaSelectedSettingData[];
}

/**
 * What: The tab where we configure the name of the plan
 * Why: 1 tab, 1 interface. Simplify the validation and the comprehension of the code.
 */
export interface IDeliveryTimelineConfigurationFields extends IModelWithValidation, IModelForTab {

    /**
     * The field settings of the plan
     */
    fieldSettings: ICardSettings;
}

/**
 * What: The tab where we configure the markers of the plan
 * Why: 1 tab, 1 interface 
 */
export interface IDeliveryTimelineConfigurationMarkers extends IModelWithValidation, IModelForTab {

    /**
     * The markers for this plan
     */
    markers: IMarkersSettingData[];
}

/**
 * What: Interface to be passed down to each tabs
 * Why: Allow to pass a single object to component which has reference to the store and the actionsCreator of the Flux cycle.
 */
export interface IDeliveryTimelineConfigurationOptions {
    actionsCreator: IDeliveryTimelineConfigurationActionsCreator;
    configurationStore: IDeliveryTimelineConfigurationStore;
    dataFromPlan: IDeliveryTimeLineStoreData;
}
