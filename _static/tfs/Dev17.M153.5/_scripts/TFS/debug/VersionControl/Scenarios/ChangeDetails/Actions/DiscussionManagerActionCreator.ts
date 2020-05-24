import { Artifact } from "VSS/Artifacts/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import { DiscussionThreadsUpdateEvent } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionManager, DiscussionViewOptions, IDiscussionAdapter } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { ActionsHub } from  "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CodeReviewDiscussionManager } from "VersionControl/Scripts/TFS.VersionControl.DiscussionManager";
import { createArtifactFromVersionString } from "VersionControl/Scripts/ArtifactHelper";
/**
 * Action Creator for Discussion Manager 
 */
export class DiscussionManagerActionCreator {

    constructor(
        protected _actionsHub: ActionsHub,
        protected _storesHub: StoresHub,
        protected _tfsContext: TfsContext,
        protected _repositoryContext: RepositoryContext) {
    }

    /**
     * Creates discussion manager, if needed.
     * Updates the visibility state of discussionManager, if already created
     */
    public createOrUpdateDiscussionManager(changeList: VCLegacyContracts.ChangeList, projectGuid: string, createAdapter?: () => IDiscussionAdapter): void {
        let discussionViewOptions: DiscussionViewOptions;
        const previousVersionSpec = this._storesHub.changeListStore.getPreviousVersionSpec();
        const shouldHideDiscussionManager = this._shouldHideDiscussion(changeList, previousVersionSpec);
        // Create the discussion manager if needed, and update shouldHideDiscussionManager if already created.
        if (!this._storesHub.discussionManagerStore.discussionManager) {

            if (!shouldHideDiscussionManager) {
                discussionViewOptions = {
                    hideComments: false,
                    hideNonActiveComments: false,
                };
                this._createDiscussionManager(changeList, discussionViewOptions, projectGuid, createAdapter);
            }
        } else {
            this._actionsHub.shouldHideDiscussionManagerUpdated.invoke(shouldHideDiscussionManager);
        }
    }

    public removeDiscussionThreadsUpdatedListener(): void {
        const discussionManager = this._storesHub.discussionManagerStore.discussionManager;
        if (discussionManager) {
            discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionThreadUpdatedListener);
        }
    }

    protected _createDiscussionManager(changeList: VCLegacyContracts.ChangeList, discussionViewOptions: DiscussionViewOptions, projectGuid: string, createAdapter?: () => IDiscussionAdapter): void {
        const codeReviewId = this._storesHub.urlParametersStore.codeReviewId;
        const artifact: Artifact = createArtifactFromVersionString(changeList.version, projectGuid, this._repositoryContext.getRepositoryId());

        if (artifact) {
            const discussionManager = new CodeReviewDiscussionManager(
                this._tfsContext,
                this._repositoryContext,
                changeList,
                artifact.getUri(),
                codeReviewId,
                createAdapter && createAdapter(),
                discussionViewOptions,
            );
            discussionManager.addDiscussionThreadsUpdatedListener(this._discussionThreadUpdatedListener);
            discussionManager.beginLoadDiscussionThreads();

            this._actionsHub.discussionManagerCreated.invoke({ discussionManager: discussionManager, discussionId: this._storesHub.urlParametersStore.discussionId });
        }
    }

    /** Returns true for any cases where discussion comments should not be enabled or visible. */
    protected _shouldHideDiscussion(changeList: VCLegacyContracts.ChangeList, previousVersionSpec: string): boolean {
        const oversion = this._storesHub.urlParametersStore.oversion;
        const version = changeList.version;
        const mversion = this._storesHub.urlParametersStore.mversion;

        // Don't use discussion manager if on the compare tab and diffing any versions other than tip and previous tip
        let diffingWithPrev = oversion === this._storesHub.changeListStore.getPreviousVersionSpec();

        // or in the case of Git commits, also relax the requirement to allow commenting on diffing with it's first parent commit
        if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
            diffingWithPrev = diffingWithPrev || oversion === previousVersionSpec;
        }

        return ((!!oversion && !diffingWithPrev) || (!!mversion && mversion !== version));
    }

    private _discussionThreadUpdatedListener = (sender: DiscussionManager, e: DiscussionThreadsUpdateEvent) => {

        if (e && e.threadSelected) {
            if (this._storesHub.discussionManagerStore && (this._storesHub.discussionManagerStore.discussionId !== e.threadSelected.id)) {
                Navigation_Services.getHistoryService().addHistoryPoint(this._storesHub.urlParametersStore.currentAction, {
                    discussionId: e.threadSelected.id,
                });
            }
        }
    }
}
