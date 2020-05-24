import { ClientTraceEvent, Level } from "VSS/ClientTrace/Contracts";
import { trace } from "VSS/ClientTrace/Services";
import * as Context from "VSS/Context";

export function traceError(area: string, feature: string, component: string, error: Error): void {
    const pageContext = Context.getPageContext();
    const userAgent = window.navigator.userAgent;
    const sessionId = pageContext && pageContext.diagnostics && pageContext.diagnostics.sessionId || "";

    const properties: IDictionaryStringTo<any> = {
        userAgent,
        sessionId,
        stack: error && error.stack,
    };

    const traceEvent: ClientTraceEvent = {
        area,
        component,
        feature,
        level: Level.Error,
        exceptionType: error && error.name,
        message: error && error.message,
        method: null,
        properties,
    };

    trace(traceEvent);
}