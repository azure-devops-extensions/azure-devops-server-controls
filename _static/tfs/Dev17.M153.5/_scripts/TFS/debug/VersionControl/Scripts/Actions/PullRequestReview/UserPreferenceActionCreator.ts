import Q = require("q");
import { autobind } from "OfficeFabric/Utilities";

// hubs
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

// action creators
import { ConflictActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/ConflictActionCreator";

// sources
import { IUserPreferenceSource } from "VersionControl/Scripts/Sources/UserPreferenceSource";
import { FeatureAvailabilitySource } from "Scenarios/Shared/Sources/FeatureAvailabilitySource";

// contracts
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");

export class UserPreferenceActionCreator {
    private _userPreferenceSource: IUserPreferenceSource;
    private _featureAvailabilitySource: FeatureAvailabilitySource;
    private _conflictActionCreator: ConflictActionCreator;

    private _storesHub: StoresHub;
    private _actionsHub: ActionsHub;

    constructor(
        storesHub: StoresHub,
        actionsHub: ActionsHub,
        sourcesHub: SourcesHub,
        conflictActionCreator: ConflictActionCreator
    ) {
        this._storesHub = storesHub;
        this._actionsHub = actionsHub;

        this._userPreferenceSource = sourcesHub.userPreferenceSource;
        this._featureAvailabilitySource = sourcesHub.featureAvailabilitySource;
        this._conflictActionCreator = conflictActionCreator;
    }

    /**
     * Load all of the user's preferences.
     */
    public updateUserPreferences(): void {
        this._actionsHub.userPreferencesUpdating.invoke(null);

        // get initial user preferences and fire associated init actions
        this._userPreferenceSource.getPreferencesAsync()
            .then(prefs => {
                this._actionsHub.userPreferencesUpdated.invoke({
                    preferences: prefs
                });

                // -- note that below we are firing the actions associated with
                // options in the user prefs -- we do this because these are
                // separate events instead of subscriptions to user pref changes

                this._actionsHub.activityFeedOrderUpdated.invoke({
                    order: prefs.pullRequestActivityOrder
                });

                // fire selection change event
                this._actionsHub.squashMergeUpdated.invoke({
                    shouldEnable: prefs.mergeOptionsSquashMergeCheckboxMode === VCWebAccessContracts.MergeOptionsSquashMergeCheckboxMode.Checked
                });

                // fire selection change event
                this._actionsHub.deleteSourceBranchUpdated.invoke({
                    shouldEnable: prefs.mergeOptionsDeleteSourceCheckboxMode === VCWebAccessContracts.MergeOptionsDeleteSourceCheckboxMode.Checked
                });

                // fire selection change event
                this._actionsHub.transitionWorkItemsUpdated.invoke({
                    shouldEnable: prefs.mergeOptionsTransitionWorkItemsCheckboxMode === VCWebAccessContracts.MergeOptionsTransitionWorkItemsCheckboxMode.Checked
                });

                // fire diff viewer changes
                this._actionsHub.diffViewerOrientationUpdated.invoke({
                    orientation: prefs.diffViewerOrientation
                });

                this._actionsHub.summaryDiffViewerOrientationUpdated.invoke({
                    orientation: prefs.diffViewerOrientation
                });

                let options = {
                    //On the new page, we want to ignore commentsMode pref on page load
                    //In the new experience having the filter start out as anything but default was confusing everyone
                    commentsMode: VCWebAccessContracts.ChangeExplorerGridCommentsMode.Default,
                    commentsModeChanged: false,
                    displayMode: prefs.changeExplorerGridDisplayMode,
                    displayModeChanged: true,
                } as ChangeExplorerGridModeChangedEventArgs;

                this._actionsHub.changeExplorerUpdateDisplayOption.invoke({
                    options: options
                });
            })
            .then(undefined, this.raiseError);
    }

    public updateChangeExplorerOptions(
        options: ChangeExplorerGridModeChangedEventArgs,
        shouldUpdatePrefs: boolean = true): void {
        // respond to changing of explorer options
        this._actionsHub.changeExplorerUpdateDisplayOption.invoke({
            options: options
        });

        // update user prefs
        if (shouldUpdatePrefs) {
            this._userPreferenceSource.updateChangeExplorerOptions(options);
        }
    }

    public updateDiffViewerOrientation(
        diffViewerOrientation: VCWebAccessContracts.DiffViewerOrientation,
        shouldUpdatePrefs: boolean = true): void {
        this._actionsHub.diffViewerOrientationUpdated.invoke({
            orientation: diffViewerOrientation
        });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.updateDiffViewerOrientationPreference(diffViewerOrientation);
        }
    }

    public updateSummaryDiffViewerOrientation(
        diffViewerOrientation: VCWebAccessContracts.DiffViewerOrientation,
        shouldUpdatePrefs: boolean = true): void {
        this._actionsHub.summaryDiffViewerOrientationUpdated.invoke({
            orientation: diffViewerOrientation
        });

        if (shouldUpdatePrefs !== false) {
            this._userPreferenceSource.updateSummaryDiffViewerOrientationPreference(diffViewerOrientation);
        }
    }

    public updateSquashMerge(shouldSquash: boolean, 
        shouldUpdatePrefs: boolean = true): void {
        // fire selection change event
        this._actionsHub.squashMergeUpdated.invoke({ shouldEnable: shouldSquash });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.updateSquashMergePreference(shouldSquash);
        }
    }

    public updateDeleteSourceBranch(shouldDelete: boolean,
        shouldUpdatePrefs: boolean = true): void {
        // fire selection change event
        this._actionsHub.deleteSourceBranchUpdated.invoke({ shouldEnable: shouldDelete });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.updateDeleteSourceBranchPreference(shouldDelete);
        }
    }

    public updateTransitionWorkItems(shouldTransition: boolean,
        shouldUpdatePrefs: boolean = true): void {
        // fire selection change event
        this._actionsHub.transitionWorkItemsUpdated.invoke({ shouldEnable: shouldTransition });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.updateTransitionWorkItemsPreference(shouldTransition);
        }
    }

    public updateActivityOrder(activityOrder: number,
        shouldUpdatePrefs: boolean = true): void {
        this._actionsHub.activityFeedOrderUpdated.invoke({
            order: activityOrder
        });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.updateActivityOrder(activityOrder);
        }
    }

    public addActivityFeedFilterType(filterType: number,
        shouldUpdatePrefs: boolean = true): void {
        this._actionsHub.activityFeedFilterAdded.invoke({
            filterType: filterType
        });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.addActivityFilter(filterType);
        }
    }

    public removeActivityFeedFilterType(filterType: number,
        shouldUpdatePrefs: boolean = true): void {
        this._actionsHub.activityFeedFilterRemoved.invoke({
            filterType: filterType
        });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.removeActivityFilter(filterType);
        }
    }

    public setActivityFeedFilterType(filterType: number,
        shouldUpdatePrefs: boolean = true): void {
        this._actionsHub.activityFeedFilterSet.invoke({
            filterType: filterType
        });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.setActivityFilter(filterType);
        }
    }

    public updateActivityFeedDescriptionExpanded(expanded: VCWebAccessContracts.PullRequestActivityDescriptionExpanded,
        shouldUpdatePrefs: boolean = true): void {
        this._actionsHub.activityFeedDescriptionExpanded.invoke({
            expanded: expanded
        });

        if (shouldUpdatePrefs) {
            this._userPreferenceSource.updateActivityDescriptionExpanded(expanded);
        }
    }

    public updateFeatureFlags(featureDefaults: IDictionaryStringTo<boolean>) {
        this._featureAvailabilitySource.getFeatureFlags(featureDefaults)
            .then(features => {
                // fire feature toggle action
                this._actionsHub.setFeatureFlags.invoke({
                    features: features
                });
            });
    }

    public forceUpdatePreferences(): void {
        let prefs = this._storesHub.userPreferencesStore.getPreferences();
        this._userPreferenceSource.setPreferencesAsync(prefs);
    }

    /**
     * Raise an application error. This could be a typical JS error or some text.
     */
    @autobind
    private raiseError(error: any): void {
        this._actionsHub.raiseError.invoke(error);
    }
}