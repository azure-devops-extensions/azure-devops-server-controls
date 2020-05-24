import { CommonConstants, PerfScenarios } from "PipelineWorkflow/Scripts/Common/Constants";
import { CreateReleasePanelHelper, ICreateReleaseOptions } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

import * as Performance from "VSS/Performance";
import * as SDK_Shim from "VSS/SDK/Shim";

SDK_Shim.registerContent("cd-create-release", (context: SDK_Shim.InternalContentContextData): void => {
    let options: ICreateReleaseOptions = context.options;
    let createReleasePanelHelper;
    if (options.startReleaseMode) {
        Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
        createReleasePanelHelper = new CreateReleasePanelHelper<PipelineTypes.PipelineRelease, PipelineTypes.PipelineEnvironment>(options);
    } else {
        Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
        createReleasePanelHelper = new CreateReleasePanelHelper<PipelineTypes.PipelineDefinition, PipelineTypes.PipelineDefinitionEnvironment>(options);
    }
    createReleasePanelHelper.openCreateReleasePanel();
});