/// <reference types="jquery" />

import * as Q from "q";
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");

export type KeyType = string | number;

export interface IDictionaryOption {
    throwOnKeyMissing?: boolean;
}

/**
 * Where possible please use IDictionaryNumberTo or IDictionaryStringTo instead of this
 */
export class Dictionary<T> {
    
    private _items: any;
    private _throwOnKeyMissing: boolean;
    private _count: number;

    /**
     * A 'typed' dictionary that mirrors the .NET IDictionary interface.
     * 
     * @param options Options for controlling the dictionary:
     *    allowNullKey: if true, allows null values for the key. Default: false
     *    throwOnKeyMissing: if true, will throw when retrieving a value who's key does not exist in the dictionary. Default false.
     */
    constructor(options?: IDictionaryOption) {
        Diag.Debug.assertParamIsType(options, "object", "options", true);

        this._items = {};
        this._count = 0;

        // set options
        if (options && options.throwOnKeyMissing === true) {
            this._throwOnKeyMissing = true;
        }
    }

    public count(): number {
        return this._count;
    }

    /**
     * @param value 
     */
    public item(key: KeyType, value?: T): T {
        this._checkKey(key);
        key = key.toString();
        if (arguments.length > 1) {
            this._set(key, value);
        }
        else {
            if (this._throwOnKeyMissing && !this._items.hasOwnProperty(key)) {
                throw new Error("KeyNotFound: " + key);
            }
            return this._items[key];
        }
    }

    public keys(): string[] {
        const items = this._items;
        const keys = [];

        for (const key in items) {
            if (items.hasOwnProperty(key)) {
                keys.push(key);
            } else {
                keys.push(null);
            }
        }

        return keys;
    }

    public values(): T[] {
        let items = this._items, values = [];
        for (let key in items) {
            values.push(items[key]);
        }
        return values;
    }

    public add(key: KeyType, value: T): void {
        this._checkKey(key);
        key = key.toString();
        if (this._items.hasOwnProperty(key)) {
            throw new Error("An element with the same key already exists in the dictionary");
        }
        this._set(key, value);
    }

    public clear(): void {
        this._items = {};
        this._count = 0;
    }

    public containsKey(key: KeyType): boolean {
        this._checkKey(key);
        key = key.toString();
        return this._items.hasOwnProperty(key);
    }

    public get(key: KeyType): T {
        return this.item(key);
    }

    public remove(key: KeyType): void {
        this._checkKey(key);
        key = key.toString();
        if (this._items.hasOwnProperty(key)) {
            this._count -= 1;
        }
        delete this._items[key];
    }

    public set(key: KeyType, value: T): void {
        this.item(key, value);
    }

    public tryGetValue(key: KeyType, out: { value: T }): boolean {
        if (this.containsKey(key)) {
            out.value = this.get(key);
            return true;
        }
        else {
            out.value = undefined;
            return false;
        }
    }

    private _checkKey(key: KeyType): void {
        // production-time check
        if ((key === null || key === undefined)) {
            throw new Error("Null key not allowed");
        }
    }

    private _set(key: KeyType, value: T): void {
        if (!this._items.hasOwnProperty(key)) {
            this._count += 1;
        }
        this._items[key] = value;
    }
}

/**
 * @param resultArray 
 */
function unpack(values: any[], resultArray?: any[]): any[] {

    var i: number;
    var j: number;
    var prev: number;
    var value: any;
    var delta: number;
    var repeat = false;
    var result: any[] = resultArray || [];

    prev = 0;
    value = 0;
    delta = 0;

    for (i = 0; i < values.length; i++) {
        value = values[i];
        if (value === 'r') {
            if (!repeat) {
                repeat = true;
                continue;
            }
            else {
                value = 2;
                repeat = false;
            }
        }
        else if (!repeat) {
            delta = value;
            value = 1;
        }
        else {
            repeat = false;
        }

        for (j = 0; j < value; j++) {
            prev += delta;
            result[result.length] = prev;
        }
    }

    return result;
}

export function unpackIntegerArray(array: number[]): number[] {
    if (array.length === 0) {
        return array;
    }

    return unpack(array);
}

export function keys(obj: IDictionaryStringTo<any>, all?: boolean): string[] {
    var result: string[] = [];

    if (all) {
        for (var key in obj) {
            result.push(key);
        }
    }
    else {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                result.push(key);
            }
        }
    }

    return result;
}

export function getCookie(cookieName: string): string {
    if (document.cookie.length > 0) {
        var cookieStart = document.cookie.indexOf(cookieName + "=");
        if (cookieStart !== -1) {
            cookieStart = cookieStart + cookieName.length + 1;
            var cookieEnd = document.cookie.indexOf(";", cookieStart);
            if (cookieEnd === -1) {
                cookieEnd = document.cookie.length;
            }

            return decodeURIComponent(document.cookie.substring(cookieStart, cookieEnd));
        }
    }

    return "";
}

export function setCookie(cookieName: string, cookieValue: string, path: string = "/") {
    // Set secure flag if current connection is https
    var secureFlag = "";
    if (window.location.protocol.indexOf("https") !== -1) {
        secureFlag = ";secure";
    }

    document.cookie = cookieName + "=" + encodeURIComponent(cookieValue) + ";path=" + path + secureFlag;
}



export class OperationQueue {

    private _operationQueue: IFunctionPR<Function, void>[];
    private _isProcessingOperation: boolean;

    /**
     * Allows for sequential processing of asyncronous operations.
     */
    constructor() {
        this._operationQueue = [];
    }

    /**
     * Queues the provided operation.  Operations are processed sequentially.
     * 
     * @param operation 
     * Function for the operation to be performed.  The function should have the following signature:
     *         function operation(completedCallback)
     * 
     * The completed callback needs to be invoked when the operation is completed in order to allow subsequent
     * operations to be performed.
     * 
     */
    public queueOperation(operation: IFunctionPR<Function, void>) {

        Diag.Debug.assertParamIsFunction(operation, "operation");

        // Add the operation to the queue.
        this._operationQueue.push(operation);

        // Attempt to start the operation.
        this._processQueue();
    }

    /**
     * Begins processing the next operation in the queue if there is not one already in progress.
     */
    private _processQueue() {

        var that = this;

        // If there is not a current operation being processed and there are operations
        // in the queue, process them.
        if (!this._isProcessingOperation && this._operationQueue.length > 0) {
            // Indicate that an operation is being processed.
            this._isProcessingOperation = true;

            // Invoke the next operation on a delay to avoid blocking the caller on the operation and avoid
            // the potential of having the operations stack grow large.
            Utils_Core.delay(this, 0, function () {
                var operation: IFunctionPR<Function, void>;
                var hasCompleted = false;

                /**
                 * Invoked when the operation has completed to kick off the next operation in the queue.
                 */
                function completedCallback() {

                    // If the complete callback has already been invoked, assert.
                    Diag.Debug.assert(!hasCompleted, "The operation has already invoked the completed callback.");

                    if (!hasCompleted) {
                        hasCompleted = true;

                        // Start the next operation in the queue.
                        that._isProcessingOperation = false;
                        that._processQueue();
                    }
                }

                // Remove the operation from the queue and execute it.
                operation = that._operationQueue.shift();
                operation(completedCallback);
            });
        }
    }
}

export module UserAgentUtils {

    export function isWindowsClient(): boolean {
        return getUserAgent().toLowerCase().indexOf("windows nt") >= 0;
    }

    export function getUserAgent(): string {
        return window.navigator.userAgent;
    }
}

export class TypeFactory {

    private _ctors: IDictionaryStringTo<Function>;

    /**
     * An add-in object used to extend a constructor function's behavior to allow it to
     * act as a factory for registered sub-classes. Instances can be created by passing the appropriate
     * registration key and constructor arguments.
     * 
     * Usage:
     *     function Foo() {... }
     *     Foo.extend(new TypeFactory());
     * 
     *     function Bar(arg1, arg2) {...}
     *     Bar.inherit(Foo, { });
     *     Foo.registerConstructor("bar", Bar);
     * 
     *     var bar = Foo.createInstance("bar", [arg1value, arg2value]);
     */
    constructor() {
    }

    /**
     * Register a constructor with the factory
     * 
     * @param key The key for the constructor that is use later when creating instances.
     * @param ctor The constructor being registered.
     */
    public registerConstructor(key: string, ctor: Function) {
        Diag.Debug.assertParamIsType(key, "string", "key");
        Diag.Debug.assertParamIsType(ctor, "function", "ctor");

        if (!this._ctors) {
            this._ctors = {};
        }

        this._ctors[key] = ctor;
    }

    /**
     * Get the constructor registered with the specified key.
     * 
     * @param key The key to use when looking up the registered constructor.
     * @return Returns the constructor registered with the specified key, or undefined.
     */
    public getConstructor(key: string): Function {

        Diag.Debug.assertParamIsType(key, "string", "key");

        return this._ctors && this._ctors[key];
    }

    /**
     * Create an instance of a registered type.
     * 
     * @param key The key for the registered constructor function.
     * @param args Arguments to pass to the constructor function.
     * @return An instance of the type registered with the key.
     */
    public createInstance(key: string, args?: any[]): any {
        Diag.Debug.assertParamIsType(key, "string", "key");
        Diag.Debug.assertParamIsType(args, Array, "args", true);

        var Constructor = this.getConstructor(key);
        var instance: any;

        function F() { }

        if (Constructor) {
            F.prototype = Constructor.prototype;

            instance = new F();
            Constructor.apply(instance, args);
        }
        else {
            Diag.Debug.fail("The constructor wasn't registered: " + key);
        }

        Diag.Debug.assertIsType(instance, Constructor, "Expected the new object to be an instance of " + Constructor);
        return instance;
    }
}

export module AnchorLinkUtils {
    
    /**
    * Finds an anchor according to HTML 5 Specifications - Navigating to a fragment identifier
    * Relevant parts:
    *  If there is an element in the DOM that has an ID exactly equal to decoded fragid, then the 
    *    first such element in tree order is the indicated part of the document; stop the 
    *    algorithm here.
    *  No decoded fragid: If there is an a element in the DOM that has a name attribute whose 
    *    value is exactly equal to fragid (not decoded fragid), then the first such element in 
    *    tree order is the indicated part of the document; stop the algorithm here.
    *  If fragid is an ASCII case-insensitive match for the string top, then the indicated part of
    *    the document is the top of the document; stop the algorithm here.
    *  Otherwise, there is no indicated part of the document.
    *
    * @param name The name of the anchor.
    * @param container The container in which to search for the anchor.
    * @return The element corresponding to the anchor or the container itself if the anchor refers 
    *         to the top.
    */
    export function findAnchorInContainer(name: string, container: JQuery): JQuery {
        var element = null;
        var idMatches = container.find("#" + name);
        if (idMatches.length > 0) {
            element = $(idMatches[0]);
        }
        else {
            var nameMatches = container.find("a[name='" + name + "']");
            if (nameMatches.length > 0) {
                element = $(nameMatches[0]);
            }
            else if (name.toLowerCase() === "top") {
                element = container;
            }
        }
        return element;
    }
}

export module BoolUtils {

    /**
     * @param value 
     * @return 
     */
    export function parse(value: string): boolean {
        return (value || "").trim().toLowerCase() === "true";
    }

    export function isValid(value: string): boolean {
        var normalizedLowerCaseValue: string = (value || "").trim().toLowerCase();

        return normalizedLowerCaseValue === "true" || normalizedLowerCaseValue === "false";
    }
}

export module GUIDUtils {
    /**
     * Returns a GUID such as xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.
     * @return New GUID.(UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
     * @notes This code is taken from \WebAccess\Build\Scripts\TFS.BuildvNext.WebApi.ts
     * @notes Disclaimer: This implementation uses non-cryptographic random number generator so absolute uniqueness is not guarantee.
     */
    export function newGuid(): string {
        // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
        // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
        var clockSequenceHi = (128 + Math.floor(Math.random() * 64)).toString(16);
        return oct(8) + "-" + oct(4) + "-4" + oct(3) + "-" + clockSequenceHi + oct(2) + "-" + oct(12);
    }

    /**
     * Generated non-zero octet sequences for use with GUID generation.
     *
     * @param length Length required.
     * @return Non-Zero hex sequences.
     */
    function oct(length?: number): string {
        if (!length) {
            return (Math.floor(Math.random() * 0x10)).toString(16);
        }

        var result: string = "";
        for (var i: number = 0; i < length; i++) {
            result += oct();
        }

        return result;
    }
}

export type IOptionalPromise<T> = IPromise<T> | T;

/**
 * Acts as a type guard to determine whether value is a promise
 */
export function isPromise<T>(value: IOptionalPromise<T>): value is IPromise<T> {
    return Q.isPromise(value);
}

export function makePromise<T>(value: IOptionalPromise<T>): IPromise<T> {
    if (isPromise(value)) {
        return value;
    }

    return Q(value);
}

export function transformError(errorCallback?: IErrorCallback, message?: string, errorInfo?: any): IFunctionPR<Error, void>;
export function transformError(errorCallback?: IErrorCallback, transform?: Function, errorInfo?: any): IFunctionPR<Error, void>;
/**
 * Returns an error callback function, that wraps an input error callback, and invokes it
 * after wrapping the input error passed to that function with a new error.
 * 
 * @param errorCallback The callback function to be invoked with the new wrapped error instance.
 * @param messageOrTransform A string for  message for the new error being created, or a function that receives an error object and returns a new error.
 * @param errorInfo An object that contains extended information about the error.
 * @return A wrapper callback function that will transform the input error, or null if the input callback was not a function.
 */
export function transformError(errorCallback?: IErrorCallback, messageOrTransform?: any, errorInfo?: any): IFunctionPR<Error, void> {
    var result: IFunctionPR<Error, void> = null;
    var newError: Error;

    if (typeof (messageOrTransform) !== "string" && !$.isFunction(messageOrTransform)) {
        throw new Error("Invalid argument type: 'messageOrTransform'.");
    }

    // For API usability, if the callback is null, then return null (no-op)
    if ($.isFunction(errorCallback)) {
        result = function (error: Error) {
            if (typeof (messageOrTransform) === "string") {
                newError = new Error(messageOrTransform);
                if (errorInfo) {
                    $.each(errorInfo, (key, value) => {
                        newError[key] = value;
                    });
                }
                (<any>newError).innerException = error;
            }
            else {
                newError = messageOrTransform(error);
            }

            errorCallback(newError);
        };
    }

    return result;
}

/**
 * Checks if a value is string.
 */
function isString(value: any): boolean {
    return typeof value === "string";
}

/**
 * Parses a comma and/or semicolumn delimited string of email addresses into an array of the addresses.
 * 
 * @param emailAddressesString A comma and/or semicolumn delimited string of email addresses
 * @return The parsed array of email addresses.
 */
export function parseEmailAddressesStringToArray(emailAddressesString: string): string[] {
    var emailAddresses: string[] = [];
    var splitsOfComma: string[];
    var splitsOfSemicolumn: string[];

    if (isString(emailAddressesString)) {
        splitsOfComma = emailAddressesString.split(",");
        $.each(splitsOfComma, function (i: number) {
            splitsOfSemicolumn = splitsOfComma[i].split(";");
            $.each(splitsOfSemicolumn, function (j: number) {
                emailAddresses.push($.trim(splitsOfSemicolumn[j]));
            });
        });
    }

    return emailAddresses;
}

/**
 * Checks if the code is running under test.
 * We use QUnit test framework which sets a global variable by name of QUnit, we check existance of the variable.
 * @return True if running under test, false otherwise.
 */
export function isRunningUnderTest(): boolean {
    return typeof window["QUnit"] !== "undefined";
}


export function makeCopy(obj: any): any{
    if(Array.isArray(obj)){
        let result = [];
        for(let e in obj){
            result.push(makeCopy(obj[e]));
        }
        return result;
    }else{
        return $.extend(true, {}, obj);
    }
}

/**
 * Gets the scrollTop value for the window in a browser independent way.
 * From Chrome 61 onwards (https://bugs.chromium.org/p/chromium/issues/detail?id=766938),
 * it does not support document.body.scrollTop and requires us to use document.documentElement.scrollTop.
 * IE/Edge still only support document.body.scrollTop, so we need to use both to ensure it works on all supported browsers.
 * @return scrollTop value
 */
export function getWindowScrollTop(): number {
    const docScrollTop = document.documentElement && document.documentElement.scrollTop;
    const bodyScrollTop = document.body.scrollTop;

    return docScrollTop || bodyScrollTop || 0;
}

/**
 * Sets the scrollTop value for the window in a browser independent way.
 * From Chrome 61 onwards (https://bugs.chromium.org/p/chromium/issues/detail?id=766938),
 * it does not support document.body.scrollTop and requires us to use document.documentElement.scrollTop.
 * IE/Edge still only support document.body.scrollTop, so we need to use both to ensure it works on all supported browsers.
 * @param scrollTop The scrollTop value to be set
 */
export function setWindowScrollTop(scrollTop: number): void {
    document.body.scrollTop = scrollTop;
    if (document.documentElement) {
        document.documentElement.scrollTop = scrollTop;
    }
}
