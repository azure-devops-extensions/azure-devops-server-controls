import * as Types from "DistributedTask/Scripts/DT.Types";

import { IEmptyActionPayload, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";

export interface IPropertyKeyPayload {
    index: number;
    key: string;
}

export interface IPropertyValuePayload {
    index: number;
    value: string;
}

export interface IPropertiesPayload {
    properties: Types.ISecureFileProperty[];
}

export class SecureFilePropertyActions extends ActionsHubBase {
    public initialize(): void {
        this._setProperties = new Action<IPropertiesPayload>();
        this._updatePropertyKey = new Action<IPropertyKeyPayload>();
        this._updatePropertyValue = new Action<IPropertyValuePayload>();
        this._deleteProperty = new Action<IPropertyKeyPayload>();
        this._addProperty = new Action<IEmptyActionPayload>();
        this._toggleAuthorized = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return "ACTIONS_HUB_KEY_SECURE_FILE_PROPERTIES_SECTION";
    }

    public get setProperties(): Action<IPropertiesPayload> {
        return this._setProperties;
    }

    public get updatePropertyKey(): Action<IPropertyKeyPayload> {
        return this._updatePropertyKey;
    }

    public get updatePropertyValue(): Action<IPropertyValuePayload> {
        return this._updatePropertyValue;
    }

    public get deleteProperty(): Action<IPropertyKeyPayload> {
        return this._deleteProperty;
    }

    public get addProperty(): Action<IEmptyActionPayload> {
        return this._addProperty;
    }

    public get toggleAuthorized(): Action<IEmptyActionPayload> {
        return this._toggleAuthorized;
    }

    private _updatePropertyKey: Action<IPropertyKeyPayload>;
    private _updatePropertyValue: Action<IPropertyValuePayload>;
    private _deleteProperty: Action<IPropertyKeyPayload>;
    private _addProperty: Action<IEmptyActionPayload>;
    private _setProperties: Action<IPropertiesPayload>;
    private _toggleAuthorized: Action<IEmptyActionPayload>;
}