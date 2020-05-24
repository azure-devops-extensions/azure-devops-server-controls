import * as React from "react";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import * as Utils_Array from "VSS/Utils/Array";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/RemoveWorkItemsDialog";

export interface RemoveWorkItemsDialogProps {
    workItemToRemove?: number; // if null, remove all
    okAction(): void;
    dismissAction(): void;
}

export class RemoveWorkItemsDialog extends React.PureComponent<RemoveWorkItemsDialogProps, {}> {
    public render(): JSX.Element {
        const removeSingle: boolean = Boolean(this.props.workItemToRemove);
        const dialogTitle: string = removeSingle ? VCResources.PullRequest_RelatedArtifactsRemoveLabel : VCResources.PullRequest_RelatedArtifactsRemoveAllLabel;
        const dialogConfirmation: string = removeSingle ? VCResources.PullRequest_RelatedArtifactsRemoveConfirmation: VCResources.PullRequest_RelatedArtifactsRemoveAllConfirmation;
        const dialogOkLabel: string = removeSingle ? VCResources.PullRequest_RelatedArtifactsRemoveOkButton : VCResources.PullRequest_RelatedArtifactsRemoveAllOkButton;

        return (
            <Dialog
                hidden={false}
                dialogContentProps={{
                    type: DialogType.close,
                    subText: dialogConfirmation,
                }}
                onDismiss={this.props.dismissAction}
                title={dialogTitle}
                modalProps={{
                    isBlocking: true,
                    className: "removeWorkItemsDialog",
                    containerClassName: "removeWorkItemsDialog-container",
                }}
                closeButtonAriaLabel={VCResources.PullRequest_UnsavedChanges_Cancel}>
                <DialogFooter>
                    <PrimaryButton onClick={this.props.okAction}>{dialogOkLabel}</PrimaryButton>
                    <DefaultButton onClick={this.props.dismissAction}>{VCResources.PullRequest_UnsavedChanges_Cancel}</DefaultButton>
                </DialogFooter>
            </Dialog>);
    }
}