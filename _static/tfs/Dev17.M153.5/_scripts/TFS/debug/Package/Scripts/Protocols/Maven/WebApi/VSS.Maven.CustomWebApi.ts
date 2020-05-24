import { ApiResourceLocation } from "VSS/WebApi/Contracts";

import { MavenHttpClient as MavenHttpClientBase } from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.WebApi";

export class MavenHttpClient extends MavenHttpClientBase {
    public static serviceInstanceId = "00000030-0000-8888-8000-000000000000";

    public getEndpointUrl(feedId: string): IPromise<string> {
        const routeValues = {
            area: "maven",
            feed: feedId
        };
        const mavenDefaultResourceId = "f285a171-0df5-4c49-aaf2-17d0d37d9f0e";

        return this._beginGetLocation(routeValues.area, mavenDefaultResourceId).then(
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
