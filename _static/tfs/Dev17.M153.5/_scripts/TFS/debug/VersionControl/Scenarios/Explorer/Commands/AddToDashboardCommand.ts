import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Dashboard } from "TFS/Dashboards/Contracts";
import { format } from "VSS/Utils/String";

import * as TFSResourcesPresentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { IExtensionHost } from "VersionControl/Scenarios/Explorer/Commands/ExtensionHost";
import { GetCommandsOptions, hasFileExtension } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import { DashboardsSource } from "VersionControl/Scenarios/Explorer/Sources/DashboardsSource";
import { getMenuIcon } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getFileName } from "VersionControl/Scripts/VersionControlPath";

const markdownExtension = "md";
const notificationSpecialType = "added-to-dashboard";
const doNothingButUseLinkStyleInsteadOfText = () => undefined;

export class AddToDashboardCommand {
    private dashboards: Dashboard[] = [];
    private hasDashboardPermissions: boolean;

    constructor(
        private source: DashboardsSource,
        private extensionHost: IExtensionHost,
    ) {
        this.hasDashboardPermissions = source.canEditDashboard();
        if (this.hasDashboardPermissions) {
            source.getDashboards().then(dashboards => this.dashboards = dashboards);
        }
    }

    public getCommand = ({ item, isEditing, isCurrentItem, uiSource }: GetCommandsOptions): IContextualMenuItem => {
        if (!item.isFolder &&
            hasFileExtension(item, markdownExtension) &&
            !(isEditing && isCurrentItem) &&
            this.hasDashboardPermissions) {
            return {
                key: "addToDashboard",
                name: TFSResourcesPresentation.PushToDashboardTitle,
                disabled: this.dashboards.length === 0,
                iconProps: getMenuIcon("bowtie-math-plus"),
                onClick: doNothingButUseLinkStyleInsteadOfText,
                subMenuProps: {
                    items: this.dashboards.map(dashboard => ({
                        key: dashboard.id,
                        name: dashboard.name,
                        onClick: () => this.pinToDashboard(item, dashboard.id, uiSource),
                    })),
                },
            };
        }

        return undefined;
    }

    private pinToDashboard(item: ItemModel, dashboardId: string, uiSource: string): void {
        this.extensionHost.publishTelemetryEvent("pinToDashboard", { uiSource });

        this.source.pinToDashboard(item, dashboardId)
            .then(() => this.extensionHost.notify(
                format(VCResources.AddedToDashboard, getFileName(item.serverItem)),
                notificationSpecialType));
    }
}
