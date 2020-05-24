import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

function startWaitControl() {
    const waitControlOptions: StatusIndicator.IWaitControlOptions = {
        message: VCResources.LoadingText,
        cancellable: false,
    };

    const waitControl = Controls.create(StatusIndicator.WaitControl, $(document.body), waitControlOptions);

    waitControl.startWait();

    return waitControl;
}

/**
 * VSS.using(...) with Loading status indicator
 */
export function using(
    moduleNames: string[],
    callback: Function
) {
    const waitControl = startWaitControl();

    VSS.using(moduleNames, (...args) => {
        waitControl.endWait();
        callback(...args);
    });
}