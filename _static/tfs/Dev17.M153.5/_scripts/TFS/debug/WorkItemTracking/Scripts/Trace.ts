import Context = require("VSS/Context");
import Utils_String = require("VSS/Utils/String");
import { trace } from "VSS/ClientTrace/Services";
import { ClientTraceEvent, Level } from "VSS/ClientTrace/Contracts";

export function traceMessage(area: string, component: string, feature: string, message: string): void {

    var pageContext = Context.getPageContext();
    var userAgent = window.navigator.userAgent;
    var sessionId = pageContext && pageContext.diagnostics && pageContext.diagnostics.sessionId || "";

    var properties: IDictionaryStringTo<any> = {
        "userAgent": userAgent,
        "sessionId": sessionId
    };

    const traceEvent: ClientTraceEvent = {
        area,
        component,
        feature,
        exceptionType: null,
        level: Level.Info,
        message,
        method: null,
        properties
    };

    trace(traceEvent);
}