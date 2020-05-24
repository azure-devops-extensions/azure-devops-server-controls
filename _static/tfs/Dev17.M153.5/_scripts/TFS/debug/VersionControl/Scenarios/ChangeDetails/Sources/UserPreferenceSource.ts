import * as Q from "q";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import { VersionControlUserPreferences, ChangeExplorerGridCommentsMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

/**
 *  Source for user preferences of change details page
 */
export class UserPreferenceSource {

    constructor(private _repositoryContext: RepositoryContext) {
    }

    public getUserPreferencesAsync(): IPromise<VersionControlUserPreferences> {
        const deferred = Q.defer<VersionControlUserPreferences>();

        this._repositoryContext.getClient().beginGetUserPreferences(
            (preferences: VersionControlUserPreferences) => {
                if (preferences) {
                    // note that we are cloning the object here to prevent
                    // it from getting updated from other places
                    deferred.resolve($.extend({}, preferences));
                } else {
                    // return filter default if no previous choice
                    deferred.resolve(null);
                }
            },
            error => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public setUserPreferencesAsync(preferences: VersionControlUserPreferences):
        IPromise<VersionControlUserPreferences> {
        const deferred = Q.defer<VersionControlUserPreferences>();

        this._repositoryContext.getClient().beginUpdateUserPreferences(
            preferences,
            () => {
                deferred.resolve(preferences);
            },
            error => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public updateChangeExplorerDisplayOptions(options: ChangeExplorerGridModeChangedEventArgs): IPromise<VersionControlUserPreferences> {
        const deferred = Q.defer<VersionControlUserPreferences>();

        this.getUserPreferencesAsync()
            .then((preferences: VersionControlUserPreferences) => {
                let changed = false;

                if (options.displayModeChanged && preferences.changeExplorerGridDisplayMode !== options.displayMode) {
                    preferences.changeExplorerGridDisplayMode = options.displayMode;
                    changed = true;
                }

                if (options.commentsModeChanged && preferences.changeExplorerGridCommentsMode !== options.commentsMode) {
                    preferences.changeExplorerGridCommentsMode = options.commentsMode;
                    changed = true;
                }

                if (changed) {
                    this.setUserPreferencesAsync(preferences).then(
                        (newPreferences: VersionControlUserPreferences) => {
                            deferred.resolve(newPreferences);
                        },
                        (error) => {
                            deferred.reject(error);
                        });
                } else {
                    deferred.resolve(preferences);
                }

            },

            (error) => {
                deferred.reject(error);
            }
            );

        return deferred.promise;
    }
}
