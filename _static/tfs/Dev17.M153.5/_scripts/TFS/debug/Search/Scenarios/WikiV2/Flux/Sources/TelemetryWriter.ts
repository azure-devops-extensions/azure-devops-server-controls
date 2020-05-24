import * as Performance from "VSS/Performance";
import * as CommonCIConstants from "Search/Scenarios/Shared/CustomerIntelligenceConstants";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { CustomerIntelligenceConstants } from "Search/Scenarios/WikiV2/Constants";
import { format, base64Encode } from "VSS/Utils/String";

/**
 * Writes telemetry events for code search page.
 */
export class TelemetryWriter {
    public readonly initialScenario: Scenario;

    constructor(isInitialPageLoad: boolean) {
        this.initialScenario = new Scenario(isInitialPageLoad);
    }

    public publish = (feature: string, extraProperties: IDictionaryStringTo<any> = {}): void => {
        publishEvent(createTelemetryEventData(feature, extraProperties));
    }

    public dispose = (): void => {
        this.initialScenario.dispose();
    }
}

/**
 * Creates a telemetry event with default data for code search page.
 */
export function createTelemetryEventData(
    feature: string,
    extraProperties: IDictionaryStringTo<any> = {},
): TelemetryEventData {
    return new TelemetryEventData(
        CommonCIConstants.SEARCH_AREA,
        `${CustomerIntelligenceConstants.EntityName}.${feature}`,
        {
            entity: CustomerIntelligenceConstants.EntityName,
            ...extraProperties,
        });
}

export class Scenario {
    private performanceScenario: Performance.IScenarioDescriptor;
    private previewPerformanceScenario: Performance.IScenarioDescriptor;

    constructor(isInitialPageLoad: boolean) {
        this.performanceScenario = this.getSearchScenario(isInitialPageLoad);
        this.performanceScenario.addSplitTiming("startedInitialization");
    }

    public notifySearchStarted = (): void => {
        if (this.performanceScenario.isActive()) {
            this.performanceScenario.addSplitTiming("searchStarted");
        }
    }
    
    public notifyResultsRendered = (): void => {
        if (this.performanceScenario.isActive()) {
            this.performanceScenario.addSplitTiming("resultsRendered");

            this.performanceScenario.end();
        }
    }

    public dispose = (): void => {
        this.abortDanglingScenarios();
    }

    private getSearchScenario(isInitialPageLoad): Performance.IScenarioDescriptor {
        this.abortDanglingScenarios();
        return isInitialPageLoad
            ? Performance.getScenarioManager().startScenarioFromNavigation(CommonCIConstants.SEARCH_AREA, CustomerIntelligenceConstants.TTIScenarioName, true)
            : Performance.getScenarioManager().startScenario(CommonCIConstants.SEARCH_AREA, CustomerIntelligenceConstants.TabSwitchScenarioName);
    }

    private abortDanglingScenarios(): void {
        Performance
            .getScenarioManager()
            .getScenarios(CommonCIConstants.SEARCH_AREA, CustomerIntelligenceConstants.TTIScenarioName).forEach(sc => sc.abort());
        Performance
            .getScenarioManager()
            .getScenarios(CommonCIConstants.SEARCH_AREA, CustomerIntelligenceConstants.TabSwitchScenarioName).forEach(sc => sc.abort());
    }
}

export function getWikiItemTrackingData(wikiItemIndex: number): TelemetryEventData {
    return createTelemetryEventData(
        CustomerIntelligenceConstants.ResultLinkClicked,
        {[CustomerIntelligenceConstants.ResultLinkItemIndex]: wikiItemIndex}
    )
}

export function getUrlWithTrackingData(url: string, data: TelemetryEventData): string {
    return url + format("{0}{1}={2}",
                        (url.indexOf("?") >= 0) ? "&" : "?",
                        CustomerIntelligenceConstants.UrlParameterKeyTrackingData,
                        encodeTrackingData(data));
}

function encodeTrackingData(data: TelemetryEventData): string {
    return encodeURIComponent(base64Encode(JSON.stringify(data)));
}