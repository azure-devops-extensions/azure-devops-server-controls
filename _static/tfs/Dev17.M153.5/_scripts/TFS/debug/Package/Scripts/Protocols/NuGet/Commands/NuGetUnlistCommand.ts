import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IPackagePayload } from "Package/Scripts/Common/ActionPayloads";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { NuGetCiConstants, NuGetPerfScenarios } from "Package/Scripts/Protocols/NuGet/Constants/NuGetConstants";
import { NuGetDataService } from "Package/Scripts/Protocols/NuGet/NuGetDataService";
import { PackageVersionDetails } from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.Contracts";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class UnlistPackagesCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(id: string, displayText: string, dialogProps: IGeneralDialogProps) {
        this.id = id;
        this.protocolCommand = ProtocolCommands.Unlist;
        this.displayText = displayText;
        this.icon = "bowtie-icon bowtie-math-minus";
        this.actionMethod = () => Actions.DialogOpenChanged.invoke(dialogProps);
    }
}

// This class is used by the old dialogs and can be removed when the feature flag for new dialogs is removed.
export class UnlistPackageCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(
        onUnlistPackage: (
            packageSummary: Package,
            packageVersion: PackageVersion,
            feed: Feed,
            viaPackageList: boolean
        ) => IPromise<void>,
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ) {
        this.id = "unlist";
        this.protocolCommand = ProtocolCommands.Unlist;
        this.displayText = PackageResources.PackageCommands_UnlistPackage;
        this.icon = "bowtie-icon bowtie-math-minus";
        this.actionMethod = () => onUnlistPackage(packageSummary, packageVersion, feed, viaPackageList);
    }

    public static onUnlistPackage(
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ): IPromise<void> {
        const nuGetDataService = Service.getLocalService(NuGetDataService);
        // Abort any running scenarios that are in flight so that we can start a new one.
        Performance.getScenarioManager().abortScenario(NuGetPerfScenarios.Area, NuGetPerfScenarios.UnlistPackage);
        const scenario = Performance.getScenarioManager().startScenario(
            NuGetPerfScenarios.Area,
            NuGetPerfScenarios.UnlistPackage
        );

        CustomerIntelligenceHelper.publishEvent(NuGetCiConstants.UnlistPackage, {
            feedId: feed.id,
            feedName: feed.name,
            viewId: feed.view ? feed.view.id : undefined,
            viewName: feed.view ? feed.view.name : undefined,
            packageName: packageSummary.name,
            packageVersion: packageVersion.version
        });

        const packageVersionDetails = {
            listed: false
        } as PackageVersionDetails;

        return nuGetDataService
            .updatePackageVersion(
                packageVersionDetails,
                feed.id,
                packageSummary.normalizedName,
                packageVersion.normalizedVersion
            )
            .then(
                success => {
                    if (!viaPackageList) {
                        packageVersion.isListed = false;
                        const packagePayload = {
                            packageSummary,
                            packageVersion
                        } as IPackagePayload;

                        Actions.PackageModified.invoke(packagePayload);
                        announce(
                            Utils_String.format(
                                PackageResources.PackageUnlisted_Announcement_Version_One,
                                packageVersion.version
                            )
                        );
                    } else {
                        Actions.PackageListedStatusChanged.invoke({
                            packageId: packageSummary.id,
                            isListed: false
                        });
                        announce(
                            Utils_String.format(PackageResources.PackageUnlisted_Announcement_One, packageSummary.name)
                        );
                    }

                    scenario.end();
                },
                err => {
                    scenario.abort();
                    if (err.status === 401) {
                        Actions.ErrorEncountered.invoke({
                            message: PackageResources.Error_ErrorUserUnauthorized,
                            details: err
                        } as IError);
                    } else {
                        Actions.ErrorEncountered.invoke({
                            message: (err.serverError && err.serverError.reason) ? err.serverError.reason : PackageResources.Error_ErrorUnlistingPackage,
                            isCritical: true,
                            details: err
                        } as IError);
                    }
                }
            );
    }
}
