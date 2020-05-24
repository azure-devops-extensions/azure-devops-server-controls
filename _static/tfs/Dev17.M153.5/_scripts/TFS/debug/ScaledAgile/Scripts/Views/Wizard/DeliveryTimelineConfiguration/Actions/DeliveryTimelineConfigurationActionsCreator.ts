import * as Q from "q";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Date from "VSS/Utils/Date";

import { PlanType, FilterClause, PlanUserPermissions } from "TFS/Work/Contracts";
import { IDeliveryTimelineConfigurationDetail, IDeliveryTimelineConfigurationRootData, IDeliveryTimelineConfigurationTeams, IDeliveryTimelineConfigurationCriteria, IDeliveryTimelineConfigurationMarkers }
    from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { IDeliveryTimelineConfigurationFields, IDeliveryTimelineConfigurationStore, SavingState } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { IDeliveryTimelineStorePersistedData, ITeam, ICalendarMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IDeliveryTimelineTeamSettingsData, ITeamSelectedSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IModelWithValidation, ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { ItemManager } from "ScaledAgile/Scripts/Shared/DataProviders/ItemManager";
import { IDeliveryTimelineCriteriaData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { ICriteriaSelectedSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";

import { AdditionalFieldsConfigurationBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/AdditionalFieldsConfigurationBusinessLogic";
import { DeliveryTimelineConfigurationActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineConfigurationActions";
import { ICardSettings } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IViewData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { WizardBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardBusinessLogic";
import { WizardMappers } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardMappers";
import { ViewsDataProvider } from "ScaledAgile/Scripts/Main/DataProviders/ViewsDataProvider";
import { ViewsErrorMapper } from "ScaledAgile/Scripts/Main/Utils/ViewsErrorMapper";
import { DeliveryTimelinePermissionUtil } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelinePermissionUtil";
import { IDeliveryTimelineMarkersData, IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";

/**
 * What:
 * This is the actions creator used by components for the configuration of the Delivery Timeline plan
 *
 * Why:
 * This is used as an access point into the Flux cycle of the configuration
 */
export interface IDeliveryTimelineConfigurationActionsCreator {
    /**
     * What:
     * This method is called when the UX is ready to receive the data from the existing DeliveryTimeline plan
     *
     * Why:
     * It's used to get the data to be able to edit it
     * @param {IDeliveryTimeLineStoreData} existingDeliveryTimelinePlan - The actual plan we want to modify. We already have this one loaded, we use it to get partial information like
     * @param {IFieldDefinition[]} allFieldDefinitions - All field definitions, to be used for allowed values in configuring the card fields
     * the actual name, teams, etc.
     */
    initializeStore(existingDeliveryTimelinePlan: IDeliveryTimelineStorePersistedData, allFieldDefinitions: IFieldDefinition[]): void;

    /**
     * What: Save the whole configuration
     * Why: Need to save to the backend  
     **/
    save(): void;

    /**
     * What: Entry point to change the title of a plan
     * Why: When typing a title for a plan, we have this method invoked which will update the store
     */
    setTitle(title: string): void;

    /**
     * What: Entry point to change the description of a plan
     * Why: When typing a description for a plan, we have this method invoked which will update the store
     */
    setDescription(description: string): void;

    /**
     * What: Entry point to change the group of team for the plan
     * Why: Need a way to set the teams into the store. Used when getting the information from the plan's store and when store are being edited.
     */
    setTeams(teams: IDeliveryTimelineTeamSettingsData): void;

    /**
     * What: Entry point to change the card field settings of a plan
     * Why: When updating the card field settings, we have this method invoked which will update the store.
     */
    setFields(fields: ICardSettings): void;


    /**
     * What: Entry point to change plan criteria
     * Why: When updating criteria settings, we have this method invoked which will update the store.
     */
    setCriteria(criteria: IDeliveryTimelineCriteriaData): void;

    /**
     * What: Entry point to change plan markers
     * Why: When updating markers settings, we have this method invoked which will update the store.
     */
    setMarkers(markers: IDeliveryTimelineMarkersData): void;
}

/**
 * See {IDeliveryTimelineConfigurationActionsCreator}
 */
export class DeliveryTimelineConfigurationActionsCreator implements IDeliveryTimelineConfigurationActionsCreator {

    /**
     * What: Actions to notify the store about configuration actions
     * Why: Configuration has its own Flux cycle, and needs to send to the store the data back to have the UI updated
     */
    private _configurationActions: DeliveryTimelineConfigurationActions;

    /**
     * What: Read access to the configuration's store 
     * Why: Need to avoid to pass the whole store in every request from the component to action creator
     */
    private _configurationStore: IDeliveryTimelineConfigurationStore;

    /**
     * What: The data provider for the views
     * Why: Need to be able to update a plan when save is invoked
     */
    private _viewsDataProvider: ViewsDataProvider;

    /**
     * What: Construct a configuration action creators by passing the actions.
     *
     * Why: We need to have the same instance of the action between the Store and Actions Creator to have the subscription model working
     * @param {DeliveryTimelineConfigurationActions} actions - Actions
     */
    constructor(actions: DeliveryTimelineConfigurationActions, store: IDeliveryTimelineConfigurationStore, viewsDataProvider: ViewsDataProvider) {
        this._configurationActions = actions;
        this._configurationStore = store;
        this._viewsDataProvider = viewsDataProvider;
    }

    /**
     * What: Initialize the configuration experience to use a specific plan passed by parameter
     * Why: Entry point that setup the configuration which will cause a refresh of the UI
     */
    public initializeStore(existingDeliveryTimelinePlan: IDeliveryTimelineStorePersistedData): void {
        // Not blocking the initial loading of csc for all tabs.
        const configurationData: IDeliveryTimelineConfigurationRootData = this._generateConfigurationFromExistingPlan(existingDeliveryTimelinePlan);
        this._configurationActions.initialize.invoke(configurationData);

        // Lazy load additional field data, fire separate event, the needed tab can choose to listen to this event.
        Q(this._beginGetFields()).done((fields: IFieldDefinition[]) => {
            const additionalData = {
                supportedFieldDefinitions: AdditionalFieldsConfigurationBusinessLogic.getSupportedFieldDefinitions(fields || [])
            };
            this._configurationActions.additionalDataChanged.invoke(additionalData);
        });
    }

    /**
     * What: Save the whole configuration
     * Why: Need to save to the backend  
     */
    public save(): void {
        const dataToSave = this._configurationStore.getValue();
        const dataToSaveConverted = WizardMappers.mapCongfigurationUpdateModelToViewUpdateModel(dataToSave);

        this._configurationActions.beingSave.invoke(null);

        Q(this._viewsDataProvider.updatePlan(dataToSaveConverted)).done(
            (view: IViewData) => {
                this._onSavePlanSuccess(view);
            },
            (error: TfsError) => {
                this._onSavePlanFail(dataToSaveConverted.planId, error);
            });
    }

    /**
     * Handle the success scenario to saving a plan to the server.
     */
    public _onSavePlanSuccess(view: IViewData) {
        const viewWithStatus = view;
        viewWithStatus.validationState = ValidationState.Success;
        this._configurationActions.endSave.invoke(viewWithStatus);
    }

    /**
     * Handle the fail scenario to saving a plan to the server.
     */
    public _onSavePlanFail(planId: string, error: TfsError) {
        const viewWithStatus = {
            id: planId,
            name: null,
            type: null,
            validationState: ValidationState.Error,
            message: ViewsErrorMapper.mapErrorToUserFriendlyMessage(error),
        } as IModelWithValidation;
        this._configurationActions.endSave.invoke(viewWithStatus);
    }

    /**
     * What: Set a new title to the plan and invoke the store with the result
     * Why: Modify the plan requires the ActionCreator to perform some validation to the user's input
     * 
     * @param {string} newTitle : user's input 
     */
    public setTitle(newTitle: string): void {
        const result: IDeliveryTimelineConfigurationDetail = this._generateTitleModelWithValidation(newTitle);
        this._configurationActions.titleChanged.invoke(result);
    }

    /**
     * What: Set a new description to the plan and invoke the store with the result
     * Why: Modify the plan requires the ActionCreator to perform some validation to the user's input
     * 
     * @param {string} newDescription : user's input 
     */
    public setDescription(newDescription: string): void {
        const result: IDeliveryTimelineConfigurationDetail = this._generateDescriptionModelWithValidation(newDescription);
        this._configurationActions.descriptionChanged.invoke(result);
    }

    /**
     * What: Entry point to change the card field settings of a plan
     * Why: When updating the card field settings, we have this method invoked which will update the store
     */
    public setFields(fields: ICardSettings): void {
        const result: IDeliveryTimelineConfigurationFields = this._generateFieldsModelWithValidation(fields);
        this._configurationActions.fieldsChanged.invoke(result);
    }

    /**
     * What: Entry point to change plan criteria
     * Why: When updating criteria settings, we have this method invoked which will update the store.
     */
    public setCriteria(criteria: IDeliveryTimelineCriteriaData): void {
        const result: IDeliveryTimelineConfigurationCriteria = this._generateCriteriaModelWithValidation(criteria);
        this._configurationActions.criteriaChanged.invoke(result);
    }

    /**
     * Update this plan's markers
     * @param markers - the updated marker info 
     */
    public setMarkers(markers: IDeliveryTimelineMarkersData): void {
        const result: IDeliveryTimelineConfigurationMarkers = this._generateCalendarMarkersWithValidation(markers);
        this._configurationActions.markersChanged.invoke(result);
    }

    /**
     * What: Determine if the values differ
     * Why: Need to know if the user applied a change which will allow to save (save button enabled)
     * 
     * @param {string} initialValue - starting value (baseline)
     * @param {string} newValue - the new value to be compared
     * @return {boolean} True if the value has changed; False if the value is the same
     */
    public _isValueDirty(initialValue: string, newValue: string): boolean {
        return initialValue !== newValue;
    }

    /**
     * Public for unit testing
     * What: Determine if the fields have changed.
     *       Here, we need to ensure that we treat undefined and false as the same while calculating if the fields are dirty.
     *       Thus, we use the !! operator to convert the existing values to boolean, before comparing.
     * Why: Need to know if the user applied a change which will allow to save (save button enabled)
     * 
     * @param {ICardFieldSettingsData} initialFields - Card field settings value at the time of loading the plan
     * @param {ICardFieldSettingsData} newFields - Current card field settings
     * @return {boolean} True if the fields have changed; False if the fields are the same
     */
    public _areFieldsDirty(initialFields: ICardSettings, newFields: ICardSettings): boolean {
        return !!newFields.showId !== !!initialFields.showId
            || !!newFields.showAssignedTo !== !!initialFields.showAssignedTo
            || newFields.assignedToRenderingOption !== initialFields.assignedToRenderingOption
            || !!newFields.showState !== !!initialFields.showState
            || !!newFields.showTags !== !!initialFields.showTags
            || !!newFields.showEmptyFields !== !!initialFields.showEmptyFields
            || (!!initialFields.additionalFields && !Utils_Array.arrayEquals(newFields.additionalFields, initialFields.additionalFields));
    }

    /**
     * What: Determine if the name of the plan is valid
     * Why: Need to indicate to the user possible problem with the title
     * 
     * @param {string} newTitle - Title altered by the user
     * @return {IModelWithValidation} - Information about the model like its validity as well as its error message
     */
    public _isTitleValid(newTitle: string): IModelWithValidation {
        return WizardBusinessLogic.validatePlanName(newTitle);
    }

    /**
     * What: Determine if the description of the plan is valid
     * Why: Need to indicate to the user possible problem with the description
     * 
     * @param {string} newDescription - description altered by the user
     * @return {IModelWithValidation} - Information about the model like its validity as well as its error message
     */
    public _isDescriptionValid(newDescription: string): IModelWithValidation {
        return WizardBusinessLogic.validatePlanDescription(newDescription);
    }

    /**
     * Public for unit testing
     * What: Determine if the fields of the plan are valid.
             Currently there is no validation. Once we add additional fields, perhaps we would need some validation
     * Why: Need to indicate to the user possible problem with the card fields
     * 
     * @param {ICardSettings} cardFields - Card field settings updated by the user
     * @return {IModelWithValidation} - Information about the model like its validity as well as its error message
     */
    public _areFieldsValid(cardFields: ICardSettings): IModelWithValidation {
        return AdditionalFieldsConfigurationBusinessLogic.validateAdditionalFields(cardFields.additionalFields);
    }

    /**
     * What: Build the initial structure of the store data
     * Why: Avoid having to handle undefined path. Remove the task to the store to know which branch of its model is defined or not. 
     * 
     * @param {IDeliveryTimeLineStorePersistedData} - The existing plan, cannot be null.
     * @return {IDeliveryTimelineConfigurationRootData} : The store's model with all the information from the store
     */
    public _generateConfigurationFromExistingPlan(existingPlan: IDeliveryTimelineStorePersistedData): IDeliveryTimelineConfigurationRootData {
        const cardSettings = this._cloneCardSettings(existingPlan.cardSettings);
        return {
            id: existingPlan.id,
            revision: existingPlan.revision,
            type: PlanType.DeliveryTimelineView,
            general: {
                title: this._buildDeliveryTimelineConfigurationDetail(existingPlan.name),
                description: this._buildDeliveryTimelineConfigurationDetail(existingPlan.description),
                teams: this._buildTeams(existingPlan.teams),
                criteria: this._buildCriteria(existingPlan.criteria),
                markers: this._buildMarkers(existingPlan.calendarMarkers)
            },
            editDisabled: !DeliveryTimelinePermissionUtil.hasPermission(existingPlan.userPermissions, PlanUserPermissions.Edit),
            cards: {
                fields: this._buildDeliveryTimelineConfigurationFields(cardSettings)
            },
            savingState: SavingState.NotSaved
        } as IDeliveryTimelineConfigurationRootData;
    }

    /**
     * What: businessLogic method for title.
     * Why: The business logic is so simple that it's integrated directly into the ActionsCreator.
     * 
     * @param {string} newTitle - New title to be saved in the repository
     * @return {IDeliveryTimelineConfigurationDetail} - Contains the text to display in the textbox as well as the isValid
     */
    public _generateTitleModelWithValidation(newTitle: string): IDeliveryTimelineConfigurationDetail {

        if (!this._configurationStore.getInitialValue()) {
            throw Error("Initialization must occur before invoking this method");
        }

        const initialValue = this._configurationStore.getInitialValue().general.title.value;
        const validationResult = this._isTitleValid(newTitle);
        const isDirty = this._isValueDirty(initialValue, newTitle);
        return this._buildDeliveryTimelineConfigurationDetail(
            newTitle,
            validationResult.validationState === ValidationState.Success,
            isDirty,
            validationResult.message,
            validationResult.validationState
        );
    }

    /**
     * What: businessLogic method for description.
     * Why: The business logic is so simple that it's integrated directly into the ActionsCreator.
     * 
     * @param {newDescription} newTitle - New description to be saved in the repository
     * @return {IDeliveryTimelineConfigurationDetail} - Contains the text to display in the textbox as well as the isValid
     */
    public _generateDescriptionModelWithValidation(newDescription: string): IDeliveryTimelineConfigurationDetail {

        if (!this._configurationStore.getInitialValue()) {
            throw Error("Initialization must occur before invoking this method");
        }

        const initialValue = this._configurationStore.getInitialValue().general.description.value;
        const validationResult = this._isDescriptionValid(newDescription);
        const isDirty = this._isValueDirty(initialValue, newDescription);
        return this._buildDeliveryTimelineConfigurationDetail(
            newDescription,
            validationResult.validationState === ValidationState.Success,
            isDirty,
            validationResult.message,
            validationResult.validationState
        );
    }

    /**
     * What: Build a configuration detail object with the provided value
     * Why: Helper function to create a IDeliveryTimelineConfigurationDetail
     */
    public _buildDeliveryTimelineConfigurationDetail(value: string, isValid: boolean = true, isDirty: boolean = false,
        errorMessage: string = null, validationState: ValidationState = null): IDeliveryTimelineConfigurationDetail {
        return {
            isValid: isValid,
            isDirty: isDirty,
            value: value,
            message: errorMessage,
            validationState: validationState
        } as IDeliveryTimelineConfigurationDetail;
    }

    /**
     * What: Set the teams configurations
     * Why: Modify the plan requires the ActionCreator to perform some validation to the user's input
     * 
     * @param {IDeliveryTimelineWizardData} - Current existing model's for the Wizard. We reuse the existing one
     */
    public setTeams(teamSettings: IDeliveryTimelineTeamSettingsData): void {
        const result: IDeliveryTimelineConfigurationTeams = this._generateTeamsModelWithValidation(teamSettings);
        this._configurationActions.teamsChanged.invoke(result);
    }

    /**
     * What: business logic for the teams
     * Why: The business logic is so simple that it's integrated directly into the ActionsCreator.
     * @param {IDeliveryTimelineWizardData} newTeams - New teams to be saved
     * @return {IDeliveryTimelineConfigurationTeams} - Contains the validation + the new values converted
     */
    public _generateTeamsModelWithValidation(newTeams: IDeliveryTimelineTeamSettingsData): IDeliveryTimelineConfigurationTeams {
        const isDirty = this._isTeamDirty(this._configurationStore.getInitialValue().general.teams.teamsSettings, newTeams.settings);
        const newTeamsConverted = {
            teamsSettings: WizardMappers.mapCollectionTeamSettingsToITeamSelectedSettingData(newTeams.settings),
            isDirty: isDirty,
            isValid: newTeams.validationState === ValidationState.Success
        } as IDeliveryTimelineConfigurationTeams;
        return newTeamsConverted;
    }

    /**
     * What: Build a team with default value
     * Why: When we initialize we load a valid teams which has not been touched yet. It's allow to to build the team without using the logic to figure
     *      out if the teams is dirty or is valid 
     */
    public _buildTeams(newTeams: ITeam[], isValid: boolean = true, isDirty: boolean = false): IDeliveryTimelineConfigurationTeams {
        const newTeamsConverted = {
            teamsSettings: WizardMappers.mapCollectionITeamToITeamSelectedSettingData(newTeams),
            isDirty: isDirty,
            isValid: isValid
        } as IDeliveryTimelineConfigurationTeams;
        return newTeamsConverted;
    }

    public _buildCriteria(criteria: FilterClause[], isValid: boolean = true, isDirty: boolean = false): IDeliveryTimelineConfigurationCriteria {
        const newCriteria = {
            criteriaSettings: WizardMappers.mapFilterClausesToICriteriaSelectedSettingData(criteria),
            isDirty: isDirty,
            isValid: isValid
        } as IDeliveryTimelineConfigurationCriteria;
        return newCriteria;
    }

    /**
     * Build the IDeliveryTimelineConfigurationMarkers data used in the configuration experience from the ICalendarMarkers data used in the plan view
     * @param markers - ICalendarMarkers[] to build from 
     * @param isValid 
     * @param isDirty 
     */
    private _buildMarkers(markers: ICalendarMarker[], isValid: boolean = true, isDirty: boolean = false): IDeliveryTimelineConfigurationMarkers {
        const newMarkers = {
            markers: WizardMappers.mapCalendarMarkersToMarkersSetting(markers),
            isDirty: isDirty,
            isValid: isValid,
        } as IDeliveryTimelineConfigurationMarkers;
        return newMarkers;
    }

    /**
     * What: Determine if the teams control has changed since the initial load
     * Why: We need to know if the user has changed the teams configuration to allow him/her to save the new values
     */
    public _isTeamDirty(initialTeams: ITeamSelectedSettingData[], currentTeams: ITeamSelectedSettingData[]): boolean {
        if (initialTeams && currentTeams) {
            let initialStringIds: string = "";
            let currentStringIds: string = "";
            initialTeams.map((value: ITeamSelectedSettingData) => { initialStringIds += value.project.id + value.team.id + value.backlogLevel.id; });
            currentTeams.map((value: ITeamSelectedSettingData) => { currentStringIds += value.project.id + value.team.id + value.backlogLevel.id; });
            return initialStringIds !== currentStringIds;
        }
        return true;
    }

    /**
     * Public for unit testing
     * What: businessLogic method for title.
     * Why: The business logic is so simple that it's integrated directly into the ActionsCreator.
     * 
     * @param {ICardSettings} cardFields - Updated card fields to be saved in the repository
     * @return {IDeliveryTimelineConfigurationFields} - Contains the text to display in the textbox as well as the isValid
     */
    public _generateFieldsModelWithValidation(cardFields: ICardSettings): IDeliveryTimelineConfigurationFields {

        if (!this._configurationStore.getInitialValue()) {
            throw Error("Initialization must occur before invoking this method");
        }

        const validationResult: IModelWithValidation = this._areFieldsValid(cardFields);
        const isDirty: boolean = this._areFieldsDirty(this._configurationStore.getInitialValue().cards.fields.fieldSettings, cardFields);

        return this._buildDeliveryTimelineConfigurationFields(
            cardFields,
            validationResult.validationState === ValidationState.Success,
            isDirty,
            validationResult.message,
            validationResult.validationState
        );
    }

    /**
     * Public for unit testing
     * What: clones the ICardSettings
     * Why: Configuration wizard should deal with a copy of the ICardSettings instead of directly using the cardSettings property of the Plan.
     * 
     * @param {ICardSettings} cardSettings - cardSettings property of the plan
     * @return {ICardSettings} - Clone of the passed settings
     */
    public _cloneCardSettings(cardSettings: ICardSettings): ICardSettings {
        return {
            showId: cardSettings.showId,
            showState: cardSettings.showState,
            showTags: cardSettings.showTags,
            showAssignedTo: cardSettings.showAssignedTo,
            assignedToRenderingOption: cardSettings.assignedToRenderingOption,
            showEmptyFields: cardSettings.showEmptyFields,
            additionalFields: $.isArray(cardSettings.additionalFields) ? cardSettings.additionalFields.slice(0) : []
        } as ICardSettings;
    }

    /**
     * What: Build a title with default value
     * Why: When we initialize we load a valid title which has not been touched yet. It's allow to to build the title without using the logic to figure
     *      out if the teams is dirty or is valid 
     */
    private _buildDeliveryTimelineConfigurationFields(cardSettings: ICardSettings, isValid: boolean = true, isDirty: boolean = false,
        errorMessage: string = null, validationState: ValidationState = null): IDeliveryTimelineConfigurationFields {
        return {
            isValid: isValid,
            isDirty: isDirty,
            message: errorMessage,
            validationState: validationState,
            fieldSettings: cardSettings
        } as IDeliveryTimelineConfigurationFields;
    }

    /**
     * Public for unit testing.
     */
    public _beginGetFields(): IPromise<IFieldDefinition[]> {
        return new ItemManager(null).beginGetFields();
    }



    /**
    * What: business logic for the criteria
    * Why: The business logic is so simple that it's integrated directly into the ActionsCreator.
    * @param {IDeliveryTimelineCriteriaData} data - New criteria to be saved
    * @return {IDeliveryTimelineConfigurationCriteria} - Contains the validation + the new values converted
    */
    public _generateCriteriaModelWithValidation(data: IDeliveryTimelineCriteriaData): IDeliveryTimelineConfigurationCriteria {
        const isDirty = this._isCriteriaDirty(this._configurationStore.getInitialValue().general.criteria.criteriaSettings, data.criteria);
        const newCriteria = WizardMappers.mapCollectionCriteriaSettingsToICriteriaSelectedSettingData(data.criteria);

        const criteriaConfiguration = {
            criteriaSettings: newCriteria,
            isDirty: isDirty,
            isValid: data.validationState === ValidationState.Success
        } as IDeliveryTimelineConfigurationCriteria;
        return criteriaConfiguration;
    }

    /**
     * Validate the updated data and generate the IDeliveryTimelineConfigurationMarkers
     * @param data - updated data to validate 
     */
    private _generateCalendarMarkersWithValidation(data: IDeliveryTimelineMarkersData): IDeliveryTimelineConfigurationMarkers {
        const isDirty = this._isMarkersDirty(this._configurationStore.getInitialValue().general.markers.markers, data.markers);

        return {
            markers: data.markers,
            isValid: data.validationState === ValidationState.Success,
            isDirty: isDirty,
            validationState: data.validationState
        } as IDeliveryTimelineConfigurationMarkers;
    }

    /**
     * What: Determine if the markers control has changed 
     * @param initialMarkers 
     * @param currentMarkers 
     */
    public _isMarkersDirty(initialMarkers: IMarkersSettingData[], currentMarkers: IMarkersSettingData[]): boolean {
        return !Utils_Array.arrayEquals(initialMarkers, currentMarkers, this._isSameMarker);
    }

    /**
     * What: Determine if the criteria control has changed since the initial load
     * Why: We need to know if the user has changed the criteria configuration to allow him/her to save the new values
     */
    public _isCriteriaDirty(initialCriteria: ICriteriaSelectedSettingData[], currentCriteria: ICriteriaSelectedSettingData[]): boolean {
        if (initialCriteria instanceof Array) {
            if (currentCriteria instanceof Array) {
                if (initialCriteria.length !== currentCriteria.length) {
                    return true;
                }

                for (let i = 0; i < initialCriteria.length; i++) {
                    if (!this._isSameCriteria(initialCriteria[i], currentCriteria[i])) {
                        return true;
                    }
                }

                return false;
            }
            else {
                return initialCriteria.length > 0;
            }
        }
        else {
            if (currentCriteria instanceof Array) {
                return currentCriteria.length > 0;
            }

            return false;
        }
    }

    private _isSameCriteria(source: ICriteriaSelectedSettingData, target: ICriteriaSelectedSettingData) {
        return source.field.id === target.field.id && source.operator.id === target.operator.id && source.value.id === target.value.id;
    }

    private _isSameMarker(source: IMarkersSettingData, target: IMarkersSettingData): boolean {
        return Utils_Date.equals(source.date.value, target.date.value) && source.color === target.color && source.label.value === target.label.value;
    }
}