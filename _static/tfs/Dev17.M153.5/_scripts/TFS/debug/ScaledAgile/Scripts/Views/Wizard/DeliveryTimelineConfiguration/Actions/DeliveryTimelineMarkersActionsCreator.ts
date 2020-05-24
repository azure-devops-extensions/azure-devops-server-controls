import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { DeliveryTimelineMarkersActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineMarkersActions";
import { IDeliveryTimelineMarkersData, IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";
import { DeliveryTimelineMarkersBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineMarkersBusinessLogic";


export interface IDeliveryTimelineMarkersActionCreator {
    /**
     * Initialize the delivery timeline markers experience     
     */
    initializeStore(initialSettings: IMarkersSettingData[]): void;

    /**
     * Add marker setting
     */
    addMarker(settings: IMarkersSettingData[]): void;

    /**
     * Change the date for the marker with a specific id  
     */
    changeDate(settings: IMarkersSettingData[], id: string, value: Date): void;

    /**
     * Change the marker color for the marker with a specific id  
     */
    changeColor(settings: IMarkersSettingData[], id: string, value: string): void;

    /**
     * Change the marker label for the marker with a specific id  
     */
    changeLabel(settings: IMarkersSettingData[], id: string, value: string): void;

    /**
     * Delete the specified marker 
     */
    deleteMarker(settings: IMarkersSettingData[], id: string): void;

}

export class DeliveryTimelineMarkersActionCreator implements IDeliveryTimelineMarkersActionCreator {
    private _pageActions: PageActions;
    private _actions: DeliveryTimelineMarkersActions;
    protected _logic: DeliveryTimelineMarkersBusinessLogic;

    constructor(actions: DeliveryTimelineMarkersActions, pageActions: PageActions) {
        this._actions = actions;
        this._pageActions = pageActions;
        this._logic = new DeliveryTimelineMarkersBusinessLogic();
    }

    /**
     * Initialize the delivery timeline markers experience     
     */
    public initializeStore(initialSettings: IMarkersSettingData[]): void {

        if (initialSettings !== null) {
            const isValid = this._logic.validateSettings(initialSettings);
            const markersSettings = { markers: initialSettings, validationState: isValid.validationState } as IDeliveryTimelineMarkersData;
            this._actions.initialize.invoke(markersSettings);
        }
        else {
            // invoke with empty data.
            const markersSettings: IDeliveryTimelineMarkersData = {
                markers: [],
                validationState: ValidationState.Success,
            };
            this._actions.initialize.invoke(markersSettings);
        }
    }

    public addMarker(settings: IMarkersSettingData[]) {
        const updatedSettings = this._logic.addMarker(settings);
        this._fireSettingChanged(updatedSettings);
    }

    public changeDate(settings: IMarkersSettingData[], id: string, value: Date) {
        const updatedSettings = this._logic.validateAndUpdateDate(settings, id, value);
        this._fireSettingChanged(updatedSettings);
    }

    public changeLabel(settings: IMarkersSettingData[], id: string, value: string) {
        const updatedSettings = this._logic.validateAndUpdateLabel(settings, id, value);
        this._fireSettingChanged(updatedSettings);
    }

    public changeColor(settings: IMarkersSettingData[], id: string, value: string) {
        const updatedSettings = this._logic.validateAndUpdateColor(settings, id, value);
        this._fireSettingChanged(updatedSettings);
    }

    public deleteMarker(settings: IMarkersSettingData[], id: string) {
        const updatedSettings = this._logic.deleteMarker(settings, id);
        this._fireSettingChanged(updatedSettings);
    }

    private _fireSettingChanged(settings: IMarkersSettingData[]) {
        const validation = this._logic.validateSettings(settings);
        this._actions.settingChanged.invoke({ markers: settings, validationResult: validation });
    }
}