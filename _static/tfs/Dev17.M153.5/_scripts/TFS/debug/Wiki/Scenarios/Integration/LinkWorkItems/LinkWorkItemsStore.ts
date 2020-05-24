import { autobind } from "OfficeFabric/Utilities";
import { Store } from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";

import { LinkWorkItemsActionsHub } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsActionsHub";

export interface LinkWorkItemsState {
    isDirty: boolean;
    workItemsUpdated: boolean;
    isSaving: boolean;
    errorMessage: string;
    savedWorkItems: number[];
    workItemsInDraft: number[];
}

export class LinkWorkItemsStore extends Store {
    public state: LinkWorkItemsState = {
        isDirty: false,
        isSaving: false,
        errorMessage: null,
        workItemsUpdated: false,
        savedWorkItems: [],
        workItemsInDraft: [],
    };

    constructor(private _actionsHub: LinkWorkItemsActionsHub) {
        super();

        this._actionsHub.workItemsFetched.addListener(this.onWorkItemsFetched);
        this._actionsHub.addWorkItemToDraft.addListener(this.addWorkItemToDraft);
        this._actionsHub.removeWorkItemFromDraft.addListener(this.removeWorkItemFromDraft);
        this._actionsHub.workItemsUpdated.addListener(this.workItemsUpdated);
        this._actionsHub.savingStarted.addListener(this.savingStarted);
        this._actionsHub.errorRaised.addListener(this.onErrorRaised);
    }

    @autobind
    public onWorkItemsFetched(workItemIds: number[]): void {
        let state = this.state;
        state.isDirty = false;
        state.errorMessage = null;
        state.savedWorkItems = [];
        state.workItemsInDraft = [];

        if (workItemIds) {
            this.state.workItemsInDraft = Utils_Array.clone(workItemIds);
            this.state.savedWorkItems = Utils_Array.clone(workItemIds);
        }

        this.emitChanged();
    }

    @autobind
    public addWorkItemToDraft(workItemId: number): void {
        let workItemsInDraft = this.state.workItemsInDraft;

        if (workItemsInDraft.indexOf(workItemId) === -1) {
            workItemsInDraft.push(workItemId);
            this.state.workItemsInDraft = Utils_Array.clone(workItemsInDraft);
            this.state.isDirty = this.isDirty();
            this.emitChanged();
        }
    }

    @autobind
    public removeWorkItemFromDraft(workItemId: number): void {
        let workItemsInDraft = this.state.workItemsInDraft;
        const index = workItemsInDraft.indexOf(workItemId);

        if (index !== -1) {
            workItemsInDraft.splice(index, 1);
            this.state.workItemsInDraft = Utils_Array.clone(workItemsInDraft);
            this.state.isDirty = this.isDirty();
            this.emitChanged();
        }
    }

    @autobind
    public workItemsUpdated(): void {
        this.state.workItemsUpdated = true;
        this.state.isSaving = false;
        this.state.errorMessage = null;

        this.emitChanged();
    }

    @autobind
    public savingStarted(): void {
        this.state.isSaving = true;

        this.emitChanged();
    }

    @autobind
    public onErrorRaised(errorMessage: string): void {
        this.state.isSaving = false;
        this.state.errorMessage = errorMessage;

        this.emitChanged();
    }

    public dispose(): void {
        this._actionsHub.workItemsFetched.removeListener(this.onWorkItemsFetched);
        this._actionsHub.addWorkItemToDraft.removeListener(this.addWorkItemToDraft);
        this._actionsHub.removeWorkItemFromDraft.removeListener(this.removeWorkItemFromDraft);
        this._actionsHub.workItemsUpdated.removeListener(this.workItemsUpdated);
        this._actionsHub.savingStarted.removeListener(this.savingStarted);
        this._actionsHub.errorRaised.removeListener(this.onErrorRaised);
    }

    private isDirty(): boolean {
        const state = this.state;
        const workItemsIntersectionList = Utils_Array.intersect(state.savedWorkItems, state.workItemsInDraft);

        if (workItemsIntersectionList.length === state.savedWorkItems.length &&
            workItemsIntersectionList.length === state.workItemsInDraft.length) {
            return false;
        }

        return true;
    }
}