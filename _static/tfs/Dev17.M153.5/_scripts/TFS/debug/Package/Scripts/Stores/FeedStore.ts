import * as Q from "q";

import { autobind, findIndex } from "OfficeFabric/Utilities";

import * as Store from "VSS/Flux/Store";
import { State } from "VSS/Flux/Component";
import * as Performance from "VSS/Performance";
import { HostNavigationService } from "VSS/SDK/Services/Navigation";
import * as Service from "VSS/Service";
import { announce, ProgressAnnouncer } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { IPickListItem } from "VSSUI/PickList";
import { Filter, IFilterItemState, IFilterState } from "VSSUI/Utilities/Filter";
import { HubViewOptionKeys, HubViewState } from "VSSUI/Utilities/HubViewState";

import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";

import {
    CiConstants,
    EmptyRecycleBinScenarioSplits,
    HubActionStrings,
    HubViewDefaultPivots,
    PackageFilterBarConstants,
    PerfScenarios,
    SettingsConstants
} from "Feed/Common/Constants/Constants";

import { IError } from "Feed/Common/Types/IError";
import { HubAction, HubStateHelpers, IHubState } from "Package/Scripts/Types/IHubState";
import { IMultiCommandDropdownVersions } from "Package/Scripts/Types/IMultiCommandDropdownVersions";
import {
    FeedMessage,
    FeedRetrievalResult,
    PackagesRetrievalResult,
    FeedsResult
} from "Package/Scripts/Types/WebPage.Contracts";

import * as PackageResources from "Feed/Common/Resources";

import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";
import * as NpmContracts from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";
import { NpmBatchOperationType, NpmPackagesBatchRequest } from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";
import {
    NuGetBatchOperationType,
    NuGetPackagesBatchRequest
} from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.Contracts";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import {
    FeedView,
    MetricType,
    Package,
    PackageMetrics,
    PackageVersion,
    UpstreamSource
} from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import {
    DependencyAction,
    IFeedSettingsState,
    IInternalUpstreamSettingsState,
    IRetentionPolicySettingsState
} from "Package/Scripts/Components/Settings/IFeedSettingsState";

import * as Actions from "Package/Scripts/Actions/Actions";
import { FeedManager } from "Package/Scripts/Actions/FeedList/FeedManager";
import { RestorePackages } from "Package/Scripts/Actions/RecycleBin/RestorePackages";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { SettingsActions } from "Package/Scripts/Actions/SettingsActions";
import {
    INewFeedCreatedPayload,
    IPackageDeletedPayload,
    IPackageDeprecatedPayload,
    IPackageListedPayload,
    IPackageListedStatusChangedPayload,
    IPackagePromotedPayload,
    IPackageSelectionChangedPayload,
    IPromotePanelPayload
} from "Package/Scripts/Common/ActionPayloads";
import { NavigationHandler } from "Package/Scripts/Common/NavigationHandler";
import { PackageModifiedCache } from "Package/Scripts/Common/PackageModifiedCache";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { FilterByEnabledProtocolDataService } from "Package/Scripts/DataServices/FilterByEnabledProtocolDataService";
import { SettingsDataService } from "Package/Scripts/DataServices/SettingsDataService";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import {
    buildAnnouncementListedStatusChangedForPackage,
    buildAnnouncementPackageFilterResults
} from "Package/Scripts/Helpers/AccessibilityHelper";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { isV2Feed, isFeedUnderMaintenance } from "Package/Scripts/Helpers/FeedCapabilityHelper";
import { getFullyQualifiedFeedName } from "Package/Scripts/Helpers/FeedNameResolver";
import { PackageFilterBarHelper } from "Package/Scripts/Helpers/PackageFilterBarHelper";
import * as PermissionHelper from "Package/Scripts/Helpers/PermissionHelper";
import {
    filterStateToUpstreamSource,
    getProtocolFromUpstreamSource,
    urlSourceToUpstreamSource
} from "Package/Scripts/Helpers/UpstreamHelper";
import { partition } from "Package/Scripts/Protocols/Common/BatchHandling";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { NpmDataService } from "Package/Scripts/Protocols/Npm/NpmDataService";
import { NuGetDataService } from "Package/Scripts/Protocols/NuGet/NuGetDataService";
import { ProtocolProvider } from "Package/Scripts/Protocols/ProtocolProvider";

// tslint:disable:interface-name
export interface FeedState extends State {
    currentUser: string;
    displayWelcomeMessage: boolean;
    feedViews: FeedView[];
    feeds: Feed[];
    isNpmAllowUpstreamNameConflict: boolean;
    isRetentionPoliciesFeatureEnabled: boolean;
    nextPageLoading: boolean;
    packages: Package[];
    requestedPackageCount: number;
    packagesLoading: boolean;
    pageSize: number;
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    selectedFeed: Feed;
    userCanAdministerFeeds: boolean;
    userCanCreateFeed: boolean;
    isMultiPromotePanelOpen: boolean;
    mruViewId: string;
    selectedPackages: Package[];
    multiCommandDropdownVersions: IMultiCommandDropdownVersions;
    hubState: HubViewState;
    showCreateBadgePanel: boolean;
    feedSettings: IFeedSettingsState;
    recycleBinState: RecycleBinState;
    /* Message (if any) to display with the currently selected feed */
    selectedFeedMessage: FeedMessage;
    /* True if upgrading feeds is allowed */
    isManualUpgradeEnabled: boolean;
    /* True if custom upstream sources are enabled */
    isCustomPublicUpstreamsFeatureEnabled: boolean;
    /* Map to obtain the metrics of a package given its package ID and its
       package version ID i.e. metricsMap[pkgId][versionId] = metrics
     */
    metricsMap: IDictionaryStringTo<IDictionaryStringTo<PackageMetrics>>;
    metricsEnabled: boolean;
    upstreamSourceLimit: number;
}

// tslint:disable:interface-name
export interface RecycleBinState extends State {
    recycleBinPackages: Package[];
    packageNameFilterValue: string;
    readonly hubViewState: IVssHubViewState;
    dialogOpen: boolean;
    dialogProcessing: boolean;
}

export class FeedStore extends Store.Store {
    // ***Note***: There is some violation of the 'single-direction' flow in this store.
    // Specifically, the action handlers for operations invoked from the GeneralDialog
    // component need to invoke an action to close the dialog once they have finished
    // handling the Action.
    // We will be moving the processing to 'action-creators' and making the store's simpler.
    // At that point, this undesirable pattern will be removed. In the meantime, don't
    // perpetuate this pattern any further - see saponnu or philho if you feel you need to.

    constructor(hubState: IHubState) {
        super();

        this.initializeDataServices();
        this.initializeState();
        this.initializeRecyclebinState();
        this.hydrateFromDataIsland();
        this.hydrateFeedFromDataIsland(hubState);

        this.feedManager = new FeedManager(() => this.getFeedState()); // can I change this to getCurrentFeed?

        const showWelcomeMessage = this.checkWelcomeMessage();
        if (showWelcomeMessage === false) {
            const hubAction: HubAction = HubStateHelpers.getHubAction(hubState.action);
            this.hydratePackagesFromDataIsland(hubAction);
            this.displayErrorIfViewDoesntMatch(hubState);
            this.initializeFilters();
        }

        this.initializeAvailableProtocols();
        this._initializeActionListeners();
    }

    private initializeState(): void {
        this._currentState = {} as FeedState;
        this._currentState.selectedPackages = [];
        this._currentState.hubState = new HubViewState({
            defaultPivot: HubViewDefaultPivots.feed
        });
        this._currentState.isMultiPromotePanelOpen = false;
        this._currentState.multiCommandDropdownVersions = null;
        this._currentState.showCreateBadgePanel = false;
        this._filterText = null;
        this._packagesReFetched = null;
        this._currentState.metricsMap = {};
        this._currentState.metricsEnabled = this._webPageDataService.isPackageMetricsEnabled();
    }

    private initializeRecyclebinState(): void {
        this._currentState.recycleBinState = {
            recycleBinPackages: [],
            isRecycleBinEnabled: false,
            recycleBinBatchOperationEnabled: false,
            packageNameFilterValue: null,
            dialogOpen: false,
            dialogProcessing: false,
            hubViewState: new VssHubViewState({
                pivotNavigationBehavior: HistoryBehavior.none, // we don't want to add the view to the url, that's why its HistoryBehaviour.none
                defaultPivot: HubViewDefaultPivots.recycleBin
            })
        } as RecycleBinState;
    }

    private initializeDataServices(): void {
        this._feedsDataService = Service.getLocalService(FeedsDataService);
        this._webPageDataService = Service.getLocalService(HubWebPageDataService);
        this._filterByEnabledProtocolDataService = Service.getLocalService(FilterByEnabledProtocolDataService);
    }

    private hydrateFromDataIsland(): void {
        this._currentState.currentUser = this._webPageDataService.getCurrentUserDescriptor();
        this._currentState.pageSize = this._webPageDataService.getPageSize();
        this._currentState.isNpmAllowUpstreamNameConflict = this._webPageDataService.getNpmUpstreamNameConflictFeatureFlag();
        this._currentState.userCanAdministerFeeds = this._webPageDataService.userCanAdministerFeeds();
        this._currentState.userCanCreateFeed = this._webPageDataService.userCanCreateFeed();
        this._currentState.isRetentionPoliciesFeatureEnabled = this._webPageDataService.isRetentionPoliciesFeatureEnabled();
        this._currentState.isManualUpgradeEnabled = this._webPageDataService.isManualUpgradeEnabled();
        this._currentState.isCustomPublicUpstreamsFeatureEnabled = this._webPageDataService.isCustomPublicUpstreamsFeatureEnabled();

        this._currentState.upstreamSourceLimit = this._webPageDataService.getUpstreamSourceLimit();
    }

    private hydrateFeedFromDataIsland(state: IHubState): void {
        const feed: string = state.feed ? state.feed.split("@")[0] : null;
        this._initializeFeedData(feed, state);
    }

    private hydratePackagesFromDataIsland(action: HubAction): void {
        if (action === HubAction.Feed) {
            this._initializePackageListData();
        }

        if (action === HubAction.RecycleBin) {
            this._initializeRecycleBinPackageListData();

            // initialize shouldn't navigate
            this._navigateToRecycleBin(true);
        }
    }

    private checkWelcomeMessage(): boolean {
        return this._currentState.displayWelcomeMessage === true || this._currentState.selectedFeed == null;
    }

    private displayErrorIfViewDoesntMatch(state: IHubState): void {
        if (this._currentState.selectedFeed == null || state.feed == null) {
            return;
        }

        // If feed@view does not exist or user does not have access to the feed/view then
        // the requested feed (state.feed) and the selected feed (this._currentState.selectedFeed) will be different
        // It won't work if users mixes GUIDs and human-friendly names, but it's such a corner case that it won't be solved here

        // Base properties would match if I request a base feed but only have access to a view
        const baseFeedPropertiesMatch: boolean =
            Utils_String.equals(state.feed, this._currentState.selectedFeed.name, true) ||
            Utils_String.equals(state.feed, this._currentState.selectedFeed.id, true);

        // Fully qualified properties would match if I request a view and that view was returned
        const fullyQualifiedPropertiesMatch: boolean =
            Utils_String.equals(state.feed, this._currentState.selectedFeed.fullyQualifiedName, true) ||
            Utils_String.equals(state.feed, this._currentState.selectedFeed.fullyQualifiedId, true);

        if (!baseFeedPropertiesMatch && !fullyQualifiedPropertiesMatch) {
            const message = Utils_String.format(PackageResources.Error_UrlFeedNotFound, state.feed);
            Actions.ErrorEncountered.invoke({ message } as IError);
        }
    }

    private getFilterState(): IFilterState {
        let newFilterState: IFilterState = {};
        const viewInSelectedFeedExists = this._currentState.selectedFeed && this._currentState.selectedFeed.view;
        if (viewInSelectedFeedExists) {
            const viewName = this._currentState.selectedFeed.view.name;
            newFilterState = this._updateSelectedViewFilter(newFilterState, viewName);
        }

        const isUpstreamEnabledEnabled: boolean =
            this._currentState.selectedFeed && this._currentState.selectedFeed.upstreamEnabled;
        if (isUpstreamEnabledEnabled) {
            const upstreamSource = this._currentState.selectedFeed.upstreamSource;
            newFilterState = PackageFilterBarHelper.setSourceToFilterState(newFilterState, upstreamSource);
        }
        return newFilterState;
    }

    private initializeFilters(): void {
        const filterState = this.getFilterState();
        this._currentState.hubState.filter.setState(filterState, true /*suppressChangeEvent*/);
        this._currentState.hubState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
    }

    public async setHubState(action: string, state: IHubState): Promise<void> {
        switch (HubStateHelpers.getHubAction(action)) {
            case HubAction.Feed:
                // when feed is deleted
                if (state.feed == null) {
                    return;
                }

                try {
                    this._currentState.packagesLoading = true;
                    await this.feedManager.setFeedFromUrlAsync(state);
                } catch (error) {
                    Actions.ErrorEncountered.invoke({
                        message: error.message,
                        isCritical: true
                    } as IError);
                } finally {
                    this._currentState.packagesLoading = false;
                }
                break;
            case HubAction.RecycleBin:
            case HubAction.CreateFeed:
            case HubAction.Package:
            case HubAction.Settings:
            case HubAction.RecycleBinPackage:
                break;
            default:
                Actions.ErrorEncountered.invoke({
                    message: Utils_String.format(PackageResources.Error_UrlActionNotSupported, action)
                } as IError);
                break;
        }
    }
    public getFeedManager(): FeedManager {
        return this.feedManager;
    }

    public getFeedState(): FeedState {
        return this._currentState;
    }

    public getCurrentFeed(): Feed {
        return this._currentState.selectedFeed;
    }

    public getCurrentFeedViews(): FeedView[] {
        return this._currentState.feedViews;
    }

    public getFeedSettingsState(): IFeedSettingsState {
        if (this._currentState.feedSettings == null) {
            this._initializeFeedSettingsState();
        }
        return this._currentState.feedSettings;
    }

    private _initializeFeedSettingsState(): void {
        const isUpstreamV2Enabled: boolean = isV2Feed(this._currentState.selectedFeed);
        const internalUpstreamSettings = {
            isV2Feed: isUpstreamV2Enabled,
            collectionUpstreamsEnabled: this._webPageDataService.isCollectionUpstreamsEnabled(),
            organizationUpstreamsEnabled: this._webPageDataService.isOrganizationUpstreamsEnabled(),
            nugetInternalUpstreamsEnabled: this._webPageDataService.isNugetInternalUpstreamsEnabled(),
            mavenInternalUpstreamsEnabled: false
        } as IInternalUpstreamSettingsState;

        const retentionPolicySettings = {
            retentionPolicy: null,
            retentionPolicyEnabled: this._currentState.isRetentionPoliciesFeatureEnabled,
            retentionPolicyLoading: false,
            retentionPolicyToApply: null,
            retentionPolicyMinCountLimit: this._webPageDataService.retentionPolicyLimits().minimumCountLimit,
            retentionPolicyMaxCountLimit: this._webPageDataService.retentionPolicyLimits().maximumCountLimit
        } as IRetentionPolicySettingsState;

        // expand state to include UI state, but use reference
        this._currentState.feedSettings = {
            updateActionDependencies: (action: DependencyAction, data: any): void => {
                this.updateFeedSettingActionsDependencies(action, data);
            },
            feed: (): Feed => {
                return this._currentState.selectedFeed;
            },
            isUserAdmin: (): boolean => {
                if (this._currentState && this._currentState.selectedFeed) {
                    return PermissionHelper.isAdministrator(this._currentState.selectedFeed);
                } else {
                    return false;
                }
            },
            showDiscardDialog: false,
            showDeleteDialog: false,
            feedName: null,
            feedDescription: null,
            hideDeletedPackageVersions: null,
            badgesEnabled: null,
            isPermissionDataLoadedFromServer: false,
            feedPermissions: [],
            permissionsFilter: new Filter(),
            showAddUsersOrGroupsPanel: false,
            isViewsDataLoadedFromServer: false,
            views: [],
            viewPermissions: {},
            viewPermissionsToAdd: {},
            viewPermissionsToRemove: {},
            viewsFilter: new Filter(),
            showViewPanel: false,
            upstreamSourceFilter: new Filter(),
            displayAddUpstreamPanel: false,
            validationErrorBag: {},
            showWelcomeMessage: (): boolean => {
                return this._currentState.displayWelcomeMessage;
            },
            isSavingChanges: false,
            feeds: (): Feed[] => {
                return this._currentState.feeds;
            },
            internalUpstreamSettings,
            retentionPolicySettings,
            projectCollectionAdminGroupId: this._webPageDataService.getProjectCollectionAdminGroupId(),
            selectedPermissions: [],
            selectedViews: [],
            selectedUpstreamSources: [],
            upgradeAvailable: this._currentState.isManualUpgradeEnabled === true && isUpstreamV2Enabled !== true,
            isCustomPublicUpstreamsFeatureEnabled: this._currentState.isCustomPublicUpstreamsFeatureEnabled,
            upgradeInProgress: isFeedUnderMaintenance(this._currentState.selectedFeed) === true,
            upstreamSourceLimit: this._currentState.upstreamSourceLimit
        } as IFeedSettingsState;

        this._currentState.feedSettings.hubViewState = new VssHubViewState({
            defaultPivot: HubViewDefaultPivots.settings
        });
    }

    private updateFeedSettingActionsDependencies(action: DependencyAction, data: any): void {
        switch (action) {
            case DependencyAction.DeleteFeed:
                this._handleFeedDeletedAction(data as Feed);
                break;
            case DependencyAction.UpdateViews:
                this._handleFeedViewsUpdatedAction(data as FeedView[]);
                break;
        }
    }

    public emit(): void {
        this.emitChanged();
    }

    public getFirstPackage(): Package {
        return this._currentState.packages[0];
    }

    private _initializeActionListeners(): void {
        Actions.FeedBreadcrumbSelected.addListener((packageSummary?: Package) =>
            this._handleFeedBreadCrumbSelectedAction(packageSummary)
        );
        Actions.FeedDeleted.addListener((feed: Feed) => this._handleFeedDeletedAction(feed));
        Actions.FeedListUpdated.addListener((feeds: Feed[]) => this._handleFeedListUpdatedAction(feeds));
        Actions.FeedSelected.addListener((feed: Feed) => this._handleFeedSelectedAction(feed));
        Actions.FeedUpdated.addListener((feed: Feed) => this._handleFeedUpdatedAction(feed));
        Actions.FeedViewsUpdated.addListener((views: FeedView[]) => this._handleFeedViewsUpdatedAction(views));
        Actions.NewFeedCreated.addListener((newFeedPayload: INewFeedCreatedPayload) =>
            this._handleNewFeed(newFeedPayload)
        );
        Actions.NextPackagePageRequested.addListener(() => this._handleNextPageRequestedAction());
        Actions.PackageSelected.addListener(this._handlePackageSelectedAction);
        Actions.PackageListUpdated.addListener((updatedPackageIds: string[] = null) =>
            this._handlePackageListUpdatedAction(updatedPackageIds)
        );
        Actions.PackageListedStatusChanged.addListener((payload: IPackageListedStatusChangedPayload) =>
            this._handlePackageListedStatusChangedAction(payload)
        );
        Actions.MultiPromotePanelOpened.addListener((payload: IPromotePanelPayload) =>
            this._handleMultiPromotePanelOpenedAction(payload)
        );
        Actions.MultiPromotePanelClosed.addListener(() => this._handleMultiPromotePanelClosedAction());
        Actions.MultiplePackagesPromoted.addListener((payload: IPackagePromotedPayload) =>
            this._handlePackageVersionsPromotedThrougPanelAction(payload)
        );
        Actions.MultiCommandVersionDropdownClicked.addListener((packageId: string) =>
            this._handleMultiCommandVersionDropdownClickedAction(packageId)
        );
        Actions.PackageSelectionChangedInPackageGrid.addListener((payload: IPackageSelectionChangedPayload) =>
            this._handlePackageSelectedInPackageGrid(payload)
        );
        Actions.PackagesFilterBarChanged.addListener((payload: IFilterState) =>
            this._handlePackagesFilterBarChanged(payload)
        );
        Actions.PackageListedChanged.addListener((payload: IPackageListedPayload) =>
            this._handlePackageListedChangedAction(payload)
        );
        SettingsActions.FeedSettingsNavigateClicked.addListener(() => this._handleFeedSettingsNavigateClicked());
        SettingsActions.FeedUpdated.addListener(this._handleFeedSettingsUpdatedAction);
        Actions.PackageVersionDeprecated.addListener((payload: IPackageDeprecatedPayload) =>
            this._handlePackageVersionDeprecatedAction(payload)
        );
        Actions.PackagesDeleted.addListener((payload: IPackageDeletedPayload) =>
            this._handlePackagesDeletedAction(payload)
        );
        Actions.ToggleCreateBadgePanel.addListener(this._handleToggleCreateBadgePanelAction);

        RecycleBinActions.NextPackagePageRequested.addListener(this._handleRecycleBinNextPageRequestedAction);
        RecycleBinActions.PackageSelected.addListener(this._handleRecyleBinPackageSelectedAction);
        RecycleBinActions.RecycleBinBreadCrumbClicked.addListener(this._handleRecycleBinBreadCrumbSelectedAction);
        RecycleBinActions.RecycleBinClicked.addListener(() => this._handleRecycleBinNavigateClickedAction());
        RecycleBinActions.FilterPackages.addListener(this._handleRecycleBinFilterPackagesAction);
        RecycleBinActions.EmptyRecycleBin.addListener(() => this._handleEmptyRecycleBinAction());
        RecycleBinActions.EmptyDialogClosed.addListener(() => this._handleCloseRecycleBinModalDialog());
        RecycleBinActions.EmptyDialogOpened.addListener(() => this._handleOpenRecycleBinModalDialog());
        RecycleBinActions.PackagesRestoredToFeed.addListener((payload: IPackageDeletedPayload) =>
            RestorePackages.handlePackagesRestoredToFeedAction(payload, this._currentState.packages)
        );
    }

    // used in tests - listeners must be removed from any action getting tested
    public dispose(): void {
        Actions.FeedBreadcrumbSelected.removeListener(this._handleFeedBreadCrumbSelectedAction);
        Actions.FeedSelected.removeListener((feed: Feed) => this._handleFeedSelectedAction(feed));
        Actions.PackageSelected.removeListener(this._handlePackageSelectedAction);
        SettingsActions.FeedUpdated.removeListener(this._handleFeedSettingsUpdatedAction);
        Actions.ToggleCreateBadgePanel.removeListener(this._handleToggleCreateBadgePanelAction);

        RecycleBinActions.NextPackagePageRequested.removeListener(this._handleRecycleBinNextPageRequestedAction);
        RecycleBinActions.RecycleBinBreadCrumbClicked.removeListener(this._handleRecycleBinBreadCrumbSelectedAction);
        RecycleBinActions.RecycleBinClicked.removeListener(this._handleRecycleBinNavigateClickedAction);
        RecycleBinActions.PackageSelected.removeListener(this._handleRecyleBinPackageSelectedAction);
        RecycleBinActions.FilterPackages.removeListener(this._handleRecycleBinFilterPackagesAction);
        RecycleBinActions.EmptyRecycleBin.removeListener(this._handleEmptyRecycleBinAction);
        RecycleBinActions.EmptyDialogClosed.removeListener(() => this._handleCloseRecycleBinModalDialog());
        RecycleBinActions.EmptyDialogOpened.removeListener(() => this._handleOpenRecycleBinModalDialog());
    }

    private _initializeFeedData(selectedFeed?: string, state?: IHubState): void {
        const feedsResult: FeedsResult = this._webPageDataService.getInitialFeedsResult();
        switch (feedsResult.result) {
            case FeedRetrievalResult.NoFeeds:
                this._currentState.feeds = [];
                this._currentState.displayWelcomeMessage = true;
                if (selectedFeed != null) {
                    Actions.ErrorEncountered.invoke({
                        message: Utils_String.format(PackageResources.Error_UrlFeedNotFound, selectedFeed)
                    } as IError);
                }
                break;
            case FeedRetrievalResult.NotFound:
                Actions.ErrorEncountered.invoke({
                    message: Utils_String.format(PackageResources.Error_UrlFeedNotFound, selectedFeed)
                } as IError);
            // no break, since server did return other feeds
            // tslint:disable-next-line:no-switch-case-fall-through
            case FeedRetrievalResult.Success:
                // this doesn't use FeedManager.
                this._currentState.selectedFeed = feedsResult.selectedFeed as Feed;

                // MRU view should be the view that's been set in the data provider
                this._currentState.mruViewId =
                    this._currentState.selectedFeed.view != null ? this._currentState.selectedFeed.view.id : null;

                if (feedsResult.selectedFeed.upstreamEnabled === false) {
                    this._handleUpstreamDisabled(state.upstreamSource);
                } else if (state.upstreamSource != null) {
                    const upstreamSource = urlSourceToUpstreamSource(
                        state,
                        this._currentState.selectedFeed.upstreamSources
                    );
                    this._currentState.selectedFeed.upstreamSource = upstreamSource;
                    if (upstreamSource === null) {
                        Actions.ErrorEncountered.invoke({
                            isCritical: false,
                            message: Utils_String.format(
                                PackageResources.Error_InvalidUpstreamSource,
                                state.upstreamSource
                            )
                        } as IError);
                    }
                }
                NavigationHandler.updateFeedHistoryOnLanding(this._currentState.selectedFeed);
                this._currentState.feeds = feedsResult.feeds as Feed[];
                this._currentState.feedViews = feedsResult.feedViews;
                break;
            case FeedRetrievalResult.Error:
            default:
                Actions.ErrorEncountered.invoke({
                    details: feedsResult.errorMessage,
                    isCritical: true,
                    link: () => window.location.reload(),
                    linkText: PackageResources.Error_ReloadPageLink,
                    message: PackageResources.Error_ErrorLoadingFeedsInDataProvider
                } as IError);
                break;
        }
    }

    private _initializePackageListData(): void {
        const packagesResult = this._filterByEnabledProtocolDataService.getPackagesResult();
        if (packagesResult) {
            switch (packagesResult.result) {
                case PackagesRetrievalResult.NoPackages:
                    break;
                case PackagesRetrievalResult.Success:
                    this.setCurrentStatePackages(packagesResult.packages, packagesResult.requestedPackageCount);
                    this._finishNextPageLoadingEvent();
                    this._getPackageMetrics(packagesResult.packages);
                    break;
                case PackagesRetrievalResult.Error:
                default:
                    Actions.ErrorEncountered.invoke({
                        details: packagesResult.errorMessage,
                        isCritical: true,
                        link: () => window.location.reload(),
                        linkText: PackageResources.Error_ReloadPageLink,
                        message: PackageResources.Error_ErrorLoadingPackageListInDataProvider
                    } as IError);
                    break;
            }
        }
    }

    private _getPackageMetrics(packages: Package[]): void {
        return;
    }

    private _initializeRecycleBinPackageListData(): void {
        const recycleBinPackagesResult = this._filterByEnabledProtocolDataService.getRecycleBinPackagesResult();

        switch (recycleBinPackagesResult.result) {
            case PackagesRetrievalResult.NoPackages:
                break;
            case PackagesRetrievalResult.Success:
                this.setRecycleBinPackages(recycleBinPackagesResult.packages);
                break;
            case PackagesRetrievalResult.Error:
            default:
                Actions.ErrorEncountered.invoke({
                    details: recycleBinPackagesResult.errorMessage,
                    isCritical: true,
                    link: () => window.location.reload(),
                    linkText: PackageResources.Error_ReloadPageLink,
                    message: PackageResources.Error_ErrorLoadingPackageListInDataProvider
                } as IError);
                break;
        }
    }

    private initializeAvailableProtocols(): void {
        this._currentState.protocolMap = ProtocolProvider.getEnabledProtocolTypes();
    }

    @autobind
    private _handleFeedBreadCrumbSelectedAction(packageSummary?: Package): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedBreadCrumbClicked);
        const breadCrumbSelectedScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.BreadCrumbSelected
        );

        this._updatePackageList(breadCrumbSelectedScenario);
        this._correctLatestVersion(packageSummary);

        NavigationHandler.renderFeed(this._currentState.selectedFeed);
    }

    @autobind
    private _handleRecycleBinBreadCrumbSelectedAction(): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.RecycleBinBreadCrumbClicked);
        const breadCrumbSelectedScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.BreadCrumbSelected
        );
        this._navigateToRecycleBin();
        this._updateRecycleBinPackagesList(breadCrumbSelectedScenario);
    }

    private _handleRecycleBinNavigateClickedAction(): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.RecycleBinButtonClicked);
        const recycleBinClickedScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.FeedRecycleBinSelected
        );
        this._navigateToRecycleBin();
        this._updateRecycleBinPackagesList(recycleBinClickedScenario);
    }

    @autobind
    private _handleRecycleBinFilterPackagesAction(packageNameFilterValue: string): void {
        this._currentState.recycleBinState.recycleBinPackages = [];
        this._currentState.recycleBinState.packageNameFilterValue = packageNameFilterValue || null;
        if (packageNameFilterValue) {
            // We don't want to be filtering on both the feed and recycle bin views at the same time - messes up the page message
            this._filterText = null;
        }

        this._loadRecycleBinPackages();
    }

    @autobind
    private _handleRecycleBinNextPageRequestedAction(): void {
        if (this._currentState.nextPageLoading) {
            return;
        }

        const scenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.RecycleBinPackagesPageLoad
        );

        this._loadRecycleBinPackages().then(() => scenario.end(), error => scenario.abort());
    }

    private _loadRecycleBinPackages(): IPromise<void> {
        const state = this._currentState;
        const top = state.pageSize;
        const skip = state.recycleBinState.recycleBinPackages ? state.recycleBinState.recycleBinPackages.length : null;
        const packageNameFilter = state.recycleBinState.packageNameFilterValue || null;

        CustomerIntelligenceHelper.publishEvent(CiConstants.RecycleBinPackagesPageRequested, {
            totalPackagesRequested: top + skip
        });

        const loadingPromise = this._filterByEnabledProtocolDataService
            .getRecycleBinPackagesAsync(state.selectedFeed.id, top, skip, packageNameFilter)
            .then(skip ? this.appendRecycleBinPackages : this.setRecycleBinPackages, (error: Error) => {
                Actions.ErrorEncountered.invoke({
                    message: error.message,
                    isCritical: true
                } as IError);
            })
            .then(() => {
                state.packagesLoading = state.nextPageLoading = false;
                this.emitChanged();
            });

        skip === 0 ? (state.packagesLoading = true) : (state.nextPageLoading = true);
        this.emitChanged();

        return loadingPromise;
    }

    private async _handleFeedSelectedAction(feed: Feed): Promise<void> {
        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedSelected);
        const feedSelectedScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.FeedSelected
        );
        try {
            this._currentState.packagesLoading = true;
            this.emitChanged();
            await this.setCurrentFeed(feed);
        } finally {
            this.emitChanged();
        }
        feedSelectedScenario.end();
    }

    private async setCurrentFeed(feed: Feed): Promise<void> {
        try {
            await this.feedManager.setFeed(feed);
            this._getPackageMetrics(this._currentState.packages);
        } catch (error) {
            Actions.ErrorEncountered.invoke({
                message: error.message,
                isCritical: true
            } as IError);
        } finally {
            this._currentState.packagesLoading = false;
        }
    }

    // used by new settings experience
    // TODO: This should not be getting called by the other action.
    // feeds array should contain reference to current feed, so when current feed is updated in SaveChangesHandler, feeds array is also updated
    @autobind
    private _handleFeedSettingsUpdatedAction(feed: Feed): void {
        // Currently you're able to update following fields:
        const tempFeed = this._currentState.selectedFeed;
        tempFeed.name = feed.name ? feed.name : this._currentState.selectedFeed.name;
        tempFeed.description =
            feed.description || feed.description === ""
                ? feed.description
                : this._currentState.selectedFeed.description;
        tempFeed.hideDeletedPackageVersions =
            feed.hideDeletedPackageVersions != null ? feed.hideDeletedPackageVersions : false;
        tempFeed.badgesEnabled = feed.badgesEnabled != null ? feed.badgesEnabled : false;
        tempFeed.upstreamEnabled =
            feed.upstreamEnabled != null ? feed.upstreamEnabled : this._currentState.selectedFeed.upstreamEnabled;
        tempFeed.upstreamSources = feed.upstreamSources
            ? feed.upstreamSources
            : this._currentState.selectedFeed.upstreamSources;
        tempFeed.upstreamSource = feed.upstreamSource
            ? feed.upstreamSource
            : this._currentState.selectedFeed.upstreamSource;

        this._currentState.selectedFeed = tempFeed;

        // update feeds array
        const index = findIndex(this._currentState.feeds, (existingFeed: Feed) => {
            return existingFeed.id === tempFeed.id;
        });

        if (index > -1) {
            this._currentState.feeds[index] = tempFeed;
            this._currentState.feeds = this._currentState.feeds.sort(this._feedSort);
        }

        this.emitChanged();
    }

    private _handleFeedUpdatedAction(feed: Feed): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedUpdated);
        const feedUpdatedScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.FeedUpdated
        );
        const previousUpstreamEnabled: boolean = this._currentState.selectedFeed.upstreamEnabled;

        // Currently you're able to update following fields:
        const tempFeed = this._currentState.selectedFeed;
        tempFeed.name = feed.name ? feed.name : this._currentState.selectedFeed.name;
        tempFeed.description =
            feed.description || feed.description === ""
                ? feed.description
                : this._currentState.selectedFeed.description;
        tempFeed.hideDeletedPackageVersions =
            feed.hideDeletedPackageVersions != null
                ? feed.hideDeletedPackageVersions
                : this._currentState.selectedFeed.hideDeletedPackageVersions;
        tempFeed.upstreamEnabled =
            feed.upstreamEnabled != null ? feed.upstreamEnabled : this._currentState.selectedFeed.upstreamEnabled;
        tempFeed.upstreamSources = feed.upstreamSources
            ? feed.upstreamSources
            : this._currentState.selectedFeed.upstreamSources;
        tempFeed.upstreamSource = feed.upstreamSource
            ? feed.upstreamSource
            : this._currentState.selectedFeed.upstreamSource;
        tempFeed.capabilities = feed.capabilities ? feed.capabilities : this._currentState.selectedFeed.capabilities;

        this._currentState.selectedFeed = tempFeed;

        // If the new upstream source is different, refetch the packages
        if (previousUpstreamEnabled !== this._currentState.selectedFeed.upstreamEnabled) {
            const perfScenario: Performance.IScenarioDescriptor = this._handleUpstreamSourceUpdates(
                this._currentState.selectedFeed.upstreamSource
            );
            if (perfScenario) {
                const directUpstreamSourceId: string = this._currentState.selectedFeed.upstreamSource
                    ? this._currentState.selectedFeed.upstreamSource.id
                    : null;
                this._filterByEnabledProtocolDataService
                    .getPackagesAsync(
                        this._getFullyQualifiedFeedId(),
                        this._currentState.pageSize, // top
                        null, // skip default 0
                        this._includeDeletedPackages(),
                        null, // isListed
                        this._filterText,
                        true, // includeDescription
                        directUpstreamSourceId
                    )
                    .then((packages: Package[]) => {
                        this.setCurrentStatePackages(packages, this._currentState.pageSize, true);
                        this._finishNextPageLoadingEvent();
                        this._currentState.packagesLoading = false;
                        this.emitChanged();

                        perfScenario.end();

                        return packages;
                    })
                    .then((packages: Package[]) => {
                        this._getPackageMetrics(packages);
                    });
            }
        }

        for (let i = 0; i < this._currentState.feeds.length; i++) {
            if (this._currentState.feeds[i].id === feed.id) {
                this._currentState.feeds[i] = tempFeed;
            }
        }

        // why is this required?
        // this._navigateToCurrentFeed(false);
        feedUpdatedScenario.end();

        this.emitChanged();
    }

    private async _handleFeedDeletedAction(deletedFeed: Feed): Promise<void> {
        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedDeleted);
        const feedDeletedScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.DeleteFeed
        );

        for (let i = 0; i < this._currentState.feeds.length; i++) {
            if (this._currentState.feeds[i].id === deletedFeed.id) {
                this._currentState.feeds.splice(i, 1);
                break;
            }
        }

        if (this._currentState.feeds[0]) {
            this._currentState.packagesLoading = true;
            this.emitChanged();
            await this.setCurrentFeed(this._currentState.feeds[0]);
        } else {
            this._currentState.displayWelcomeMessage = true;

            const state: IHubState = {
                feed: null
            } as IHubState;

            const hostNavigationService = new HostNavigationService();
            hostNavigationService.setWindowTitle(PackageResources.HubTitle);

            // not the right method<name> to call
            this.setHubState(HubActionStrings.ViewFeed, state);
        }

        feedDeletedScenario.end();

        this.emitChanged();
    }

    private _handleFeedViewsUpdatedAction(views: FeedView[]): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedViewsUpdated);
        this._currentState.feedViews = views;

        if (
            findIndex(this._currentState.feedViews, (view: FeedView) => view.id === this._currentState.mruViewId) === -1
        ) {
            this._currentState.mruViewId = this._currentState.feedViews[0].id;
        }

        // In case of deleting or renaming views, the view bubbles in the package list need to be updated
        if (this._currentState.packages) {
            this._currentState.packagesLoading = true;
            const directUpstreamSourceId: string = this._currentState.selectedFeed.upstreamSource
                ? this._currentState.selectedFeed.upstreamSource.id
                : null;

            this._filterByEnabledProtocolDataService
                .getPackagesAsync(
                    getFullyQualifiedFeedName(this._currentState.selectedFeed),
                    this._currentState.pageSize, // top
                    null, // skip default 0
                    this._includeDeletedPackages(),
                    null, // isListed
                    this._filterText,
                    true, // includeDescription
                    directUpstreamSourceId
                )
                .then((packages: Package[]) => {
                    this.setCurrentStatePackages(packages, this._currentState.pageSize, true);
                    this._currentState.packagesLoading = false;
                    this.emitChanged();

                    return packages;
                })
                .then((packages: Package[]) => {
                    this._getPackageMetrics(packages);
                });
        }

        this.emitChanged();
    }

    private _handleNextPageRequestedAction(): void {
        const packagesPageLoadScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.PackagesPageLoad
        );

        if (this._currentState.nextPageLoading) {
            return;
        }

        this._currentState.nextPageLoading = true;

        const top = this._currentState.pageSize;
        const skip = this._currentState.packages ? this._currentState.packages.length : null;
        const protocol: string = getProtocolFromUpstreamSource(this._currentState.selectedFeed);
        CustomerIntelligenceHelper.publishEvent(CiConstants.PackagesPageRequested, {
            totalPackagesRequested: top + skip,
            protocol
        });
        const directUpstreamSourceId: string = this._currentState.selectedFeed.upstreamSource
            ? this._currentState.selectedFeed.upstreamSource.id
            : null;

        this._filterByEnabledProtocolDataService
            .getPackagesAsync(
                this._getFullyQualifiedFeedId(),
                top,
                skip,
                this._includeDeletedPackages(),
                null, // isListed
                this._filterText,
                true, // includeDescription
                directUpstreamSourceId
            )
            .then((packages: Package[]) => {
                if (packages) {
                    const pkgs = this._currentState.packages.concat(
                        PackageModifiedCache.applyCacheByPackageList(packages)
                    );

                    this.setCurrentStatePackages(pkgs, top + skip);
                }

                this._currentState.nextPageLoading = false;
                this.emitChanged();
                packagesPageLoadScenario.end();

                return packages;
            })
            .then((packages: Package[]) => {
                this._getPackageMetrics(packages);
            });

        this.emitChanged();
    }

    private _handleMultiPromotePanelOpenedAction(payload: IPromotePanelPayload) {
        CustomerIntelligenceHelper.publishEvent(CiConstants.MultiPromotePanelOpened);
        // Get MRU view before opening the panel if it's not already set.
        if (!this._currentState.mruViewId) {
            const settingsDataService: SettingsDataService = Service.getLocalService(SettingsDataService);
            settingsDataService.getPackageSettingsAsync().then(
                result => {
                    const valueString = "value";
                    if (result && result[valueString][SettingsConstants.MruFeedId]) {
                        const mruFeedId = result[valueString][SettingsConstants.MruFeedId];
                        const index = mruFeedId.indexOf("@");
                        if (index !== -1) {
                            this._currentState.mruViewId = mruFeedId.split("@")[1].id;
                        } else {
                            this._currentState.mruViewId = this._currentState.feedViews[0].id;
                        }
                    } else {
                        this._currentState.mruViewId = this._currentState.feedViews[0].id;
                    }
                    this._handleMultiPromoteOpened(payload);
                },
                err => {
                    this._currentState.mruViewId = this._currentState.feedViews[0].id;
                    this._handleMultiPromoteOpened(payload);
                }
            );
        } else {
            this._handleMultiPromoteOpened(payload);
        }
    }

    private _handleMultiPromoteOpened(payload: IPromotePanelPayload) {
        if (payload.selectedPackages.length > 0) {
            this._currentState.isMultiPromotePanelOpen = true;
            this._currentState.selectedPackages = payload.selectedPackages;
            this.emitChanged();
        }
    }

    private _handleMultiPromotePanelClosedAction() {
        this._currentState.isMultiPromotePanelOpen = false;
        this._currentState.multiCommandDropdownVersions = null;
        /**
         * When promoting one package through the contextual menu, the selectedPackages must be cleared after
         * closing the panel because the package might not have been manually selected before opening the panel
         * even though selectedPackages had to be populated with the package.
         */
        if (this._currentState.selectedPackages.length === 1) {
            this._currentState.selectedPackages = [];
        }

        this.emitChanged();
    }

    @autobind
    private _handleToggleCreateBadgePanelAction(openPanel: boolean): void {
        this._currentState.showCreateBadgePanel = openPanel;
        this.emitChanged();
    }

    private _handlePackageSelectedInPackageGrid(payload: IPackageSelectionChangedPayload) {
        this._currentState.selectedPackages = payload.selectedPackages;
        this.emitChanged();
    }

    private _handleFilterTextUpdates(newFilterText: string): Performance.IScenarioDescriptor {
        if ((!newFilterText && !this._filterText) || newFilterText === this._filterText) {
            // The user either tried to clear no filter or is submitting the same filter again. Ignore.
            return undefined;
        }

        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.FilterPackages
        );

        CustomerIntelligenceHelper.publishEvent(CiConstants.PackagesFiltered);
        // this._currentState.packagesLoading = true;

        return perfScenario;
    }

    private _handleUpstreamSourceUpdates(nextSourceKey: UpstreamSource): Performance.IScenarioDescriptor {
        // If the upstream source hasn't changed then do nothing
        if (this._currentState.selectedFeed.upstreamSource === nextSourceKey) {
            return undefined;
        }

        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.UpstreamSourceUpdated
        );

        CustomerIntelligenceHelper.publishEvent(CiConstants.UpstreamSourceUpdated);
        this._currentState.selectedFeed.upstreamSource = nextSourceKey;

        return perfScenario;
    }

    private _handleSelectedFeedViewUpdates(nextView: FeedView): Performance.IScenarioDescriptor {
        const currentSavedViewId: string = this._currentState.selectedFeed.view
            ? this._currentState.selectedFeed.view.id
            : undefined;
        nextView = PackageFilterBarHelper.getFeedViewFromObject(nextView);
        const nextViewId: string = nextView ? nextView.id : undefined;

        // If trying to clear the view filter, and they don't have access to base feed, then do nothing
        if (!nextView && !PermissionHelper.hasAccessToBaseFeed(this._currentState.selectedFeed)) {
            return;
        }

        // If updating to the currently selected view, do nothing
        if (currentSavedViewId === nextViewId) {
            return undefined;
        }

        // If there is no active view, and requesting the "All" view then do nothing
        if (!currentSavedViewId && nextView.id === PackageResources.FeedViewDropdown_AllViews_Key) {
            return undefined;
        }

        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedViewSelected);

        // If the "All" view is requested, set view to null
        if (nextView && nextView.id === PackageResources.FeedViewDropdown_AllViews_Key) {
            nextView = undefined;
        }

        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.FeedViewSelected
        );

        this._currentState.selectedFeed.view = nextView;
        if (nextView) {
            const viewName = this._parseViewName(nextView.name);
            this._currentState.selectedFeed.view.name = viewName;
        }

        return perfScenario;
    }

    private _handlePackagesFilterBarChanged(payload: IFilterState): void {
        const nextFilterText: string = PackageFilterBarHelper.getKeywordFilterText(payload);
        const nextSourceKey: UpstreamSource = filterStateToUpstreamSource(
            payload,
            this._currentState.selectedFeed.upstreamSources
        );
        const nextView: FeedView = this._getFilterFeedView(payload);
        const filterScenario = this._handleFilterTextUpdates(nextFilterText);
        const upstreamScenario = this._handleUpstreamSourceUpdates(nextSourceKey);
        const viewScenario = this._handleSelectedFeedViewUpdates(nextView);
        const overallPerfScenario: Performance.IScenarioDescriptor[] = [
            filterScenario,
            upstreamScenario,
            viewScenario
        ].filter(value => !!value);

        const atLeastOneUpdate: boolean = overallPerfScenario.length > 0;
        const wasFilterUpdate: boolean = !!filterScenario;
        const filterQueryString: string = wasFilterUpdate ? nextFilterText : this._filterText;

        if (atLeastOneUpdate) {
            const showDeleted: boolean = this._includeDeletedPackages();
            const directUpstreamSourceId: string = this._currentState.selectedFeed.upstreamSource
                ? this._currentState.selectedFeed.upstreamSource.id
                : null;

            this._currentState.packagesLoading = true;
            NavigationHandler.updateUrlWithFilterValues(this._currentState.selectedFeed);
            this._filterByEnabledProtocolDataService
                .getPackagesAsync(
                    this._getFullyQualifiedFeedId(),
                    this._currentState.pageSize, // top
                    null, // skip default 0
                    showDeleted,
                    null, // isListed
                    filterQueryString,
                    true, // includeDescription
                    directUpstreamSourceId
                )
                .then((packages: Package[]) => {
                    this.setCurrentStatePackages(packages, this._currentState.pageSize, true);
                    if (this._currentState.selectedPackages.length > 0) {
                        const newSelectedPackages: Package[] = [];
                        this._currentState.selectedPackages.forEach((selectedPackage: Package) => {
                            const indexFound = findIndex(
                                this._currentState.packages,
                                (pkg: Package) => pkg.id === selectedPackage.id
                            );
                            if (indexFound !== -1) {
                                newSelectedPackages.push(selectedPackage);
                            }
                        });
                        this._currentState.selectedPackages = newSelectedPackages;
                    }

                    this._currentState.packagesLoading = false;
                    this._finishNextPageLoadingEvent();
                    overallPerfScenario.forEach(scenario => scenario.end());

                    const announcement = buildAnnouncementPackageFilterResults(packages, this._currentState.pageSize);
                    announce(announcement);

                    // Set MRU view
                    const nextMru: string =
                        nextView != null
                            ? Utils_String.format("{0}@{1}", this._currentState.selectedFeed.id, nextView.id)
                            : this._currentState.selectedFeed.id;
                    const settingsDataService: SettingsDataService = Service.getLocalService(SettingsDataService);
                    settingsDataService.setMruFullyQualifiedFeedId(nextMru);

                    this.emitChanged();

                    return packages;
                })
                .then((packages: Package[]) => {
                    this._getPackageMetrics(packages);
                });
        }

        // If the view wasn't changed, and the user does not have access to the feed, leave the value as it was
        if (!viewScenario && !PermissionHelper.hasAccessToBaseFeed(this._currentState.selectedFeed)) {
            const newState = PackageFilterBarHelper.setFeedViewToFilterState(
                payload,
                this._currentState.selectedFeed.view
            );

            // suppress the event, since we don't want to get in a loop
            this._currentState.hubState.filter.setState(newState, true /*suppressChangeEvent*/);
        }

        this._filterText = nextFilterText;
        this.emitChanged();
    }

    private _handlePackageVersionDeprecatedAction(payload: IPackageDeprecatedPayload): void {
        if (payload.selectedVersion && payload.selectedPackages && payload.selectedPackages.length === 1) {
            // This is the handling for the single dialog.
            const index = findIndex(
                this._currentState.packages,
                (pkg: Package) => pkg.id === payload.selectedPackages[0].id
            );
            const version = this._currentState.packages[index].versions[0] as PackageVersion;
            if (version.protocolMetadata && version.protocolMetadata.data) {
                version.protocolMetadata.data.deprecated = payload.message;
            }

            this.emitChanged();
            return;
        }

        if (payload.selectedPackages) {
            CustomerIntelligenceHelper.publishEvent(CiConstants.MultiplePackageVersionsDeprecated);
            const deprecateScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.MultiplePackageVersionsDeprecated
            );
            const npmPackageDetails = [];

            payload.selectedPackages.forEach((pkg: Package) => {
                npmPackageDetails.push({
                    id: pkg.name,
                    version: pkg.versions[0].version
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
                        // Update latest version
                        this._currentState.selectedPackages.forEach((pkg: Package) => {
                            const version = pkg.versions[0] as PackageVersion;
                            if (version.protocolMetadata && version.protocolMetadata.data) {
                                version.protocolMetadata.data.deprecated = payload.message;
                            }
                        });

                        this.emitChanged();

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
        }
    }

    private async _handlePackagesDeletedAction(payload: IPackageDeletedPayload): Promise<void> {
        if (!payload.selectedPackages || (payload.selectedVersions && payload.selectedVersions.length !== 0)) {
            // Event is actually handled by the PackageStore in this case
            return;
        }

        const feed = this._currentState.selectedFeed;
        const packages = payload.selectedPackages;
        const singlePackage = packages.length === 1;

        CustomerIntelligenceHelper.publishEvent(
            singlePackage ? CiConstants.PackageVersionDeleted : CiConstants.MultiplePackageVersionsDeleted
        );
        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            singlePackage ? PerfScenarios.PackageVersionDeleted : PerfScenarios.MultiplePackageVersionsDeleted
        );
        perfScenario.addData({ protocolType: packages[0].protocolType });

        try {
            const packagesByProtocolType = partition(packages, pkg => pkg.protocolType);
            const batchOperations = Object.keys(packagesByProtocolType).map(async protocolType => {
                try {
                    const provider = ProtocolProvider.get(protocolType, true);
                    await provider.deleteLatestVersions(feed, packagesByProtocolType[protocolType]);
                } catch (error) {
                    throw new Error(protocolType);
                }
            });

            await Promise.all(batchOperations);

            // Lie to the user that the packages were already deleted
            const selectedPackageIds: string[] = [];
            const recycleBinPackages = this._currentState.recycleBinState.recycleBinPackages;
            payload.selectedPackages.forEach(pkg => {
                const firstVersion = pkg.versions[0];
                firstVersion.isDeleted = true;
                firstVersion.isListed = false;

                if (recycleBinPackages) {
                    recycleBinPackages.push(pkg);
                }
                selectedPackageIds.push(pkg.id);
            });
            // if hiding deleted packages, latest version might have changed
            // this is best-effort, since deletion may not have been processed on the server yet
            if (this._currentState.selectedFeed.hideDeletedPackageVersions) {
                this._handlePackageListUpdatedAction(selectedPackageIds);
            }

            this._currentState.selectedPackages = [];
            this.emitChanged();
            perfScenario.end();
        } catch (error) {
            perfScenario.abort();
            CustomerIntelligenceHelper.publishEvent(CiConstants.BatchRequestFailed);
            Actions.ErrorEncountered.invoke({
                message: Utils_String.format(PackageResources.DeleteDialog_MultiDeleteFailed, error.message),
                isCritical: true
            } as IError);
        } finally {
            Actions.PackageDeletedCompleted.invoke({}); // See ***Note*** above
        }
    }

    private _handleCloseRecycleBinModalDialog(): void {
        this._currentState.recycleBinState.dialogOpen = false;
        this.emit();
    }

    private _handleOpenRecycleBinModalDialog(): void {
        this._currentState.recycleBinState.dialogOpen = true;
        this.emit();
    }

    // this method gets all package version from feed index and then makes small batch calls for permanent delete for each protocol.
    private async _handleEmptyRecycleBinAction(): Promise<void> {
        // set the dialog to loading state.
        this._currentState.recycleBinState.dialogProcessing = true;
        this.emitChanged();

        let skipNumberOfPackagesAlreadyFetched: number = 0;
        let noMorePackagesExistsOnServer: boolean = false;

        let emptyRecycleBinScenario: Performance.IScenarioDescriptor = null;
        CustomerIntelligenceHelper.publishEvent(CiConstants.EmptyRecycleBin);
        emptyRecycleBinScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.EmptyRecycleBin
        );

        try {
            const errorProtocols: string[] = [];
            const successProtocols: string[] = [];

            let packages: Package[] = [];
            const batchSize = 1000;
            while (!noMorePackagesExistsOnServer) {
                const packagesBatch = await this._filterByEnabledProtocolDataService.getRecycleBinPackagesAsync(
                    this._currentState.selectedFeed.id,
                    batchSize,
                    skipNumberOfPackagesAlreadyFetched, // skip
                    null, // packageNameQuery
                    null, // protocolType
                    true // includeAllVersions
                );
                Performance.getScenarioManager().split(EmptyRecycleBinScenarioSplits.GETPACKAGESBATCH);
                if (this._getPackageVersionCount(packagesBatch) < batchSize) {
                    noMorePackagesExistsOnServer = true;
                }
                skipNumberOfPackagesAlreadyFetched += batchSize;
                packages = packages.concat(packagesBatch);
            }

            await this.callBatchPermanentDeleteOnPageSize(packages, errorProtocols, successProtocols);
            Performance.getScenarioManager().split(EmptyRecycleBinScenarioSplits.SENDBATCHPERMANENTDELETE);

            if (errorProtocols.length > 0) {
                const errorUniqueProtocols: string[] = [];
                new Set(errorProtocols).forEach(v => errorUniqueProtocols.push(v));
                Actions.ErrorEncountered.invoke({
                    message: Utils_String.format(
                        PackageResources.RecycleBin_EmptyRecycleBinFailed,
                        errorUniqueProtocols.join(", ")
                    ),
                    isCritical: true
                } as IError);
            } else {
                if (
                    successProtocols.length > 0 &&
                    errorProtocols.length === 0 &&
                    this._currentState.recycleBinState.recycleBinPackages != null
                ) {
                    this._currentState.recycleBinState.recycleBinPackages = [];
                }
            }
            Performance.getScenarioManager().split(EmptyRecycleBinScenarioSplits.EMPTYRECYCLEBINCOMPLETE);
            emptyRecycleBinScenario.end();
        } catch (error) {
            Actions.ErrorEncountered.invoke({
                message: error.message,
                isCritical: true
            } as IError);
            emptyRecycleBinScenario.abort();
        } finally {
            this._currentState.selectedPackages = [];
            this._currentState.recycleBinState.dialogOpen = false;
            this._currentState.recycleBinState.dialogProcessing = false;
            this.emitChanged();
        }
    }

    private _getPackageVersionCount(packages: Package[]): number {
        let versionCount = 0;
        packages.forEach(pkg => {
            versionCount += pkg.versions.length;
        });

        return versionCount;
    }

    private async callBatchPermanentDeleteOnPageSize(
        packagesToDelete: Package[],
        errorProtocols: string[],
        successProtocols: string[]
    ): Promise<void> {
        const { selectedFeed } = this._currentState;
        const packagesByProtocolType: IDictionaryStringTo<Package[]> = partition(
            packagesToDelete,
            pkg => pkg.protocolType
        );
        const batchOperations = Object.keys(packagesByProtocolType).map(async protocolType => {
            try {
                const provider = ProtocolProvider.get(protocolType, true);
                const minPackageDetails: MinimalPackageDetails[] = [];

                packagesByProtocolType[protocolType].forEach(pkg => {
                    if (pkg.versions) {
                        pkg.versions.forEach(version =>
                            minPackageDetails.push({ id: pkg.name, version: version.version })
                        );
                    }
                });

                await provider.permanentlyDeletePackageVersions(selectedFeed, minPackageDetails);

                successProtocols.push(protocolType);
            } catch (error) {
                errorProtocols.push(protocolType);
            }
        });

        // We _could_ simply return the promise directly, but that leaks the 'array' nature
        // of the batching outside of this method
        await Promise.all(batchOperations);
    }

    private async _handlePackageVersionsPromotedThrougPanelAction(payload: IPackagePromotedPayload): Promise<void> {
        const { selectedFeed, packages } = this._currentState;
        const { minimalPackageDetails, promotedView } = payload;

        const scenario = this._addPromoteTelemetry(payload);
        try {
            const errorProtocols: string[] = [];
            const successProtocols: string[] = [];
            const packagesByProtocolType = partition(minimalPackageDetails, pkg => pkg.protocolType);
            const batchOperations = Object.keys(packagesByProtocolType).map(async protocolType => {
                try {
                    const provider = ProtocolProvider.get(protocolType, true);
                    await provider.promotePackageVersions(
                        selectedFeed,
                        promotedView,
                        packagesByProtocolType[protocolType]
                    );
                    successProtocols.push(protocolType);
                } catch (error) {
                    errorProtocols.push(protocolType);
                }
            });

            await Promise.all(batchOperations);

            // Did any protocol fail?
            if (errorProtocols.length) {
                const message = Utils_String.format(
                    PackageResources.MultiPromotePanel_PromoteFailed_Many,
                    errorProtocols.join(", ")
                );
                throw new Error(message);
            }

            // Lie to the user
            successProtocols.forEach(protocolType => {
                packagesByProtocolType[protocolType].forEach((promotedPkg: MinimalPackageDetails) => {
                    const existingPackage = packages.find(
                        (pkg: Package) => pkg.name === promotedPkg.id && pkg.versions[0].version === promotedPkg.version
                    );
                    if (existingPackage && !existingPackage.versions[0].views.some(v => v.id === promotedView.id)) {
                        existingPackage.versions[0].views.push(promotedView);
                    }
                });
            });

            const fullyQualifiedFeedId = Utils_String.format(
                "{0}@{1}",
                this._currentState.selectedFeed.id,
                payload.promotedView.id
            );
            const settingsDataService = Service.getLocalService(SettingsDataService);
            settingsDataService.setMruFullyQualifiedFeedId(fullyQualifiedFeedId);
            this._currentState.mruViewId = promotedView.id;
            this._currentState.selectedPackages = [];
            this._currentState.isMultiPromotePanelOpen = false;
            this.emitChanged();
            scenario.end();
        } catch (error) {
            scenario.abort();
            CustomerIntelligenceHelper.publishEvent(CiConstants.BatchRequestFailed);
            Actions.ErrorEncountered.invoke({ message: error.message, isCritical: true });
        }
    }

    private _handleMultiCommandVersionDropdownClickedAction(packageId: string): void {
        this._feedsDataService
            .getPackageVersionsAsync(this._currentState.selectedFeed.id, packageId, null, null)
            .then((versions: PackageVersion[]) => {
                const updatedIndex = findIndex(this._currentState.packages, (pkg: Package) => pkg.id === packageId);
                if (updatedIndex !== -1) {
                    this._currentState.multiCommandDropdownVersions = { packageId, versions };
                    this.emitChanged();
                }
            });
    }

    private async _handleNewFeed(newFeedPayload: INewFeedCreatedPayload): Promise<void> {
        const feed = newFeedPayload.createdFeed;
        const perfScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.CreateFeed
        );
        this._currentState.displayWelcomeMessage = false;
        this._currentState.feeds.push(feed);
        this._currentState.feeds = this._currentState.feeds.sort(this._feedSort);

        try {
            await this.feedManager.renderNewFeed(feed);
        } catch (error) {
            Actions.ErrorEncountered.invoke({
                message: error.message,
                isCritical: true
            } as IError);
        } finally {
            this.emitChanged();
        }

        perfScenario.end();
    }

    private _handleFeedListUpdatedAction(feeds: Feed[]) {
        this._currentState.feeds = feeds;
    }

    @autobind
    private _handlePackageSelectedAction(packageSummary: Package): void {
        this._currentState.selectedPackages = [];
        this.emitChanged();
    }

    @autobind
    private _handleRecyleBinPackageSelectedAction(packageSummary: Package): void {
        this._currentState.selectedPackages = [];
        this.emitChanged();
    }

    private _handlePackageListUpdatedAction(updatedPackageIds: string[] = null): void {
        // If payload has an array of updated package ids, only update those packages.
        if (updatedPackageIds && updatedPackageIds.length > 0) {
            const updatedPackages = this._currentState.packages.map((pkg, index) => {
                if (pkg && pkg.versions && pkg.versions.length > 0 && updatedPackageIds.indexOf(pkg.id) !== -1) {
                    return this._feedsDataService
                        .getPackageAsync(this._getFullyQualifiedFeedId(), pkg.id, /*includeDescription*/ true)
                        .then(
                            (packageResult: Package) => {
                                this._currentState.packages[index] = packageResult;
                            },
                            error => {
                                // no versions of package found/available
                                this._currentState.packages.splice(index, 1);
                            }
                        );
                }
            });
            Q.allSettled(updatedPackages).then(() => {
                this.emitChanged();
            });
        } else {
            CustomerIntelligenceHelper.publishEvent(CiConstants.PackageListUpdated);
            const packageListUpdatedScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.PackageListUpdated
            );

            this._updatePackageList(packageListUpdatedScenario);
        }
    }

    private _handlePackageListedStatusChangedAction(payload: IPackageListedStatusChangedPayload): void {
        this._currentState.packages.some(pkg => {
            if (pkg && payload.packageId === pkg.id) {
                pkg.versions[0].isDeleted = payload.isDeleted || pkg.versions[0].isDeleted;
                pkg.versions[0].isListed = payload.isListed;
                this.emitChanged();
                if (pkg.versions[0].isDeleted && this._currentState.selectedFeed.hideDeletedPackageVersions) {
                    this._handlePackageListUpdatedAction([pkg.id]);
                }
                return true;
            }
        });
    }

    private _addPromoteTelemetry(payload: IPackagePromotedPayload): Performance.IScenarioDescriptor {
        let promoteScenario: Performance.IScenarioDescriptor;
        if (payload.minimalPackageDetails.length > 1) {
            CustomerIntelligenceHelper.publishEvent(CiConstants.PackagesPromoted);
            promoteScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.PackagesPromoted
            );
        } else {
            CustomerIntelligenceHelper.publishEvent(CiConstants.PackagePromoted);
            promoteScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.PackagePromoted
            );
        }

        return promoteScenario;
    }

    private _handleFeedSettingsNavigateClicked(): void {
        this._initializeFeedSettingsState();
        NavigationHandler.navigateToSettings(this._currentState.selectedFeed);
        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedSettingsOpened);
    }

    private _handlePackageListedChangedAction(payload: IPackageListedPayload) {
        if (payload.selectedPackages) {
            CustomerIntelligenceHelper.publishEvent(CiConstants.MultiplePackageVersionsListedUnlisted);
            const unlistScenario = Performance.getScenarioManager().startScenario(
                PerfScenarios.Area,
                PerfScenarios.MultiplePackageVersionsListedUnlisted
            );
            const nuGetPackageDetails: MinimalPackageDetails[] = [];

            payload.selectedPackages.forEach((pkg: Package) => {
                nuGetPackageDetails.push({
                    id: pkg.name,
                    version: pkg.versions[0].version
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
                    // Lie to the user that packages were already listed/unlisted
                    this._currentState.packages.forEach((pkg: Package) => {
                        const found = payload.selectedPackages.some(
                            (selectedPackage: Package) => selectedPackage.id === pkg.id
                        );
                        if (found) {
                            pkg.versions[0].isListed = payload.isListed;
                        }
                    });
                    this.emitChanged();
                    Actions.PackageListedChangedCompleted.invoke({}); // See ***Note*** above
                    unlistScenario.end();

                    const announcement = buildAnnouncementListedStatusChangedForPackage(
                        payload.selectedPackages,
                        payload.isListed
                    );
                    announce(announcement, true);
                },
                error => {
                    Actions.PackageListedChangedCompleted.invoke({}); // See ***Note*** above
                    Actions.ErrorEncountered.invoke({
                        message: error.message,
                        isCritical: true
                    } as IError);
                }
            );
        }
    }

    private _includeDeletedPackages(): boolean {
        // Our client doesn't send null query parameters
        // getPackages endpoint uses false as default value for isDeleted if you don't send a value
        return PermissionHelper.isDeleted(this._currentState.selectedFeed) !== false;
    }

    private _navigateToRecycleBin(replaceHistory: boolean = false): void {
        NavigationHandler.navigateToRecycleBin(this._currentState.selectedFeed, replaceHistory);
        CustomerIntelligenceHelper.publishEvent(CiConstants.FeedSettingsOpened);
    }

    private _updatePackageList(scenario: Performance.IScenarioDescriptor, packageListMustUpdate: boolean = false) {
        const cachedModifiedPackages = PackageModifiedCache.packageModifiedCache;
        this._packagesReFetched = null;
        if (
            packageListMustUpdate ||
            (this._currentState.selectedFeed &&
                (!this._currentState.packages ||
                    scenario.getName() === PerfScenarios.PackageListUpdated ||
                    (cachedModifiedPackages && Object.keys(cachedModifiedPackages).length > 0)))
        ) {
            this._currentState.packagesLoading = true;
            const directUpstreamSourceId: string = this._currentState.selectedFeed.upstreamSource
                ? this._currentState.selectedFeed.upstreamSource.id
                : null;

            this._filterByEnabledProtocolDataService
                .getPackagesAsync(
                    this._getFullyQualifiedFeedId(),
                    this._currentState.pageSize, // top
                    null, // skip default 0
                    this._includeDeletedPackages(),
                    null, // isListed
                    this._filterText,
                    true, // includeDescription
                    directUpstreamSourceId
                )
                .then((packages: Package[]) => {
                    this.setCurrentStatePackages(packages, this._currentState.pageSize, true);
                    PackageModifiedCache.packageModifiedCache = {};

                    this._finishNextPageLoadingEvent();
                    this._currentState.packagesLoading = false;
                    scenario.end();
                    this._currentState.selectedPackages = [];
                    this._packagesReFetched = true;
                    this.emitChanged();

                    return packages;
                })
                .then((packages: Package[]) => {
                    this._getPackageMetrics(packages);
                });
        } else {
            this.setCurrentStatePackages(this._currentState.packages, this._currentState.requestedPackageCount, true);
            scenario.end();
            this._currentState.selectedPackages = [];
            this._packagesReFetched = false;
        }
        this.emitChanged();
    }

    private _updateRecycleBinPackagesList(scenario: Performance.IScenarioDescriptor): void {
        this._currentState.packagesLoading = true;

        this._filterByEnabledProtocolDataService
            .getRecycleBinPackagesAsync(
                this._currentState.selectedFeed.id,
                this._currentState.pageSize,
                0, // skip
                null
            )
            .then(
                (packages: Package[]) => {
                    this.setRecycleBinPackages(packages);
                    this._currentState.packagesLoading = false;
                    scenario.end();
                    this._currentState.selectedPackages = [];
                    this.emitChanged();
                },
                (error: Error) => {
                    this._currentState.packagesLoading = false;
                    scenario.abort();
                    Actions.ErrorEncountered.invoke({
                        message: error.message,
                        isCritical: true
                    } as IError);
                }
            );
    }

    private _feedSort(f1: Feed, f2: Feed): number {
        const feedName1 = f1.name.toLocaleLowerCase();
        const feedName2 = f2.name.toLocaleLowerCase();
        if (feedName1 > feedName2) {
            return 1;
        }

        if (feedName1 < feedName2) {
            return -1;
        }

        return 0;
    }

    private _updateSelectedViewFilter(filterState: IFilterState, viewName: string): IFilterState {
        if (this._currentState.selectedFeed == null || this._currentState.feedViews == null) {
            return filterState;
        }

        viewName = this._parseViewName(viewName);
        const index = findIndex(this._currentState.feedViews, (view: FeedView) => {
            return view.name === viewName || view.id === viewName;
        });

        if (index === -1) {
            Actions.ErrorEncountered.invoke({
                message: Utils_String.format(
                    PackageResources.Error_UrlFeedNotFound,
                    getFullyQualifiedFeedName(this._currentState.selectedFeed, viewName)
                )
            } as IError);
        } else {
            const view = this._currentState.feedViews[index];
            this._currentState.selectedFeed.view = view;
            filterState = PackageFilterBarHelper.setFeedViewToFilterState(filterState, view);
        }

        return filterState;
    }

    private _parseViewName(viewName: string): string {
        if (!viewName) {
            return null;
        }

        return viewName.indexOf("@") !== -1 ? viewName.split("@")[1] : viewName;
    }

    private _getFullyQualifiedFeedId(): string {
        if (this._currentState.selectedFeed.view && this._currentState.selectedFeed.view.id) {
            return this._currentState.selectedFeed.id + "@" + this._currentState.selectedFeed.view.id;
        } else {
            return this._currentState.selectedFeed.id;
        }
    }

    private _handleUpstreamDisabled(upstreamSource?: string) {
        if (upstreamSource && upstreamSource !== PackageResources.UpstreamSourceKey_All) {
            Actions.ErrorEncountered.invoke({
                message: PackageResources.Error_UpstreamSourcesNotEnabled
            });
        } else {
            this._currentState.selectedFeed.upstreamSource = null;
        }
    }

    private _finishNextPageLoadingEvent(): void {
        if (this._currentState.packages && this._currentState.packages.length > 0) {
            this._currentState.nextPageLoading = false;
        }
    }

    private _getFilterFeedView(filterState: IFilterState): FeedView {
        let feedView: FeedView;
        const filterFeedViewState: IFilterItemState = filterState[PackageFilterBarConstants.ViewFilterKey];

        if (filterFeedViewState) {
            const dropdownValues: IPickListItem[] = filterFeedViewState.value;

            if (dropdownValues && dropdownValues.length > 0) {
                feedView = filterFeedViewState.value[0] as FeedView;
                return feedView;
            }
        }

        return feedView;
    }

    private setCurrentStatePackages(packages: Package[], requestedCount: number, applyCache: boolean = false): void {
        this._currentState.packages = packages;
        this._currentState.requestedPackageCount = requestedCount;
        if (packages == null || packages.length === 0) {
            return;
        }

        if (applyCache) {
            this._currentState.packages = PackageModifiedCache.applyCacheByPackageList(packages);
        }
    }

    private _correctLatestVersion(packageSummary?: Package) {
        if (this._currentState.selectedFeed) {
            if (
                this._packagesReFetched === false &&
                packageSummary != null &&
                this._currentState.packages &&
                (isV2Feed(this._currentState.selectedFeed) ||
                    (packageSummary.isCached == false || !packageSummary.versions[0].isCachedVersion))
            ) {
                // Correct the latest version if getting all versions in the versions list updated the latest version.
                // Removing all newer versions that are not in the view and/or are not listed.
                const index = findIndex(this._currentState.packages, (pkg: Package) => pkg.id === packageSummary.id);
                if (index !== -1) {
                    const versions = this._currentState.packages[index].versions;
                    if (this._currentState.selectedFeed.view) {
                        const viewFoundInLatestVersion = versions[0].views.some(
                            (view: FeedView) => view.id === this._currentState.selectedFeed.view.id
                        );
                        if (!viewFoundInLatestVersion) {
                            // must remove earlier versions that don't exist in a view (clearing filters will make a new API call and undo this)
                            versions.splice(0, 1);
                            for (let i = 0; i < versions.length; i++) {
                                const viewFoundinVersion = versions[i].views.some(
                                    (view: FeedView) => view.id === this._currentState.selectedFeed.view.id
                                );
                                if (viewFoundinVersion && !versions[i].isDeleted && versions[i].isListed) {
                                    // remove all newer versions before this index
                                    versions.splice(0, i);
                                    break;
                                }
                            }
                        }
                    } else {
                        for (let i = 0; i < versions.length; i++) {
                            if (!versions[i].isDeleted && versions[i].isListed) {
                                // remove all newer versions before this index
                                versions.splice(0, i);
                                break;
                            }
                        }
                    }
                }

                this.emitChanged();
            }
        }
    }

    @autobind
    private setRecycleBinPackages(packages: Package[]): void {
        this._currentState.recycleBinState.recycleBinPackages = packages || [];
    }

    @autobind
    private appendRecycleBinPackages(packages: Package[]): void {
        const recycleBinState = this._currentState.recycleBinState;

        recycleBinState.recycleBinPackages = [].concat(recycleBinState.recycleBinPackages, packages || []);
    }

    private _currentState: FeedState;

    private _feedsDataService: FeedsDataService;
    private _webPageDataService: HubWebPageDataService;
    private _filterByEnabledProtocolDataService: FilterByEnabledProtocolDataService;

    private _filterText: string;
    private _packagesReFetched: boolean;
    private feedManager: FeedManager;
}
