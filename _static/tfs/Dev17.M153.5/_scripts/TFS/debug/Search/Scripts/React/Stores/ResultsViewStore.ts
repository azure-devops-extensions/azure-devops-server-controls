import * as VSSStore from  "VSS/Flux/Store";

export interface IResultsViewState {
    resultsViewMode: string;
}

export class ResultsViewStore extends VSSStore.Store {
    private state: IResultsViewState;

    constructor() {
        super()
        this.state = {
            resultsViewMode: "detailed"
        } as IResultsViewState;
    }

    public updateSearchResultsViewMode(mode: string) {
        if (this.state.resultsViewMode !== mode) {
            this.state.resultsViewMode = mode;
            this.emitChanged();
        }
    }

    public get viewMode(): string {
        return this
            .state
            .resultsViewMode;
    }
}