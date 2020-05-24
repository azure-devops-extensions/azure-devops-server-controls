import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

// Manages both History and Pushes hub routes

// Commits Hub
export class CommitsHubRoutes {
    public static commitsRoute = "commits";
    public static commitsSearchRouteParam = "_search";
    public static contributionId = "ms.vss-code-web.commits-hub";
}

// Pushes Hub
const pushesHubContributionId = "ms.vss-code-web.pushes-hub";
const pushesHubRouteKey = "pushes"

export class PushesHubRoutes {
    public static pushesRoute = pushesHubRouteKey
    public static pushRoute = pushesHubRouteKey;
    public static contributionId = pushesHubContributionId
    public static pushViewHubId = pushesHubContributionId
}
