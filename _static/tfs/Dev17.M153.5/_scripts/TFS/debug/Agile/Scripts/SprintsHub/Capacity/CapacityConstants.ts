import { SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";

export namespace TelemetryConstants {
    export const BEGIN_LOAD_INITIAL_DATA = `${SprintsHubRoutingConstants.CapacityPivot}_BeginLoadInitialData`;
    export const END_LOAD_INITIAL_DATA = `${SprintsHubRoutingConstants.CapacityPivot}_EndLoadInitialData`;
    export const ERROR_LOAD_INITIAL_DATA = `${SprintsHubRoutingConstants.CapacityPivot}_ErrorLoadInitialData`;
    export const ERROR_LOAD_WORK_DETAILS_DATA = `${SprintsHubRoutingConstants.CapacityPivot}_ErrorLoadWorkDetailsData`;
    export const SAVE = `${SprintsHubRoutingConstants.CapacityPivot}_Save`;
    export const ADD_MISSING_TEAM_MEMBERS = `${SprintsHubRoutingConstants.CapacityPivot}_AddMissingTeamMembers`;
    export const REPLACE_CAPACITY = `${SprintsHubRoutingConstants.CapacityPivot}_ReplaceCapacity`;
}