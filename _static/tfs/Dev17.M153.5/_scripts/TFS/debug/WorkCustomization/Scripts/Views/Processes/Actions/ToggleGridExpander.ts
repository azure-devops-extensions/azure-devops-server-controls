
import { Action } from "VSS/Flux/Action";

export interface IToggleGridExpanderPayload {
    templateTypeId: string;
}

export const toggleGridExpanderAction = new Action<IToggleGridExpanderPayload>();