import { SearchEntitiesIds } from "Search/Scripts/React/Models";

export namespace WikiSearchTelemetryConstants {
    export const AreaName: string = "WikiSearch";
    export const TrackingDataQueryText = "QText";
    export const TrackingDataWII = "WII";
    export const TrackingDataSource = "Source";
    export const WikiSearchLoadedScenario = "WSPageLoadComplete";
    export const ShowMoreResultsClickedScenario = "WSShowMoreClicked";
    export const WikiSearchPerformanceScenario = "WS.TTI";
}

export const entityIdsToUrlEntityTypeMap = {
    [SearchEntitiesIds.code] : "code",
    [SearchEntitiesIds.workItem]: "workitem",
    [SearchEntitiesIds.wiki]: "wiki"
};
