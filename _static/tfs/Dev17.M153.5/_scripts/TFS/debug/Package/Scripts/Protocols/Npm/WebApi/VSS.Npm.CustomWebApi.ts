import { ApiResourceLocation } from "VSS/WebApi/Contracts";

import { NpmHttpClient as NpmHttpClientBase } from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.WebApi";

export class NpmHttpClient extends NpmHttpClientBase {
    public static readonly serviceInstanceId = "00000030-0000-8888-8000-000000000000";
    private static readonly area = "npm";
    private static readonly contentPackageResourceId = "75caa482-cb1e-47cd-9f2c-c048a4b7a43e";

    public getEndpointUrl(feedId: string, locationId: string): IPromise<string> {
        const routeValues = {
            area: NpmHttpClient.area,
            feedId
        };

        return this._beginGetLocation(routeValues.area, locationId).then((location: ApiResourceLocation) => {
            return this.getRequestUrl(location.routeTemplate, location.area, location.resourceName, routeValues, null);
        });
    }

    public getDownloadContentUrl(feedId: string, packageName: string, packageVersion: string): IPromise<string> {
        const routeValues = {
            feedId,
            area: NpmHttpClient.area,
            packageName,
            packageVersion
        };

        return this._beginGetLocation(routeValues.area, NpmHttpClient.contentPackageResourceId).then(
            (location: ApiResourceLocation) => {
                return this.getRequestUrl(location.routeTemplate, location.area, location.resourceName, routeValues);
            }
        );
    }
}
