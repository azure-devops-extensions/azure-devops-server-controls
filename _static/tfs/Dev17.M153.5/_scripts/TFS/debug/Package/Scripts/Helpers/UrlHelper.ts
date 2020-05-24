import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { getPageContext } from "VSS/Context";
import * as Locations from "VSS/Locations";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { combineUrl, isAbsoluteUrl, Uri } from "VSS/Utils/Url";

import { CommonConstants, FeedServiceInstanceId, HubActionStrings, SettingsPivotKeys, PackageDetailsPivot } from "Feed/Common/Constants/Constants";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export function getVersionedContentUrl(contentFileName: string): string {
    return Locations.urlHelper.getVersionedContentUrl(contentFileName, FeedServiceInstanceId);
}

export function getPackageDependencyUrl(
    feedName: string,
    packageName: string,
    protocolType: string
): string {
    const url: string = Locations.urlHelper.getMvcUrl({
        area: CommonConstants.FeatureArea,
        queryParams: {
            feed: feedName,
            package: packageName,
            version: null,
            protocolType: protocolType
        }
    } as Locations.MvcRouteOptions);

    const packageUrl: Uri = Uri.parse(url);
    packageUrl.addQueryParam("_a", HubActionStrings.ViewPackage);
    packageUrl.addQueryParam("view", PackageDetailsPivot.VERSIONS);
    return packageUrl.absoluteUri;
}

export function getPackageDetailsPageUrl(
    feedName: string,
    pkg: Package,
    version: string,
    isRecycleBin: boolean = false
): string {
    const versionFound: boolean = pkg.versions.some(v => v.version === version);
    const selectedVersion: string = versionFound ? version : pkg.versions[0].version;
    const url: string = Locations.urlHelper.getMvcUrl({
        area: CommonConstants.FeatureArea,
        queryParams: {
            feed: feedName,
            package: pkg.name,
            version: selectedVersion,
            protocolType: pkg.protocolType
        }
    } as Locations.MvcRouteOptions);

    const packageUrl: Uri = Uri.parse(url);
    packageUrl.addQueryParam("_a", isRecycleBin ? HubActionStrings.RecycleBinPackage : HubActionStrings.ViewPackage);
    return packageUrl.absoluteUri;
}

export function getLatestPackageDetailsPageUrl(
    feedId: string,
    pkg: Package,
    viewId: string = null,
    preferRelease: string = null
): string {
    if (viewId != null) {
        feedId = Utils_String.format("{0}@{1}", feedId, viewId);
    }

    const url: string = Locations.urlHelper.getMvcUrl({
        area: CommonConstants.FeatureArea,
        queryParams: {
            feed: feedId,
            package: pkg.id,
            preferRelease
        },
        level: NavigationContextLevels.Collection // ProjectCollection level
    } as Locations.MvcRouteOptions);

    const packageUrl: Uri = Uri.parse(url);
    packageUrl.addQueryParam("_a", HubActionStrings.ViewPackage);
    return packageUrl.absoluteUri;
}

export function resolveUri(relativeOrAbsoluteUri: string): string {
    if (isAbsoluteUrl(relativeOrAbsoluteUri)) {
        return relativeOrAbsoluteUri;
    }

    let uri: Uri;

    const webPageDataService = Service.getLocalService(HubWebPageDataService);
    const publicAccessMapping = webPageDataService.publicAccessMapping();
    if (publicAccessMapping != null) {
        uri = Uri.parse(publicAccessMapping);
    } else {
        uri = Uri.parse(getPageContext().webContext.account.uri);
    }

    // We are only interested in scheme, host, and port
    uri.path = Utils_String.empty;
    uri.queryString = Utils_String.empty;
    uri.hashString = Utils_String.empty;

    return combineUrl(uri.absoluteUri, relativeOrAbsoluteUri);
}

export function getPermissionSettingsUrl(feedName: string): string {
    const url: string = Locations.urlHelper.getMvcUrl({
        area: CommonConstants.FeatureArea,
        queryParams: {
            feed: feedName,
            view: SettingsPivotKeys.permissions,
            _a: HubActionStrings.Settings
        }
    } as Locations.MvcRouteOptions);

    return resolveUri(url);
}
