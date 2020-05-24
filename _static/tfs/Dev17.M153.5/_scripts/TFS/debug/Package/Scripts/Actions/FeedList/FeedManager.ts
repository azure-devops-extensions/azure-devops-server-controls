import { autobind, findIndex } from "OfficeFabric/Utilities";

import { getPageContext } from "VSS/Context";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { IFilter } from "VSSUI/Utilities/Filter";

import { NavigationHandler } from "Package/Scripts/Common/NavigationHandler";
import { DataProviderConstants } from "Feed/Common/Constants/Constants";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { FilterByEnabledProtocolDataService } from "Package/Scripts/DataServices/FilterByEnabledProtocolDataService";
import { SettingsDataService } from "Package/Scripts/DataServices/SettingsDataService";
import { getFullyQualifiedFeedId } from "Package/Scripts/Helpers/FeedNameResolver";
import { PackageFilterBarHelper } from "Package/Scripts/Helpers/PackageFilterBarHelper";
import { hasAccessToBaseFeed, isDeleted, isFeedReader } from "Package/Scripts/Helpers/PermissionHelper";
import { urlSourceToUpstreamSource } from "Package/Scripts/Helpers/UpstreamHelper";
import { FeedState } from "Package/Scripts/Stores/FeedStore";
import { IHubState } from "Package/Scripts/Types/IHubState";
import { FeedMessage } from "Package/Scripts/Types/WebPage.Contracts";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedPermission, FeedView, Package, UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { CustomSet } from "Feed/Common/Types/CustomSet";

export class FeedManager {
    private state: () => FeedState;
    private feedsDataService: FeedsDataService;
    private packagesDataService: FilterByEnabledProtocolDataService;

    // set of guids for which extended feed data & permissions have been loaded
    private feedsLoaded: CustomSet<string>;

    constructor(state: () => FeedState) {
        this.state = state;
        this.feedsDataService = Service.getLocalService(FeedsDataService);
        this.packagesDataService = Service.getLocalService(FilterByEnabledProtocolDataService);
        this.feedsLoaded = new CustomSet<string>();
    }

    public async setFeed(feed: Feed): Promise<void> {
        this.clear();
        feed = await this.updateFeedAsync(feed);
        await this.updateViewsAsync(feed);
        await this.updatePackagesAsync(feed);
        this.feed = feed;
        await this.updateFeedMessageAsync();

        NavigationHandler.addFeedHistory(feed);
        await this.updateMruAsync(feed);
    }

    public async renderNewFeed(feed: Feed): Promise<void> {
        this.clear();
        this.feed = feed;
        this.packages = [];

        NavigationHandler.renderFeed(feed);
    }

    /** use the hub state to determine which feed to load */
    public async setFeedFromUrlAsync(hubState: IHubState): Promise<void> {
        this.clear();

        let feedInUrl: string = null;
        let viewInUrl: string = null;

        const parts = hubState.feed.split("@");
        feedInUrl = parts[0];
        if (parts.length === 2) {
            viewInUrl = parts[1];
        }

        const feedIndex = this.findFeedIndex(feedInUrl);
        const feedToSet = await this.updateFeedAtIndexAsync(feedIndex);

        feedToSet.upstreamSource = this.getUpstreamSource(hubState, feedToSet);
        feedToSet.view = await this.updateViewsAndGetMatchingViewAsync(feedToSet, viewInUrl);

        await this.updatePackagesAsync(feedToSet);
        this.feed = feedToSet;
        await this.updateMruAsync(feedToSet);
    }

    private async updateFeedAsync(feed: Feed): Promise<Feed> {
        if (!this.feedsLoaded.has(feed.id)) {
            const index = this.findFeedIndex(feed.name);
            return this.updateFeedAtIndexAsync(index);
        }
        return feed;
    }

    private async updateFeedAtIndexAsync(index: number): Promise<Feed> {
        let feed = this.feedState.feeds[index];
        if (!this.feedsLoaded.has(feed.id)) {
            feed = await this.getFeedAsync(feed);
            feed.permissions = await this.getFeedPermissionsAsync(feed);
            this.feedsLoaded.add(feed.id);
            this.feedState.feeds[index] = feed;
        }
        return feed;
    }

    public async updateViewsAndGetMatchingViewAsync(feedToSet: Feed, viewInUrl: string): Promise<FeedView> {
        await this.updateViewsAsync(feedToSet);

        const viewIndex = findIndex(this.views, (view: FeedView) => {
            return Utils_String.equals(view.name, viewInUrl, true) || Utils_String.equals(view.id, viewInUrl, true);
        });
        if (viewIndex === -1) {
            return null;
        } else {
            return this.views[viewIndex];
        }
    }

    private findFeedIndex(feedInUrl: string): number {
        let index = findIndex(this.feedState.feeds, (feed: Feed) => {
            return Utils_String.equals(feed.name, feedInUrl, true) || Utils_String.equals(feed.id, feedInUrl, true);
        });
        if (index === -1) {
            index = 0;
        }
        return index;
    }

    private async updateViewsAsync(feed: Feed): Promise<void> {
        this.views = await this.getViews(feed);

        // there are no views or user doesn't have access to any view
        if (this.views.length === 0) {
            feed.view = null;
            return;
        }

        if (hasAccessToBaseFeed(feed) === false || isFeedReader(feed) === true) {
            const view = this.getAccessibleViewEitherDefaultOrFirst(feed, this.views);
            feed.view = view;
            const currentFilterState = this.feedState.hubState.filter.getState();

            PackageFilterBarHelper.setFeedViewToFilterState(currentFilterState, view);
        }
    }

    private getUpstreamSource(hubState: IHubState, feedToSet: Feed): UpstreamSource {
        if (hubState.upstreamSource) {
            return urlSourceToUpstreamSource(hubState, this.feed.upstreamSources);
        }
        return null;
    }

    /**
     * Pick feed's default view if available to user
     * or top view user has access to
     */
    private getAccessibleViewEitherDefaultOrFirst(feed: Feed, views: FeedView[]): FeedView {
        // user doesn't have access to any views
        if (views.length === 0) {
            return null;
        }

        // there is no default view set for this feed
        if (feed.defaultViewId == null) {
            return views[0];
        }

        const index = findIndex(views, (view: FeedView) => {
            return view.id === feed.defaultViewId;
        });

        // user has access to defaultView
        if (index >= 0) {
            return views[index];
        }

        // user did not have access to default view
        return views[0];
    }

    private clear(): void {
        this.clearFilters();
        this.clearPackages();
        this.clearViews();
        this.clearSelectedUpstreamSource();
    }

    private clearPackages(): void {
        this.packages = [];
        this.feedState.selectedPackages = [];
    }

    private clearViews(): void {
        this.views = [];
        this.feedsView = null;
    }

    private clearSelectedUpstreamSource(): void {
        this.feedUpstreamSource = null;
    }

    private async updatePackagesAsync(feed: Feed): Promise<void> {
        const feedId = getFullyQualifiedFeedId(feed);
        const includeDeleted = isDeleted(feed) !== false;
        const directUpstreamSourceId = feed.upstreamSource != null ? feed.upstreamSource.id : null;
        const packages = await this.packagesDataService.getPackagesAsync(
            feedId,
            this.feedState.pageSize, // top
            null, // skip - default 0
            includeDeleted, // default false
            null, // isListed
            null, // packageNameQuery
            true, // includeDescription
            directUpstreamSourceId
        ); // upstream source

        this.packages = packages;
    }

    private async getFeedAsync(feed: Feed): Promise<Feed> {
        const refreshedFeed = await this.feedsDataService.getFeed(feed.id);
        return refreshedFeed as Feed;
    }

    private async getFeedPermissionsAsync(feed: Feed): Promise<FeedPermission[]> {
        const feedPermissions: FeedPermission[] = await this.feedsDataService.getFeedPermissionsAsync(
            feed,
            false /*includeIds*/,
            false /*excludeInheritedPermissions*/,
            this.feedState.currentUser
        );
        return feedPermissions;
    }

    private async getViews(feed: Feed): Promise<FeedView[]> {
        const feedViews: FeedView[] = await this.feedsDataService.getFeedViewsAsync(feed);
        return feedViews;
    }

    private clearFilters(): void {
        this.feedState.hubState.filter.setState({}, true /*suppressChangeEvent*/);
    }

    private async updateMruAsync(feed: Feed): Promise<void> {
        // Set mru as feedId@viewId is view exists
        const feedId = getFullyQualifiedFeedId(feed);
        const settingsDataService = Service.getLocalService(SettingsDataService);
        await settingsDataService.setMruFullyQualifiedFeedId(feedId);
    }

    @autobind
    public async updateFeedMessageAsync(): Promise<void> {
        const feed = this.feed;
        // reset the message in case we don't have one
        this.message = null;

        if (feed == null) {
            return Promise.resolve();
        }

        const extensionService = Service.getService(ExtensionService);
        const webPageDataService = Service.getService(WebPageDataService);
        const properties = {
            feedId: feed.id,
            project: getPageContext().webContext.project.name
        };

        const promise = new Promise<void>((resolve, reject) => {
            extensionService
                .getContribution(DataProviderConstants.FeedMessagesDataProvider)
                .then((contribution: Contribution) => {
                    return webPageDataService.ensureDataProvidersResolved([contribution], true, properties);
                })
                .then(
                    () => {
                        const newMessage = webPageDataService.getPageData<FeedMessage>(
                            DataProviderConstants.FeedMessagesDataProvider
                        );
                        // there is a chance that the user changed feeds before this completes, in which case, don't set an old message:
                        if (this.feed && this.feed.id === feed.id) {
                            if (newMessage) {
                                const key = Utils_String.format("{0}-{1}", newMessage.id, feed.id);

                                if (window.localStorage.getItem(key) !== key) {
                                    // user hasn't dismissed yet, so update it:
                                    this.message = newMessage;
                                }
                            }
                        }
                        resolve();
                    },
                    () => {
                        // feed message is not super important, so if things fail, keep going
                        resolve();
                    }
                );
        });
        await promise;
    }

    public clearFeedMessage(): void {
        if (this.feed && this.message) {
            const key = Utils_String.format("{0}-{1}", this.message.id, this.feed.id);
            window.localStorage.setItem(key, key);
            this.message = null;
        }
    }

    get feedState(): FeedState {
        return this.state();
    }

    get feedId(): string {
        // when a new feed is created for the first time, selectedFeed is null
        if (this.feedState.selectedFeed == null) {
            return null;
        }

        return this.feedState.selectedFeed.id;
    }

    set feedId(id: string) {
        this.feedState.selectedFeed.id = id;
    }

    get feed(): Feed {
        return this.feedState.selectedFeed;
    }

    set feed(feed: Feed) {
        this.feedState.selectedFeed = feed;
    }

    get message(): FeedMessage {
        return this.feedState.selectedFeedMessage;
    }

    set message(message: FeedMessage) {
        this.feedState.selectedFeedMessage = message;
    }

    set packages(packages: Package[]) {
        this.feedState.packages = packages;
    }

    get views(): FeedView[] {
        return this.feedState.feedViews;
    }

    set views(views: FeedView[]) {
        this.feedState.feedViews = views;
    }

    set feedsView(view: FeedView) {
        // when first feed is getting created, selectedFeed is null
        if (this.feedState.selectedFeed == null) {
            return;
        }
        this.feedState.selectedFeed.view = view;
    }

    set feedUpstreamSource(upstreamSource: UpstreamSource) {
        // when first feed is getting created, selectedFeed is null
        if (this.feedState.selectedFeed == null) {
            return;
        }
        this.feedState.selectedFeed.upstreamSource = upstreamSource;
    }

    get filter(): IFilter {
        return this.feedState.hubState.filter;
    }
}
