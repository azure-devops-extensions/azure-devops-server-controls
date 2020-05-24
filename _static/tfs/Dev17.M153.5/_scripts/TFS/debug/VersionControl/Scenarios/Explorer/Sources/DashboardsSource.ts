import * as Q from "q";
import { Dashboard } from "TFS/Dashboards/Contracts";

import * as UserPermissionHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import { PushToDashboard } from "Dashboards/Scripts/Pinning.PushToDashboard";
import { Markdown_WidgetTypeID } from "Dashboards/Scripts/Pinning.PushToDashboardConstants";
import { WidgetDataForPinning } from "Dashboards/Scripts/Pinning.WidgetDataForPinning";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * A source of data for the dashboards integration in code explorer.
 */
export class DashboardsSource {
    constructor(private repositoryContext: RepositoryContext) {
    }

    public canEditDashboard(): boolean {
        // If it's not loaded, let's assume true and fallback to server verification
        return UserPermissionHelper.isDashboardsPrivilegesLoaded()
            ? UserPermissionHelper.CanEditDashboard()
            : true;
    }

    public getDashboards(): IPromise<Dashboard[]> {
        return PushToDashboard.getDashboards()
            .then(group => group.dashboardEntries);
    }

    public pinToDashboard(item: ItemModel, dashboardId: string): IPromise<{}> {
        const webContext = this.repositoryContext.getTfsContext().contextData;
        return PushToDashboard.pinToDashboard(
            webContext,
            {
                projectId: webContext.project.id,
                groupId: webContext.team.id,
                dashboardId,
                widgetData: this.getWidgetData(item),
            });
    }

    private getWidgetData(item: ItemModel) {
        const artifactId = this.getArtifactId(item);
        return new WidgetDataForPinning("Pinned Markdown", Markdown_WidgetTypeID, artifactId);
    }

    private getArtifactId(item: ItemModel) {
        return JSON.stringify({
            path: item.serverItem,
            version: item.version,
            repositoryId: this.repositoryContext.getRepositoryId(),
        });
    }
}
