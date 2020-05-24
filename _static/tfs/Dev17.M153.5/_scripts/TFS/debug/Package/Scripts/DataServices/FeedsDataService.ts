import * as Service from "VSS/Service";

import {
    Feed,
    FeedPermission,
    FeedRetentionPolicy,
    FeedView,
    MetricType,
    Package,
    PackageVersion,
    PackageVersionDescriptor
} from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import * as VSS_Feed_Contracts from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { FeedHttpClient } from "Package/Scripts/WebApi/VSS.Feed.CustomWebApi";
import { FeedEditDialogReleaseViews_ReleaseViewNameErrorAlphanumeric } from "Feed/Common/Resources";

export class FeedsDataService extends Service.VssService {
    public getFeedPermissionsAsync(
        feed: Feed,
        includeIds?: boolean,
        excludeInheritedPermissions?: boolean,
        identityDescriptors?: string
    ): IPromise<FeedPermission[]> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.getFeedPermissions(feed.id, includeIds, excludeInheritedPermissions, identityDescriptors);
    }

    public setFeedPermissionsAsync(feedId: string, feedPermissions: FeedPermission[]): IPromise<FeedPermission[]> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.setFeedPermissions(feedPermissions, feedId);
    }

    public getFeedViewPermissionsAsync(
        feed: Feed,
        viewId: string,
        includeIds?: boolean,
        excludeInheritedPermissions?: boolean,
        identityDescriptors?: string
    ): IPromise<FeedPermission[]> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.getFeedPermissions(
            feed.id + "@" + viewId,
            includeIds,
            excludeInheritedPermissions,
            identityDescriptors
        );
    }

    public async setFeedViewPermissionsAsync(
        feedId: string,
        viewId: string,
        feedPermissions: FeedPermission[]
    ): Promise<FeedPermission[]> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.setFeedPermissions(feedPermissions, feedId + "@" + viewId);
    }

    public async getFeedViewsAsync(feed: Feed): Promise<FeedView[]> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.getFeedViews(feed.id);
    }

    public getFeedViewAsync(feedId: string, viewId: string): IPromise<FeedView> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.getFeedView(feedId, viewId);
    }

    public updateFeedAsync(feed: Feed): IPromise<Feed> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.updateFeed(feed, feed.id);
    }

    public createFeed(feed: Feed): IPromise<Feed> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.createFeed(feed);
    }

    public getFeed(feedId: string): IPromise<Feed> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.getFeed(feedId, true /* includeDeletedUpstreams */);
    }

    public async deleteFeedAsync(feedId: string): Promise<void> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.deleteFeed(feedId);
    }

    public async createFeedViewAsync(feedId: string, view: FeedView): Promise<FeedView> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.createFeedView(view, feedId);
    }

    public async updateFeedViewAsync(feedId: string, view: FeedView, viewId: string): Promise<FeedView> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.updateFeedView(view, feedId, viewId);
    }

    public async deleteFeedViewAsync(feedId: string, viewId: string): Promise<void> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.deleteFeedView(feedId, viewId);
    }

    public async getFeedRetentionPolicy(feedId: string): Promise<FeedRetentionPolicy> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.getFeedRetentionPolicies(feedId);
    }

    public async setFeedRetentionPolicyAsync(
        feedId: string,
        retentionPolicy: FeedRetentionPolicy
    ): Promise<FeedRetentionPolicy> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.setFeedRetentionPolicies(retentionPolicy, feedId);
    }

    public async deleteFeedRetentionPolicy(feedId: string): Promise<FeedRetentionPolicy> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        await feedHttpClient.deleteFeedRetentionPolicies(feedId);
        return null;
    }

    public async getPackageBadgeUrl(feedId: string, packageId: string): Promise<string> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.getBadgeUrl(feedId, packageId);
    }

    public async updateCapability(feedId: string, capabilities: VSS_Feed_Contracts.FeedCapabilities): Promise<void> {
        const feedHttpClient = Service.getClient<FeedHttpClient>(FeedHttpClient);
        return feedHttpClient.updateCapability(capabilities, feedId);
    }

    /**
     * Should not be used directly other than PackageHubDataService which filters packages by enabled protocol
     */
    public getPackagesAsync(
        feedId: string,
        protocolType: string,
        top: number,
        skip: number,
        includeDeleted: boolean,
        isListed: boolean,
        packageNameQuery: string = null,
        includeDescription: boolean = false,
        directUpstreamId?: string
    ): IPromise<Package[]> {
        if (packageNameQuery === "") {
            packageNameQuery = null;
        }

        const feedHttpClient = Service.getClient(FeedHttpClient);
        return feedHttpClient.getPackages(
            feedId,
            protocolType, // ProtocolType
            packageNameQuery,
            null, // NormalizedPackageName
            null, // IncludeUrls,
            null, // IncludeAllVersions
            isListed,
            null, // GetTopPackageVersions
            null, // IsRelease
            includeDescription,
            top,
            skip,
            includeDeleted,
            null, // isCached
            directUpstreamId
        );
    }

    public getPackageAsync(feedId: string, packageId: string, includeDescription?: boolean): IPromise<Package> {
        const feedHttpClient = Service.getClient(FeedHttpClient);
        return feedHttpClient.getPackage(
            feedId,
            packageId,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            includeDescription
        );
    }

    public getPackageVersionAsync(
        feedId: string,
        packageId: string,
        versionId: string,
        isListed: boolean,
        isDeleted: boolean
    ): IPromise<PackageVersion> {
        const feedHttpClient = Service.getClient(FeedHttpClient);
        const includeUrls = null;
        return feedHttpClient.getPackageVersion(feedId, packageId, versionId, includeUrls, isListed, isDeleted);
    }

    public getPackageVersionsAsync(
        feedId: string,
        packageId: string,
        isListed: boolean,
        isDeleted: boolean
    ): IPromise<PackageVersion[]> {
        const feedHttpClient = Service.getClient(FeedHttpClient);
        const includeUrls = null;
        return feedHttpClient.getPackageVersions(feedId, packageId, includeUrls, isListed, isDeleted);
    }
}
