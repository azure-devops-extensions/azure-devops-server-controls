import { ApiResourceLocation } from "VSS/WebApi/Contracts";

import { NuGetHttpClient as NuGetHttpClientBase } from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.WebApi";

export class NuGetHttpClient extends NuGetHttpClientBase {
    public static serviceInstanceId = "00000030-0000-8888-8000-000000000000";
    public static nugetAreaId = "nuget";
    public static downloadLocationId = "9E467250-2C61-4278-920B-0C3C618F779F";
    public static packageVersionContentDownloadLocationId = "6EA81B8C-7386-490B-A71F-6CF23C80B388";

    public getDownloadUrl(fileName: string): IPromise<string> {
        const routeValues = {
            area: NuGetHttpClient.nugetAreaId,
            fileName
        };

        return this._beginGetLocation(routeValues.area, NuGetHttpClient.downloadLocationId).then(
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

    public getDownloadPackageVersionContentUrl(
        feedId: string,
        packageName: string,
        packageVersion: string
    ): IPromise<string> {
        const routeValues = {
            area: NuGetHttpClient.nugetAreaId,
            feedId,
            packageName,
            packageVersion
        };

        return this._beginGetLocation(routeValues.area, NuGetHttpClient.packageVersionContentDownloadLocationId).then(
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

    public getServiceIndexUrl(feedId: string, locationId: string): IPromise<string> {
        const routeValues = {
            area: NuGetHttpClient.nugetAreaId,
            feedId
        };

        return this._beginGetLocation(routeValues.area, locationId).then((location: ApiResourceLocation) => {
            return this.getRequestUrl(location.routeTemplate, location.area, location.resourceName, routeValues, null);
        });
    }
}
