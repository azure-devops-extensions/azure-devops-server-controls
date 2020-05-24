
import { WikiSearchTelemetryConstants } from "Search/Scenarios/Wiki/WikiSearchConstants";
import { ITrackingData } from "SearchUI/Telemetry/TelemetryUtils";

export function getWikiItemTrackingData(wikiItemIndex: number): ITrackingData {
    return {
        [WikiSearchTelemetryConstants.TrackingDataSource]: WikiSearchTelemetryConstants.AreaName,
        [WikiSearchTelemetryConstants.TrackingDataWII]: wikiItemIndex,
    } as ITrackingData;
}
