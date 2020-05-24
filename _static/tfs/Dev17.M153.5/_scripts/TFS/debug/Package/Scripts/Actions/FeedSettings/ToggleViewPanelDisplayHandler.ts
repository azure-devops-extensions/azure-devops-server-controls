import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";

/**
 * User clicked Add view or Edit view in PivotBarActions
 * Display view panel now
 */
export class ToggleViewPanelDisplayHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, isOpen: boolean, isEditing: boolean): void {
        state.showViewPanel = isOpen;
        state.isViewPanelInEditMode = isEditing;
        state.error = null;

        // if closing the panel, clear the selected view index
        if (!isOpen) {
            state.selectedViews = [];
        }

        // here, set the state information
        emit();
    }
}
