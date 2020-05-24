import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { format } from "VSS/Utils/String";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface LoseChangesDialogProps {
    isDialogOpen: boolean;
    dirtyFileName: string;
    onDiscardChanges(): void;
    onDismiss(): void;
}

/**
 * A component that displays a dialog to accept losing changes.
 */
export const LoseChangesDialog = (props: LoseChangesDialogProps): JSX.Element => {
   return <Dialog
        modalProps={{ containerClassName: "vc-lose-changes-dialog" }}
        hidden={!props.isDialogOpen}
        dialogContentProps={{ type: DialogType.normal }}
        title={VCResources.UnsavedFileNavigateAwayTitle}
        onDismiss={props.onDismiss}>
        {format(VCResources.UnsavedFileNavigateAwayFormat, props.dirtyFileName)}
        <DialogFooter>
            <PrimaryButton className="discard-button" onClick={props.onDiscardChanges}>{VCResources.UnsavedFileDiscard}</PrimaryButton>
            <DefaultButton onClick={props.onDismiss}>{VCResources.UnsavedFilePreserve}</DefaultButton>
        </DialogFooter>
    </Dialog>;
}
