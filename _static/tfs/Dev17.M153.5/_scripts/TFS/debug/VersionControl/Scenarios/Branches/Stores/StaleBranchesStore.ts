import * as BranchesActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { RecreateBranchUpdate } from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRef, GitRefUpdate} from "TFS/VersionControl/Contracts";
import * as StoreBase from "VSS/Flux/Store";

export interface StaleBranchesUpdate {
    refs: GitRef[];
    hasMore: boolean;
}

export class StaleBranchesStore extends StoreBase.Store {
    private _branches: string[] = [];
    private _loadedPage: number = null;
    private _hasMore: boolean = false;
    private _loading: boolean = false;
    private _loaded: boolean = false;

    constructor() {
        super();
        BranchesActions.InitializeStaleBranches.addListener(this._onBranchesAdded);
        BranchesActions.StaleBranchesLoading.addListener(this._onBranchesLoading);
    }

    private _onBranchesHasMore = (hasMore: boolean) => {
        if (this._hasMore !== hasMore) {
            this._hasMore = hasMore;
            this.emitChanged();
        }
    }

    private _onBranchesLoading = (loading: boolean) => {
        if (this._loading !== loading) {
            this._loading = loading;
            this.emitChanged();
        }
    }

    private _onBranchesAdded = (update: StaleBranchesUpdate) => {
        this._branches = update.refs.map(ref => ref.name).map(GitRefUtility.getRefFriendlyName);
        this._hasMore = update.hasMore;
        this._loadedPage = this._loadedPage !== null ? this._loadedPage + 1 : 0;
        this._loading = false;

        // This flag means we've loaded data at least once.
        // If it's true and there are no branches we should display the no stale branches message to the user
        this._loaded = true;

        this.emitChanged();
    }

    private _onBranchesRemoved = (ref: GitRefUpdate) => {
        let friendlyName = GitRefUtility.getRefFriendlyName(ref.name);
        this._branches = this._branches.filter(x => x !== friendlyName);
        this.emitChanged();
    }

    public get(): string[] {
        return this._branches;
    }

    public getLoadedPage(): number {
        return this._loadedPage;
    }

    public isLoading(): boolean {
        return this._loading;
    }

    public isLoaded(): boolean {
        return this._loaded;
    }

    public hasMore(): boolean {
        return this._hasMore;
    }

    public dispose(): void {
        BranchesActions.InitializeStaleBranches.removeListener(this._onBranchesAdded);
        BranchesActions.StaleBranchesLoading.removeListener(this._onBranchesLoading);
    }
}
