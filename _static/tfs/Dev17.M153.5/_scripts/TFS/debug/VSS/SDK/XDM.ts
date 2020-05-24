///<reference path='../References/VSS.SDK.Interfaces.d.ts' />

/************* WARNING *************

    ANY CHANGES TO THIS FILE MUST BE
    DUPLICATED IN VSS.SDK.ts.

***********************************/

module XDM {
    
        export interface IDeferred<T> {
            resolve: (result: T) => void;
            reject: (reason: any) => void;
            promise: IPromise<T>;
        }
        
        /**
        * Create a new deferred object
        */
        export function createDeferred<T>(): IDeferred<T> {
            return new XdmDeferred<T>();
        }
    
        class XdmDeferred<T> implements IDeferred<T> {
    
            private _resolveCallbacks: Function[] = [];
            private _rejectCallbacks: Function[] = [];
            private _isResolved = false;
            private _isRejected = false;
            private _resolvedValue: T;
            private _rejectValue: any;
    
            public promise: IPromise<T>;
            public resolve: (result: T) => void;
            public reject: (reason: any) => void;
    
            constructor() {
    
                this.resolve = (result: T) => {
                    this._resolve(result);
                };
    
                this.reject = (reason: any) => {
                    this._reject(reason);
                };
    
                this.promise = <IPromise<T>>{};
                this.promise.then = <TResult1 = T>(
                    onFulfill: ((value: T) => TResult1 | IPromise<TResult1>) | undefined | null, 
                    onReject?: ((reason: any) => any | IPromise<any>) | undefined | null
                ): IPromise<TResult1> => {
                    return this._then(onFulfill, onReject);
                };
            }
    
            private _then<TResult1 = T>(
                onFulfill: ((value: T) => TResult1 | IPromise<TResult1>) | undefined | null, 
                onReject?: ((reason: any) => any | IPromise<any>) | undefined | null
            ): IPromise<TResult1> {
    
                if ((!onFulfill && !onReject) ||
                    (this._isResolved && !onFulfill) ||
                    (this._isRejected && !onReject)) {
    
                    return this.promise as any as IPromise<TResult1>;
                }
    
                var newDeferred = new XdmDeferred<T>();
    
                this._resolveCallbacks.push((value: T) => {
                    this._wrapCallback(onFulfill, value, newDeferred, false);
                });
                this._rejectCallbacks.push((reason: any) => {
                    this._wrapCallback(onReject, reason, newDeferred, true);
                });
    
                if (this._isResolved) {
                    this._resolve(this._resolvedValue);
                }
                else if (this._isRejected) {
                    this._reject(this._rejectValue);
                }
    
                return newDeferred.promise as any as IPromise<TResult1>;
            }
    
            private _wrapCallback(callback: Function, value: T, deferred: XdmDeferred<T>, reject: boolean) {
    
                if (!callback) {
                    if (reject) {
                        deferred.reject(value);
                    }
                    else {
                        deferred.resolve(value);
                    }
                    return;
                }
    
                var result: any;
                try {
                    result = callback(value);
                }
                catch (ex) {
                    deferred.reject(ex);
                    return;
                }
    
                if (result === undefined) {
                    deferred.resolve(value);
                }
                else if (result && typeof result.then === "function") {
                    result.then((innerResult: T) => {
                        deferred.resolve(innerResult);
                    }, (innerReason: any) => {
                        deferred.reject(innerReason);
                    });
                }
                else {
                    deferred.resolve(result);
                }
            }
            
            private _resolve(result: T) {
    
                if (!this._isRejected && !this._isResolved) {
                    this._isResolved = true;
                    this._resolvedValue = result;
                }
    
                if (this._isResolved && this._resolveCallbacks.length > 0) {
                    var resolveCallbacks = this._resolveCallbacks.splice(0);
    
                    // 2.2.4. #onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
                    window.setTimeout(() => {
                        for (var i = 0, l = resolveCallbacks.length; i < l; i++) {
                            resolveCallbacks[i](result);
                        }
                    });
                }
            }
    
            private _reject(reason: any) {
    
                if (!this._isRejected && !this._isResolved) {
                    this._isRejected = true;
                    this._rejectValue = reason;
    
                    if (this._rejectCallbacks.length === 0 && window.console && window.console.warn) {
                        console.warn("Rejected XDM promise with no reject callbacks");
                        if (reason) {
                            console.warn(reason);
                        }
                    }
                }
    
                if (this._isRejected && this._rejectCallbacks.length > 0) {
                    var rejectCallbacks = this._rejectCallbacks.splice(0);
    
                    // 2.2.4. #onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
                    window.setTimeout(() => {
    
                        for (var i = 0, l = rejectCallbacks.length; i < l; i++) {
                            rejectCallbacks[i](reason);
                        }
                    });
                }
            }
        }
    
        /**
        * Settings related to the serialization of data across iframe boundaries.
        */
        export interface ISerializationSettings {
    
            /**
            * By default, properties that begin with an underscore are not serialized across
            * the iframe boundary. Set this option to true to serialize such properties.
            */
            includeUnderscoreProperties: boolean;
        }
    
        /**
         * Represents a remote procedure call (rpc) between frames.
         */
        interface IJsonRpcMessage {
            id: number;
            instanceId?: string;
            instanceContext?: Object;
            methodName?: string;
            params?: any[];  // if method is present then params should be present
            result?: any;    // method, result, and error are mutucally exclusive.  method is set for requrests, result and error are for responses
            error?: any;
            jsonrpc: string;
            handshakeToken?: string;
            serializationSettings?: ISerializationSettings;
        }
    
        var smallestRandom = parseInt("10000000000", 36);
        var maxSafeInteger: number = (<any>Number).MAX_SAFE_INTEGER || 9007199254740991;
    
        /**
         * Create a new random 22-character fingerprint.
         * @return string fingerprint
         */
        function newFingerprint() {    
            // smallestRandom ensures we will get a 11-character result from the base-36 conversion.
            return Math.floor((Math.random() * (maxSafeInteger - smallestRandom)) + smallestRandom).toString(36) +
                   Math.floor((Math.random() * (maxSafeInteger - smallestRandom)) + smallestRandom).toString(36);
        }
    
    
        /**
         * Catalog of objects exposed for XDM
         */
        export class XDMObjectRegistry implements IXDMObjectRegistry {
    
            private _registeredObjects: any = {};
            
            /**
            * Register an object (instance or factory method) exposed by this frame to callers in a remote frame
            *
            * @param instanceId unique id of the registered object
            * @param instance Either: (1) an object instance, or (2) a function that takes optional context data and returns an object instance.
            */
            public register(instanceId: string, instance: Object | { (contextData?: any): Object; }) {
                this._registeredObjects[instanceId] = instance;
            }
            
            /**
            * Unregister an object (instance or factory method) that was previously registered by this frame
            *
            * @param instanceId unique id of the registered object
            */
            public unregister(instanceId: string) {
                delete this._registeredObjects[instanceId];
            }
    
            /**
            * Get an instance of an object registered with the given id
            *
            * @param instanceId unique id of the registered object
            * @param contextData Optional context data to pass to a registered object's factory method
            */
            public getInstance<T>(instanceId: string, contextData?: Object): T {
                var instance = this._registeredObjects[instanceId];
                if (!instance) {
                    return null;
                }
    
                if (typeof instance === "function") {
                    return instance(contextData);
                }
                else {
                    return instance;
                }
            }
        };
    
        /**
        * The registry of global XDM handlers
        */
        export var globalObjectRegistry = new XDMObjectRegistry();
    
        /**
         * Represents a channel of communication between frames\document
         * Stays "alive" across multiple funtion\method calls
         */
        export class XDMChannel implements IXDMChannel {
    
            private static _nextChannelId: number = 1;
            private static MAX_XDM_DEPTH: number = 100;
    
            private static WINDOW_TYPES_TO_SKIP_SERIALIZATION: string[] = [
                "Node",
                "Window",
                "Event"
            ];
    
            private static JQUERY_TYPES_TO_SKIP_SERIALIZATION: string[] = [
                "jQuery"
            ];
    
            private _nextMessageId: number = 1;
            private _deferreds: { [id: number]: IDeferred<any>; } = {};
            private _postToWindow: Window;
            private _targetOrigin: string;
            private _handshakeToken: string;
            private _channelObjectRegistry: XDMObjectRegistry;
            private _channelId: number;
            private _nextProxyFunctionId: number = 1;
            private _proxyFunctions: IDictionaryStringTo<Function> = {};
    
            constructor(postToWindow: Window, targetOrigin: string = null) {
    
                this._postToWindow = postToWindow;
                this._targetOrigin = targetOrigin;
                this._channelObjectRegistry = new XDMObjectRegistry();
                this._channelId = XDMChannel._nextChannelId++;
    
                if (!this._targetOrigin) {
                    this._handshakeToken = newFingerprint();
                }
            }
    
            /**
            * Get the object registry to handle messages from this specific channel.
            * Upon receiving a message, this channel registry will be used first, then
            * the global registry will be used if no handler is found here.
            */
            public getObjectRegistry(): IXDMObjectRegistry {
                return this._channelObjectRegistry;
            }
    
            /**
            * Invoke a method via RPC. Lookup the registered object on the remote end of the channel and invoke the specified method.
            *
            * @param method Name of the method to invoke
            * @param instanceId unique id of the registered object
            * @param params Arguments to the method to invoke
            * @param instanceContextData Optional context data to pass to a registered object's factory method
            * @param serializationSettings Optional serialization settings
            */
            public invokeRemoteMethod<T>(methodName: string, instanceId: string, params?: any[], instanceContextData?: Object, serializationSettings?: ISerializationSettings): IPromise<T> {
    
                var message: IJsonRpcMessage = {
                    id: this._nextMessageId++,
                    methodName: methodName,
                    instanceId: instanceId,
                    instanceContext: instanceContextData,
                    params: <any[]>this._customSerializeObject(params, serializationSettings),
                    jsonrpc: "2.0",
                    serializationSettings: serializationSettings
                };
    
                if (!this._targetOrigin) {
                    message.handshakeToken = this._handshakeToken;
                }
    
                var deferred = createDeferred<T>();
    
                this._deferreds[message.id] = deferred;
                this._sendRpcMessage(message);
    
                return deferred.promise;
            }
    
            /**
            * Get a proxied object that represents the object registered with the given instance id on the remote side of this channel.
            *
            * @param instanceId unique id of the registered object
            * @param contextData Optional context data to pass to a registered object's factory method
            */
            public getRemoteObjectProxy<T>(instanceId: string, contextData?: Object): IPromise<T> {
                return this.invokeRemoteMethod(null, instanceId, null, contextData);
            }
    
            private invokeMethod(registeredInstance: Object, rpcMessage: IJsonRpcMessage) {
    
                if (!rpcMessage.methodName) {
                    // Null/empty method name indicates to return the registered object itself.
                    this._success(rpcMessage, registeredInstance, rpcMessage.handshakeToken);
                    return;
                }
    
                var method: Function = registeredInstance[rpcMessage.methodName];
                if (typeof method !== "function") {
                    this._error(rpcMessage, new Error("RPC method not found: " + rpcMessage.methodName), rpcMessage.handshakeToken);
                    return;
                }
    
                try {
                    // Call specified method.  Add nested success and error call backs with closure
                    // so we can post back a response as a result or error as appropriate
                    var methodArgs = [];
                    if (rpcMessage.params) {
                        methodArgs = <any[]>this._customDeserializeObject(rpcMessage.params);
                    }
    
                    var result = method.apply(registeredInstance, methodArgs);
                    if (result && result.then && typeof result.then === "function") {
                        result.then((asyncResult) => {
                            this._success(rpcMessage, asyncResult, rpcMessage.handshakeToken);
                        }, (e) => {
                            this._error(rpcMessage, e, rpcMessage.handshakeToken);
                        });
                    }
                    else {
                        this._success(rpcMessage, result, rpcMessage.handshakeToken);
                    }
                }
                catch (exception) {
                    // send back as error if an exception is thrown
                    this._error(rpcMessage, exception, rpcMessage.handshakeToken);
                }
            }
    
            private getRegisteredObject(instanceId: string, instanceContext?: Object): Object {
    
                if (instanceId === "__proxyFunctions") {
                    // Special case for proxied functions of remote instances
                    return this._proxyFunctions;
                }
    
                // Look in the channel registry first
                var registeredObject = this._channelObjectRegistry.getInstance(instanceId, instanceContext);
                if (!registeredObject) {
                    // Look in the global registry as a fallback
                    registeredObject = globalObjectRegistry.getInstance(instanceId, instanceContext);
                }
    
                return registeredObject;
            }
    
            /**
            * Handle a received message on this channel. Dispatch to the appropriate object found via object registry
            *
            * @param data Message data
            * @param origin Origin of the frame that sent the message
            * @return True if the message was handled by this channel. Otherwise false.
            */
            public onMessage(data: any, origin: string): boolean {
                var rpcMessage: IJsonRpcMessage = data;
    
                if (rpcMessage.instanceId) {
                    // Find the object that handles this requestNeed to find implementation
                    
                    // Look in the channel registry first
                    var registeredObject = this.getRegisteredObject(rpcMessage.instanceId, rpcMessage.instanceContext);
                    if (!registeredObject) {
                        // If not found return false to indicate that the message was not handled
                        return false;
                    }
                    
                    if (typeof registeredObject["then"] === "function") {
                        (<IPromise<any>>registeredObject).then((resolvedInstance) => {
                            this.invokeMethod(resolvedInstance, rpcMessage);
                        }, (e) => {
                            this._error(rpcMessage, e, rpcMessage.handshakeToken);
                        });
                    }
                    else {
                        this.invokeMethod(registeredObject, rpcMessage);
                    }
                }
                else {
                    // response
                    // Responses look like this -
                    //  {"jsonrpc": "2.0", "result": ["hello", 5], "id": "9"}
                    //  {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found."}, "id": "5"}
                    var deferred = this._deferreds[rpcMessage.id];
    
                    if (!deferred) {
                        // Message not handled by this channel.
                        return false;
                    }
    
                    if (rpcMessage.error) {
                        deferred.reject(this._customDeserializeObject([rpcMessage.error])[0]);
                    }
                    else {
                        deferred.resolve(this._customDeserializeObject([rpcMessage.result])[0]);
                    }
    
                    delete this._deferreds[rpcMessage.id];
                }
    
                // Message handled by this channel
                return true;
            }
    
            public owns(source: Window, origin: string, data: any): boolean {
                /// Determines whether the current message belongs to this channel or not
                var rpcMessage: IJsonRpcMessage = data;
    
                if (this._postToWindow === source) {
                    // For messages coming from sandboxed iframes the origin will be set to the string "null".  This is 
                    // how onprem works.  If it is not a sandboxed iFrame we will get the origin as expected.
                    if (this._targetOrigin) {
                        if (origin) {
                            return origin.toLowerCase() === "null" || this._targetOrigin.toLowerCase().indexOf(origin.toLowerCase()) === 0;
                        } else {
                            return false;
                        }
                    }
                    else {
                        if (rpcMessage.handshakeToken && rpcMessage.handshakeToken === this._handshakeToken) {
                            this._targetOrigin = origin;
                            return true;
                        }
                    }
                }
                return false;
            }
    
            public error(data: any, errorObj: any) {
                var rpcMessage: IJsonRpcMessage = data;
                this._error(rpcMessage, errorObj, rpcMessage.handshakeToken);
            }
    
            private _error(messageObj: IJsonRpcMessage, errorObj: any, handshakeToken: string) {
                // Post back a response as an error which look like this -
                //  {"id": "5", "error": {"code": -32601, "message": "Method not found."}, "jsonrpc": "2.0", }
                var message = {
                    id: messageObj.id,
                    error: this._customSerializeObject([errorObj], messageObj.serializationSettings)[0],
                    jsonrpc: "2.0",
                    handshakeToken: handshakeToken
                };
                this._sendRpcMessage(message);
            }
    
            private _success(messageObj: IJsonRpcMessage, result: any, handshakeToken: string) {
                // Post back response result which look like this -
                //  {"id": "9", "result": ["hello", 5], "jsonrpc": "2.0"}
                var message = {
                    id: messageObj.id,
                    result: this._customSerializeObject([result], messageObj.serializationSettings)[0],
                    jsonrpc: "2.0",
                    handshakeToken: handshakeToken
                };
                this._sendRpcMessage(message);
            }
    
            private _sendRpcMessage(message: IJsonRpcMessage) {
                var messageString = JSON.stringify(message);
                this._postToWindow.postMessage(messageString, "*");
            }
    
            private _shouldSkipSerialization(obj: Object): boolean {
    
                for (var i = 0, l = XDMChannel.WINDOW_TYPES_TO_SKIP_SERIALIZATION.length; i < l; i++) {
                    var instanceType = XDMChannel.WINDOW_TYPES_TO_SKIP_SERIALIZATION[i];
                    if (window[instanceType] && obj instanceof window[instanceType]) {
                        return true;
                    }
                }
    
                if ((<any>window).jQuery) {
                    for (var i = 0, l = XDMChannel.JQUERY_TYPES_TO_SKIP_SERIALIZATION.length; i < l; i++) {
                        var instanceType = XDMChannel.JQUERY_TYPES_TO_SKIP_SERIALIZATION[i];
                        if ((<any>window).jQuery[instanceType] && obj instanceof (<any>window).jQuery[instanceType]) {
                            return true;
                        }
                    }
                }
    
                return false;
            }
    
            private _customSerializeObject(obj: Object, settings: ISerializationSettings, parentObjects: { originalObjects: any[]; newObjects: any[]; } = null, nextCircularRefId: number = 1, depth: number = 1): Object {
    
                if (!obj || depth > XDMChannel.MAX_XDM_DEPTH) {
                    return null;
                }
    
                if (this._shouldSkipSerialization(obj)) {
                    return null;
                }
    
                var serializeMember = (parentObject: any, newObject: any, key: any) => {
                    var item;
    
                    try {
                        item = parentObject[key];
                    }
                    catch (ex) {
                        // Cannot access this property. Skip its serialization.
                    }
    
                    var itemType = typeof item;
                    if (itemType === "undefined") {
                        return;
                    }
    
                    // Check for a circular reference by looking at parent objects
                    var parentItemIndex = -1;
                    if (itemType === "object") {
                        parentItemIndex = parentObjects.originalObjects.indexOf(item);
                    }
                    if (parentItemIndex >= 0) {
                        // Circular reference found. Add reference to parent
                        var parentItem = parentObjects.newObjects[parentItemIndex];
                        if (!parentItem.__circularReferenceId) {
                            parentItem.__circularReferenceId = nextCircularRefId++;
                        }
                        newObject[key] = {
                            __circularReference: parentItem.__circularReferenceId
                        };
                    }
                    else {
                        if (itemType === "function") {
                            var proxyFunctionId = this._nextProxyFunctionId++;
                            newObject[key] = {
                                __proxyFunctionId: this._registerProxyFunction(item, obj),
                                __channelId: this._channelId
                            };
                        }
                        else if (itemType === "object") {
                            if (item && item instanceof Date) {
                                newObject[key] = {
                                    __proxyDate: item.getTime()
                                };
                            }
                            else {
                                newObject[key] = this._customSerializeObject(item, settings, parentObjects, nextCircularRefId, depth + 1);
                            }
                        }
                        else if (key !== "__proxyFunctionId") {
                            // Just add non object/function properties as-is. Don't include "__proxyFunctionId" to protect
                            // our proxy methods from being invoked from other messages.
                            newObject[key] = item;
                        }
                    }
                };
    
                var returnValue: any;
                
                if (!parentObjects) {
                    parentObjects = {
                        newObjects: [],
                        originalObjects: []
                    };
                }
    
                parentObjects.originalObjects.push(obj);
    
                if (obj instanceof Array) {
    
                    returnValue = [];
                    parentObjects.newObjects.push(returnValue);
                    
                    for (var i = 0, l = obj.length; i < l; i++) {
                        serializeMember(obj, returnValue, i);
                    }
                }
                else {
                    returnValue = {};
                    parentObjects.newObjects.push(returnValue);
    
                    var keys = {};
    
                    try {
                        // We want to get both enumerable and non-enumerable properties
                        // including inherited enumerable properties. for..in grabs
                        // enumerable properties (including inherited properties) and
                        // getOwnPropertyNames includes non-enumerable properties.
                        // Merge these results together.
                        for (var key in obj) {
                            keys[key] = true;
                        }
                        var ownProperties = Object.getOwnPropertyNames(obj);
                        for (var i = 0, l = ownProperties.length; i < l; i++) {
                            keys[ownProperties[i]] = true;
                        }
                    }
                    catch (ex) {
                        // We may not be able to access the iterator of this object. Skip its serialization.
                    }
    
                    for (var key in keys) {
                        // Don't serialize properties that start with an underscore.
                        if ((key && key[0] !== "_") || (settings && settings.includeUnderscoreProperties)) {
                            serializeMember(obj, returnValue, key);
                        }
                    }
                }
    
                parentObjects.originalObjects.pop();
                parentObjects.newObjects.pop();
    
                return returnValue;
            }
    
            private _registerProxyFunction(func: Function, context: any): number {
                var proxyFunctionId = this._nextProxyFunctionId++;
                this._proxyFunctions["proxy" + proxyFunctionId] = function() {
                    return func.apply(context, Array.prototype.slice.call(arguments, 0));
                };
                return proxyFunctionId;
            }
    
            private _customDeserializeObject(obj: Object, circularRefs?: IDictionaryNumberTo<Object>) {
                var that = this;
    
                if (!obj) {
                    return null;
                }
    
                if (!circularRefs) {
                    circularRefs = {};
                }
                
                var deserializeMember = (parentObject: any, key: any) => {
                    var item = parentObject[key];
                    var itemType = typeof item;
    
                    if (key === "__circularReferenceId" && itemType === 'number') {
                        circularRefs[item] = parentObject;
                        delete parentObject[key];
                    }
                    else if (itemType === "object" && item) {
    
                        if (item.__proxyFunctionId) {
                            parentObject[key] = function () {
                                return that.invokeRemoteMethod("proxy" + item.__proxyFunctionId, "__proxyFunctions", Array.prototype.slice.call(arguments, 0), null, { includeUnderscoreProperties: true });
                            }
                        }
                        else if (item.__proxyDate) {
                            parentObject[key] = new Date(item.__proxyDate);
                        }
                        else if (item.__circularReference) {
                            parentObject[key] = circularRefs[item.__circularReference];
                        }
                        else {
                            this._customDeserializeObject(item, circularRefs);
                        }
                    }
                };
    
                if (obj instanceof Array) {
                    for (var i = 0, l = obj.length; i < l; i++) {
                        deserializeMember(obj, i);
                    }
                }
                else if (typeof obj === "object") {
                    for (var key in obj) {
                        deserializeMember(obj, key);
                    }
                }
    
                return obj;
            }
        }
    
        /**
        * Registry of XDM channels kept per target frame/window
        */
        export class XDMChannelManager implements IXDMChannelManager {
    
            private static _default: XDMChannelManager;
            private _channels: XDMChannel[] = [];
    
            constructor () {
                this._subscribe(window);
            }
    
            public static get(): XDMChannelManager {
                if (!this._default) {
                    this._default = new XDMChannelManager();
                }
                return this._default;
            }
    
            /**
            * Add an XDM channel for the given target window/iframe
            *
            * @param window Target iframe window to communicate with
            * @param targetOrigin Url of the target iframe (if known)
            */
            public addChannel(window: Window, targetOrigin?: string): IXDMChannel {
                var channel = new XDMChannel(window, targetOrigin);
                this._channels.push(channel);
                return channel;
            }
    
            public removeChannel(channel: IXDMChannel) {
                this._channels = this._channels.filter(c => c !== channel);
            }
    
            private _handleMessageReceived(event) {
                // get channel and dispatch to it
                var i, len,
                    channel: XDMChannel;
    
                var rpcMessage: IJsonRpcMessage;
    
                if (typeof event.data === "string") {
                    try {
                        rpcMessage = JSON.parse(event.data);
                    }
                    catch (error) {
                        // The message is not a valid JSON string. Not one of our events.
                    }
                }
    
                if (rpcMessage) {
                    var handled = false;
                    var channelOwner: XDMChannel;
    
                    for (i = 0, len = this._channels.length; i < len; i++) {
                        channel = this._channels[i];
                        if (channel.owns(event.source, event.origin, rpcMessage)) {
                            // keep a reference to the channel owner found. 
                            channelOwner = channel;
                            handled = channel.onMessage(rpcMessage, event.origin) || handled;
                        }
                    }
    
                    if (!!channelOwner && !handled) {
                        if (window.console) {
                            console.error("No handler found on any channel for message: " + JSON.stringify(rpcMessage));
                        }
    
                        // for instance based proxies, send an error on the channel owning the message to resolve any control creation promises
                        // on the host frame. 
                        if (rpcMessage.instanceId) {
                            channelOwner.error( rpcMessage, "The registered object " + rpcMessage.instanceId + " could not be found.");
                        }
                    }
                }
            }
    
    
            private _subscribe(windowObj) {
                if (windowObj.addEventListener) {
                    windowObj.addEventListener("message", (event) => {
                        this._handleMessageReceived(event);
                    });
                }
                else {
                    // IE8
                    windowObj.attachEvent("onmessage", (event) => {
                        this._handleMessageReceived(event);
                    });
                }
            }
        }
    }
    
    
    export function createChannel(targetWindow: Window): IXDMChannel {
        return channelManager.addChannel(targetWindow);
    }
    
    export function createObjectRegistry(): IXDMObjectRegistry {
        return new XDM.XDMObjectRegistry();
    }
    
    /**
    * Manages XDM channels per target window/frame
    */
    export var channelManager: IXDMChannelManager;
    channelManager = XDM.XDMChannelManager.get();
    
    /**
    * Registered XDM objects
    */
    export var globalObjectRegistry: IXDMObjectRegistry;
    globalObjectRegistry = XDM.globalObjectRegistry;