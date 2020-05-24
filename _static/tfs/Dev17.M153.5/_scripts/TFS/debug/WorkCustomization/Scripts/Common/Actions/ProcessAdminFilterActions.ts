import { Action } from "VSS/Flux/Action";

export interface IFilterUpdatePayload {
    filterValue: string;
}

export var updateFilterAction = new Action<IFilterUpdatePayload>();
