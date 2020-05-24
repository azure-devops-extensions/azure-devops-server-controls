import { RemoteStore } from "VSS/Flux/Store";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

// actions
import {IContextUpdatedPayload} from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

/**
 * Basic context information related to the page.
 */
export class ContextStore extends RemoteStore {
    private _tfsContext: TfsContext;
    private _repositoryContext: RepositoryContext;
    private _projectId: string;

    constructor() {
        super();

        this._tfsContext = null;
        this._repositoryContext = null;
    }

    public getRepositoryContext(): RepositoryContext {
        return this._repositoryContext;
    }

    public getTfsContext(): TfsContext {
        return this._tfsContext;
    }

    public getProjectId(): string {
        return this._projectId;
    }

    public onContextUpdated = (payload: IContextUpdatedPayload) => {
        this._tfsContext = payload.tfsContext;
        this._repositoryContext = payload.repositoryContext;
        this._projectId = payload.tfsContext && payload.tfsContext.navigation ? payload.tfsContext.navigation.projectId : null;

        this._loading = false;

        this.emitChanged();
    }
}
