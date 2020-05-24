import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";


export interface IResourceFieldTypePayload {
    index: number;
    value: string;
}

export interface IResourceFieldNamePayload {
    index: number;
    value: string;
}

export class ResourcesActions extends ActionsHubBase {
    private _addResource: Action<IEmptyActionPayload>;
    private _deleteResource: Action<number>;
    private _updateResourceFieldType: Action<IResourceFieldTypePayload>;
    private _updateResourceFieldName: Action<IResourceFieldNamePayload>;

    public initialize(): void {
        this._addResource = new Action<IEmptyActionPayload>();
        this._deleteResource = new Action<number>();
        this._updateResourceFieldType = new Action<IResourceFieldTypePayload>();
        this._updateResourceFieldName = new Action<IResourceFieldNamePayload>();
    }

    public static getKey(): string {
        return "CI.ResourcesActions";
    }

    public get addResource(): Action<IEmptyActionPayload> {
        return this._addResource;
    }

    public get deleteResource(): Action<number> {
        return this._deleteResource;
    }

    public get updateResourceFieldType(): Action<IResourceFieldTypePayload> {
        return this._updateResourceFieldType;
    }

    public get updateResourceFieldName(): Action<IResourceFieldNamePayload> {
        return this._updateResourceFieldName;
    }
}
