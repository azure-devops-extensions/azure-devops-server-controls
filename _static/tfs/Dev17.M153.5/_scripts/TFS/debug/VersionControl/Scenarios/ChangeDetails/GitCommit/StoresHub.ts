import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { TagsStore } from "VersionControl/Scenarios/ChangeDetails/GitCommit/TagsStore";
import { BranchStatsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/BranchStatsStore";
import { CommitStakeholdersStore } from "VersionControl/Scenarios/ChangeDetails/Stores/CommitStakeholdersStore";
import { GitCommitParentDetailStore } from "VersionControl/Scenarios/ChangeDetails/Stores/GitCommitParentDetailStore";
import { PullRequestStatsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/PullRequestStatsStore";
import { GitChangeListStore } from "VersionControl/Scenarios/ChangeDetails/GitCommit/GitChangeListStore";
import { BuildStatusStore } from "VersionControl/Scenarios/ChangeDetails/Stores/BuildStatusStore";
import { GitCommitPermissionsStore } from "VersionControl/Scenarios/ChangeDetails/GitCommit/GitCommitPermissionsStore";
import {
    StoresHub as StoresHubBase,
    Stores as StoresBase
} from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";

export interface Stores extends StoresBase {
    buildStatusStore?: BuildStatusStore;
    branchStatsStore?: BranchStatsStore;
    commitStakeholdersStore?: CommitStakeholdersStore;
    gitCommitParentDetailStore?: GitCommitParentDetailStore;
    pullRequestStatsStore?: PullRequestStatsStore;
    tagsStore?: TagsStore;
}

/**
 * A container class to get together the stores of commit details page, so they can be accessed easily.
 */
export class StoresHub extends StoresHubBase {
    protected stores: Stores;

    constructor(
        actionsHub: ActionsHub,
        stores: Stores = {},
    ) {
        super(actionsHub, stores);
        this.stores.changeListStore = new GitChangeListStore(actionsHub);
        this.stores.buildStatusStore = stores.buildStatusStore || new BuildStatusStore(actionsHub);
        this.stores.branchStatsStore = stores.branchStatsStore || new BranchStatsStore(actionsHub);
        this.stores.commitStakeholdersStore = stores.commitStakeholdersStore || new CommitStakeholdersStore(actionsHub);
        this.stores.gitCommitParentDetailStore = stores.gitCommitParentDetailStore || new GitCommitParentDetailStore(actionsHub);
        this.stores.pullRequestStatsStore = stores.pullRequestStatsStore || new PullRequestStatsStore(actionsHub);
        this.stores.tagsStore = stores.tagsStore || new TagsStore(actionsHub);
        this.stores.permissionsStore = stores.permissionsStore || new GitCommitPermissionsStore(actionsHub);
    }

    public get branchStatsStore(): BranchStatsStore {
        return this.stores && this.stores.branchStatsStore;
    }

    public get changeListStore(): GitChangeListStore {
        return this.stores && this.stores.changeListStore as GitChangeListStore;
    }

    public get commitStakeholdersStore(): CommitStakeholdersStore {
        return this.stores && this.stores.commitStakeholdersStore;
    }

    public get gitCommitParentDetailStore(): GitCommitParentDetailStore {
        return this.stores && this.stores.gitCommitParentDetailStore;
    }

    public get pullRequestStatsStore(): PullRequestStatsStore {
        return this.stores && this.stores.pullRequestStatsStore;
    }

    public get buildStatusStore(): BuildStatusStore {
        return this.stores && this.stores.buildStatusStore;
    }

    public get tagsStore(): TagsStore {
        return this.stores && this.stores.tagsStore;
    }


    public dispose(): void {
        if (this._actionsHub) {
            const {
                branchStatsStore,
                commitStakeholdersStore,
                gitCommitParentDetailStore,
                pullRequestStatsStore,
                buildStatusStore,
                tagsStore,
                permissionsStore,
            } = this.stores;

            if (branchStatsStore) {
                branchStatsStore.dispose();
            }

            if (commitStakeholdersStore) {
                commitStakeholdersStore.dispose();
            }

            if (gitCommitParentDetailStore) {
                gitCommitParentDetailStore.dispose();
            }

            if (pullRequestStatsStore) {
                pullRequestStatsStore.dispose();
            }

            if (buildStatusStore) {
                buildStatusStore.dispose();
            }

            if (tagsStore) {
                tagsStore.dispose();
            } 

            if (permissionsStore) {
                (permissionsStore as GitCommitPermissionsStore).dispose();
            } 
            super.dispose();
        }
    }
}
