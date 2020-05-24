import { Action } from "VSS/Flux/Action";

export interface RealtimeConnectionUpdatedPayload {
    isConnected: boolean;
    isErrorCondition: boolean;
}

export let realtimeConnectionUpdated = new Action<RealtimeConnectionUpdatedPayload>();