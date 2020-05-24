import { Artifact } from "VSS/Artifacts/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import { DiscussionThreadsUpdateEvent } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionManager, DiscussionViewOptions } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";
import { CommitArtifact } from "VersionControl/Scripts/CommitArtifact";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CodeReviewDiscussionManager } from "VersionControl/Scripts/TFS.VersionControl.DiscussionManager";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { DiscussionManagerActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/DiscussionManagerActionCreator";

/**
 * Action Creator for Discussion Manager 
 */
export class GitDiscussionManagerActionCreator extends DiscussionManagerActionCreator {

    constructor(
        protected _actionsHub: ActionsHub,
        protected _storesHub: StoresHub,
        _tfsContext: TfsContext,
        _repositoryContext: RepositoryContext) {
        super(_actionsHub, _storesHub, _tfsContext, _repositoryContext);
    }

    /**
     * Override to hide discussion in case of git merge commmit
     */
    protected _shouldHideDiscussion(changeList: VCLegacyContracts.ChangeList, previousVersionSpec: string): boolean {
        // Do not allow discussions on the diff of a git merge commit with one of its parents.
        if (this._storesHub.changeListStore.isGitMergeCommit && this._storesHub.urlParametersStore.gitParentDiffIndex > 0) {
            return true;
        }

        return super._shouldHideDiscussion(changeList, previousVersionSpec);
    }
}
