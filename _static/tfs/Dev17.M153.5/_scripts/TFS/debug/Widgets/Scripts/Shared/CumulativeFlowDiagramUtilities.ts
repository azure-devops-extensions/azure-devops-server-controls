import { DataSeries } from "Charts/Contracts";
import { ChartColorPalettes } from "Widgets/Scripts/Shared/ChartColorPalettes";
import { IScenarioDescriptor } from "VSS/Performance";

/**
 * Utilities to assign colors to CFD chart data series.
 */
export class CFDSeriesColorAssigner {
    /**
     * Assigns colors to an array of series.
     * Assumes the first series (index 0) represents the "Done/Completed" series and the last series represents the "Proposed" series.
     * Assigns a unique color to the "Done/Completed" and "Proposed" series and linearly assigns the remaining theme colors to the other series.
     * @param series {DataSeries} The series to assign colors to
     * @param theme {string} The palette theme to use when assigning colors
     * @param hasProposedSeries {boolean} True if the last series is the "proposed" series
     */
    public static mergeThemeColorsIntoSeries(series: DataSeries[], theme: string, hasProposedSeries: boolean): void {
        if (series && series.length > 0) {
            let palettes = ChartColorPalettes.getInstance();
            let palette = palettes.getPalette(theme);
            let numColors = palette.otherColors.length;

            // First series (usually the done/completed series) gets its own color
            series[0].color = palette.doneColor;

            // Other series are linearly assigned to colors at indices 1 to n rotating through the color list as necessary
            for (let i = 1; i < series.length; ++i) {
                let themeIndex = (i - 1) % numColors;
                series[i].color = palette.otherColors[themeIndex];
            }

            // The proposed series (if present) gets its own color
            if (hasProposedSeries) {
                series[series.length - 1].color = palette.proposedColor;
            }
        }
    }
}

/**
 * Hacky class to record the window.performance.getEntriesByType("resource") entries pertinent to CFD in telemetry.
 * Replace with https://mseng.visualstudio.com/VSOnline/Dashboards/_git/VSO/pullrequest/148062 once checked in.
 */
export class CFDPerformanceTelemetry {
    private static instance: CFDPerformanceTelemetry;

    private registeredCount: number = 0;
    private startTime: number;

    constructor() {
        if (CFDPerformanceTelemetry.instance != null) {
            throw "Use getInstance to retrieve existing instance";
        }
    }

    public static getInstance(): CFDPerformanceTelemetry {
        if (CFDPerformanceTelemetry.instance == null) {
            CFDPerformanceTelemetry.instance = new CFDPerformanceTelemetry();
        }

        return CFDPerformanceTelemetry.instance;
    }

    /**
     * All CFDs should call this before making any ajax calls.
     * @param scenarioDescriptor for widgetLoad
     */
    public register(scenarioDescriptor: IScenarioDescriptor): void {
        // Increment count, and if the count was 0, record the startTime because this means CFDs are loading after
        // initial dashboard load (such as from live preview in config or auto-refresh) and we don't want to recollect
        // previously collected telemetry.
        if (this.registeredCount++ === 0) { // Increment count by 1 after comparison
            if (scenarioDescriptor.getTelemetry()
                && scenarioDescriptor.getTelemetry().properties
                && scenarioDescriptor.getTelemetry().properties["startTime"]) {
                this.startTime = scenarioDescriptor.getTelemetry().properties["startTime"];
            } else {
                this.startTime = null;
            }
        }
    }

    /**
     * Records performance timings for all CFDs in the scenario of the last CFD to call this method that registered with this object.
     * @param scenarioDescriptor for widgetLoad
     */
    public recordTelemetry(scenarioDescriptor: IScenarioDescriptor): void {
        // Only record telemetry if this is the last call (approximates last CFD to load on page).
        // This is fragile because if any CFD fails to load in a way that isn't caught by the widget then the register
        // counter will never reach 0, but I'd rather it be that than duplicate data.
        if (this.startTime != null
            && --this.registeredCount === 0 // Subtract 1 from count before equality operation
            && window.performance
            && $.isFunction(window.performance.getEntriesByType)) {

            let resourceEntries: PerformanceResourceTiming[] = window.performance.getEntriesByType("resource");
            let cfdEntries = resourceEntries.filter(entry => {
                return entry.startTime > this.startTime
                    && (entry.name.indexOf("_odata") >= 0 // CFD requests that I'm interested in (both requests and their OPTIONS calls). This only works because right now all requests to analytics are for CFD.
                        || entry.name.indexOf("_apis/Analytics") >= 0
                        || entry.name.indexOf("LocationService2") >= 0); // May or may not be triggered by a request to Analytics. Including anyway.
            });

            let telemetryObjects = cfdEntries.map(entry => {
                return {
                    name: entry.name, // Will be the URL of the request
                    startTime: Math.round(entry.startTime),
                    duration: Math.round(entry.duration),
                    latency: Math.round(entry.responseStart - entry.requestStart), // Should be close approximation of server execution time
                    initiatorType: entry.initiatorType // Used to help determine difference between GET and OPTIONS requests
                };
            });

            scenarioDescriptor.addData({
                performanceResourceTimings: {
                    count: telemetryObjects.length,
                    timings: telemetryObjects
                }
            });
        }
    }
}