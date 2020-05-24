import * as Q from "q";

import * as WebContext from "VSS/Context";
import * as Service from "VSS/Service";

import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { ArtifactSubscription, FollowsService } from "Notifications/Services";
import { FeedFollowsService } from "Package/Scripts/DataServices/FeedFollowsService";

export class FollowsDataService extends Service.VssService {
    public getFollowState(packageSummary: Package, feed: Feed): IPromise<ArtifactSubscription> {
        if (!packageSummary || !feed) {
            return Q.reject();
        }

        const followsService: FollowsService = Service.getService<FollowsService>(FeedFollowsService);
        const artifact: ArtifactSubscription = FollowsDataService.getPackageArtifactSubscription(
            packageSummary,
            feed,
            0
        );

        if (!artifact) {
            return Q.reject();
        }

        const subscriberId = WebContext.getDefaultWebContext().user.id;
        return followsService.getSubscription(artifact, subscriberId);
    }

    public setFollowState(
        packageSummary: Package,
        feed: Feed,
        follow: boolean,
        subscriptionId: number
    ): IPromise<ArtifactSubscription> {
        if (!packageSummary || !feed) {
            return Q.reject();
        }

        const followsService: FollowsService = Service.getService<FollowsService>(FeedFollowsService);
        const artifact: ArtifactSubscription = FollowsDataService.getPackageArtifactSubscription(
            packageSummary,
            feed,
            subscriptionId
        );

        if (!artifact) {
            return Q.reject();
        }

        if (follow) {
            return followsService.followArtifact(artifact);
        } else {
            return followsService.unfollowArtifact(artifact);
        }
    }

    // subscriptionId 0 is none or unknown
    private static getPackageArtifactSubscription(
        packageSummary: Package,
        feed: Feed,
        subscriptionId: number
    ): ArtifactSubscription {
        let artifactId: string;
        if (feed.view) {
            artifactId = feed.id + "@" + feed.view.id + "/" + packageSummary.id;
        } else {
            artifactId = feed.id + "/" + packageSummary.id;
        }

        const followArtifact: ArtifactSubscription = {
            subscriptionId,
            artifactId,
            artifactType: "Package"
        };

        return followArtifact;
    }
}
