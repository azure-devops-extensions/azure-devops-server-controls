import * as Performance from "VSS/Performance";
import * as CommonCIConstants from "Search/Scenarios/Shared/CustomerIntelligenceConstants";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
/**
 * Writes telemetry events for code search page.
 */
export interface ITelemetryWriter {
    publish: (feature: string, extraProperties: IDictionaryStringTo<any>) => void;

    dispose: () => void;
}

export interface SearchPerfTelemetryAdditionalData {
    responseActivityId: string;

    searchSource?: string;
}

export var publishTelemetryEvent = (eventData: TelemetryEventData) => publishEvent(eventData);

/**
 * Creates a telemetry event with default data for search page.
 */
export function createTelemetryEventData(
    feature: string,
    entity: string,
    extraProperties: IDictionaryStringTo<any> = {},
): TelemetryEventData {
    return new TelemetryEventData(
        CommonCIConstants.SEARCH_AREA,
        `${entity}.${feature}`,
        {
            entity,
            ...extraProperties,
        });
}

/**
 * Telemetry writer to log telemetry events for Async network calls.
 */
export class SearchQueryResultsTelemetryWriter {
    private pendingRequestsStartTime: IDictionaryNumberTo<number>;
    private nextRequestId: number;

    constructor(private telemetryName: string, private entity: string) {
        this.pendingRequestsStartTime = {};
        this.nextRequestId = 0;
    }

    /**
    * Call this method before making the API call to be measured.
    * Returns the id of the request the class tracks for further action e.g. completion.
    */
    public notifyStarted = (): number => {
        this.nextRequestId += 1;
        this.pendingRequestsStartTime[this.nextRequestId] = Performance.getTimestamp();

        return this.nextRequestId;
    }

    /**
    * On accounts of API failures remove from tracking requests.
    */
    public notifyFailed = (requestId: number): void => {
        if (typeof this.pendingRequestsStartTime[requestId] !== "undefined") {
            delete this.pendingRequestsStartTime[requestId];
        }
    }

    /**
    * On successfull compeletion stop tracking the request and log the telemetry with time it took for the request to complete.
    * Also logs the additional data that is passed as part of the same event.
    */
    public notifySucceeded = (requestId: number, data: SearchPerfTelemetryAdditionalData): void => {
        if (typeof this.pendingRequestsStartTime[requestId] !== "undefined") {
            publishTelemetryEvent(
                createTelemetryEventData(
                    this.telemetryName,
                    this.entity,
                    {
                        ...data,
                        TotalTime: Performance.getTimestamp() - this.pendingRequestsStartTime[requestId]
                    }));

            delete this.pendingRequestsStartTime[requestId];
        }
    }
}