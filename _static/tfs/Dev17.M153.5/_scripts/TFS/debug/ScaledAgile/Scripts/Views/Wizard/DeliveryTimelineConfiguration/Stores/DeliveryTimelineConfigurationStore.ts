
import Store_Base = require("VSS/Flux/Store");

import {
    IDeliveryTimelineConfigurationAdditionalData,
    IDeliveryTimelineConfigurationCards,
    IDeliveryTimelineConfigurationDetail,
    IDeliveryTimelineConfigurationFields,
    IDeliveryTimelineConfigurationGeneral,
    IDeliveryTimelineConfigurationRootData,
    IDeliveryTimelineConfigurationStore,
    IDeliveryTimelineConfigurationTeams,
    IDeliveryTimelineConfigurationCriteria,
    IDeliveryTimelineConfigurationMarkers,
    SavingState,
} from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { IModelWithValidation, ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

import { DeliveryTimelineConfigurationActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineConfigurationActions";

/**
 * What: All emit events string 
 * Why: The Flux model work with string eventing we fire specific portion of the store that has changed
 */
export namespace DeliveryTimelineConfigurationStoreEvents {
    export const EMIT_TITLE = "EMIT_TITLE";
    export const EMIT_DESCRIPTION = "EMIT_DESCRIPTION";
    export const EMIT_TEAMS = "EMIT_TEAMS";
    export const EMIT_CRITERIA = "EMIT_CRITERIA";
    export const EMIT_MARKERS = "EMIT_MARKERS";
    export const EMIT_FIELDS = "EMIT_FIELDS";
    export const EMIT_PLAN_INITIALIZE_CONFIGURATION = "EMIT_PLAN_INITIALIZE_CONFIGURATION";
    export const EMIT_SAVE_BEGIN = "EMIT_SAVE_START";
    export const EMIT_SAVE_END = "EMIT_SAVE_END";
}

/**
 * What: This store is used during configuration of the DeliveryTimeLine plan. Every time a tabs inside the configuration change, the store get notified.
 *
 * Why: Separate the store from the View's store to have a smaller inner loop. Once the store has valid model, the data of this store
 *      will be passed to the View's action creator to be persisted. This is similar to the action Wizard store.
 */
export class DeliveryTimelineConfigurationStore extends Store_Base.Store implements IDeliveryTimelineConfigurationStore {
    /**
     * What: Store's value + store's state (saving or not)
     * Why: Need to set the value from the UI in a store and the state is to know what is going on with the server web api
     */
    private _value: IDeliveryTimelineConfigurationRootData;

    /**
     * What: Plan's data taken when the configuration experience started
     * Why: Used to compare if something has changed. Used to figure out if the data is dirty 
     */
    private _initialValue: IDeliveryTimelineConfigurationRootData;

    /**
     * What: Plan's additional data taken when the configuration experience started
     * Why: Used to help populate the settings experience. 
     */
    private _additionalData: IDeliveryTimelineConfigurationAdditionalData;

    /**
     * What: Actions that the action creator can invoke.
     * Why: The ActionsCreator and store are decoupled by a subscription model
     */
    private _actions: DeliveryTimelineConfigurationActions;

    /**
     * What: Create the configuration store.
     * Why: The configuration has its own store where we manipulate the data until ready to be SavedFailed
     * 
     * @param {DeliveryTimelineConfigurationActions} - Actions to invoke
     */
    constructor(actions: DeliveryTimelineConfigurationActions) {
        super();
        this._actions = actions;
        this._addActionListeners();
        this._value = this._getDefaultStoreValues();
    }

    /**
     * What: Method that generate an empty data for the store
     * Why: We want to avoid Null exception and still having the components to render
     */
    private _getDefaultStoreValues(): IDeliveryTimelineConfigurationRootData {
        return {
            general: {
                teams: {
                    teamsSettings: []
                } as IDeliveryTimelineConfigurationTeams,
                title: {} as IDeliveryTimelineConfigurationDetail,
                description: {} as IDeliveryTimelineConfigurationDetail,
                editDisabled: true,
                criteria: {
                    criteriaSettings: []
                } as IDeliveryTimelineConfigurationCriteria,
                markers: {
                    markers: []
                } as IDeliveryTimelineConfigurationMarkers
            } as IDeliveryTimelineConfigurationGeneral,
            cards: {
                fields: {} as IDeliveryTimelineConfigurationFields
            } as IDeliveryTimelineConfigurationCards,
            savingState: SavingState.NotSaved
        } as IDeliveryTimelineConfigurationRootData;
    }

    /**
     * What: Access values of store (read only)
     * Why: Allow actions creator to read value
     */
    public getValue(): IDeliveryTimelineConfigurationRootData {
        return this._value;
    }

    /**
     * What:  Access initial values of store (read only)
     * Why: Allow actions creator to read value from when the flux was initialized
     */
    public getInitialValue(): IDeliveryTimelineConfigurationRootData {
        return this._initialValue;
    }

    /**
     * What: Access additional data of store (read only)
     * Why: Allow actions creator to read value
     */
    public getAdditionalData(): IDeliveryTimelineConfigurationAdditionalData {
        return this._additionalData;
    }

    private _addActionListeners() {
        this._actions.initialize.addListener(this._initialize, this);
        this._actions.titleChanged.addListener(this._titleChanged, this);
        this._actions.descriptionChanged.addListener(this._descriptionChanged, this);
        this._actions.teamsChanged.addListener(this._teamsChanged, this);
        this._actions.criteriaChanged.addListener(this._criteriaChanged, this);
        this._actions.fieldsChanged.addListener(this._fieldsChanged, this);
        this._actions.additionalDataChanged.addListener(this._addtionalDataChanged, this);
        this._actions.markersChanged.addListener(this._markersChanged, this);
        this._actions.beingSave.addListener(this._beginSave, this);
        this._actions.endSave.addListener(this._endSave, this);
    }

    private _initialize(data: IDeliveryTimelineConfigurationRootData) {
        this._initialValue = $.extend({}, data) as IDeliveryTimelineConfigurationRootData; // Copy to compare later for dirty
        this._additionalData = data.additionalData;
        this._value.id = data.id;
        this._value.revision = data.revision;
        this._value.type = data.type;
        this._value.editDisabled = data.editDisabled;
        this._value.general.title.value = data.general.title.value; // Default value is the existing plan's name
        this._value.general.description.value = data.general.description.value;
        this._value.general.teams = data.general.teams;
        this._value.general.criteria = data.general.criteria;
        this._value.general.markers = data.general.markers;
        this._value.cards = $.extend({}, data.cards) as IDeliveryTimelineConfigurationCards; // Copy to compare later for dirty
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_PLAN_INITIALIZE_CONFIGURATION, this, this._value);
    }

    private _teamsChanged(data: IDeliveryTimelineConfigurationTeams) {
        this._value.general.teams = data;
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_TEAMS, this, this._value.general.teams);
    }

    private _criteriaChanged(data: IDeliveryTimelineConfigurationCriteria) {
        this._value.general.criteria = data;
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_CRITERIA, this, this._value.general.criteria);
    }

    private _markersChanged(data: IDeliveryTimelineConfigurationMarkers) {
        this._value.general.markers = data;
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_MARKERS, this, this._value.general.markers);
    }

    private _titleChanged(data: IDeliveryTimelineConfigurationDetail) {
        this._value.general.title = data; //To be improved
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_TITLE, this, this._value.general.title);
    }

    private _descriptionChanged(data: IDeliveryTimelineConfigurationDetail) {
        this._value.general.description = data; //To be improved
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_DESCRIPTION, this, this._value.general.description);
    }

    private _fieldsChanged(data: IDeliveryTimelineConfigurationFields) {
        this._value.cards.fields = data;
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_FIELDS, this, this._value.cards.fields);
    }

    private _addtionalDataChanged(data: IDeliveryTimelineConfigurationAdditionalData) {
        this._additionalData = data;
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_FIELDS, this, this._value.cards.fields);
    }

    public _beginSave(): void {
        this._value.savingState = SavingState.Saving;
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_SAVE_BEGIN, this);
    }

    public _endSave(modelWithValidation: IModelWithValidation): void {
        if (modelWithValidation.validationState === ValidationState.Success) {
            this._value.savingState = SavingState.SavedSuccess;
        }
        else {
            this._value.savingState = SavingState.SavedFailed;
        }
        this.emit(DeliveryTimelineConfigurationStoreEvents.EMIT_SAVE_END, this, modelWithValidation);
    }

    public addInitializeListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_PLAN_INITIALIZE_CONFIGURATION, handler);
    }

    public addTeamsChangedListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_TEAMS, handler);
    }

    public addCriteriaChangedListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_CRITERIA, handler);
    }

    public addTitleChangedListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_TITLE, handler);
    }

    public addDescriptionChangedListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_DESCRIPTION, handler);
    }

    public addBeginSaveListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_SAVE_BEGIN, handler);
    }

    public addEndSaveListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_SAVE_END, handler);
    }

    public addCardFieldsChangedListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_FIELDS, handler);
    }

    public addMarkersChangedListener(handler: IEventHandler): void {
        super.addListener(DeliveryTimelineConfigurationStoreEvents.EMIT_MARKERS, handler);
    }

    public removeChangedListener(handler: IEventHandler): void {
        super.removeChangedListener(handler);
    }

    public removeTitleChangedListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_TITLE, handler);
    }

    public removeDescriptionChangedListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_DESCRIPTION, handler);
    }

    public removeTeamsChangedListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_TEAMS, handler);
    }

    public removeCriteriaChangedListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_CRITERIA, handler);
    }

    public removeMarkersChangedListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_MARKERS, handler);
    }

    public removeInitializeListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_PLAN_INITIALIZE_CONFIGURATION, handler);
    }

    public removeBeginSaveListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_SAVE_BEGIN, handler);
    }

    public removeEndSaveListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_SAVE_END, handler);
    }

    public removeCardFieldsChangedListener(handler: IEventHandler): void {
        super.removeListener(DeliveryTimelineConfigurationStoreEvents.EMIT_FIELDS, handler);
    }
}
