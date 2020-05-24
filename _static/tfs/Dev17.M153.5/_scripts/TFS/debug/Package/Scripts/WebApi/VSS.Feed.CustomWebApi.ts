import { ApiResourceLocation } from "VSS/WebApi/Contracts";

import { CommonConstants } from "Feed/Common/Constants/Constants";
import { FeedHttpClient as FeedHttpClientBase } from "Package/Scripts/WebApi/VSS.Feed.WebApi";

export class FeedHttpClient extends FeedHttpClientBase {
    public static badgeLocationId = "61d885fd-10f3-4a55-82b6-476d866b673f";

    public getBadgeUrl(feedId: string, packageId: string): IPromise<string> {
        const routeValues = {
            feedId,
            packageId
        };

        return this._beginGetLocation(CommonConstants.FeatureArea, FeedHttpClient.badgeLocationId).then(
            (location: ApiResourceLocation) => {
                return this.getRequestUrl(
                    location.routeTemplate,
                    location.area,
                    location.resourceName,
                    routeValues,
                    null
                );
            }
        );
    }
}
