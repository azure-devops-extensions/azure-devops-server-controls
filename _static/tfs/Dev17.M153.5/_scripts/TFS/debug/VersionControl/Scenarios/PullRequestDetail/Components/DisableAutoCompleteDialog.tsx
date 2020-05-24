import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface DisableAutoCompleteDialogProps {
    isDialogOpen: boolean;
    onDisableAutoComplete(): void;
    onKeepAutoComplete(): void;
    onDismiss(): void;
}

/**
 * A component that displays a dialog to give a user the opportunity to cancel auto-complete on a PR
 */
export const DisableAutoCompleteDialog = (props: DisableAutoCompleteDialogProps): JSX.Element => {
   return <Dialog
        modalProps={{ containerClassName: "vc-dialog" }}
        hidden={!props.isDialogOpen}
        dialogContentProps={{
            type: DialogType.close,
            subText: VCResources.DisableAutoCompleteDialog_Text,
        }}
        title={VCResources.DisableAutoCompleteDialog_Title}
        onDismiss={props.onDismiss}>
        <DialogFooter>
            <PrimaryButton
                onClick={props.onDisableAutoComplete}>
                {VCResources.DisableAutoCompleteDialog_DisableButton}
            </PrimaryButton>
            <DefaultButton
                onClick={props.onKeepAutoComplete}>
                {VCResources.DisableAutoCompleteDialog_KeepButton}
            </DefaultButton>
        </DialogFooter>
    </Dialog>;
};
