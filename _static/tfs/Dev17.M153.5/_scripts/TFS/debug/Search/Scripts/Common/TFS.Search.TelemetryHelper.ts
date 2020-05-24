// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import Telemetry = require("VSS/Telemetry/Services");

export class TelemetryHelper {
    // We already have existing logs with this feature name and area thus, don't change values of these constants
    private static TraceArea: string = "webaccess.search";
    private static TraceFeature: string = "CodeSearchPortal";

    private static getLogTrace(activityId?: string): any {
        return Telemetry.TelemetryEventData.fromProperty(TelemetryHelper.TraceArea, TelemetryHelper.TraceFeature, "ActivityId", activityId || State.SearchViewState.currentActivityId)
    }

    private static addPropertiesToTrace(logtrace: any, propertiesMap: any): void {
        for (var propertyName in propertiesMap) {
            if (propertiesMap.hasOwnProperty(propertyName)) {
                logtrace.properties[propertyName] = propertiesMap[propertyName];
            }
        }
    }

    private static publishTrace(logTrace: any): void {
        Telemetry.publishEvent(logTrace);
    }

    /// <summary>
    /// Called to trace CI log for given set of properties
    /// </summary> 
    /// <param name="propertiesMap" type="Object">Mapping of property names and corresponding property values to be logged </param>
    /// <param name="activityId" type="string">Optional activity id to associate with this CI log </param>
    public static traceLog(propertiesMap: any, activityId?: string): void {
        var logTrace = TelemetryHelper.getLogTrace(activityId),
            currentEntityId: string = State.SearchViewState.currentProvider ? State.SearchViewState.currentProvider.getId() : "Code";

        // Add current provider/entity id to the log
        TelemetryHelper.addPropertiesToTrace(logTrace, { "Entity": currentEntityId });
        // Add session id for an entire session to each log published
        TelemetryHelper.addPropertiesToTrace(logTrace, { "SessionId": State.SearchViewState.currentSessionId });

        if (propertiesMap) {
            TelemetryHelper.addPropertiesToTrace(logTrace, propertiesMap);
            TelemetryHelper.publishTrace(logTrace);
        }
    }
}