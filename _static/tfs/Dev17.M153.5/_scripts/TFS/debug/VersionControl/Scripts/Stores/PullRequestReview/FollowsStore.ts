import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import { ArtifactSubscription } from "Notifications/Services";
import { PullRequestFollowStatus } from "VersionControl/Scripts/PullRequestFollowStatus";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

/**
 * Pull Request follow subscription store
 */
export class FollowsStore extends RemoteStore {
    private _subscription: ArtifactSubscription;
    private _updating: boolean;
    private _featureEnabled: boolean;

    constructor() {
        super();

        this._updating = false;
        this._featureEnabled = false;
        this._subscription = null;
    }

    public onFollowUpdateStarted = (payload: Actions.IFollowArtifactUpdateStartPayload): void => {
        if (this._updating) {
            // already updating
            return;
        }

        this._updating = true;

        this.emitChanged();
    }

    public onFollowSubscriptionUpdated = (payload: Actions.IFollowArtifactUpdatedPayload): void => {
        if (!this._loading && !this._updating) {
            // update start event was not received and not first update
            return;
        }

        this._subscription = payload.subscription;
        this._loading = false;
        this._updating = false;

        this.emitChanged();
    }

    public onFollowSubscriptionDeleted = (payload: Actions.IFollowArtifactUpdatedPayload): void => {
        if (this._loading) {
            // subscription not loaded before deleting
            return;
        }

        if (!this._updating) {
            // update start event was not received
            return;
        }

        this._subscription = null;
        this._updating = false;

        this.emitChanged();
    }

    public static FOLLOWS_FEATURE = ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsFollows;

    public onFeatureFlagsUpdated = (payload: Actions.ISetFeatureFlagsPayload): void => {
        if (typeof payload.features[FollowsStore.FOLLOWS_FEATURE] !== "undefined") {
            this._featureEnabled = payload.features[FollowsStore.FOLLOWS_FEATURE];
            this.emitChanged();
        }
    }

    public getFollowStatus(): PullRequestFollowStatus {
        if (!this._featureEnabled) return PullRequestFollowStatus.Disabled;
        if (this._loading || this._updating) return PullRequestFollowStatus.Loading;
        if (this._subscription) return PullRequestFollowStatus.Followed;
        return PullRequestFollowStatus.NotFollowed;
    }

    public getFollowSubscription(): ArtifactSubscription {
        return this._subscription;
    }
}
