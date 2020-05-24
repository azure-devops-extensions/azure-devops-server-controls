import { autobind } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { BranchActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/BranchActionCreator";
import { BuildStatusActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/BuildStatusActionCreator";
import { PullRequestActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/PullRequestActionCreator";
import { GitDiscussionManagerActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/GitDiscussionManagerActionCreator";
import { TagsActionCreator } from  "VersionControl/Scenarios/ChangeDetails/GitCommit/TagsActionCreator";

import {
    ActionCreator as ActionCreatorBase,
    ActionCreators as ActionCreatorsBase,
} from "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";
import { ChangeListViewSource } from "VersionControl/Scenarios/ChangeDetails/Sources/ChangeListViewSource";
import { GitChangeListActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/GitChangeListActionCreator";
import { GitPermissionsActionCreator } from  "VersionControl/Scenarios/ChangeDetails/GitCommit/GitPermissionsActionCreator";
import { GitPushActionCreator } from  "VersionControl/Scenarios/ChangeDetails/GitCommit/GitPushActionCreator";

export interface ActionCreators extends ActionCreatorsBase {
    branchActionCreator?: BranchActionCreator;
    pullRequestActionCreator?: PullRequestActionCreator;
    discussionManagerActionCreator?: GitDiscussionManagerActionCreator;
    gitChangeListActionCreator?: GitChangeListActionCreator;
    buildStatusActionCreator?: BuildStatusActionCreator;
    tagsActionCreator?: TagsActionCreator;
    gitPushActionCreator?: GitPushActionCreator;
    gitPermissionsActionCreator?: GitPermissionsActionCreator;
}

/**
 * The entry point to trigger actions in the commit details page.
 */
export class ActionCreator extends ActionCreatorBase {
    protected _actionCreators: ActionCreators = {};
    private _gitCommitActionCreator: GitChangeListActionCreator;

    constructor(
        protected _actionsHub: ActionsHub,
        protected _storesHub: StoresHub,
        tfsContext: TfsContext,
        repositoryContext: RepositoryContext,
        changeListViewSource: ChangeListViewSource,
    ) {
        super(_actionsHub, _storesHub, tfsContext, repositoryContext, changeListViewSource);
    }

    /**
     * Returns the ChangeListActionCreator object
     */
    public get changeListActionCreator(): GitChangeListActionCreator {
        if (!this._actionCreators.gitChangeListActionCreator) {
            this._actionCreators.gitChangeListActionCreator = new GitChangeListActionCreator(this._actionsHub, this._storesHub, this._repositoryContext);
        }
        return this._actionCreators.gitChangeListActionCreator;
    }

    /**
     * Returns the BranchActionCreator object
     */
    public get branchActionCreator(): BranchActionCreator {
        if (!this._actionCreators.branchActionCreator) {
            this._actionCreators.branchActionCreator = new BranchActionCreator(this._actionsHub, this._repositoryContext);
        }
        return this._actionCreators.branchActionCreator;
    }

    /**
     * Returns the PullRequestActionCreator object
     */
    public get pullRequestActionCreator(): PullRequestActionCreator {
        if (!this._actionCreators.pullRequestActionCreator) {
            this._actionCreators.pullRequestActionCreator = new PullRequestActionCreator(this._actionsHub, this._repositoryContext);
        }
        return this._actionCreators.pullRequestActionCreator;
    }

    public get discussionManagerActionCreator(): GitDiscussionManagerActionCreator {
        if (!this._actionCreators.discussionManagerActionCreator) {
            this._actionCreators.discussionManagerActionCreator = new GitDiscussionManagerActionCreator(this._actionsHub, this._storesHub, this._tfsContext, this._repositoryContext);
        }
        return this._actionCreators.discussionManagerActionCreator;
    }

    /**
     * Returns the BuildStatusActionCreator object
     */
    public get buildStatusActionCreator(): BuildStatusActionCreator {
        if (!this._actionCreators.buildStatusActionCreator) {
            this._actionCreators.buildStatusActionCreator = new BuildStatusActionCreator(this._actionsHub, this._repositoryContext);
        }

        return this._actionCreators.buildStatusActionCreator;
    }

    /**
     * Returns the tagsActionCreator object
     */
    public get tagsActionCreator(): TagsActionCreator {
        if (!this._actionCreators.tagsActionCreator) {
            this._actionCreators.tagsActionCreator = new TagsActionCreator(this._actionsHub, this._repositoryContext as GitRepositoryContext);
        }
        return this._actionCreators.tagsActionCreator;
    }

    /**
     * Returns the gitPushActionCreator object
     */
    public get gitPushActionCreator(): GitPushActionCreator {
        if (!this._actionCreators.gitPushActionCreator) {
            this._actionCreators.gitPushActionCreator = new GitPushActionCreator(
                this._actionsHub,
                this._repositoryContext as GitRepositoryContext);
        }

        return this._actionCreators.gitPushActionCreator;
    }

    /**
     * Returns the gitPermissionsActionCreator object
     */
    public get gitPermissionsActionCreator(): GitPermissionsActionCreator {
        if (!this._actionCreators.gitPermissionsActionCreator) {
            this._actionCreators.gitPermissionsActionCreator = new GitPermissionsActionCreator(
                this._actionsHub,
                this._repositoryContext as GitRepositoryContext);
        }

        return this._actionCreators.gitPermissionsActionCreator;
    }

    @autobind
    public onStakeHolderFlyoutOpen(): void {
        this.gitPushActionCreator.loadPushByCommit(this._storesHub.changeListStore.originalChangeList as GitCommit);
    }
}
