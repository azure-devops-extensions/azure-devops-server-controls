import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";

/**
 * The user clicked cancel in feed details pivot
 */
export class UndoFeedDetailsHandler {
    public static handle(state: IFeedSettingsState, emit: () => void): void {
        state.feedName = null;
        state.feedDescription = null;
        state.hideDeletedPackageVersions = null;
        state.badgesEnabled = null;
        state.retentionPolicySettings.retentionPolicyToApply = null;
        state.error = null;
        state.validationErrorBag = {};
        emit();
    }
}
