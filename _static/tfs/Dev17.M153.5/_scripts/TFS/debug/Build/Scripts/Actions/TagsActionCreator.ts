import { TagActionHub } from "Build/Scripts/Actions/Tags";
import { TagsSource } from "Build/Scripts/Sources/Tags";

import { Action } from "VSS/Flux/Action";
import { getCollectionService } from "VSS/Service";

export interface TagPayload {
    tag: string;
}

export interface TagsRetrievedPayload {
    tags: string[];
}

export class TagsActionCreator {
    private _actionHub: TagActionHub = null;
    private _source: TagsSource = null;

    constructor(actionHub: TagActionHub) {
        this._actionHub = actionHub;
    }

    public fetchBuildTags() {
        this._getSource().getTags(this._actionHub);
    }

    private _getSource() {
        if (!this._source) {
            this._source = getCollectionService(TagsSource);
        }

        return this._source;
    }
}