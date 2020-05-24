import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IPackagePayload } from "Package/Scripts/Common/ActionPayloads";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { NuGetCiConstants, NuGetPerfScenarios } from "Package/Scripts/Protocols/NuGet/Constants/NuGetConstants";
import { NuGetDataService } from "Package/Scripts/Protocols/NuGet/NuGetDataService";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class DeletePackageCommand {
    public static onDeletePackage(
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ): IPromise<void> {
        const nuGetDataService = Service.getLocalService(NuGetDataService);
        // Abort any running scenarios that are in flight so that we can start a new one.
        Performance.getScenarioManager().abortScenario(NuGetPerfScenarios.Area, NuGetPerfScenarios.DeletePackage);
        const scenario = Performance.getScenarioManager().startScenario(
            NuGetPerfScenarios.Area,
            NuGetPerfScenarios.DeletePackage
        );

        CustomerIntelligenceHelper.publishEvent(NuGetCiConstants.DeletePackage, {
            feedId: feed.id,
            feedName: feed.name,
            viewId: feed.view ? feed.view.id : undefined,
            viewName: feed.view ? feed.view.name : undefined,
            packageName: packageSummary.name,
            packageVersion: packageVersion.version
        });

        return nuGetDataService
            .deletePackageVersion(feed.id, packageSummary.normalizedName, packageVersion.normalizedVersion)
            .then(
                success => {
                    if (!viaPackageList) {
                        packageVersion.isListed = false;
                        packageVersion.isDeleted = true;

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
                            message: (err.serverError && err.serverError.reason) ? err.serverError.reason : PackageResources.Error_ErrorDeletingPackage,
                            isCritical: true,
                            details: err
                        } as IError);
                    }
                }
            );
    }
}
