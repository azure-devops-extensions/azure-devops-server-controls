import { IPropertiesPayload, IPropertyKeyPayload, IPropertyValuePayload, SecureFilePropertyActions } from "DistributedTask/Scripts/Actions/SecureFilePropertyActions";
import { LibraryStoreKeys } from "DistributedTask/Scripts/Constants";
import * as Types from "DistributedTask/Scripts/DT.Types";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";

import * as Utils_String from "VSS/Utils/String";

export const AuthorizePipelinesKey: string = "System.AutoAuthorize";

export interface ISecureFilePropertiesState extends Base.IState {
    properties: Types.ISecureFileProperty[];
}

export class SecureFilePropertiesStore extends StoreCommonBase.StoreBase {

    /**
     * @brief Constructor
     */
    constructor() {
        super();
        this._actionsHub = ActionsHubManager.GetActionsHub<SecureFilePropertyActions>(SecureFilePropertyActions);
    }

    /**
     * @brief returns the key for the store
     */
    public static getKey(): string {
        return LibraryStoreKeys.StoreKey_SecureFilePropertiesStore;
    }

    /**
    * @breif Initializes the store object
    */
    public initialize(): void {
        this._currentProperties = [];
        this._originalProperties = [];
        this._actionsHub.setProperties.addListener(this._setPropertiesListener);
        this._actionsHub.addProperty.addListener(this._addPropertyListener);
        this._actionsHub.deleteProperty.addListener(this._deletePropertyListener);
        this._actionsHub.updatePropertyKey.addListener(this._updatePropertyKey);
        this._actionsHub.updatePropertyValue.addListener(this._updatePropertyValue);
        this._actionsHub.toggleAuthorized.addListener(this._toggleAuthorized);
    }

    /**
     * @brief Cleanup of store footprint
     */
    protected disposeInternal(): void {
        this._actionsHub.setProperties.removeListener(this._setPropertiesListener);
        this._actionsHub.addProperty.removeListener(this._addPropertyListener);
        this._actionsHub.deleteProperty.removeListener(this._deletePropertyListener);
        this._actionsHub.updatePropertyKey.removeListener(this._updatePropertyKey);
        this._actionsHub.updatePropertyValue.removeListener(this._updatePropertyValue);
        this._actionsHub.toggleAuthorized.removeListener(this._toggleAuthorized);

        this._currentProperties = null;
        this._originalProperties = null;
    }

    public getCurrentProperties(): Types.ISecureFileProperty[] {
        return this._currentProperties;
    }

    public isAuthorized(): boolean {
        return this._isAuthorizedCurrent;
    }

    public getCurrentPropertiesWithAuth(): Types.ISecureFileProperty[] {
        if (this._isAuthorizedCurrent)
        {
            let currentProperties = this._currentProperties.slice();
            currentProperties.push({
                key: AuthorizePipelinesKey,
                value: "True"
            });
            return currentProperties;
        }
        return this._currentProperties;
    }

    public isPropertiesListDirty(): boolean {
        let originalProperties = this._originalProperties;
        let currentProperties = this._currentProperties;

        if (originalProperties.length !== currentProperties.length) {
            // number of properties differ, so list is dirty
            return true;
        }

        let isDirty: boolean = false;
        for (let i = 0, length = originalProperties.length; i < length; i++) {
            if ((originalProperties[i].key !== currentProperties[i].key) ||
                (originalProperties[i].value !== currentProperties[i].value)) {
                isDirty = true;
                break;
            }
        }

        return isDirty || this._isAuthorizedOriginal != this._isAuthorizedCurrent;
    }

    public isPropertiesListValid(): boolean {
        let currentProperties = this._currentProperties;

        let isValid: boolean = true;
        for (let i = 0, length = currentProperties.length; i < length; i++) {
            if ((currentProperties[i].key === Utils_String.empty) ||
                (currentProperties[i].value === Utils_String.empty)) {
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    private _setPropertiesListener = (actionPayload: IPropertiesPayload) => {
        this._originalProperties = actionPayload.properties.slice();
        if (!this._originalProperties) {
            this._originalProperties = [];
            this._isAuthorizedOriginal = false;
        } else {
            let index = this._originalProperties.findIndex((value) => Utils_String.equals(value.key, AuthorizePipelinesKey, true));
            if (index >= 0) {
                this._isAuthorizedOriginal = Utils_String.equals(this._originalProperties[index].value.trim(), "True", true) ? true : false;
                this._originalProperties.splice(index, 1);
            } else {
                this._isAuthorizedOriginal = false;
            }
        }

        this._currentProperties = this._originalProperties.slice();
        this._isAuthorizedCurrent = this._isAuthorizedOriginal;
        this.emitChanged();
    }

    private _addPropertyListener = (actionPayload: IEmptyActionPayload) => {
        this._currentProperties.push({
            key: Utils_String.empty,
            value: Utils_String.empty
        });
        this.emitChanged();
    }

    private _deletePropertyListener = (payload: IPropertyKeyPayload) => {
        this._currentProperties.splice(payload.index, 1);
        this.emitChanged();
    }

    private _updatePropertyKey = (payload: IPropertyKeyPayload) => {
        let currentVal = this._currentProperties[payload.index].value;

        this._currentProperties.splice(payload.index, 1, { key: payload.key, value: currentVal });
        this.emitChanged();
    }

    private _updatePropertyValue = (payload: IPropertyValuePayload) => {
        let currentKey = this._currentProperties[payload.index].key;
        
        this._currentProperties.splice(payload.index, 1, { key: currentKey, value: payload.value });
        this.emitChanged();
    }

    private _toggleAuthorized = (actionPayload: IEmptyActionPayload) => {
        this._isAuthorizedCurrent = !this._isAuthorizedCurrent;
        this.emitChanged();
    }

    private _originalProperties: Types.ISecureFileProperty[];
    private _currentProperties: Types.ISecureFileProperty[];
    private _actionsHub: SecureFilePropertyActions;

    private _isAuthorizedCurrent: boolean;
    private _isAuthorizedOriginal: boolean;
}