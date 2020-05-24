import * as VSSStore from "VSS/Flux/Store";

export interface PageState {
    isValidationPending: boolean;
    isCreationPending: boolean;
}

export class PageStateStore extends VSSStore.Store {
    public state: PageState;

    constructor() {
        super();
        this._clearState();
    }

    public updateValidationStatus(isValidationPending: boolean) {
        this.state = {
            ...this.state,
            isValidationPending,
        };
        this.emitChanged();
    }

    public updateIsCreationPending(isCreationPending: boolean) {
        this.state = {
            ...this.state,
            isCreationPending,
        };
        this.emitChanged();
    }

    private _clearState() {
        this.state = {
            isCreationPending: false,
            isValidationPending: false,
        };
        this.emitChanged();
    }
}
