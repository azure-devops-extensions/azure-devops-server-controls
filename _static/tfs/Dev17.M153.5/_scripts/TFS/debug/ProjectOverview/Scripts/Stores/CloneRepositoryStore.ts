import * as VSSStore from "VSS/Flux/Store";
import { ProjectOverviewData } from "ProjectOverview/Scripts/Generated/Contracts";

export interface CloneRepositoryState {
    isLoading: boolean;
    sshEnabled: boolean;
    cloneUrl: string;
    sshUrl: string;
}

export class CloneRepositoryStore extends VSSStore.Store {
    private _state: CloneRepositoryState;

    constructor() {
        super();
        
        this._state = {
            isLoading: true,
            sshEnabled: false,
            cloneUrl: null,
            sshUrl: null,
        };
    }

    public getState(): CloneRepositoryState {
        return this._state;
    }

    public loadCloneRepositoryInfo = (projectInfo: ProjectOverviewData): void => {
        if (projectInfo.currentRepositoryData && projectInfo.currentRepositoryData.gitRepositoryData) {
            const repositoryData = projectInfo.currentRepositoryData.gitRepositoryData;
            this._state.sshEnabled = repositoryData.sshEnabled;
            this._state.cloneUrl = repositoryData.cloneUrl;
            this._state.sshUrl = repositoryData.sshUrl;
        }

        this._state.isLoading = false;
        this.emitChanged();
    }

    public stopIsLoading = (): void => {
        this._state.isLoading = false;
        this.emitChanged();
    }
}
