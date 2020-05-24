import * as VSSStore from  "VSS/Flux/Store";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";

export interface TagsState {
    tags: GitTag[];
}

export class TagsStore extends VSSStore.RemoteStore {
    private _state: TagsState;

    constructor(private _actionsHub: ActionsHub) {
        super();
        this._state = {} as TagsState;
        this._actionsHub.tagsFetched.addListener(this._setTags);
    }

    public get state(): TagsState {
        return this._state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.tagsFetched.removeListener(this._setTags);
            this._actionsHub = null;
        }
        this._state = null;
    }

    private _setTags = (tagsPayload: GitTag[]) => {
        this._state = ({
            tags: tagsPayload
        });
        this._loading = false;
        this.emitChanged();
    }
}
