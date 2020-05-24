import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as OnDemandSmartTree from "VersionControl/Scenarios/Branches/Stores/OnDemandTreeStore";
import * as TreeAdaptor from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import * as CompareBranches from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import * as DefaultBranches from "VersionControl/Scenarios/Branches/Stores/DefaultBranchesStore";
import * as Branches from "VersionControl/Scenarios/Branches/Stores/BranchesStore";
import * as StaleBranches from "VersionControl/Scenarios/Branches/Stores/StaleBranchesStore";
import * as UserCreatedBranches from "VersionControl/Scenarios/Branches/Stores/UserCreatedBranchesStore";
import * as CommitMetaData from "VersionControl/Scenarios/Branches/Stores/CommitMetadataStore";
import * as PullRequest from "VersionControl/Scenarios/Branches/Stores/PullRequestStore";
import * as Filter from "VersionControl/Scenarios/Branches/Stores/FilterTextStore";
import * as Favorites from "VersionControl/Scenarios/Branches/Stores/FavoritesStore";
import * as TabSelection from "VersionControl/Scenarios/Branches/Stores/TabSelectionStore";
import * as RepoContext from "VersionControl/Scenarios/Branches/Stores/RepoContextStore";
import * as KeyValue from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import * as Message from "VersionControl/Scenarios/Branches/Stores/MessageStore";
import * as Stats from "VersionControl/Scenarios/Branches/Stores/StatsStore";
import * as Policies from "VersionControl/Scenarios/Branches/Stores/BranchPoliciesStore";
import * as Push from "VersionControl/Scenarios/Branches/Stores/PushStore";
import * as DeletedFilterState from "VersionControl/Scenarios/Branches/Stores/DeletedFilterStateStore";
import { Creators } from "VersionControl/Scenarios/Branches/Actions/Branch";
import { IMessage } from "VersionControl/Scenarios/Shared/MessageArea";
import { GitCommitRef, GitRef, GitRefFavorite, GitPullRequest, GitBranchStats, GitPush } from "TFS/VersionControl/Contracts";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { ValueStore } from "VersionControl/Scenarios/Branches/Stores/ValueStore";
import { RepositoryContextChange } from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { GitRefPolicyScope } from "VersionControl/Scenarios/Shared/Policy/GitRefPolicyScope";

export enum StoreIds {
    ALL_TREE,
    MY_TREE,
    FILTER_TREE,
    STALE_LIST,
    COMMIT_METADATA,
    DEFAULT_BRANCH,
    COMPARE_BRANCH,
    FAVORITES,
    TAB_SELECTION,
    PULL_REQUEST,
    REPO_CONTEXT,
    BRANCHES,
    MESSAGE,
    FILTER,
    STATS,
    USER_CREATED_BRANCHES,
    POLICIES,
    PUSH,
    DELETED_FILTER
}

/**
 * Does a name comparison on two refs.
 */
export function compareRefNames(x: GitRef, y: GitRef): boolean {
    return (localeIgnoreCaseComparer(x.name, y.name) == 0);
}

/**
 * This class will return singleton store instances for running, or multiple instances for testing
 */
export class BranchStoreFactory {

    private static _staticInstancesCreated: boolean = false;
    private static _map: { [key: number]: any; } = null;

    /**
     * Creates 1 instance of each store
     */
    public static createStaticInstances() {
        if (!this._staticInstancesCreated) {
            this._map = {};
            this._map[StoreIds.ALL_TREE] = new OnDemandSmartTree.OnDemandStore({
                adapter: new TreeAdaptor.AllBranchesTreeAdapter(),
                onFolderExpandedCallback: Creators.getAllFolderNodes
            });
            this._map[StoreIds.MY_TREE] = new SmartTree.TreeStore({ adapter: new TreeAdaptor.MyBranchesTreeAdapter() });
            this._map[StoreIds.FILTER_TREE] = new SmartTree.TreeStore({ adapter: new TreeAdaptor.FilterBranchesTreeAdapter() });
            this._map[StoreIds.COMMIT_METADATA] = new KeyValue.DictionaryStore<GitCommitRef>({
                adapters: [new CommitMetaData.CommitMetadataKeyValueAdapater],
                isEqual: CommitMetaData.isEqual,
                getKey: (ref: GitCommitRef) => GitRefUtility.getRefFriendlyName(ref.commitId)
            });
            this._map[StoreIds.STALE_LIST] = new StaleBranches.StaleBranchesStore;
            this._map[StoreIds.STATS] = new KeyValue.DictionaryStore<GitBranchStats>({
                adapters: [new Stats.StatsKeyValueAdapter],
                getKey: (stats: GitBranchStats) => stats.commit.commitId,
                isEqual: (a: GitBranchStats, b: GitBranchStats) => a.commit.commitId === b.commit.commitId
                    && a.aheadCount === b.aheadCount
                    && a.behindCount === b.behindCount
            });
            this._map[StoreIds.COMPARE_BRANCH] = new ValueStore<CompareBranches.CompareBranch>({
                adapters: [new CompareBranches.CompareBranchAdapater],
                isEqual: CompareBranches.isEqual
            });
            this._map[StoreIds.DEFAULT_BRANCH] = new DefaultBranches.DefaultBranchStore();
            this._map[StoreIds.FILTER] = new ValueStore<string>({
                adapters: [new Filter.FilterTextAdapter],
                isEqual: (x: string, y: string) => (localeIgnoreCaseComparer(x, y) == 0)
            });

            this._map[StoreIds.FAVORITES] = new KeyValue.DictionaryStore<GitRefFavorite>({
                adapters: [new Favorites.FavoritesKeyValueAdapater],
                isEqual: (x: GitRefFavorite, y: GitRefFavorite) => localeIgnoreCaseComparer(x.name, y.name) == 0,
                getKey: (ref: GitRefFavorite) => GitRefUtility.getRefFriendlyName(ref.name)
            });

            this._map[StoreIds.TAB_SELECTION] = new ValueStore<TabSelection.SelectionObject>({
                adapters: [new TabSelection.TabSelectionAdapater],
                isEqual: TabSelection.isEqual
            });

            this._map[StoreIds.MESSAGE] = new Message.MessageKeyValueStore<IMessage>({
                adapters: [new Message.MessageAdapater],
                isEqual: Message.isEqual,
                getKey: (ref: IMessage) => ref.key
            });

            this._map[StoreIds.PULL_REQUEST] = new KeyValue.DictionaryStore<GitPullRequest>({
                adapters: [new PullRequest.PullRequestKeyValueAdapater],
                isEqual: PullRequest.isEqual,
                getKey: (ref: GitPullRequest) => GitRefUtility.getRefFriendlyName(ref.sourceRefName)
            });

            this._map[StoreIds.REPO_CONTEXT] = new RepoContext.Store({
                repoContextChanged: RepositoryContextChange
            });

            this._map[StoreIds.BRANCHES] = new KeyValue.DictionaryStore<Branches.GitRefWithState>({
                adapters: [new Branches.BranchesKeyValueAdapater],
                isEqual: Branches.isEqual,
                getKey: (refStatus: Branches.GitRefWithState) => GitRefUtility.getRefFriendlyName(refStatus.gitRef.name)
            });

            this._map[StoreIds.USER_CREATED_BRANCHES] = new KeyValue.DictionaryStore<GitRef>({
                adapters: [new UserCreatedBranches.UserCreatedBranchesKeyValueAdapater],
                isEqual: compareRefNames,
                getKey: (ref: GitRef) => GitRefUtility.getRefFriendlyName(ref.name)
            });

            this._map[StoreIds.POLICIES] = new KeyValue.DictionaryStore<GitRefPolicyScope>({
                adapters: [new Policies.BranchPoliciesKeyValueAdapater],
                isEqual: (a: GitRefPolicyScope, b: GitRefPolicyScope) => a.refName === b.refName,
                getKey: (scope: GitRefPolicyScope) => GitRefUtility.getRefFriendlyName(scope.refName)
            });

            this._map[StoreIds.PUSH] = new KeyValue.DictionaryStore<GitPush>({
                adapters: [new Push.PushKeyValueAdapater],
                isEqual: (a: GitPush, b: GitPush) => a.refUpdates[0].name === b.refUpdates[0].name,
                getKey: (push: GitPush) => GitRefUtility.getRefFriendlyName(push.refUpdates[0].name)
            });

            this._map[StoreIds.DELETED_FILTER] = new ValueStore<boolean>({
                adapters: [new DeletedFilterState.DeletedFilterStateAdapter],
                isEqual: (a: boolean, b: boolean) => a === b
            });

            this._staticInstancesCreated = true;
        }
    }

    public static disposeStaticInstances() {
        if (this._staticInstancesCreated) {
            this._staticInstancesCreated = false;

            for (let key in this._map) {
                let value = this._map[key];
                if (value.dispose) {
                    value.dispose();
                }
                value = null;
            }
            this._map = null;
        }
    }

    /**
     * Retrieve a store
     * @param key
     */
    public static get<T>(key: StoreIds): T {
        return <T>this._map[key];
    }

    /**
     * This function should only be called from test libraries.  It force a new instance of the stores.
     */
    public static testCreateNewInstances() {
        this._staticInstancesCreated = false;
        this.createStaticInstances();
    }
}
