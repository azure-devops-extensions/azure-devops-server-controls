import * as Service from "VSS/Service";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { Feed, FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * User clicked Mark default view button in View's pivot command bar
 */
export class ChangeDefaultViewHandler {
    public static async handleAsync(state: IFeedSettingsState, selectedView: FeedView): Promise<void> {
        if (selectedView == null || selectedView.id == null) {
            // shouldn't run into this error
            throw new Error("selectedView or selectedView.id cannot be null");
        }

        const viewExists = state.views.some((view: FeedView) => {
            return selectedView.id === view.id;
        });

        if (viewExists === false) {
            throw new Error("selectedView doesn't exists");
        }

        const feedToUpdate = {
            id: state.feed().id,
            defaultViewId: selectedView.id
        } as Feed;

        const feedDataService = Service.getService(FeedsDataService);
        const feed = await feedDataService.updateFeedAsync(feedToUpdate);
        state.feed().defaultViewId = feed.defaultViewId;
        // this.state.defaultView = selectedView?
    }
}
