import {Action} from "VSS/Flux/Action";

export interface TagPayload {
    tag: string;
}

export interface TagsRetrievedPayload {
    tags: string[];
}

export class TagActionHub {
    public tagAdded = new Action<TagPayload>();
    public tagRemoved = new Action<TagPayload>();

    public suggestionsRetrieved = new Action<TagsRetrievedPayload>();
}