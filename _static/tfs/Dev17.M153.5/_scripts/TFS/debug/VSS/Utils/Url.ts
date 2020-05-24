
import Diag = require("VSS/Diag");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import Utils_Constants = require("VSS/Utils/Constants");
import VSS = require("VSS/VSS");

export const MAX_URL_PATH_LENGTH = 2000;

const enum KeyCodes {
    asterisk = 42,
    endCurlyBrace = 125,
    startCurlyBrace = 123
}

var handleError = VSS.handleError;

interface IUrlTranslator {
    translator: Function;
    order: number;
}

/**
 * Check if specified URL is safe - i.e. part of an approved list of URL schemes.
 * 
 * @param url Url to check.
 * @returns {boolean}
 */
export function isSafeProtocol(url: string): boolean {

    Diag.Debug.assert(typeof url === "string");

    var trimUrl = url.trim();
    var indexOfSchemeDelimiter = trimUrl.indexOf(":");
    if (indexOfSchemeDelimiter >= 0) {
        var scheme = trimUrl.substr(0, indexOfSchemeDelimiter);
        for (var i = 0; i < Utils_Constants.UrlConstants.SafeUriSchemes.length; i++) {
            if (Utils_String.ignoreCaseComparer(scheme, Utils_Constants.UrlConstants.SafeUriSchemes[i]) === 0) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Return a new url that adds (if the given parameter name does not exist in the url),
 * or replaces the value of given parameter name with the given parameter value.
 * 
 * @param url The original url.  
 * @param paramName The parameter name to replace in the url.  
 * @param paramValue The parameter value to replace in the url. 
 * @returns {string}
 */
export function replaceUrlParam(url: string, paramName: string, paramValue: string): string {
    var searchIndex = -1;
    if (paramName && paramValue) {
        searchIndex = url.search(paramName + "=" + paramValue);
    }

    if (searchIndex >= 0) {
        // if the given url already contains the parameter of the given value.
        return url;
    }

    var pattern = new RegExp('(' + paramName + '=).*?(&|$)');
    var newUrl = url.replace(pattern, '$1' + paramValue + '$2');
    if (newUrl === url) {
        newUrl = newUrl + (newUrl.indexOf('?') > 0 ? '&' : '?') + paramName + '=' + paramValue;
    }

    return newUrl;
}

/**
 * Verifies that the given url is within the constraints of 2000 characters.
 * 
 * @param url The url to verify.
 * @returns {boolean}
 */
export function isUrlWithinConstraints(url: string): boolean {
    return url && url.length <= 2000;
}

export class UrlTranslatorService {
    private _urlTranslators: IUrlTranslator[] = [];

    /**
     * Registers a URL translator function.
     * 
     * @param translatorFunction The translator function of the form function(url, options, successCallback, errorCallback, nextTranslator){}
     * @param order The order of the translator function.
     */
    public registerUrlTranslator(translatorFunction: Function, order?: number) {

        this._urlTranslators.push({
            translator: translatorFunction,
            order: order || 100
        });

        this._urlTranslators.sort(function (ta, tb) {
            return ta.order - tb.order;
        });
    }

    public beginTranslateUrl(url: string, options?: any, callback?: IFunctionPR<string, any>, errorCallback?: IErrorCallback) {
        var that = this;
        var translatorIndex = 0;

        function succeeded(url: string) {
            if ($.isFunction(callback)) {
                callback.call(that, url);
            }
        }

        function failed(error: TfsError) {
            handleError(error, errorCallback, that);
        }

        function next() {
            var translatorEntry = that._urlTranslators[translatorIndex++];

            if (translatorEntry) {
                translatorEntry.translator.call(that, url, options, succeeded, failed, next);
            } else {
                succeeded(url);
            }
        }

        if (url) {
            if (isSafeProtocol(url)) {
                next();
            } else {
                return succeeded(null);
            }
        } else {
            succeeded(url);
        }
    }
}

var urlTranslatorService = new UrlTranslatorService();

export function getTranslatorService(): UrlTranslatorService {
    return urlTranslatorService;
}

/**
 * Extract query parameters as a dictionary
 */
export function getQueryParameters(url: string): IDictionaryStringTo<string> {
    const result: IDictionaryStringTo<string> = {};
    const queryParameters = Uri.parse(url).queryParameters;
    for (let p of queryParameters) {
        if (!result[p.name]) {
            result[p.name] = p.value;
        }
    }
    return result;
}

/**
* A single query parameter entry in a Uri
*/
export interface IQueryParameter {

    /**
    * Unencoded name of the query parameter
    */
    name: string;

    /**
    * Unencoded value of the query parameter
    */
    value: string;

    /**
     * Determines if this query paramter contains a empty value part ("a="). 
     * We use this information to ensure we can recreate the same string. This
     * allows us to tell the different between this "a&b&c" versus "a=&b=&c=" which
     * matters to some customers.
     */
    hasEmptyValuePart?: boolean
}

/**
* Options for parsing a Uri string
*/
export interface IUriParseOptions {

    /**
    * If true, throw if the Uri is not absolute
    */
    absoluteUriRequired?: boolean;
}

/**
* Class that represents a Uri and allows parsing/getting and setting of individual parts
*/
export class Uri {

    /**
    * The uri scheme such as http or https
    */
    public scheme: string;

    /**
     * If true, do not emit the "//" separator after the scheme:
     * Set to true for schemes like mailto (e.g. mailto:foo@bar)
     */
    public noSchemeSeparator: boolean;

    /**
    * The uri hostname (does not include port or scheme)
    */
    public host: string;

    /**
    * The port number of the uri as supplied in the url. 0 if left out in the url (e.g. the default port for the scheme).
    */
    public port: number;

    /**
    * The relative path of the uri
    */
    public path: string;

    /**
    * The array of query parameters in the uri
    */
    public queryParameters: IQueryParameter[];

    /**
    * The hash string of the uri
    */
    public hashString: string;

    /**
    * Parse a uri string into a Uri member
    *
    * @param uri Uri string to parse
    * @param options Options for parsing the uri string
    */
    public static parse(uri: string, options?: IUriParseOptions): Uri {
        var newUri = new Uri();
        newUri._setFromUriString(uri, options);
        return newUri;
    }

    /**
    * Create a new Uri.
    *
    * @param uri Optional uri string to populate values with
    */
    constructor(uri?: string) {
        if (uri) {
            this._setFromUriString(uri, null);
        }
    }

    private _setFromUriString(uriString: string, options?: IUriParseOptions) {
        var uri = uriString;

        // Parse out the hash string
        var hashSplit = Utils_String.singleSplit(uri, "#");
        if (hashSplit.match) {
            uri = hashSplit.part1;
            this.hashString = this._decodeUriComponent(hashSplit.part2);
        }
        else {
            this.hashString = "";
        }

        // Parse the query parameters
        var querySplit = Utils_String.singleSplit(uri, "?");
        if (querySplit.match) {
            uri = querySplit.part1;
            this.queryString = querySplit.part2;
        }
        else {
            this.queryParameters = [];
        }

        this.scheme = "";
        this.host = "";
        this.port = 0;
        this.path = "";

        // Parse out the scheme components of the uri
        this.noSchemeSeparator = false;
        var schemeSplit = Utils_String.singleSplit(uri, ":");
        if (schemeSplit.match) {
            this.scheme = schemeSplit.part1;
            uri = schemeSplit.part2;

            if (uri.substr(0, 2) === "//") {
                uri = uri.substr(2);

                // Parse out the path part of the uri
                var pathSplit = Utils_String.singleSplit(uri, "/");
                if (pathSplit.match) {
                    uri = pathSplit.part1;
                    this.path = pathSplit.part2;
                }
                else {
                    this.path = "";
                }

                // Parse out the port number
                var portSplit = Utils_String.singleSplit(uri, ":");
                if (portSplit.match) {
                    this.host = portSplit.part1;
                    this.port = parseInt(portSplit.part2);

                    if (isNaN(this.port)) {
                        // Segment after : was not a port, consider it part of the path
                        this.host += ":";
                        this.path = portSplit.part2 + "/" + this.path;
                    }
                }
                else {
                    this.host = uri;
                }
            }
            else {
                // No host for schemes like mailto: just use path
                this.noSchemeSeparator = true;
                this.path = uri;
            }
        }
        else {
            // Relative Url was given
            this.path = uri;
        }

        if (options && options.absoluteUriRequired && !this.scheme) {
            throw new Error(`The uri string "${uriString}" does not represent a valid absolute uri.`);
        }
    }

    private _decodeUriComponent(value: string): string {
        if (value) {
            // Replace "+" character with %20.
            value = value.replace(/\+/g, "%20");
            value = decodeURIComponent(value);
        }
        return value;
    }

    /**
    * Get the absolute uri string for this Uri
    */
    public get absoluteUri(): string {
        var uri = "";

        if (this.scheme) {
            uri = encodeURI(decodeURI(this.scheme)) + ":";
            if (!this.noSchemeSeparator) {
                uri += "//";
            }
        }

        if (this.host) {
            uri += encodeURI(decodeURI(this.host));

            if (this.port) {
                uri += ":" + this.port;
            }

            if (!this.noSchemeSeparator || this.path) {
                uri += "/";
            }
        }

        if (this.path) {
            let encodedPath: string;
            if (this.noSchemeSeparator) {
                // Only do simple encoding for schemes like mailto: or blob: where
                // we can't determine host versus path
                encodedPath = encodeURI(decodeURI(this.path));
            }
            else {
                const parts = this.path.split('/');
                encodedPath = parts.map(p => encodeURIComponent(decodeURIComponent(p))).join("/");
            }
            
            if (this.host) {
                uri = Utils_File.combinePaths(uri, encodedPath);
            }
            else {
                uri = uri + encodedPath;
            }
        }

        var queryString = this.queryString;
        if (queryString) {
            uri += "?" + queryString;
        }

        if (this.hashString) {
            uri += "#" + encodeURI(this.hashString);
        }

        return uri;
    }

    /**
    * Set the absolute uri string for this Uri. Replaces all existing values
    */
    public set absoluteUri(uri: string) {
        this._setFromUriString(uri || "");
    }

    /**
     * Gets the effective port number, returning the default port number if omitted for the given scheme.
     */
    public getEffectivePort(): number {
        if (this.port) {
            return this.port;
        }
        else {
            if (Utils_String.equals(this.scheme, "http", true)) {
                return 80;
            }
            else if (Utils_String.equals(this.scheme, "https", true)) {
                return 443;
            }
            else {
                return 0;
            }
        }
    }

    /**
    * Get the query string for this Uri.
    */
    public get queryString(): string {
        if (this.queryParameters && this.queryParameters.length) {
            return this.queryParameters.map((param) => {
                if (param.value) {
                    return encodeURIComponent(param.name) + "=" + encodeURIComponent(param.value);
                }
                else if (param.hasEmptyValuePart) {
                    // If the user gave us a string like "a=", we should give it back to them.
                    return encodeURIComponent(param.name) + "=";
                }
                else {
                    return encodeURIComponent(param.name);
                }
            }).join("&");
        }
        else {
            return "";
        }
    }

    /**
    * Set the query string for this Uri. Replaces existing value
    */
    public set queryString(queryString: string) {
        this.queryParameters = [];
        queryString.split('&').forEach((pair) => {
            if (pair) {
                var valueSplit = Utils_String.singleSplit(pair, "=");
                var value = valueSplit.match ? this._decodeUriComponent(valueSplit.part2) : "";
                this.queryParameters.push({ name: this._decodeUriComponent(valueSplit.part1), value: value, hasEmptyValuePart: valueSplit.match &&  !value });
            }
        });
    }

    /**
    * Get the value of the query parameter with the given key
    *
    * @param name Query parameter name
    */
    public getQueryParam(name: string): string {
        var value: string;
        if (this.queryParameters) {
            var matchingPairs = this.queryParameters.filter(p => Utils_String.equals(p.name, name, true));
            if (matchingPairs.length > 0) {
                value = matchingPairs[0].value;
            }
        }

        return value;
    }

    /**
    * Adds a query string parameter to the current uri
    *
    * @param name The Query parameter name
    * @param value The Query parameter value
    * @param replaceExisting If true, replace all existing parameters with the same name
    */
    public addQueryParam(name: string, value: string, replaceExisting?: boolean) {
        if (!this.queryParameters) {
            this.queryParameters = [];
        }
        if (replaceExisting) {
            this.queryParameters = this.queryParameters.filter(p => !Utils_String.equals(p.name, name, true));
        }
        this.queryParameters.push({ name: name, value: value });
    }
}

/**
 * Determines whether the specified URL is absolute or not.
 *
 * @param url Url to check.
 * @returns {boolean}
 */
export function isAbsoluteUrl(url: string): boolean {
    if (!url) {
        return false;
    }

    url = url.toLowerCase();
    return url.indexOf("http:") === 0 || url.indexOf("https:") === 0 || url.indexOf("//") === 0;
}

/**
 * Do the given urls have the same origin (scheme, host and port)
 *
 * @param url1 First url to check
 * @param url2 Second url to check
 */
export function isSameOrigin(url1: string, url2: string): boolean {
    const uri1 = new Uri(url1);
    const uri2 = new Uri(url2);

    return Utils_String.equals(uri1.host, uri2.host, true) &&
        uri1.getEffectivePort() === uri2.getEffectivePort();
}

/**
 * Combines 2 url paths. If 'url' is an absolute url, then it is returned
 * without attempting to prepend baseUrl.
 *
 * @param baseUrl The root url that the resulting url should start with
 * @param url If a relative url, it is appended to baseUrl (with a "/" separator). If absolute, it is returned as-is.
 */
export function combineUrl(baseUrl: string, url: string) {

    if (isAbsoluteUrl(url)) {
        return url;
    }

    return Utils_File.combinePaths(baseUrl, url);
}

/**
 * Checks if specified URL is an external URL to the current window.
 * If relative URL is provided - returns false.
 * @param url Url to check
 */
export function isExternalUrl(url: string): boolean {
    return isAbsoluteUrl(url) && !isSameOrigin(url, window.location.href);
}

/**
 * Represents a route parsed by parseRoute
 */
export interface IParsedRoute {

    /**
     * Array of the segements in the route
     */
    segments: IParsedRouteSegment[];
}

/**
 * And individual segment of the route (fixed text or a parameter)
 */
export interface IParsedRouteSegment {

    /**
     * If present, the fixed text for this segement. Either text or paramName will be defined for a segment, never both.
     */
    text?: string;

    /**
     * If present, the name of the route value parameter to substitute for this segment. Either text or paramName will be defined for a segment, never both.
     */
    paramName?: string;

    /**
     * For parameters, whether or not this parameter is a wildcard (*) parameter, which means it allows multiple path segments (i.e. don't escape "/")
     */
    isWildCardParam?: boolean;

    /**
     * Whether the parameter is required in order for the URL to be valid.
     */
    isRequiredParam?: boolean;
}

/**
 * Parse a route template into a structure that can be used to quickly do route replacements
 * 
 * @param routeTemplate MVC route template string (like "/foo/{id}/{*params}")
 */
export function parseRouteTemplate(routeTemplate: string): IParsedRoute {

    const parsedRoute: IParsedRoute = {
        segments: []
    };

    let paramStartIndex = -1;
    let segmentStartIndex = -1;
    let segmentPrefix = "";

    for (let charIndex = 0, routeTemplateLen = routeTemplate.length; charIndex < routeTemplateLen; charIndex++) {
        let c = routeTemplate.charCodeAt(charIndex);

        if (paramStartIndex >= 0) {
            if (c === KeyCodes.endCurlyBrace) {

                let paramName = routeTemplate.substring(paramStartIndex, charIndex);
                let isWildCardParam = false;

                if (paramName.charCodeAt(0) === KeyCodes.asterisk) {
                    paramName = paramName.substr(1);
                    isWildCardParam = true;
                }

                parsedRoute.segments.push({
                    paramName,
                    isWildCardParam
                });

                paramStartIndex = -1;
            }
        }
        else {
            if (c === KeyCodes.startCurlyBrace && routeTemplate.charCodeAt(charIndex + 1) !== KeyCodes.startCurlyBrace) {
                // Start of a parameter
                if (segmentPrefix || segmentStartIndex >= 0) {

                    // Store the previous segment
                    let segmentText = segmentPrefix;
                    if (segmentStartIndex >= 0) {
                        segmentText += routeTemplate.substring(segmentStartIndex, charIndex);
                    }

                    if (segmentText) {
                        parsedRoute.segments.push({
                            text: segmentText
                        });
                    }

                    // Reset the segment tracking info
                    segmentStartIndex = -1;
                    segmentPrefix = "";
                }
                paramStartIndex = charIndex + 1;
            }
            else {

                // Handle double {{ or double }} as an escape sequence. This is rare. For simplicity we will 
                if ((c === KeyCodes.startCurlyBrace && routeTemplate.charCodeAt(charIndex + 1) === KeyCodes.startCurlyBrace) ||
                    (c === KeyCodes.endCurlyBrace && routeTemplate.charCodeAt(charIndex + 1) === KeyCodes.endCurlyBrace)) {

                    segmentPrefix = segmentPrefix + routeTemplate.substring(segmentStartIndex >= 0 ? segmentStartIndex : charIndex, charIndex + 1);
                    segmentStartIndex = -1;
                    charIndex++;
                }

                if (segmentStartIndex < 0) {
                    segmentStartIndex = charIndex;
                }
            }
        }
    }

    // Store any pending segment
    if (segmentStartIndex >= 0 || paramStartIndex >= 0) {
        const segmentText = segmentPrefix + routeTemplate.substring(segmentStartIndex >= 0 ? segmentStartIndex : paramStartIndex);
        if (segmentText) {
            parsedRoute.segments.push({
                text: segmentText
            });
        }
    }

    // Mark any param as required if it has a text segment (other than just "/") after it
    let required = false;
    for (let i = parsedRoute.segments.length - 1; i >= 0; i--) {
        let segment = parsedRoute.segments[i];
        if (segment.text && segment.text !== "/") {
            required = true;
        }
        else if (required && segment.paramName) {
            segment.isRequiredParam = true;
        }
    }

    return parsedRoute;
}

/**
 * Take a set of routes and route values and form a url using the best match. The best match
 * is the route with the highest number of replacements (of the given routeValues dictionary).
 * In the event of a tie (same number of replacements) the route that came first wins.
 * 
 * @param routeCollection Array of parsed routes
 * @param routeValues Replacement values
 */
export function routeUrl(routeCollection: IParsedRoute[], routeValues: { [name: string]: string }): string {

    let bestMatch = getBestRouteMatch(routeCollection, routeValues);
    if (!bestMatch) {
        return "";
    }

    let uri = new Uri(bestMatch.url);
    for (let routeValueKey in routeValues) {
        if (!bestMatch.matchedParameters[routeValueKey]) {
            uri.addQueryParam(routeValueKey, routeValues[routeValueKey]);
        }
    }

    return uri.absoluteUri;
}

/**
 * Take a set of routes and find the best match. The best match is the route with the highest number of replacements
 * (of the given routeValues dictionary). In the event of a tie (same number of replacements) the route that came first wins.
 * 
 * @param routeCollection Array of parsed routes
 * @param routeValues Replacement values
 */
export function getBestRouteMatch(routeCollection: IParsedRoute[], routeValues: { [name: string]: string }): IRouteMatchResult | undefined {

    let bestMatch: IRouteMatchResult | undefined;
    let totalRouteValues = Object.keys(routeValues).length;

    for (let route of routeCollection) {
        let match = replaceParsedRouteValues(route, routeValues, false);
        if (match && (!bestMatch || match.matchedParametersCount > bestMatch.matchedParametersCount)) {
            bestMatch = match;

            if (match.matchedParametersCount === totalRouteValues) {
                // This route matched all route values. Return its url directly (no need to even add query params)
                return bestMatch;
            }
        }
    }

    return bestMatch;
}

/**
 * Result of a call to replace route values for a parsed route
 */
export interface IRouteMatchResult {

    /**
     * Resulting URL from the template replacement. Does NOT include any query parameters that would be added from extra route values. 
     */
    url: string;

    /**
     * Dictionary of the route value keys that were used as replacements
     */
    matchedParameters: { [key: string]: boolean };

    /**
     * The number of parameter replacements made
     */
    matchedParametersCount: number;
}

/**
 * Replace route values for a specific parsed route
 * 
 * @param parsedRoute The route to evaluate
 * @param routeValues Dictionary of route replacement parameters
 * @param continueOnUnmatchedSegements If true, continue with replacements even after a miss. By default (false), stop replacements once a parameter is not present.
 */
export function replaceParsedRouteValues(parsedRoute: IParsedRoute, routeValues: { [name: string]: string }, continueOnUnmatchedSegements?: boolean): IRouteMatchResult | undefined {

    let urlParts: string[] = [];
    let matchedParameters: { [key: string]: boolean } = {};
    let matchedParametersCount = 0;

    for (let segmentIndex = 0, l = parsedRoute.segments.length; segmentIndex < l; segmentIndex++) {
        const segment = parsedRoute.segments[segmentIndex];

        if (segment.text) {
            let segmentText = segment.text;
            if (continueOnUnmatchedSegements) {
                // Make sure we don't have consecutive slash (/) characters in the case of missing segments
                if (segmentIndex > 0 && segmentText.charAt(0) === "/") {
                    if (urlParts.length === 0) {
                        // First text segment after one or more missing parameter segments. Remove the leading slash.
                        segmentText = segmentText.substr(1);
                    }
                }
            }

            if (segmentText) {
                urlParts.push(segmentText);
            }
        }
        else {
            const value = routeValues[segment.paramName!];
            if (!value) {
                // The route value was not supplied
                if (!continueOnUnmatchedSegements) {
                    if (segment.isRequiredParam) {
                        // This is a required parameter. Return undefined since this route was not a match.
                        return undefined;
                    }
                    else {
                        // This is an omitted optional parameter. Return what we've computed so far.
                        break;
                    }
                }
                else if (urlParts.length) {
                    // Unmatched segment being omitted. Remove any previously trailing slash
                    let lastSegment = urlParts[urlParts.length - 1];
                    if (lastSegment[lastSegment.length - 1] === "/") {
                        urlParts[urlParts.length - 1] = lastSegment.substr(0, lastSegment.length - 1);
                    }
                }
            }
            else {
                urlParts.push(segment.isWildCardParam ? encodeURI(value) : encodeURIComponent(value));
                matchedParameters[segment.paramName!] = true;
                matchedParametersCount++;
            }
        }
    }

    return {
        url: urlParts.join(""),
        matchedParameters,
        matchedParametersCount
    };
}

/**
 * Take an MVC route template (like "/foo/{id}/{*params}") and replace the templated parts with values from the given dictionary
 * 
 * @param routeTemplate MVC route template (like "/foo/{id}/{*params}")
 * @param routeValues Route value replacements
 */
export function replaceRouteValues(routeTemplate: string, routeValues: { [name: string]: string }): string {
    let parsedRoute = parseRouteTemplate(routeTemplate);
    return replaceParsedRouteValues(parsedRoute, routeValues, true)!.url;
}