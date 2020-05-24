import * as NavigationService from "VSS/Navigation/Services";
import { HostNavigationService } from "VSS/SDK/Services/Navigation";

import { HubActionStrings } from "Feed/Common/Constants/Constants";
import { getFullyQualifiedFeedName } from "Package/Scripts/Helpers/FeedNameResolver";
import * as PackageResources from "Feed/Common/Resources";
import { IHubState } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";

export class NavigationHandler {
    /**
     * Update the uri to reflect changes in case feed name changed.
     */
    public static updateFeedNameInUrlIfChanged(feed: Feed): void {
        const currentState = NavigationService.getHistoryService().getCurrentState() as IHubState;
        if (currentState.feed === feed.name) {
            return;
        }
        this.updateUrlWithFeedName(feed);
    }

    // delete feed in settings or cancel on create feed
    public static navigateToFeed(
        feed: Feed = null,
        replaceHistoryPoint: boolean = true,
        viewName: string = null,
        suppressNavigate: boolean = true
    ): void {
        const hubState = this.getHubState(feed);

        this.updateHistoryEntry(HubActionStrings.ViewFeed, hubState, replaceHistoryPoint, null, suppressNavigate);
    }

    public static updateFeedHistoryOnLanding(feed: Feed): void {
        const currentState = NavigationService.getHistoryService().getCurrentState() as IHubState;

        // for create new feed
        if (currentState.action === HubActionStrings.CreateFeed) {
            this.updateUrlForCreateNewFeed();
            return;
        }

        // action must be feed or settings
        const hubState = this.getHubState(feed);
        hubState.action = currentState.action || HubActionStrings.ViewFeed;
        hubState.view = currentState.view;

        this.updateHistoryEntry(
            hubState.action, // it could be either feed or settings
            hubState,
            true, // replaceHistoryEntry
            null, // derive title from state or use default title
            true
        ); // suppressNavigate - already on feed
    }

    public static updateUrlWithFilterValues(feed: Feed): void {
        const hubState = this.getHubState(feed);

        this.updateHistoryEntry(
            HubActionStrings.ViewFeed,
            hubState,
            false, // replaceHistoryEntry
            null, // derive title from state or use default title
            true
        ); // suppressNavigate - just updating url
    }

    public static updateUrlWithFeedName(feed: Feed): void {
        const hubState = this.getHubState(feed);

        this.updateHistoryEntry(
            HubActionStrings.Settings,
            hubState,
            true, // replaceHistoryEntry
            null, // derive title from state or use default title
            true
        ); // suppressNavigate - just updating url
    }

    public static updateUrlForCreateNewFeed(): void {
        this.updateHistoryEntry(
            HubActionStrings.CreateFeed,
            null,
            true, // replaceHistoryEntry
            PackageResources.CreateNewFeed_PageTitle, // page title
            true
        ); // suppressNavigate - just updating url
    }

    public static addFeedHistory(feed: Feed): void {
        const state: IHubState = {
            feed: getFullyQualifiedFeedName(feed)
        } as IHubState;

        NavigationService.getHistoryService().addHistoryPoint(
            HubActionStrings.ViewFeed,
            state,
            null, // title
            true, // suppressNavigation
            false
        ); // mergeCurrentState

        this.setWindowTitle(feed.name);
    }

    public static renderFeed(feed: Feed): void {
        const hubState = this.getHubState(feed);

        const title = feed != null ? feed.name : PackageResources.HubTitle;
        this.updateHistoryEntry(
            HubActionStrings.ViewFeed,
            hubState,
            true, // replaceHistoryPoint
            title,
            false
        ); // suppressNavigate
    }

    public static navigateToRecycleBin(feed: Feed, replaceHistory: boolean = false): void {
        const state: IHubState = {
            feed: feed.fullyQualifiedName
        } as IHubState;

        this.updateHistoryEntry(HubActionStrings.RecycleBin, state, replaceHistory, state.feed, false); // invoke recyclebin navigation listeners
    }

    public static navigateToCreateFeed(): void {
        this.updateHistoryEntry(
            HubActionStrings.CreateFeed,
            null, // state
            false, // replace history point
            PackageResources.CreateNewFeed_PageTitle
        );
    }

    public static navigateToSettings(feed: Feed): void {
        const state: IHubState = {
            feed: feed.fullyQualifiedName
        } as IHubState;

        this.updateHistoryEntry(
            HubActionStrings.Settings,
            state,
            false, // replace history point
            feed.name,
            true
        ); // invoke settings navigation listeners
    }

    private static getHubState(feed: Feed): IHubState {
        const state: IHubState = {
            feed: getFullyQualifiedFeedName(feed)
        } as IHubState;

        return state;
    }

    private static updateHistoryEntry(
        action: string,
        data: IHubState,
        replaceHistoryEntry?: boolean,
        windowTitle?: string,
        suppressNavigate: boolean = true
    ): void {
        NavigationService.getHistoryService().updateHistoryEntry(
            action,
            data, // state
            replaceHistoryEntry, // replace history point
            false, // merge state
            null, // hub title
            suppressNavigate
        );

        windowTitle = windowTitle || (data != null && data.feed) || PackageResources.HubTitle;
        this.setWindowTitle(windowTitle);
    }

    private static setWindowTitle(title: string): void {
        const hostNavigationService = new HostNavigationService();
        hostNavigationService.setWindowTitle(title);
    }
}
