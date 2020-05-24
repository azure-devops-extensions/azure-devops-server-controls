import * as VSSStore from "VSS/Flux/Store";
import { CandidateUpsellsPayload } from "ProjectOverview/Scripts/ActionsHub";
import { UpsellTypes, ProjectOverviewData, RepositoryData } from "ProjectOverview/Scripts/Generated/Contracts";

export interface UpsellSectionState {
    dismissedUpsells: IDictionaryNumberTo<boolean>;
    candidateUpsells: UpsellTypes[];
    isLoading: boolean;
}

export class UpsellSectionStore extends VSSStore.Store {
    private _state: UpsellSectionState;

    constructor() {
        super();
        this._state = {
            isLoading: true,
            dismissedUpsells: {},
            candidateUpsells: [],
        }
    }

    public getState(): UpsellSectionState {
        return this._state;
    }

    public loadDismissedUpsells = (projectOverviewData: ProjectOverviewData): void => {
        this._state.dismissedUpsells = projectOverviewData.currentUser.dismissedUpsells;
        this._state.isLoading = false;
        this.emitChanged();
    }

    public stopIsLoading = (): void => {
        this._state.isLoading = false;
        this.emitChanged();
    }

    public saveDismissedUpsell = (upsellName: UpsellTypes): void => {
        const index = this._state.candidateUpsells.indexOf(upsellName);
        if (index > -1) {
            this._state.candidateUpsells.splice(index, 1);
        }
        this._state.dismissedUpsells[upsellName] = true;

        this.emitChanged();
    }

    public setCandidateUpsells = (upsellPayload: CandidateUpsellsPayload): void => {
        this._state.candidateUpsells = upsellPayload.candidateUpsells;
        this.emitChanged();
    }
}