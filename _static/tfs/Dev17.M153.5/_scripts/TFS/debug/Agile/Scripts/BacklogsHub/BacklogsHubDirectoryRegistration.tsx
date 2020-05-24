import * as React from "react";
import * as ReactDOM from "react-dom";

import { BacklogsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";
import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import {
    createBacklogsDirectoryActionCreator,
    IDirectoryActionsCreator
} from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { DirectoryView } from "Agile/Scripts/Common/Directory/Components/DirectoryView";
import { DirectoryStore, IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType, IDirectoryPivot } from "Agile/Scripts/Common/DirectoryPivot";
import { BacklogsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { directoryPivotTypeFromString } from "Agile/Scripts/Common/Utils";
import { AgileRouteParameters, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { Team } from "Agile/Scripts/Models/Team";
import * as BacklogHubResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import { getPageContext } from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import { VssIconType } from "VSSUI/VssIcon";

SDK_Shim.registerContent("backlogs-hub:directory:view", (context: SDK_Shim.InternalContentContextData) => {
    const telemetryHelper = PerformanceTelemetryHelper.getInstance(BacklogsHubConstants.HUB_NAME);
    if (telemetryHelper.isActive()) {
        telemetryHelper.abort();
    }

    const pivots: IDirectoryPivot[] = [
        {
            name: BacklogHubResources.Directory_Mine,
            type: DirectoryPivotType.mine
        },
        {
            name: BacklogHubResources.Directory_All,
            type: DirectoryPivotType.all
        }
    ];

    const pivot = getPageContext().navigation.routeValues[AgileRouteParameters.Pivot];
    telemetryHelper.startInitialLoad(BacklogsHubTelemetryConstants.BACKLOGS_START_LOADDIRECTORYVIEW);
    telemetryHelper.addData({
        pivot: pivot
    });

    const selectedPivot: DirectoryPivotType = directoryPivotTypeFromString(pivot);
    const actions: DirectoryActions = new DirectoryActions();
    const actionsCreator: IDirectoryActionsCreator = createBacklogsDirectoryActionCreator(actions);
    const store: IDirectoryStore = new DirectoryStore(actions);

    ReactDOM.render(
        <DirectoryView
            actions={actions}
            actionsCreator={actionsCreator}
            store={store}
            selectedPivot={selectedPivot}
            pivots={pivots}
            artifactIconProps={{
                iconName: "BacklogList",
                iconType: VssIconType.fabric
            }}
            artifactNameSingular={BacklogHubResources.Backlog}
            artifactNamePlural={BacklogHubResources.Backlogs}
            getArtifactUrl={getBacklogsUrl}
            hubName={BacklogsHubConstants.HUB_NAME}
            navigateToUrl={navigateToBacklogsUrl}
            telemetryHelper={BacklogsHubTelemetryHelper}
        />,
        context.container
    );

    return {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };
});

function getBacklogsUrl(team: Team): string {
    return BacklogsUrls.getExternalBacklogContentUrl(team.name);
}

function navigateToBacklogsUrl(url: string): void {
    return BacklogsUrls.navigateToBacklogsHubUrl(url);
}
