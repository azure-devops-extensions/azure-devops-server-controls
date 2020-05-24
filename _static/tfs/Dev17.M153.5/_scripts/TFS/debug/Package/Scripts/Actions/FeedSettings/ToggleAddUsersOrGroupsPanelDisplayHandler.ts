import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";

/**
 * User clicked Add User/Group button in PivotBarActions
 * Display Add User/Group dialog now
 */
export class ToggleAddUsersOrGroupsPanelDisplayHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, open: boolean): void {
        state.showAddUsersOrGroupsPanel = open;
        state.error = null;
        emit();
    }
}
