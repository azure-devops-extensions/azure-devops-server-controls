import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

// legacy contracts
import ChangeTransformer = require("VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer");
import { GitPullRequestIterationChanges } from "TFS/VersionControl/Contracts";

export abstract class ICodeExplorerStore {
    abstract onIterationsUpdated(payload: Actions.IIterationsUpdatedPayload);

    abstract onIterationSelected(payload: Actions.IIterationSelectedPayload);

    abstract onIterationChangesUpdated(payload: Actions.IIterationChangesUpdatedPayload);

    abstract onTreeItemSelected(payload: Actions.IChangeExplorerSelectPayload);

    abstract onBranchStatusUpdated(payload: Actions.IBranchStatusUpdatedPayload);
    
    abstract onIterationUpdateStart(payload: Actions.IIterationChangesUpdateStartPayload);

    abstract onPullRequestUpdated(payload: Actions.IPullRequestUpdatedPayload): void;

    abstract onFileDiffCache(payload: Actions.IFileDiffFetchedPayload): void;

    abstract onChangesFiltered(payload: Actions.IChangesFilteredPayload): void;

    abstract isUpdatingSelectedIteration(): boolean;

    abstract getLatestIterationId(): number;

    abstract getSelectedIterationId(): number;

    abstract getChangeTrackingIdForPath(path: string): number;

    abstract getFilteredPaths(): string[];

    abstract getSelectedBaseIterationId(): number;

    abstract getSelectedIterationChanges(): GitPullRequestIterationChanges;

    /**
     * return the last iteration acknowledged as seen by the user
     */
    abstract getLastAcknowledgedIterationId(): number;

    /**
    * The number of changes that have been downloaded for the latest.
    */
    abstract getLatestIterationDownloadedChangeCount();

    /**
    * The number of changes that have been downloaded for the selected iteration.
    */
    abstract getSelectedIterationDownloadedChangeCount();

    /**
     * The number of changes that have been downloaded for an iteration.
     */
    abstract getIterationDownloadedChangeCount(iterationId: number, baseId: number);

    abstract getIterations(): ChangeTransformer.IIterationDetail[];

    /**
     * Get the currently selected item in the explorer based on some
     * changelist calculations and the path.
     */
    abstract getSelectedItem(): ChangeTransformer.ISelectedTreeItem;

    /**
     * Get the list of changes for the current iteration of the pull request
     * (regardless of what has been selected). This is the "overall" set of changes.
     */
    abstract getLatestChangeList(): ChangeTransformer.ChangeList;

    /**
     * Return the list of changes for whatever iteration the user has selected.
     */
    abstract getSelectedIterationChangeList(): ChangeTransformer.ChangeList;

    abstract getLatestIterationHasMoreChanges(): boolean;

    abstract getSelectedIterationHasMoreChanges(): boolean;

    abstract hasChangesCached(iterationId: number, baseId: number, top?: number, skip?: number);

    abstract getDiffCache(): IDictionaryStringTo<any>;

    /**
     * Does this store have everything it needs to do calculations?
     */
    abstract isLoading(): boolean;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "ICodeExplorerStore"; }
}