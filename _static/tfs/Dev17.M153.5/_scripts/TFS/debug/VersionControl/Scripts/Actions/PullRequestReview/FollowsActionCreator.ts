import { autobind } from "OfficeFabric/Utilities";
import { ActionsHub, INavigationState } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { INavigationActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/INavigationActionCreator";
import { IPullRequestDetailSource } from "VersionControl/Scripts/Sources/PullRequestDetailSource";
import { NavigationActionCreator } from "./NavigationActionCreator";
import { NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

export class FollowsActionCreator {
    private _pullRequestDetailSource: IPullRequestDetailSource;
    private _tfsContext: TfsContext;
    private _storeHub: StoresHub;
    private _actionsHub: ActionsHub;

    public constructor(tfsContext: TfsContext, storesHub: StoresHub, actionsHub: ActionsHub, sourcesHub: SourcesHub) {
        this._pullRequestDetailSource = sourcesHub.pullRequestDetailSource;
        this._tfsContext = tfsContext;
        this._storeHub = storesHub;
        this._actionsHub = actionsHub;
    }

    public queryFollowSubscription(artifactId: string) {
        let pureArtifactId = this._getToolSpecificId(artifactId);

        this._actionsHub.followPullRequestUpdateStart.invoke({ artifactId: pureArtifactId });

        this._pullRequestDetailSource.queryPullRequestFollowSubscription(pureArtifactId)
            .then((subscription) => {
                this._actionsHub.followPullRequestSubscriptionUpdated.invoke({ subscription: subscription });

                var navigationState: INavigationState = NavigationActionCreator.getState();
                if (navigationState.unfollow) {
                    let navigationActionCreator = ServiceRegistry.getService(INavigationActionCreator);
                    if (navigationActionCreator) {

                        //remove the unfollow parameter from the URL
                        navigationState.unfollow = null;
                        navigationActionCreator.navigateWithState(navigationState, true);

                        if (subscription) {
                            this.unfollow(artifactId, true);
                        }
                        else {
                            this._showSuccessMessage(VCResources.PRAlreadyNotFollow);
                        }
                    }
                }
            });
    }

    @autobind
    public follow(artifactId: string, notify: boolean = false) {
        let pureArtifactId = this._getToolSpecificId(artifactId);

        this._actionsHub.followPullRequestUpdateStart.invoke({ artifactId: pureArtifactId });

        this._pullRequestDetailSource.followPullRequest(pureArtifactId)
            .then((subscription) => {
                this._actionsHub.followPullRequestSubscriptionUpdated.invoke({ subscription: subscription });

                if (notify) {
                    this._showSuccessMessage(VCResources.PRFollowSuccess);
                }
            });
    }

    @autobind
    public unfollow(artifactId: string, notify: boolean = false) {
        let pureArtifactId = this._getToolSpecificId(artifactId);

        this._actionsHub.followPullRequestUpdateStart.invoke({ artifactId: pureArtifactId });

        let subscription = this._storeHub.followsStore.getFollowSubscription();
        this._pullRequestDetailSource.unfollowPullRequest(subscription)
            .then((subscription) => {
                this._actionsHub.followPullRequestSubscriptionDeleted.invoke({ subscription: subscription });

                if (notify) {
                    this._showSuccessMessage(VCResources.PRUnfollowSuccess);
                }
            });
    }

    public isMailSettingsEnabled(): boolean {
        return this._tfsContext.configuration && this._tfsContext.configuration.getMailSettings().enabled;
    }

    // Extract last part from artifactId url that represents toolSpecificId
    // artifactId example: vstfs:///Git/PullRequestId/5f7a502e-45cc-4522-8cc9-d3971416e523%2f87298c92-124a-4375-93df-922d4fcbe583%2f3
    private _getToolSpecificId(artifactId: string): string {
        let lastDelimiter = artifactId.lastIndexOf("/");
        return artifactId.substring(lastDelimiter + 1);
    }

    private _showSuccessMessage(message: string): void {
        this._actionsHub.raiseNotification.invoke({
            message,
            type: NotificationType.success
        });
    }
}
