import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";

import * as Actions from "Package/Scripts/Actions/Actions";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { MavenCiConstants, MavenPerfScenarios } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import { MavenHttpClient } from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.CustomWebApi";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class DeletePackageCommand {
    public static async onDeletePackage(
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ): Promise<void> {
        const mavenHttpClient = Service.getClient<MavenHttpClient>(MavenHttpClient);

        // Abort any running scenarios that are in flight so that we can start a new one.
        Performance.getScenarioManager().abortScenario(MavenPerfScenarios.Area, MavenPerfScenarios.DeletePackage);
        const scenario = Performance.getScenarioManager().startScenario(
            MavenPerfScenarios.Area,
            MavenPerfScenarios.DeletePackage
        );

        CustomerIntelligenceHelper.publishEvent(MavenCiConstants.DeletePackage, {
            protocol: MavenCiConstants.ProtocolName,
            feedId: feed.id,
            feedName: feed.name,
            viewId: feed.view ? feed.view.id : undefined,
            viewName: feed.view ? feed.view.name : undefined,
            packageName: packageSummary.name,
            packageVersion: packageVersion.version
        });

        const packageNameParts = packageSummary.name ? packageSummary.name.split(":") : "";

        if (packageNameParts.length !== 2) {
            throw PackageResources.MavenOverview_InvalidPackageError;
        }

        const packageGroupId = packageNameParts[0];
        const packageArtifactId = packageNameParts[1];

        try {
            await mavenHttpClient.packageDelete(
                feed.id,
                packageGroupId,
                packageArtifactId,
                packageVersion.normalizedVersion
            );
            scenario.end();
        } catch (err) {
            scenario.abort();
            const unauthorized = err.status === 401;
            Actions.ErrorEncountered.invoke(<IError>{
                message: unauthorized
                    ? PackageResources.Error_ErrorUserUnauthorized
                    : PackageResources.Error_ErrorDeletingPackage,
                isCritical: !unauthorized,
                details: err
            });
        }
    }
}
