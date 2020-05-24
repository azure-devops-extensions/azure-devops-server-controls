import { Action } from "VSS/Flux/Action";

export interface IErrorActionPayload {
    errorMessage: string;
    errorBarId?: string;
    isDangerousHTML?: boolean;
}

export interface IMessageActionPayload {
    message: string;
    isDangerousHTML?: boolean;
}

export var showErrorAction = new Action<IErrorActionPayload>();
export var clearErrorAction = new Action<void>();

export var showMessageAction = new Action<IMessageActionPayload>();
export var clearMessageAction = new Action<void>();