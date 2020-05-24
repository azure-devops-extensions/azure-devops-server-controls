import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";

/**
 * User wanted to switch pivots while there are unsaved changes
 * Display discard changes dialog, so user can discard changes and switch pivots
 * Or Save changes and switch pivots
 */
export class ToggleDiscardDialogDisplayHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, show: boolean): void {
        state.showDiscardDialog = show;
        emit();
    }
}
