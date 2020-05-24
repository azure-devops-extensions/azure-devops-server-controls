import { TelemetryConstants } from "WorkItemsHub/Scripts/Utils/Telemetry";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { handleError, requireModules } from "VSS/VSS";
import * as WITControlsRecycleBin_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import * as React from "react";
import { registerLWPComponent } from "VSS/LWP";

interface IDeleteConfirmationDialogProps {
    onDelete: () => void;
    workItemIds: number[];
}

class DeleteConfirmationDialog extends React.Component<IDeleteConfirmationDialogProps, {}> {
    public static componentType = "deleteConfirmationDialog";

    public render(): null {
        
        requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin"]).spread((WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) =>
            WITControlsRecycleBin.DeleteConfirmationDialog.showDialog(false, () => {
                WITControlsRecycleBin.RecycleBin.beginDeleteWorkItems(
                    TelemetryConstants.DeleteCommand,
                    TelemetryConstants.Area,
                    TfsContext.getDefault(),
                    this.props.workItemIds,
                    false,          // readWorkItemsBeforeDeletion,
                    false,          // refreshRequired,
                    false,          // launchedFromWorkItemForm, // suppressFailureNotification to avoid duplicate errors being shown up on the form as well as the host page
                    null,           // pass to exclude these test work items for deletion
                    null,           // successCallback,
                    handleError);   // errorCallback

                this.props.onDelete();
            }));

        return null;
    }
}

registerLWPComponent(DeleteConfirmationDialog.componentType, DeleteConfirmationDialog);
