
import Context = require("VSS/Context");
import Constants_Platform = require("VSS/Common/Constants/Platform");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Q = require("q");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import { trace } from "VSS/ClientTrace/Services";
import { ClientTraceEvent, Level } from "VSS/ClientTrace/Contracts";

class TelemetryErrorPublisher implements VSS.errorPublisher {
    private static _maxNumberOfReportedError: number = 3;
    private static _numReportedErrors: number = 0;
    private static _featureEnabled: boolean = null;

    constructor() {
    }
    /**
     * publish error to telemetry service
     */
    public publishError(error: TfsError)
    {
        if (TelemetryErrorPublisher.featureEnabled() && TelemetryErrorPublisher._numReportedErrors < TelemetryErrorPublisher._maxNumberOfReportedError) {
            publishErrorToTelemetry(error, false);
            TelemetryErrorPublisher._numReportedErrors++;
        }
    }

    /**
     * Determines if the client error logging feature is enabled 
     * @return boolean
     */
    private static featureEnabled(): boolean {
        if (TelemetryErrorPublisher._featureEnabled === null) {
            TelemetryErrorPublisher._featureEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.ClientSideErrorLogging, false);
        }
        return TelemetryErrorPublisher._featureEnabled;
    }
}
/**
 * publish error to telemetry service
 */
export function publishErrorToTelemetry(error: TfsError, immediate: boolean = false, level: Level = Level.Error, additionalProperties?: IDictionaryStringTo<any>) {

    var pageContext = Context.getPageContext();
    var userAgent = window.navigator.userAgent;
    var sessionId = pageContext && pageContext.diagnostics && pageContext.diagnostics.sessionId || "";
    var properties: IDictionaryStringTo<any> = {
        ...additionalProperties,
        "userAgent": userAgent,
        "sessionId": sessionId,
        "errorType": (<any>error).errorType,
        "errorName": error.name,
        "errorMessage": error.message,
        "errorResponse": (<any>error).response, //  For Ajax Error only
        "errorStack": error.stack, 
        "source": (<any>error).source||"", 
        "lineNumber": (<any>error).lineNumber||"",
        "columnNumber": (<any>error).columnNumber||""
    };

    var area = (pageContext && pageContext.navigation && pageContext.navigation.area) || "DefaultArea";
    var controller = (pageContext && pageContext.navigation && pageContext.navigation.currentController) || "Home";
    var action = (pageContext && pageContext.navigation && pageContext.navigation.currentAction) || "Index";
    
    let feature = action;
    if (pageContext && pageContext.navigation && Utils_String.equals(controller, "apps", true)) {
        if (pageContext.navigation.commandName) {
            feature = pageContext.navigation.commandName;
        }
        else if (pageContext.navigation.routeId) {
            feature = pageContext.navigation.routeId;
        }
    }

    const traceEvent: ClientTraceEvent = {
        area,
        component: area + "." + controller,
        exceptionType: properties["errorType"],
        feature,
        level,
        message: properties["errorMessage"],
        method: undefined,
        properties
    };

    trace(traceEvent);
}

VSS.errorHandler.attachErrorPublisher(new TelemetryErrorPublisher());

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.Error", exports);