import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { CustomSet } from "Feed/Common/Types/CustomSet";

/**
 * Show Delete views dialog when user clicked on Delete button in Views pivot
 */
export class DeleteViewsHandler {
    public static async handleAsync(state: IFeedSettingsState): Promise<void> {
        if (state.selectedViews == null || state.selectedViews.length === 0) {
            // shouldn't encounter this case, if you do then you're calling this method in wrong place
            throw new Error("state.selectedViews cannot be null or empty");
        }

        const deletedViewIds = new CustomSet<string>();
        const errors: string[] = [];
        const feedsDataService = Service.getService(FeedsDataService);
        const deleteViewPromises: Array<Promise<void>> = [];

        state.selectedViews.forEach((selectedView: FeedView) => {
            const viewId = selectedView.id;
            const promise = feedsDataService.deleteFeedViewAsync(state.feed().id, viewId);
            promise
                .then(() => {
                    // capture views that are successfully deleted, so we can filter them out
                    deletedViewIds.add(viewId);
                })
                .catch((error: TfsError) => {
                    errors.push(error.message);
                });
            deleteViewPromises.push(promise);
        });

        try {
            await Promise.all(deleteViewPromises);
            const viewNames: string = state.selectedViews.map(view => view.name).join(", ");
            announce(Utils_String.format(PackageResources.DeletedAnnouncement, viewNames));
        } catch (error) {
            announce(PackageResources.DeletedAnnouncement_Failed);
            throw new Error(errors.join(", "));
        } finally {
            // remove deleted indexes
            state.selectedViews = state.selectedViews.filter((selectedView: FeedView) => {
                return deletedViewIds.has(selectedView.id) === false;
            });

            // remove deleted views
            state.views = state.views.filter((view: FeedView) => {
                return deletedViewIds.has(view.id) === false;
            });
        }
    }
}
