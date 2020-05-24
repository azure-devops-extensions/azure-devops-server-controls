import * as StoreBase from "VSS/Flux/Store";
import {Action} from "VSS/Flux/Action";
import * as Service from "VSS/Service";

import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {GitHttpClient} from "VersionControl/Scripts/TFS.VersionControl.WebApi";

/**
 * Repo context store options.
 */
export interface IStoreOptions {
    repoContextChanged: Action<GitRepositoryContext>;
}

/**
 * Repository context 
 */
export class Store extends StoreBase.RemoteStore {
    private _gitRepoContext: GitRepositoryContext = null;
    private _repoContextChanged: Action<GitRepositoryContext> = null;

    //This git client may be unnecessary, review once AheadBehind is implemented
    private _gitHttpClient: GitHttpClient = null;
    private __testOverrideClient: GitHttpClient = null;

    constructor(options: IStoreOptions) {
        super();

        this._repoContextChanged = options.repoContextChanged;
        this._repoContextChanged.addListener(this._onRepoContextChanged, this);
    }

    public _onRepoContextChanged(newContext: GitRepositoryContext) {
        this._gitRepoContext = newContext;

        const tfsConnection = new Service.VssConnection(this._gitRepoContext.getTfsContext().contextData);
        this._gitHttpClient = tfsConnection.getHttpClient(GitHttpClient);

        this._loading = false;
        this.emitChanged();
    }

    dispose() {
        this._repoContextChanged.removeListener(this._onRepoContextChanged);
    }

    public getRepoContext(): GitRepositoryContext {
        return this._gitRepoContext;
    }

    public getGitHttpClient(): GitHttpClient {
        return this.__testOverrideClient || this._gitHttpClient;
    }

    /**
     * DO NOT USE IN PRODUCT CODE: exposed for unit testing.
     */
    public testOverrideHttpClient(httpClient: GitHttpClient) {
        this.__testOverrideClient = httpClient;
    }

}
