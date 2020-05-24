import { autobind } from "OfficeFabric/Utilities";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

// legacy contracts
import { CodeExplorerStoreBase } from "VersionControl/Scripts/Stores/PullRequestReview/CodeExplorerStoreBase";
import ChangeTransformer = require("VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer");
import { GitPullRequestIterationChanges } from "TFS/VersionControl/Contracts";

import { ICodeExplorerStore } from "VersionControl/Scripts/Stores/PullRequestReview/ICodeExplorerStore";

export class CodeExplorerStore extends CodeExplorerStoreBase implements ICodeExplorerStore {
    // overall iteration data caching
    private _iterations: ChangeTransformer.IIterationDetail[];

    // changelists for each type of iteration we may have
    private _latestIterationChangeList: ChangeTransformer.ChangeList;
    private _selectedIterationChangeList: ChangeTransformer.ChangeList;
    private _pushQueryInProgress: boolean;
    private _targetHasBeenChanged: boolean;
    private _newPushesCount: number = 0;

    // selection cache -> these need to be invalidated differently
    private _selectedIteration: ChangeTransformer.IIterationDetail;
    private _selectedItem: ChangeTransformer.ISelectedTreeItem;

    // -- change handlers
    @autobind
    public onIterationsUpdated(payload: Actions.IIterationsUpdatedPayload) {
        this._clearIterationChangeCache();
        super.onIterationsUpdated.bind(this)(payload);
    }

    @autobind
    public onIterationSelected(payload: Actions.IIterationSelectedPayload) {
        this._newPushesCount = 0;
        this._targetHasBeenChanged = false;

        if (this._selectedIteration && this._selectedIteration.id === payload.iterationId) {
            return;
        }

        // when an iteration is selected, update last acknowledged
        this._lastAcknowledgedIterationId = Math.max(this._lastAcknowledgedIterationId, payload.iterationId);

        this._clearSelectionCache();
        super.onIterationSelected(payload);
    }

    /**
     * Marks as read the new pushes.
     */
    @autobind
    public onNewPushesRead() {
        this._newPushesCount = 0;
        this._targetHasBeenChanged = false;
        this.emitChanged();
    }

    /**
     * If there is a push change notification.
     */
    @autobind
    public onChangeNotification(payload: Actions.IChangeNotificationPayload): void {
        if (payload.changeType === Actions.ChangeNotificationType.push) {
            // note that here we don't actually fire the notification
            // this is because we don't want to notify the user until we are done
            // querying for the latest iteration changes
            // (this is a hack we have to have until SignalR gives us more data)
            this._pushQueryInProgress = true;
        }
        else if (payload.changeType === Actions.ChangeNotificationType.retarget) {
            this._targetHasBeenChanged = true;
        }
    }

    @autobind
    public onIterationChangesUpdated(payload: Actions.IIterationChangesUpdatedPayload) {
        if (this._pushQueryInProgress) {
            // when we get the iteration changes back after a push
            // we want to add a notification that a push happened, along with the iteration id
            this._pushQueryInProgress = false;
            this._newPushesCount++;
        }


        // decide if this iteration update affects any of the stuff we are caching
        // do not clear current selection cache on change updates if this PR does not support iterations
        if (payload.iterationId === this.getSelectedIterationId() && this._prSupportsIterations) {
            this._clearSelectionCache();
        }
        else if (payload.iterationId === this.getLatestIterationId()) {
            this._clearIterationChangeCache();
        }

        super.onIterationChangesUpdated(payload);
    }

    @autobind
    public onTreeItemSelected(payload: Actions.IChangeExplorerSelectPayload) {
        if (this._selectedItem && this._selectedItem.path === payload.path) {
            return;
        }

        // this is a special case where we only want to clear
        // the selected item. Nothing else has changed.
        this._selectedItem = null;
        super.onTreeItemSelected(payload);
    }

    @autobind
    public onBranchStatusUpdated(payload: Actions.IBranchStatusUpdatedPayload) {
        // we don't need to change the selected item if the branch status
        // has not actually changed
        if (this._branchStatus && this._branchStatus.equals(payload.branchStatus)) {
            return;
        }

        this._clearIterationChangeCache();
        super.onBranchStatusUpdated(payload);
    }

    /**
     * Clear user selection changes and items. These should not be invalidated
     * unless something changes the users selection.
     */
    private _clearSelectionCache(): void {
        this._selectedIteration = null;
        this._selectedItem = null;
        this._selectedIterationChangeList = null;

        // make sure the main cache isn't stale
        this._clearIterationChangeCache();
    }

    /**
     * Clear our global list of iterations and the latest iteration
     * These should clear on non-user events like signalr
     */
    private _clearIterationChangeCache(): void {
        this._iterations = null;
        this._latestIterationChangeList = null;
    }

    // -- data providers

    public getIterations(): ChangeTransformer.IIterationDetail[] {
        if (!this._iterations) {
            this._iterations = super.getIterations();
        }

        return this._iterations;
    }

    public getSelectedItem(): ChangeTransformer.ISelectedTreeItem {
        // if we have a valid selected item already cached, use that
        if (this._selectedItem && this._selectedItem.gitDiffItem && this._selectedItem.gitDiffItem.item) {
            return this._selectedItem;
        }

        this._selectedItem = super.getSelectedItem();
        return this._selectedItem;
    }

    public getLatestChangeList(): ChangeTransformer.ChangeList {
        if (!this._latestIterationChangeList) {
            this._latestIterationChangeList = super.getLatestChangeList();
        }

        return this._latestIterationChangeList;
    }

    public getSelectedIterationChangeList(): ChangeTransformer.ChangeList {
        if (!this._selectedIterationChangeList) {
            this._selectedIterationChangeList = super.getSelectedIterationChangeList();
        }

        return this._selectedIterationChangeList;
    }

    /**
     * Gets the number of new iterations we have received that user has not seen yet.
     */
    public getNewPushesCount(): number {
        return this._newPushesCount;
    }

    /**
     * Gets whether the target has been changed or not
     */
    public getTargetChanged(): boolean {
        return this._targetHasBeenChanged;
    }
}
