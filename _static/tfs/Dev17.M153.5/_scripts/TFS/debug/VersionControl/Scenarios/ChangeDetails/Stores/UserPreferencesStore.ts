import * as VSSStore from  "VSS/Flux/Store";
import { ActionsHub,
    IChangeExplorerDisplayOptionUpdatedPayload,
    IUserPreferencesUpdatedPayload,
    IOrientationUpdatedPayload } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { VersionControlUserPreferences, ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

/**
 * User preferences for change details page.
 */
export class UserPreferencesStore extends VSSStore.RemoteStore {
    private _preferences: VersionControlUserPreferences;

    constructor(private _actionsHub: ActionsHub) {
        super();

        this._preferences = null;

        this._actionsHub.userPreferencesUpdated.addListener(this._onPreferencesUpdated);
        this._actionsHub.diffViewerOrientationUpdated.addListener(this._onDiffViewerOrientationUpdated);
        this._actionsHub.changeExplorerDisplayOptionUpdated.addListener(this._onChangeExplorerDisplayOptionUpdated);
    }

    public getPreferences(): VersionControlUserPreferences {
        return this._preferences;
    }

    public get changeExplorerGridDisplayMode(): ChangeExplorerGridDisplayMode {
        return this._preferences ? this._preferences.changeExplorerGridDisplayMode : ChangeExplorerGridDisplayMode.FullTree;
    }

    // always show the entire tree for both Git and Tfvc
    public get isChangeExplorerGridDisplayModeFullTree(): boolean {
        return true;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.userPreferencesUpdated.removeListener(this._onPreferencesUpdated);
            this._actionsHub.diffViewerOrientationUpdated.removeListener(this._onDiffViewerOrientationUpdated);
            this._actionsHub.changeExplorerDisplayOptionUpdated.removeListener(this._onChangeExplorerDisplayOptionUpdated);
            this._actionsHub = null;
        }

        this._preferences = null;
    }

    private _onPreferencesUpdated = (payload: IUserPreferencesUpdatedPayload): void =>{
        this._preferences = payload.preferences;
        this._loading = false;

        this.emitChanged();
    }

    private _onDiffViewerOrientationUpdated = (payload: IOrientationUpdatedPayload): void => {
        if (this._preferences.diffViewerOrientation !== payload.orientation) {
            this._preferences.diffViewerOrientation = payload.orientation;
            this.emitChanged();
        }
    }

    private _onChangeExplorerDisplayOptionUpdated = (payload: IChangeExplorerDisplayOptionUpdatedPayload): void => {
        let changed = false;

        if (payload.options) {
            if (payload.options.displayModeChanged &&
                this._preferences.changeExplorerGridDisplayMode !== payload.options.displayMode) {
                this._preferences.changeExplorerGridDisplayMode = payload.options.displayMode;
                changed = true;
            }

            if (payload.options.commentsModeChanged &&
                this._preferences.changeExplorerGridCommentsMode !== payload.options.commentsMode) {
                this._preferences.changeExplorerGridCommentsMode = payload.options.commentsMode;
                changed = true;
            }

            if (changed) {
                this.emitChanged();
            }
        }
    }
}
