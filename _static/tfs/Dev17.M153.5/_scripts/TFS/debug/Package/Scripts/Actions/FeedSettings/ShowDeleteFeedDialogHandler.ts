import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsCi } from "Feed/Common/Constants/Constants";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as PackageResources from "Feed/Common/Resources";

/**
 * Show Delete Feed dialog when user clicked on Delete Feed button in PivotBar
 */
export class ShowDeleteFeedDialogHandler {
    public static handle(state: IFeedSettingsState, emitCallback: () => void, onSaveCallback: () => void): void {
        state.dialogProps = {
            headerText: PackageResources.FeedDeletionDialogContent_Title,
            confirmText: PackageResources.FeedDeletionDialogContent_DeleteFeedText,
            severeWarningText: PackageResources.FeedDeletionDialogContent_SevereWarningText,
            saveButtonClassName: "delete-button",
            dialogClassName: "delete-dialog",
            saveButtonText: PackageResources.PermanentDeletionDialogContent_OkButton,
            onSavePrimaryButtonText: PackageResources.PackageCommands_DeletePackage_Deleting,
            onSaveCallback: async () => {
                CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.ShowDeleteFeedDialog, {
                    feedId: state.feed().id,
                    action: "deleting"
                });

                try {
                    await onSaveCallback();
                } finally {
                    // set dialogProps to null to close the dialog
                    state.dialogProps = null;
                    emitCallback();
                }
            },
            onDismissCallback: () => {
                state.dialogProps = null;
                emitCallback();
                CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.ShowDeleteFeedDialog, {
                    feedId: state.feed().id,
                    action: "dismissed"
                });
            }
        } as IGeneralDialogProps;

        emitCallback();
        CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.ShowDeleteFeedDialog, {
            feedId: state.feed().id,
            action: "show"
        });
    }
}
