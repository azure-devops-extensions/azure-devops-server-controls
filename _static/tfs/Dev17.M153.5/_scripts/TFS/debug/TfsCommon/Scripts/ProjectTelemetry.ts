import { getProject } from "TfsCommon/Scripts/Navigation/PageService";
import { addTelemetryEventHandler } from "VSS/Telemetry/Services";
import * as Service from "VSS/Service";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";

addTelemetryEventHandler((ev) => {
    const project = getProject();
    if (project) {
        ev.properties["dataspaceId"] = project.id;
        ev.properties["dataspaceType"] = "Project";
        ev.properties["dataspaceVisibility"] = project.visibility.toString();
        const featureManagementService = Service.getService(FeatureManagementService);
        const navigationMode = featureManagementService && featureManagementService.isFeatureEnabled("ms.vss-tfs-web.vertical-navigation") ?
            "vertical" : "horizontal";
        ev.properties["navigationMode"] = navigationMode;
    }
});