import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";

import * as Actions from "Package/Scripts/Actions/Actions";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as PermissionHelper from "Package/Scripts/Helpers/PermissionHelper";
import { INpmDeprecateDialogProps, NpmDeprecateDialog } from "Package/Scripts/Protocols/Npm/Commands/NpmDeprecateDialog";
import { NpmCiConstants, NpmPerfScenarios } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { NpmDataService } from "Package/Scripts/Protocols/Npm/NpmDataService";
import * as NpmContracts from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class DeprecatePackagesCommand implements IPackageCommand {
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
        this.icon = "bowtie-icon bowtie-math-minus";
        this.actionMethod = () => Actions.DialogOpenChanged.invoke(dialogProps);
    }
}

export class DeprecatePackageCommand implements IPackageCommand {
    public readonly id: string;
    public readonly protocolCommand: ProtocolCommands;
    public readonly displayText: string;
    public readonly titleText: string;
    public readonly icon: string;
    public readonly actionMethod: any;

    constructor(packageSummary: Package, packageVersion: PackageVersion, feed: Feed, viaPackageList: boolean) {
        this.id = "deprecate";
        this.protocolCommand = ProtocolCommands.Deprecate;
        this.displayText = PackageResources.PackageCommands_Deprecate;
        this.icon = "bowtie-icon bowtie-math-minus";
        this.actionMethod = () => {
            // TODO: remove jquery
            let $container: JQuery = $(document.body).find(".deprecate-dialog-container");
            if ($container.length === 0) {
                $container = $("<div>")
                    .addClass("deprecate-dialog-container")
                    .appendTo(document.body);
            }

            const closeHandler = () => {
                if ($container.length > 0) {
                    ReactDOM.unmountComponentAtNode($container[0]);
                }
            };

            const deprecateHandler = (deprecateMessage: string) => {
                // Abort any running scenarios that are in flight so that we can start a new one.
                Performance.getScenarioManager().abortScenario(
                    NpmPerfScenarios.Area,
                    NpmPerfScenarios.DeprecatePackage
                );
                const scenario = Performance.getScenarioManager().startScenario(
                    NpmPerfScenarios.Area,
                    NpmPerfScenarios.DeprecatePackage
                );
                const npmDataService = Service.getLocalService(NpmDataService);

                CustomerIntelligenceHelper.publishEvent(NpmCiConstants.DeprecatePackage, {
                    feedId: feed.id,
                    feedName: feed.name,
                    viewId: feed.view ? feed.view.id : undefined,
                    viewName: feed.view ? feed.view.name : undefined,
                    packageName: packageSummary.name,
                    packageVersion: packageVersion.version
                });

                const deprecatePackageVersionDetails = {
                    deprecateMessage,
                    views: null
                } as NpmContracts.PackageVersionDetails;

                return npmDataService
                    .updatePackage(
                        deprecatePackageVersionDetails,
                        feed.id,
                        packageSummary.normalizedName,
                        packageVersion.normalizedVersion
                    )
                    .then(
                        success => {
                            Actions.PackageVersionDeprecated.invoke({
                                message: deprecateMessage,
                                selectedVersion: packageVersion,
                                selectedPackages: viaPackageList ? [packageSummary] : null
                            });

                            scenario.end();
                        },
                        err => {
                            scenario.abort();
                            if (err.status === 403) {
                                Actions.ErrorEncountered.invoke({
                                    message: PackageResources.Error_ErrorUserUnauthorized,
                                    details: err
                                } as IError);
                            } else {
                                Actions.ErrorEncountered.invoke({
                                    message:
                                        err.serverError && err.serverError.reason
                                            ? err.serverError.reason
                                            : PackageResources.Error_ErrorDeprecatingPackage,
                                    isCritical: true,
                                    details: err
                                } as IError);
                            }
                        }
                    );
            };

            const openDialog = () => {
                ReactDOM.render(
                    React.createElement(NpmDeprecateDialog, {
                        packageSummary,
                        packageVersion,
                        onDismiss: closeHandler,
                        deprecatePackageDelegate: deprecateHandler
                    } as INpmDeprecateDialogProps),
                    $container[0]
                );
            };

            if (packageVersion.protocolMetadata && packageVersion.protocolMetadata.data) {
                openDialog();
            } else {
                // When deprecating from the package list page, get the latest version.
                const feedsDataService: FeedsDataService = Service.getLocalService(FeedsDataService);
                const isDeleted = PermissionHelper.isDeleted(feed);
                const isListed = null;
                feedsDataService
                    .getPackageVersionAsync(
                        feed.id,
                        packageSummary.id,
                        packageSummary.versions[0].id,
                        isListed,
                        isDeleted
                    )
                    .then((version: PackageVersion) => {
                        packageVersion = version;
                        openDialog();
                    });
            }
        };
    }
}
