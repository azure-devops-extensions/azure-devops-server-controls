import { Action } from "VSS/Flux/Action";

export interface IDropdownRowIndexPayload {
    dropdownIndex: number;
    rowIndex: number;
}

export interface InputIndexPayload {
    input: string;
    index: number;
}