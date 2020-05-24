import * as React from "react";
import * as ReactDOM from "react-dom";

import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { directoryPivotTypeFromString } from "Agile/Scripts/Common/Utils";
import { AgileRouteParameters, SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { SprintsDirectoryView } from "Agile/Scripts/SprintsHub/Directory/Components/SprintsDirectoryView";
import { SprintsHubTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintsHubConstants";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { getPageContext } from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";

SDK_Shim.registerContent("sprints-hub:directory:view", (context: SDK_Shim.InternalContentContextData) => {
    const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
    if (telemetryHelper.isActive()) {
        telemetryHelper.abort();
    }

    const pivot = getPageContext().navigation.routeValues[AgileRouteParameters.Pivot];
    telemetryHelper.startInitialLoad(SprintsHubTelemetryConstants.SPRINTS_REGISTRATION_LOAD_DIRECTORY);
    telemetryHelper.addData({
        pivot: pivot
    });

    const activePivotType: DirectoryPivotType = directoryPivotTypeFromString(pivot);
    ReactDOM.render(
        <SprintsDirectoryView selectedPivot={activePivotType} />, context.container);

    return {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };
});
