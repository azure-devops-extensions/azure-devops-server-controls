import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Areas } from "Wiki/Scripts/CustomerIntelligenceConstants";

/**
 * Writes telemetry events for Wiki.
 */
export class TelemetryWriter {
    constructor(private publishEventFunction: (eventData: TelemetryEventData, immediate?: boolean) => void = publishEvent) { }

    public publish(feature: string, extraProperties: IDictionaryStringTo<any> = {}): void {
        this.publishEventFunction(createWikiEventData(feature, extraProperties));
    }
}

/**
 * Creates a telemetry event with default data for Wiki.
 */
export function createWikiEventData(
    feature: string,
    extraProperties: IDictionaryStringTo<any> = {},
): TelemetryEventData {
    const projectId = TfsContext.getDefault().contextData.project.id;
    return new TelemetryEventData(
        Areas.Wiki,
        feature,
        {
            projectId: projectId,
            ...extraProperties,
        });
}
