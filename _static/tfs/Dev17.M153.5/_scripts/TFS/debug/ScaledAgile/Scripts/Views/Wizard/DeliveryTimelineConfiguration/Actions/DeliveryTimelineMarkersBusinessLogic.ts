import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Utils_String from "VSS/Utils/String";
import { IMarkersSettingData, IMarkerSettingValue } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";
import { IModelWithValidation, ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";


export interface IDeliveryTimelineMarkersBusinessLogic {
    /**
    * Validate marker settings on if it is valid and no duplication.
    * @param {IMarkersSettingData[]} settings - settings to be validate.
    * @return {IModelWithValidation} validation state.
    */
    validateSettings(settings: IMarkersSettingData[]): IModelWithValidation;

    /**
    * Validate and update label for a specified setting.
    * The input will not be modified. Return the clone of input with the updated setting.
    * @param {IMarkerSettingData[]} settings - existing settings.
    * @param {string} id - id of the setting to be validate and update.
    * @param {string} value - value to update.    
    * @return Clone of input with the updated setting.
    */
    validateAndUpdateLabel(settings: IMarkersSettingData[], id: string, value: string): IMarkersSettingData[];

    /**
    * Validate and update color for a specified setting.
    * The input will not be modified. Return the clone of input with the updated setting.
    * @param {IMarkerSettingData[]} settings - existing settings.
    * @param {string} id - id of the setting to be validate and update.
    * @param {string} value - value to update.
    * @return Clone of input with the updated setting.
    */
    validateAndUpdateColor(settings: IMarkersSettingData[], id: string, value: string): IMarkersSettingData[];

    /**
    * Validate and update date for a specified setting.
    * The input will not be modified. Return the clone of input with the updated setting.
    * @param {IMarkerSettingData[]} settings - existing settings.
    * @param {string} id - id of the setting to be validate and update.
    * @param {Date} value - value to update.
    * @return Clone of input with the updated setting.
    */
    validateAndUpdateDate(settings: IMarkersSettingData[], id: string, value: Date): IMarkersSettingData[];

    /**
     * Add a new marker
     * @param {IMarkersSettingData[] }settings - the existing marker settings 
     * @return Settings with default marker added 
     */
    addMarker(settings: IMarkersSettingData[]): IMarkersSettingData[];

    /**
     * Remove the specified marker 
     * @param {IMarkersSettingData[] } settings - the existing marker settings 
     * @param {id} id of marker to delete 
     */
    deleteMarker(settings: IMarkersSettingData[], id: string): IMarkersSettingData[];

}

export class DeliveryTimelineMarkersBusinessLogic implements IDeliveryTimelineMarkersBusinessLogic {

    public static DEFAULT_COLOR = "#cccccc";
    public static LABEL_CHAR_LIMIT = 50;

    public addMarker(settings: IMarkersSettingData[]): IMarkersSettingData[] {
        let cloneMarkers = this._cloneMarkersSettings(settings);
        let marker = this._getDefaultMarker();
        cloneMarkers.splice(0, 0, marker);
        return cloneMarkers;
    }

    public validateSettings(settings: IMarkersSettingData[]): IModelWithValidation {
        if (settings === null || settings.length === 0) {
            return { validationState: ValidationState.Success } as IModelWithValidation;
        }

        let validation = {
            validationState: ValidationState.Success,
            message: ""
        } as IModelWithValidation;

        settings.every(setting => {
            if (!setting.date || !setting.label) {
                throw new Error("Settings date and label must be defined.");
            }

            if (!setting.color || !setting.date.value || !setting.label.value) {
                validation = { validationState: ValidationState.Error };
                return false;
            }

            if (setting.label.validationState === ValidationState.Error || setting.date.validationState === ValidationState.Error) {
                validation = { validationState: ValidationState.Error };
                return false;
            }

            return true;
        });

        return validation;
    }

    public validateAndUpdateLabel(settings: IMarkersSettingData[], id: string, value: string): IMarkersSettingData[] {
        let index = this._getMarkerSettingIndex(settings, id);
        if (index === -1) {
            throw new Error("Marker setting not found");
        }

        let cloneMarkers = this._cloneMarkersSettings(settings);
        const validation = DeliveryTimelineMarkersBusinessLogic.validateLabel(value);
        cloneMarkers[index].label = {
            validationState: validation.validationState,
            message: validation.message,
            value: value
        };

        return cloneMarkers;
    }

    /**
     * Given a string value, determine if it is valid marker label 
     * @param value 
     */
    public static validateLabel(value: string): IModelWithValidation {
        if (!value || value.length === 0) {
            return {
                message: ScaledAgileResources.MarkersLabelEmptyError,
                validationState: ValidationState.Error
            };
        }
        else if (value.length > DeliveryTimelineMarkersBusinessLogic.LABEL_CHAR_LIMIT) {
            return {
                message: Utils_String.format(ScaledAgileResources.MarkersLabelLongError, DeliveryTimelineMarkersBusinessLogic.LABEL_CHAR_LIMIT),
                validationState: ValidationState.Error
            };
        }
        else {
            return {
                message: "",
                validationState: ValidationState.Success
            };
        }
    }

    public validateAndUpdateColor(settings: IMarkersSettingData[], id: string, value: string): IMarkersSettingData[] {
        let cloneMarkers = this._cloneMarkersSettings(settings);
        let index = this._getMarkerSettingIndex(settings, id);
        if (index >= 0) {
            cloneMarkers[index].color = value;
        }
        return cloneMarkers;
    }

    public validateAndUpdateDate(settings: IMarkersSettingData[], id: string, value: Date): IMarkersSettingData[] {
        let cloneMarkers = this._cloneMarkersSettings(settings);
        let index = this._getMarkerSettingIndex(settings, id);
        if (index >= 0) {
            const validation = DeliveryTimelineMarkersBusinessLogic.validateDate(value);
            cloneMarkers[index].date = {
                value: value,
                validationState: validation.validationState,
                message: validation.message
            } as IMarkerSettingValue<Date>;
        }
        return cloneMarkers;
    }

    public static validateDate(value: Date): IModelWithValidation {
        const dateIsValid = value !== null;
        return {
            validationState: dateIsValid ? ValidationState.Success : ValidationState.Error,
            message: dateIsValid ? "" : ScaledAgileResources.MarkersDateError,
        } as IModelWithValidation;
    }

    public deleteMarker(settings: IMarkersSettingData[], id: string): IMarkersSettingData[] {
        let cloneMarkers = this._cloneMarkersSettings(settings);
        let index = this._getMarkerSettingIndex(settings, id);
        if (index >= 0) {
            cloneMarkers.splice(index, 1);
        }
        return cloneMarkers;
    }

    private _getDefaultMarker() {
        let newDate = new Date();
        newDate.setHours(0, 0, 0);
        return {
            date: { value: newDate, validationState: ValidationState.Success },
            color: DeliveryTimelineMarkersBusinessLogic.DEFAULT_COLOR,
            label: { value: "", validationState: ValidationState.Success },
            id: TFS_Core_Utils.GUIDUtils.newGuid(),
        } as IMarkersSettingData;
    }

    /**
    * Return index of marker setting. Return -1 if not found.  Public for unit testing
    * @param {IMarkerSettingData[]} settings - markers settings
    * @param {string} id - id of the marker setting
    */
    public _getMarkerSettingIndex(settings: IMarkersSettingData[], id: string): number {
        for (let i = 0, l = settings.length; i < l; i++) {
            if (settings[i].id === id) {
                return i;
            }
        }
        return -1;
    }

    private _cloneMarkersSettings(settings: IMarkersSettingData[]): IMarkersSettingData[] {
        return settings.map(m => $.extend(true, {}, m));
    }
}
