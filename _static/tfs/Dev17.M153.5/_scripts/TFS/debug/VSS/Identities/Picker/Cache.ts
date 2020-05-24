/// <reference types="jquery" />

import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

import Q = require("q");

import Identities_Picker_Constants = require("VSS/Identities/Picker/Constants");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Telemetry = require("VSS/Telemetry/Services");

//Caching

/**
 * @exemptedapi
 */
export interface IIdentityPickerCacheException {
    message: string;
    source?: string;
    parameter?: string;
    details?: any;
}

/**
 * @exemptedapi
 */
interface IArgumentException extends IIdentityPickerCacheException {
}

/**
 * @exemptedapi
 */
interface IUsageException extends IIdentityPickerCacheException {
}

/**
 * @exemptedapi
 */
class CacheHelper {
    public static guessQueryTokenType(key): CacheableTypes {
        if (Utils_String.isGuid(key) && !Utils_String.isEmptyGuid(key)) {
            return CacheableTypes.Guid;
        }

        if (CacheHelper._isValidEmail(key)) {
            return CacheableTypes.Email;
        }

        //unique identifiers last
        //this is our default idea of UID in the absence of a cacheTypeHint
        if (CacheHelper._isPotentialEntityId(key)) {
            //currently entityId qualifies as a UID
            return CacheableTypes.UniqueIdentifier;
        }

        return CacheableTypes.Unknown;
    }

    private static _isPotentialEntityId(input: string) {
        var units = input.split(".");
        if (units.length == 6 && Utils_String.isGuid(units[5]) && !Utils_String.isEmptyGuid(units[5])) {
            return true;
        }
        return false;
    }

    //todo: duplicated code: once feasible move such helpers to a separate file - ServiceHelpers
    /**
    *   Validates emails - mostly complaint with RFC5322
    **/
    private static _isValidEmail(input: string) {
        var emailComponents = input.split("@");
        if (emailComponents.length === 2
            && emailComponents[0].length >= 1
            && emailComponents[1].length >= 1) {
            return true;
        }

        return false;
    }
}

/**
 * @exemptedapi
 */
export enum CacheableTypes {
    Unknown,
    UniqueIdentifier,
    Guid,
    Email,
};

/**
 * @exemptedapi
 */
interface CacheObject<V> {
    item: V;
    expiryTimeS: number;
}

/**
 * @exemptedapi
 */
export interface ICacheConfiguration {
    expirationIntervalS: number;
}

/**
 * @exemptedapi
 */
export interface ICache<V> {
    /**
    *   This method is optimistic
    **/
    set(key: string, value: V): void;
    /**
    *  This method can return null
    **/
    get(key: string): V;
    clear(): void;
    configure(config: ICacheConfiguration): void;
}

/**
 * @exemptedapi
 */
export class HashCache<V> implements ICache<V> {
    constructor() {
        this._config = <ICacheConfiguration>{
            //1 day
            expirationIntervalS: 24 * 60 * 60,
        };
    }

    /**
    *  This method can return null
    **/
    public get(key: string): V {
        if (!key) {
            throw <IArgumentException>{
                message: "invalid (null/undefined) key",
                parameter: "key",
                source: "HashCache add",
            };
        }

        if (!this._cache.hasOwnProperty(key) || !this._cache[key]) {
            return null;
        }

        var cacheObject = this._cache[key];
        if ((new Date()).getTime() / 1000 > cacheObject.expiryTimeS) {
            delete this._cache[key];
            return null;
        }

        return this._cache[key].item;
    }

    public set(key: string, value: V): void {
        if (!key) {
            throw <IArgumentException>{
                message: "invalid (null/undefined) key",
                parameter: "key",
                source: "HashCache add",
            };
        }
        var cacheObject: CacheObject<V> = {
            item: value,
            expiryTimeS: (new Date()).getTime() / 1000 + this._config.expirationIntervalS,
        };
        this._cache[key] = cacheObject;
    }

    public clear(): void {
        var keys = this._getKeys();
        if (!keys || keys.length == 0) {
            return;
        }
        for (var key in keys) {
            delete this._cache[key];
        }
    }

    public configure(config: ICacheConfiguration) {
        this._config = config;
    }

    private _getKeys(): string[] {
        return Object.keys(this._cache);
    }

    private _cache: IDictionaryStringTo<CacheObject<V>> = {};
    private _config: ICacheConfiguration;
}

/**
 * @exemptedapi
 */
export interface IRequestCacheConfiguration {
    delayIntervalMS: number;
}

/**
 * @exemptedapi
 */
export interface IRequestCache<T> {
    /**
    *  This method can return null
    **/
    getPromise(request: string): IPromise<T>;
    /**
    *   This method is optimistic
    **/
    setPromise(request: string, promise: IPromise<T>): void;
    configure(config: IRequestCacheConfiguration): void;
}

//todo: use the hashcache directly instead? since we dont need active invalidation?
/**
 * @exemptedapi
 */
export class RequestCache<T> implements IRequestCache<T> {
    constructor() {
        this._config = <IRequestCacheConfiguration>{
            delayIntervalMS: RequestCache._defaultDelayIntervalMS,
        };

        this._cache = new HashCache<IPromise<T>>();
        this._cache.configure(<ICacheConfiguration>{
            expirationIntervalS: this._config.delayIntervalMS / 1000,
        });
    }

    /**
    *  This method can return null
    **/
    public getPromise(request: string): IPromise<T> {
        this._setOrResetTimer();

        var cacheResponse = this._cache.get(request);
        if (cacheResponse) {
            //This can be used for logging CI events for cache hits and misses. Commented out because of the high volume of events it generates
            //TelemetryHelper.traceCacheHit(cacheResponse, Identities_Picker_Constants.Telemetry.Feature_RequestCache);
            return cacheResponse;
        }

        return null;
    }

    /**
    *   This method is optimistic
    **/
    public setPromise(request: string, promise: IPromise<T>): void {
        this._setOrResetTimer();

        this._cache.set(request, promise);
    }

    public configure(config: IRequestCacheConfiguration): void {
        this._config = config;
        this._cache.configure(<ICacheConfiguration>{
            expirationIntervalS: this._config.delayIntervalMS / 1000,
        });
    }

    /**
    *   This method is not using Utils_Core.DelayedFunction on purpose. 
    *   The DelayedFunction is logging tracepoints and some tests use them for identifying if there are still actions left in a pending state. 
    *   We want to exempt the active cache invalidation from being waited upon by the tests.
    **/
    private _setOrResetTimer() {
        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
            this._timeoutHandle = null;
        };
        this._timeoutHandle = setTimeout(Utils_Core.delegate(this, () => {
            this._cache.clear();
        }), this._config.delayIntervalMS);
    }

    private _cache: ICache<IPromise<T>>;
    private _timeoutHandle: number;
    private _config: IRequestCacheConfiguration;

    private static _defaultDelayIntervalMS: number = 60000;
}

/**
 * @exemptedapi
 */
export interface ITwoLayerCacheConfiguration<V> {
    getUniqueIdentifier: (value: V) => string;
}

/**
 * @exemptedapi
 */
export interface ITwoLayerCache<V> {
    addRedirector(cacheType: CacheableTypes, cache?: ICache<string>): void;
    /**
    *  This method can return null
    **/
    get(key: string, cacheTypeHint?: string): V;
    /**
    *   This method is optimistic
    **/
    set(key: string, value: V, cacheTypeHint?: string): void;
    configure(config: ITwoLayerCacheConfiguration<V>): void;
}

/**
 * @exemptedapi
 */
export class TwoLayerCache<V> implements ITwoLayerCache<V> {
    constructor(config: ITwoLayerCacheConfiguration<V>) {
        this.configure(config);

        this._objectCache = new HashCache<V>();
    }

    public configure(config: ITwoLayerCacheConfiguration<V>): void {
        if (!config || !config.getUniqueIdentifier) {
            throw <IUsageException>{
                source: "TwoLayerCache configure",
                message: "missing config or missing the required getUniqueIdentifier property",
                parameter: "config",
            };
        }

        this._config = config;
    }

    public addRedirector(cacheType: CacheableTypes): void {
        if (cacheType === null || cacheType === undefined) {
            throw <IArgumentException>{
                source: "TwoLayerCache addRedirector",
                message: "invalid null/undefined cacheType",
                parameter: "cacheType",
            };
        }
        if (this._redirectors.hasOwnProperty(cacheType.toString())) {
            throw <IArgumentException>{
                source: "TwoLayerCache addRedirector",
                message: "redirector with supplied cacheType already exists: currently at most one redirector supported for a CacheType",
                parameter: "cacheType",
            };
        }

        //create new HashCache for the cache type
        this._redirectors[cacheType.toString()] = new HashCache<string>();
    }

    /**
    *  This method can return null
    **/
    public get(key: string, cacheTypeHint?: string): V {
        var value = this._queryCache(key, cacheTypeHint);
        //This can be used for logging CI events for cache hits and misses. Commented out because of the high volume of events it generates
        //TelemetryHelper.traceCacheHit(value, Identities_Picker_Constants.Telemetry.Feature_TwoLayerCache);
        return value;
    }

    /**
    *   This method is optimistic
    **/
    public set(key: string, value: V, cacheTypeHint?: string): void {
        var cacheType: string;
        if (cacheTypeHint) {
            cacheType = cacheTypeHint;
        }
        else {
            cacheType = CacheHelper.guessQueryTokenType(key).toString();
        }

        var identifier = this._config.getUniqueIdentifier(value);
        if (!identifier) {
            throw <IArgumentException>{
                source: "TwoLayerCache set",
                message: "could not retrieve a valid unique identifier from the value",
            };
        }

        if (cacheType != CacheableTypes.UniqueIdentifier.toString() &&
            identifier != key &&
            !this._redirectors.hasOwnProperty(cacheType.toString())) {
            return;
        }

        if (cacheType == CacheableTypes.UniqueIdentifier.toString() ||
            identifier == key) {
            this._objectCache.set(key, value);
            return;
        }
        else {
            var cache = this._redirectors[cacheType];
            cache.set(key, identifier);
            this._objectCache.set(identifier, value);
            return;
        }
    }

    private _queryCache(key: string, cacheTypeHint?: string): V {
        var cacheType: string;
        if (cacheTypeHint) {
            cacheType = cacheTypeHint;
        } else {
            cacheType = CacheHelper.guessQueryTokenType(key).toString();
        }

        if (cacheType == CacheableTypes.UniqueIdentifier.toString()) {
            return this._objectCache.get(key);
        } else {
            if (!this._redirectors.hasOwnProperty(cacheType.toString())) {
                //check object cache in case the consumer considers it as a UID
                return this._objectCache.get(key);
            }

            var layer2Key = this._redirectors[cacheType].get(key);
            if (!layer2Key) {
                return null;
            }

            return this._objectCache.get(layer2Key);
        }
    }

    private _config: ITwoLayerCacheConfiguration<V>;
    private _redirectors: IDictionaryStringTo<ICache<string>> = {};
    private _objectCache: HashCache<V>;
}

/**
 * @exemptedapi
 */
class TelemetryHelper {
    public static traceCacheHit(value: any, feature: string): void {
        var isCacheHit = (value != null);
        var cacheHitProperties: IDictionaryStringTo<any> = {};
        cacheHitProperties[Identities_Picker_Constants.TelemetryProperties.isTwoLayerCacheHit] = isCacheHit;
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                Identities_Picker_Constants.Telemetry.Area,
                feature,
                cacheHitProperties));
    }
}