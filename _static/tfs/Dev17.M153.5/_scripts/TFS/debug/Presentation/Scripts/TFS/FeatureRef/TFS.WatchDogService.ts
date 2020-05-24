import { VssService } from "VSS/Service";
import { delay, DelayedFunction } from "VSS/Utils/Core";
import { trace } from "VSS/ClientTrace/Services";
import { getPageContext } from "VSS/Context";
import { ClientTraceEvent, Level } from "VSS/ClientTrace/Contracts";
import { getDebugMode } from "VSS/Diag";

export class WatchDogService extends VssService {

    private _scenarioToDelayedFuncMap: IDictionaryStringTo<DelayedFunction> = {};

    public startWatchScenario(scenarioName: string, fromPageNavigation: boolean, timeout: number, area: string, component: string, feature: string): void {
        this.endWatchScenario(scenarioName);

        let startTime: number;
        const curTime = startTime = Date.now();
        // if fromPageNavigation is true, we need to substract time spent prior to current scenario from tiemout.
        if (fromPageNavigation) {
            const navigationStartString = "navigationStart";
            startTime = (window.performance && window.performance.timing && window.performance.timing[navigationStartString]) || null;
        }

        // If we can't find a start time, just return without firing clientTrace.
        if (!startTime) {
            return;
        }

        const timeLeft = timeout + startTime - curTime ;
        // If timeLeft <= 0, fire clientTrace right away.
        if (timeLeft <= 0) {
            this.fireClientTrace(scenarioName, timeout, area, component, feature);
        } else {
            this._scenarioToDelayedFuncMap[scenarioName] = delay(null, timeLeft, this.fireClientTrace, [scenarioName, timeout, area, component, feature]);
        }

        return;
    }

    public endWatchScenario(scenarioName: string): void {
        const delayedFunction = this._scenarioToDelayedFuncMap[scenarioName];
        if (delayedFunction) {
            delayedFunction.cancel();
            delete this._scenarioToDelayedFuncMap[scenarioName];
        }
        return;
    }

    private fireClientTrace(scenarioName: string, timeout: number, area: string, component: string, feature: string): void {
        const pageContext = getPageContext();
        const userAgent = window.navigator.userAgent;
        const sessionId = pageContext && pageContext.diagnostics && pageContext.diagnostics.sessionId || "";

        const properties: IDictionaryStringTo<any> = {
            userAgent,
            sessionId,
            backgroundTab: document.hidden,
            debugMode: getDebugMode()
        };

        const message = `Scenario ${scenarioName} reached timeout of ${timeout}ms`;

        const traceEvent: ClientTraceEvent = {
            area,
            component,
            feature,
            exceptionType: null,
            level: Level.Error,
            message,
            method: null,
            properties
        };

        trace(traceEvent);
        return;
    }
}