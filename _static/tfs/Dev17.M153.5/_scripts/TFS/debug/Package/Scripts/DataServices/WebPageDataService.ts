import { WebSessionToken } from "VSS/Authentication/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import { Identity, IdentityDescriptor } from "VSS/Identities/Contracts";
import * as Service from "VSS/Service";

import {
    FeedsResult,
    PackageDetailsResult,
    PackagesResult,
    TypeInfo,
    WebPageData
} from "Package/Scripts/Types/WebPage.Contracts";
import { UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { DataProviderConstants } from "Feed/Common/Constants/Constants";

export class HubWebPageDataService extends Service.VssService {
    public getInitialFeedsResult(): FeedsResult {
        return this.getWebPageData().feedsResult;
    }

    public getInitialPackagesResult(): PackagesResult {
        return this.getWebPageData().packagesResult;
    }

    public getInitialPackageDetailsResult(): PackageDetailsResult {
        return this.getWebPageData().packageDetailsResult;
    }

    public getPageSize(): number {
        return this.getWebPageData().pageSize;
    }

    public getBatchOperationPageSize(): number {
        return this.getWebPageData().batchOperationPageSize;
    }

    public isIvyUIEnabled(): boolean {
        return this.getWebPageData().isIvyUIEnabled;
    }

    public isPyPiUIEnabled(): boolean {
        return this.getWebPageData().isPyPiUIEnabled;
    }

    public isPyPiUpstreamEnabled(): boolean {
        return this.getWebPageData().isPyPiUpstreamEnabled;
    }

    public isUPackUIEnabled(): boolean {
        return this.getWebPageData().isUPackUIEnabled;
    }

    public isMavenDeleteUIEnabled(): boolean {
        return this.getWebPageData().isMavenDeleteUIEnabled;
    }

    public isRetentionPoliciesFeatureEnabled(): boolean {
        return this.getWebPageData().isRetentionPoliciesFeatureEnabled;
    }

    public getNpmUpstreamNameConflictFeatureFlag(): boolean {
        return this.getWebPageData().isNpmAllowUpstreamNameConflict;
    }

    public userCanAdministerFeeds(): boolean {
        return this.getWebPageData().userCanAdministerFeeds;
    }

    public userCanCreateFeed(): boolean {
        return this.getWebPageData().userCanCreateFeed;
    }

    public isCollectionUpstreamsEnabled(): boolean {
        return this.getWebPageData().collectionUpstreamsFeatureFlag;
    }

    public isOrganizationUpstreamsEnabled(): boolean {
        return this.getWebPageData().organizationUpstreamsFeatureFlag;
    }

    public isNugetInternalUpstreamsEnabled(): boolean {
        return this.getWebPageData().nuGetInternalUpstreamsFeatureFlag;
    }

    public getDefaultPublicUpstreamSources(): UpstreamSource[] {
        return this.getWebPageData().defaultPublicUpstreamSources;
    }

    public getCollectionBuildIdentity(): Identity {
        return this.getWebPageData().collectionBuildIdentity;
    }

    public getProjectBuildIdentity(): Identity {
        return this.getWebPageData().projectBuildIdentity;
    }

    public getEveryoneGroup(): IdentityDescriptor {
        return this.getWebPageData().everyoneGroup;
    }

    public getCurrentUserDescriptor(): string {
        return this.getWebPageData().currentUserDescriptor;
    }

    public publicAccessMapping(): string {
        return this.getWebPageData().publicAccessMapping;
    }

    public legacyPkgUrl(): string {
        return this.getWebPageData().legacyPkgUrl;
    }

    public getProjectCollectionAdminGroupId(): string {
        return this.getWebPageData().projectCollectionAdminGroupId;
    }

    public retentionPolicyLimits(): { minimumCountLimit: number; maximumCountLimit: number } {
        return {
            minimumCountLimit: this.getWebPageData().retentionPolicyMinimumCountLimit,
            maximumCountLimit: this.getWebPageData().retentionPolicyMaximumCountLimit
        };
    }

    public minimumSnapshotInstanceCount(): number {
        return this.getWebPageData().minimumSnapshotInstanceCount;
    }

    public getOrganizationUrl(): string {
        return this.getWebPageData().enterpriseUrl;
    }

    public getOrganizationName(): string {
        return this.getWebPageData().enterpriseName;
    }

    public getOrganizationSessionToken(): WebSessionToken {
        return this.getWebPageData().organizationSessionToken;
    }

    public isManualUpgradeEnabled(): boolean {
        return this.getWebPageData().isManualUpgradeEnabled;
    }

    public isCustomPublicUpstreamsFeatureEnabled(): boolean {
        return this.getWebPageData().isCustomPublicUpstreamsFeatureEnabled;
    }

    public isPackageMetricsEnabled(): boolean {
        return this.getWebPageData().isPackageMetricsEnabled;
    }

    public isSmartDependenciesEnabled(): boolean {
        return this.getWebPageData().isSmartDependenciesEnabled;
    }

    public isProvenanceEnabled(): boolean {
        return this.getWebPageData().isProvenanceEnabled;
    }

    public IsMultiDomainAuthTokensFeatureFlagEnabled(): boolean {
        return this.getWebPageData().isMultiDomainAuthTokensFeatureFlagEnabled;
    }

    public getUpstreamSourceLimit(): number {
        return this.getWebPageData().upstreamSourceLimit;
    }

    private getWebPageData(): WebPageData {
        const webPageDataService = Service.getService(WebPageDataService);
        return webPageDataService.getPageData<WebPageData>(
            DataProviderConstants.PackageDataProvider,
            TypeInfo.WebPageData
        );
    }
}
