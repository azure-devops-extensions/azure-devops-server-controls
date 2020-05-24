import {Control} from "VSS/Controls";

export interface Selector {
    validate(): string;
    setEnabled(value: boolean): void;
    getSettings(): any;
    showElement(): void;
    hideElement(): void;
}

export abstract class SelectorControl extends Control<any> implements Selector {
    abstract validate(): string;
    abstract setEnabled(value: boolean): void;
    abstract getSettings(): any;
}