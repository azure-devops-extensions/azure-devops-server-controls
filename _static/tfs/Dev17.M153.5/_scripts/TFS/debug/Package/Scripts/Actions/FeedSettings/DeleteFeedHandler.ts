import * as Service from "VSS/Service";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";

/**
 * User clicked on Delete button in Delete Feed Dialog
 */
export class DeleteFeedHandler {
    public static async handleAsync(state: IFeedSettingsState): Promise<void> {
        const feedDataService = Service.getService(FeedsDataService);
        await feedDataService.deleteFeedAsync(state.feed().id);
        return;
    }
}
