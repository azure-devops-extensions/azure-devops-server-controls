import * as Service from "VSS/Service";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { Feed, FeedPermission, FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * When user navigates to feed settings -> Views pivot
 * 1. set view loading spinner
 * 2. get views from server
 * 3. get view permissions from server
 * 4. set data is fetched from server
 */
export class NavigateToViewsHandler {
    public static async handleAsync(state: IFeedSettingsState, emit: () => void): Promise<void> {
        state.isLoadingViews = true;
        state.isLoadingViewPermissions = true;
        emit();

        const feedsDataService: FeedsDataService = Service.getService(FeedsDataService);

        return feedsDataService
            .getFeedViewsAsync(state.feed())
            .then(
                (views: FeedView[]) => {
                    state.isLoadingViews = false;
                    state.views = views;
                    emit();
                },
                (reason: Error) => {
                    state.isLoadingViews = false;
                    throw reason;
                }
            )
            .then(() => {
                const viewPermissionsPromises: Array<Promise<ViewAndPermissions>> = [];
                state.views.forEach((view: FeedView) => {
                    viewPermissionsPromises.push(
                        NavigateToViewsHandler.getViewAndPermissionsAsync(feedsDataService, state.feed(), view.id)
                    );
                });
                return Promise.all(viewPermissionsPromises);
            })
            .then(
                (viewAndPermissions: ViewAndPermissions[]) => {
                    state.viewPermissions = {};
                    for (const vp of viewAndPermissions) {
                        state.viewPermissions[vp.viewId] = vp.permissions;
                    }
                    state.isLoadingViewPermissions = false;
                    state.isViewsDataLoadedFromServer = true;
                    emit();
                },
                (reason: Error) => {
                    state.isLoadingViewPermissions = false;
                    throw reason;
                }
            );
    }

    private static async getViewAndPermissionsAsync(
        feedsDataService: FeedsDataService,
        feed: Feed,
        viewId: string
    ): Promise<ViewAndPermissions> {
        return feedsDataService
            .getFeedViewPermissionsAsync(feed, viewId, true /*includeIds*/, true /*excludeInheritedPermissions*/)
            .then((permissions: FeedPermission[]) => {
                return Promise.resolve({ viewId, permissions });
            });
    }
}

class ViewAndPermissions {
    public viewId: string;
    public permissions: FeedPermission[];
}
