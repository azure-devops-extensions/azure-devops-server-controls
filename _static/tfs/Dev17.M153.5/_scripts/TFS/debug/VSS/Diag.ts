
import Context = require("VSS/Context");
import VSS = require("VSS/VSS");

var listeners: IResultCallback[];
var tracePointCollectors: Function[] = [];
export var perfCollector: PerfTracePointCollector;
export var logLevel: number;
var displayCallers = false;
var debug = false;
var throwOnAssertFailures: boolean = typeof (<any>window)._globalThrowOnAssertFailures === "undefined" ? false : (<any>window)._globalThrowOnAssertFailures;
var profileStartTracePoint: string;
var profileEndTracePoint: string;
var profileId = 0;
var profileInProgress = false;

var pageContext = Context.getPageContext();
if (pageContext && pageContext.diagnostics) {
    debug = !!pageContext.diagnostics.debugMode;
    profileStartTracePoint = pageContext.diagnostics.tracePointProfileStart;
    profileEndTracePoint = pageContext.diagnostics.tracePointProfileEnd;
}

export function getDebugMode(): boolean {
    return debug;
}

export function setDebugMode(debugModeEnabled: boolean) {
    debug = debugModeEnabled;
}

export enum StampEvent {
    SinglePoint = 0,
    Enter = 1,
    Leave = 2
}

export function timeStamp(label: string, event: StampEvent) {
    if (debug) {
        var eventName: string,
            chromeConsole: any = console;

        switch (event) {

            case StampEvent.Enter:
                eventName = "Enter";
                if (console.time) {
                    console.time(label);
                }
                break;

            case StampEvent.Leave:
                eventName = "Leave";
                if (console.timeEnd) {
                    console.timeEnd(label);
                }

                if (window.performance && window.performance.measure) {
                    window.performance.measure(label, label + " Enter");
                }
                
                break;

            default: // single point
                eventName = "SinglePoint";
                console.log("%s: [%s]", label, Date.now());
                break;
        }

        label = label + " " + eventName;

        if (window.performance && performance.mark) { // drop mark for IE tools
            window.performance.mark(label);
        }        

        if (chromeConsole.timeStamp) { // drop mark for chrome tools
            chromeConsole.timeStamp(label);
        }
    }
}

export class Measurement {
    /**
     * Begin new measurement
     * 
     * @param label Name of the measurement
     * @param callback Callback to end measurement
     */
    public static start(label: string, callback: (measurement: Measurement) => void) {

        var m = new Measurement(label);

        callback(m);
    }

    constructor(private label: string) {
        timeStamp(label, StampEvent.Enter);
    }

    /**
     * Ends this measurement
     */
    public finish() {

        timeStamp(this.label, StampEvent.Leave);
    }
}

export enum LogVerbosity {
    Off = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Verbose = 4,
}

logLevel = LogVerbosity.Warning;
if (pageContext && pageContext.diagnostics && typeof pageContext.diagnostics.clientLogLevel === "number") {
    logLevel = pageContext.diagnostics.clientLogLevel;
}

/**
 * Get a message indicating that the param is required.
 */
function getMessage(paramName: string, type: string): string {
    return paramName + " is required and needs to be a " + type;
}

function _formatTime(date: Date): string {
    var padWithZeroes = function (input: number, size: number): string {
        var text = "" + input;
        while (text.length < size) {
            text = "0" + text;
        }
        return text;
    };

    return padWithZeroes(date.getHours(), 2) +
            ":" + padWithZeroes(date.getMinutes(), 2) +
            ":" + padWithZeroes(date.getSeconds(), 2) +
            "." + padWithZeroes(date.getMilliseconds(), 3);
}

/**
 * Log a message to the debug output windows and all other trace listeners
 * 
 * @param level A log verbosity value from VSS.Diag.logVerbosity
 * @param message Message to send to all trace listeners
 */
export function log(level: number, message: string) {
    var i: number;
    var l: number;
    if (level <= logLevel) {
        if (debug) {
            if (window.console && window.console.log) {
                if (level === LogVerbosity.Error && window.console.error) {
                    window.console.error(message);
                }
                else if (level === LogVerbosity.Warning && window.console.warn) {
                    window.console.warn(message);
                }
                else {
                    window.console.log(message);
                }
            }
        }
        if (listeners) {
            for (i = 0, l = listeners.length; i < l; i++) {
                listeners[i](message, level);
            }
        }
    }
}

export function logError(message: string) {
    log(LogVerbosity.Error, message);
}

export function logWarning(message: string) {
    log(LogVerbosity.Warning, message);
}

export function logInfo(message: string) {
    log(LogVerbosity.Info, message);
}

export function logVerbose(message: string) {
    log(LogVerbosity.Verbose, message);
}

/**
 * Add a listener to listen for logged messages
 * 
 * @param callback A callback method that gets called whenever something is logged
 */
export function listen(callback: IResultCallback) {
    if (!listeners) {
        listeners = [];
    }
    listeners.push(callback);
}

/**
 * Remove a log message listener
 * 
 * @param callback Listener to remove
 */
export function unlisten(callback: IResultCallback) {
    var i: number;
    var l: number;
    if (listeners) {
        for (i = 0, l = listeners.length; i < l; i++) {
            if (listeners[i] === callback) {
                listeners.splice(i--, 1);
            }
        }
    }
}


/**
 * Updates the start/end trace points used when creating a profile.
 * 
 * @param startTracePointName The trace point to begin the profile.
 * @param endTracePointName The trace point that will ned the profile.
 */
export function profile(startTracePointName: string, endTracePointName: string) {

    if (profileInProgress) {
        log(LogVerbosity.Error, "There is a profile already in progress: " + profileId + ": " + profileStartTracePoint + "->" + profileEndTracePoint);
        return;
    }
    profileStartTracePoint = startTracePointName;
    profileEndTracePoint = endTracePointName;
    document.cookie = "TFS-TRACEPOINT-START=" + startTracePointName + ";";
    document.cookie = "TFS-TRACEPOINT-END=" + endTracePointName + ";";
}

/**
 * Explicitly end the profile.
 */
export function profileEnd() {

    if (profileInProgress) {
        profileInProgress = false;
        console.profileEnd();
    }
}

/**
 * Logs a trace point which can be consumed by a trace point collector for performance analysis.
 * 
 * @param tracePointName Name of the trace point
 * @param data (Optional) Data corresponding to the event that occurred.
 */
export function logTracePoint(tracePointName: string, data?: any) {

    if (profileStartTracePoint != null && profileEndTracePoint !== null) {
        if (profileStartTracePoint === tracePointName)
        {
            console.profile(profileId + ": " + profileStartTracePoint + "->" + profileEndTracePoint);
            profileId++;
            profileInProgress = true;
        }
        else if (profileEndTracePoint === tracePointName)
        {
            console.profileEnd();
            profileInProgress = false;
        }
    }

    for (var i = 0; i < tracePointCollectors.length; i++) {
        tracePointCollectors[i].call(this, tracePointName, data);

        if (LogVerbosity.Verbose <= logLevel) {
            log(LogVerbosity.Verbose, "TRACEPOINT [" + _formatTime(new Date()) + "]: " + tracePointName);
        }
    }
}

/**
 * Add a collector to handle trace points
 * 
 * @param collector Method(tracePointName, data) called when trace points are logged.
 */
export function addTracePointCollector(collector: Function) {
    for (var i = 0; i < tracePointCollectors.length; i++) {
        if (collector === tracePointCollectors[i]) {
            return;
        }
    }
    tracePointCollectors.push(collector);
}

/**
 * Remove a trace point collector
 * 
 * @param collector Collector to remove
 */
export function removeTracePointCollector(collector: Function) {
    for (var i = 0; i < tracePointCollectors.length; i++) {
        if (collector === tracePointCollectors[i]) {
            tracePointCollectors.splice(i, 1);
        }
    }
}

/**
 * Sets the minimum level at which logged statements get captured and reported to the browser console.
 * 
 * @param level Level which gets logged to the console
 */
export function setLogLevel(level: number) {
    logLevel = level;
}

export interface ITracePoint {
    name: string;
    time: number;
    data: any;
}

export class PerfTracePointCollector {

    private _tracePoints: ITracePoint[];
    private _overallCounts: IDictionaryStringTo<number>;
    private _activeCounts: IDictionaryStringTo<number>;
    private _moduleInitTime: number;
    private _lastResetTime: number;
    private _lastResetIndex: number;

    constructor () {
        this._moduleInitTime = new Date().getTime();
        this._tracePoints = [];
        this._overallCounts = {};
        this._activeCounts = {};
        this._lastResetTime = 0;
        this._lastResetIndex = 0;
    }

    public register() {
        var that = this;
        addTracePointCollector(function (tracePointName: string, tracePointData: any) {
            that._handleTracePoint(tracePointName, tracePointData);
        });
    }

    public getOverallCount(tracePointName: string): number {
        var count = this._overallCounts[tracePointName];
        return (count) ? count : 0;
    }

    public getActiveCount(tracePointName: string): number {
        var count = this._activeCounts[tracePointName];
        return (count) ? count : 0;
    }

    public getLastTracePoint(tracePointName: string): ITracePoint {
        var i: number;
        for (i = this._tracePoints.length - 1; i >= 0; i--) {
            if (this._tracePoints[i].name === tracePointName) {
                return this._tracePoints[i];
            }
        }
        return null;
    }

    public getLastTracePointTime(tracePointName: string): number {
        var tracePoint = this.getLastTracePoint(tracePointName);
        return (tracePoint) ? tracePoint.time : 0;
    }

    public resetActiveCount(tracePointName: string) {
        this._activeCounts[tracePointName] = 0;
    }

    public resetActiveCounts() {
        this._activeCounts = {};
        this._lastResetTime = new Date().getTime();
        this._lastResetIndex = this._tracePoints.length;
    }

    public getModuleInitTime(): number {
        return this._moduleInitTime;
    }

    public getTracePoints(activeOnly: boolean): ITracePoint[] {
        if (activeOnly === true) {
            return this._tracePoints.slice(this._lastResetIndex);
        }
        else {
            return this._tracePoints;
        }
    }

    public getTracePointCountData(tracePointNames: string[]): string {
        var i: number;
        var l: number;
        var tpName: string;
        var result = "";
        for (i = 0, l = tracePointNames.length; i < l; i++) {
            tpName = tracePointNames[i];
            result += this.getActiveCount(tpName) + ";" + this.getOverallCount(tpName) + "\t";
        }
        return result;
    }

    public dumpTracePoints(activeOnly: boolean) {
        var data: string;
        var points: ITracePoint[];
        var point: ITracePoint;
        var i: number;
        var l: number;
        var tpData: any;

        data = "ModuleInitTime\t" + this._moduleInitTime + "\nLastReset\t" + Math.max(0, this._lastResetTime - this._moduleInitTime);

        points = this.getTracePoints(activeOnly);
        l = points.length;
        for (i = 0; i < l; i++) {
            point = points[i];
            data += "\n" + (point.time - this._moduleInitTime) + "\t" + point.name;
            tpData = point.data;
            if (tpData) {
                if (tpData instanceof Error) {
                    tpData = tpData.message;
                    if (tpData.stackTrace) {
                        tpData += " @" + tpData.stackTrace;
                    }
                }
                if ($.isArray(tpData)) {
                    tpData = tpData.join(";");
                }
                data += ("\t" + tpData).replace(/[\n\r]/g, " ");
            }
        }

        return data;
    }

    private _updateCount(dictionary: IDictionaryStringTo<number>, eventName: string) {
        var count = dictionary[eventName];
        if (count) {
            dictionary[eventName] = count + 1;
        }
        else {
            dictionary[eventName] = 1;
        }
    }

    private _handleTracePoint(tracePointName: string, tracePointData: any) {
        var tracePointEntry: ITracePoint = {
            time: new Date().getTime(),
            name: tracePointName,
            data: tracePointData
        };
        this._tracePoints.push(tracePointEntry);

        this._updateCount(this._overallCounts, tracePointName);
        this._updateCount(this._activeCounts, tracePointName);
    }
}

function initializePerfCollector() {

    if (pageContext && pageContext.diagnostics && pageContext.diagnostics.tracePointCollectionEnabled) {
        perfCollector = new PerfTracePointCollector();
        perfCollector.register();
    }
}

initializePerfCollector();

export function measurePerformance(action: Function, message: string, logLevel: LogVerbosity = LogVerbosity.Verbose) {
    var start = new Date();
    action();
    var end = new Date();
    log(logLevel, message + ": " + (end.getTime() - start.getTime()) + "ms");
}

/** 
* Any function calls to any members of this class will be stripped out in minified version, see WebPlatform.targets file AjaxMin task call with -debug switch.
* NOTE: You must use Diag or VSS_Diag as alias for the import statment for it to work. 
* e.g. import Diag = require("VSS/Diag")
* This will be useful as follows
* 1) We will not have overhead of extra function calls in release version specially in the functions that are called many-many times (e.g. event handlers/processors)
* 2) The size of minified version will not be bloated with the size of message strings and function names
* 3) While debugging will still have flexibility to see the logs depending on the Log level
*/
export class Debug {

    private static _noDebugPrompts = false;

    /**
     * Sets whether or not to display callers in the stack on assert failures.
     * 
     * @param showCallers If true, display callers in the stack of assert failures.
     */
    public static setDisplayCallers(showCallers: boolean) {
        displayCallers = showCallers;
    }

    /**
     * Displays a message in the debugger's output window and breaks into the debugger
     * 
     * @param message Message to display in the debugger's output window
     */
    public static fail(message: string) {
        if (debug) {
            if (throwOnAssertFailures) {
                throw new Error("Assertion failure: " + message);
            }

            logError("Assertion failure: '" + message + "'.");
            if (!Debug._noDebugPrompts) {
                if (confirm("Assertion failure: '" + message + "'. Would you like to break into the debugger?")) {
                    debugger;
                }
                else {
                    Debug._noDebugPrompts = true;
                }
            }
        }
    }

    /**
     * Checks for a condition, and if the condition is false, displays a message and prompts the user to break into the debuggeription
     * 
     * @param condition true to continue to execute code; false to display message and break into the debugger
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assert(condition: boolean, message?: string) {
        if (debug && !condition) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is an object and not null.
     * 
     * @param value Value to ensure is an object.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsObject(value: any, message?: string) {
        if (debug && (value === null || typeof (value) !== "object")) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is an object and not null.
     * 
     * @param value Value to ensure is an object.
     * @param paramName Name of the parameter that this value is associated with.
     * @param optional If true then the assert will accept falsy values
     */
    public static assertParamIsObject(value: any, paramName: string, optional?: boolean) {
        if (debug) {
            var ok = (optional && (value === null || value === undefined)) || // handle optional case
                (value !== null && typeof (value) === "object");       // non-optional case (remembering that typeof(null)==="object")

            if (!ok) {
                Debug.fail(getMessage(paramName, "object"));
            }
        }
    }

    /**
     * Assert that the value is an array.
     * 
     * @param value Value to ensure is an array.
     * @param message (Optional) The message to display. The default is an empty string 
     * @param requireNotEmpty (Optional) If true the array will be checked to ensure it is not empty.
     */
    public static assertIsArray(value: any, message?: string, requireNotEmpty?: boolean) {
        if (debug && (!$.isArray(value) || (requireNotEmpty && value.length === 0))) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is an array.
     * 
     * @param value Value to ensure is an array.
     * @param paramName (Optional) Name of the parameter that this value is associated with.
     * @param requireNotEmpty (Optional) If true the array will be checked to ensure it is not empty.
     */
    public static assertParamIsArray(value: any, paramName?: string, requireNotEmpty?: boolean) {
        if (debug && (!$.isArray(value) || (requireNotEmpty && value.length === 0))) {
            Debug.fail(getMessage(paramName, "array" + requireNotEmpty ? " (non-empty)" : ""));
        }
    }

    /**
     * Assert that the value is a boolean.
     * 
     * @param value Value to ensure is a boolean.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsBool(value: boolean, message?: string) {
        if (debug && (typeof (value) !== "boolean")) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is a boolean.
     * 
     * @param value Value to ensure is a boolean.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsBool(value: boolean, paramName: string) {
        if (debug && (typeof (value) !== "boolean")) {
            Debug.fail(getMessage(paramName, "boolean"));
        }
    }

    /**
     * Assert that the value is a number.
     * 
     * @param value Value to ensure is a number.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsNumber(value: number, message?: string) {
        if (debug && ((typeof (value) !== "number") || isNaN(value))) {
            this.fail(message);
        }
    }

    /**
     * Assert that the value is a number.
     * 
     * @param value Value to ensure is a number.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsNumber(value: number, paramName: string) {
        if (debug && ((typeof (value) !== "number") || isNaN(value))) {
            Debug.fail(getMessage(paramName, "number"));
        }
    }

    /**
     * Assert that the value is an integer.
     * 
     * @param value Value to ensure is an integer.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsInteger(value: number, message?: string) {
        if (debug && ((typeof (value) !== "number") || isNaN(value) || Math.round(value) !== value)) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is an integer.
     * 
     * @param value Value to ensure is an integer.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsInteger(value: number, paramName: string) {
        if (debug && ((typeof (value) !== "number") || isNaN(value) || Math.round(value) !== value)) {
            Debug.fail(getMessage(paramName, "integer"));
        }
    }

    /**
     * Assert that the value is a string.
     * 
     * @param value Value to ensure is a string.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsString(value: string, message?: string) {
        if (debug && (typeof (value) !== "string")) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is a string.
     * 
     * @param value Value to ensure is a string.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsString(value: string, paramName: string) {
        if (debug && (typeof (value) !== "string")) {
            Debug.fail(getMessage(paramName, "string"));
        }
    }

    /**
     * Assert that the value is a string and not empty.
     * 
     * @param value Value to ensure is a string and not empty.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsStringNotEmpty(value: string, message?: string) {
        if (debug && (typeof (value) !== "string" || value === "")) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is a string and not empty.
     * 
     * @param value Value to ensure is a string and not empty.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsStringNotEmpty(value: string, paramName: string) {
        if (debug && (typeof (value) !== "string" || value === "")) {
            Debug.fail(getMessage(paramName, "non-empty string"));
        }
    }

    /**
     * Assert that the value is a function.
     * 
     * @param value Value to ensure is a function.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsFunction(value: any, message?: string) {
        if (debug && (typeof (value) !== "function")) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is a function.
     * 
     * @param value Value to ensure is a function.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsFunction(value: any, paramName: string) {
        if (debug && typeof (value) !== "function") {
            Debug.fail(getMessage(paramName, "function"));
        }
    }

    /**
     * Assert that the value is a date.
     * 
     * @param value Value to ensure is a date.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsDate(value: any, message?: string) {
        if (debug && !(value instanceof Date)) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is a date.
     * 
     * @param value Value to ensure is a date.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsDate(value: any, paramName: string) {
        if (debug && !(value instanceof Date)) {
            Debug.fail(getMessage(paramName, "date"));
        }
    }

    /**
     * Assert that the value is not null or undefined.
     * 
     * @param value Value to ensure is not null or undefined.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsNotNull(value: any, message?: string) {
        if (debug && (value === null || value === undefined)) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is not null or undefined.
     * 
     * @param value Value to ensure is not null or undefined.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsNotNull(value: any, paramName: string) {
        if (debug && value === null) {
            Debug.fail(getMessage(paramName, "not null and not undefined"));
        }
    }

    /**
     * Assert that the value is not undefined.
     * 
     * @param value Value to ensure is not undefined.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsNotUndefined(value: any, message?: string) {
        if (debug && value === undefined) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is undefined.
     * 
     * @param value Value to ensure is not undefined.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsNotUndefined(value: any, paramName: string) {
        if (debug && value === undefined) {
            Debug.fail(getMessage(paramName, "not undefined"));
        }
    }

    /**
     * Assert that the value is a jQuery object.
     * 
     * @param value Value to ensure is a jQuery object.
     * @param message (Optional) The message to display. The default is an empty string 
     */
    public static assertIsJQueryObject(value: any, message?: string) {
        if (debug && (value === null || (typeof (value) !== "object") || typeof (value.jquery) !== "string")) {
            Debug.fail(message);
        }
    }

    /**
     * Assert that the value is a jQuery object.
     * 
     * @param value Value to ensure is a jQuery object.
     * @param paramName Name of the parameter that this value is associated with.
     */
    public static assertParamIsJQueryObject(value: any, paramName: string) {

        //typeof null is "object" unfortunately

        if (debug && (value === null || (typeof (value) !== "object") || typeof (value.jquery) !== "string")) {
            Debug.fail(getMessage(paramName, "jQuery object"));
        }
    }

    /**
     * Assert that the value is an instance of the expected type.
     * 
     * @param value The value to test for the correct type
     * @param type Either the constructor function for a type,
     * or a string matching the return value of the typeof operator. This specified the type
     * to test for.
     * @param message The messge to display on Debug.failure.
     * @param optional Flag to determine whether null and undefined are accepted as values.
     */
    public static assertIsType(value: any, type: any, message: string, optional?: boolean) {
        var ok: boolean;

        if (debug) {
            if (value === null || (value === undefined && type !== 'undefined')) { // handle optional case
                ok = optional;
            }
            else {
                if (typeof (type) === 'string') {
                    ok = (typeof (value) === type);
                }
                else {
                    ok = (value instanceof type);
                }
            }

            if (!ok) {
                Debug.fail(message);
            }
        }
    }

    /**
     * Gets the display name for a type.
     * 
     * @param type The string value (from the typeof operator) or a constructor function.
     * @return 
     */
    static getTypeName(type: any): string {

        /*jslint regexp: false*/

        if (!type) {
            Debug.fail("An assert to check a value's type was handed an invalid type to check for.");
        }

        // Handle values intended for checking built-in types (e.g. 'string', 'number', 'boolean')
        if (typeof (type) === 'string') {
            return type;
        }

        // expect that now we have a Function
        Debug.assertIsFunction(type, "Expected to have a constructor function passed when checking a type");
        return (type.toString().match(/^\s*function\s*([\w]*)\(/))[1] ||  // handle constructor functions like 'function Foo(....)'
            ("Unnamed type: (" + type.toString() + ")");          // handle constructor functions like 'Foo = function (....)'
    }

    /**
     * Assert that the parameter is an instance of the expected type.
     * 
     * @param value The value to test for the correct type
     * @param type Either the constructor function for a type,
     * or a string matching the return value of the typeof operator. This specified the type
     * to test for.
     * @param paramName The name of the parameter.
     * @param optional Flag to determine whether null and undefined are accepted as values.
     */
    public static assertParamIsType(value: any, type: any, paramName: string, optional?: boolean) {
        if (debug) {
            Debug.assertIsType(value, type, getMessage(paramName, Debug.getTypeName(type)), optional);
        }
    }

    public static logInfo(message: string) {
        log(LogVerbosity.Info, message);
    }

    public static logVerbose(message: string) {
        log(LogVerbosity.Verbose, message);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.Diag", exports);
