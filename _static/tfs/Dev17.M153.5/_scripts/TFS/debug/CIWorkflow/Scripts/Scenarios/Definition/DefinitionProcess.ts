import { ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildDefinition, DesignerProcess, YamlProcess } from "TFS/Build/Contracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";

export function initializeDesignerProcess(buildDefinition: BuildDefinition): DesignerProcess {
    let process = buildDefinition.process as DesignerProcess;
    if (!process || process.type !== ProcessType.Designer) {
        process = {
            type: ProcessType.Designer
        } as DesignerProcess;

        buildDefinition.process = process;
    }

    process.phases = process.phases || [];

    return process;
}

export function initializeYamlProcess(buildDefinition: BuildDefinition): YamlProcess {
    let process = buildDefinition.process as YamlProcess;
    if (!process || process.type !== ProcessType.Yaml) {
        process = {
            type: ProcessType.Yaml
        } as YamlProcess;

        buildDefinition.process = process;
    }

    return process;
}

export function isPhaseDependenciesFeatureEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled("WebAccess.Build2.PhaseDependencies", false); 
}