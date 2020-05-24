import * as ReactDOM from "react-dom";
import * as React from "react";

import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";

import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import * as ReleaseReportingPanelHelper_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelHelper";
import { ReleaseReportingDeploymentDurationHub } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDeploymentDurationHub";
import { ReleaseReportingActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActionsCreator";

export class ReleaseDeploymentDurationReport extends Controls.Control<{}> {

        public initialize(): void {
        let definitionId = NavigationStateUtils.getDefinitionId();
        if (definitionId > 0) {
           this._renderDeploymentDurationView(definitionId);
        }
    }

    private _renderDeploymentDurationView(definitionId: number): void {
        
                VSS.using(["PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelHelper"],
                (ReleaseReportingPanelHelper: typeof ReleaseReportingPanelHelper_TypeOnly) => {
                    let releaseReportingPanelHelperInstanceId = DtcUtils.getUniqueInstanceId();
                    let releaseReportingPanelHelper = new ReleaseReportingPanelHelper.ReleaseReportingPanelHelper({ definitionId: definitionId });
                    releaseReportingPanelHelper.InitializeReportingStore(releaseReportingPanelHelperInstanceId);
                    let releaseReportingStore = releaseReportingPanelHelper.getReportingStore();
                    this._releaseReportingActionsCreator = releaseReportingPanelHelper.getReportingActionCreator();
                    
                    ReactDOM.render(
                        <ReleaseReportingDeploymentDurationHub
                            instanceId={releaseReportingPanelHelperInstanceId}
                            releaseReportingDialogStore={releaseReportingStore}
                            releaseReportingActionsCreator={this._releaseReportingActionsCreator}
                            definitionId={definitionId}
                            definitionName={Utils_String.empty}/>,
                            this.getElement()[0]);
                });
        
            }

    private _releaseReportingActionsCreator: ReleaseReportingActionsCreator;
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("cd-release-deployment-duration", (context) => {
    return Controls.Control.create<ReleaseDeploymentDurationReport, {}>(ReleaseDeploymentDurationReport, context.$container, {
    });
});

