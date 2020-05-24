import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { SettingsPivotKeys } from "Feed/Common/Constants/Constants";

/**
 * Store the current pivot user is on
 */
export class CurrentPivotHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, pivotKey: string): void {
        state.currentPivotKey = pivotKey;
        state.selectedPermissions = [];
        state.selectedViews = [];
        state.selectedUpstreamSources = [];

        // show the upstream filter by default:
        if (state.currentPivotKey === SettingsPivotKeys.upstreams
            && state.hubViewState.viewOptions.getViewOption(HubViewOptionKeys.showFilterBar) !== true) {
            state.hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
        }

        emit();
    }
}
