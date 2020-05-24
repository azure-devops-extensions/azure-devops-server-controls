/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import Artifacts_Constants = require("VSS/Artifacts/Constants");

export interface ActivityStatistic {
    statisticId: number;
    processId: number;
    threadId: number;
    activityId: string;
    relativeTimestamp: number;
    eventName: string;
    activityMessage: string;
    dataId: string;
}

export class DiagHttpClient extends WebApi_RestClient.VssHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetAllActivityStatistics(activityId: string): IPromise<ActivityStatistic[]> {
        return this._beginRequest<ActivityStatistic[]>({
            area: "Stats",
            locationId: "5F4C431A-4D8F-442D-96E7-1E7522E6EABD",
            responseIsCollection: true,
            routeValues: {
                activityId: activityId
            }
        });
    }
    
}
