import { BacklogContentViewActions } from "Agile/Scripts/BacklogsHub/BacklogContentView/ActionsCreator/BacklogContentViewActions";
import { BacklogContentViewActionsCreator } from "Agile/Scripts/BacklogsHub/BacklogContentView/ActionsCreator/BacklogContentViewActionsCreator";
import { BacklogContentView } from "Agile/Scripts/BacklogsHub/BacklogContentView/Components/BacklogContentView";
import { BacklogContentViewStore } from "Agile/Scripts/BacklogsHub/BacklogContentView/Store/BacklogContentViewStore";
import { AgileRouteParameters, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { getPageContext } from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import { TeamSource } from "Agile/Scripts/Sources/TeamSource";
import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";

SDK_Shim.registerContent("backlogs-hub:content:view", (context: SDK_Shim.InternalContentContextData) => {
    const telemetryHelper = PerformanceTelemetryHelper.getInstance(BacklogsHubConstants.HUB_NAME);
    if (telemetryHelper.isActive()) {
        telemetryHelper.abort();
    }
    telemetryHelper.startInitialLoad(PerformanceTelemetryHelper.constructNavigationScenarioName(BacklogsHubConstants.HUB_NAME));
    telemetryHelper.split(BacklogsHubTelemetryConstants.BACKLOGS_START_LOADCONTENTVIEW);

    // Currently there is a single pivot
    const pivot = getPageContext().navigation.routeValues[AgileRouteParameters.Pivot];
    const backlogLevel = getPageContext().navigation.routeValues[AgileRouteParameters.BacklogLevel];

    telemetryHelper.addData({
        pivot: pivot,
        backlogLevel: backlogLevel
    });

    const backlogActions = new BacklogContentViewActions();
    const backlogActionsCreator = new BacklogContentViewActionsCreator(backlogActions);
    const backlogStore = new BacklogContentViewStore(backlogActions);
    const teamSource = new TeamSource();

    ReactDOM.render(
        (
            <BacklogContentView
                backlogActionsCreator={backlogActionsCreator}
                backlogStore={backlogStore}
                backlogLevel={backlogLevel}
                teamSource={teamSource}
            />
        ),
        context.container
    );

    return {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };
});