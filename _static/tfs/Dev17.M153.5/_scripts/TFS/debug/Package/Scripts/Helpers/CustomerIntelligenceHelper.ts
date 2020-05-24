import * as Telemetry from "VSS/Telemetry/Services";

import { CiConstants, FeedServiceInstanceId } from "Feed/Common/Constants/Constants";

export class CustomerIntelligenceHelper {
    public static publishEvent(feature: string, properties: IDictionaryStringTo<any> = {}): void {
        // Tag events so we know they're coming from the UX
        properties.telemetrySource = "UX_2.0";

        Telemetry.publishEvent(
            Telemetry.TelemetryEventData.forService(CiConstants.Area, feature, FeedServiceInstanceId, properties)
        );
    }
}
