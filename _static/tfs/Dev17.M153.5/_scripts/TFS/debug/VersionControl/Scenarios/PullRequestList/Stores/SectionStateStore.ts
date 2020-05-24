import * as VSSStore from "VSS/Flux/Store";

export interface SectionState {
    isCollapsed: boolean;
}

export interface StoreState {
    sectionStates: IDictionaryStringTo<SectionState>;
    latestLoadMoreRequestSection: string;
}

export class SectionStateStore extends VSSStore.Store {
    public readonly state: StoreState = {
        sectionStates: {},
        latestLoadMoreRequestSection: null
    };

    public updateSectionState(key: string, state: SectionState) {
        this.state.sectionStates[key] = state;
        this.emitChanged();
    }

    public updateLatestLoadMoreSection(sectionKey: string) {
        this.state.latestLoadMoreRequestSection = sectionKey;
    }
}