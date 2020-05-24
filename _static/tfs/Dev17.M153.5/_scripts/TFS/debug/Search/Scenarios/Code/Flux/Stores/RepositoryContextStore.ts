import * as VSSStore from "VSS/Flux/Store";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as Constants from "Search/Scenarios/Code/Constants";
import { ContextRetrievalFailedPayload, ContextRetrievedPayload, RepositoryContextRetrievalFailedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { SearchQuery, CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";

export enum ContextLoadState {
    Loading = 1,
    Success = 2,
    Failed = 3
}

export interface ContextStoreState {
    repositoryContext: _VCRepositoryContext.RepositoryContext;

    itemModel: _VCLegacyContracts.ItemModel;

    loadStatus: ContextLoadState;

    error?: any;
}

export interface RepositoryContextStoreState {
    repositoryContext: _VCRepositoryContext.RepositoryContext;
}

export interface IRepositoryContextSourceParams {
    project: string;

    repositoryName: string;
}

export class ContextStore extends VSSStore.Store {
    private _state: ContextStoreState = {} as ContextStoreState;

    public get state(): ContextStoreState {
        return this._state;
    }

    public getRepositoryContext(): _VCRepositoryContext.RepositoryContext {
        return this._state.repositoryContext;
    }

    public getItemModel(): _VCLegacyContracts.ItemModel {
        return this._state.itemModel;
    }

    public onContextUpdated = (payload: ContextRetrievedPayload): void => {
        this._state.itemModel = payload.serverItem;
        this._state.repositoryContext = payload.repositoryContext;
        this._state.loadStatus = ContextLoadState.Success;
        this._state.error = undefined;
        this.emitChanged();
    }

    public onContextUpdating = () => {
        this._state.loadStatus = ContextLoadState.Loading;
        this.emitChanged();
    }

    public onContextRetrievalLoadFailed = (payload: ContextRetrievalFailedPayload): void => {
        this._state.loadStatus = ContextLoadState.Failed;
        this._state.error = payload.error;
        this.emitChanged();
    }

    public onRepositoryContextRetrievalFailed = (payload: RepositoryContextRetrievalFailedPayload, selectedItem: CodeResult) => {
        const { project, repositoryName, error } = payload,
            { repository } = selectedItem;
        if (project.toLowerCase() === selectedItem.project.toLowerCase() &&
            repository.toLowerCase() === repositoryName.toLowerCase()) {
            this._state.loadStatus = ContextLoadState.Failed;
            this._state.error = error;
            this.emitChanged();
        }
    }
}

/**
* this store holds repository context when a single repository is selected in query
*/
export class RepositoryContextStore extends VSSStore.Store {
    private _state: RepositoryContextStoreState = {} as RepositoryContextStoreState;

    public get state(): RepositoryContextStoreState {
        return this._state;
    }

    public onRepositoryContextRetrieved = (
        repositoryContext: _VCRepositoryContext.RepositoryContext,
        repoProject: string,
        repoName: string,
        currentQuery: SearchQuery) => {
        const currentRepoParams = getRepositoryContextSourceParams(currentQuery);
        // Update repoContext only if the the returned repoContext is of the current selected project and repository.
        if (currentRepoParams.repositoryName &&
            currentRepoParams.project === repoProject &&
            currentRepoParams.repositoryName === repoName) {
            this._state.repositoryContext = repositoryContext;
            this.emitChanged();
        }
    }
}

export function getRepositoryContextSourceParams(query: SearchQuery): IRepositoryContextSourceParams {
    let repositoryPayload = {} as IRepositoryContextSourceParams;

    const selectedProjects = query.searchFilters[Constants.FilterKeys.ProjectFiltersKey];
    if (selectedProjects && selectedProjects.length == 1) {
        repositoryPayload.project = selectedProjects[0]
        const selectedRepositories = query.searchFilters[Constants.FilterKeys.RepositoryFiltersKey];
        if (selectedRepositories && selectedRepositories.length == 1) {
            repositoryPayload.repositoryName = selectedRepositories[0];
        }
    }

    return repositoryPayload;
}