import * as React from "react";
import * as ReactDOM from "react-dom";

import { BoardsHubPerformanceTelemetryConstants } from "Agile/Scripts/BoardsHub/Constants";
import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import { createBoardsDirectoryActionCreator, IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { DirectoryView } from "Agile/Scripts/Common/Directory/Components/DirectoryView";
import { DirectoryStore, IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType, IDirectoryPivot } from "Agile/Scripts/Common/DirectoryPivot";
import { BoardsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BoardsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { directoryPivotTypeFromString } from "Agile/Scripts/Common/Utils";
import { AgileRouteParameters, BoardsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { Team } from "Agile/Scripts/Models/Team";
import * as BoardDirectoryResources from "Agile/Scripts/Resources/TFS.Resources.BoardsHub.BoardDirectory";
import { getPageContext } from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import { VssIconType } from "VSSUI/VssIcon";

SDK_Shim.registerContent("boards-hub:directory:view", (context: SDK_Shim.InternalContentContextData) => {
    const telemetryHelper = PerformanceTelemetryHelper.getInstance(BoardsHubConstants.HUB_NAME);
    if (telemetryHelper.isActive()) {
        telemetryHelper.abort();
    }
    telemetryHelper.startInitialLoad(BoardsHubPerformanceTelemetryConstants.BOARDS_REGISTRATION_LOAD_DIRECTORY);

    const pivots: IDirectoryPivot[] = [
        {
            name: BoardDirectoryResources.BoardsHub_MinePivot,
            type: DirectoryPivotType.mine
        },
        {
            name: BoardDirectoryResources.BoardHub_AllPivot,
            type: DirectoryPivotType.all
        }
    ];

    const pivot = getPageContext().navigation.routeValues[AgileRouteParameters.Pivot];
    telemetryHelper.addData({
        "pivot": pivot
    });

    const selectedPivot: DirectoryPivotType = directoryPivotTypeFromString(pivot);

    const actions: DirectoryActions = new DirectoryActions();
    const actionsCreator: IDirectoryActionsCreator = createBoardsDirectoryActionCreator(actions);
    const store: IDirectoryStore = new DirectoryStore(actions);

    ReactDOM.render(
        <DirectoryView
            actions={actions}
            actionsCreator={actionsCreator}
            store={store}
            selectedPivot={selectedPivot}
            pivots={pivots}

            artifactIconProps={{
                iconName: "BacklogBoard",
                iconType: VssIconType.fabric
            }}
            artifactNameSingular={BoardDirectoryResources.Board}
            artifactNamePlural={BoardDirectoryResources.Boards}
            getArtifactUrl={getBoardsUrl}
            hubName={BoardsHubConstants.HUB_NAME}
            navigateToUrl={navigateToBoardsUrl}
            telemetryHelper={BoardsHubTelemetryHelper}
        />
        , context.container
    );

    return {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };
});

function getBoardsUrl(team: Team): string {
    return BoardsUrls.getExternalBoardContentUrl(team.name);
}

function navigateToBoardsUrl(url: string): void {
    BoardsUrls.navigateToBoardsHubUrl(url);
}