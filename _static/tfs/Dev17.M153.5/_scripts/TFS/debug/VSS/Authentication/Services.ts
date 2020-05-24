
import Q = require("q");

import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import User_Services = require("VSS/User/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import Authentication_Contracts_Async = require("VSS/Authentication/Contracts");
import Authentication_RestClient_Async = require("VSS/Authentication/RestClient");

export module CoreNamedWebSessionTokenIds {
    export var Profile = "Platform.Profile";
}

/**
* Helper methods for dealing with basic auth
*/
export module BasicAuthHelpers {

    /**
    * Create the Authorization header value given the basic auth credentials
    *
    * @param user The username portion of the credentials
    * @param password The password portion of the credentials 
    */
    export function getBasicAuthHeader(user: string, password: string): string {
        return Utils_String.format("Basic {0}", getBasicAuthValue(user, password));
    }

    /**
    * Create base-64 encoded user:password value used for basic auth.
    *
    * @param user The username portion of the credentials
    * @param password The password portion of the credentials 
    */
    export function getBasicAuthValue(user: string, password: string): string {
        var userPwdPair = Utils_String.format("{0}:{1}", user || "", password || "");
        return Utils_String.base64Encode(userPwdPair);
    }
}

/**
* Helper methods for dealing with bearer auth
*/
export module BearerAuthHelpers {

    /**
    * Create the Authorization header value given the bearer token
    *
    * @param token bearer token
    */
    export function getBearerAuthHeader(token: string): string {
        return Utils_String.format("Bearer {0}", token);
    }
}

function tokenRequired(webContext?: Contracts_Platform.WebContext): boolean {
    // See issuing access token is allowed or not. Users with member claim can issue token.
    return User_Services.getService().hasClaim(User_Services.UserClaims.Member);
}

/**
* Auth token manager for WebSessionTokens
*/
class AuthTokenManager implements IAuthTokenManager<Authentication_Contracts_Async.WebSessionToken> {

    private _appIdForUnscopedToken = Utils_String.EmptyGuidString;
    private _tokenPromises: { [appId: string]: IPromise<Authentication_Contracts_Async.WebSessionToken> };
    private _tokenExpirationTimes: { [appId: string]: Date };
    private _httpClientRootPath: string;

    constructor(httpClientRootPath?: string) {
        this._tokenPromises = {};
        this._tokenExpirationTimes = {};

        if (httpClientRootPath) {
            this._httpClientRootPath = httpClientRootPath;
        }
    }

    private _getKey(tokenType: Authentication_Contracts_Async.DelegatedAppTokenType, appId: string, publisherName: string, extensionName: string): string {
        return `${tokenType}:${appId}:${publisherName}:${extensionName}`;
    }

    private _setTokenValidTo(key: string, promise: IPromise<Authentication_Contracts_Async.WebSessionToken>): void {
        promise.then((sessionToken: Authentication_Contracts_Async.WebSessionToken) => {
            this._tokenExpirationTimes[key] = sessionToken.validTo;
        });
    }

    private _checkTokenExpiration(key: string): void {
        var validTo = this._tokenExpirationTimes[key];

        // Check 1 minute before to prevent issues caused by network latency
        if (validTo && new Date().getTime() > (validTo.getTime() - 60000)) {
            // Token almost expired, invalidate cache to force a new token
            delete this._tokenExpirationTimes[key];
            delete this._tokenPromises[key];
        }
    }

    private _setTokenPromise(tokenType: Authentication_Contracts_Async.DelegatedAppTokenType, appId: string, publisherName: string, extensionName: string, tokenPromise: IPromise<Authentication_Contracts_Async.WebSessionToken>): void {
        var key = this._getKey(tokenType, appId, publisherName, extensionName);

        // Cache token valid to value to invalidate cach when expiration date is close
        this._setTokenValidTo(key, tokenPromise);

        // Cache token promise
        this._tokenPromises[key] = tokenPromise;
    }

    private _getTokenPromise(tokenType: Authentication_Contracts_Async.DelegatedAppTokenType, appId: string, publisherName: string, extensionName: string): IPromise<Authentication_Contracts_Async.WebSessionToken> {
        var key = this._getKey(tokenType, appId, publisherName, extensionName);

        // Check token expiration time and invalidate if it's almost expired
        this._checkTokenExpiration(key);

        // Gets the session token from the cache
        return this._tokenPromises[key];
    }

    private _beginGetToken(isSessionToken: boolean, appId: string, publisherName: string, extensionName: string, name: string, force: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {

        if (!tokenRequired(webContext)) {
            return Q(null);
        }

        return VSS.requireModules(["VSS/Authentication/RestClient", "VSS/Authentication/Contracts"]).spread((_AuthenticationClient: typeof Authentication_RestClient_Async, _AuthenticationContracts: typeof Authentication_Contracts_Async) => {

            var tokenType = isSessionToken ? _AuthenticationContracts.DelegatedAppTokenType.Session : _AuthenticationContracts.DelegatedAppTokenType.App;

            if (!force) {
                // Attempt to use already-cached token lookup
                var sessionTokenPromise = this._getTokenPromise(tokenType, appId, publisherName, extensionName);
                if (sessionTokenPromise) {
                    return sessionTokenPromise;
                }
            }

            // Prepare session token object
            var sessionToken = <Authentication_Contracts_Async.WebSessionToken>{
                appId,
                publisherName,
                extensionName,
                name: name || null,
                token: null,
                force: force,
                tokenType: tokenType
            };

            var promise: IPromise<Authentication_Contracts_Async.WebSessionToken>;

            // If we are in the parent or in BuiltInExtensions then fetch token. If not then try to
            // use SDK to get token.
            // The BuiltInExtensions area from TFS uses a legacy extension model where content is iframed
            // but VSS.SDK is not used in the extension content. Since this content is delivered directly
            // from TFS, we can request the token directly from the extension frame.
            if (isVssHostFrame()) {
                var authClient = new _AuthenticationClient.AuthenticationHttpClient(this._httpClientRootPath ? this._httpClientRootPath : Context.getDefaultWebContext().host.relativeUri);
                promise = authClient.createSessionToken(sessionToken);
            } else {
                var vss = (<any>window).VSS;
                if (vss && vss.getAccessToken) {
                    promise = vss.getAccessToken();
                } else {
                    throw new Error("VSS.SDK is not currently loaded");
                }
            }

            this._setTokenPromise(tokenType, appId, publisherName, extensionName, promise);
            return promise;
        });
    }

    /**
     * Fetch a session token to use for the current user for the given application (or null/empty for an unscoped token).
     *
     * @param appId Id of the application.
     * @param name Metadata info to identify the token.
     * @param force Enables skipping cache and issue a brand new token.
     * @return Session token.
     */
    public getToken(appId?: string, name?: string, force?: boolean, scoped?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {
        if (appId) {
            // TODO: When client app id is specified, the app needs to be registered in SPS. Since we are not yet doing that
            // in our apps, we need to be sending the empty GUID for app id.
            // return this._beginGetToken(appId, name, force);
        }
        return this._beginGetToken(true, scoped ? appId : this._appIdForUnscopedToken, undefined, undefined, name, force, webContext);
    }

    /**
     * Fetch a session token to use for the current user for the given extension
     *
     * @param publisherName Id of the publisher.
     * @param extensionName Id of the extension.
     * @param force Enables skipping cache and issue a brand new token.
     * @return Session token.
     */
    public getExtensionToken(publisherName: string, extensionName: string, force?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {
        return this._beginGetToken(true, undefined, publisherName, extensionName, name, force, webContext);
    }

    /**
     * Fetch an app token to use for the current user for the given application.  This can be used to authenticate
     * with an external application.
     *
     * @param appId Id of the application.
     * @param name Metadata info to identify the token.
     * @param force Enables skipping cache and issue a brand new token.
     * @return Session token.
     */
    public getAppToken(appId: string, name?: string, force?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {
        return this._beginGetToken(false, appId, undefined, undefined, name, force, webContext);
    }

    /**
    * Get the auth token to use for this request.
    */
    public getAuthToken(refresh?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {
        return this.getToken(null, null, refresh, false, webContext);
    }

    /**
     * Gets the authorization header to use in a request from the given token
     *
     * @param sessionToken Used for token key.
     * @return the value to use for the Authorization header in a request.
     */
    public getAuthorizationHeader(sessionToken: Authentication_Contracts_Async.WebSessionToken): string {
        if (!sessionToken || !sessionToken.token) {
            throw Resources_Platform.SessionTokenNotReady;
        }
        return BearerAuthHelpers.getBearerAuthHeader(sessionToken.token);
    }
}

/**
* IAuthTokenManager for a named web session token.
*/
export class NamedWebSessionTokenManager implements IAuthTokenManager<Authentication_Contracts_Async.WebSessionToken> {

    private _namedTokenId: string;
    private _tokenPromise: IPromise<Authentication_Contracts_Async.WebSessionToken>;
    private _tokenExpirationTime: Date;

    constructor(namedTokenId: string) {
        this._namedTokenId = namedTokenId;
    }

    /**
    * Get the auth token to use for this request.
    */
    public getAuthToken(refresh?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {

        if (!tokenRequired(webContext)) {
            return Q(null);
        }

        if (!refresh) {

            // Check token expiration time and invalidate if it's almost expired. Check 1 minute before to prevent issues caused by network latency
            if (this._tokenExpirationTime && new Date().getTime() > (this._tokenExpirationTime.getTime() - 60000)) {
                // Token almost expired, invalidate cache to force a new token
                this._tokenExpirationTime = null;
                this._tokenPromise = null;
            }

            // Attempt to use already-cached token lookup
            if (this._tokenPromise) {
                return this._tokenPromise;
            }
        }

        this._tokenPromise = VSS.requireModules(["VSS/Authentication/RestClient", "VSS/Authentication/Contracts"]).spread((_AuthenticationClient: typeof Authentication_RestClient_Async, _AuthenticationContracts: typeof Authentication_Contracts_Async) => {

            // Prepare session token object
            var sessionToken = <Authentication_Contracts_Async.WebSessionToken>{
                appId: Utils_String.EmptyGuidString,
                force: refresh,
                tokenType: _AuthenticationContracts.DelegatedAppTokenType.Session,
                namedTokenId: this._namedTokenId
            };

            // If we are in the parent or in BuiltInExtensions then fetch token. If not then try to
            // use SDK to get token.
            // The BuiltInExtensions area from TFS uses a legacy extension model where content is iframed
            // but VSS.SDK is not used in the extension content. Since this content is delivered directly
            // from TFS, we can request the token directly from the extension frame.
            var innerTokenPromise: IPromise<Authentication_Contracts_Async.WebSessionToken>;
            if (isVssHostFrame()) {
                var authClient = new _AuthenticationClient.AuthenticationHttpClient(Context.getDefaultWebContext().host.relativeUri);
                innerTokenPromise = authClient.createSessionToken(sessionToken);
            } else {
                var vss = (<any>window).VSS;
                if (vss && vss.getAccessToken) {
                    innerTokenPromise = vss.getAccessToken();
                } else {
                    throw new Error("VSS.SDK is not currently loaded");
                }
            }

            return innerTokenPromise.then((token) => {
                this._tokenExpirationTime = token.validTo;
                return token;
            });
        });

        return this._tokenPromise;
    }

    /**
     * Gets the authorization header to use in a request from the given token
     *
     * @param sessionToken Used for token key.
     * @return the value to use for the Authorization header in a request.
     */
    public getAuthorizationHeader(sessionToken: Authentication_Contracts_Async.WebSessionToken): string {
        if (!sessionToken || !sessionToken.token) {
            throw Resources_Platform.SessionTokenNotReady;
        }
        return BearerAuthHelpers.getBearerAuthHeader(sessionToken.token);
    }
}

/**
* IAuthTokenManager for an explicit basic auth token.
*/
export class BasicAuthTokenManager implements IAuthTokenManager<string> {

    private _user: string;
    private _password: string;

    constructor(user: string, password: string) {
        this._user = user;
        this._password = password;
    }

    /**
    * Get the auth token to use for this request.
    */
    public getAuthToken(refresh?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<string> {

        if (!tokenRequired(webContext)) {
            return Q(null);
        }

        return Q.resolve(BasicAuthHelpers.getBasicAuthValue(this._user, this._password));
    }

    /**
     * Gets the authorization header to use in a request from the given token
     *
     * @param sessionToken Used for token key.
     * @return the value to use for the Authorization header in a request.
     */
    public getAuthorizationHeader(sessionToken: string): string {
        return BasicAuthHelpers.getBasicAuthHeader(this._user, this._password);
    }
}

export class BearerAuthTokenManager implements IAuthTokenManager<string> {

    protected _token: string;

    constructor(token: string) {
        this._token = token;
    }

    /**
    * Get the auth token to use for this request.
    */
    public getAuthToken(refresh?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<string> {

        if (!tokenRequired(webContext)) {
            return Q(null);
        }

        return Q.resolve(this._getTokenHeader());
    }

    /**
     * Gets the authorization header to use in a request from the given token
     *
     * @param sessionToken Used for token key.
     * @return the value to use for the Authorization header in a request.
     */
    public getAuthorizationHeader(sessionToken: string): string {
        return this._getTokenHeader();
    }

    protected _getTokenHeader() {
        return BearerAuthHelpers.getBearerAuthHeader(this._token);
    }
}

export class WebSessionTokenManager extends BearerAuthTokenManager {

    private _sessionToken: Authentication_Contracts_Async.WebSessionToken;
    private _hostUrl: string;

    constructor(sessionToken: Authentication_Contracts_Async.WebSessionToken, hostUrl?: string) {
        super(sessionToken.token);
        this._sessionToken = sessionToken;
        this._hostUrl = hostUrl;
    }

    /**
    * Get the auth token to use for this request.
    */
    public getAuthToken(refresh?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<string> {

        if (!tokenRequired(webContext)) {
            return Q(null);
        }

        let sessionToken = this._sessionToken;

        if (sessionToken && sessionToken.validTo) {
            // Check 1 minute before to prevent issues caused by network latency
            if (new Date().getTime() < (new Date(sessionToken.validTo).getTime() - 60000)) {
                return Q.resolve(this._getTokenHeader());
            }
        }

        //request new token
        let authTokenManager = this._hostUrl ? new AuthTokenManager(this._hostUrl) : defaultAuthTokenManager;

        return authTokenManager.getToken(sessionToken.appId, null, null, true).then((sessionToken: Authentication_Contracts_Async.WebSessionToken) => {
            this._sessionToken = sessionToken;
            this._token = sessionToken.token;
            return this._getTokenHeader();
        });
    }
}

var defaultAuthTokenManager = new AuthTokenManager();
var namedTokenManagers: IDictionaryStringTo<IAuthTokenManager<any>> = {};

/**
* Exposes the default auth token manager for collection-level tokens
*/
export var authTokenManager: IAuthTokenManager<any> = defaultAuthTokenManager;

/**
* Fetch a session token to use for the current user for the given application (or null/empty for an unscoped token).
*
* @param appId Id of the application.
* @param name Metadata info to identify the token.
* @param force Enables skipping cache and issue a brand new token.
* @param scoped
* @param webContext WebContext to use when getting auth token. If not specified, default page context is used.
* @return Session token.
*/
export function getToken(appId?: string, name?: string, force?: boolean, scoped?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {
    return defaultAuthTokenManager.getToken(appId, name, force, scoped, webContext);
}

/**
* Fetch an app token to use for the current user for the given application.  This can be used to authenticate
* with an external application.
*
* @param appId Id of the application.
* @param name Metadata info to identify the token.
* @param force Enables skipping cache and issue a brand new token.
* @param webContext WebContext to use when getting auth token. If not specified, default page context is used.
* @return Session token.
*/
export function getAppToken(appId: string, name?: string, force?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {
    return defaultAuthTokenManager.getAppToken(appId, name, force, webContext);
}

/**
 * Fetch a session token to use for the current user for the given extension
 *
 * @param publisherName Id of the publisher.
 * @param extensionName Id of the extension.
 * @param force Enables skipping cache and issue a brand new token.
 * @return Session token.
 */
export function getExtensionToken(publisherName: string, extensionName: string, force?: boolean, webContext?: Contracts_Platform.WebContext): IPromise<Authentication_Contracts_Async.WebSessionToken> {
    return defaultAuthTokenManager.getExtensionToken(publisherName, extensionName, force, webContext);
}

/**
* Get an auth token manager - either the default manager or the manager for a registered/named token
*
* @param namedToken Id Optional value to use when getting a named web session token.
*/
export function getAuthTokenManager(namedTokenId?: string): IAuthTokenManager<any> {
    if (namedTokenId) {
        var tokenManager = namedTokenManagers[namedTokenId];
        if (!tokenManager) {
            tokenManager = new NamedWebSessionTokenManager(namedTokenId);
            namedTokenManagers[namedTokenId] = tokenManager;
        }
        return tokenManager;
    }
    else {
        return authTokenManager;
    }
}

function isVssHostFrame() {
    return window.top === window.self || Context.getPageContext().navigation.area === "BuiltInExtensions" || !(<any>window).VSS || !(<any>window).VSS.getAccessToken;
}
