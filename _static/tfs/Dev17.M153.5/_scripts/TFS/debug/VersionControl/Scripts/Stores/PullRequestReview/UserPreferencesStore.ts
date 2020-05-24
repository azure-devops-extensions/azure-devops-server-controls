import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");

/**
 * Basic details about the pull request.
 */
export class UserPreferencesStore extends RemoteStore {
    private _preferences: VCWebAccessContracts.VersionControlUserPreferences;

    public onPreferencesUpdated = (payload: Actions.IUserPreferencesUpdatedPayload): void => {
        this._preferences = payload.preferences;
        this._loading = false;
        this.emitChanged();
    }

    public onSquashMergeUpdated = (payload: Actions.ICompletionOptionPayload): void => {
        if (this._loading) {
            return;
        }

        const shouldSquash: boolean = this._preferences.mergeOptionsSquashMergeCheckboxMode === VCWebAccessContracts.MergeOptionsSquashMergeCheckboxMode.Checked;
        if (payload.shouldEnable === shouldSquash) {
            return;
        }

        this._preferences.mergeOptionsSquashMergeCheckboxMode = payload.shouldEnable ?
            VCWebAccessContracts.MergeOptionsSquashMergeCheckboxMode.Checked :
            VCWebAccessContracts.MergeOptionsSquashMergeCheckboxMode.Unchecked;
        this.emitChanged();
    }

    public onDeleteSourceBranchUpdated = (payload: Actions.ICompletionOptionPayload): void => {
        if (this._loading) {
            return;
        }

        const shouldDelete: boolean = this._preferences.mergeOptionsDeleteSourceCheckboxMode === VCWebAccessContracts.MergeOptionsDeleteSourceCheckboxMode.Checked;
        if (payload.shouldEnable === shouldDelete) {
            return;
        }

        this._preferences.mergeOptionsDeleteSourceCheckboxMode = payload.shouldEnable ?
            VCWebAccessContracts.MergeOptionsDeleteSourceCheckboxMode.Checked :
            VCWebAccessContracts.MergeOptionsDeleteSourceCheckboxMode.Unchecked;
        this.emitChanged();
    }

    public onTransitionWorkItemsUpdated = (payload: Actions.ICompletionOptionPayload): void => {
        if (this._loading) {
            return;
        }

        const shouldTransition: boolean = this._preferences.mergeOptionsTransitionWorkItemsCheckboxMode === VCWebAccessContracts.MergeOptionsTransitionWorkItemsCheckboxMode.Checked;
        if (payload.shouldEnable === shouldTransition) {
            return;
        }

        this._preferences.mergeOptionsTransitionWorkItemsCheckboxMode = payload.shouldEnable ?
            VCWebAccessContracts.MergeOptionsTransitionWorkItemsCheckboxMode.Checked :
            VCWebAccessContracts.MergeOptionsTransitionWorkItemsCheckboxMode.Unchecked;
        this.emitChanged();
    }

    public onActivityFilterTypeAdded = (payload: Actions.IActivityFeedFilterChangedPayload): void => {
        if (this._loading) {
            return;
        }

        this._preferences.pullRequestActivityFilter |= payload.filterType;
        this.emitChanged();
    }

    public onActivityFilterTypeRemoved = (payload: Actions.IActivityFeedFilterChangedPayload): void => {
        if (this._loading) {
            return;
        }

        this._preferences.pullRequestActivityFilter &= ~payload.filterType;
        this.emitChanged();
    }

    public onActivityFilterTypeSet = (payload: Actions.IActivityFeedFilterChangedPayload): void => {
        if (this._loading) {
            return;
        }

        this._preferences.pullRequestActivityFilter = payload.filterType;
        this.emitChanged();
    }

    public onActivityDescriptionExpanded = (payload: Actions.IExpandActivityDescriptionPayload): void => {
        if (this._loading) {
            return;
        }

        this._preferences.pullRequestActivityDescriptionExpanded = payload.expanded;
        this.emitChanged();
    }

    public onDisplayOptionsUpdated = (payload: Actions.IChangeExplorerUpdateDisplayOptionPayload): void => {
        if (this._loading) {
            return;
        }

        let changed: boolean = false;

        if (payload.options.displayModeChanged && this._preferences.changeExplorerGridDisplayMode !== payload.options.displayMode) {
            this._preferences.changeExplorerGridDisplayMode = payload.options.displayMode;
            changed = true;
        }

        if (payload.options.commentsModeChanged && this._preferences.changeExplorerGridCommentsMode !== payload.options.commentsMode) {
            this._preferences.changeExplorerGridCommentsMode = payload.options.commentsMode;
            changed = true;
        }

        if (changed) {
            this.emitChanged();
        }
    }

    public onDiffViewerOrientationUpdated = (payload: Actions.IOrientationUpdatedPayload): void => {
        if (this._loading) {
            return;
        }

        if (this._preferences.diffViewerOrientation === payload.orientation) {
            return;
        }

        this._preferences.diffViewerOrientation = payload.orientation;
        this.emitChanged();
    }

    public onSummaryDiffViewerOrientationUpdated = (payload: Actions.IOrientationUpdatedPayload): void => {
        if (this._loading) {
            return;
        }

        if (this._preferences.summaryDiffOrientation === payload.orientation) {
            return;
        }

        this._preferences.summaryDiffOrientation = payload.orientation;
        this.emitChanged();
    }

    public getPreferences(): VCWebAccessContracts.VersionControlUserPreferences {
        return this._preferences;
    }
}
