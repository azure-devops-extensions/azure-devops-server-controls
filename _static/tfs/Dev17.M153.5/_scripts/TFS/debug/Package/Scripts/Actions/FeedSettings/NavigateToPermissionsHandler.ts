import * as Service from "VSS/Service";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { filterWellKnownPermissions } from "Package/Scripts/Helpers/PermissionHelper";
import { FeedPermission } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * When user navigates to feed settings permission
 *  1. set loading spinner
 *  2. get feed's permission from server
 *  3. filter out roles that aren't shown in UI
 *  4. set data is fetched from server
 */
export class NavigateToPermissionsHandler {
    public static async handleAsync(state: IFeedSettingsState, emit: () => void): Promise<void> {
        state.isLoadingPermissions = true;
        emit();

        const feedsDataService: FeedsDataService = Service.getService(FeedsDataService);
        const includeIds: boolean = true;
        return feedsDataService.getFeedPermissionsAsync(state.feed(), includeIds).then(
            (permissions: FeedPermission[]) => {
                state.feedPermissions = filterWellKnownPermissions(permissions);
                state.isLoadingPermissions = false;
                state.isPermissionDataLoadedFromServer = true;
                emit();
            },
            (reason: Error) => {
                state.isLoadingPermissions = false;
                throw reason;
            }
        );
    }
}
