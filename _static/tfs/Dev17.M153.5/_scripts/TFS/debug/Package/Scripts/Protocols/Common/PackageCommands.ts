/* tslint:disable:no-require-imports */
import * as Dialogs from "VSS/Controls/Dialogs";
import * as EventsAction from "VSS/Events/Action";

import { PackageCommandIds } from "Feed/Common/Constants/Constants";

import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";

import * as PackageResources from "Feed/Common/Resources";

import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as Actions from "Package/Scripts/Actions/Actions";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { IMultiCommandPayload } from "Package/Scripts/Common/ActionPayloads";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { RemovePackageDialog } from "Package/Scripts/Dialogs/RemovePackageDialog";

// TODO: Create a base class for all of these commands to avoid
// the constant redefinition of common fields

export class RemovePackageCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(
        removePackageDelegate: (
            packageSummary: Package,
            packageVersion: PackageVersion,
            feed: Feed,
            viaPackageList: boolean,
            dialogProps?: IGeneralDialogProps
        ) => IPromise<void>,
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        displayText: string,
        viaPackageList: boolean
    ) {
        this.id = "remove";
        this.protocolCommand = ProtocolCommands.Delete;
        this.displayText = displayText;
        this.icon = "bowtie-icon bowtie-edit-delete";
        this.actionMethod = () =>
            Dialogs.ModalDialogO.show(RemovePackageDialog, {
                packageSummary,
                packageVersion,
                feed,
                displayText,
                viaPackageList,
                removePackageDelegate
            });
    }
}

export class RemovePackagesCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(id: string, displayText: string, dialogProps: IGeneralDialogProps) {
        this.id = id;
        this.protocolCommand = ProtocolCommands.Delete;
        this.displayText = displayText;
        this.icon = "bowtie-icon bowtie-edit-delete";
        this.actionMethod = () => Actions.DialogOpenChanged.invoke(dialogProps);
    }
}

export class PromotePackageCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: () => void;

    constructor(
        feed: Feed,
        packageSummary: Package,
        packageVersion: PackageVersion,
        protocol: string,
        viaPackageList: boolean
    ) {
        this.id = "promote";
        this.protocolCommand = ProtocolCommands.Promote;
        this.displayText = PackageResources.PackageCommands_PromotePackage;
        this.titleText = PackageResources.PromoteButton_Tooltip;
        this.icon = "bowtie-icon bowtie-arrow-up cta";

        if (viaPackageList) {
            this.actionMethod = () => {
                Actions.MultiPromotePanelOpened.invoke({ selectedPackages: [packageSummary] });
            };
        } else {
            this.actionMethod = async () => {
                Actions.TogglePromoteDialog.invoke(true);
            };
        }
    }
}

export class PromotePackagesCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(selectedPackages: Package[]) {
        this.id = "promote";
        this.protocolCommand = ProtocolCommands.Promote;
        this.displayText = PackageResources.PackageCommands_PromotePackage;
        this.titleText = PackageResources.PromoteButton_Tooltip;
        this.icon = "bowtie-icon bowtie-arrow-up cta";
        this.actionMethod = () => {
            Actions.MultiPromotePanelOpened.invoke({ selectedPackages });
        };
    }
}

/**
 * When the user clicks the download button, we need to get the package download url, and then open a new window to hit the url.
 * The first time the user tries to download a package, they will get redirected to SPS for authentication.
 * If we hit the download url in the existing window, when the client gets redirected, the window will be stuck on SPS.
 * So we need to open a new window to download the package.
 * However, browsers will block new window popups if they are opened in response to a non user triggered event. When we have to wait on a promise before opening
 * a new window, the browser blocks the new window.
 * The call to retrieve the download url returns a promise, so we cannot make the call to retreive the download url after the button is clicked. Instead, we retrieve the
 * download url as soon as the menu buttons are created.
 * By the time the user clicks the download button, the call to get the download url string should have finished, so the promise should be resolved and the string will exist.
 * In the edge case that the call takes a long time and it has not finished, we need to resolve the promise and then download the package, which will likely
 * cause the browser to block the window that opens to download the package.
 */
export class DownloadPackageCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(
        downloadDelegate: (
            packageSummary: Package,
            packageVersion: PackageVersion,
            downloadUrl: string,
            viaPackageList: boolean
        ) => void,
        getDownloadContentUrl: () => IPromise<string>,
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ) {
        this.id = "download";
        this.protocolCommand = ProtocolCommands.Download;
        this.displayText = PackageResources.PackageCommands_DownloadPackage;
        this.icon = "bowtie-icon bowtie-transfer-download";
        this.actionMethod = () => {
            getDownloadContentUrl().then((downloadUrl: string) => {
                downloadDelegate(packageSummary, packageVersion, downloadUrl, viaPackageList);
            });
        };
    }

    // Download
    public static onDownloadPackage(
        packageSummary: Package,
        packageVersion: PackageVersion,
        downloadPackageUrl: string,
        viaPackageList: boolean
    ): void {
        // The first time the user clicks the donwload button, they will get redirected to SPS for authentication.
        // If we hit the download url in the existing window, when the client gets redirected, the window will be stuck on SPS.
        // So we need to open a new window to download the package.
        EventsAction.getService().performAction(EventsAction.CommonActions.ACTION_WINDOW_OPEN, {
            url: downloadPackageUrl,
            target: "_blank"
        });
    }
}

/*
    Shown when the user is not following the current package
*/
export class FollowPackageCommand implements IPackageCommand {
    public readonly id: string;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly disabled?: boolean;
    public readonly actionMethod: any;

    constructor(disabled: boolean) {
        this.id = "follow";
        this.displayText = PackageResources.PackageCommands_FollowPackage;
        this.titleText = PackageResources.FollowPackage_Tooltip;
        this.icon = "bowtie-icon bowtie-watch-eye";
        this.disabled = disabled;

        this.actionMethod = () => {
            Actions.PackageFollowClicked.invoke(true);
        };
    }
}

/*
    Shown when the user is following the current package
*/
export class UnfollowPackageCommand implements IPackageCommand {
    public readonly id: string;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly disabled?: boolean;
    public readonly actionMethod: any;

    constructor(disabled: boolean) {
        this.id = "unfollow";
        this.displayText = PackageResources.PackageCommands_UnfollowPackage;
        this.titleText = PackageResources.UnfollowPackage_Tooltip;
        this.icon = "bowtie-icon bowtie-watch-eye-fill";
        this.disabled = disabled;

        this.actionMethod = () => {
            Actions.PackageFollowClicked.invoke(false);
        };
    }
}

export class PermanentDeletePackagesCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(id: string, displayText: string, dialogProps: IGeneralDialogProps) {
        this.id = id;
        this.protocolCommand = ProtocolCommands.PermanentDelete;
        this.displayText = displayText;
        this.icon = "bowtie-icon bowtie-edit-delete";
        this.actionMethod = () => Actions.DialogOpenChanged.invoke(dialogProps);
    }
}

export class RestorePackagesToFeedCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(
        id: string,
        displayText: string,
        protocolType: string,
        selectedVersions: PackageVersion[],
        selectedPackage: Package
    ) {
        this.id = id;
        this.protocolCommand = ProtocolCommands.Restore;
        this.displayText = displayText;
        this.icon = "bowtie-icon bowtie-recycle-bin-restore";
        const payload = {
            selectedPackages: [selectedPackage],
            selectedVersions
        } as IMultiCommandPayload;
        this.actionMethod = () => RecycleBinActions.PackagesRestoredToFeed.invoke(payload);
    }
}

export class CreateBadgeCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly iconName: string;
    public readonly actionMethod: any;

    constructor() {
        this.id = PackageCommandIds.CreateBadge;
        this.displayText = PackageResources.PackageCommands_CreateBadge;
        this.icon = "Share";
        this.actionMethod = () => Actions.ToggleCreateBadgePanel.invoke(true);
    }
}
