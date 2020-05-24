import * as VSSStore from "VSS/Flux/Store";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export interface IRepositoryContextState {
    repositoryContext: GitRepositoryContext
}

export class RepositoryContextStore extends VSSStore.Store {
    private state: IRepositoryContextState;

    constructor() {
        super();
        this.state = this._getInitialState();
    }

    private _getInitialState(): IRepositoryContextState {
        return {            
            repositoryContext: null
        } as IRepositoryContextState;
    }

    public repositoryContextUpdated(repositoryContext: GitRepositoryContext) {
        this.state.repositoryContext = repositoryContext;
        this.emitChanged();
    }

    public getRepositoryContext(): GitRepositoryContext {
        return this.state.repositoryContext;
    }
}