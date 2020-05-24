import * as React from "react";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";

// These utility methods should be called from the react components only.
// Xhr navigation for the url provided along with the target HubId where url is navigating to
// For links, you should specify both an href and an onClick handler so that for ctrl+click/middle click the browser
// can take care of opening things for us
export function onClickNavigationHandler(event: React.MouseEvent<HTMLElement>, targetHubId: string, url: string): boolean {
    const middleButton = 1;
    if (event.ctrlKey || event.metaKey || event.button === middleButton) {
        // if trying to open the link in a new tab, just let the browser do things for us
        return false;
    }

    return onNavigationHandler(event, targetHubId, url);
}

export function onNavigationHandler<T extends HTMLElement>(event: React.SyntheticEvent<T>, targetHubId: string, url: string): boolean {
    if (!targetHubId) {
        window.location.href = url;
        return false;
    }

    const handler = Service.getLocalService(HubsService).getHubNavigateHandler(targetHubId, url);

    // Prevent the native event from double-triggering a navigation, one correctly with ?_xhr=true and another without.
    const result = handler(event.nativeEvent);
    if (!result) {
        event.stopPropagation();
        event.preventDefault();
    }

    return result;
}
