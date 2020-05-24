import { Action } from "VSS/Flux/Action";
import { NameValuePair } from "DistributedTask/Scripts/Extensions/Common/NameValuePair";

export interface ICellItemPayload {
    index: number,
    value: string
}

export var initializeWebConfigParameters: Action<string> = new Action<string>();
export var updateWebAppType: Action<string> = new Action<string>();
export var updateVariableName: Action<ICellItemPayload> = new Action<ICellItemPayload>();
export var updateVariableValue: Action<ICellItemPayload> = new Action<ICellItemPayload>();

export class WebConfigParametersActionCreator {

    public initializeWebConfigParameters(taskInput: string) {
        initializeWebConfigParameters.invoke(taskInput);
    }

    public updateWebAppType(appType: string) {
        updateWebAppType.invoke(appType);
    }

    public updateVariableName(payload: ICellItemPayload) {
        updateVariableName.invoke(payload);
    }

    public updateVariableValue(payload: ICellItemPayload) {
        updateVariableValue.invoke(payload);
    }
}

export var ActionCreator = new WebConfigParametersActionCreator();