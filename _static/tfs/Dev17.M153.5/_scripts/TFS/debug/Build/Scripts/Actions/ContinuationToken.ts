import {Action} from "VSS/Flux/Action";

export interface Payload {
    continuationToken: string;
}

export class ContinuationTokenActionHub {
    public continuationTokenUpdated = new Action<Payload>();
}