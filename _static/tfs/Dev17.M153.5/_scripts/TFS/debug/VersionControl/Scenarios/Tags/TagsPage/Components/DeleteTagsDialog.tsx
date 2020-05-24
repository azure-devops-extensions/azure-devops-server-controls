import * as React from "react";

// Office Fabric
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";

export interface DeleteTagDialogProps {
    name: string;
    onDeleteTag(tagName: string): void;
    onDialogClose(): void;
}

export const DeleteTagDialog = (props: DeleteTagDialogProps): JSX.Element => {
    return (
        <Dialog
            hidden={false}
            dialogContentProps={{
                type: DialogType.close,
                subText: Utils_String.format(VCResources.DeleteTagConfirmationMesssage, props.name),
            }}
            onDismiss={props.onDialogClose}
            title={VCResources.DeleteTagsDialog_DeleteTitle}
            modalProps={{ isBlocking: true }}
            closeButtonAriaLabel={VCResources.Cancel}
            >
            <DialogFooter>
                <PrimaryButton onClick={() => props.onDeleteTag(props.name) }>{VCResources.Delete}</PrimaryButton>
                <DefaultButton onClick={props.onDialogClose}>{VCResources.Cancel}</DefaultButton>
            </DialogFooter>
        </Dialog>
    );
}
