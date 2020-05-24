import * as Store from "VSS/Flux/Store";
import { State } from "VSS/Flux/Component";

import { announce, ProgressAnnouncer } from "VSS/Utils/Accessibility";
import { HostNavigationService } from "VSS/SDK/Services/Navigation";
import * as NavigationService from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";
import * as StringUtils from "VSS/Utils/String";
import * as Search from "VSS/Search";
import * as Utils_String from "VSS/Utils/String";
import { IFilterState } from "VSSUI/Utilities/Filter";

import { autobind, findIndex } from "OfficeFabric/Utilities";

import * as Actions from "Package/Scripts/Actions/Actions";
import {
    buildAnnouncementPackageFilterResults,
    buildAnnouncementListedStatusChangedForPackageVersion
} from "Package/Scripts/Helpers/AccessibilityHelper";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import {
    FeedView,
    MetricType,
    Package,
    PackageMetrics,
    PackageVersion,
    PackageVersionDescriptor,
    Metric
} from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { Feed, MinimalPackageVersion } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { HubActionStrings, PerfScenarios, CiConstants, Exceptions } from "Feed/Common/Constants/Constants";
import { IError } from "Feed/Common/Types/IError";
import { IHubState, HubAction, HubStateHelpers } from "Package/Scripts/Types/IHubState";
import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";
import * as NpmContracts from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";
import { NpmDataService } from "Package/Scripts/Protocols/Npm/NpmDataService";
import { NpmBatchOperationType } from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";
import { NuGetDataService } from "Package/Scripts/Protocols/NuGet/NuGetDataService";
import {
    NuGetPackagesBatchRequest,
    NuGetBatchOperationType
} from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.Contracts";
import { PackageDetailsRetrievalResult } from "Package/Scripts/Types/WebPage.Contracts";
import {
    IPackagePayload,
    IPackagePromotedPayload,
    IPackageListedStatusChangedPayload,
    IPackageListedPayload,
    IPackageDeletedPayload,
    IPackageVersionSelectedPayload,
    IPackageDeprecatedPayload,
    IMultiCommandPayload,
    IFeedRetentionPolicyUpdatedPayload,
    IPackageDependencySelectedPayload
} from "Package/Scripts/Common/ActionPayloads";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { isV2Feed } from "Package/Scripts/Helpers/FeedCapabilityHelper";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { FilterByEnabledProtocolDataService } from "Package/Scripts/DataServices/FilterByEnabledProtocolDataService";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { PackageModifiedCache } from "Package/Scripts/Common/PackageModifiedCache";
import * as PackageResources from "Feed/Common/Resources";
import * as PermissionHelper from "Package/Scripts/Helpers/PermissionHelper";
import { SettingsDataService } from "Package/Scripts/DataServices/SettingsDataService";
import { FollowsDataService } from "Package/Scripts/DataServices/FollowsDataService";
import { PackageFilterBarConstants, PackageDetailsPivot } from "Feed/Common/Constants/Constants";
import { RecycleBinDataService } from "Package/Scripts/DataServices/RecycleBinDataService";
import { ProtocolProvider } from "Package/Scripts/Protocols/ProtocolProvider";
import { SettingsActions } from "Package/Scripts/Actions/SettingsActions";
import { IPackageFollowState } from "Package/Scripts/Types/IPackageFollowState";

// tslint:disable:interface-name
export interface PackageState extends State {
    isLoading: boolean;
    isPackageModifiedLoading: boolean;
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    selectedFeed: Feed;
    selectedPackage: Package;
    selectedVersion: PackageVersion;
    feedViews: FeedView[];
    updatedPackageIds: string[];
    packageFollowState: IPackageFollowState;
    messageBarText: string;
    selectedVersions: PackageVersion[];
    /**
     * A map of Package ID (Guid) to boolean, indicating whether the package retention warning
     * message has been dismissed (exists and true) or not (undefined or false)
     */
    retentionMessageSuppressions: IDictionaryStringTo<boolean>;
    /**
     * List of version to display in grid after filtering
     * When filtering is cleared this will be same as selectedPackage.versions
     */
    filteredVersions: MinimalPackageVersion[];
    retentionPoliciesEnabled: boolean;
    smartDependenciesEnabled: boolean;
    provenanceEnabled: boolean;
    showCreateBadgePanel: boolean;
    showPromoteDialog: boolean;
    packageMetrics: PackageMetrics;
}

class PackageVersionSearchAdapter extends Search.SearchAdapter<MinimalPackageVersion> {
    constructor(private store: PackageStore) {
        super();
    }

    public createSearchableObjects(): Array<Search.SearchableObject<MinimalPackageVersion>> {
        const pkg = this.store.getPackageState().selectedPackage;
        let results: Array<Search.SearchableObject<MinimalPackageVersion>> = [];

        if (pkg && pkg.versions) {
            let index = 0;
            results = pkg.versions.map((version: MinimalPackageVersion) => {
                const terms = version.views.map(view => "@" + view.name).concat(version.version);
                // We record the initial index position here, because we want to preserve the
                // server-generated sort order, rather than doing semantic-version sorting
                // in the client
                version.index = index++;
                return new Search.SearchableObject(version, terms);
            });
        }

        this._created = true;
        return results;
    }

    public addMoreItems(
        addItemsCallback: (items: Array<Search.SearchableObject<MinimalPackageVersion>>) => void,
        searchCallback: () => void
    ): void {
        addItemsCallback(this.createSearchableObjects());
        searchCallback();
    }

    public handleClear(): void {
        this._created = false;
    }

    public isDataSetComplete(): boolean {
        return this._created;
    }

    public handleResults(results: MinimalPackageVersion[], finished: boolean, query?: string): void {
        return;
    }

    public handleError(message: string): void {
        return;
    }

    private _created: boolean = false;
}

export class PackageStore extends Store.Store {
    // ***Note***: There is some violation of the 'single-direction' flow in this store.
    // Specifically, the action handlers for operations invoked from the GeneralDialog
    // component need to invoke an action to close the dialog once they have finished
    // handling the Action.
    // We will be moving the processing to 'action-creators' and making the store's simpler.
    // At that point, this undesirable pattern will be removed. In the meantime, don't
    // perpetuate this pattern any further - see saponnu or philho if you feel you need to.

    constructor(state: IHubState, getSelectedFeedDelegate: () => Feed, getFeedViewsDelegate: () => FeedView[]) {
        super();
        this._getSelectedFeedDelegate = getSelectedFeedDelegate;
        this._getFeedViewsDelegate = getFeedViewsDelegate;

        this._feedsDataService = Service.getLocalService(FeedsDataService);
        this._webPageDataService = Service.getLocalService(HubWebPageDataService);
        this._recycleBinDataService = Service.getLocalService(RecycleBinDataService);
        this._filterByEnabledProtocolDataService = Service.getLocalService(FilterByEnabledProtocolDataService);

        this._currentState = {
            updatedPackageIds: [],
            showCreateBadgePanel: false,
            retentionMessageSuppressions: {},
            // Feature flags
            retentionPoliciesEnabled: this._webPageDataService.isRetentionPoliciesFeatureEnabled(),
            smartDependenciesEnabled: this._webPageDataService.isSmartDependenciesEnabled(),
            provenanceEnabled: this._webPageDataService.isProvenanceEnabled(),
            packageFollowState: {
                isPackageFollowed: false,
                isFollowStateLoaded: false,
                subscriptionId: 0
            }
        } as PackageState;

        this.setSelectedFeed();
        this.setFeedViews();

        if (
            state.action === HubActionStrings.ViewPackage &&
            this._currentState.selectedFeed.upstreamEnabled === false &&
            !!state.upstreamSource
        ) {
            Actions.ErrorEncountered.invoke({
                message: PackageResources.Error_UpstreamSourcesNotEnabled
            } as IError);
        }

        const hubAction = HubStateHelpers.getHubAction(state.action);
        if (hubAction === HubAction.Package || hubAction === HubAction.RecycleBinPackage) {
            this._initializePackageDetailsData();
        }

        this._initializeProtocolMap();
        this._initializeActionListeners();
        this._initializeSearch();
        this._getFollowState();
    }

    public setHubState(action: string, state: IHubState): void {
        switch (HubStateHelpers.getHubAction(action)) {
            case HubAction.CreateFeed:
            case HubAction.Settings:
            case HubAction.Feed:
            case HubAction.RecycleBin:
                break;
            case HubAction.Package:
            case HubAction.RecycleBinPackage:
                this._handleDirectPackageSelectionAction(state);
                break;
            default:
                // Error is handled be the feed store
                break;
        }
    }

    public getPackageState(): PackageState {
        return this._currentState;
    }

    public getPackageVersions(filter: IFilterState): MinimalPackageVersion[] {
        if (!this._versionsFetched) {
            return [];
        }

        if (this._currentState.filteredVersions == null) {
            this._currentState.filteredVersions = this._currentState.selectedPackage.versions;
        }

        return this._currentState.filteredVersions;
    }

    public getRecycleBinPackageVersions(): MinimalPackageVersion[] {
        if (this._recycleBinVersionsFetched) {
            // Removing packages which are now restored or permanently deleted
            const tempVersions = this._currentState.selectedPackage.versions;

            for (let i = 0; i < tempVersions.length; i++) {
                if (!tempVersions[i].isDeleted) {
                    tempVersions.splice(i, 1);
                    i--;
                }
            }

            return tempVersions;
        } else {
            return [];
        }
    }

    private _initializeActionListeners(): void {
        Actions.PackageDependencySelected.addListener((payload: IPackageDependencySelectedPayload) =>
            this._handlePackageDependencySelectedAction(payload)
        );
        Actions.PackageSelected.addListener((packageSummary: Package) =>
            this._handlePackageSelectedAction(packageSummary)
        );
        RecycleBinActions.PackageSelected.addListener((packageSummary: Package) =>
            this._handleRecycleBinPackageSelectedAction(packageSummary)
        );
        Actions.PackageVersionSelected.addListener((payload: IPackageVersionSelectedPayload) =>
            this._handlePackageVersionSelectedAction(payload)
        );
        Actions.PackageModified.addListener((packagePayload: IPackagePayload) =>
            this._handlePackageVersionModifiedAction(packagePayload)
        );
        Actions.PackageVersionPromoted.addListener((payload: IPackagePromotedPayload) =>
            this._handlePackageVersionPromotedAction(payload)
        );
        Actions.PackageVersionDeprecated.addListener((payload: IPackageDeprecatedPayload) =>
            this._handlePackageVersionDeprecatedAction(payload)
        );
        Actions.PackageListedStatusChanged.addListener((payload: IPackageListedStatusChangedPayload) =>
            this._handlePackageListedStatusChangedAction(payload)
        );
        Actions.PackageFollowClicked.addListener((follow: boolean) => this._setFollowState(follow));
        Actions.VersionsPivotSelected.addListener(() => this._handleVersionsPivotSelectedAction());
        RecycleBinActions.VersionsPivotSelected.addListener(() => this._handleRecycleBinVersionsPivotSelectedAction());
        Actions.VersionSelectionChanged.addListener((versions: PackageVersion[]) =>
            this._handleVersionSelectionChangedAction(versions)
        );
        Actions.PackagesDeleted.addListener((payload: IPackageDeletedPayload) =>
            this._handlePackagesDeletedAction(payload)
        );
        Actions.PackageListedChanged.addListener((payload: IPackageListedPayload) =>
            this._handlePackageListedChangedAction(payload)
        );
        Actions.PackageVersionsFiltersChanged.addListener((filterState: IFilterState) => {
            this.handlePackageVersionsFiltersChanged(filterState);
        });
        SettingsActions.FeedRetentionPolicyUpdated.addListener(this._handleFeedRetentionPolicyUpdated);

        RecycleBinActions.PackagesRestoredToFeed.addListener((payload: IPackageDeletedPayload) =>
            this._handlePackagesRestoredToFeedAction(payload)
        );
        RecycleBinActions.PackagesPermanentDeleted.addListener((payload: IPackageDeletedPayload) =>
            this._handlePackagesPermanentDeletedAction(payload)
        );

        Actions.ToggleCreateBadgePanel.addListener(this._handleToggleCreateBadgePanelAction);
        Actions.TogglePromoteDialog.addListener((payload: boolean) => {
            this._handleTogglePromoteDialogAction(payload);
        });
        Actions.DismissPackageRetentionMessage.addListener(this.handleDismissPackageRetentionMessage);
    }

    private setSelectedFeed(): Feed {
        const feed = this._getSelectedFeedDelegate();
        this._currentState.selectedFeed = feed;
        if (feed != null) {
            this._ensureRetentionPolicyLoaded(feed);
        }

        return feed;
    }

    private setFeedViews(): void {
        this._currentState.feedViews = this._getFeedViewsDelegate();
    }

    private async _ensureRetentionPolicyLoaded(feed: Feed): Promise<Feed> {
        if (
            PermissionHelper.hasAccessToBaseFeed(feed) &&
            this._currentState.retentionPoliciesEnabled &&
            feed.retentionPolicy === void 0
        ) {
            const feedDataService = Service.getService(FeedsDataService);
            try {
                feed.retentionPolicy = await feedDataService.getFeedRetentionPolicy(feed.id);
            } catch (err) {
                const message = `${PackageResources.Error_ErrorLoadingRetentionPolicy} Error: ${err && err.message}`;
                // It should be ok to invoke an action here, since it's on the
                // continuation thread, not the main 'action-invoked' thread
                Actions.ErrorEncountered.invoke({ message });
            }

            if (feed.id === this._currentState.selectedFeed.id) {
                this.emitChanged();
            }
        }

        return feed;
    }

    private _initializePackageDetailsData() {
        const packageDetailsResult = this._filterByEnabledProtocolDataService.getPackageDetailsResult();

        switch (packageDetailsResult.result) {
            case PackageDetailsRetrievalResult.Success:
                this._currentState.selectedPackage = packageDetailsResult.package;
                this._versionIndexBuilt = false;
                this._currentState.selectedVersion = packageDetailsResult.packageVersion;
                this._currentState.packageMetrics = packageDetailsResult.packageMetrics
                    ? packageDetailsResult.packageMetrics
                    : this._getEmptyMetrics(
                          this._currentState.selectedPackage.id,
                          this._currentState.selectedVersion.id,
                          [MetricType.TotalDownloads, MetricType.UniqueUsers] as MetricType[]
                      );
                this._navigateToCurrentPackage();
                break;
            case PackageDetailsRetrievalResult.NotFound:
            case PackageDetailsRetrievalResult.NotFoundWithSamePackageCase:
            case PackageDetailsRetrievalResult.NotFoundWithSameVersionCase:
                const state = NavigationService.getHistoryService().getCurrentState() as IHubState;
                CustomerIntelligenceHelper.publishEvent(CiConstants.PackageLoadError, {
                    ...state,
                    packageDetailsRetrievalResult: packageDetailsResult.result
                });
                Actions.ErrorEncountered.invoke({
                    message: PackageResources.Error_UrlPackageNonFound,
                    link: () => Actions.FeedBreadcrumbSelected.invoke(null),
                    linkText: PackageResources.Error_GoToPackageListLink
                } as IError);
                break;
            case PackageDetailsRetrievalResult.Error:
            default:
                CustomerIntelligenceHelper.publishEvent(CiConstants.PackageLoadError, {
                    ...state,
                    packageDetailsRetrievalResult: packageDetailsResult.result
                });
                Actions.ErrorEncountered.invoke({
                    message: PackageResources.Error_ErrorLoadingPackageDetailsInDataProvider,
                    isCritical: true,
                    details: packageDetailsResult.errorMessage,
                    link: () => Actions.FeedBreadcrumbSelected.invoke(null),
                    linkText: PackageResources.Error_GoToPackageListLink
                } as IError);
                break;
        }
    }

    // replace any guids in the uri with string representations
    private _navigateToCurrentPackage(): void {
        const state: IHubState = NavigationService.getHistoryService().getCurrentState() as IHubState;

        state.feed = this._currentState.selectedFeed.fullyQualifiedName;
        state.package = this._currentState.selectedPackage.name;
        state.version = this._currentState.selectedVersion.version;
        state.protocolType = this._currentState.selectedPackage.protocolType;
        // since version is now set, preferRelease has no meaning and can be cleared from the url
        state.preferRelease = null;
        NavigationService.getHistoryService().updateHistoryEntry(
            HubActionStrings.ViewPackage,
            state,
            true, // Replace history entry
            false, // Don't merge state
            null, // Do not set hub title
            true
        ); // Suppress navigate
    }

    private _initializeProtocolMap(): void {
        this._currentState.protocolMap = ProtocolProvider.getEnabledProtocolTypes();
    }

    private handlePackageVersionsFiltersChanged(filterState: IFilterState): void {
        let searchTerms: string[] = [];
        let keywordSearchTerm = "";
        if (filterState) {
            if (filterState[PackageFilterBarConstants.ViewFilterKey]) {
                // Currently on V1 feeds all cached npm packages are in all views.
                if (
                    isV2Feed(this._currentState.selectedFeed) ||
                    (this._currentState.selectedPackage.isCached !== true &&
                        this._currentState.selectedPackage.versions[0].isCachedVersion !== true)
                ) {
                    searchTerms = searchTerms.concat(filterState[PackageFilterBarConstants.ViewFilterKey].value);
                }
            }
            if (filterState[PackageFilterBarConstants.KeywordFilterKey]) {
                keywordSearchTerm = filterState[PackageFilterBarConstants.KeywordFilterKey].value;
                searchTerms.push(keywordSearchTerm);
            }
        }

        const query = searchTerms.join(" ");

        if (query) {
            if (!this._versionIndexBuilt) {
                this._search.clearStrategyStore();
                this._search.addItems(this._searchAdapter.createSearchableObjects());
                this._versionIndexBuilt = true;
            }
            const results: MinimalPackageVersion[] = this._search.beginSearch(query);

            // Promote any exact match on the query string to the head of the list
            if (keywordSearchTerm) {
                for (let i = 0, len = results.length; i < len; i++) {
                    if (results[i].version === keywordSearchTerm) {
                        const match = results.splice(i, 1)[0];
                        results.unshift(match);
                        break;
                    }
                }
            }
            this._currentState.filteredVersions = results;
        } else {
            this._currentState.filteredVersions = this._currentState.selectedPackage.versions;
        }

        const announcement = buildAnnouncementPackageFilterResults(this._currentState.filteredVersions);
        announce(announcement);

        this.emitChanged();
    }

    private _handlePackageSelectedAction(packageSummary: Package): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.PackageSelected);
        const selectPackageScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.PackageSelected
        );

        this._currentState.selectedPackage = packageSummary;
        this._versionIndexBuilt = false;
        this._currentState.isLoading = true;
        this.setSelectedFeed();
        this.setFeedViews();

        const state: IHubState = NavigationService.getHistoryService().getCurrentState() as IHubState;

        state.package = packageSummary.name;
        state.version = packageSummary.versions[0].version;
        state.protocolType = packageSummary.protocolType;
        NavigationService.getHistoryService().updateHistoryEntry(
            HubActionStrings.ViewPackage,
            state,
            false, // Add new history point
            false, // Don't merge state
            null, // Do not set hub title
            true
        ); // Suppress navigate

        const feed = this._currentState.selectedFeed;
        const feedId = this._getFullyQualifiedFeedId(feed);

        const isDeleted = null;
        const isListed = null;
        this._feedsDataService
            .getPackageVersionAsync(feedId, packageSummary.id, packageSummary.versions[0].id, isListed, isDeleted)
            .then(
                (version: PackageVersion) => {
                    if (
                        feedId === this._getFullyQualifiedFeedId(this._currentState.selectedFeed) &&
                        packageSummary.id === this._currentState.selectedPackage.id
                    ) {
                        this._currentState.selectedVersion = PackageModifiedCache.applyCacheByPackageVersion(
                            version
                        ) as PackageVersion;
                        this._currentState.isLoading = false;

                        const hostNavigationService = new HostNavigationService();
                        hostNavigationService.setWindowTitle(this._getHubTitle());

                        if (this._currentState.updatedPackageIds && this._currentState.updatedPackageIds.length > 0) {
                            Actions.PackageListUpdated.invoke(this._currentState.updatedPackageIds);
                            this._currentState.updatedPackageIds = [];
                        }

                        this.emitChanged();

                        this._getFollowState();
                        selectPackageScenario.end();
                    } else {
                        selectPackageScenario.abort();
                    }

                    return version;
                },
                (error: TfsError) => {
                    selectPackageScenario.abort();
                    this._currentState.isLoading = false;
                    this.emitChanged();

                    let displayMessage = PackageResources.Error_ErrorLoadingPackageDetails;
                    if (error.serverError.typeKey === Exceptions.PackageNotFoundException) {
                        displayMessage = PackageResources.Error_UrlPackageNonFound;
                    }

                    Actions.ErrorEncountered.invoke({
                        message: displayMessage,
                        isCritical: true,
                        details: error.message,
                        link: () => Actions.FeedBreadcrumbSelected.invoke(null),
                        linkText: PackageResources.Error_GoToPackageListLink
                    } as IError);

                    return null;
                }
            )
            .then((version: PackageVersion) => {
                if (version == null) {
                    return;
                }

                const feedId = this._getFullyQualifiedFeedId(feed);
                this._updatePackageVersionMetrics(feedId, packageSummary.id, version.id);
            });

        this._resetPackageVersions();
        this.emitChanged();
    }

    private _handlePackageDependencySelectedAction(payload: IPackageDependencySelectedPayload): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.PackageDependencySelected);
        const selectPackagDependencyScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.PackageDependencySelected
        );

        const dependency = payload.dependency;

        this._currentState.selectedPackage = {
            id: dependency.packageId,
            name: dependency.name,
            normalizedName: dependency.normalizedPackageName,
            protocolType: dependency.protocolType,
            versions: []
        } as Package;
        this._versionIndexBuilt = false;
        this._currentState.isLoading = true;
        this.setSelectedFeed();
        this.setFeedViews();

        const state: IHubState = NavigationService.getHistoryService().getCurrentState() as IHubState;

        state.package = dependency.name;
        state.version = null;
        state.protocolType = dependency.protocolType;
        NavigationService.getHistoryService().updateHistoryEntry(
            HubActionStrings.ViewPackage,
            state,
            false, // Add new history point
            false, // Don't merge state
            null, // Do not set hub title
            true
        ); // Suppress navigate

        const feed = this._currentState.selectedFeed;
        const feedId = this._getFullyQualifiedFeedId(feed);

        const isDeleted = PermissionHelper.isDeleted(feed);
        const isListed = null;
        this._feedsDataService
            .getPackageVersionAsync(feedId, dependency.packageId, dependency.packageVersionId, isListed, isDeleted)
            .then(
                (version: PackageVersion) => {
                    // Only do the following in case the selected package or selected feed haven't changed
                    if (
                        feedId === this._getFullyQualifiedFeedId(this._currentState.selectedFeed) &&
                        dependency.packageId === this._currentState.selectedPackage.id
                    ) {
                        this._currentState.selectedVersion = PackageModifiedCache.applyCacheByPackageVersion(
                            version
                        ) as PackageVersion;
                        this._currentState.isLoading = false;

                        // Update with the version information we just retrieved
                        state.version = this._currentState.selectedVersion.version;

                        const hostNavigationService = new HostNavigationService();
                        hostNavigationService.setWindowTitle(this._getHubTitle());

                        if (this._currentState.updatedPackageIds && this._currentState.updatedPackageIds.length > 0) {
                            Actions.PackageListUpdated.invoke(this._currentState.updatedPackageIds);
                            this._currentState.updatedPackageIds = [];
                        }

                        this.emitChanged();

                        this._getFollowState();
                        selectPackagDependencyScenario.end();
                    } else {
                        selectPackagDependencyScenario.abort();
                    }
                },
                (error: TfsError) => {
                    selectPackagDependencyScenario.abort();
                    this._currentState.isLoading = false;
                    this.emitChanged();

                    let displayMessage = PackageResources.Error_ErrorLoadingPackageDetails;
                    if (error.serverError.typeKey === Exceptions.PackageNotFoundException) {
                        displayMessage = PackageResources.Error_UrlPackageNonFound;
                    }

                    Actions.ErrorEncountered.invoke({
                        message: displayMessage,
                        isCritical: true,
                        details: error.message,
                        link: () => Actions.PackageSelected.invoke(payload.originPackage),
                        linkText: PackageResources.Error_GoBackToPackageLink
                    } as IError);
                }
            );

        this._resetPackageVersions();
        this.emitChanged();
    }

    private _handleRecycleBinPackageSelectedAction(packageSummary: Package): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.RecycleBinPackageSelected);
        const selectPackageScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.RecycleBinPackageSelected
        );

        this._currentState.selectedPackage = packageSummary;
        this._versionIndexBuilt = false;
        this._currentState.isLoading = true;
        const feed = this.setSelectedFeed();
        this.setFeedViews();

        const historyService = NavigationService.getHistoryService();
        const state = {
            feed: this._getFullyQualifiedFeedName(feed),
            package: packageSummary.name,
            version: packageSummary.versions[0].version,
            protocolType: packageSummary.protocolType
        } as IHubState;
        historyService.addHistoryPoint(
            HubActionStrings.RecycleBinPackage,
            state,
            null, // Don't set hub title
            true // Suppress navigation
        );

        this._currentState.selectedVersion = packageSummary.versions[0] as PackageVersion;

        const hostNavigationService = new HostNavigationService();
        hostNavigationService.setWindowTitle(this._getHubTitle());
        this._currentState.isLoading = false;

        selectPackageScenario.end();
        this._resetPackageVersions();
        this.emitChanged();
    }

    private _handlePackageListedStatusChangedAction(payload: IPackageListedStatusChangedPayload) {
        if (payload.packageId && !payload.isDeleted) {
            const index = this._currentState.updatedPackageIds.indexOf(payload.packageId);
            if (index === -1) {
                this._currentState.updatedPackageIds.push(payload.packageId);
            } else {
                this._currentState.updatedPackageIds.splice(index, 1);
            }
        }
    }

    private _handlePackageVersionSelectedAction(payload: IPackageVersionSelectedPayload) {
        CustomerIntelligenceHelper.publishEvent(CiConstants.PackageVersionSelectedNew);
        const selectVersionScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.PackageVersionSelectedNew
        );

        if (this._currentState.selectedVersion.version !== payload.version.version) {
            this._currentState.selectedVersion = PackageModifiedCache.applyCacheByPackageVersion(
                payload.version
            ) as PackageVersion;

            const feedId = this._getFullyQualifiedFeedId(this._currentState.selectedFeed);
            this._updatePackageVersionMetrics(feedId, this._currentState.selectedPackage.id, payload.version.id);

            if (payload.viewName == null) {
                this._currentState.selectedFeed.view = null;
            } else if (payload.viewName) {
                const viewIndex = findIndex(this._currentState.feedViews, (v: FeedView) => v.name == payload.viewName);
                this._currentState.selectedFeed.view = this._currentState.feedViews[viewIndex];
            }

            const state: IHubState = NavigationService.getHistoryService().getCurrentState();
            const hubTitle = this._getHubTitle();
            state.feed = this._getFullyQualifiedFeedName(this._currentState.selectedFeed);
            state.version = payload.version.version;
            NavigationService.getHistoryService().updateHistoryEntry(
                HubActionStrings.ViewPackage,
                state,
                false, // Replace history point
                false, // Don't merge state
                hubTitle, // Hub title
                true
            ); // Suppress navigate

            this.emitChanged();
        }

        selectVersionScenario.end();
    }

    private _updatePackageVersionMetrics(feedId: string, packageId: string, packageVersionId: string) {
        return;
    }

    private _getEmptyMetrics(packageId: string, packageVersionId: string, metricTypes: MetricType[]): PackageMetrics {
        const metricsEnabled = this._webPageDataService.isPackageMetricsEnabled();
        if (!metricsEnabled) {
            return null;
        }
        
        return {
            packageDescriptor: {
                packageId,
                packageVersionId
            } as PackageVersionDescriptor,
            aggregatedMetrics: metricTypes.map((metricType: MetricType) => {
                return {
                    metricType,
                    value: 0
                } as Metric;
            })
        } as PackageMetrics;
    }

    private _handleDirectPackageSelectionAction(hubState: IHubState) {
        CustomerIntelligenceHelper.publishEvent(CiConstants.PackageDirectlyLoaded);

        if (this._currentState.selectedPackage && this._currentState.selectedPackage.name === hubState.package) {
            const newVersionIndex = findIndex(
                this._currentState.selectedPackage.versions,
                v => v.version === hubState.version
            );
            if (newVersionIndex !== -1) {
                this._currentState.selectedVersion = this._currentState.selectedPackage.versions[
                    newVersionIndex
                ] as PackageVersion;
            }
        } else {
            const hostNavigationService = new HostNavigationService();
            hostNavigationService.reload();
        }

        this.emitChanged();
    }

    private _getFullyQualifiedFeedId(feed: Feed): string {
        const viewId = feed.view ? `@${feed.view.id}` : "";
        return `${feed.id}${viewId}`;
    }

    private _getFullyQualifiedFeedName(feed: Feed): string {
        const viewName = feed.view ? `@${feed.view.name}` : "";
        return `${feed.name}${viewName}`;
    }

    private async _handlePackageVersionPromotedAction(payload: IPackagePromotedPayload) {
        // Versions list currently only supports single promote.
        if (this._currentState.selectedVersion) {
            const { selectedFeed, selectedPackage, selectedVersion } = this._currentState;
            const { minimalPackageDetails, promotedView } = payload;
            const protocolType = minimalPackageDetails[0].protocolType;

            const scenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.PackagePromoted
            );

            this._currentState.isLoading = true;
            this.emitChanged();

            try {
                announce(
                    Utils_String.format(
                        PackageResources.PackageVersionPromoted_AnnouncementStart,
                        minimalPackageDetails[0].id,
                        minimalPackageDetails[0].version,
                        promotedView.name
                    )
                );

                const provider = ProtocolProvider.get(protocolType, true);
                await provider.promotePackageVersions(selectedFeed, promotedView, minimalPackageDetails);

                const settingsDataService = Service.getLocalService(SettingsDataService);
                const fullyQualifiedFeedId = Utils_String.format("{0}@{1}", selectedFeed.id, promotedView.id);
                settingsDataService.setMruFullyQualifiedFeedId(fullyQualifiedFeedId);

                const index = findIndex(
                    selectedPackage.versions,
                    version => version.version === minimalPackageDetails[0].version
                );
                selectedPackage.versions[index].views.push(promotedView);
                selectedVersion.views.push(promotedView);
                this.emitChanged();

                // Search must be updated with the new view in case we immediately filter with the view dropdown
                this._search.clearStrategyStore();
                this._search.addItems(this._searchAdapter.createSearchableObjects());

                scenario.end();
                announce(
                    Utils_String.format(
                        PackageResources.PackageVersionPromoted_AnnouncementEnd,
                        minimalPackageDetails[0].id,
                        minimalPackageDetails[0].version,
                        promotedView.name
                    )
                );
            } catch (error) {
                scenario.abort();
                const message = Utils_String.format(PackageResources.Error_PromotionFailedForProtocol, protocolType);
                Actions.ErrorEncountered.invoke({ message, isCritical: true });
            } finally {
                this._currentState.isLoading = false;
                this._handleTogglePromoteDialogAction(false);
            }
        }
    }

    private _handlePackageVersionDeprecatedAction(payload: IPackageDeprecatedPayload): void {
        if (payload.selectedVersions) {
            CustomerIntelligenceHelper.publishEvent(CiConstants.MultiplePackageVersionsDeprecated);
            const deprecateScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.MultiplePackageVersionsDeprecated
            );
            const npmPackageDetails = [];
            payload.selectedVersions.forEach((version: PackageVersion) => {
                npmPackageDetails.push({
                    id: this._currentState.selectedPackage.name,
                    version: version.version
                });
            });

            const npmDataService = Service.getLocalService(NpmDataService);
            const deprecatePackageVersionDetails = {
                data: { message: payload.message } as NpmContracts.BatchDeprecateData,
                operation: NpmBatchOperationType.Deprecate,
                packages: npmPackageDetails
            } as NpmContracts.NpmPackagesBatchRequest;

            let announceStart = PackageResources.NpmDeprecate_ProgressStarted;
            let announceEnd = PackageResources.NpmDeprecate_ProgressEnded;
            let announceError = PackageResources.NpmDeprecate_ProgressFailed;
            if (payload.message == null) {
                announceStart = PackageResources.NpmDeprecate_ProgressEnded_Undeprecate;
                announceEnd = PackageResources.NpmDeprecate_ProgressEnded_Undeprecate;
                announceError = PackageResources.NpmDeprecate_ProgressFailed_Undeprecate;
            }

            const updatePromise = npmDataService
                .updatePackages(deprecatePackageVersionDetails, this._currentState.selectedFeed.id)
                .then(
                    success => {
                        if (payload.selectedVersions) {
                            payload.selectedVersions.forEach((version: PackageVersion) => {
                                version.protocolMetadata.data.deprecated = payload.message;

                                if (this._currentState.selectedVersion.id === version.id) {
                                    this._currentState.selectedVersion.protocolMetadata.data.deprecated =
                                        payload.message;
                                }
                            });

                            this.emitChanged();
                        }

                        Actions.PackageVersionDeprecatedCompleted.invoke({}); // See ***Note*** above
                        deprecateScenario.end();
                    },
                    err => {
                        Actions.PackageVersionDeprecatedCompleted.invoke({}); // See ***Note*** above
                        deprecateScenario.abort();

                        if (err.status === 403) {
                            Actions.ErrorEncountered.invoke({
                                message: PackageResources.Error_ErrorUserUnauthorized,
                                details: err
                            } as IError);
                        } else {
                            Actions.ErrorEncountered.invoke({
                                message: err.message,
                                isCritical: true,
                                details: err
                            } as IError);
                        }
                    }
                );

            ProgressAnnouncer.forPromise(updatePromise, {
                announceStartMessage: announceStart,
                announceEndMessage: announceEnd,
                announceErrorMessage: announceError,
                alwaysAnnounceEnd: true
            });
        } else if (payload.selectedVersion && !payload.selectedPackages) {
            // This is the handling for the single dialog.
            const index = findIndex(
                this._currentState.selectedPackage.versions,
                (v: PackageVersion) => v.id === payload.selectedVersion.id
            );
            const version = this._currentState.selectedPackage.versions[index] as PackageVersion;
            if (version.protocolMetadata && version.protocolMetadata.data) {
                version.protocolMetadata.data.deprecated = payload.message;
            }

            if (version.id === this._currentState.selectedVersion.id) {
                this._currentState.selectedVersion.protocolMetadata.data.deprecated = payload.message;
            }

            this.emitChanged();
        }
    }

    private _handlePackageVersionModifiedAction(packagePayload: IPackagePayload): void {
        this._currentState.isPackageModifiedLoading = false;

        if (
            this._currentState.selectedPackage &&
            this._currentState.selectedPackage.id === packagePayload.packageSummary.id
        ) {
            this._currentState.selectedPackage = packagePayload.packageSummary;
            this._versionIndexBuilt = false;
        }

        const modifiedVersion = packagePayload.packageVersion;
        PackageModifiedCache.packageModifiedCache[modifiedVersion.id] = modifiedVersion;
        if (this._currentState.selectedVersion && this._currentState.selectedVersion.id === modifiedVersion.id) {
            this._currentState.selectedVersion = modifiedVersion;
        }

        this.emitChanged();
    }

    private _getFollowState(): void {
        const followsDataService = Service.getLocalService(FollowsDataService);
        followsDataService.getFollowState(this._currentState.selectedPackage, this._currentState.selectedFeed).then(
            subscription => {
                this._currentState.packageFollowState.isFollowStateLoaded = true;
                if (subscription != null) {
                    this._currentState.packageFollowState.subscriptionId = subscription.subscriptionId;
                    this._currentState.packageFollowState.isPackageFollowed = true;
                } else {
                    this._currentState.packageFollowState.subscriptionId = 0;
                    this._currentState.packageFollowState.isPackageFollowed = false;
                }

                this.emitChanged();
            },
            error => {
                this._currentState.packageFollowState.isFollowStateLoaded = false;
                this._currentState.packageFollowState.subscriptionId = 0;
                this.emitChanged();
            }
        );
    }

    private _setFollowState(follow: boolean) {
        const followsDataService = Service.getLocalService(FollowsDataService);
        followsDataService
            .setFollowState(
                this._currentState.selectedPackage,
                this._currentState.selectedFeed,
                follow,
                this._currentState.packageFollowState.subscriptionId
            )
            .then(
                subscription => {
                    this._currentState.packageFollowState.isFollowStateLoaded = true;
                    this._currentState.packageFollowState.isPackageFollowed = follow;
                    this._currentState.packageFollowState.subscriptionId =
                        subscription != null ? subscription.subscriptionId : 0;
                    this.emitChanged();
                },
                error => {
                    this._currentState.packageFollowState.isFollowStateLoaded = false;
                    this._currentState.packageFollowState.isPackageFollowed = follow;
                    this._currentState.packageFollowState.subscriptionId = 0;
                    this.emitChanged();

                    // retrieve the follow state again
                    this._getFollowState();
                }
            );
    }

    private _handleVersionsPivotSelectedAction() {
        CustomerIntelligenceHelper.publishEvent(CiConstants.PackageVersionsPivotSelected);

        if (!this._versionsFetched) {
            const selectPivotScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.PackageVersionsPivotSelected
            );
            this._currentState.isLoading = true;

            const feed = this._currentState.selectedFeed;
            const packageId = this._currentState.selectedPackage.id;
            const isListed = null;
            const isDeleted = PermissionHelper.isDeleted(feed);
            const feedId = this._getFullyQualifiedFeedId(feed);
            this._feedsDataService
                .getPackageVersionsAsync(feedId, packageId, isListed, isDeleted)
                .then((versions: PackageVersion[]) => {
                    if (
                        feed.id === this._currentState.selectedFeed.id &&
                        packageId === this._currentState.selectedPackage.id
                    ) {
                        this._currentState.selectedPackage.versions = versions;
                        this._versionIndexBuilt = false;
                        this._versionsFetched = true;
                        selectPivotScenario.end();
                    } else {
                        selectPivotScenario.abort();
                    }
                    this._currentState.isLoading = false;
                    this.emitChanged();
                });
        }

        this._currentState.selectedVersions = [];
        this.emitChanged();
    }

    private _handleRecycleBinVersionsPivotSelectedAction(): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.RecycleBinPackageVersionsPivotSelected);
        this._currentState.messageBarText = null;
        if (!this._recycleBinVersionsFetched) {
            const selectPivotScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.RecycleBinPackageVersionsPivotSelected
            );
            this._currentState.isLoading = true;

            const feed = this._currentState.selectedFeed;
            const packageId = this._currentState.selectedPackage.id;
            this._recycleBinDataService.getPackageVersionsAsync(feed.id, packageId).then(
                (versions: PackageVersion[]) => {
                    if (
                        feed.id === this._currentState.selectedFeed.id &&
                        packageId === this._currentState.selectedPackage.id
                    ) {
                        this._currentState.selectedPackage.versions = versions;
                        this._recycleBinVersionsFetched = true;
                        selectPivotScenario.end();
                    } else {
                        selectPivotScenario.abort();
                    }
                    this._currentState.isLoading = false;
                    this.emitChanged();
                },
                (error: Error) => {
                    this._currentState.isLoading = false;
                    selectPivotScenario.abort();
                    Actions.ErrorEncountered.invoke({
                        message: error.message,
                        isCritical: true
                    } as IError);
                }
            );
        }

        this._currentState.selectedVersions = [];
        this.emitChanged();
    }

    private _handleVersionSelectionChangedAction(versions: PackageVersion[]): void {
        this._currentState.selectedVersions = versions;
        this.emitChanged();
    }

    private async _handlePackagesDeletedAction(payload: IPackageDeletedPayload) {
        // This handler only deals with the case where we're invoked on
        // one or more versions of a single package. The handler for deleting
        // package versions across packages is in FeedStore
        if (!payload.selectedVersions || !payload.protocolType) {
            return;
        }

        const feed = this._currentState.selectedFeed;
        const pkg = this._currentState.selectedPackage;
        const versions = payload.selectedVersions;
        const singleVersion = versions.length === 1;

        CustomerIntelligenceHelper.publishEvent(
            singleVersion ? CiConstants.PackageVersionDeleted : CiConstants.MultiplePackageVersionsDeleted
        );
        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            singleVersion ? PerfScenarios.PackageVersionDeleted : PerfScenarios.MultiplePackageVersionsDeleted
        );
        perfScenario.addData({ protocolType: payload.protocolType });

        try {
            const protocol = ProtocolProvider.get(payload.protocolType, /*throwIfMissing*/ true);
            await protocol.deletePackageVersions(feed, pkg, versions);
            this._lieToUserAfterPackageDeletion(payload);
            perfScenario.end();
        } catch (error) {
            perfScenario.abort();
            Actions.ErrorEncountered.invoke(<IError>{
                message: error.message,
                isCritical: true
            });
        } finally {
            this._currentState.selectedVersions = [];
            this.emitChanged();
            Actions.PackageDeletedCompleted.invoke({}); // See ***Note*** above
        }
    }

    private async _handlePackagesRestoredToFeedAction(payload: IMultiCommandPayload) {
        if (!payload.selectedVersions) {
            return;
        }

        const feed = this._currentState.selectedFeed;
        const pkg = this._currentState.selectedPackage;
        const versions = payload.selectedVersions;
        const singleVersion = versions.length === 1;
        let protocol: IPackageProtocol;

        CustomerIntelligenceHelper.publishEvent(
            singleVersion
                ? CiConstants.RecycleBinPackageVersionRestore
                : CiConstants.MultiplePackageVersionsRestoredToFeed
        );
        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            singleVersion
                ? PerfScenarios.RecycleBinPackageVersionRestore
                : PerfScenarios.MultiplePackageVersionsRestoredToFeed
        );

        try {
            this._currentState.isLoading = true;
            this.emitChanged();
            protocol = ProtocolProvider.get(pkg.protocolType, /*throwIfMissing*/ true);
            await protocol.restorePackageVersionsToFeed(feed, pkg, versions);
            this._lieToUserAfterRecycleBinAction(payload, PackageResources.RecycleBinRestoredMessage);
            perfScenario.end();
            if (payload.selectedVersions.length === 1) {
                announce(
                    Utils_String.format(
                        PackageResources.PackageRestored_Announcement_One,
                        payload.selectedVersions[0].version
                    )
                );
            } else {
                announce(
                    Utils_String.format(PackageResources.PackageRestored_Announcement, payload.selectedVersions.length)
                );
            }
        } catch (error) {
            perfScenario.abort();
            if (!protocol) {
                this._currentState.messageBarText = PackageResources.PackageRestoreNotSupportedOnThisProtocol;
                return;
            }
            Actions.ErrorEncountered.invoke({
                message: (error.serverError && error.serverError.reason) || error.message,
                isCritical: true
            });
        } finally {
            this._currentState.isLoading = false;
            this._currentState.selectedVersions = [];
            this.emitChanged();
        }
    }

    private async _handlePackagesPermanentDeletedAction(payload: IMultiCommandPayload): Promise<void> {
        if (!payload.selectedVersions) {
            return;
        }

        const feed = this._currentState.selectedFeed;
        const pkg = this._currentState.selectedPackage;
        const versions = payload.selectedVersions;
        const singleVersion = versions.length === 1;
        let protocol: IPackageProtocol;

        CustomerIntelligenceHelper.publishEvent(
            singleVersion
                ? CiConstants.RecycleBinPackageVersionPermanentDelete
                : CiConstants.MultiplePackageVersionsPermanentDeleted
        );
        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            singleVersion
                ? PerfScenarios.RecycleBinPackageVersionPermanentDelete
                : PerfScenarios.MultiplePackageVersionsPermanentDeleted
        );

        try {
            this._currentState.isLoading = true;
            this.emitChanged();
            protocol = ProtocolProvider.get(pkg.protocolType, /*throwIfMissing*/ true);
            await protocol.permanentlyDeletePackageVersions(feed, pkg, versions);
            this._lieToUserAfterRecycleBinAction(payload, PackageResources.RecycleBinPermanentDeletedMessage);
            perfScenario.end();
        } catch (error) {
            perfScenario.abort();
            if (!protocol) {
                this._currentState.messageBarText = PackageResources.PermanentDeleteNotSupportedOnThisProtocol;
                return;
            }
            Actions.ErrorEncountered.invoke({
                message: StringUtils.format(PackageResources.DeleteDialog_MultiDeleteFailed, pkg.protocolType),
                isCritical: true
            });
        } finally {
            RecycleBinActions.PackagesPermanentDeletedCompleted.invoke({}); // See ***Note*** above
            this._currentState.isLoading = false;
            this._currentState.selectedVersions = [];
            this.emitChanged();
        }
    }

    private _handlePackageListedChangedAction(payload: IPackageListedPayload) {
        if (payload.selectedVersions) {
            CustomerIntelligenceHelper.publishEvent(CiConstants.MultiplePackageVersionsListedUnlisted);
            const unlistScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.MultiplePackageVersionsListedUnlisted
            );
            const nuGetPackageDetails: MinimalPackageDetails[] = [];
            payload.selectedVersions.forEach((version: PackageVersion) => {
                nuGetPackageDetails.push({
                    id: this._currentState.selectedPackage.name,
                    version: version.version
                });
            });

            const nuGetBatchRequest: NuGetPackagesBatchRequest = {
                data: { listed: payload.isListed },
                operation: NuGetBatchOperationType.List,
                packages: nuGetPackageDetails
            };
            const nuGetDataService = Service.getLocalService(NuGetDataService);
            nuGetDataService.updatePackageVersions(nuGetBatchRequest, this._currentState.selectedFeed.id).then(
                () => {
                    // Lie to the user that they were already listed/unlisted
                    this._currentState.selectedVersions.forEach((version: PackageVersion) => {
                        version.isListed = payload.isListed;

                        if (this._currentState.selectedVersion.id === version.id) {
                            this._currentState.selectedVersion.isListed = payload.isListed;
                        }
                    });

                    this.emitChanged();
                    Actions.PackageListedChangedCompleted.invoke({}); // See ***Note*** above

                    const announcement = buildAnnouncementListedStatusChangedForPackageVersion(
                        payload.selectedVersions,
                        payload.isListed
                    );
                    announce(announcement, true);
                    unlistScenario.end();
                },
                error => {
                    Actions.PackageListedChangedCompleted.invoke({}); // See ***Note*** above
                    Actions.ErrorEncountered.invoke({
                        message: error.message
                    } as IError);
                    unlistScenario.abort();
                }
            );
        }
    }

    @autobind
    private _handleToggleCreateBadgePanelAction(openPanel: boolean): void {
        this._currentState.showCreateBadgePanel = openPanel;
        this.emitChanged();
    }

    private _handleTogglePromoteDialogAction(showDialog: boolean) {
        this._currentState.showPromoteDialog = showDialog;
        this.emitChanged();
    }

    @autobind
    private _handleFeedRetentionPolicyUpdated(payload: IFeedRetentionPolicyUpdatedPayload): void {
        if (this._currentState.selectedFeed.id === payload.feedId) {
            this._currentState.selectedFeed.retentionPolicy = payload.retentionPolicy;
            this.emitChanged();
        }
    }

    @autobind
    private handleDismissPackageRetentionMessage(packageId: string) {
        this._currentState.retentionMessageSuppressions[packageId] = true;
    }

    private _lieToUserAfterPackageDeletion(payload: IPackageDeletedPayload): void {
        payload.selectedVersions.forEach((version: PackageVersion) => {
            version.isDeleted = true;
            version.isListed = false;

            if (this._currentState.selectedVersion.id === version.id) {
                this._currentState.selectedVersion.isDeleted = true;
                this._currentState.selectedVersion.isListed = false;
            }
        });
    }

    private _lieToUserAfterRecycleBinAction(payload: IMultiCommandPayload, message: string) {
        payload.selectedVersions.forEach((version: PackageVersion) => {
            version.isDeleted = false;

            if (this._currentState.selectedVersion.id === version.id) {
                this._currentState.selectedVersion.isDeleted = false;
            }
        });

        this._currentState.messageBarText = StringUtils.format(
            message,
            payload.selectedVersions[0].version,
            this._currentState.selectedPackage.name
        );

        // If there is no version left, go back to recycle bin page
        if (!this._currentState.selectedPackage.versions.some(v => v.isDeleted)) {
            const state: IHubState = {
                feed: this._currentState.selectedFeed.fullyQualifiedName
            } as IHubState;

            NavigationService.getHistoryService().updateHistoryEntry(
                HubActionStrings.RecycleBin,
                state,
                false, // Replace history
                false, // Don't merge state
                state.feed, // Hub title
                false
            ); // Suppress navigate
        }
    }

    private _resetPackageVersions() {
        this._currentState.filteredVersions = null;
        this._versionsFetched = false;
        this._recycleBinVersionsFetched = false;
    }

    private _initializeSearch() {
        const searchOptions = {
            delimiter: /[.\-_ ]/,
            comparer: (v1, v2) => v1.index - v2.index // index is the position in the orginal server-supplied data
        } as Search.ISearchStrategyOptions<MinimalPackageVersion>;
        const strategy = new Search.IndexedSearchStrategy<MinimalPackageVersion>(null, searchOptions);
        this._searchAdapter = new PackageVersionSearchAdapter(this);
        this._search = new Search.SearchCore(strategy, this._searchAdapter);
    }

    private _getHubTitle(): string {
        return StringUtils.format(
            "{0} {1}",
            this._currentState.selectedPackage.name,
            this._currentState.selectedVersion.version
        );
    }

    public _versionsFetched: boolean = false;
    public _recycleBinVersionsFetched: boolean = false;
    private _currentState: PackageState;
    private _webPageDataService: HubWebPageDataService;
    private _recycleBinDataService: RecycleBinDataService;
    private _filterByEnabledProtocolDataService: FilterByEnabledProtocolDataService;
    private _feedsDataService: FeedsDataService;
    private _getSelectedFeedDelegate: () => Feed;
    private _getFeedViewsDelegate: () => FeedView[];
    private _search: Search.SearchCore<MinimalPackageVersion>;
    private _searchAdapter: PackageVersionSearchAdapter;
    private _versionIndexBuilt = false;
}
