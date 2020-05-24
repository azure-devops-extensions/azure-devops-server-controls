import * as React from "react";
import { DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { format } from "VSS/Utils/String";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface EditDisabledDialogProps {
    isDialogOpen: boolean;
    isGit: boolean;
    onDismiss(): void;
    repositoryName: string;
}

/**
 * A component that displays a dialog to alert the user that editing has been disabled for this repository.
 */
export const EditDisabledDialog = (props: EditDisabledDialogProps): JSX.Element => {
    const text = format(VCResources.EditDisabledDialogText, props.repositoryName, props.isGit ? VCResources.EditDisabledDialogPush : VCResources.EditDisabledDialogCheckin);
    return <Dialog
        hidden={!props.isDialogOpen}
        dialogContentProps={{ type: DialogType.normal }}
        title={VCResources.EditDisabledDialogTitle}
        onDismiss={props.onDismiss}
        modalProps={{
            containerClassName: "vc-edit-disabled-dialog",
            isBlocking: true,
        }}>
        {text}
        <DialogFooter>
            <DefaultButton onClick={props.onDismiss}>{VCResources.Cancel}</DefaultButton>
        </DialogFooter>
    </Dialog>;
}
