
import Context = require("VSS/Context");
import Diag = require("VSS/Diag");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

/**
 * Wrap a function to ensure that a specific value of 'this' is passed to the function when it is invoked (regardless of the caller).
 * 
 * @param instance The object that will be set to the value of 'this' when the function is invoked.
 * @param method The function to wrap.
 * @param data Arguments that will be appended to the arguments passed when the delegate is invoked.
 * @return The wrapper function
 */
export function delegate(instance: any, method: Function, data?: any): IArgsFunctionR<any> {

    return function () {
        if (typeof (data) === "undefined") {
            return method.apply(instance, arguments);
        }
        else {
            var args = <any[]>Array.prototype.slice.call(arguments, 0);

            if (data instanceof Array) {
                args = args.concat(data);
            }
            else {
                args.push(data);
            }

            return method.apply(instance, args);
        }
    };
}

/**
 *     Curries a function with a set of arguments and returns the resulting function.
 *     When eventually evaluated, the returned function will call the original function
 *     with the current arguments prepended to the list of arguments.
 * 
 *     var add3, result;
 *     function add(x, y) {
 *         return x + y;
 *     }
 *     add3 = add.curry(3);
 *     results = add3(4); // result === 7
 * 
 *     See http://en.wikipedia.org/wiki/Curry_function
 * 
 * @param fn 
 * @param args 
 */
export function curry(fn: Function, ...args: any[]): IArgsFunctionR<any> {

    args = Array.prototype.slice.call(arguments, 1);

    return function () {
        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
    };
}

export class DelayedFunction {

    private _interval: number;
    private _func: IArgsFunctionR<any>;
    private _timeoutHandle: number;
    private _cooldownHandle: number;
    private _name: string;
    private _invokeOnCooldownComplete: boolean = false;

    /**
     * Creates an object that can be used to delay-execute the specified method.
     * 
     * @param instance Context to use when calling the provided function
     * @param ms Delay in milliseconds to wait before executing the Function
     * @param name Name to use when tracing this delayed function
     * @param method Method to execute
     * @param data Arguments to pass to the method
     */
    constructor(instance: any, ms: number, name: string, method: Function, data?: any[]) {
        this._interval = ms;
        this._name = name;
        this._func = delegate(instance, method, data);
    }

    /**
     * Starts the timer (if not already started) which will invoke the method once expired.
     */
    public start() {
        var that = this;
        if (!this._timeoutHandle) {
            Diag.logTracePoint("Core.DelayedFunction.pending", this._name);
            this._timeoutHandle = window.setTimeout(function () {
                delete that._timeoutHandle;
                try {
                    that._invoke.call(that);
                }
                finally {
                    Diag.logTracePoint("Core.DelayedFunction.complete", [that._name, "complete"]);
                }
            }, this._interval);
        }
    }

    /**
     * Resets the timer (cancel, then re-start) which will invoke the method once expired.
     */
    public reset() {
        this.cancel();
        Diag.logTracePoint("Core.DelayedFunction.reset", [this._name, "reset"]);
        this.start();
    }

    /**
     * Cancels any pending operation (stops the timer).
     */
    public cancel(clearCooldown: boolean = false) {
        if (this._timeoutHandle) {
            window.clearTimeout(this._timeoutHandle);
            delete this._timeoutHandle;
            Diag.logTracePoint("Core.DelayedFunction.complete", [this._name, "canceled"]);
        }
        if (clearCooldown) {
            this.clearCooldown();
        }

        // After cancel is called, we don't expect the function to run again.
        this._invokeOnCooldownComplete = false;
    }

    /**
     * Clears the current cooldown
     * @param cancelScheduledInvocation (boolean) true to ignore any invocation that is
     *        scheduled to occur after the cooldown is finished.
     */
    public clearCooldown(cancelScheduledInvocation: boolean = true) {
        if (this._cooldownHandle) {
            window.clearTimeout(this._cooldownHandle);
            delete this._cooldownHandle;
        }
        if (!cancelScheduledInvocation && this.invokeOnCooldownComplete) {
            this.invokeNow();
        }
    }

    /**
     * Resets the cooldown back to [delay] ms.
     */
    public extendCooldown() {
        this._startCooldown();
    }

    /**
     * Invokes the method immediately (canceling an existing timer).
     */
    public invokeNow() {
        this.cancel();
        this._invoke();
    }

    /**
     * Modifies the length of the delay timer (for subsequent starts).
     * 
     * @param ms Delay in milliseconds to wait before executing the Function
     */
    public setDelay(ms: number) {
        this._interval = ms;
    }

    /**
     * Modify the method being executed.
     * 
     * @param instance Context to use when calling the provided function
     * @param method Method to execute
     * @param data (Optional) arguments to pass to the method
     */
    public setMethod(instance: any, method: Function, data?: any[]) {
        this._func = delegate(instance, method, data);
    }

    /**
     * Is the timer currently running (operation in progress)
     * 
     * @return True if this operation is already in progress
     */
    public isPending(): boolean {
        return this._timeoutHandle ? true : false;
    }

    /**
     * Is the delayed function in a "cooldown" state (operation
     * completed recently)
     *
     * @return True if it has been less than [delay] ms since
     * the last invocation of the function.
     */
    public isCoolingDown(): boolean {
        return this._cooldownHandle ? true : false;
    }

    /**
     * Schedule this delayed function to execute when the cooldown is complete.
     */
    public invokeOnCooldownComplete() {
        this._invokeOnCooldownComplete = true;
    }

    /**
     * Invokes the delegate and starts (or restars) the cooldown period.
     */
    private _invoke() {
        this._func();
        this._startCooldown();
    }

    private _startCooldown() {
        if (this._cooldownHandle) {
            window.clearTimeout(this._cooldownHandle);
        }
        this._cooldownHandle = window.setTimeout(() => {
            delete this._cooldownHandle;
            if (this._invokeOnCooldownComplete) {
                this.invokeNow();
                this._invokeOnCooldownComplete = false;
            }
        }, this._interval);
    }
}

/**
 * Executes the provided function after the specified amount of time
 * 
 * @param instance Context to use when calling the provided function
 * @param ms Delay in milliseconds to wait before executing the Function
 * @param method Method to execute
 * @param data Arguments to pass to the method
 * @return The delayed function that was started
 */
export function delay(instance: any, ms: number, method: Function, data?: any[]): DelayedFunction {

    var delayedFunc = new DelayedFunction(instance, ms, null, method, data);
    delayedFunc.start();
    return delayedFunc;
}

/**
 * Options to control the behavior of the Throttled Delegate.
 * Note, these are flags, so multiple options can be OR'd together.
 */
export enum ThrottledDelegateOptions {
    /**
     * Never call the delegate until after the elapsed time has passed since the
     * most recent call to the delegate.
     */
    Default = 0,

    /**
     * This throttled delegate will be invoked immediately on the first call, then
     * at most every n milliseconds thereafter
     */
    Immediate = 1,

    /**
     * If Immediate is set, this determines if a call that is made during the cooldown
     * period will be ignored or queued up to be executed when the cooldown is done.
     */
    QueueNext = 2,

    /**
     * If set, subsequent calls to the delegate will result in a simple noop during
     * the cooldown period (as opposed to resetting the timer).
     * If not set, each call to the delegate will reset the timer. This means the function
     * might never get executed as long as the delegate continues to be called fast enough.
     */
    NeverResetTimer = 4
}

/**
 * Creates a delegate that is delayed for the specified interval when invoked.
 * Subsequent calls to the returned delegate reset the timer. Using the options
 * parameter, callers can determine if the invocation happens on the rising
 * edge (immediately when the delegate is called) or on the falling edge (Default).
 * 
 * @param instance Context to use when calling the provided function
 * @param ms Delay in milliseconds to wait before executing the Function
 * @param method Method to execute
 * @param data Arguments to pass to the method
 * @param options Specify the behavior of when the delegate gets invoked
 * @return The delayed delegate function.
 */
export function throttledDelegate(instance: any, ms: number, method: Function, data?: any[], options: ThrottledDelegateOptions = ThrottledDelegateOptions.Default): IArgsFunctionR<any> {
    const delayedFunc = new DelayedFunction(instance, ms, "throttledDelegate", method, data);
    const neverResetTimer = (options & ThrottledDelegateOptions.NeverResetTimer) > 0;
    const immediate = (options & ThrottledDelegateOptions.Immediate) > 0;
    const queueNext = (options & ThrottledDelegateOptions.QueueNext) > 0;
    if (!immediate) {
        if (neverResetTimer) {
            return delegate(delayedFunc, () => {
                if (!delayedFunc.isPending()) {
                    delayedFunc.reset();
                }
            });
        }
        else {
            return delegate(delayedFunc, delayedFunc.reset);
        }
    }
    else {
        return delegate(delayedFunc, () => {
            if (delayedFunc.isCoolingDown()) {
                if (queueNext) {
                    if (!neverResetTimer) {
                        delayedFunc.extendCooldown();
                    }
                    delayedFunc.invokeOnCooldownComplete();
                }
                else {
                    if (!neverResetTimer) {
                        delayedFunc.extendCooldown();
                    }
                }
            }
            else {
                delayedFunc.invokeNow();
            }
        });
    }
}

/**
 * Splits a string that contains a list of comma-separated (signed) integer values into an array
 * 
 * @param stringRepresentation String representation of comma-separated integer array
 * @return Array of parsed integers
 */
export function parseIntArray(stringRepresentation: string): number[] {

    Diag.Debug.assertIsStringNotEmpty(stringRepresentation, "stringRepresentation");

    var stringRepresentationSanitized = stringRepresentation.replace(/[^\d,\.-]/g, '');
    var numbers = stringRepresentationSanitized.split(',');

    var result: number[] = [];

    for (var i = 0; i < numbers.length; ++i) {
        var n = parseInt(numbers[i], 10);

        if (!isNaN(n)) {
            result.push(n);
        }
    }

    return result;
}

export class Cancelable {

    private _callbacks: Function[];

    public canceled: boolean;
    public context: any;

    /**
     * Manage cancellable operations.
     * 
     * @param context The context for the cancellable operation.
     * The context is passed to actions when they are called.
     */
    constructor(context: any) {
        this.context = context;
        this._callbacks = [];
    }

    /**
     * Perform the action if not cancelled.
     * 
     * @param action The action to call if the current operation has not been cancelled.
     */
    public perform(action: Function) {
        if (!this.canceled && $.isFunction(action)) {
            action.call(this.context);
        }
    }

    /**
     * Wrap an action to make it cancellable.
     * 
     * @param action The action to wrap.
     * @return The cancellable action.
     */
    public wrap(action: Function): Function {
        var that = this;
        return function () {
            if (!that.canceled && $.isFunction(action)) {
                return action.apply(this, Array.prototype.slice.call(arguments, 0));
            }
        };
    }

    /**
     * Cancel the operation.
     */
    public cancel() {
        var that = this;
        this.canceled = true;

        $.each(this._callbacks, function (i: number, callback: Function) {
            callback.call(that.context);
        });
    }

    /**
     * Register a callback to be called when the object is cancelled.
     * 
     * @param callback The callback function.
     */
    public register(callback: Function) {
        if ($.isFunction(callback)) {
            this._callbacks.push(callback);

            if (this.canceled) {
                callback.call(this.context);
            }
        }
    }
}

export class DisposalManager implements IDisposable {
    /**
     * List of disposables.
     */
    private _disposables: IDisposable[];

    constructor() {
        // Initialize the list
        this._disposables = [];
    }

    /**
     * Add the specified disposable to the list.
     *
     * @param disposable Disposable to be added to the list.
     */
    public addDisposable<TDisposable extends IDisposable>(disposable: TDisposable): TDisposable {
        // Add to the list
        this._disposables.push(disposable);

        // Return disposable for further usage
        return disposable;
    }

    /**
     * Disposes all disposables.
     */
    public dispose() {
        if (this._disposables) {
            while (this._disposables.length > 0) {
                this._disposables.splice(0, 1)[0].dispose();
            }
        }
    }
}

/**
* Deserialize an "MSJSON" formatted string into the corresponding JSON object. This converts a
* string like "\\/Date(1448375104308)\\/" into the corresponding Date object.
*
* Returns null if not a valid JSON string.
*
* @param data The JSON string to deserialize
* @param secure Unused parameter
*/
export function tryParseMSJSON(data: any, secure?: boolean): any {
    try {
        return parseMSJSON(data, secure);
    } catch (e) {
        return null;
    }
}

/**
* Deserialize an "MSJSON" formatted string into the corresponding JSON object. This converts a
* string like "\\/Date(1448375104308)\\/" into the corresponding Date object.
*
* Throws if not a valid JSON string.
*
* @param data The JSON string to deserialize
* @param secure Unused parameter
*/
export function parseMSJSON(data: any, secure?: boolean): any {
    return LegacyMicrosoftAjaxSerialization.deserialize(data);
}

/**
* Serialize a JSON object into "MSJSON" format which has date objects serialized in the
* format: "\\/Date(1448375104308)\\/"
*
* @param object The JSON object to serialize
*/
export function stringifyMSJSON(object: any): string {
    return LegacyMicrosoftAjaxSerialization.serialize(object);
}

//
// Start Legacy Microsoft.Ajax serialization methods
// 
module LegacyMicrosoftAjaxSerialization {

    var _charsToEscapeRegExs = [];
    var _charsToEscape = [];
    var _dateRegEx = new RegExp('(^|[^\\\\])\\"\\\\/Date\\((-?[0-9]+)(?:[a-zA-Z]|(?:\\+|-)[0-9]{4})?\\)\\\\/\\"', 'g');
    var _escapeChars = {};
    var _escapeRegEx = new RegExp('["\\\\\\x00-\\x1F]', 'i');
    var _escapeRegExGlobal = new RegExp('["\\\\\\x00-\\x1F]', 'g');
    var _jsonRegEx = new RegExp('[^,:{}\\[\\]0-9.\\-+Eaeflnr-u \\n\\r\\t]', 'g');
    var _jsonStringRegEx = new RegExp('"(\\\\.|[^"\\\\])*"', 'g');
    var _initialized = false;

    function _ensureSerializationInitialized() {
        if (!_initialized) {
            _initialized = true;

            var replaceChars = ['\\u0000', '\\u0001', '\\u0002', '\\u0003', '\\u0004', '\\u0005', '\\u0006', '\\u0007',
                '\\b', '\\t', '\\n', '\\u000b', '\\f', '\\r', '\\u000e', '\\u000f', '\\u0010', '\\u0011',
                '\\u0012', '\\u0013', '\\u0014', '\\u0015', '\\u0016', '\\u0017', '\\u0018', '\\u0019',
                '\\u001a', '\\u001b', '\\u001c', '\\u001d', '\\u001e', '\\u001f'];
            _charsToEscape[0] = '\\';
            _charsToEscapeRegExs['\\'] = new RegExp('\\\\', 'g');
            _escapeChars['\\'] = '\\\\';
            _charsToEscape[1] = '"';
            _charsToEscapeRegExs['"'] = new RegExp('"', 'g');
            _escapeChars['"'] = '\\"';
            for (var i = 0; i < 32; i++) {
                var c = String.fromCharCode(i);
                _charsToEscape[i + 2] = c;
                _charsToEscapeRegExs[c] = new RegExp(c, 'g');
                _escapeChars[c] = replaceChars[i];
            }
        }
    }
    function _serializeBooleanWithBuilder(object: any, stringBuilder: Utils_String.StringBuilder) {
        stringBuilder.append(object.toString());
    }
    function _serializeNumberWithBuilder(object: any, stringBuilder: Utils_String.StringBuilder) {
        if (isFinite(object)) {
            stringBuilder.append(String(object));
        }
        else {
            throw new Error("Cannot serialize non finite numbers.");
        }
    }
    function _serializeStringWithBuilder(stringValue: string, stringBuilder: Utils_String.StringBuilder) {
        stringBuilder.append('"');
        if (_escapeRegEx.test(stringValue)) {
            if (stringValue.length < 128) {
                stringValue = stringValue.replace(_escapeRegExGlobal,
                    function (x) { return _escapeChars[x]; });
            }
            else {
                for (var i = 0; i < 34; i++) {
                    var c = _charsToEscape[i];
                    if (stringValue.indexOf(c) !== -1) {
                        stringValue = stringValue.replace(_charsToEscapeRegExs[c], _escapeChars[c]);
                    }
                }
            }
        }
        stringBuilder.append(stringValue);
        stringBuilder.append('"');
    }
    function _serializeWithBuilder(object: any, stringBuilder: Utils_String.StringBuilder, prevObjects?: any[]) {
        var i;
        switch (typeof object) {
            case 'object':
                if (object) {
                    if (prevObjects) {
                        for (var j = 0; j < prevObjects.length; j++) {
                            if (prevObjects[j] === object) {
                                throw new Error("Cannot serialize object with cyclic reference within child properties.");
                            }
                        }
                    }
                    else {
                        prevObjects = new Array();
                    }
                    try {
                        prevObjects.push(object);

                        var objectType = typeof object;
                        if (objectType === "number") {
                            _serializeNumberWithBuilder(object, stringBuilder);
                        }
                        else if (objectType === "boolean") {
                            _serializeBooleanWithBuilder(object, stringBuilder);
                        }
                        else if (objectType === "string") {
                            _serializeStringWithBuilder(object, stringBuilder);
                        }
                        else if (object instanceof Array) {
                            stringBuilder.append('[');

                            for (i = 0; i < object.length; ++i) {
                                if (i > 0) {
                                    stringBuilder.append(',');
                                }
                                _serializeWithBuilder(object[i], stringBuilder, prevObjects);
                            }
                            stringBuilder.append(']');
                        }
                        else {
                            if (object instanceof Date) {
                                stringBuilder.append('"\\/Date(');
                                stringBuilder.append(object.getTime());
                                stringBuilder.append(')\\/"');
                                break;
                            }
                            var properties = [];
                            var propertyCount = 0;
                            for (var name in object) {
                                if (Utils_String.startsWith(name, '$')) {
                                    continue;
                                }
                                properties[propertyCount++] = name;
                            }
                            stringBuilder.append('{');
                            var needComma = false;

                            for (i = 0; i < propertyCount; i++) {
                                var value = object[properties[i]];
                                if (typeof value !== 'undefined' && typeof value !== 'function') {
                                    if (needComma) {
                                        stringBuilder.append(',');
                                    }
                                    else {
                                        needComma = true;
                                    }

                                    _serializeWithBuilder(properties[i], stringBuilder, prevObjects);
                                    stringBuilder.append(':');
                                    _serializeWithBuilder(value, stringBuilder, prevObjects);

                                }
                            }
                            stringBuilder.append('}');
                        }
                    }
                    finally {
                        prevObjects.pop();
                    }
                }
                else {
                    stringBuilder.append('null');
                }
                break;
            case 'number':
                _serializeNumberWithBuilder(object, stringBuilder);
                break;
            case 'string':
                _serializeStringWithBuilder(object, stringBuilder);
                break;
            case 'boolean':
                _serializeBooleanWithBuilder(object, stringBuilder);
                break;
            default:
                stringBuilder.append('null');
                break;
        }
    }
    export function serialize(object) {
        _ensureSerializationInitialized();

        var stringBuilder = new Utils_String.StringBuilder();
        _serializeWithBuilder(object, stringBuilder);
        return stringBuilder.toString();
    }

    export function deserialize(data: string): any {

        var replacedData = data.replace(_dateRegEx, "$1{\"__msjson_date__\":$2 }");
        var serializedData = JSON.parse(replacedData);

        if (replacedData !== data) {
            replaceMsJsonDates(serializedData);
        }

        return serializedData;
    }

    function replaceMsJsonDates(object: any, parentObject?: any, parentObjectKey?: string) {

        if (typeof object.__msjson_date__ === "number" && parentObject) {
            parentObject[parentObjectKey] = new Date(object.__msjson_date__);
            return;
        }

        for (var key in object) {
            var value = object[key];
            if (value !== null && typeof value === "object") {
                replaceMsJsonDates(object[key], object, key);
            }
        }
    }
}

/**
 * Parse data from a JSON Island into an object
 * 
 * @param $context The context in which to search for the JSON data
 * @param selectionFilter An optional selector that will filter the selection of JSON islands found.
 * @param remove .
 * @return 
 */
export function parseJsonIsland($context: JQuery, selectionFilter?: string, remove?: boolean): any {

    Diag.Debug.assertParamIsJQueryObject($context, "$context");
    if (selectionFilter !== undefined && selectionFilter !== null) {
        Diag.Debug.assertParamIsStringNotEmpty(selectionFilter, "selectionFilter");
    }
    if (remove !== undefined) {
        Diag.Debug.assertParamIsBool(remove, "remove");
    }

    // Getting the JSON string serialized by the server according to the current host
    var contextElement: JQuery;
    var json: string;
    var data: any = null;

    contextElement = $context.find('script[type="application/json"]');
    if (selectionFilter) {
        contextElement = contextElement.filter(selectionFilter);
    }

    if (contextElement.length > 0) {
        json = contextElement.eq(0).html();

        if (json) {
            data = parseMSJSON(json, false);
        }

        if (remove) {
            contextElement.eq(0).remove();
        }
    }

    return data;
}

/**
 * Converts the specified value to a display string.
 * 
 * @param value The value to convert.
 * @param format The value to convert.
 */
export function convertValueToDisplayString(value: any, format?: string): string {

    if (value !== null && typeof value !== "undefined") {
        if (typeof value === "string") {
            return value;
        }
        else if (value instanceof Date) {
            return Utils_Date.localeFormat(value, format || "g");
        }
        else if (typeof value === "number") {
            if (format) {
                return Utils_Date.localeFormat(new Date(value), format);
            }
            else {
                return Utils_Number.toDecimalLocaleString(value);
            }
        }
        else if (typeof value === "boolean") {
            return value ? "True" : "False";
        }
        else {
            return value.toString();
        }
    }

    return "";
}

export function domToXml(xmlNode: any): string {
    try {
        var xmlSer: XMLSerializer = new (<any>window).XMLSerializer();
        return (xmlSer.serializeToString(xmlNode));
    }
    catch (exp) {
        return null;
    }
}

export function parseXml(xml: string): any {
    try {
        var domParser = new window.DOMParser();
        return domParser.parseFromString(xml, 'text/xml');
    }
    catch (ex) {
        return null;
    }
}

/**
 * Compare two objects value are deep equal, order matters in array comparision.
 * 
 * @param first The first object
 * @param second The second object
 * @return True if two objects are deepEqual, otherwise false.
 */
export function equals(first: any, second: any): boolean {
    if (isPrimitive(first) && isPrimitive(second)) {
        return first === second;
    }
    else if (isPrimitive(first) || isPrimitive(second)) {
        return false;
    }
    else if ((first instanceof Array) && (second instanceof Array)) {
        if (first.length !== second.length) {
            return false;
        }
        for (var i = 0, len = first.length; i < len; i++) {
            if (!equals(first[i], second[i])) {
                return false;
            }
        }
        return true;
    }
    else {
        var firstKeys = Object.keys(first);
        var secondKeys = Object.keys(second);

        if (firstKeys.length !== secondKeys.length) {
            return false;
        }
        else {
            for (var prop in first) {
                if (!second.hasOwnProperty(prop)) {
                    return false;
                }
                else if (!equals(first[prop], second[prop])) {
                    return false;
                }
            }
            return true;
        }
    }
}

/**
 * Executes the provided function after the specified amount of time
 * @param functionDelegate Function to execute
 * @param delay Delay in milliseconds to wait before executing the Function
 * @param maxAttempt The max number of attemp should try, if not specified, it will continus polling
 * @param firstDelay Delay in milliseconds to wait before executing the Function for the first time (default 0)
 * @param shouldStopDelegate Callback to determine whether to stop the poll or not
 * @param reachMaxAttemptCallback Callback when max attempted is reached
 */
export function poll(functionDelegate: (sucessCallback: IResultCallback, errorCallback?: IErrorCallback) => void,
    delay: number,
    maxAttempt: number,
    firstDelay?: number,
    shouldStopDelegate?: (result: any) => boolean,
    reachMaxAttemptCallback?: () => void) {

    if (maxAttempt <= 0) {
        if ($.isFunction(reachMaxAttemptCallback)) {
            reachMaxAttemptCallback();
        }
        return;
    }

    if (typeof firstDelay === "undefined" || firstDelay < 0) {
        firstDelay = 0;
    }

    var invoke = () => {
        var time = $.now();
        functionDelegate((result: any) => {
            if ($.isFunction(shouldStopDelegate) && shouldStopDelegate(result)) {
                return;
            }
            poll(functionDelegate, delay, maxAttempt - 1, Math.max(0, delay - $.now() + time), shouldStopDelegate, reachMaxAttemptCallback);
        }, () => {
            poll(functionDelegate, delay, maxAttempt - 1, Math.max(0, delay - $.now() + time), shouldStopDelegate, reachMaxAttemptCallback);
        });
    }

    if (firstDelay === 0) {
        // If the first delay is 0, then invoke the callback now.
        // This is done because setTimeout may not trigger immediately if the ui thread is busy.
        invoke();
    }
    else {
        window.setTimeout(invoke, firstDelay);
    }
}

/**
 * Set a cookie
 * @param name Name of cookie
 * @param value Value of cookie
 * @param path Path for which to set cookie, defaults to '/'
 * @param expires Optional, data in GMTString format, indicating the time of expiration
 * @param maxAge Optional, maximum age of the cookie in seconds
 */
export function setCookie(name: string, value: string, path: string = "/", expires?: string, maxAge?: number) {
    const attributes: string[] = [
        `${name}=${value}`,
        `path=${path}`
    ];

    if (expires) {
        attributes.push(`expires=${expires}`);
    }

    if (maxAge) {
        attributes.push(`max-age=${maxAge}`);
    }

    // Set secure flag if current connection is https    
    if (window.location.protocol.indexOf("https") !== -1) {
        attributes.push("secure");
    }

    document.cookie = attributes.join(";");
}

export function deleteCookie(cookieName: string) {
    // Set secure flag if current connection is https
    var secureFlag = "";
    if (window.location.protocol.indexOf("https") !== -1) {
        secureFlag = ";secure";
    }
    document.cookie = cookieName + "=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT" + secureFlag;
}

function isPrimitive(value: any) {
    return (value == null || typeof (value) === "number" || typeof (value) === "boolean" || typeof (value) === "string");
}

export var documentSelection: any = (<any>document).selection;

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.Core", exports);
