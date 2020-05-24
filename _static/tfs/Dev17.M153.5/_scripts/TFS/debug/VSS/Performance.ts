import { addGlobalListener } from "VSS/Ajax";
import Bundling = require("VSS/Bundling");
import Context = require("VSS/Context");
import Diag = require("VSS/Diag");
import Events_Page = require("VSS/Events/Page");
import Events_Services = require("VSS/Events/Services");
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Serialization = require("VSS/Serialization");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

// Area and feature to use for Scenario CI events
const SCENARIO_CI_AREA = "Performance";
const SCENARIO_CI_FEATURE = "Scenario";

/**
 * Capture performance metrics with the Performance Timing API. Wrapped here for compat concerns.
 */
module Timing {
    export function mark(markName: string): void {
        window.performance && window.performance.mark && window.performance.mark(markName);
        console && (<any>console).timeStamp && (<any>console).timeStamp(markName);

    }

    export function measure(measureName: string, startMarkName: string, endMarkName: string): void {
        if (!navigationTimingMarkHit(startMarkName) || !navigationTimingMarkHit(endMarkName)) {
            // Start or end mark name for measure is a navigation event and hasn't been hit yet. We
            // cannot create the measure.
            return;
        }

        window.performance && window.performance.measure && window.performance.measure(measureName, startMarkName, endMarkName);
    }

    /** Determine whether the given mark name is a navigation event and if it is, if it has occurred yet */
    function navigationTimingMarkHit(markName: string): boolean {
        var mark = window.performance && window.performance.timing && window.performance.timing[markName] || null;

        return typeof mark === "undefined" || mark === null || mark > 0;
    }

    export function getEntriesByType(entryType: string): PerformanceEntry[] {
        return (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType(entryType)) || [];
    }

    export function getEntriesByName(entryName: string): PerformanceEntry[] {
        return (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByName(entryName)) || [];
    }

    export function getMeasures(name?: string): PerformanceEntry[] {
        return Timing.getEntriesByType('measure');
    }

    export function getMarks(): PerformanceEntry[] {
        return Timing.getEntriesByType('mark');
    }

    export function getTimingByName(name: string): number {
        return (window.performance && window.performance.timing && window.performance.timing[name]) || null;
    }
}

/** Gets scenario manager instance */
export function getScenarioManager(): IScenarioManager {
    return ScenarioManager.getInstance();
}

/** DO NOT USE: Only exported for unit testing */
export function _createScenarioManagerForTesting(): IScenarioManager {
    return new ScenarioManager();
}

/** Scenario management */
export interface IScenarioManager {
    /**
     * Start new scenario
     * @param area Feature area of scenario.
     * @param name Name of scenario.
     * @param startTime Optional: Scenario start time. IMPORTANT: Has to be obtained using getTimestamp
     * @param isPageInteractive Optional: Whether or not the scenario is the primary one for the page, indicating whether or not hte page is yet interactive (TTI)
     * @param serviceInstanceType The id of the service instance type to send the telemetry to.
     *
     * @returns Scenario descriptor
     */
    startScenario(featureArea: string, name: string, startTime?: number, isPageInteractive?: boolean, serviceInstanceType?: string): IScenarioDescriptor;

    /**
     * End scenario if it's currently active
     * @param area Feature area of scenario.
     * @param name Name of scenario.
     */
    endScenario(featureArea: string, name: string): Promise<void>;

    /**
     * Abort scenario if it's currently active. Use this when a scenario that has started hit an error condition and you want to abort performance tracking for the scenario.
     * @param area Feature area of scenario.
     * @param name Name of scenario.
     */
    abortScenario(featureArea: string, name: string): void;

    /**
     * Start new scenario beginning at the browser's navigationStart event
     * @param featureArea Feature area name for CI event.
     * @param name Name of scenario.
     * @param isPageInteractive Optional: Whether or not the scenario is the primary one for the page, indicating whether or not hte page is yet interactive (TTI)
     * @param serviceInstanceType The id of the service instance type to send the telemetry to
     * @param includePageLoadScenarioData Include the default page load scenario data 
     *
     * @returns Scenario descriptor
     */
    startScenarioFromNavigation(featureArea: string, name: string, isPageInteractive?: boolean, serviceInstanceType?: string, includePageLoadScenarioData?: boolean): IScenarioDescriptor;

    /**
     * Record a page load scenario.
     * @param area Feature area name for CI event.
     * @param name Name of scenario.
     * @param data Optional data to be recorded with scenario
     * @param serviceInstanceType The id of the service instance type to send the telemetry to
     */
    recordPageLoadScenarioForService(featureArea: string, name: string, data?: any, serviceInstanceType?: string);

    /**
     * Record a page load scenario.
     * @param area Feature area name for CI event.
     * @param name Name of scenario.
     * @param data Optional data to be recorded with scenario
     */
    recordPageLoadScenario(featureArea: string, name: string, data?: any);

    /**
     * Get active scenarios with given area/name
     * @param area Feature area of scenario.
     * @param name Name of scenario.
     */
    getScenarios(featureArea: string, name: string): IScenarioDescriptor[];

    /**
     * Get all completed scenarios
     */
    getAllCompletedScenarios(): IScenarioDescriptor[];

    /**
     * Insert split timing for all currently active scenarios
     * @param splitName Name of split timing
     */
    split(splitName: string): void;

    /**
     * Add information about ajax call to all currently active scenarios
     * @returns Function to end measurement
     */
    addAjaxCallStart(): IEndAjaxCallTiming;

    /**
     * Add an event listener for scenario-complete events
     *
     * @param callback Method invoked when a perf scenario has been marked as completed
     */
    addScenarioCompletedListener(callback: IPerfScenarioEventCallback): void;

    /**
     * Get status of page load scenario
     * @returns boolean indicating whether the page load scenario is active
     */
    isPageLoadScenarioActive(): boolean;

    /**
     * Resets page interactive event and starts default scenario
     */
    resetPageLoadScenario(): void;

    /**
     * Indicate whether the page load scenario is full navigation (i.e. not an FPS navigate).
     */
    isPageLoadScenarioFullNavigation(): boolean;
}

/** Describes split timing within scenarios */
export interface ISplitTiming {
    /** Name of split timing */
    name: string;

    /** Time relative to scenario start */
    timestamp: number;

    /** Deprecated: Elapsed time for split timing. */
    elapsedTime?: number;
}

export interface IEndAjaxCallTiming {
    /**
     * @param url Url of ajax request
     * @param method HTTP method
     * @param activityId ActivityId for server call
     * @param status HTTP status
     * @param contentLength Length of content
     */
    (url: string, method: string, activityId: string, status?: number, contentLength?: number): void;
}

/** Describes timing for an ajax call made while a scenario was active */
export interface IAjaxCallTiming {
    url: string;

    method: string;

    activityId: string;

    status?: number;

    contentLength?: number;

    timestampStart: number;

    duration: number;
}

/** Describes single scenario */
export interface IScenarioDescriptor {
    /** Returns a value indicating whether the scenario is active */
    isActive(): boolean;

    /**
    * Determines whether or not the scenario is the primary indicator
    * of Time-to-Interactive on the page
    */
    isPageInteractive(): boolean;

    /** Returns scenario area */
    getFeatureArea(): string;

    /** Returns scenario name */
    getName(): string;

    /** Returns scenario duration in ms */
    getDuration(): number;

    /** Get the scenario start timestamp */
    getStartTime(): number;

    /** Returns scenario's correlation id */
    getCorrelationId(): string;

    /** Return split timings */
    getSplitTimings(): ISplitTiming[];

    /** Return ajax call timings */
    getAjaxCalls(): IAjaxCallTiming[];

    /** Return the data associated with the scenario */
    getData(): any;

    /** Ends this scenario
     * @param endTime Optional Scenario End Time. IMPORTANT: Has to be obtained using getTimestamp
     */
    end(endTime?: number): Promise<void>;

    /** Aborts this scenario */
    abort(): void;

    /**
     * Add split timing at current timestamp
     * @param name Name of split timing
     * @param elapsedTime Optional: Deprecated: Store elapsed time in addition to split
     */
    addSplitTiming(name: string, elapsedTime?: number);

    /**
     * Add information about ajax call to scenario

     * @returns Function to end measurement
     */
    addAjaxCallStart(): IEndAjaxCallTiming;

    /**
     * Add additional data to the scenario.
     * @param data Property bag of additional data
     */
    addData(data: any): void;

    /**
     * Logs scenario data to the browser's console
     */
    log(): void;

    /** Returns telemetry data for scenario */
    getTelemetry(): Telemetry.TelemetryEventData;

    /** Get the service through which the telemetry should be emitted.
     * The default is undefined which translates to TFS.
     */
    getServiceInstanceType(): string;

    /** Set the service through which the telemetry should be emitted. */
    setServiceInstanceType(serviceInstanceType: string);
}

class ScenarioDescriptor implements IScenarioDescriptor {

    private _dropPerformanceMarks: boolean;

    private _endTime: number;

    private _endScenarioPromise?: Promise<void>;

    private _splitTimings: ISplitTiming[] = [];
    private _ajaxCallTimings: IAjaxCallTiming[] = [];

    private _data: any;

    constructor(
        private _manager: ScenarioManager,
        private _featureArea: string,
        private _name: string,
        private _correlationId: string,
        private _startTime?: number,
        private _isPageInteractive = false,
        private _serviceInstanceType?: string) {

        if (typeof this._startTime === "undefined") {
            // Default to current timestamp
            this._startTime = getTimestamp();

            // It's only supported when no start time is provided
            this._dropPerformanceMarks = true;

            var markName = this._getIdentifier();
            try {
                Timing.mark(`${markName}-start`);
            } catch (error) {
                Diag.logWarning(`Could not add mark '${markName}': ${VSS.getErrorMessage(error)}`);
            }
        }
    }

    public copyAsNewScenarioDescriptor(featureArea: string, name: string): ScenarioDescriptor {
        const copy = new ScenarioDescriptor(this._manager, featureArea, name, this._correlationId, this._startTime, this._isPageInteractive, this._serviceInstanceType);
        copy._ajaxCallTimings = Utils_Array.clone(this._ajaxCallTimings);
        copy._splitTimings = Utils_Array.clone(this._splitTimings);
        copy._data = {
            ...this._data,
        };

        return copy;
    }

    public getFeatureArea(): string {
        return this._featureArea;
    }

    /** @internal */
    public setFeatureArea(featureArea: string): void {
        this._featureArea = featureArea;
    }

    public getName(): string {
        return this._name;
    }

    /** @internal */
    public setName(name: string): void {
        this._name = name;
    }

    /** @internal */
    public setCorrelationId(correlationId: string): void {
        this._correlationId = correlationId;
    }

    public getDuration(): number {
        if (!this._endTime) {
            return 0;
        }
        else {
            return this._endTime - this._startTime;
        }
    }

    public getEndTime(): number {
        return this._endTime;
    }

    public getStartTime(): number {
        return this._startTime;
    }

    public getCorrelationId(): string {
        return this._correlationId;
    }

    public getData(): any {
        return this._data;
    }

    public getSplitTimings(): ISplitTiming[] {
        return this._splitTimings;
    }

    public getAjaxCalls(): IAjaxCallTiming[] {
        return this._ajaxCallTimings;
    }

    public addAjaxCallStart(): IEndAjaxCallTiming {
        let startTime = getTimestamp();

        return (url: string, method: string, activityId: string, status?: number, contentLength?: number) => {
            this._ajaxCallTimings.push(<IAjaxCallTiming>{
                url: url,
                method: method,
                activityId: activityId,
                status: status,
                contentLength: contentLength,
                timestampStart: startTime - this._startTime,
                duration: getTimestamp() - startTime
            });
        };
    }

    public isActive(): boolean {
        return !this._endScenarioPromise;
    }

    public isPageInteractive(): boolean {
        return this._isPageInteractive;
    }

    public getServiceInstanceType(): string {
        return this._serviceInstanceType;
    }

    public setServiceInstanceType(serviceInstanceType: string) {
        this._serviceInstanceType = serviceInstanceType;
    }

    /** Add split timing to this scenario */
    public addSplitTiming(name: string, elapsedTime?: number) {
        var markName = `${this.getName()}-${name}`
        try {
            Timing.mark(markName);
        } catch (error) {
            Diag.logWarning(`Could not add mark '${markName}': ${VSS.getErrorMessage(error)}`);
        }

        this._splitTimings.push({
            name: name,
            timestamp: getTimestamp() - this._startTime, // Set scenario relative timestamp
            elapsedTime: elapsedTime
        });
    }

    /** Ends the scenario and publishes telemetry data */
    public end(endTime?: number): Promise<void> {

        if (!this._endScenarioPromise) {
            // Wait for the current execution to complete to record the end time.
            this._endScenarioPromise = Promise.resolve().then(() => {

                this._endTime = endTime || getTimestamp();

                const id = this._getIdentifier();

                if (this._dropPerformanceMarks) {
                    try {
                        Timing.mark(`${id}-end`);
                        Timing.measure(id, `${id}-start`, `${id}-end`);
                    } catch (error) {
                        Diag.logWarning(`Could not add mark and measure for scenario end: ${VSS.getErrorMessage(error)}`);
                    }
                }

                const telemetryData: Telemetry.TelemetryEventData = this.getTelemetry();

                // Publish telemetry if the light weight web platform is not loaded.  If it is loaded, it will publish the telemetry.
                if (!(<any>window).LWLS) {
                    Telemetry.publishEvent(telemetryData);
                }

                // Mark scenario as done in manager
                this._manager.endScenarioByDescriptor(this, telemetryData);
            });
        } else {
            // Scenario already ended or being ended, do nothing
            Diag.logWarning(`Attempted to end scenario '${this._getIdentifier()}', but it was already ended.`);
        }

        return this._endScenarioPromise;
    }

    public abort(): void {
        this._manager.endScenarioByDescriptor(this);
    }

    /** Output performance data to console */
    public log(): void {
        Diag.Debug.logInfo(`Performance Summary :: ${this._getIdentifier}`);
        Diag.Debug.logInfo(JSON.stringify(this.getTelemetry(), null, 2));
    }

    /** Add additional data to be sent to the telemetry service */
    public addData(data: any): void {
        this._data = $.extend(this._data, data);
    }

    public getTelemetry(): Telemetry.TelemetryEventData {
        var startTime: number = null;

        try {
            var navigationStart = Timing.getTimingByName("navigationStart");
            startTime = navigationStart ? this._startTime - navigationStart : null;
        } catch (error) {
            Diag.logWarning(`Could not get navigationStart: ${VSS.getErrorMessage(error)}`);
        }
        const diagnostics = Context.getPageContext().diagnostics;

        var properties: IScenarioTelemetryData = {
            featureArea: this._featureArea,
            name: this._name,
            startTime: startTime,
            correlationId: this._correlationId,
            activityId: diagnostics.activityId,
            splitTimings: JSON.stringify(this._splitTimings),
            ajaxCallTimings: "",
            debugMode: Diag.getDebugMode(),
            backgroundTab: document.hidden,
            timeZoneOffset: new Date().getTimezoneOffset(),
            pageNavigateScenario: startTime === 0,
            elapsedTime: this._endTime - this._startTime,
            serviceVersion: diagnostics.serviceVersion
        };

        if (this._data) {
            properties = $.extend(properties, this._data);
        }

        if (this.isPageInteractive()) {
            try {
                // Best-effort attempt to add page interactive properties. Don't throw attempting to
                // report telemetry.
                const interactiveProperties = this._getPageInteractiveTelemetryProperties(properties.pageNavigateScenario);
                properties = $.extend(properties, interactiveProperties);
            }
            catch {
            }
        }

        return new Telemetry.TelemetryEventData(SCENARIO_CI_AREA,
            SCENARIO_CI_FEATURE,
            properties,
            undefined,
            this._endTime - this._startTime,
            this._serviceInstanceType);
    }

    private _getIdentifier(): string {
        return `${this._featureArea}::${this._name}`;
    }

    private _getPageInteractiveTelemetryProperties(pageNavigateScenario: boolean): { [key: string]: any } {
        const resourceStats = getResourceStats();

        const properties = <{ [key: string]: any }>{
            resourceCount: resourceStats.all.total,
            scriptResourceCount: resourceStats.scripts.total,
            scriptResourcesUncached: resourceStats.scripts.total - resourceStats.scripts.cached,
            scriptResourcesDuration: resourceStats.scripts.duration,
            cssResourceCount: resourceStats.styles.total,
            cssResourcesUncached: resourceStats.styles.total - resourceStats.styles.cached,
            cssResourcesDuration: resourceStats.styles.duration,
            ajaxRequests: resourceStats.ajax.total,
            ajaxRequestsDuration: resourceStats.ajax.duration,
            scriptSize: resourceStats.scriptsTotalSize,
            cssSize: resourceStats.cssTotalSize,
            requireStartTime: resourceStats.requireStartTime
        };

        if (pageNavigateScenario) {
            const navigationEvents = getDefaultNavigationEvents(this.isPageInteractive() ? this : null);
            properties["navigationEvents"] = JSON.stringify(navigationEvents.map<IMappedPerformanceEntry>(x => x.perfEntry));
        }

        // best effort attempt to add window size properties
        try {
            properties["screenHeight"] = window.screen.height;
            properties["screenWidth"] = window.screen.width;
            properties["windowHeight"] = window.innerHeight;
            properties["windowWidth"] = window.innerWidth;
            properties["windowOuterHeight"] = window.outerHeight;
            properties["windowOuterWidth"] = window.outerWidth;
        }
        catch {
        }

        if (resourceStats.scripts.total === resourceStats.scripts.cached && resourceStats.styles.total === resourceStats.styles.cached) {
            properties["warmCache"] = true;
        }
        else if (resourceStats.scripts.cached === 0 && resourceStats.styles.cached === 0) {
            properties["coldCache"] = true;
        }

        if (pageNavigateScenario && resourceStats.bundleLoads.length > 0) {
            properties["bundleLoads"] = JSON.stringify(resourceStats.bundleLoads);
        }

        return properties;
    }
}

interface IScenarioTelemetryData {
    /** Name of feature area */
    featureArea: string;

    /** Scenario name */
    name: string;

    /** Start time of scenario, relative to browser's navigationStart event */
    startTime: number;

    /** Current correlation id */
    correlationId: string;

    /** Current activity id */
    activityId: string;

    /** Serialized list of split timings, containing name and timestamp (relative to scenario start time) */
    splitTimings: string;

    /** Serialized list of ajax timings */
    ajaxCallTimings: string;

    /** Indicates if debugMode is enabled for the application. This can be used to filter out measurements that were publihsed when debug mode is enabled */
    debugMode: boolean;

    /** Indicates the timezone offset from UTC (in minutes) for the user. This can be used to do approximate geo analysis on perf data */
    timeZoneOffset: number;

    /** Indicates that the scenario is a web scenario that is measuring time since page-navigate-start. */
    pageNavigateScenario: boolean;

    /**
     * Duration of the scenario.
     */
    elapsedTime: number;

    /**
     * Indicates whether the document was hidden when the scenario ended
     */
    backgroundTab: boolean;

    /**
     * Database version and binaries build number
     */
    serviceVersion: string;
}

class ScenarioManager implements IScenarioManager {
    private static _instance: ScenarioManager;
    public static getInstance(): IScenarioManager {
        if (!ScenarioManager._instance) {
            ScenarioManager._instance = new ScenarioManager();
        }

        return ScenarioManager._instance;
    }

    private _allScenarios: ScenarioDescriptor[] = [];
    private _scenariosMap: IDictionaryStringTo<ScenarioDescriptor[]> = {};

    private static DEFAULT_SCENARIO_AREA = "__default";
    private static DEFAULT_SCENARIO_NAME = "__pageload";
    private static DEFAULT_SCENARIO_INDEX = 0;

    private _activeScenarios: ScenarioDescriptor[] = [];
    private _scenarioEventHandlers: IPerfScenarioEventCallback[] = [];
    private _lastNavigation: number;

    private _pageLoadScenario: ScenarioDescriptor;
    private _preLoadResourceStats: IResourceStats;

    constructor() {

        // If the LWP was loaded and already performed an FPS, then base
        // our last-navigation time off the LWP's last FPS start rather than browser navigation start.
        this._lastNavigation = this.getLastNavigationStartTime();

        // Ensure default page load scenario is started as soon as possible
        this._pageLoadScenario = <ScenarioDescriptor>this.startScenarioFromNavigation(
            ScenarioManager.DEFAULT_SCENARIO_AREA, ScenarioManager.DEFAULT_SCENARIO_NAME, true);

        this._preLoadResourceStats = getResourceStats();
        Events_Services.getService().attachEvent(HubEventNames.XHRNavigateStarted, (sender: any, args: IHubEventArgs) => {
            this.resetPageLoadScenario();
        });
        
        document.body.addEventListener("lwpPerfNavigationReset", () => {
            this.resetPageLoadScenario();
        });
    }

    private getLastNavigationStartTime(): number {

        // Pick up the navigation start-time that the new web platform recorded on the last FPS.
        const lwpStartTime: number = (window as any).lwpLastNavigationStartTime;
        if (lwpStartTime) {
            if (this._lastNavigation) {
                // We have a local start time (e.g. from explicit reset). Use the most-recent
                // time between our last reset and the last FPS.
                return Math.max(lwpStartTime, this._lastNavigation);
            }
            else {
                return lwpStartTime;
            }
        }
        else {
            // LWP not loaded, use our last navigation start time.
            return this._lastNavigation;
        }
    }

    public isPageLoadScenarioFullNavigation(): boolean {
        return !this._lastNavigation;
    }

    public isPageLoadScenarioActive(): boolean {
        return this._pageLoadScenario && this._pageLoadScenario.isActive();
    }

    public recordPageLoadScenario(featureArea: string, name: string, data?: any) {
        this.recordPageLoadScenarioForService(featureArea, name, data, undefined);
    }

    public recordPageLoadScenarioForService(featureArea: string, name: string, data?: any, serviceInstanceType?: string) {
        if (!this._pageLoadScenario) {
            Diag.logWarning("Cannot record page load, scenario wasn't started");
            return;
        }

        if (!this._pageLoadScenario.isActive()) {
            Diag.logWarning("Cannot record page load, scenario already ended");
            return;
        }

        var oldKey = this._getKey(this._pageLoadScenario.getFeatureArea(), this._pageLoadScenario.getName());
        delete this._scenariosMap[oldKey];

        this._pageLoadScenario.setFeatureArea(featureArea);
        this._pageLoadScenario.setName(name);
        this._pageLoadScenario.setCorrelationId(this._getCorrelationId());
        this._pageLoadScenario.setServiceInstanceType(serviceInstanceType);

        // Store scenario under new name
        var newKey = this._getKey(featureArea, name);
        this._scenariosMap[newKey] = (this._scenariosMap[newKey] || []).concat([this._pageLoadScenario]);

        this._pageLoadScenario.addData(data);
        this._pageLoadScenario.end();
    }

    public startScenarioFromNavigation(area: string, name: string, isPageInteractive?: boolean, serviceInstanceType?: string, includePageLoadScenarioData?: boolean): IScenarioDescriptor {
        let startTime = this.getLastNavigationStartTime();
        if (!startTime) {
            startTime = Timing.getTimingByName("navigationStart");
            if (startTime === null) {
                Diag.logWarning(`Tried to start scenario ${area}-${name} from navigationStart but browser does not support this. Falling back to current time.`);
                startTime = getTimestamp();
            }
        }

        return this._startScenario(area, name, startTime, this._getCorrelationId(), isPageInteractive, serviceInstanceType, includePageLoadScenarioData);
    }

    public startScenario(area: string, name: string, startTime?: number, isPageInteractive?: boolean, serviceInstanceType?: string): IScenarioDescriptor {
        return this._startScenario(area, name, startTime, null, isPageInteractive, serviceInstanceType);
    }

    public endScenario(area: string, name: string): Promise<void> {
        var key = this._getKey(area, name);

        var descriptors = this._scenariosMap[key];
        if (!descriptors) {
            return;
        }

        if (descriptors.length > 1) {
            Diag.Debug.fail(`More than one scenario active '${area}'-'${name}', you need to use a scenario descriptor to end`);
            return;
        }

        var descriptor = descriptors[0];
        let endPromise: Promise<void>;
        if (descriptor.isActive()) {
            endPromise = descriptor.end();
        }
        else {
            endPromise = Promise.resolve();
        }

        return endPromise.then(() => this.endScenarioByDescriptor(descriptor));
    }

    public abortScenario(area: string, name: string) {
        var key = this._getKey(area, name);

        var descriptors = this._scenariosMap[key];
        if (!descriptors) {
            return;
        }

        var clonedDescriptors = Utils_Array.clone(descriptors);
        for (let i = 0, len = clonedDescriptors.length; i < len; i++) {
            this.endScenarioByDescriptor(clonedDescriptors[i]);
        }
    }

    public getScenarios(area: string, name: string): IScenarioDescriptor[] {
        return this._scenariosMap[this._getKey(area, name)] || [];
    }

    public getAllCompletedScenarios(): IScenarioDescriptor[] {
        return this._allScenarios.filter(s => !s.isActive());
    }

    public split(splitName: string) {
        for (let activeScenario of this._activeScenarios) {
            activeScenario.addSplitTiming(splitName);
        }
    }

    public addAjaxCallStart(): IEndAjaxCallTiming {
        let finishCallbacks = this._activeScenarios.map(activeScenario => activeScenario.addAjaxCallStart());

        return (url: string, method: string, activityId: string, status?: number, contentLength?: number) => {
            for (let callback of finishCallbacks) {
                callback(url, method, activityId, status, contentLength);
            }
        };
    }

    public endScenarioByDescriptor(descriptor: ScenarioDescriptor, telemetryData?: Telemetry.TelemetryEventData) {
        var key = this._getKey(descriptor.getFeatureArea(), descriptor.getName());

        var descriptors = this._scenariosMap[key];
        if (descriptors) {
            let idx = descriptors.indexOf(descriptor);
            descriptors.splice(idx, 1);

            if (descriptors.length === 0) {
                delete this._scenariosMap[key];
            }

            idx = this._activeScenarios.indexOf(descriptor);
            this._activeScenarios.splice(idx, 1);

            this._fireScenarioCompletedEvent(descriptor, telemetryData);

            // Page interactive scenario ended, fire page-interactive event
            if (descriptor.isPageInteractive()) {
                Events_Page.getService().fire(Events_Page.CommonPageEvents.PageInteractive);
            }
        }
    }

    public resetPageLoadScenario() {
        // Reset page-interactive event so that scenario events continue to work propery on fast hub switching
        Events_Page.getService().reset(Events_Page.CommonPageEvents.PageInteractive);

        this._preLoadResourceStats = getResourceStats();
        this._lastNavigation = getTimestamp();
        this._pageLoadScenario = <ScenarioDescriptor>this.startScenario(
            ScenarioManager.DEFAULT_SCENARIO_AREA, ScenarioManager.DEFAULT_SCENARIO_NAME + ++ScenarioManager.DEFAULT_SCENARIO_INDEX, this._lastNavigation, true);
    }

    private _startScenario(area: string, name: string, startTime?: number, correlationId?: string, isPageInteractive?: boolean, serviceInstanceType?: string, includePageLoadScenarioData?: boolean): IScenarioDescriptor {
        let descriptor: ScenarioDescriptor;
        if (includePageLoadScenarioData) {
            descriptor = this._pageLoadScenario.copyAsNewScenarioDescriptor(area, name);
        } else {
            descriptor = new ScenarioDescriptor(this, area, name, correlationId || this._getCorrelationId(), startTime, isPageInteractive, serviceInstanceType);
        }

        // Store scenario
        const key = this._getKey(area, name);
        if (this._scenariosMap[key]) {
            this._scenariosMap[key].push(descriptor);
        } else {
            this._scenariosMap[key] = [descriptor];
        }

        this._activeScenarios.push(descriptor);
        this._allScenarios.push(descriptor);

        const scenarioEvent = new CustomEvent("scenarioStarted", { detail: { descriptor } });
        document.dispatchEvent(scenarioEvent);

        return descriptor;
    }

    private _fireScenarioCompletedEvent(descriptor: IScenarioDescriptor, telemetryData?: Telemetry.TelemetryEventData) {
        try {
            // Update the telemetry data to have the delta script/css sizes
            if (this._preLoadResourceStats && telemetryData && telemetryData.properties && !telemetryData.properties.pageNavigateScenario) {
                if (this._preLoadResourceStats.scriptsTotalSize >= 0 && telemetryData.properties.scriptSize >= 0) {
                    telemetryData.properties["scriptSizeDiff"] = telemetryData.properties.scriptSize - this._preLoadResourceStats.scriptsTotalSize;
                }

                if (this._preLoadResourceStats.scripts.total >= 0 && telemetryData.properties.scriptResourceCount >= 0) {
                    telemetryData.properties["scriptCountDiff"] = telemetryData.properties.scriptResourceCount - this._preLoadResourceStats.scripts.total;
                }

                if (this._preLoadResourceStats.cssTotalSize >= 0 && telemetryData.properties.cssSize >= 0) {
                    telemetryData.properties["cssSizeDiff"] = telemetryData.properties.cssSize - this._preLoadResourceStats.cssTotalSize;
                }

                if (this._preLoadResourceStats.styles.total >= 0 && telemetryData.properties.cssResourceCount >= 0) {
                    telemetryData.properties["cssCountDiff"] = telemetryData.properties.cssResourceCount - this._preLoadResourceStats.styles.total;
                }
            }

            const scenarioDetail = {
                scenario: descriptor,
                telemetryData: telemetryData
            };

            const scenarioEvent = new CustomEvent("scenarioCompleted", { detail: { scenarioDetail } });
            document.dispatchEvent(scenarioEvent);

            this._scenarioEventHandlers.forEach((handler) => {
                handler.call(this, descriptor);
            });
        }
        catch (error) {
            Diag.logWarning(`Error while updating perf panel: ${VSS.getErrorMessage(error)}`);
        }
    }

    private _getKey(area: string, name: string): string {
        return `${area}-${name}`;
    }

    protected _getCorrelationId(): string {
        var pageContext = Context.getPageContext();
        return pageContext && pageContext.diagnostics && pageContext.diagnostics.sessionId || null;
    }

    public addScenarioCompletedListener(callback: IPerfScenarioEventCallback): void {
        if ($.isFunction(callback)) {
            this._scenarioEventHandlers.push(callback);
        }
    }
}

export interface IPerfScenarioEventCallback {
    (scenario: IScenarioDescriptor): void;
}

export interface IResourceTypeStats {
    total: number;
    cached: number;
    duration: number;
}

export interface IBundleLoadStats {
    downloadStartTime: number;
    downloadDuration: number;
    innerLoad: number;
    innerStartTime: number;
    outerLoad: number;
    outerStartTime: number;
    bundleName: string;
}

export interface IResourceStats {
    scripts: IResourceTypeStats;
    styles: IResourceTypeStats;
    ajax: IResourceTypeStats;
    other: IResourceTypeStats;
    all: IResourceTypeStats;
    bundleLoads: IBundleLoadStats[];

    scriptsTotalSize: number;
    cssTotalSize: number;

    requireStartTime: number;
}

function getResourceTypeStats(resources: PerformanceEntry[]): IResourceTypeStats {
    var stats = <IResourceTypeStats>{};

    stats.total = resources.length;
    stats.cached = 0;
    stats.duration = 0;

    // Set the duration in milliseconds for considering a request to be cached or not. See comments below.
    // We set this to a lower value in internal devfabric environments where local requests are made.
    var cacheThreshold = Context.getPageContext().diagnostics.isDevFabric ? 4 : 25;

    resources.forEach((resource: any) => {
        var duration = resource.duration;
        var cached = resource.duration < cacheThreshold;

        if (resource.requestStart && resource.responseStart && resource.responseEnd) {
            // Only measure the time since the request actually started. This ignores "wait" time which is going
            // to be accounted for in other resource requests
            duration = resource.responseEnd - resource.requestStart;

            // Consider the resource cached if the time to start getting the response is less than a few milliseconds.
            // There is no API for this, but this is a pretty good approximation.
            // Drawbacks: On local dev environments, quick responses can appear to come from the cache even though they weren't.
            // We shouldn't see this in production since we can pretty safely assume any request sent over the wire will take > X ms.
            // We could also report cached content as uncached if it is reported here to take > X ms to load
            cached = (resource.responseStart - resource.requestStart) < cacheThreshold;
        }

        stats.duration += duration;
        if (cached) {
            stats.cached++;
        }
    });

    return stats;
}

/**
 * Get the performance timing entries with the specified name
 *
 * @param name The name of the timing entries to get
 */
export function getResourceTimingEntries(): PerformanceResourceTiming[] {
    return <PerformanceResourceTiming[]>Timing.getEntriesByType("resource") || [];
}

/**
 * Get the performance timing entries with the specified name
 *
 * @param name The name of the timing entries to get
 */
export function getTimingEntriesByName(name: string): PerformanceEntry[] {
    return Timing.getEntriesByName(name) || [];
}

/**
 * Get statistics about the resources currently loaded on the page
 */
export function getResourceStats(): IResourceStats {

    var resources: PerformanceResourceTiming[] = getResourceTimingEntries();
    var scripts: PerformanceResourceTiming[] = resources.filter(r => r.initiatorType === "script");

    var stats = <IResourceStats>{
        scripts: getResourceTypeStats(scripts),
        styles: getResourceTypeStats(resources.filter(r => r.initiatorType === "link")),
        ajax: getResourceTypeStats(resources.filter(r => r.initiatorType === "xmlhttprequest")),
        other: getResourceTypeStats(resources.filter(r => r.initiatorType !== "script" && r.initiatorType !== "link" && r.initiatorType !== "xmlhttprequest")),
        all: getResourceTypeStats(resources),
        scriptsTotalSize: Bundling.getBundledScriptContentSize(),
        cssTotalSize: Bundling.getBundledCssContentSize(),
        bundleLoads: getBundleLoadStats(scripts)
    };

    if (Timing.getEntriesByName("requireStart").length > 0) {
        stats.requireStartTime = Timing.getEntriesByName("requireStart")[0].startTime;
    }

    return stats;
}

function getBundleLoadStats(scripts: PerformanceResourceTiming[]): IBundleLoadStats[] {
    var bundleLoadStats: IBundleLoadStats[] = [];
    var loadOuterBundles = getBundleLoadMeasureNames("startLoadBundleOuter", "endLoadBundleOuter", "loadBundleOuter");
    var loadInnerBundles = getBundleLoadMeasureNames("startLoadBundleInner", "endLoadBundleInner", "loadBundleInner");

    for (var i = 0; i < loadOuterBundles.length; i++) {
        var loadOuterBundle = loadOuterBundles[i];
        var bundleName = loadOuterBundle.substring(loadOuterBundle.indexOf("-") + 1);
        var loadInnerBundle = "loadBundleInner-" + bundleName;
        var innerDuration = 0;
        var innerStartTime = 0;
        if (Timing.getEntriesByName(loadOuterBundle).length > 0) {
            var outerEntry = Timing.getEntriesByName(loadOuterBundle)[0];
            var outerDuration = outerEntry.duration;
            var outerStartTime = outerEntry.startTime;
            var downloadDuration = 0;
            var downloadStartTime = 0;

            if (loadInnerBundles.filter(entry => entry === loadInnerBundle).length > 0) {
                if (Timing.getEntriesByName(loadOuterBundle).length > 0) {
                    const [innerEntry] = Timing.getEntriesByName(loadInnerBundle);
                    if (innerEntry) {
                        innerDuration = innerEntry.duration;
                        innerStartTime = innerEntry.startTime;
                    }
                }
            }

            //See if the bundleName exists once on one of the script Performance Timings
            var downloadTiming = scripts.filter(r => r.name.indexOf(bundleName) >= 0);
            if (downloadTiming.length === 1) {
                downloadStartTime = downloadTiming[0].startTime;
                downloadDuration = downloadTiming[0].duration;
            }

            bundleLoadStats.push({
                bundleName: bundleName,
                downloadStartTime: downloadStartTime,
                downloadDuration: downloadDuration,
                innerLoad: innerDuration,
                innerStartTime: innerStartTime,
                outerLoad: outerDuration,
                outerStartTime: outerStartTime
            });
        }
    }

    return bundleLoadStats;
}

function getBundleLoadMeasureNames(startMarkPrefix: string, endMarkPrefix: string, measurePrefix: string): string[] {
    var loadBundleMeasures: string[] = [];
    var startMarks = Timing.getEntriesByType("mark").filter((entry => entry.name.indexOf(startMarkPrefix) === 0));
    var endMarks = Timing.getEntriesByType("mark").filter((entry => entry.name.indexOf(endMarkPrefix) === 0));

    for (var i = 0; i < startMarks.length; i++) {
        var startMark = startMarks[i].name;
        var bundleName = startMark.substring(startMark.indexOf("-") + 1);
        var endMark = endMarkPrefix + "-" + bundleName;
        if (endMarks.filter(entry => entry.name === endMark).length > 0) {
            var bundleLoad = measurePrefix + "-" + bundleName;
            if (Timing.getEntriesByName(bundleLoad).length === 0) {
                Timing.measure(bundleLoad, startMark, endMark);
            }
            loadBundleMeasures.push(bundleLoad);
        }
    }

    return loadBundleMeasures
}

/** Map native PerformanceEntry objects for serialization */
export interface IMappedPerformanceEntry {
    name: string;
    startTime: number;
    duration: number;
}

export interface INavigationEvent {
    name: string;
    startEvent: string;
    endEvent: string;
    perfEntry?: IMappedPerformanceEntry;
    isAggregate?: boolean;
}

/** Return performance events to add to each scenario from the performance API. Note: Will add measurements if not already added */
export function getDefaultNavigationEvents(scenario?: IScenarioDescriptor): INavigationEvent[] {
    var events: INavigationEvent[] = [];

    try {
        var expectedDefaultEvents: INavigationEvent[] = [
            { name: "PLT", startEvent: "navigationStart", endEvent: "loadEventEnd", isAggregate: true },
            { name: "Redirect", startEvent: "redirectStart", endEvent: "redirectEnd" },
            { name: "Unload", startEvent: "unloadEventStart", endEvent: "unloadEventEnd" },
            { name: "Fetch", startEvent: "fetchStart", endEvent: "domainLookupStart" },
            { name: "DNS", startEvent: "domainLookupStart", endEvent: "domainLookupEnd" },
            { name: "TCP", startEvent: "connectStart", endEvent: "connectEnd" },
            { name: "SSL", startEvent: "secureConnectionStart", endEvent: "connectEnd" },
            //Use connectEnd instead of requestStart for request/server time timings, to work around IE11 issue with requestStart
            { name: "Request", startEvent: "connectEnd", endEvent: "responseStart" },
            { name: "Server Time", startEvent: "connectEnd", endEvent: "responseEnd", isAggregate: true },
            { name: "Response", startEvent: "responseStart", endEvent: "responseEnd" },
            { name: "DOMInteractive", startEvent: "domInteractive", endEvent: "domComplete" },
            { name: "DOMProcessing", startEvent: "domLoading", endEvent: "domComplete" },
            { name: "onLoad", startEvent: "loadEventStart", endEvent: "loadEventEnd" },
            { name: "Initial Require Statement", startEvent: "requireStart", endEvent: "requireEnd", isAggregate: true },
            { name: "Network Time", startEvent: "domainLookupStart", endEvent: "connectEnd" },
            { name: "PreRequest", startEvent: "navigationStart", endEvent: "connectEnd", isAggregate: true },
            { name: "RequestResponse", startEvent: "connectEnd", endEvent: "responseEnd", isAggregate: true },
            { name: "FetchResources", startEvent: "responseEnd", endEvent: "requireStart", isAggregate: true }
        ];

        for (var expectedDefaultEvent of expectedDefaultEvents) {

            let entries: PerformanceEntry[] = Timing.getEntriesByName(expectedDefaultEvent.name);
            if (entries.length === 0) {
                // The event has not been measured yet. Make sure both the start and end events have been triggered.
                // For some marks, this is not a timing, it's an entry, so check for presence in both
                if ((Timing.getTimingByName(expectedDefaultEvent.startEvent) == null && Timing.getEntriesByName(expectedDefaultEvent.startEvent).length === 0) ||
                    (Timing.getTimingByName(expectedDefaultEvent.endEvent) == null && Timing.getEntriesByName(expectedDefaultEvent.endEvent).length === 0)) {
                    // At least one of the requested timings has not been recorded yet, skip this event.
                    continue;
                }

                Timing.measure(expectedDefaultEvent.name, expectedDefaultEvent.startEvent, expectedDefaultEvent.endEvent);
                entries = Timing.getEntriesByName(expectedDefaultEvent.name);
            }

            // Create deep copies of object to work around Chrome bug where PerformanceEntry stopped having a serializer
            // (serializer is not required by W3C spec).
            var newEntry = entries.map(ev => <IMappedPerformanceEntry>{
                name: ev.name,
                startTime: ev.startTime,
                duration: ev.duration
            })[0];
            expectedDefaultEvent.perfEntry = newEntry;
            events.push(expectedDefaultEvent);
        }
    } catch (error) {
        Diag.logWarning(`Failed to record navigation events: ${VSS.getErrorMessage(error)}`);
    }


    if (scenario) {
        const pageInteractiveEvent: INavigationEvent = {
            name: "TTI",
            perfEntry: {
                name: "TTI",
                duration: scenario.getDuration(),
                startTime: 0
            },
            startEvent: "navigationStart",
            endEvent: scenario.getName(),
            isAggregate: true
        };

        if (pageInteractiveEvent) {
            events.push(pageInteractiveEvent);
        }
    }

    return events;
}

export function getTimestamp(): number {
    // Note: Use Date.now for now for easier comparison with timing events.
    return Date.now();
}

/**
 * Returns navigation start timestamp, or 0 if browser doesn't support it
 */
export function getNavigationStartTimestamp(): number {
    var time = Timing.getTimingByName("navigationStart");

    if (time === null) {
        time = 0;
    }

    return time;
}

var _jsonIslandDataProviderTiming: IDictionaryStringTo<number>;

// Register handler for VSSF AJAX calls
let __ongoingRequests: IDictionaryNumberTo<{
    url: string;
    method: string;
    end: IEndAjaxCallTiming;
}> = {};

addGlobalListener({
    beforeRequest: (requestId: number, requestUrl: string, ajaxOptions: JQueryAjaxSettings, vssRequestOptions?: IVssAjaxOptions) => {
        __ongoingRequests[requestId] = {
            url: requestUrl,
            method: ajaxOptions && ajaxOptions.type || "",
            end: getScenarioManager().addAjaxCallStart()
        };
    },

    responseReceived: (requestId: number, data: any, textStatus: string, jqXHR: JQueryXHR) => {
        if (requestId in __ongoingRequests) {
            // Extract activityId and content length from response headers
            const activityId = jqXHR && jqXHR.getResponseHeader && jqXHR.getResponseHeader("ActivityId") || "";
            const contentLength = jqXHR && jqXHR.getResponseHeader && jqXHR.getResponseHeader("Content-Length") || 0;

            const ongoingRequest = __ongoingRequests[requestId];
            ongoingRequest.end(ongoingRequest.url, ongoingRequest.method, activityId, jqXHR && jqXHR.status || -1, Number(contentLength));

            // Clear request
            delete __ongoingRequests[requestId];
        }
    },
    postResponseCallback: (requestId: number, data: any, textStatus: string, jqXHR: JQueryXHR) => {
        // Do nothing here
    }
});

/**
 * Decorator to time the decorated method and add it to a performance timeline trace
 *
 * Example:
 * ```ts
 * class Foo {
 *      @timeMethod
 *      public someMethod() {
 *           // Do something
 *      }
 * }
 * ```
 * @param name Optional name of the method, if not given
 */
// tslint:disable-next-line:ban-types
export const timeMethod = (target: Object, methodName: string, descriptor: TypedPropertyDescriptor<any>) => timeMethodInternal(`${target.constructor.name}.${methodName}`, descriptor);

/**
 * Decorator to time the decorated method and add it to a performance timeline trace
 *
 * Example:
 * ```ts
 * class Foo {
 *      @timeMethodWithName("custom name")
 *      public someMethod2() {
 *           // Do something
 *      }
 * }
 * ```
 * @param name Optional name of the method, if not given
 */
// tslint:disable-next-line:ban-types
export const timeMethodWithName = (name: string) => (target: Object, methodName: string, descriptor: TypedPropertyDescriptor<any>) => timeMethodInternal(name, descriptor);

function timeMethodInternal(methodName: string, descriptor: TypedPropertyDescriptor<any>) {
    return {
        // tslint:disable-next-line:object-literal-shorthand
        value: function (...args: any[]) {
            Diag.timeStamp(`${methodName}`, Diag.StampEvent.Enter);
            // tslint:disable-next-line:no-invalid-this
            const result = descriptor.value.apply(this, args);
            Diag.timeStamp(`${methodName}`, Diag.StampEvent.Leave);
            return result;
        }
    };
}
