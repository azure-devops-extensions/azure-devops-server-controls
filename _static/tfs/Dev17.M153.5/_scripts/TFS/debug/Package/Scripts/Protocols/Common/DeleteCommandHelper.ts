import * as Utils_String from "VSS/Utils/String";

import { PackageCommandIds } from "Feed/Common/Constants/Constants";
import { MavenKey } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";

import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";

import * as PackageResources from "Feed/Common/Resources";

import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { RemovePackagesCommand } from "Package/Scripts/Protocols/Common/PackageCommands";

export class DeleteCommandHelper {
    public static addDeleteCommands(
        protocolType: string,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[],
        unpublish?: boolean,
        packageName?: string,
        cachedPackagesIncluded?: boolean
    ): IPackageCommand[] {
        const packageCommands = new Array<IPackageCommand>();
        if (selectedVersions) {
            // Delete selected versions
            let headerText: string;
            if (selectedVersions.length > 1) {
                headerText = unpublish
                    ? Utils_String.format(
                          PackageResources.DeleteDialog_HeaderText_VersionsList_Unpublish,
                          selectedVersions.length
                      )
                    : Utils_String.format(
                          PackageResources.DeleteDialog_HeaderText_VersionsList,
                          selectedVersions.length
                      );
            } else {
                headerText = unpublish
                    ? Utils_String.format(
                          "{0} {1} {2}",
                          PackageResources.PackageCommands_UnpublishPackage,
                          packageName,
                          selectedVersions[0].version
                      )
                    : Utils_String.format(
                          "{0} {1} {2}",
                          PackageResources.PackageCommands_DeletePackage,
                          packageName,
                          selectedVersions[0].version
                      );
            }

            const commandName = unpublish
                ? PackageResources.PackageCommands_UnpublishPackage
                : PackageResources.PackageCommands_DeletePackage;
            const deleteDialogProps: IGeneralDialogProps = this.getDeleteDialogProps(
                protocolType,
                headerText,
                selectedVersions.length > 1
                    ? PackageResources.DeleteDialog_ConfirmText_VersionsList
                    : PackageResources.DeleteDialog_ConfirmText_OneVersion,
                selectedVersions.length > 1
                    ? PackageResources.DeleteDialog_SevereWarningText_VersionsList
                    : PackageResources.DeleteDialog_SevereWarningText_OneVersion,
                unpublish,
                selectedPackages && selectedPackages[0] && selectedPackages[0].protocolType.toLowerCase() === MavenKey
                    ? selectedPackages
                    : null, // selectedPackages
                selectedVersions,
                cachedPackagesIncluded
            );
            const id = unpublish ? PackageCommandIds.Unpublish : PackageCommandIds.Delete;
            packageCommands.push(new RemovePackagesCommand(id, commandName, deleteDialogProps));
        } else if (selectedPackages) {
            // Delete latest version
            let headerTextLatest: string;
            if (selectedPackages.length > 1) {
                headerTextLatest = unpublish
                    ? PackageResources.DeleteDialog_HeaderText_LatestVersion_Unpublish
                    : PackageResources.DeleteDialog_HeaderText_LatestVersion;
            } else {
                headerTextLatest = unpublish
                    ? Utils_String.format(
                          PackageResources.DeleteDialog_HeaderText_LatestVersion_OnePackage_Unpublish,
                          selectedPackages[0].name,
                          selectedPackages[0].versions[0].version
                      )
                    : Utils_String.format(
                          PackageResources.DeleteDialog_HeaderText_LatestVersion_OnePackage,
                          selectedPackages[0].name,
                          selectedPackages[0].versions[0].version
                      );
            }
            const latestCommandName = unpublish
                ? PackageResources.DeleteCommand_Latest_Npm
                : PackageResources.DeleteCommand_Latest_NuGet;
            const deleteLatestDialogProps: IGeneralDialogProps = this.getDeleteDialogProps(
                protocolType,
                headerTextLatest,
                selectedPackages.length > 1
                    ? PackageResources.DeleteDialog_ConfirmText_LatestVersion
                    : PackageResources.DeleteDialog_ConfirmText_LatestVersion_OnePackage,
                selectedPackages.length > 1
                    ? PackageResources.DeleteDialog_SevereWarningText_LatestVersion
                    : PackageResources.DeleteDialog_SevereWarningText_LatestVersion_OnePackage,
                unpublish,
                selectedPackages,
                null, // selectedVersions
                cachedPackagesIncluded
            );
            const idLatest = unpublish ? PackageCommandIds.UnpublishLatest : PackageCommandIds.DeleteLatest;
            packageCommands.push(new RemovePackagesCommand(idLatest, latestCommandName, deleteLatestDialogProps));
        }

        return packageCommands;
    }

    private static getDeleteDialogProps(
        protocolType: string,
        headerText: string,
        confirmText: string,
        severeWarningText: string,
        unpublish?: boolean,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[],
        cachedPackagesIncluded?: boolean
    ): IGeneralDialogProps {
        let learnMoreLink = "https://go.microsoft.com/fwlink/?linkid=869583";
        if (unpublish) {
            learnMoreLink = "https://go.microsoft.com/fwlink/?linkid=869883";
        } else if (
            selectedPackages &&
            selectedPackages.length === 1 &&
            selectedPackages[0].protocolType.toLowerCase() === MavenKey
        ) {
            selectedPackages = selectedPackages;
            learnMoreLink = "https://go.microsoft.com/fwlink/?linkid=869884";
        }

        const dialogProps: IGeneralDialogProps = {
            headerText,
            confirmText,
            severeWarningText,
            severeWarningLearnMoreLink: learnMoreLink,
            saveButtonClassName: "delete-button",
            dialogClassName: "delete-dialog",
            saveButtonText: PackageResources.DeletionDialogContent_OkButton,
            onSaveCallback: () =>
                Actions.PackagesDeleted.invoke({
                    selectedPackages,
                    selectedVersions,
                    protocolType: selectedVersions ? protocolType : null
                }),
            onDismissCallback: () => Actions.DialogOpenChanged.invoke(null),
            onSavePrimaryButtonText: PackageResources.PackageCommands_DeletePackage_Deleting,
            messageBarMessage: cachedPackagesIncluded
                ? PackageResources.UnpublishDialog_CannotUnpublishV1CachedPackages
                : null
        };

        return dialogProps;
    }
}
