import * as VSSStore from "VSS/Flux/Store";

export interface IBranchListState {
    branchList: string[]
}

export class BranchListDataStore extends VSSStore.Store {
    private state: IBranchListState;

    constructor() {
        super();
        this.state = this._getInitialState();
    }

    private _getInitialState(): IBranchListState {
        return {
            branchList: new Array<string>(),
            repositoryContext: null
        } as IBranchListState;
    }

    public branchListUpdated(branchList: string[]) {
        this.state.branchList = branchList;
        this.emitChanged();
    }
    
    public getListOfBranches(): string[] {
        return this.state.branchList;
    }
}