import * as React from "react";
import * as ReactDOM from "react-dom";

import { TeamBoardContentViewActions } from "Agile/Scripts/BoardsHub/TeamBoardContentView/ActionsCreator/TeamBoardContentViewActions";
import { TeamBoardContentViewActionsCreator } from "Agile/Scripts/BoardsHub/TeamBoardContentView/ActionsCreator/TeamBoardContentViewActionsCreator";
import { TeamBoardContentView } from "Agile/Scripts/BoardsHub/TeamBoardContentView/Components/TeamBoardContentView";
import { TeamBoardContentViewStore } from "Agile/Scripts/BoardsHub/TeamBoardContentView/Store/TeamBoardContentViewStore";
import { BoardsHubPerformanceTelemetryConstants } from "Agile/Scripts/BoardsHub/Constants";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { AgileRouteParameters, BoardsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { getPageContext } from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import { TeamSource } from "Agile/Scripts/Sources/TeamSource";
import { BoardSource } from "Agile/Scripts/Sources/BoardSource";

SDK_Shim.registerContent("team-board-content-view", (context: SDK_Shim.InternalContentContextData) => {
    const telemetryHelper = PerformanceTelemetryHelper.getInstance(BoardsHubConstants.HUB_NAME);
    if (telemetryHelper.isActive()) {
        telemetryHelper.abort();
    }
    telemetryHelper.startInitialLoad(PerformanceTelemetryHelper.constructNavigationScenarioName(BoardsHubConstants.HUB_NAME));
    telemetryHelper.split(BoardsHubPerformanceTelemetryConstants.BOARDS_START_LOADCONTENTVIEW);

    // Currently there is a single pivot
    const pivot = getPageContext().navigation.routeValues[AgileRouteParameters.Pivot];
    const BoardLevel = getPageContext().navigation.routeValues[AgileRouteParameters.BacklogLevel];
    const embedded = getPageContext().navigation.routeId === BoardsHubConstants.EMBEDDED_ROUTE_CONTRIBUTION_ID;

    telemetryHelper.addData({
        pivot: pivot,
        BoardLevel: BoardLevel,
        isEmbedded: embedded
    });

    const boardActions = new TeamBoardContentViewActions();
    const boardActionsCreator = new TeamBoardContentViewActionsCreator(boardActions);
    const boardStore = new TeamBoardContentViewStore(boardActions);
    const teamSource = new TeamSource();
    const boardSource = new BoardSource();

    // We need to add this class for styling the filter bar, etc.
    context.container.className = `${context.container.className} board-view-container`;

    ReactDOM.render(
        (
            <TeamBoardContentView
                actionsCreator={boardActionsCreator}
                store={boardStore}
                backlogLevel={BoardLevel}
                teamSource={teamSource}
                boardSource={boardSource}
                embedded={embedded}
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