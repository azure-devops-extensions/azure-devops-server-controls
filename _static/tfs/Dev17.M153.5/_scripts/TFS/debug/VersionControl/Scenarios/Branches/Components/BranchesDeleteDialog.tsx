// Office Fabric
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";

import { IStateless } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import * as React from "react";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as Branch from "VersionControl/Scenarios/Branches/Actions/Branch";
import * as Utils_String from "VSS/Utils/String";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";

export interface DeleteDialogProperties {
    name: string;
    onDeleteBranch(branch: string): void;
}

export class DeleteDialog extends React.Component<DeleteDialogProperties, IStateless> {

    public render() {

        return (
            <Dialog
                className={"vc-branches-delete-dialog"}
                hidden={false}
                dialogContentProps={{
                    type: DialogType.close,
                    subText: Utils_String.format(BranchResources.DeleteBranchDialogMesssage, GitRefUtility.getRefFriendlyName(this.props.name)),
                }}
                onDismiss={this._closeDialog.bind(this)}
                title={BranchResources.DeleteBranchDialogTitle}
                modalProps={{ isBlocking: true }}
                closeButtonAriaLabel={BranchResources.DeleteBranchDialogCancel}>
                <DialogFooter>
                    <PrimaryButton onClick={this._deleteDialog.bind(this)}>{BranchResources.DeleteBranchDialogDelete}</PrimaryButton>
                    <DefaultButton onClick={this._closeDialog.bind(this)}>{BranchResources.DeleteBranchDialogCancel}</DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _closeDialog() {
        this.props.onDeleteBranch(null);
    }

    private _deleteDialog() {
        Branch.Creators.deleteBranch(this.props.name);
        this._closeDialog();
    }
}
