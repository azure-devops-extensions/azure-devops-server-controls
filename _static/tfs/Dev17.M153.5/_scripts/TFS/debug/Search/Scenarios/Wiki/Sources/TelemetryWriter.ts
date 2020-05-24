import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";

import { WikiSearchTelemetryConstants } from "Search/Scenarios/Wiki/WikiSearchConstants";

/**
 * Writes telemetry events for the Wiki Search page.
 */
export class TelemetryWriter {
    constructor(
        private publishEventFunction: (eventData: TelemetryEventData, immediate?: boolean) => void = publishEvent) { }

    public publish = (feature: string, extraProperties: IDictionaryStringTo<any> = {}): void => {
        this.publishEventFunction(createWikiSearchEventData(feature, extraProperties));
    }
}

/**
 * Creates a telemetry event with default data for Wiki search.
 */
export function createWikiSearchEventData(
    feature: string,
    extraProperties: IDictionaryStringTo<any> = {},
): TelemetryEventData {
    const tfsContext = TfsContext.getDefault();
    const projectId = tfsContext.contextData.project ? tfsContext.contextData.project.id : undefined;
    return new TelemetryEventData(
        WikiSearchTelemetryConstants.AreaName,
        feature,
        {
            projectId: projectId,
            ...extraProperties,
        });
}
