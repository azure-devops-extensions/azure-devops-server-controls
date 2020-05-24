import { Dashboard } from "TFS/Dashboards/Contracts";
import * as UserPermissionHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import { showAddToDashboard, PushToDashboardProps } from "TFSUI/Dashboards/AddToDashboard";
import { WidgetDataForPinning } from "TFSUI/Dashboards/AddToDashboardContracts";
import { BuildChart_WidgetTypeID } from "Dashboards/Scripts/Pinning.PushToDashboardConstants";
import { BuildArtifact } from "Dashboards/Scripts/Pinning.BuildArtifact";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildDefinitionReference } from "TFS/Build/Contracts";

export class DefinitionDashboardSource {

    public pushToDashboard(definition: BuildDefinitionReference): void {
        const webContext = TfsContext.getDefault().contextData;
        
        let pushToDashboardProps: PushToDashboardProps = {
            projectId: webContext.project.id,
            widgetData: {
                name: definition.name, 
                contributionId: BuildChart_WidgetTypeID, 
                settings: this._getArtifact(definition)
            } as WidgetDataForPinning,
            actionCallback: (args) => {}
        };

        showAddToDashboard(pushToDashboardProps);
    }

    private _getArtifact(definition: BuildDefinitionReference): string {
        return JSON.stringify({
            uri: definition.uri,
            type: definition.type,
            projectId: definition.project.id
        });
    }
}
