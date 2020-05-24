import * as VSSStore from "VSS/Flux/Store";
import { DiffLinesChangedPayload, CompareVersionPickedPayload } from "Search/Scenarios/Code/Flux/ActionsHub"

export interface CompareState {
    mversion: string;

    oversion: string;

    isDiffInline: boolean;

    diffLines: number[];

    currentDiffIndex: number;

    canGotoPreviousDiff: boolean;

    canGotoNextDiff: boolean;
}

export class CompareStore extends VSSStore.Store {
    private _state: CompareState = this.getInitialState();

    public get state(): CompareState {
        return this._state;
    }

    public updateCompareVersion = (payload: CompareVersionPickedPayload): void => {
        const { isOriginalSide, version} = payload;
        isOriginalSide ? this._state.oversion = version : this._state.mversion = version;
        this.emitChanged();
    }

    public updateDiffLines = (payload: DiffLinesChangedPayload): void => {
        this._state = {
            canGotoNextDiff: payload.diffLines && payload.diffLines.length > 1,
            canGotoPreviousDiff: false,
            currentDiffIndex: 0,
            diffLines: payload.diffLines,
            isDiffInline: this._state.isDiffInline,
            mversion: this._state.mversion,
            oversion: this._state.oversion
        } as CompareState;
        this.emitChanged();
    }

    public incrementActiveDiffIndex = (): void => {
        this._state.currentDiffIndex++;
        this._state.canGotoNextDiff = this._state.currentDiffIndex < this._state.diffLines.length - 1;
        this._state.canGotoPreviousDiff = true;
        this.emitChanged();
    }

    public decrementActiveDiffIndex = (): void => {
        this._state.currentDiffIndex--;
        this._state.canGotoPreviousDiff = this._state.currentDiffIndex === 0 ? false : true;
        this._state.canGotoNextDiff = true;
        this.emitChanged();
    }

    public updateDiffView = () => {
        this._state.isDiffInline = !this._state.isDiffInline;
        this.emitChanged();
    }

    public resetState = () => {
        this._state.diffLines = [];
        this._state.currentDiffIndex = 0;
        this._state.canGotoNextDiff = this._state.canGotoPreviousDiff = false;
        this._state.mversion = this._state.oversion = null;
        this.emitChanged();
    }

    private getInitialState(): CompareState {
        return {
            isDiffInline: false,
            diffLines: [],
            currentDiffIndex: 0,
            canGotoNextDiff: false,
            canGotoPreviousDiff: false,
            mversion: null,
            oversion: null,
        };
    }
}

