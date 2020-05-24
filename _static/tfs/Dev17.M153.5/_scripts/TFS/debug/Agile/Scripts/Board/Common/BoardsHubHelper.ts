import { BoardsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";

/**
 * Simple helper to detect if the page is in embedded mode.
 */
export module BoardsHubHelper {
    export function isXHRHub(): boolean {
        const hubId = Service.getLocalService(HubsService).getSelectedHubId();
        return localeIgnoreCaseComparer(hubId, BoardsHubConstants.HUB_CONTRIBUTION_ID) === 0;
    }
}
