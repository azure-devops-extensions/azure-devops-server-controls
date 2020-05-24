import * as React from "react";

import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";

import { ReleaseReportingHeroMatrixView } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingHeroMatrixView";


export class ReleaseReportExtension extends Controls.Control<{}> {

    public initialize(): void {
         this.getElement().addClass("release-reporting-container");
          Controls.create(ReleaseReportingHeroMatrixView, this.getElement(), {});
    }
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("cd-release-report", (context) => {
    return Controls.Control.create<ReleaseReportExtension, {}>(ReleaseReportExtension, context.$container, {
    });
});
