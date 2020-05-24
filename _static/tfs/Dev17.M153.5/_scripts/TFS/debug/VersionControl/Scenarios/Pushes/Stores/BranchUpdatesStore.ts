import * as VSSStore from "VSS/Flux/Store";
import { GitPushRefExtended, BranchUpdatesLoadedPayload } from "VersionControl/Scenarios/Pushes/ActionsHub";

export interface BranchUpdatesState {
    refUpdates: GitPushRefExtended[];
    hasMoreUpdates: boolean;
    isLoading: boolean;
    error?: Error; 
    listenToAutoscroll?: boolean;
}

export class BranchUpdatesStore extends VSSStore.RemoteStore {
    private _state: BranchUpdatesState;

    constructor() {
        super();
        this._state = {
            refUpdates: [],
            hasMoreUpdates: false,
            isLoading: false,
            listenToAutoscroll: false,
        }
    }

    public getState = (): BranchUpdatesState => {
        return this._state;
    }

    public get refUpdates(): GitPushRefExtended[] {
        return this._state.refUpdates;
    }

    public get hasMoreUpdates(): boolean {
        return this._state.hasMoreUpdates;
    }

    public appendUpdatesList = (payload: BranchUpdatesLoadedPayload): void => {
        this._state.error = null;
        this._state.isLoading = false;

        this._state.hasMoreUpdates = payload.hasMoreUpdates;
        this._state.listenToAutoscroll = payload.hasMoreUpdates;
        if (payload.pushes) {
            this._state.refUpdates = this.refUpdates.concat(payload.pushes);
        }

        this.emitChanged();
    }

    public clearAndStartLoading = (): void => {
        this._setDefaultState();
        this._state.isLoading = true;

        this.emitChanged();
    }

    public clear = (): void => {
        this._setDefaultState();

        this.emitChanged();
    }

    public clearAllErrors = (): void => {
        this._state.error = null;

        this.emitChanged();
    }

    public failLoad = (error: Error): void => {
        this._state.error = error;
        this._state.isLoading = false;

        this.emitChanged();
    }

    public onMoreBranchLoadStarted = (): void => {
        this._state.isLoading = true;
        this._state.listenToAutoscroll = false;

        this.emitChanged();
    }

    public populateUpdatesList = (payload: BranchUpdatesLoadedPayload): void => {
        this._state.error = null;
        this._state.isLoading = false;
        this._state.refUpdates = payload.pushes;
        this._state.hasMoreUpdates = payload.hasMoreUpdates;
        this._state.listenToAutoscroll = payload.hasMoreUpdates;
        this.emitChanged();
    }

    public dispose = (): void => {
        this._state.refUpdates = null;
    }

    public isLoading(): boolean {
        return this._state.isLoading;
    }

    public hasError(): boolean {
        return !!this._state.error;
    }

    public getError(): Error {
        return this._state.error;
    }

    private _setDefaultState = (): void => {
        this._state.error = null;
        this._state.isLoading = false;
        this._state.refUpdates = null;
        this._state.hasMoreUpdates = false;
        this._state.listenToAutoscroll = false;
    }
}
