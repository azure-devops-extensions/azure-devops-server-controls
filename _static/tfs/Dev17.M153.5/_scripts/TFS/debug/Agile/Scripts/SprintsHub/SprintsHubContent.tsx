import { AgileRouteParameters, SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { SprintsViewActions } from "Agile/Scripts/SprintsHub/SprintView/ActionsCreator/SprintsViewActions";
import { SprintsViewActionsCreator } from "Agile/Scripts/SprintsHub/SprintView/ActionsCreator/SprintsViewActionsCreator";
import { SprintView } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintView";
import { SprintsViewStore } from "Agile/Scripts/SprintsHub/SprintView/Store/SprintsViewStore";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { SprintViewUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewTelemetryConstants";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { getPageContext } from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import { TeamSource } from "Agile/Scripts/Sources/TeamSource";

SDK_Shim.registerContent("sprints-hub:content:view", (context: SDK_Shim.InternalContentContextData) => {
    const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
    if (telemetryHelper.isActive()) {
        telemetryHelper.abort();
    }

    const sprintId = getPageContext().navigation.routeValues[AgileRouteParameters.Iteration];
    const pivot = getPageContext().navigation.routeValues[AgileRouteParameters.Pivot];

    telemetryHelper.startInitialLoad(PerformanceTelemetryHelper.constructNavigationScenarioName(SprintsHubConstants.HUB_NAME, pivot));
    telemetryHelper.split(SprintViewUsageTelemetryConstants.SPRINT_START_LOADCONTENTVIEW);

    const actions = new SprintsViewActions();
    const actionsCreator = new SprintsViewActionsCreator(actions);
    const store = new SprintsViewStore(actions);
    const teamSource = new TeamSource();
    context.container.className = context.container.className + " sprint-view-container";

    ReactDOM.render(
        <SprintView sprintId={sprintId} selectedPivot={pivot} store={store} actionsCreator={actionsCreator} teamSource={teamSource} />,
        context.container);

    return {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };
});