import * as Q from "q";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { CachedSource } from "VersionControl/Scripts/Sources/Source";
import { VersionControlUserPreferences, 
    PullRequestActivityOrder, 
    PullRequestActivityDescriptionExpanded, 
    DiffViewerOrientation,
    VersionControlRepositoryOption,
    MergeOptionsSquashMergeCheckboxMode,
    MergeOptionsDeleteSourceCheckboxMode,
    MergeOptionsTransitionWorkItemsCheckboxMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";

import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export interface IUserPreferenceSource {
    getPreferencesAsync(): Q.Promise<VersionControlUserPreferences>;
    setPreferencesAsync(preferences: VersionControlUserPreferences):
        Q.Promise<VersionControlUserPreferences>;
    updateActivityOrder(activityOrder: PullRequestActivityOrder): void;
    addActivityFilter(activityFilter: number): void;
    removeActivityFilter(activityFilter: number): void;
    setActivityFilter(activityFilter: number): void;
    updateActivityDescriptionExpanded(expanded: PullRequestActivityDescriptionExpanded): void;
    updateChangeExplorerOptions(options: ChangeExplorerGridModeChangedEventArgs): void;
    updateDiffViewerOrientationPreference(diffViewerOrientation: DiffViewerOrientation): void;
    updateSummaryDiffViewerOrientationPreference(diffViewerOrientation: DiffViewerOrientation): void;
    updateSquashMergePreference(shouldSquash: boolean): void;
    updateDeleteSourceBranchPreference(shouldDelete: boolean): void;
    updateTransitionWorkItemsPreference(shouldTransition: boolean): void;
}

export class UserPreferenceSource extends CachedSource implements IUserPreferenceSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private _repositoryContext: GitRepositoryContext;

    constructor(repositoryContext: GitRepositoryContext) {
        super(UserPreferenceSource.DATA_ISLAND_PROVIDER_ID, UserPreferenceSource.DATA_ISLAND_CACHE_PREFIX);

        this._repositoryContext = repositoryContext;
    }

    public getPreferencesAsync(): Q.Promise<VersionControlUserPreferences> {
        return Q.Promise<VersionControlUserPreferences>((resolve, reject) => {
            this._repositoryContext.getClient().beginGetUserPreferences(
                (preferences: VersionControlUserPreferences) => {
                    if (preferences) {
                        // note that we are cloning the object here to prevent
                        // it from getting updated from other places
                        const result: VersionControlUserPreferences = $.extend({}, preferences);

                        // update wit transitions if they are set for this repo
                        const transitionSticky: boolean = this.fromCache<boolean>("WitTransitionsSticky");
                        if (transitionSticky === false) {
                            result.mergeOptionsTransitionWorkItemsCheckboxMode = MergeOptionsTransitionWorkItemsCheckboxMode.Unchecked;
                        }

                        resolve(result);
                    } else {
                        // return filter default if no previous choice
                        resolve(null);
                    }
                },
                error => {
                    reject(error);
                });
        });
    }

    public setPreferencesAsync(preferences: VersionControlUserPreferences):
        Q.Promise<VersionControlUserPreferences> {
        let deferred = Q.defer<VersionControlUserPreferences>();

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

    public updateActivityOrder(activityOrder: PullRequestActivityOrder): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                if (preferences.pullRequestActivityOrder !== activityOrder) {
                    preferences.pullRequestActivityOrder = activityOrder;
                    this.setPreferencesAsync(preferences).then((preferences) => {

                        // now send telemetry about update
                        let telemetryProperties: { [x: string]: number } = {
                            "action": activityOrder
                        };

                        publishEvent(new TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.PULL_REQUEST_SORT_ACTIVITY_FEATURE,
                            telemetryProperties));
                    }).done();
                }
            })
            .done();
    }

    public addActivityFilter(activityFilter: number): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                this._updateActivityFilter(preferences, preferences.pullRequestActivityFilter | activityFilter);
            })
            .done();
    }

    public removeActivityFilter(activityFilter: number): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                this._updateActivityFilter(preferences, preferences.pullRequestActivityFilter & ~activityFilter);
            })
            .done();
    }

    public setActivityFilter(activityFilter: number): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                this._updateActivityFilter(preferences, activityFilter);
            })
            .done();
    }

    private _updateActivityFilter(preferences: VersionControlUserPreferences, newFilter: number): void {
        if (preferences.pullRequestActivityFilter !== newFilter) {
            preferences.pullRequestActivityFilter = newFilter;
            this.setPreferencesAsync(preferences).then((preferences) => {

                // now send telemetry about update
                let telemetryProperties: { [x: string]: number } = {
                    "action": newFilter
                };

                publishEvent(new TelemetryEventData(
                    CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                    CustomerIntelligenceConstants.PULL_REQUEST_FILTER_ACTIVITY_FEATURE,
                    telemetryProperties));
            }).done();
        }
    }

    public updateActivityDescriptionExpanded(expanded: PullRequestActivityDescriptionExpanded): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                if (preferences.pullRequestActivityDescriptionExpanded !== expanded) {
                    preferences.pullRequestActivityDescriptionExpanded = expanded;
                    this.setPreferencesAsync(preferences).then((preferences) => {

                        // now send telemetry about update
                        let telemetryProperties: { [x: string]: number } = {
                            "action": expanded
                        };

                        publishEvent(new TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.PULL_REQUEST_DESCRIPTION_ACTIVITY_FEATURE,
                            telemetryProperties));
                    }).done();
                }
            })
            .done();
    }

    public updateChangeExplorerOptions(options: ChangeExplorerGridModeChangedEventArgs): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                let changed: boolean = false;

                if (preferences.changeExplorerGridDisplayMode !== options.displayMode && options.displayModeChanged) {
                    preferences.changeExplorerGridDisplayMode = options.displayMode;
                    changed = true;
                }

                if (preferences.changeExplorerGridCommentsMode !== options.commentsMode && options.commentsModeChanged) {
                    preferences.changeExplorerGridCommentsMode = options.commentsMode;
                    changed = true;
                }

                if (changed) {
                    this.setPreferencesAsync(preferences).done();
                }
            })
            .done();
    }

    public updateDiffViewerOrientationPreference(diffViewerOrientation: DiffViewerOrientation): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                if (preferences.diffViewerOrientation !== diffViewerOrientation) {
                    preferences.diffViewerOrientation = diffViewerOrientation;
                    this.setPreferencesAsync(preferences).done();
                }
            })
            .done();
    }

    public updateSummaryDiffViewerOrientationPreference(diffViewerOrientation: DiffViewerOrientation): void {
        this.getPreferencesAsync()
            .then((preferences) => {
                if (preferences.summaryDiffOrientation !== diffViewerOrientation) {
                    preferences.summaryDiffOrientation = diffViewerOrientation;
                    this.setPreferencesAsync(preferences).done();
                }
            })
            .done();
    }

    public updateSquashMergePreference(shouldSquash: boolean): void {
        let mode = shouldSquash ? MergeOptionsSquashMergeCheckboxMode.Checked : MergeOptionsSquashMergeCheckboxMode.Unchecked;

        this.getPreferencesAsync()
            .then((preferences) => {
                if (preferences.mergeOptionsSquashMergeCheckboxMode !== mode) {
                    preferences.mergeOptionsSquashMergeCheckboxMode = mode;
                    this.setPreferencesAsync(preferences).done();
                }
            })
            .done();
    }

    public updateDeleteSourceBranchPreference(shouldDelete: boolean): void {
        let mode = shouldDelete ? MergeOptionsDeleteSourceCheckboxMode.Checked : MergeOptionsDeleteSourceCheckboxMode.Unchecked;

        this.getPreferencesAsync()
            .then((preferences) => {
                if (preferences.mergeOptionsDeleteSourceCheckboxMode !== mode) {
                    preferences.mergeOptionsDeleteSourceCheckboxMode = mode;
                    this.setPreferencesAsync(preferences).done();
                }
            })
            .done();
    }

    public updateTransitionWorkItemsPreference(shouldTransition: boolean): void {
        let mode = shouldTransition ? MergeOptionsTransitionWorkItemsCheckboxMode.Checked : MergeOptionsTransitionWorkItemsCheckboxMode.Unchecked;

        this.getPreferencesAsync()
            .then((preferences) => {
                if (preferences.mergeOptionsTransitionWorkItemsCheckboxMode !== mode) {
                    preferences.mergeOptionsTransitionWorkItemsCheckboxMode = mode;
                    this.setPreferencesAsync(preferences).done();
                }
            })
            .done();
    }
}