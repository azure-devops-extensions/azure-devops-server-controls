import * as Utils_String from "VSS/Utils/String";

import { PackageCommandIds } from "Feed/Common/Constants/Constants";

import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";

import * as PackageResources from "Feed/Common/Resources";

import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as Actions from "Package/Scripts/Actions/Actions";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { PermanentDeletePackagesCommand } from "Package/Scripts/Protocols/Common/PackageCommands";

export class PermanentDeleteCommandHelper {
    public static getCommands(
        protocolType: string,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[],
        packageName?: string
    ): IPackageCommand[] {
        const packageCommands = new Array<IPackageCommand>();
        if (selectedVersions && selectedVersions.length > 0) {
            const headerText =
                selectedVersions.length === 1
                    ? Utils_String.format(
                          PackageResources.PermanentDeleteDialog_HeaderText_PackageVersion,
                          packageName,
                          selectedVersions[0].version
                      )
                    : Utils_String.format(
                          PackageResources.PermanentDeleteDialog_HeaderText_BatchPackageVersion,
                          selectedVersions.length.toString(),
                          packageName
                      );
            const commandName = PackageResources.PackageCommands_PermanentDeletePackage;
            const confirmText =
                selectedVersions.length === 1
                    ? Utils_String.format(
                          PackageResources.PermanentDeleteDialog_ConfirmText_OneVersion,
                          packageName,
                          selectedVersions[0].version
                      )
                    : PackageResources.PermanentDeleteDialog_ConfirmText_MultipleVersion;
            const deleteDialogProps: IGeneralDialogProps = this.getPermanentDeleteDialogProps(
                headerText,
                confirmText,
                protocolType,
                null,
                selectedVersions
            );
            packageCommands.push(
                new PermanentDeletePackagesCommand(PackageCommandIds.PermanentDelete, commandName, deleteDialogProps)
            );
        }

        return packageCommands;
    }

    public static getPermanentDeleteDialogProps(
        headerText: string,
        confirmText: string,
        protocolType: string,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[]
    ): IGeneralDialogProps {
        const dialogProps: IGeneralDialogProps = {
            headerText,
            confirmText,
            saveButtonClassName: "delete-button",
            dialogClassName: "delete-dialog",
            saveButtonText: PackageResources.PermanentDeletionDialogContent_OkButton,
            onSavePrimaryButtonText: PackageResources.PackageCommands_DeletePackage_Deleting,
            onSaveCallback: () =>
                RecycleBinActions.PackagesPermanentDeleted.invoke({
                    selectedPackages,
                    selectedVersions,
                    protocolType
                }),
            onDismissCallback: () => Actions.DialogOpenChanged.invoke(null)
        };

        return dialogProps;
    }
}
