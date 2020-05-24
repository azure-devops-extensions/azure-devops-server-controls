import * as React from "react";
import * as Security from "Admin/Scripts/TFS.Admin.Security";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Dialogs from "VSS/Controls/Dialogs";
import { DashboardSecurity } from "Dashboards/Scripts/Generated/Constants";
import { DashboardItem, TeamScope } from "Dashboards/Components/Shared/Contracts";
import { Dashboard } from "TFS/Dashboards/Contracts";
import { registerLWPComponent } from "VSS/LWP";

export function show(dashboardRow: DashboardItem, onCloseCallback?: () => void): void {

    let options: Security.SecurityDialogOptions = {
        tfsContext: TfsContext.getDefault(),
        permissionSet: DashboardSecurity.SecurityNamespaceGuid,
        tokenDisplayVal: dashboardRow.dashboard.name,
        token: JSON.stringify({ teamId: dashboardRow.teamScope.teamId, dashboardId: dashboardRow.dashboard.id }),
        close: onCloseCallback
    };

    Dialogs.show(Security.SecurityDialog, options);
}

interface IDashboardSecurityDialogShimProps {
    dashboardId: string;
    dashboardName: string;
    teamId: string;
    onClose: () => void;
}

/**
 * Allows rendering the old platform dashboard security dialog in the new web platform.
 */
class DashboardSecurityDialogShim extends React.Component<IDashboardSecurityDialogShimProps> {
    public static readonly componentType = "DashboardSecurityDialog";

    public componentDidMount() {
        const { dashboardId, dashboardName, teamId, onClose } = this.props;

        const dashboardItem: DashboardItem = {
            dashboard: { id: dashboardId, name: dashboardName } as Dashboard,
            teamScope: { teamId } as TeamScope
        };

        show(dashboardItem, onClose);
    }

    public render(): null {
        return null;
    }
}

registerLWPComponent(DashboardSecurityDialogShim.componentType, DashboardSecurityDialogShim);