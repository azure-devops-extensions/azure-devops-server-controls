import * as Q from "q";
import { ActionsHub } from  "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { UserPreferenceSource }  from "VersionControl/Scenarios/ChangeDetails/Sources/UserPreferenceSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import { DiffViewerOrientation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

/**
 * Action Creator for User Preferences artifact 
 */
export class UserPreferenceActionCreator {

    constructor(
        private _actionsHub: ActionsHub,
        private _storesHub: StoresHub,
        private _repositoryContext: RepositoryContext,
        private _userPreferenceSource?: UserPreferenceSource) {
    }

    /**
     * Load all of the user's preferences.
     */
    public fetchUserPreferences(): Q.Promise<void> {
        const deferred = Q.defer<void>();
        // get initial user preferences and fire associated init actions
        this.userPreferenceSource.getUserPreferencesAsync().then(
            (prefs) => {
                this._actionsHub.userPreferencesUpdated.invoke({
                    preferences: prefs,
                });

                // fire diff viewer changes
                this._actionsHub.diffViewerOrientationUpdated.invoke({
                    orientation: prefs.diffViewerOrientation,
                });

                // fire change explorer changes
                const options: ChangeExplorerGridModeChangedEventArgs = {
                    displayMode: null,
                    displayModeChanged: false,
                    commentsMode: prefs.changeExplorerGridCommentsMode,
                    commentsModeChanged: true,
                };
                this._actionsHub.changeExplorerDisplayOptionUpdated.invoke({
                    options: options,
                });

                deferred.resolve(null);
            },
            (error) => {
                deferred.reject(error);
                this._raiseError(error);
            }
        );
        return deferred.promise;
    }

    /**
     * Updates the user's preference for Diff Viewer orientation
     * @param diffViewerOrientation The new diffViewer orientation
     */
    public updateDiffViewerOrientation(diffViewerOrientation: DiffViewerOrientation): void {
        this.userPreferenceSource.getUserPreferencesAsync().then(
            (preferences) => {
                if (preferences.diffViewerOrientation !== diffViewerOrientation) {
                    preferences.diffViewerOrientation = diffViewerOrientation;
                    this.userPreferenceSource.setUserPreferencesAsync(preferences);
                }
            },
            () => undefined,
        );
        this._actionsHub.diffViewerOrientationUpdated.invoke({
            orientation: diffViewerOrientation,
        });
    }

    /**
     * Updates the user's preference for the Change explorer display options
     * @param options ChangeExplorerGridModeChangedEventArgs for Change Explorer
     * @param updateOnServer Should update user preference on server, default value is true
     */
    public updateChangeExplorerDisplayOptions(options: ChangeExplorerGridModeChangedEventArgs, updateOnServer: boolean = true): void {
        this._actionsHub.changeExplorerDisplayOptionUpdated.invoke({
            options: options,
        });

        if (updateOnServer) {
            this._userPreferenceSource.updateChangeExplorerDisplayOptions(options);
        }
    }

    private _raiseError = (error: Error): void => {
        this._actionsHub.errorRaised.invoke(error);
    }

    private get userPreferenceSource(): UserPreferenceSource {
        if (!this._userPreferenceSource) {
            this._userPreferenceSource = new UserPreferenceSource(this._repositoryContext);
        }

        return this._userPreferenceSource;
    }
}
