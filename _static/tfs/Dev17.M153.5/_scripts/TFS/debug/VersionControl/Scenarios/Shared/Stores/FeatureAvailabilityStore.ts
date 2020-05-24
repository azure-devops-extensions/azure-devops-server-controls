import { ISetFeatureFlagsPayload } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

/**
 * Data about whether features are enabled or disabled.
 */
export class FeatureAvailabilityStore extends RemoteStore {

    private _enabledFeatures: { [feature: string]: boolean; } = { };

    public getCherryPickFeatureIsEnabled(): boolean {
        return this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlCherryPick] || false;
    }

    public getRevertFeatureIsEnabled(): boolean {
        return this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.SourceControlRevert] || false;
    }

    public getFollowFeatureIsEnabled = (): boolean =>
        this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsFollows] || false;

    public getPullRequestLabelsFeatureIsEnabled(): boolean {
        return this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsLabels] || false;
    }

    public getCommitsTabReplacementIsEnabled(): boolean {
        return this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsCommitsTabReplaced] || false;
    }

    public getNoDefaultTitleIsEnabled(): boolean {
        return this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsNoDefaultTitle] || false;
    }

    public getDraftPullRequestsIsEnabled(): boolean {
        return this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.SourceControlGitPullRequestsDraft] || false;
    }

    public getAllowRetargeting(): boolean {
        return this._enabledFeatures[ServerConstants.FeatureAvailabilityFlags.SourceControlGitPullRequestsRetarget] || false;
    }

    public isFeatureEnabled(featureKey: string) {
        return this._enabledFeatures[featureKey] || false;
    }

    public onFeatureFlagEnabledUpdated = (payload: ISetFeatureFlagsPayload) => {
        const features = payload.features;

        if (this.isLoading()) {
            this._loading = false;
        }

        let wasChanged = false;

        Object.keys(features).forEach(feature => {
            const wasEnabled: boolean = this._enabledFeatures[feature] || false;
            const isEnabled: boolean = features[feature] || false;

            // enable the feature if needed
            this._enabledFeatures[feature] = isEnabled;

            // track whether we changed anything
            if (wasEnabled !== isEnabled) {
                wasChanged = true;
            }
        });

        // bulk send an emit if we changed
        if (wasChanged) {
            this.emitChanged();
        }
    }
}
