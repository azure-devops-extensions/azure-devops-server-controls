
/// Imports of 3rd Party ///
import Q = require("q");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Service = require("VSS/Service");
import Telemetry_RestClient = require("VSS/Telemetry/RestClient");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");

interface IAppInsightsObject {
    trackPageView(name?: string, url?: string, properties?: { [key: string]: string }, measurements?: { [key: string]: number }): void;
    trackEvent(name: string, properties?: { [key: string]: string }, measurements?: { [key: string]: string }): void;
    trackMetric(name: string, average: number, sampleCount?: number, min?: number, max?: number): void;
    trackException(exception: Error, handledAt?: string, properties?: Object, measurements?: Object): void;
    trackTrace(message: string, properties?: Object, measurements?: Object): void;
    flush(): void;
}

module AppInsights {

    var _appInsightsObject: IAppInsightsObject;
    var _configuration: Contracts_Platform.AppInsightsConfiguration;
    var _pageName: string;
    var _pageProperties: { [key: string]: string };
    var _pageMetric: { [key: string]: number };

    export function getPageName() {
        return _pageName;
    }

    export function getPageProperties() {
        return _pageProperties;
    }

    export function getPageMetric() {
        return _pageMetric;
    }

    export function configureAppInsights(configuration: Contracts_Platform.AppInsightsConfiguration) {

        _configuration = configuration;

        var appInsightsConfig: any = {
            instrumentationKey: configuration.instrumentationKey
        };

        // Set the user and account ids
        if (pageContext) {
            if (pageContext.webContext.user) {
                appInsightsConfig.appUserId = pageContext.webContext.user.id;
            }
            if (pageContext.webContext.account) {
                appInsightsConfig.accountId = pageContext.webContext.account.id;
            }
        }

        _appInsightsObject = (<any>window).appInsights || function (config) {
            function s(config) { t[config] = function () { var i = arguments; t.queue.push(function () { t[config].apply(t, i) }) } } var t: any = { config: config }, r = document, f: any = window, e = "script", o: any = r.createElement(e), i, u; for (o.src = config.url || configuration.insightsScriptUrl, r.getElementsByTagName(e)[0].parentNode.appendChild(o), t.cookie = r.cookie, t.queue = [], i = ["Event", "Exception", "Metric", "PageView", "Trace"]; i.length;)s("track" + i.pop()); return config.disableExceptionTracking || (i = "onerror", s("_" + i), u = f[i], f[i] = function (config, r, f, e, o) { var s = u && u(config, r, f, e, o); return s !== !0 && t["_" + i](config, r, f, e, o), s }), t
        } (appInsightsConfig);

        (<any>window).appInsights = _appInsightsObject;

        initializePageData();

        if (configuration.autoTrackPage) {
            logPageView(getPageName(), getPageProperties(), getPageMetric());
        }
    }

    function initializePageData() {
        var pageContext = Context.getPageContext(),
            scope: string;

        // Set the target page url
        if (_configuration && _configuration.customTrackPageData && _configuration.customTrackPageData.pageName) {
            _pageName = _configuration.customTrackPageData.pageName;
        }
        else if (pageContext) {
            // custom pathing for the page hierarchy
            // we will build it to be: controllername/controlleraction/[collection/teamproject/teamname OR scope][/areaName]
            _pageName = pageContext.navigation.currentController + "/" + pageContext.navigation.currentAction;

            // fill out the rest of the path for collection/project/team
            if (_configuration && _configuration.trackProjectInfo) {
                if (pageContext.webContext.collection) {
                    _pageName = _pageName + "/" + pageContext.webContext.collection.name;
                }
                if (pageContext.webContext.project) {
                    _pageName = _pageName + "/" + pageContext.webContext.project.name;
                }
                if (pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Team) {
                    _pageName = _pageName + "/" + pageContext.webContext.team.name;
                }
            }
            else {
                if (pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Team) {
                    scope = "team";
                }
                else if (pageContext.webContext.project) {
                    scope = "project";
                }
                else if (pageContext.webContext.collection) {
                    scope = "collection";
                }
                else {
                    scope = "account";
                }
                _pageName = _pageName + "/" + scope;
            }

            if (pageContext.navigation.area) {
                _pageName = _pageName + "/" + pageContext.navigation.area;
            }
        }

        // Set the default properties for the page
        if (_configuration && _configuration.customTrackPageData && _configuration.customTrackPageData.properties) {
            _pageProperties = _configuration.customTrackPageData.properties;
        }
        else if (pageContext) {
            _pageProperties = {
                hasQueryString: location.search ? "true" : "false",
                hasHashPath: location.hash ? "true" : "false"
            };

            // fill out the rest of the path for collection/project/team
            if (_configuration && _configuration.trackProjectInfo) {
                if (pageContext.webContext.collection) {
                    _pageProperties["Collection"] = pageContext.webContext.collection.name;
                }
                if (pageContext.webContext.project) {
                    _pageProperties["TeamProject"] = pageContext.webContext.project.name;
                }
                if (pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Team) {
                    _pageProperties["Team"] = pageContext.webContext.team.name;
                }
            }
        }

        // Set the metric for the page
        if (_configuration && _configuration.customTrackPageData && _configuration.customTrackPageData.metrics) {
            _pageMetric = _configuration.customTrackPageData.metrics;
        }
    }

    export function trackWebEvent(eventName: string, eventPath: string, dimData?: any, elapsed?: number) {
        if (_appInsightsObject) {
            var properties: any,
                metric: any;

            if (dimData) {
                properties = $.extend({}, dimData);
            }
            if (elapsed || elapsed === 0) {
                metric = { elapsed: elapsed };
            }
            logEvent(eventPath + "/" + eventName, properties, metric);
        }
    }

    export function logEvent(eventName: string, properties?: { [key: string]: string }, metric?: { [key: string]: string }) {
        if (_appInsightsObject) {
            _appInsightsObject.trackEvent(eventName, properties, metric);
        }
    }

    export function logPageView(pageName?: string, properties?: { [key: string]: string }, metric?: { [key: string]: number }) {
        if (_appInsightsObject) {
            _appInsightsObject.trackPageView(pageName, null, properties, metric);
        }
    }
}

var pageContext = Context.getPageContext();
function isAppInsightsEnabled() {
    return pageContext && pageContext.appInsightsConfiguration && pageContext.appInsightsConfiguration.enabled;
}

if (isAppInsightsEnabled()) {
    AppInsights.configureAppInsights(pageContext.appInsightsConfiguration);
}

/**
 * Event data that can be published
 */
export class TelemetryEventData {
    public area: string;
    public feature: string;
    public properties: { [key: string]: any };
    public elapsedTime: number;
    public serviceInstanceType?: string;

    /**
     * Constructor for CIPublishPropertiesOptions.
     *
     * @param area The Customer Intelligence Area to publish to.
     * @param feature The feature name.
     * @param properties The key:value list of event properties.
     * @param elapsedTime The elapsedTime for the event. Defaults to Date.now() - startTime if startTime is supplied.
     * @param startTime The Date.now() at the start of the event process.
     * @param serviceInstanceType The id of the service instance type to send the telemetry to
     */
    constructor(area: string, feature: string, properties: { [key: string]: any }, startTime?: number, elapsedTime?: number, serviceInstanceType?: string) {
        this.area = area;
        this.feature = feature;
        this.properties = properties;
        if (startTime) {
            this.elapsedTime = Date.now() - startTime;
            this.properties["StartTime"] = startTime;
        }
        if (elapsedTime) {
            this.elapsedTime = elapsedTime;
        }

        var pageContext = Context.getPageContext();
        if (pageContext && pageContext.diagnostics.sessionId) {
            this.properties["SessionId"] = pageContext.diagnostics.sessionId;
        }

        this.serviceInstanceType = serviceInstanceType;
    }

    /**
     * Create Telemetry event data from a single property
     */
    public static fromProperty(area: string, feature: string, property: string, value: any, startTime?: number, elapsedTime?: number) {
        var properties: { [key: string]: any } = {};
        properties[property] = value;

        return new TelemetryEventData(area, feature, properties, startTime, elapsedTime);
    }

    /**
     * Create telemetry event data for an explicit service instance type
     */
    public static forService(area: string, feature: string, serviceInstanceType: string, properties?: { [key: string]: any }) {
        return new TelemetryEventData(area, feature, properties || {}, undefined, undefined, serviceInstanceType);
    }
}

/**
 * Handler that can modify properties of telemetry events before they are sent to the server
 */
export interface ITelemetryEventHandler {
    (event: TelemetryEventData): void;
}

/**
 * Service used to report telemetry via CI events and app insights
 */
class TelemetryService {

    private static MAX_RETRIES = 5;
    private _items: Array<TelemetryEventData>;
    private _delayFunction: Utils_Core.DelayedFunction;
    private _retries = 0;
    private _subscribers: ITelemetryEventHandler[] = [];

    constructor() {
        this._items = new Array<TelemetryEventData>();
        this._delayFunction = new Utils_Core.DelayedFunction(this, 1000, "TelemetryPublish", () => {
            var ready: boolean = false;
            if (window.performance && window.performance.timing) {
                if (window.performance.timing.loadEventEnd && window.performance.timing.loadEventEnd > 0) {
                    ready = true;
                }
            } else {
                ready = true;
            }

            if (!ready && this._retries < TelemetryService.MAX_RETRIES) {
                this._retries++;
                this._delayFunction.reset();
            } else {
                Q(this.flush()).done(null, () => { });
            }
        });
    }

    private _getHttpClient(serviceInstanceType: string): Telemetry_RestClient.CustomerIntelligenceHttpClient {
        return Service.getClient(Telemetry_RestClient.CustomerIntelligenceHttpClient, undefined, serviceInstanceType, undefined, { showProgressIndicator: false });
    }

    public delayedPublish(options: TelemetryEventData) {
        if (options.elapsedTime) {
            options.properties["ElapsedTime"] = options.elapsedTime;
        }
        this._items.push(options);
        if (!this._delayFunction.isPending()) {
            this._delayFunction.start();
        }
    }

    /**
     * Flush pending telemetry events
     */
    public flush(): IPromise<void> {
        var items = this._items;
        this._items = [];
        return this._publish(items);
    }

    public publish(data: TelemetryEventData): IPromise<void> {
        return this._publish([data]);
    }

    public subscribe(handler: ITelemetryEventHandler): void {
        this._subscribers.push(handler);
    }

    public unsubscribe(handler: ITelemetryEventHandler): void {
        this._subscribers = this._subscribers.filter(s => s !== handler);
    }

    private _publish(data: TelemetryEventData[]): IPromise<void> {

        if (data.length === 0) {
            return Q.resolve<void>(null);
        }

        // Invoke telemetry event subscribers for all events
        if (this._subscribers.length > 0) {
            for (const ev of data) {
                for (const handler of this._subscribers) {
                    handler(ev);
                }
            }
        }

        // Get the unique set of service instance type ids as an array
        const serviceInstanceTypes = Object.keys(data.reduce((prev, current) => { prev[current.serviceInstanceType || ""] = true; return prev; }, {}));

        const promises: IPromise<void>[] = [];
        for (const serviceInstanceType of serviceInstanceTypes) {

            const dataForService = data.filter(d => (d.serviceInstanceType || "") === serviceInstanceType);
            const items = dataForService.map((item) => {
                const result = {
                    area: item.area,
                    feature: item.feature,
                    properties: $.extend({}, item.properties)
                };

                if (item.elapsedTime) {
                    result.properties["ElapsedTime"] = item.elapsedTime;
                }

                // Telemetry events require both an area and feature
                if (!result.area) {
                    console.warn(`Publishing telemetry event with unknown area. Feature: ${result.feature}. Properties: ${JSON.stringify(result.properties)}`);
                    result.area = "Unknown";
                }

                if (!result.feature) {
                    console.warn(`Publishing telemetry event with unknown feature. Area: ${result.area}. Properties: ${JSON.stringify(result.properties)}`);
                    result.feature = "Unknown";
                }

                return result;
            });

            if (Diag.getDebugMode()) {
                __events = __events.concat(items);
            }

            promises.push(this._getHttpClient(serviceInstanceType).publishEvents(items));
        }

        if (isAppInsightsEnabled()) {
            $.each(this._items, (index: number, options: TelemetryEventData) => {
                AppInsights.trackWebEvent(options.feature, options.area, options.properties, options.elapsedTime);
            });
        }

        return Q.all(promises).then(() => {});
    }
}

var __events = [];
var telemetryService = new TelemetryService();

/**
 * Gets all the events published to the service.
 * Intended to be used internally for analysing telemetry data.
 */
export function getPublishedEvents(): TelemetryEventData[] {
    return __events.slice();
}

/**
 * Publish event data to the CustomerIntelligence service and App Insights.
 * (events are queued and sent in delayed batches unless immediate = true is supplied)
 *
 * @param eventData {TelemetryEventData} telemetry event to publish
 * @param immediate {boolean} If true, make ajax calls to publish the event immediately. Otherwise queue the event and send in delayed batches.
 */
export function publishEvent(eventData: TelemetryEventData, immediate: boolean = false): void {
    if (immediate) {
        telemetryService.publish(eventData);
    } else {
        telemetryService.delayedPublish(eventData);
    }
}

/**
 * Flush queued event data to be sent to CustomerIntelligence service and App Insights
 */
export function flush(): IPromise<void> {
    return telemetryService.flush();
}

/**
 * Register a function to be called each time an event is published
 *
 * @param handler Handler that can modify properties of telemetry events before they are sent to the server
 */
export function addTelemetryEventHandler(handler: ITelemetryEventHandler) {
    telemetryService.subscribe(handler);
}

/**
 * Unregister a function called each time an event is published
 *
 * @param handler Handler to remove
 */
export function removeTelemetryEventHandler(handler: ITelemetryEventHandler) {
    telemetryService.unsubscribe(handler);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.Telemetry", exports);
