import * as Telemetry from "VSS/Telemetry/Services";
import { BacklogsHubConstants, BoardsHubConstants, SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";

export class HubTelemetryHelper {
    constructor(private _area: string) {

    }

    /**
     * Publishes telemetry data with multiple keys/values
     * @param feature The feature name
     * @param properties The key value store of properties
     */
    public publishTelemetry(feature: string, properties: IDictionaryStringTo<any>, immediate: boolean = false): void {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(this._area, feature, properties),
            immediate
        );
    }

    /**
     * Publishes a single piece of telemetry data
     * @param feature The feature name
     * @param propertyKey The key
     * @param propertyValue The value
     */
    public publishTelemetryValue(feature: string, propertyKey: string, propertyValue: any, immediate: boolean = false): void {
        const properties = {};
        properties[propertyKey] = propertyValue;
        this.publishTelemetry(feature, properties, immediate);
    }

}

export const BoardsHubTelemetryHelper = new HubTelemetryHelper(BoardsHubConstants.HUB_NAME);
export const BacklogsHubTelemetryHelper = new HubTelemetryHelper(BacklogsHubConstants.HUB_NAME);
export const SprintsHubTelemetryHelper = new HubTelemetryHelper(SprintsHubConstants.HUB_NAME);
