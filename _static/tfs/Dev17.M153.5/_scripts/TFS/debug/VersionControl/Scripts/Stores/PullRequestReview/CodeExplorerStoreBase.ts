import { autobind } from "OfficeFabric/Utilities";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

// actions
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import { GitPullRequestIteration, GitPullRequestIterationChanges } from "TFS/VersionControl/Contracts";
import { Change, FileDiff } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { IPullRequestBranchStatus } from "VersionControl/Scripts/TFS.VersionControl.PullRequest";

import ChangeTransformer = require("VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer");

/**
 * Basic details related to file browsing/iteration.
 *
 * This store responds to: (a) code review changes, and (b) iteration/changeset changes.
 * It builds up client side models (i.e. the stuff the legacy file explorer expects in order to render)
 * based on the reponses from the REST clients.
 *
 * Note that this is the uncached version, which means every time you call a "get" method, you will receive
 * a newly computed copy. There is a cached version that inherits from this store, which should be used
 * for performance reasons.
 */
export abstract class CodeExplorerStoreBase extends RemoteStore {

    // pull request branch status
    // (needed to know the correct versions of the branches)
    protected _branchStatus: IPullRequestBranchStatus;

    private _prIterations: GitPullRequestIteration[];
    private _iterationChanges: IterationChangeCache;

    // currently selected iteration (-1 is uninitialized)
    private _selectedIterationId: number;

    // currently selected base iteration (0 is "no base iteration")
    // when the base is specified, user will be viewing the changes between
    // the given base iteration and the selected iteration
    private _selectedBaseIterationId: number;

    // the first iteration that is new and has not been selected by the user
    // if this is not the latest iteration id, iterations between it and the 
    // latest are marked as unseen
    protected _lastAcknowledgedIterationId: number;

    // currently selected path in the explorer
    private _selectedPath: string;
    private _filteredPaths: string[];

    // whether or not the current pr supports iterations
    // if iterations are not supported, data coming from the server about new updates
    // will send new and old changes down under the guise of being iteration 1
    protected _prSupportsIterations: boolean;

    // file diff cache
    private _diffCache: IDictionaryStringTo<FileDiff>;

    constructor() {
        super();

        this._branchStatus = null;
        this._selectedPath = null;
        this._prSupportsIterations = true;

        this._selectedIterationId = -1;
        this._selectedBaseIterationId = 0;
        this._lastAcknowledgedIterationId = -1;

        this._diffCache = {};
        this._filteredPaths = [];
        this._iterationChanges = new IterationChangeCache();
    }

    // -- change handlers
    protected onIterationsUpdated(payload: Actions.IIterationsUpdatedPayload) {
        // get the previous iteration id before updating the code review object (for comparison)
        const previousLatestIterationid = this.getLatestIterationId();

        // update the code review object and get the new latest iteration id
        this._prIterations = payload.iterations;
        const latestIterationId = this.getLatestIterationId();

        // if this is the first load, set the first unselected to the latest iteration id
        // signifying there are no newly pushed unseen iterations
        if (previousLatestIterationid < 0) {
            this._lastAcknowledgedIterationId = latestIterationId;
        }
        else if (!this._prSupportsIterations) {
            // if iterations are updated but not supported, reset last ack to 0 so
            // downstream components know that a "new updates" type message should be shown
            this._lastAcknowledgedIterationId = 0;
        }
        
        // If there is no "selected" iteration, then default to the latest
        // This is the first time we know the id of the latest iteration.
        if (this._selectedIterationId <= 0) {
            this._setSelectedIteration(latestIterationId, 0);
        }

        this._iterationChanges.setLatestIteration(latestIterationId);
        this.emitChanged();
    }

    @autobind
    protected onIterationSelected(payload: Actions.IIterationSelectedPayload) {
        if (this._selectedIterationId === payload.iterationId &&
            this._selectedBaseIterationId === payload.baseId) {
            return;
        }

        this._setSelectedIteration(payload.iterationId, payload.baseId);
        this.emitChanged();
    }

    private _setSelectedIteration(iterationId: number, baseId: number) {
        this._selectedIterationId = iterationId;
        this._selectedBaseIterationId = baseId;
        this._iterationChanges.setSelectedIteration(this._selectedIterationId, this._selectedBaseIterationId);
    }

    @autobind
    public onIterationUpdateStart(payload: Actions.IIterationChangesUpdateStartPayload) {
        this._iterationChanges.setIsIterationUpdating(payload.iterationId, payload.baseId, true);
        this.emitChanged();
    }

    @autobind
    protected onIterationChangesUpdated(payload: Actions.IIterationChangesUpdatedPayload) {
        this._iterationChanges.appendChanges(
            payload.iterationId,
            payload.baseId,
            payload.changes,
            payload.skip,
            this._doesIterationHaveMoreChanges(payload.changes));

        this._iterationChanges.setIsIterationUpdating(payload.iterationId, payload.baseId, false);

        const selectedChangeList: ChangeTransformer.ChangeList = this.getSelectedIterationChangeList();
        this._filteredPaths = this._getFilteredPathsFromChanges(selectedChangeList && selectedChangeList.legacyChangeList().changes);

        this.emitChanged();
    }

    @autobind
    public onPullRequestUpdated(payload: Actions.IPullRequestUpdatedPayload): void {
        // pr supporting iterations is assumed to be true
        if (payload.pullRequest && !payload.pullRequest.supportsIterations) {
            this._prSupportsIterations = false;
        }
    }

    private _doesIterationHaveMoreChanges(iterationChanges: GitPullRequestIterationChanges): boolean {
        return !!iterationChanges && !!iterationChanges.nextSkip;
    }

    @autobind
    protected onTreeItemSelected(payload: Actions.IChangeExplorerSelectPayload) {
        if (this._selectedPath == payload.path) {
            return;
        }

        this._selectedPath = payload.path;
        this.emitChanged();
    }

    @autobind
    protected onBranchStatusUpdated(payload: Actions.IBranchStatusUpdatedPayload) {
        // we don't need to change the selected item if the branch status
        // has not actually changed
        if (this._branchStatus && this._branchStatus.equals(payload.branchStatus)) {
            return;
        }

        this._branchStatus = payload.branchStatus;
        this.emitChanged();
    }

    @autobind
    public onFileDiffCache(payload: Actions.IFileDiffFetchedPayload): void {
        if (payload.itemDescription && payload.fileDiff) {
            this._diffCache[payload.itemDescription] = payload.fileDiff;
        }
    }

    @autobind
    public onChangesFiltered(payload: Actions.IChangesFilteredPayload): void {
        if (!payload.changes) {
            return;
        }

        const newFilteredPaths: string[] = this._getFilteredPathsFromChanges(payload.changes);

        if (!Utils_Array.shallowEquals(this._filteredPaths, newFilteredPaths)) {
            this._filteredPaths = newFilteredPaths;
            this.emitChanged();
        }
    }

    private _getFilteredPathsFromChanges(changes: Change[]): string[] {
        const newFilteredPathSet: IDictionaryStringTo<Boolean> = {};
        changes && changes.forEach(change => {
            if (change.sourceServerItem) {
                newFilteredPathSet[change.sourceServerItem] = true;
            }

            if (change.item && change.item.serverItem) {
                newFilteredPathSet[change.item.serverItem] = true;
            }
        });

        return Object.keys(newFilteredPathSet);
    }

    public isUpdatingSelectedIteration(): boolean {
        return this._iterationChanges.getIsIterationUpdating(this._selectedIterationId, this._selectedBaseIterationId);
    }

    public getLatestIterationId(): number {
        // if no iterations available
        if (!this._prIterations || this._prIterations.length === 0) {
            return -1;
        }

        return this._prIterations[this._prIterations.length - 1].id;
    }

    public getSelectedIterationId(): number {
        // if no iterations available
        if (!this._prIterations || this._prIterations.length === 0) {
            return -1;
        }

        if (this._selectedIterationId > -1) {
            return this._selectedIterationId;
        } else {
            // default to latest iteration if nothing is selected
            return this.getLatestIterationId();
        }
    }

    public getSelectedBaseIterationId(): number {
        // if no iterations available
        if (!this._prIterations || this._prIterations.length === 0) {
            return -1;
        }

        return this._selectedBaseIterationId;
    }

    public getSelectedIterationChanges(): GitPullRequestIterationChanges {
        return this._iterationChanges.getSelectedIterationChanges();
    }

    public getChangeTrackingIdForPath(path: string): number {
        return this._iterationChanges.getChangeTrackingIdForPath(path);
    }


    /**
     * return the last iteration acknowledged as seen by the user
     */
    public getLastAcknowledgedIterationId(): number {
        return this._lastAcknowledgedIterationId;
    }

    /**
    * The number of changes that have been downloaded for the latest.
    */
    public getLatestIterationDownloadedChangeCount() {
        return this.getIterationDownloadedChangeCount(this.getLatestIterationId(), 0);
    }

    /**
    * The number of changes that have been downloaded for the selected iteration.
    */
    public getSelectedIterationDownloadedChangeCount() {
        return this.getIterationDownloadedChangeCount(this._selectedIterationId, this._selectedBaseIterationId);
    }

    /**
     * The number of changes that have been downloaded for an iteration.
     */
    public getIterationDownloadedChangeCount(iterationId: number, baseId: number) {
        return this._iterationChanges.getIterationChangeCount(iterationId, baseId);
    }

    public getIterations(): ChangeTransformer.IIterationDetail[] {
        if (!this._prIterations) {
            return [];
        }

        return this._prIterations.map(iteration => {
            return ChangeTransformer.Transformer.convertIteration(iteration);
        });
    }

    /**
     * Get the currently selected item in the explorer based on some
     * changelist calculations and the path.
     */
    public getSelectedItem(): ChangeTransformer.ISelectedTreeItem {
        return new ChangeTransformer.SelectedTreeItem(
            this._branchStatus,
            this.getSelectedIterationChangeList(),
            this._selectedPath);
    }

    /**
     * Get the list of changes for the current iteration of the pull request
     * (regardless of what has been selected). This is the "overall" set of changes.
     */
    public getLatestChangeList(): ChangeTransformer.ChangeList {
        return this._getChangeList(
            this._iterationChanges.getLatestIterationChanges(),
            this.getLatestIterationId());
    }

    /**
     * Return the list of changes for whatever iteration the user has selected.
     */
    public getSelectedIterationChangeList(): ChangeTransformer.ChangeList {
        return this._getChangeList(
            this._iterationChanges.getSelectedIterationChanges(),
            this.getSelectedIterationId(),
            this.getSelectedBaseIterationId());
    }

    public getLatestIterationHasMoreChanges(): boolean {
        return this._iterationChanges.getDoesIterationHaveMoreChanges(this.getLatestIterationId(), 0);
    }

    public getSelectedIterationHasMoreChanges(): boolean {
        return this._iterationChanges.getDoesIterationHaveMoreChanges(this._selectedIterationId, this._selectedBaseIterationId);
    }

    /**
     * Return the converted changelist based on iteration ID and CR changes.
     */
    private _getChangeList(changes: GitPullRequestIterationChanges, iterationId: number, baseId?: number): ChangeTransformer.ChangeList {

        // if we are waiting on code reviews or changes to populate
        if (!this._prIterations || !changes) {
            return null;
        }

        const iteration: GitPullRequestIteration = this._getIteration(iterationId);
        const base: GitPullRequestIteration = baseId ? this._getIteration(baseId) : null; 

        if (!changes || !iteration || (baseId && !base)) {
            return null;
        }

        const allChangesIncluded = !this._iterationChanges.getDoesIterationHaveMoreChanges(iterationId, baseId || 0);

        return ChangeTransformer.Transformer.convertChanges(changes, iteration, base, allChangesIncluded);
    }

    /**
     * Return an iteration from a code review. If the iteration doesn't exist or the review hasn't loaded this will return null.
     */
    private _getIteration(iterationId: number): GitPullRequestIteration {
        if (!iterationId || !this._prIterations || iterationId === -1) {
            return null;
        }

        return this._prIterations.filter(i => i.id === iterationId)[0];
    }

    public hasChangesCached(iterationId: number, baseId: number, top?: number, skip?: number) {
        const changes: IterationChangeData = this._iterationChanges.getIterationChangeData(iterationId, baseId);
        if (changes) {
            top = top || 0;
            skip = skip || 0;

            const count = changes.getChangeCount();
            if (count >= top + skip) {
                return true;
            }
        }

        return false;
    }

    public getDiffCache(): IDictionaryStringTo<any> {
        return this._diffCache;
    }

    public getFilteredPaths(): string[] {
        return this._filteredPaths;
    }

    public isLoading(): boolean {
        return this.isLoadingLatest() || this.isLoadingSelected();
    }

    public isLoadingLatest(): boolean {
        return this._isLoadingInitial() || !this._iterationChanges.getLatestIterationChanges();
    }

    public isLoadingSelected(): boolean {
        return this._isLoadingInitial() || !this._iterationChanges.getSelectedIterationChanges();
    }

    private _isLoadingInitial(): boolean {
        const iterationsLoading: boolean = !this._prIterations;
        const branchStatusLoading: boolean = !this._branchStatus;

        return iterationsLoading || branchStatusLoading;
    }
}

class IterationChangeCache {
    private _iterationMap: { [index: string]: IterationChangeData };
    private _latestIterationId: number;
    private _selectedIterationId: number;
    private _selectedBaseIterationId: number;

    constructor() {
        this._iterationMap = {};
        this._latestIterationId = -1;
        this._selectedIterationId = -1;
        this._selectedBaseIterationId = 0;
    }

    /** Add changes for the given iteration to the change cache
     * @param iterationId
     * @param baseId
     * @param newChanges The incoming changes for the given iteration
     * @param start Number of changes skipped before the current set starts
     * @param hasMore If the given iteration has more changes to be queried
    */
    public appendChanges(
        iterationId: number,
        baseId: number,
        newChanges: GitPullRequestIterationChanges,
        start: number,
        hasMore: boolean): void {

        const key: string = this._getKey(iterationId, baseId);
        const changeData = this._iterationMap[key];
        const changesToAdd = $.extend({}, newChanges);
        
        // replace cached changes if we don't have any yet or if this is the first set of changes for the iteration
        if (!changeData || start === 0) {
            this._iterationMap[key] = new IterationChangeData(changesToAdd, iterationId, baseId, false, hasMore);
            return;
        }

        // if the starting index of the incoming changes does not match
        // with the currently stored data, then drop the changes
        if (changeData.changes && changeData.getChangeCount() === start) {
            newChanges.changeEntries.forEach(change => {
                changeData.changes.changeEntries.push(change);
            });
        }

        changeData.isUpdating = false;
        changeData.hasMoreChanges = hasMore;
    }

    public setIsIterationUpdating(iterationId: number, baseId: number, isUpdating: boolean) {
        const key: string = this._getKey(iterationId, baseId);
        const changeData = this._iterationMap[key];

        if (changeData) {
            changeData.isUpdating = isUpdating;
        } else {
            this._iterationMap[key] = new IterationChangeData(null, iterationId, baseId, isUpdating, false);
        }
    }

    public getIsIterationUpdating(iterationId: number, baseId: number): boolean {
        const data = this._iterationMap[this._getKey(iterationId, baseId)];

        if (data) {
            return data.isUpdating
        }

        return false;
    }

    public getDoesIterationHaveMoreChanges(iterationId: number, baseId: number): boolean {
        const data = this._iterationMap[this._getKey(iterationId, baseId)];

        if (data) {
            return data.hasMoreChanges
        }

        return false;
    }

    public setLatestIteration(iterationId: number) {
        this._latestIterationId = iterationId;
    }

    public setSelectedIteration(iterationId: number, baseId: number) {
        this._selectedIterationId = iterationId;
        this._selectedBaseIterationId = baseId;
    }

    public getLatestIterationChangeData(): IterationChangeData {
        return this._iterationMap[this._getLatestKey()];
    }

    public getSelectedIterationChangeData(): IterationChangeData {
        return this._iterationMap[this._getSelectedKey()];
    }

    public getIterationChangeData(iterationId: number, baseId: number): IterationChangeData {
        return this._iterationMap[this._getKey(iterationId, baseId)]; 
    }

    public getLatestIterationChanges(): GitPullRequestIterationChanges {
        const changeData: IterationChangeData = this.getLatestIterationChangeData();

        let changes: GitPullRequestIterationChanges = null;
        if (changeData) {
            changes = changeData.changes;
        }

        return changes;
    }

    public getSelectedIterationChanges(): GitPullRequestIterationChanges {
        const changeData: IterationChangeData = this.getSelectedIterationChangeData();

        let changes: GitPullRequestIterationChanges = null;
        if (changeData) {
            changes = changeData.changes;
        }

        return changes;
    }

    public getChangeTrackingIdForPath(path: string): number {
        const changeData: IterationChangeData = this.getSelectedIterationChangeData();

        if (!path || !changeData) {
            return 0;
        }

        return changeData.getChangeTrackingIdForPath(path);
    }

    public hasCachedChanges(iterationId: number, baseId: number): boolean {
        return !!this._iterationMap[this._getKey(iterationId, baseId)];
    }

    public getIterationChangeCount(iterationId: number, baseId: number) {
        const data = this._iterationMap[this._getKey(iterationId, baseId)];

        if (data) {
            return data.getChangeCount();
        }

        return 0;
    }

    public getSkip(iterationId: number, baseId: number): number {
        const data = this._iterationMap[this._getKey(iterationId, baseId)];

        if (data) {
            return data.getChangeCount();
        }

        return 0;
    }

    private _getKey(iteration: number, baseId: number): string {
        return iteration + "|" + baseId;
    }

    private _getSelectedKey(): string {
        return this._getKey(this._selectedIterationId, this._selectedBaseIterationId);
    }

    private _getLatestKey(): string {
        return this._getKey(this._latestIterationId, 0);
    }
}

class IterationChangeData {
    public changes: GitPullRequestIterationChanges;
    public iterationId: number;
    public baseId: number;
    public isUpdating: boolean;
    public hasMoreChanges: boolean;

    constructor(changes: GitPullRequestIterationChanges, iterationId: number, baseId: number, isUpdating: boolean, hasMoreChanges: boolean) {
        this.changes = changes;
        this.iterationId = iterationId;
        this.baseId = baseId;
        this.isUpdating = isUpdating;
        this.hasMoreChanges = hasMoreChanges;
    }

    public getChangeCount(): number {
        if (this.changes && this.changes.changeEntries) {
            return this.changes.changeEntries.length;
        }

        return 0;
    }

    public getChangeTrackingIdForPath(path: string): number {
        if (!path || !this.changes || !this.changes.changeEntries || !this.changes.changeEntries.length) {
            return 0;
        }

        for (const entry of this.changes.changeEntries) {
            if (entry && entry.item && !Utils_String.localeIgnoreCaseComparer(entry.item.path, path)) {
                return entry.changeTrackingId;
            }
        }

        return 0;        
    }
}