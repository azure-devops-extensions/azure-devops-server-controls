import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import VCDiscussionManager = require("VersionControl/Scripts/TFS.VersionControl.DiscussionManager");

export abstract class IDiscussionManagerStore {
    abstract onContextUpdated(payload: Actions.IContextUpdatedPayload);

    abstract onPullRequestUpdated(payload: Actions.IPullRequestUpdatedPayload);

    abstract onIterationSelected(payload: Actions.IIterationSelectedPayload);

    abstract getDiscussionManager(): VCDiscussionManager.PullRequestDiscussionManager;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IDiscussionManagerStore"; }
}
