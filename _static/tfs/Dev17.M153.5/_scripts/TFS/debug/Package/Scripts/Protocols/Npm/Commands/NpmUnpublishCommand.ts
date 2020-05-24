import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IPackagePayload } from "Package/Scripts/Common/ActionPayloads";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { NpmCiConstants, NpmPerfScenarios } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { NpmDataService } from "Package/Scripts/Protocols/Npm/NpmDataService";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

// TODO: Remove this class - not used
export class UnpublishPackagesCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(id: string, displayText: string, dialogProps: IGeneralDialogProps) {
        this.id = id;
        this.protocolCommand = ProtocolCommands.Deprecate;
        this.displayText = displayText;
        this.icon = "bowtie-icon bowtie-edit-delete";
        this.actionMethod = () => Actions.DialogOpenChanged.invoke(dialogProps);
    }
}

// This class is used by the old dialogs and can be removed when the feature flag for new dialogs and recycle bin is removed.
export class UnpublishPackageCommand {
    public static onUnpublishPackage(
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ): IPromise<void> {
        // Abort any running scenarios that are in flight so that we can start a new one.
        Performance.getScenarioManager().abortScenario(NpmPerfScenarios.Area, NpmPerfScenarios.UnpublishPackage);
        const scenario = Performance.getScenarioManager().startScenario(
            NpmPerfScenarios.Area,
            NpmPerfScenarios.UnpublishPackage
        );
        const npmDataService = Service.getLocalService(NpmDataService);

        CustomerIntelligenceHelper.publishEvent(NpmCiConstants.UnpublishPackage, {
            feedId: feed.id,
            feedName: feed.name,
            viewId: feed.view ? feed.view.id : undefined,
            viewName: feed.view ? feed.view.name : undefined,
            packageName: packageSummary.name,
            packageVersion: packageVersion.version
        });

        return npmDataService
            .unpublishPackage(feed.id, packageSummary.normalizedName, packageVersion.normalizedVersion)
            .then(
                success => {
                    packageVersion.isDeleted = true;
                    if (!viaPackageList) {
                        const packagePayload = {
                            packageSummary,
                            packageVersion
                        } as IPackagePayload;

                        Actions.PackageModified.invoke(packagePayload);
                    } else {
                        Actions.PackageListedStatusChanged.invoke({
                            packageId: packageSummary.id,
                            isDeleted: true,
                            isListed: false
                        });
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
                            message: (err.serverError && err.serverError.reason) ? err.serverError.reason : PackageResources.Error_ErrorUnpublishingPackage,
                            isCritical: true,
                            details: err
                        } as IError);
                    }
                }
            );
    }
}
