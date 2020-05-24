import * as React from "react";
import * as ReactDOM from "react-dom";

import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import { NavigationView } from "VSS/Controls/Navigation";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { ReleaseReportingHub } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingHub";
import * as ReleaseReportingPanelHelper_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelHelper";
import { ReleaseReportingActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActionsCreator";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingHeroMatrixView";

export class ReleaseReportingHeroMatrixView extends NavigationView {
    public initializeOptions(options) {
        super.initializeOptions(JQueryWrapper.extend({
            attachNavigate: true
        }, options));
    }

    public onNavigate(state: any) {
        this.getElement().addClass("release-reporting-hero-matrix-view");

        if (state) {
            let definitionId = NavigationStateUtils.getDefinitionId();
            this._renderReleaseReportingHub(definitionId);
        }
    }
    
    private _renderReleaseReportingHub(definitionId: number): void {

        VSS.using(["PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelHelper"],
        (ReleaseReportingPanelHelper: typeof ReleaseReportingPanelHelper_TypeOnly) => {
            let releaseReportingPanelHelperInstanceId = DtcUtils.getUniqueInstanceId();
            let releaseReportingPanelHelper = new ReleaseReportingPanelHelper.ReleaseReportingPanelHelper({ definitionId: definitionId });
            releaseReportingPanelHelper.InitializeReportingStore(releaseReportingPanelHelperInstanceId);
            let releaseReportingStore = releaseReportingPanelHelper.getReportingStore();
            this._releaseReportingActionsCreator = releaseReportingPanelHelper.getReportingActionCreator();
            
            ReactDOM.render(
                <ReleaseReportingHub
                    instanceId={releaseReportingPanelHelperInstanceId}
                    releaseReportingDialogStore={releaseReportingStore}
                    releaseReportingActionsCreator={this._releaseReportingActionsCreator}/>,
                    this.getElement()[0]);
        });

    }

    private _releaseReportingActionsCreator: ReleaseReportingActionsCreator;
    
}
